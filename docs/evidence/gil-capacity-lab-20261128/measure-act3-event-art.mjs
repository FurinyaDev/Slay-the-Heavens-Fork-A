import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {join, resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

const [generated, output] = process.argv.slice(2);
if (!generated || !output || process.argv.length !== 4) {
  throw Error('Usage (from checkout root): node measure-act3-event-art.mjs <official-v3-generated-dir> <new-scratch-dir>');
}
const localImport = path => import(pathToFileURL(resolve(path)).href);
const {buildUiTheme} = await localImport('scripts/build-ui-theme.mjs');
const {packNativeScript, nativeScriptStorageProfile} = await localImport('scripts/native-script-storage.mjs');
const {loadEventArt, eventArtRegistry} = await localImport('scripts/lowcost-art.mjs');
const launchPath = 'data/release/launch-content.json';
const baselineThemePath = join(generated, 'official-assets-theme.json');
const baselineLuaPath = join(generated, 'abyss_theme.lua');
const json = path => JSON.parse(readFileSync(path));
const sha256 = value => createHash('sha256').update(value).digest('hex');
const measure = value => ({bytes: Buffer.byteLength(value), sha256: sha256(value)});
const git = (...args) => {
  const result = spawnSync('git', args, {encoding: 'utf8'});
  if (result.status !== 0) throw new Error(result.stderr || 'Could not read source checkout');
  return result.stdout.trim();
};
const launch = json(launchPath);
const allIds = launch.events.map(row => row.id);
const act3Ids = launch.events.filter(row => row.act === 3).map(row => row.id);
assert(act3Ids.length > 0);
const theme = json(baselineThemePath);
const sourceEventArt = loadEventArt(eventArtRegistry, allIds);
assert.deepEqual(theme.lowCostArt.event, sourceEventArt, 'Input must use the complete reviewed event registry');
assert.equal(sourceEventArt.unavailable.length, 0);
const removed = Object.fromEntries(act3Ids.map(id => [id, sourceEventArt.assets[id].shapes.length]));
const remainingIds = allIds.filter(id => !act3Ids.includes(id));
const buildCommit = git('rev-parse', 'HEAD');
const sourceDirty = git('status', '--porcelain') !== '';
const baselineLua = readFileSync(baselineLuaPath, 'utf8');
mkdirSync(output);
const original = buildUiTheme(baselineThemePath, 'data', join(output, 'baseline-abyss-theme.lua'));
assert.equal(original, baselineLua, 'Regenerated baseline Lua differs from the supplied official build');
for (const id of act3Ids) delete theme.lowCostArt.event.assets[id];
assert.deepEqual(Object.keys(theme.lowCostArt.event.assets).sort(), remainingIds.sort());
const diagnosticThemePath = join(output, 'diagnostic-theme.json');
writeFileSync(diagnosticThemePath, JSON.stringify(theme));
const edited = buildUiTheme(diagnosticThemePath, 'data', join(output, 'diagnostic-abyss-theme.lua'));
const encode = source => packNativeScript('abyss_theme', source, nativeScriptStorageProfile);
const before = measure(encode(original));
const after = measure(encode(edited));
const inputFiles = [launchPath, eventArtRegistry, baselineThemePath, baselineLuaPath,
  'scripts/build-ui.mjs', 'scripts/lowcost-art.mjs', 'scripts/build-ui-theme.mjs', 'scripts/native-script-storage.mjs'];
const result = {
  scope: 'Offline diagnostic on generated official-v3 input; no native GIL built or official storage measured',
  buildCommit, sourceDirty, storageProfile: nativeScriptStorageProfile,
  inputs: inputFiles.map(path => ({path, ...measure(readFileSync(path))})),
  eventArt: {baselineAssets: allIds.length, remainingAssets: remainingIds.length, removed,
    removedShapes: Object.values(removed).reduce((total, count) => total + count, 0)},
  lua: {module: 'abyss_theme', before, after, packedBytesSaved: before.bytes - after.bytes},
  admission: 'Native entry sets competition-two-act; official transitions and room entry limit play to Acts 1 and 2, and the seven event constructors require Act 3.',
  caveat: 'Source review found no direct Act 1/2 or menu use of the seven art definitions. The generic event renderer looks up the current event ID, and full-source Act 3 uses these rows. This experiment does not change or test the full-source route, native visual parity, device loading or official capacity.',
};
writeFileSync(join(output, 'act3-event-art.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({sourceCommit: buildCommit, sourceDirty, eventArt: result.eventArt, lua: result.lua}, null, 2));
