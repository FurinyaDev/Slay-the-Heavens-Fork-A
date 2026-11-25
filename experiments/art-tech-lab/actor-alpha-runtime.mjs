import {readFileSync} from 'node:fs';
import {simulatorSave} from '../coop-primitive-lab/build.mjs';
import {toLua} from '../../scripts/build-lua-data.mjs';
import {monsterActorTemplate, monsterActorTiers} from '../../scripts/monster-art.mjs';
import {applyV25BattleScene} from '../../scripts/v25-battle-scene.mjs';
import {officialAssetsTheme} from '../../scripts/official-assets-layout.mjs';

const group = (name, children, position = [0, 0], size = [1280, 720]) =>
  ({name, kind: 'container', children, position, size});
const picture = (name, position, size, colour = '#FFFFFF') =>
  ({name, kind: 'image', image: 100001, position, size, colour});
const moduleSource = name => readFileSync(new URL('../../src/lua/' + name + '.lua', import.meta.url), 'utf8');

export function actorAlphaRuntimeSave(name, backdrop, hero, monsters, heroPosition, monsterPosition, heroUnderpaint = []) {
  const theme = officialAssetsTheme(JSON.parse(readFileSync('data/presentation/ui_theme.json')));
  const placeholder = picture('portrait', [0, 0], [20, 20]);
  const underpaint = heroUnderpaint.map(({x, y, w, h, colour}, index) =>
    picture('underpaint' + index, [x, y], [w, h], colour));
  const heroHost = group('hero', [...underpaint, placeholder, group('officialFigure', [], [0, 0], [133, 133])], heroPosition, [133, 133]);
  const battle = group('battlePanel', [heroHost]);
  const mount = group('actorCoverage', [battle]);
  if (backdrop) {
    battle.children.unshift(backdrop);
  } else {
    battle.children.push(group('endTurn', []));
    applyV25BattleScene(mount, theme);
    battle.children.pop();
  }
  const full = monsterActorTiers(monsters).artData;
  const id = 'acid_slime_s', asset = full.assets[id];
  const monster = monsterActorTemplate({...full, poolCapacity: asset.capacity});
  battle.children.push({...monster, name: 'alphaMonster', visible: true, position: monsterPosition,
    children: [monster.children[0], placeholder]});
  const templates = [
    picture('alphaImageTemplate', [0, 0], [1, 1]),
    group('alphaGroupTemplate', []),
  ];
  const save = simulatorSave(name, {roots: [mount], templates});
  if (!backdrop) {
    // simulatorSave supplies an explicit default left fill. Use the production
    // scene rows' right-half geometry for the authored shared battle backdrop.
    function applyRightFill(control) {
      if (control.enableFill) control.fillHorizontalType = 'Right';
      for (const child of control.children) applyRightFill(child);
    }
    applyRightFill(save.assets.server.root);
  }
  const [img, container] = save.assets.client.root.children;
  const runtimeAssets = {imagePrefabId: img.guid, containerPrefabId: container.guid, battleApprovedNative: hero};
  // These two registration overrides make the A/B pixel grid exactly 133px.
  theme.layout.player.portrait = 133;
  theme.officialAssets.battlePortraitPosition = [0, 0];
  const data = {enabled: true, canvas: full.canvas, assets: {[id]: asset}, bindings: {[id]: id}};
  const sources = {
    abyss_theme: 'return ' + toLua(theme),
    abyss_traveler_portrait_assets: 'return ' + toLua(runtimeAssets),
    ...Object.fromEntries(['abyss_traveler_portraits', 'abyss_monster_art', 'abyss_card_display',
      'abyss_card_art_runtime', 'abyss_card_skin', 'abyss_numbers'].map(name => [name, moduleSource(name)])),
  };
  const source = `local modules,loaded={},{}
local function require(name)
  if not loaded[name] then loaded[name]=assert(modules[name],name)() end
  return loaded[name]
end
` + Object.entries(sources).map(([module, body]) => `modules.${module}=function()\n${body}\nend\n`).join('') + `
local monsterData=${toLua(data)}
function OnStart()
  local stage=script.object
  local portraits=require('abyss_traveler_portraits').new(stage,print,{battlePortrait=true})
  assert(portraits:sync('battle',false,false,'ironclad'))
  for _=1,2048 do
    if portraits:status().battle.phase=='ready' then break end
    portraits:tick()
  end
  assert(portraits:status().battle.phase=='ready',portraits:status().battle.reason)
  local box=stage:GetChild('battlePanel'):GetChild('alphaMonster')
  local art=require('abyss_monster_art').new(stage,{color=Color.FromRGBA,imageSource=Enum.ImageSource.StaticReference},
    monsterData,{find=function() return box end})
  art:select({{id='source-actor',actor={definitionId='acid_slime_s'}}})
  assert(art:write(box,0,0,106,{r=255,g=255,b=255,a=255}),'production monster art failed')
  print('ACTOR_ALPHA_READY hero='..portraits:status().battle.owned..' monster=${asset.slots.length}')
end
`;
  const root = save.assets.server.root.children[0];
  const guid = 1073790000;
  root.scriptMappingIds = [guid];
  save.assets.scripts = [{id: 'actor-alpha', guid, path: 'actor-alpha.lua', source,
    controlId: root.id, controlAsset: 'server-control-template'}];
  return save;
}
