import {candidateBattleScene, paintWidth, sceneHeight} from './v220-battle-scene-geometry.mjs';

const batchSize = 60;
const backgroundCapacity = 261;
export const chapterBattleSceneHost = 'chapterBattleScene';
const children = node => node.controls ?? node.children ?? [];
const find = (node, name) => children(node).find(child => child.name === name);
const images = node => node.kind === 'image' ? [node] : children(node).flatMap(images);
const isBasicShape = image => image.image >= 100001 && image.image <= 100006;
const rounded = value => Math.round(value * 1000) / 1000;

function paintRows(slots, act) {
  return slots.map(pair => {
    const image = pair[act];
    if (!image) return false;
    const [x, y] = image.position;
    const [r, g, b] = image.colour.slice(1).match(/../g).map(value => parseInt(value, 16));
    const [px, py] = image.pivot ?? [.5, .5];
    const [sx, sy] = image.scale ?? [1, 1];
    return [image.image, rounded(x), rounded(y), ...image.size.map(rounded),
      px, py, sx, sy, rounded(image.rotation ?? 0), image.fill ? 1 : 0,
      r, g, b, Math.round((image.opacity ?? 1) * 255)];
  });
}

// A live built-in shape has no imageType setter. Align both paint orders
// by their renderer families, leaving gaps hidden rather than converting a slot.
function sharedPaintSlots(first, second) {
  const cost = Array.from({length: first.length + 1}, () => new Uint16Array(second.length + 1));
  const matches = (a, b) => a < first.length && b < second.length
    && isBasicShape(first[a]) === isBasicShape(second[b]);
  for (let a = first.length; a >= 0; a--) {
    for (let b = second.length; b >= 0; b--) {
      if (a === first.length) cost[a][b] = second.length - b;
      else if (b === second.length) cost[a][b] = first.length - a;
      else cost[a][b] = 1 + (matches(a, b) ? cost[a + 1][b + 1] : Math.min(cost[a + 1][b], cost[a][b + 1]));
    }
  }
  const slots = [];
  let a = 0;
  let b = 0;
  while (a < first.length || b < second.length) {
    if (matches(a, b)) slots.push([first[a++], second[b++]]);
    else if (b === second.length || a < first.length && cost[a + 1][b] <= cost[a][b + 1])
      slots.push([first[a++]]);
    else slots.push([undefined, second[b++]]);
  }
  return slots;
}

export function chapterBattleScenes(theme) {
  const scenes = [candidateBattleScene(1, theme), candidateBattleScene(2, theme)];
  const paintSlots = sharedPaintSlots(images(scenes[0]), images(scenes[1]));
  const slotCount = paintSlots.length;
  const batchCount = Math.ceil(slotCount / batchSize);
  if (slotCount + batchCount + 1 > backgroundCapacity)
    throw Error('Chapter scene exceeds existing background control budget');

  // Act I is authored at build time and requires no runtime setter burst at
  // startup. All slots are pre-sized once; the other act reuses those slots.
  const batches = Array.from({length: batchCount}, (_, batch) => ({
    name: 'paintBatch' + (batch + 1), kind: 'container', position: [0, 0], size: [paintWidth, sceneHeight],
    children: Array.from({length: Math.min(batchSize, slotCount - batch * batchSize)}, (_, offset) => {
      const index = batch * batchSize + offset;
      const [first, second] = paintSlots[index];
      const image = first ?? second;
      return {...image, ...(!isBasicShape(image) ? {imageType: 'stretch'} : {}),
        name: 'paintSlot' + (index + 1), visible: !!first};
    }),
  }));
  const scene = {...scenes[0], name: chapterBattleSceneHost, children: batches};
  return {scene, rows: [paintRows(paintSlots, 0), paintRows(paintSlots, 1)], slotCount, batchSize};
}

export function applyChapterBattleScene(layout, chapterScenes) {
  const stage = find(layout, 'stage') ?? layout;
  const battle = find(stage, 'battlePanel') ?? stage;
  if (!find(battle, 'endTurn') || find(battle, chapterBattleSceneHost))
    throw Error('Chapter scene requires an unused battle host');
  battle.children = [structuredClone(chapterScenes.scene),
    ...children(battle).filter(node => node.name !== 'lowpolyScene')];
}
