export function withViewport(layout, theme) {
  return { ...layout, controls: [
    // Mobile DIAG-12 mode C covered both exposed edges with +400 UI units of horizontal bleed.
    // Stretch anchors include this delta beyond the parent; content stage remains unchanged.
    { name: 'canvasBackdrop', kind: 'image', anchor: { min: [0, 0], max: [1, 1] }, size: [theme.canvas.mobileBleedX, 0],
      image: theme.image.rect, colour: theme.color.backdrop },
    { name: 'stage', kind: 'container', size: [...theme.canvas.base], children: layout.controls },
  ] };
}

const leftBattleControls = [
  'energyRing', 'energyDisc', 'energyIcon', 'energy',
  'drawIcon', 'drawBadgeRing', 'drawBadge', 'draw', 'drawLabel',
];
const rightBattleControls = [
  'endTurn', 'discardIcon', 'discardBadgeRing', 'discardBadge', 'discard', 'discardLabel',
];

function stretchWidth(control, baseWidth) {
  control.anchor = { min: [0, .5], max: [1, .5] };
  control.size = [control.size[0] - baseWidth, control.size[1]];
}

// Attach after design profiles supply the final 16:9 positions. Translating
// both the face and its counter preserves their authored margins and hitboxes.
export function anchorBattlePeriphery(stage, baseWidth, officialAssets) {
  const panel = stage.children.find(control => control.name === 'battlePanel');
  const parts = new Map(panel.children.map(control => [control.name, control]));
  stretchWidth(panel, baseWidth);
  const right = officialAssets ? [...rightBattleControls, 'exhaustIcon', 'exhaust'] : rightBattleControls;
  for (const [anchor, names] of [[0, leftBattleControls], [1, right]]) {
    for (const name of names) {
      const control = parts.get(name);
      control.anchor = { min: [anchor, .5], max: [anchor, .5] };
      control.position = [control.position[0] + (.5 - anchor) * baseWidth, control.position[1]];
    }
  }
  stretchWidth(parts.get('statusDismiss'), baseWidth);
  const status = parts.get('statusInfo');
  stretchWidth(status, baseWidth);
  stretchWidth(status.children.find(control => control.name === 'hit'), baseWidth);
}
