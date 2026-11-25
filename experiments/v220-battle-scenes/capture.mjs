import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {relative, resolve} from 'node:path';
import {simulatorSave} from '../coop-primitive-lab/build.mjs';
import {bridge} from '../art-tech-lab/rpc.mjs';
import {officialAssetsTheme} from '../../scripts/official-assets-layout.mjs';
import {toLua} from '../../scripts/build-lua-data.mjs';
import {chapterBattleScenes, chapterBattleSceneHost} from '../../scripts/v220-chapter-battle-scenes.mjs';
import {candidateBattleScene, controlCount, groundY, sceneHeight} from '../../scripts/v220-battle-scene-geometry.mjs';

const [pilotPath, destination, ...options] = process.argv.slice(2);
if (!pilotPath || !destination) throw Error('capture.mjs <actor-alpha battle save> <new output dir> [--contact-trial] [--pool-trial] [canvas IDs]');
const pilotBytes = readFileSync(pilotPath);
const pilot = JSON.parse(pilotBytes);
const canvasSizes = {
  'mobile-16-9': [1280, 720],
  'mobile-19.5-9': [1560, 720],
  'mobile-20-9': [1600, 720],
  'pc-21-9': [2100, 900],
};
const contactTrial = options.includes('--contact-trial');
const poolTrial = options.includes('--pool-trial');
const requestedCanvases = options.filter(value => value !== '--contact-trial' && value !== '--pool-trial');
const canvasIds = requestedCanvases.length ? requestedCanvases : Object.keys(canvasSizes);
const theme = officialAssetsTheme(JSON.parse(readFileSync('data/presentation/ui_theme.json')));
const out = resolve(destination);
const hash = value => createHash('sha256').update(value).digest('hex');
const saveJson = (path, value) => writeFileSync(path, JSON.stringify(value));
const unpack = response => response.structuredContent ?? JSON.parse(response.content.find(c => c.type === 'text').text);

function child(parent, name) {
  const found = parent.children.filter(node => node.name === name);
  assert.equal(found.length, 1, 'Expected unique child ' + name);
  return found[0];
}
function shift(node, x, y) {
  for (const transform of Object.values(node.transformByPlatform)) transform.offset = {x, y};
}
function descendants(node) {
  return [node, ...node.children.flatMap(descendants)];
}
function projectedScene(themed, battle) {
  const save = simulatorSave(themed.name, {roots: [themed]});
  const root = save.assets.server.root.children[0];
  root.isRootContainer = false;
  for (const [i, node] of descendants(root).entries()) {
    node.guid = 1073830000 + i;
    node.id = 'scene' + node.guid;
    if (node.enableFill) node.fillHorizontalType = 'Right';
  }
  const old = child(battle, 'v25BattleScene');
  const originalNodes = descendants(old).length;
  assert.equal(controlCount(themed), descendants(root).length);
  assert(controlCount(themed) <= originalNodes);
  battle.children[battle.children.indexOf(old)] = root;
}
function buildCase(act, [width, height], withContact, withPool) {
  const save = structuredClone(pilot);
  const root = child(save.assets.server.root, 'actorCoverage');
  const battle = child(root, 'battlePanel');
  const actorScript = save.assets.scripts.find(script => script.controlId === root.id);
  assert(actorScript?.source.includes('ACTOR_ALPHA_READY'), 'Expected actor-alpha runtime rig');
  const fit = Math.min(width / 1280, height / sceneHeight);
  for (const transform of Object.values(root.transformByPlatform)) {
    transform.scale = {x: fit, y: fit, z: 1};
  }
  // Fixed anchors across before/after pairs, measured using the pilot's
  // actual production-size 210px hero and the pilot's 106px monster painters.
  const hero = child(battle, 'hero');
  assert(actorScript.source.includes('["portrait"]=210'), 'Use the production-size alpha pilot');
  shift(hero, -320, sceneHeight / 2 - (groundY - 93));
  shift(child(battle, 'alphaMonster'), 283, sceneHeight / 2 - (477 - 42));
  if (withPool) {
    const {scene, ...data} = chapterBattleScenes(theme);
    projectedScene(scene, battle);
    const runtime = readFileSync('src/lua/abyss_chapter_battle_scene.lua', 'utf8');
    actorScript.source += `
local loadedChapterData=0
modules.abyss_chapter_battle_scene_data=function()
  loadedChapterData=loadedChapterData+1
  return ${toLua(data)}
end
local ChapterBattleScene=(function()
${runtime}
end)()
local originalStart=OnStart
function OnStart()
  originalStart()
  local battle=script.object:GetChild('battlePanel')
  local swap=assert(ChapterBattleScene.bind(battle:GetChild('${chapterBattleSceneHost}')))
  assert(swap(1) and loadedChapterData==0)
  assert(swap(2) and loadedChapterData==1)
  assert(swap(2))
  assert(swap(${act}) and loadedChapterData==1)
  print('CHAPTER_BATTLE_SCENE_POOL_READY act=${act}')
end
`;
  } else if (act) {
    projectedScene(candidateBattleScene(act, theme, {contactTrial: withContact}), battle);
  }
  return save;
}

mkdirSync(out, {recursive: false});
const client = bridge();
const results = [];
try {
  const {serverInfo} = await client.request('initialize', {protocolVersion: '2024-11-05',
    capabilities: {}, clientInfo: {name: 'v220-battle-scenes', version: '1'}});
  assert.equal(serverInfo.version, '0.5.2');
  for (const canvasId of canvasIds) {
    assert(canvasSizes[canvasId], 'Unsupported comparison canvas ' + canvasId);
    const [width, height] = canvasSizes[canvasId];
    const cases = [[0, 'before'], [1, 'act1'], [2, 'act2']];
    if (contactTrial) cases.push([1, 'act1-contact', true], [2, 'act2-contact', true]);
    if (poolTrial) cases.push([1, 'act1-pool', false, true], [2, 'act2-pool', false, true]);
    for (const [act, label, withContact, withPool] of cases) {
      const name = canvasId + '-' + label;
      const savePath = resolve(out, name + '.save.json');
      const save = buildCase(act, [width, height], withContact, withPool);
      saveJson(savePath, save);
      const {handle} = unpack(await client.call('qxqy_project_open', {path: relative(process.cwd(), savePath)}));
      try {
        const start = unpack(await client.call('qxqy_studio_play', {handle, action: 'start',
          args: {canvasId, clockMode: 'manual', muteAudio: false}}));
        assert(!start.mountError);
        assert(start.logs.some(log => log.text.includes('ACTOR_ALPHA_READY hero=473 monster=32')));
        assert(!start.logs.some(log => log.level === 'lua-error'), JSON.stringify(start.logs));
        const poolReady = start.logs.find(log => log.text.includes('CHAPTER_BATTLE_SCENE_POOL_READY'));
        if (withPool) assert(poolReady?.text.includes('act=' + act), JSON.stringify(start.logs));
        const shot = await client.call('qxqy_studio_play_screenshot', {handle});
        const png = Buffer.from(shot.content.find(content => content.type === 'image').data, 'base64');
        assert.equal(png.readUInt32BE(16), width);
        assert.equal(png.readUInt32BE(20), height);
        const receipt = unpack(shot);
        assert.deepEqual(receipt.assetWarnings, []);
        writeFileSync(resolve(out, name + '.png'), png);
        const battle = child(child(save.assets.server.root, 'actorCoverage'), 'battlePanel');
        const scene = child(battle, withPool ? chapterBattleSceneHost : act ? 'CandidateBattleScene' : 'v25BattleScene');
        const result = {name, canvasId, act, contactTrial: !!withContact, width, height, backgroundControls: descendants(scene).length,
          ...(poolReady ? {poolReady: poolReady.text} : {}),
          screenshotSha256: hash(png), saveSha256: hash(readFileSync(savePath)), receipt,
          actorReady: start.logs.find(log => log.text.includes('ACTOR_ALPHA_READY')).text};
        results.push(result);
        console.log(name, width, height, result.backgroundControls, result.screenshotSha256);
      } finally {
        await client.call('qxqy_studio_play', {handle, action: 'stop'});
      }
    }
  }
} finally {
  client.close();
  saveJson(resolve(out, 'comparison.json'), {pilotSha256: hash(pilotBytes),
    scope: 'Isolated native scene and production actor-painter comparison', results});
}
