import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {join, relative, resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
import {simulatorSave} from '../coop-primitive-lab/build.mjs';
import {approvedBattleNative} from '../../scripts/official-portraits.mjs';
import {prepareRefinedReleaseMonsterArt, refinedReleaseMonsterRegistry} from '../../scripts/refined-release-monsters.mjs';
import {bridge} from './rpc.mjs';
import {actorAlphaRuntimeSave} from './actor-alpha-runtime.mjs';

const out = process.argv[2];
const runtime = process.argv[3] === '--runtime-pilot';
assert(out && (process.argv.length === 3 || runtime && process.argv.length === 4),
  'Usage: actor-alpha-capture.mjs <new output directory> [--runtime-pilot]');
const directory = resolve(out);
assert(!relative(process.cwd(), directory).startsWith('..'), 'Output must be in the Simulator workspace');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const hero = approvedBattleNative();
const trial = process.env.STH_ALPHA_UNDERPAINT_TRIAL;
assert(!trial || runtime, 'The underpaint trial requires --runtime-pilot');
const underpaint = trial ? readFileSync(trial) : null;
const heroUnderpaint = underpaint ? JSON.parse(underpaint) : [];
const monsterSource = readFileSync(refinedReleaseMonsterRegistry);
const monsters = prepareRefinedReleaseMonsterArt(JSON.parse(monsterSource));
const roster = [
  {id: 'traveler-geo', geometry: hero.jsonSha256, width: hero.width, rows: hero.rows.map(row => ({
    image: row[0], position: row.slice(1, 3), size: row.slice(3, 5), pivot: row.slice(5, 7), scale: row.slice(11, 13),
    rotation: [row[18], row[19], row[13]], colour: row.slice(14, 18),
  }))},
  ...Object.entries(monsters.assets).map(([id, asset]) => ({
    id, geometry: asset.geometrySha256, width: monsters.canvas[0], rows: asset.slots,
  })),
];
const group = (name, children, position = [0, 0], size = [1280, 720]) =>
  ({name, kind: 'container', children, position, size});
const paint = (row, index) => ({
  ...row, name: 'shape' + index, kind: 'image',
  colour: '#' + row.colour.slice(0, 3).map(n => n.toString(16).padStart(2, '0')).join(''),
  opacity: row.colour[3] / 255,
});
const backdrops = {black: '#000000', white: '#FFFFFF', contrast: '#20F84D'};
const cellSize = 192;
const columns = 6;
const rows = 3;
const canvas = {id: 'mobile-16-9', width: 1280, height: 720};
function position(index) {
  return [(index % columns - (columns - 1) / 2) * cellSize,
    ((rows - 1) / 2 - Math.floor(index / columns)) * cellSize];
}
function actorGroup({id, width, rows: slots}, index) {
  const images = slots.map(paint);
  const batches = Array.from({length: Math.ceil(images.length / 60)}, (_, batch) =>
    group('batch' + batch, images.slice(batch * 60, (batch + 1) * 60), [0, 0], [width, width]));
  return group(id, batches, position(index), [width, width]);
}
const unpack = result => result.structuredContent ?? JSON.parse(result.content.find(item => item.type === 'text').text);
const call = (client, name, args) => client.call(name, args).then(unpack);
const saveJson = (name, value) => writeFileSync(join(directory, name + '.json'), JSON.stringify(value, null, 2) + '\n');

mkdirSync(directory);
const client = bridge();
const receipts = [];
try {
  await client.request('initialize', {protocolVersion: '2024-11-05', capabilities: {}, clientInfo: {name: 'actor-alpha-capture', version: '1'}});
  const pageSize = columns * rows;
  const selected = runtime ? roster.slice(0, 2) : roster;
  const backgrounds = runtime ? {...backdrops, battle: null} : backdrops;
  for (let start = 0; start < selected.length; start += pageSize) {
    const page = selected.slice(start, start + pageSize);
    const captures = {};
    for (const [name, colour] of Object.entries(backgrounds)) {
      const key = 'page-' + (start / pageSize + 1) + '-' + name;
      const backdrop = {name: 'backdrop', kind: 'image', image: 100001, size: [canvas.width, canvas.height], colour};
      const save = runtime ? actorAlphaRuntimeSave(key, colour && backdrop, hero, monsters, position(0), position(1), heroUnderpaint)
        : simulatorSave(key, {roots: [group('actorCoverage', [backdrop, ...page.map(actorGroup)])]});
      const file = join(directory, key + '.save.json');
      const bytes = JSON.stringify(save);
      writeFileSync(file, bytes);
      const {handle} = await call(client, 'qxqy_project_open', {path: relative(process.cwd(), file)});
      try {
        const play = await call(client, 'qxqy_studio_play', {handle, action: 'start',
          args: {canvasId: canvas.id, clockMode: 'manual', inspect: true, paint: true, playerCount: 1, viewPlayerIndex: 1}});
        assert.equal(play.mountError, null);
        if (runtime) assert.match(JSON.stringify(play), /ACTOR_ALPHA_READY hero=473 monster=32/, 'production Lua did not publish the actors');
        const shot = await client.call('qxqy_studio_play_screenshot', {handle});
        const meta = unpack(shot);
        assert.deepEqual(meta.assetWarnings, []);
        assert.deepEqual([meta.pixelWidth, meta.pixelHeight], [canvas.width, canvas.height]);
        const image = Buffer.from(shot.content.find(item => item.type === 'image').data, 'base64');
        writeFileSync(join(directory, key + '.png'), image);
        captures[name] = {...meta, screenshot: key + '.png', saveSha256: sha(bytes), screenshotSha256: sha(image)};
      } finally {
        await call(client, 'qxqy_studio_play', {handle, action: 'stop'});
      }
    }
    receipts.push({captures, actors: page.map(({id, width, geometry, rows: slots}, index) => {
      const [x, y] = position(index);
      return {id, width, geometry, shapes: slots.length, center: [canvas.width / 2 + x, canvas.height / 2 - y]};
    })});
  }
  saveJson('capture', {
    profile: 'official-assets-battle-v3', scope: runtime ? 'production Lua actor painters on an isolated Simulator runtime scene'
      : 'production geometry on isolated static controls in Simulator runtime',
    sourceCommit: execFileSync('git', ['rev-parse', 'HEAD'], {encoding: 'utf8'}).trim(),
    monsterRegistrySha256: sha(monsterSource), canvas, backdrops, pages: receipts,
    ...(underpaint ? {experiment: {heroUnderpaintSha256: sha(underpaint), additionalControls: heroUnderpaint.length}} : {}),
  });
} finally {
  client.close();
}
