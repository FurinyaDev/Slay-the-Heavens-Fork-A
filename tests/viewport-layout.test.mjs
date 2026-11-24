import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { withViewport } from '../scripts/viewport-layout.mjs';
import { gameLayout } from '../scripts/game-ui-layout.mjs';
import { nativeTheme as theme } from '../scripts/native-ui-theme.mjs';
import { buildLuaData } from '../scripts/build-lua-data.mjs';
import { buildUI } from '../scripts/build-ui.mjs';

// RectTransform sizeDelta is added to the span between anchors, not its final size.
function bounds(control, width, height) {
  const min = control.anchor?.min ?? [0.5, 0.5];
  const max = control.anchor?.max ?? [0.5, 0.5];
  const pivot = control.pivot ?? [0.5, 0.5];
  const position = control.position ?? [0, 0];
  return [width, height].map((extent, axis) => {
    const size = extent * (max[axis] - min[axis]) + control.size[axis];
    const start = extent * (min[axis] + (max[axis] - min[axis]) * pivot[axis])
      + position[axis] - size * pivot[axis];
    return [start, start + size];
  });
}

test('shared opaque backdrop covers its actual host independently of the content canvas', () => {
  const { controls: [backdrop, stage] } = withViewport(gameLayout(), theme);
  assert.equal(backdrop.name, 'canvasBackdrop');
  assert.equal(backdrop.kind, 'image');
  assert.equal(backdrop.image, theme.image.rect);
  assert.equal(backdrop.colour, theme.color.backdrop);
  assert.equal(backdrop.opacity ?? 1, 1);
  assert.equal(backdrop.visible ?? true, true);
  assert.equal(backdrop.mask ?? false, false);
  assert.equal(backdrop.focusable ?? false, false);
  // Parent width can exceed GetUICanvasSize; include the reported 2556×1179 phone.
  for (const [w, h] of [[1280, 720], [1920, 1080], [2340, 1080], [2400, 1080],
    [2520, 1080], [2556, 1179], [2268, 1179], [2048, 1536], [2732, 2048]]) {
    assert.deepEqual(bounds(backdrop, w, h), [[-200, w + 200], [0, h]], `${w}×${h}`);
  }
  assert.deepEqual(backdrop.size, [400, 0], 'background overscans horizontally by 200 UI units per side');
  assert.equal(stage.name, 'stage');
  assert.deepEqual(stage.size, [1280, 720]);
  assert.equal(stage.anchor, undefined, 'content remains centred with fixed design dimensions');
});

test('all major screens and overlays share one background behind the unmodified content', () => {
  const original = gameLayout();
  const layout = withViewport(original, theme);
  assert.equal(layout.controls.length, 2);
  assert.equal(layout.controls[1].children, original.controls);
  const names = new Set(original.controls.map(control => control.name));
  for (const name of ['menuPanel', 'mapPanel', 'battlePanel', 'nodePanel',
    'deckPanel', 'potionPanel', 'exitPanel']) assert(names.has(name), name);
  // Room, card-pick and result views stay in their original panel hierarchies.
  assert.deepEqual(layout.controls[1].children, original.controls);
  assert.equal(layout.controls[0].children, undefined, 'background adds no input targets or update work');
});

test('the actual official layout adapts its scenery, HUD and modal input at startup and resize', t => {
  const output = mkdtempSync(join(tmpdir(), 'slay-viewport-'));
  t.after(() => rmSync(output, { recursive: true, force: true }));
  buildLuaData('data', join(output, 'abyss_data.lua'));
  buildUI(output, undefined, {
    officialAssets: true, nativePageLifecycle: true, refinedReleaseMonsterArt: true,
  });
  const cli = createRequire(import.meta.url).resolve('fengari-node-cli/src/lua-cli.js');
  const result = spawnSync(process.execPath, [cli, '-e', "dofile('tests/lua/viewport.lua')"], {
    encoding: 'utf8',
    timeout: 60000,
    env: { ...process.env, LUA_PATH: output.replaceAll('\\', '/') + '/?.lua;src/lua/?.lua;;' },
  });
  assert.equal(result.status, 0, (result.error?.message ?? '') + result.stdout + result.stderr);
});
