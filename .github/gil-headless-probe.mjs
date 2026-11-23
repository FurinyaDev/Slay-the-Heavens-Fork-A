import assert from 'node:assert/strict';
import { copyFileSync, mkdtempSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';

const [toolRoot, source] = process.argv.slice(2).map(path => resolve(path));
const load = (root, path) => import(pathToFileURL(join(root, path)));
const { nativeBgmGraphSource, nativeBgmSignals } = await load(source, 'scripts/native-bgm-graph.mjs');
const { loadNativeUiEncoder } = await load(source, 'scripts/native-ui-encoder.mjs');
const { identity } = await loadNativeUiEncoder(toolRoot);
assert.equal(identity.sourceSha256, 'eed054eea9285d1945ec826299e1e9546e36475d708007b2df1952ebca52f805');
const sdk = 'node_modules/@modelcontextprotocol/sdk/dist/esm/client';
const { Client } = await load(toolRoot, sdk + '/index.js');
const { StdioClientTransport } = await load(toolRoot, sdk + '/stdio.js');
const workspace = mkdtempSync(join(tmpdir(), 'gil-mcp-probe-'));
let mapPath = join(workspace, 'fixture.gil');
copyFileSync(join(toolRoot, 'tests/fixtures/editor-2026-10-13-handui.gil'), mapPath);
const client = new Client({ name: 'gil-headless-probe', version: '1' });
await client.connect(new StdioClientTransport({ command: process.execPath, args: [join(toolRoot, 'src/server.mjs')],
  env: {...process.env, MILIASTRA_WORKSPACE: workspace, MILIASTRA_ALLOW_LIVE_WRITE: '0', MILIASTRA_SAVE_ROOTS: '[]' } }));
try {
  for (const uri of ['miliastra://workflow', 'miliastra://platform-rules']) assert.ok((await client.readResource({ uri })).contents[0].text);
  const call = async (name, args = {}) => {
    const result = await client.callTool({ name, arguments: { mapPath, ...args } }, undefined, {timeout: 120000});
    assert.equal(result.isError, undefined, JSON.stringify(result).slice(0, 900));
    const data = result.structuredContent ?? JSON.parse(result.content[0].text);
    if (data.mapPath) mapPath = data.mapPath;
    return data;
  };
  const start = await call('inspect_map');
  const available = await call('scene_list_signals');
  for (const name of Object.values(nativeBgmSignals)) {
    if (!available.signals.includes(name)) await call('scene_add_signal', { name });
  }
  const { graphId, name } = await call('scene_add_graph', { name: 'ABYSS_BGM', kind: 'server' });
  const result = await call('write_graphs', { graphs: [{ graphId, code: nativeBgmGraphSource({ id: graphId, name }) }] });
  assert.equal(result.failed, undefined, JSON.stringify(result).slice(0, 900));
  assert.equal(result.written[0]?.graphId, graphId);
  const end = await call('inspect_map');
  const graph = end.graphs.find(shape => shape.id === graphId);
  assert.ok(graph?.nodeCount > 0);
  assert.notEqual(end.sha256, start.sha256);
  console.log(JSON.stringify({ headlessBgmRoundTrip: 'pass', nodeCount: graph.nodeCount,
    verifiedCueSignals: Object.values(nativeBgmSignals).filter(name => end.signals.some(signal => signal.name === name)).length }));
} finally {
  await client.close();
}
