import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { bridgeGraphSource } from '../../../experiments/native-persistence-probe/bridge-graph.mjs';

const [toolPath, outputPath] = process.argv.slice(2);
if (!toolPath || !outputPath) throw new Error('Usage: node verify-bridge-copy.mjs <pinned-MCP-root> <new-output-directory>');
const toolRoot = path.resolve(toolPath);
const workspace = path.resolve(outputPath);
const source = path.join(toolRoot, 'knowledge/samples/gil/mh47p30a87qo_客户端脚本.gil');
const dependency = createRequire(path.join(toolRoot, 'package.json'));
assert.equal(dependency('genshin-ts/package.json').version, '0.2.2');
const dependencyImport = name => import(pathToFileURL(dependency.resolve(name)));
const toolImport = name => import(pathToFileURL(path.join(toolRoot, 'src', name)));
const { parseMessage } = await dependencyImport('genshin-ts/injector/binary');
const { buildNodeGraphFieldIndex } = await dependencyImport('genshin-ts/injector/node_graph');
const { loadGiaProto } = await dependencyImport('genshin-ts/injector/proto');
const { Service } = await toolImport('core.mjs');
const { clientScriptSignalHeads } = await toolImport('scene/signal-definitions.mjs');
const { addClientUi, addComponents, addGraph, addSignal, getClientUi, listClientScripts, listComponents, listSignals, setClientScript, signalDeclarationFaults } = await toolImport('scene-save.mjs');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const sourceSha = sha(readFileSync(source));
const lua = readFileSync(new URL('../../../experiments/native-persistence-probe/bridge.lua', import.meta.url), 'utf8');
mkdirSync(workspace);
const initial = path.join(workspace, 'official-sample-copy.gil');
copyFileSync(source, initial);
const service = new Service({ workspace, saveRoots: [], allowLive: false });
const requestName = 'STH_EXP_BRIDGE_REQUEST';
const replyName = 'STH_EXP_BRIDGE_REPLY';
const requestParams = ['operation', 'sequence', 'value'].map(name => ({ name, type: 'integer' }));
const replyParams = ['sequence', 'status', 'value'].map(name => ({ name, type: 'integer' }));
const variables = ['STH_EXP_BRIDGE_SEQUENCE', 'STH_EXP_BRIDGE_VALUE'].map(name => ({ name, type: 'integer', value: 0 }));
let mapPath = addComponents({ mapPath: initial, prefab: 'player', variables }, workspace).mapPath;
mapPath = addSignal({ mapPath, name: requestName, parameters: requestParams }, workspace).mapPath;
mapPath = addSignal({ mapPath, name: replyName, parameters: replyParams }, workspace).mapPath;
const graph = addGraph({ mapPath, name: '_GSTS_STH_EXP_Bridge', attachTo: 'stage' }, workspace);
mapPath = setClientScript({ mapPath: graph.mapPath, name: 'STH_EXP_Bridge', source: lua }, workspace).mapPath;
mapPath = addClientUi({ mapPath, name: 'STH_EXP_Bridge', script: 'STH_EXP_Bridge', controls: [{ name: 'test', kind: 'container', size: [200, 200] }] }, workspace).mapPath;
const code = bridgeGraphSource({ id: graph.graphId, name: graph.name });
assert.deepEqual(signalDeclarationFaults({ mapPath, code }), []);
const projectId = 'bridge';
service.createProject({ projectId, mapPath, targetGraphId: graph.graphId });
service.updateLogic({ projectId, code });
const build = await service.buildProject({ projectId });
const preview = service.previewChanges({ projectId, buildId: build.buildId });
const { target } = service.applyBuild({ projectId, buildId: build.buildId, expectedSha256: preview.expectedSha256 });
const applied = service.inspectMap({ mapPath: target });
const found = applied.graphs.find(entry => entry.id === graph.graphId);
assert(found.signalReferences.some(e => e.name === requestName && e.role === 'monitor'));
const bytes = readFileSync(target);
const replyNode = clientScriptSignalHeads(bytes).get(replyName);
assert(replyNode);
const payload = bytes.subarray(20, -4);
const fields = [];
parseMessage(payload, 0, payload.length, 0, 0, 0, 0, 0, 0, 0, fields);
const [savedGraph] = buildNodeGraphFieldIndex(payload, fields).get(graph.graphId);
const { nodeGraphMessage } = loadGiaProto();
const native = nodeGraphMessage.decode(payload.subarray(savedGraph.field.dataStart, savedGraph.field.dataEnd));
const replyNodes = native.nodes.filter(entry => entry.genericId?.nodeId === replyNode.nodeId);
assert.equal(replyNodes.length, 5);
const signatures = listSignals({ mapPath: target }).parameters;
assert.deepEqual(signatures[requestName], requestParams);
assert.deepEqual(signatures[replyName], replyParams);
const saved = listClientScripts({ mapPath: target, includeSource: true }).scripts.find(entry => entry.name === 'STH_EXP_Bridge');
assert.equal(saved.source, lua);
const playerVariables = listComponents({ mapPath: target, prefab: 'player' }).found.flatMap(entry => entry.variables ?? []);
for (const variable of variables) assert(playerVariables.some(entry => entry.name === variable.name && entry.type === 'integer'));
assert(listComponents({ mapPath: target, entity: 'stage' }).found.some(entry => entry.graphs.includes(graph.graphId)));
assert(getClientUi({ mapPath: target, ui: 'STH_EXP_Bridge' }).interface.scripts.includes('STH_EXP_Bridge'));
assert.equal(sha(readFileSync(source)), sourceSha);
const parameterChecks = applied.signals.filter(signal => [requestName, replyName].includes(signal.name)).map(({ name, parameterContract }) => ({ name, status: parameterContract.status, issues: parameterContract.issues }));
assert.deepEqual(parameterChecks.map(entry => entry.status), ['observed-consistent', 'observed-consistent']);
const result = {
  baseline: 'aaf8008875896f24acc8fda0d4df47df2564ec1d',
  source: path.basename(source), sourceSha, sourceUnchanged: true,
  compiledGraphSha: build.giaSha256, graphSourceSha: sha(code), scriptSha: sha(lua), copySha: applied.sha256,
  graph: { id: found.id, name: found.name, nodeCount: found.nodeCount, connectionCount: found.topology.connectionCount, editorCount: found.editorCount, requestListeners: found.signalReferences, replyNode, replyNodeCount: replyNodes.length },
  signatures: { [requestName]: signatures[requestName], [replyName]: signatures[replyName] },
  parameterChecks, playerVariables, runtime: service.capabilities().runtimeVerification,
};
writeFileSync(path.join(workspace, 'bridge-readback.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result, null, 2));
