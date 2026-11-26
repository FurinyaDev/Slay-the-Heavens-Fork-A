import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { achievementProbeSource } from './graph-source.mjs';

const [mode, toolPath, outputPath, inputPath] = process.argv.slice(2);
if (!['offline', 'assemble'].includes(mode) || !toolPath || !outputPath || (mode === 'assemble' && !inputPath)) {
  throw new Error('Usage: node run-probe.mjs <offline|assemble> <pinned-MCP-root> <new-output-directory> [configured-achievement.json]');
}
const toolRoot = resolve(toolPath);
const outputDir = resolve(outputPath);
const manifest = JSON.parse(readFileSync(new URL('./probe-config.json', import.meta.url), 'utf8'));
const binding = inputPath ? JSON.parse(readFileSync(resolve(inputPath), 'utf8')) : null;
if (mode === 'assemble') {
  assert(typeof binding.basePath === 'string' && typeof binding.registrationEvidence === 'string');
  assert(Number.isSafeInteger(binding.serial) && binding.serial >= 0);
  assert.equal(binding.threshold, manifest.achievement.threshold);
  assert.equal(binding.testCopyConfirmed, true);
}

mkdirSync(outputDir);
const gitSource = createRequire(join(toolRoot, 'package.json'));
const compilerVersion = gitSource('genshin-ts/package.json').version;
assert.equal(compilerVersion, '0.2.2');
const { Client } = await import(pathToFileURL(gitSource.resolve('@modelcontextprotocol/sdk/client/index.js')));
const { StdioClientTransport } = await import(pathToFileURL(gitSource.resolve('@modelcontextprotocol/sdk/client/stdio.js')));
const client = new Client({ name: 'sth-achievement-exp', version: '1.0.0' });
const transport = new StdioClientTransport({
  command: process.execPath,
  args: [join(toolRoot, 'src/server.mjs')],
  env: { ...process.env, MILIASTRA_WORKSPACE: outputDir, MILIASTRA_ALLOW_LIVE_WRITE: '0', MILIASTRA_SAVE_ROOTS: '[]' },
});
const sha256 = data => createHash('sha256').update(data).digest('hex');
const writeJson = (name, data) => writeFileSync(join(outputDir, name), JSON.stringify(data, null, 2) + '\n', { flag: 'wx' });

async function call(name, args = {}) {
  const response = await client.callTool({ name, arguments: args });
  const payload = response.structuredContent ?? JSON.parse(response.content.find(item => item.type === 'text').text);
  if (response.isError || payload.error || payload.failed) throw new Error(`${name} ${JSON.stringify(payload)}`);
  return payload;
}

async function createCompilerFixture() {
  // Pattern borrowed from the pinned tool's tests/synthetic.mjs. None of these IDs
  // were issued by a game editor. The resulting GIL is a binary container fixture.
  const graphId = 1073741825;
  const { buildFile, encodeVarint } = await import(pathToFileURL(gitSource.resolve('genshin-ts/injector/binary')));
  const { loadGiaProto } = await import(pathToFileURL(gitSource.resolve('genshin-ts/injector/proto')));
  const { nodeGraphMessage } = loadGiaProto();
  const field = (id, bytes) => Buffer.concat([Buffer.from(encodeVarint(id * 8 + 2)), Buffer.from(encodeVarint(bytes.length)), bytes]);
  const encoded = Buffer.from(nodeGraphMessage.encode({
    id: { class: 10000, type: 20000, kind: 21001, id: graphId },
    name: manifest.graphName,
  }).finish());
  const mapPath = join(outputDir, 'compiler-fixture.gil');
  writeFileSync(mapPath, buildFile(field(10, field(1, field(1, encoded))), { schema: 1, headTag: 0x326, fileType: 2, tailTag: 0x679 }), { flag: 'wx' });

  return {
    mapPath,
    graphId,
    serial: 917,
    buttonIndices: Object.fromEntries(Object.keys(manifest.buttons).map((action, index) => [action, 1073741900 + index])),
  };
}

async function createOfficialCopyInputs() {
  const bindingDir = dirname(resolve(inputPath));
  const source = resolve(bindingDir, binding.basePath);
  const registrationEvidence = readFileSync(resolve(bindingDir, binding.registrationEvidence));
  assert(registrationEvidence.length > 0, 'Registration evidence file is empty');
  const mapPath = join(outputDir, 'registered-base-copy.gil');
  copyFileSync(source, mapPath);
  const counted = await call('scene_set_player_count', { mapPath, min: 1, max: 1, outputName: 'exp-achievement-player-count' });
  const graph = await call('scene_add_graph', {
    mapPath: counted.mapPath,
    name: manifest.graphName,
    kind: 'server',
    attachToPrefab: 'player',
    outputName: 'exp-achievement-graph',
  });
  let currentMap = graph.mapPath;
  const buttonIndices = {};
  for (const [action, config] of Object.entries(manifest.buttons)) {
    const control = await call('scene_add_button', { ...config, mapPath: currentMap, outputName: config.name });
    buttonIndices[action] = control.controlGroupIndex;
    currentMap = control.mapPath;
  }
  const controls = await call('scene_list_interface', { mapPath: currentMap });
  const actualControls = controls.layouts.flatMap(layout => layout.controls);
  for (const [action, config] of Object.entries(manifest.buttons)) {
    assert(actualControls.some(control => control.id === buttonIndices[action] && control.name === config.name && control.kind === 'button'));
  }
  writeJson('interface-readback.json', controls);
  const attachedGraphs = await call('scene_list_components', { mapPath: currentMap, prefab: 'player' });
  assert(attachedGraphs.found.some(target => target.graphs.includes(graph.graphId)));
  writeJson('player-attachment-readback.json', attachedGraphs);
  return {
    mapPath: currentMap, graphId: graph.graphId, serial: binding.serial, buttonIndices,
    baseSha256: sha256(readFileSync(mapPath)), registrationEvidenceSha256: sha256(registrationEvidence),
  };
}

try {
  await client.connect(transport);
  const resources = [];
  for (const uri of ['miliastra://workflow', 'miliastra://platform-rules']) {
    const resource = await client.readResource({ uri });
    const body = resource.contents[0].text;
    assert(body.length > 300);
    resources.push({ uri, sha256: sha256(body) });
  }

  const capabilities = await call('get_capabilities');
  assert.equal(capabilities.liveWriteEnabled, false);
  const listed = await client.listTools();
  const achievementConfigTools = listed.tools.map(tool => tool.name).filter(name => /achievement|成就/.test(name));
  const documentation = await call('search_node_docs', {
    queries: ['queryIfAchievementIsCompleted', 'setAchievementProgressTally', 'changeAchievementProgressTally'],
    limit: 4,
  });
  const candidate = await (mode === 'offline' ? createCompilerFixture() : createOfficialCopyInputs());
  const source = achievementProbeSource({
    ...candidate,
    graphName: manifest.graphName,
    threshold: manifest.achievement.threshold,
  });
  writeFileSync(join(outputDir, 'achievement-probe.ts'), source, { flag: 'wx' });
  const before = await call('inspect_map', { mapPath: candidate.mapPath });
  const compiled = await call('write_graphs', { mapPath: candidate.mapPath, graphs: [{ graphId: candidate.graphId, code: source }] });
  const after = await call('inspect_map', { mapPath: compiled.mapPath });
  const graphBefore = before.graphs.find(graph => graph.id === candidate.graphId);
  const graphAfter = after.graphs.find(graph => graph.id === candidate.graphId);
  assert.equal(graphBefore.nodeCount, 0);
  assert.equal(graphAfter.name, manifest.graphName);
  assert(graphAfter.nodeCount > 0);
  assert.equal(compiled.written.length, 1);
  writeJson('assembly-receipt.json', {
    mode,
    timestampUtc: new Date().toISOString(),
    compilerVersion,
    resources,
    capabilities: {
      editorConnection: capabilities.editorConnection,
      runtimeVerification: capabilities.runtimeVerification,
      liveWriteEnabled: capabilities.liveWriteEnabled,
      achievementConfigTools,
    },
    documentation,
    bindings: candidate,
    sourceSha256: sha256(source),
    graphBefore,
    graphAfter,
    outputMap: compiled.mapPath,
    outputMapSha256: sha256(readFileSync(compiled.mapPath)),
    registration: mode === 'offline' ? 'synthetic_id_for_compiler_only' : 'editor_evidence_supplied_separately',
    officialImport: 'not_run',
    runtime: 'not_run',
  });
  console.log(`${mode}: graph compiled, written and read back (${graphAfter.nodeCount} nodes).`);
} finally {
  await client.close();
}
