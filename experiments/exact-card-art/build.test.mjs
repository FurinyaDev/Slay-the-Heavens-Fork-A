import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { join, resolve } from 'node:path';
import { test } from 'node:test';
import { bindReadyCardPresentation } from '../../scripts/art/ready-card-runtime.mjs';
import { luaString } from '../../scripts/build-lua-data.mjs';
import { runLua } from '../../scripts/test-lua.mjs';
import { buildComparison, encodeReviewedCardModule } from './build.mjs';

const experiment = `build/exact-card-art-test-${randomUUID()}`;
const module = 'abyss_ready_card_assets.lua';

test('compact rows preserve every approved value through the shared runtime and release', () => {
  const receipt = buildComparison(experiment);
  assert.deepEqual(receipt.cards.map(({ id, shapes }) => [id, shapes]),
    [['armaments', 1834], ['cleave', 2657], ['heavy_blade', 2043]]);
  assert(receipt.files.packed.bytes < receipt.files.baseline.bytes);
  assert.equal(receipt.officialStorage, 'UNVERIFIED');
  const baseline = luaString(resolve(experiment, 'baseline', module));
  const packed = luaString(resolve(experiment, 'packed', module));
  const script = join(experiment, 'verify.lua');
  writeFileSync(script, `EXACT_CARD_BASELINE=${baseline}\nEXACT_CARD_PACKED=${packed}\ndofile('experiments/exact-card-art/verify.lua')\n`);
  const result = runLua(script, { timeout: 60000 });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /EXACT_CARD_ART_PASS/);
  console.log(result.stdout.trim());
  assert.throws(() => buildComparison(experiment), { code: 'EEXIST' });
});

test('cannot encode a future slot with an extra dimension or a different fixed anchor or path', () => {
  const cards = { armaments: {}, cleave: {}, heavy_blade: {} };
  bindReadyCardPresentation(cards);
  const assets = Object.fromEntries(Object.entries(cards).map(([id, card]) => [id, card.nativeArt]));
  const slot = assets.armaments.slots[0];
  slot.position.push(1);
  assert.throws(() => encodeReviewedCardModule(assets), /Unexpected position length/);
  slot.position.pop();
  slot.anchorMin[0] = 0;
  assert.throws(() => encodeReviewedCardModule(assets), /deep-equal/);
  slot.anchorMin[0] = .5;
  slot.path[0] = 'group001';
  assert.throws(() => encodeReviewedCardModule(assets), /group001/);
});
