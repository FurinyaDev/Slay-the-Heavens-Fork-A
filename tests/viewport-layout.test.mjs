import test from 'node:test';
import assert from 'node:assert/strict';
import { anchorBattlePeriphery, withViewport } from '../scripts/viewport-layout.mjs';
import { gameLayout } from '../scripts/game-ui-layout.mjs';
import { nativeTheme as theme } from '../scripts/native-ui-theme.mjs';

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

test('battle periphery preserves control sizes and authored 16:9 distances as it uses extra width', () => {
  const [baseWidth, height] = theme.canvas.base;
  const baseStage = withViewport(gameLayout(), theme).controls[1];
  const stage = structuredClone(baseStage);
  anchorBattlePeriphery(stage, baseWidth, false);
  const panel = stage.children.find(control => control.name === 'battlePanel');
  const basePanel = baseStage.children.find(control => control.name === 'battlePanel');
  const parts = new Map(panel.children.map(control => [control.name, control]));
  const baseParts = new Map(basePanel.children.map(control => [control.name, control]));
  const widths = [1280, 1560, 1600, 1680];
  for (const width of widths) {
    assert.deepEqual(bounds(panel, width, height), [[0, width], [0, height]]);
    for (const [names, delta] of [
      [['energyIcon', 'energy', 'drawIcon', 'drawBadge', 'draw'], 0],
      [['endTurn', 'discardIcon', 'discardBadge', 'discard'], width - baseWidth],
      [['hero', 'card1', 'exhaustIcon'], (width - baseWidth) / 2],
    ]) {
      for (const name of names) {
        const original = baseParts.get(name), current = parts.get(name);
        const [x, y] = bounds(original, baseWidth, height);
        const [actualX, actualY] = bounds(current, width, height);
        for (let i = 0; i < 2; i++) assert(Math.abs(actualX[i] - (x[i] + delta)) < 1e-8, name);
        assert.deepEqual(actualY, y, name);
        assert.deepEqual(current.size, original.size, name);
      }
    }
    const detail = parts.get('statusInfo');
    const detailHit = detail.children.find(control => control.name === 'hit');
    assert.deepEqual(bounds(detail, width, height)[0], [0, width]);
    assert.deepEqual(bounds(detailHit, width, height)[0], [0, width]);
    const dismiss = parts.get('statusDismiss');
    assert.deepEqual(bounds(dismiss, width, height)[0], [theme.canvas.safe.x, width - theme.canvas.safe.x]);
  }
  const officialStage = structuredClone(baseStage);
  anchorBattlePeriphery(officialStage, baseWidth, true);
  const officialPanel = officialStage.children.find(control => control.name === 'battlePanel');
  for (const name of ['exhaustIcon', 'exhaust']) {
    const control = officialPanel.children.find(part => part.name === name);
    const [x] = bounds(baseParts.get(name), baseWidth, height);
    assert.deepEqual(bounds(control, 1680, height)[0], x.map(edge => edge + 400));
  }
});
