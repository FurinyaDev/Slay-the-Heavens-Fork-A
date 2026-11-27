import {createHash} from 'node:crypto';
import {readFileSync, writeFileSync} from 'node:fs';
import {resolve, join} from 'node:path';
import {pathToFileURL} from 'node:url';

const fromCheckout = path => import(pathToFileURL(resolve(path)).href);
const {packageInventory} = await fromCheckout('scripts/platform-load.mjs');
const {candidateScriptFiles} = await fromCheckout('scripts/native-candidate-scripts.mjs');
const {packNativeScript, nativeScriptStorageProfile} = await fromCheckout('scripts/native-script-storage.mjs');
const [directory, output] = process.argv.slice(2);
if (!directory || !output) throw Error('Usage (from checkout root): node measure-build-inputs.mjs <generated dir> <new output JSON>');
const read = name => JSON.parse(readFileSync(join(directory, name + '.json')));
const bytes = row => Buffer.byteLength(JSON.stringify(row));
const children = row => row.controls ?? row.children ?? [];
const count = row => 1 + children(row).reduce((total, item) => total + count(item), 0);
const hash = input => createHash('sha256').update(input).digest('hex');
const treeRecord = row => ({name: row.name, controls: count(row), jsonBytes: bytes(row)});
const layout = read('game-ui');
const templates = read('game-ui-templates');
const stage = layout.controls.find(row => row.name === 'stage');
const rawInventory = packageInventory(directory);
const {modules, ...inventory} = rawInventory;
const packedModules = candidateScriptFiles('src/lua', directory).map(({name, sourceFile}) => {
  const source = readFileSync(sourceFile, 'utf8').replace(/^\uFEFF/, '');
  const packed = packNativeScript(name, source, nativeScriptStorageProfile);
  return {name, sourceBytes: Buffer.byteLength(source), packedBytes: Buffer.byteLength(packed),
    sourceSha256: hash(source), packedSha256: hash(packed)};
});
const types = new Set(['stsReferenceBack', 'stsReferenceChrome', 'nativeCardBody', 'nativePlayableRim', 'officialRunBar']);
const copies = new Map();
function visit(node, path = []) {
  if (types.has(node.name)) {
    const row = copies.get(node.name) ?? {instances: 0, controls: 0, jsonBytes: 0, byPanel: {}, hashes: new Set()};
    const panel = path[2] ?? '<root>';
    row.instances++;
    row.controls += count(node);
    row.jsonBytes += bytes(node);
    row.byPanel[panel] = (row.byPanel[panel] ?? 0) + 1;
    row.hashes.add(hash(JSON.stringify(node)));
    copies.set(node.name, row);
  }
  for (const child of children(node)) visit(child, [...path, node.name]);
}
visit(layout);
const sortedLeaves = rows => rows.map(treeRecord).sort((a, b) => b.jsonBytes - a.jsonBytes);
const result = {
  scope: 'Rebuilt inputs before candidate-local template IDs, build marker, native container record encoding and BGM packaging',
  ...inventory,
  storageProfile: nativeScriptStorageProfile,
  modules: modules.length,
  packedLuaBytes: packedModules.reduce((sum, item) => sum + item.packedBytes, 0),
  largestPackedModules: packedModules.sort((a, b) => b.packedBytes - a.packedBytes).slice(0, 20),
  layoutControls: count(layout) - 1,
  layoutTrees: sortedLeaves(stage.children),
  templateTrees: sortedLeaves(templates),
  copies: Object.fromEntries([...copies].map(([key, {hashes, ...row}]) => [key, {...row, distinctRepresentations: hashes.size}])),
  lowCostArt: Object.fromEntries(Object.entries(read('official-assets-theme').lowCostArt).map(([key, value]) =>
    [key, {assets: Object.keys(value.assets).length, jsonBytes: bytes(value)}])),
};
writeFileSync(output, JSON.stringify(result, null, 2) + '\n', {flag: 'wx'});
console.log(JSON.stringify({modules: result.modules, packedLuaBytes: result.packedLuaBytes, layoutControls: result.layoutControls, copies: result.copies}, null, 2));
