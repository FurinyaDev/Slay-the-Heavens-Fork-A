import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { bindReadyCardPresentation, writeReadyCardAssets, readyArtAssetModule } from '../../scripts/art/ready-card-runtime.mjs';
import { toLua } from '../../scripts/build-lua-data.mjs';
import { fileRecord, prepareOutputDirectory, sha256, writeExclusive } from '../../scripts/evidence-files.mjs';
import { nativeArtSlotPath } from '../../scripts/card-art-samples.mjs';
import { gitSourceIdentity } from '../../scripts/release-notes.mjs';

const ids = ['armaments', 'cleave', 'heavy_blade'];
const slotKeys = ['anchorMax', 'anchorMin', 'colour', 'image', 'imageType', 'path', 'pivot', 'position', 'rotation', 'scale', 'size'];
const decoder = readFileSync(new URL('./decode.lua', import.meta.url), 'utf8');

function encodeSlot(slot, index) {
  assert.deepEqual(Object.keys(slot).sort(), slotKeys, 'Unexpected field in the approved slot');
  for (const key of ['anchorMin', 'anchorMax', 'pivot']) assert.deepEqual(slot[key], [.5, .5]);
  assert.deepEqual(slot.scale, [1, 1]);
  assert.deepEqual(slot.path, nativeArtSlotPath(index));
  for (const [key, length] of [['position', 2], ['size', 2], ['rotation', 3], ['colour', 4]]) {
    assert.equal(slot[key].length, length, `Unexpected ${key} length`);
    assert(slot[key].every(Number.isFinite), `Nonfinite ${key}`);
  }
  const type = ['basic', 'stretch'].indexOf(slot.imageType);
  assert.notEqual(type, -1);
  return [slot.image, type, ...slot.position, ...slot.size, ...slot.rotation, ...slot.colour];
}

export function encodeReviewedCardModule(assets) {
  assert.deepEqual(Object.keys(assets).sort(), ids, 'Experiment admits exactly three reviewed cards');
  const packed = {};
  for (const [id, { slots, ...metadata }] of Object.entries(assets)) {
    assert.equal(metadata.cardId, id);
    assert.equal(metadata.runtime, true);
    packed[id] = { metadata, rows: slots.map(encodeSlot) };
  }
  return `${decoder.trimEnd()}\nreturn decode(${toLua(packed)})\n`;
}

export function buildComparison(output, root = process.cwd()) {
  assert.match(output ?? '', /^build\/exact-card-art-[a-z0-9-]+$/);
  const identity = gitSourceIdentity(root);
  assert.equal(identity.sourceDirty, false, 'Use a clean source worktree');
  const presentation = Object.fromEntries(ids.map(id => [id, {}]));
  const registry = bindReadyCardPresentation(presentation, { root });
  const assets = Object.fromEntries(ids.map(id => [id, presentation[id].nativeArt]));
  const module = encodeReviewedCardModule(assets);
  prepareOutputDirectory(root, 'build');
  const directory = resolve(root, output);
  mkdirSync(directory);
  const baseline = join(directory, 'baseline');
  const packed = join(directory, 'packed');
  mkdirSync(baseline);
  mkdirSync(packed);
  writeReadyCardAssets(baseline, { root, prepared: assets });
  const moduleFile = `${readyArtAssetModule}.lua`;
  writeFileSync(join(packed, moduleFile), module, { flag: 'wx' });
  const files = Object.fromEntries([['baseline', baseline], ['packed', packed]].map(([label, path]) => {
    const { bytes, sha256 } = fileRecord(join(path, moduleFile), root);
    return [label, { bytes, sha256 }];
  }));
  assert.deepEqual(gitSourceIdentity(root), identity);
  const receipt = {
    ...identity, measurement: 'offline-generated-lua-bytes',
    sourceInputs: registry.sourceInputs.map(({ cardId, kind, sha256 }) => ({ cardId, kind, sha256 })),
    decoderSha256: sha256(decoder), cards: ids.map(id => ({ id, shapes: assets[id].slots.length })),
    files, bytesSaved: files.baseline.bytes - files.packed.bytes,
    officialStorage: 'UNVERIFIED', devicePerformance: 'UNVERIFIED',
  };
  assert(receipt.bytesSaved > 0);
  writeExclusive(join(directory, 'comparison.json'), receipt);
  return receipt;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  console.log(JSON.stringify(buildComparison(process.argv[2]), null, 2));
}
