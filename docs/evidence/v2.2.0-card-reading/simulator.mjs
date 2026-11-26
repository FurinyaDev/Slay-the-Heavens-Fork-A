import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import { dirname, join } from 'node:path';
import { bridge } from './../../experiments/art-tech-lab/rpc.mjs';
import { nativeTheme } from './../../scripts/native-ui-theme.mjs';

import { execFileSync } from 'node:child_process';
const [generated, output, before, after, ...presets] = process.argv.slice(2);
assert(generated && output && before && after && presets.length, 'pass generated UI, output, before/after SHA, canvas preset(s)');
fs.mkdirSync(output,{recursive:true});
const read = name => fs.readFileSync(join(generated,name));
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const layoutBytes = read('game-ui.json');
const layout = JSON.parse(layoutBytes);
const stageSpec = layout.controls.find(control => control.name === 'stage');
const battleSpec = stageSpec.children.find(control => control.name === 'battlePanel');
const [baseWidth, baseHeight] = nativeTheme.canvas.base;
const save = JSON.parse(fs.readFileSync('experiments/art-tech-lab/seed.save.json'));
const root = save.assets.server.root.children[0];
const samples = Object.fromEntries(root.children.map(control => [control.kind, control]));
const kinds = {
  container: 'container', image: 'image', text: 'textbox', cursorArea: 'cursor', presetButton: 'button',
};
const alignments = { left: 'Left', right: 'Right', centre: 'Middle', top: 'Top', bottom: 'Bottom' };
function argb(colour = '#FFFFFF', opacity) {
  const alpha = opacity ?? Number.parseInt(colour.length === 9 ? colour.slice(7) : 'FF', 16) / 255;
  return (Math.round(alpha * 255) * 0x1000000) + Number.parseInt(colour.slice(1, 7), 16);
}
const vector = ([x, y]) => ({ x, y });
let id = 1073750000;
function convert(spec) {
  const kind = kinds[spec.kind];
  assert(kind, spec.kind);
  const node = structuredClone(kind === 'container' ? root : samples[kind]);
  Object.assign(node, { name: spec.name, id: 'vp' + ++id, guid: id, scriptMappingIds: [] });
  delete node.isRootContainer;
  node.children = [...(spec.children ?? [])].reverse().map(convert);
  node.visible = spec.visible !== false;
  node.active = spec.active !== false;
  for (const transform of Object.values(node.transformByPlatform)) {
    transform.offset = vector(spec.position ?? [0, 0]);
    transform.size = vector(spec.size ?? [0, 0]);
    transform.anchorMin = vector(spec.anchor?.min ?? [.5, .5]);
    transform.anchorMax = vector(spec.anchor?.max ?? [.5, .5]);
    transform.pivot = vector(spec.pivot ?? [.5, .5]);
    transform.scale = { ...vector(spec.scale ?? [1, 1]), z: 1 };
    const [x, y, z] = Array.isArray(spec.rotation) ? spec.rotation : [0, 0, spec.rotation ?? 0];
    transform.rotation = { x, y, z };
  }
  if (kind === 'image') {
    Object.assign(node, { imageId: spec.image, imageColor: argb(spec.colour, spec.opacity), imageType: spec.imageType === 'stretch' ? 'Stretch' : 'Basic' });
  }
  if (kind === 'textbox') {
    const text = spec.text ?? {};
    Object.assign(node, { text: text.content, fontSize: text.fontSize, minimumFontSize: text.minFontSize,
      fontColor: argb(text.colour, text.opacity), bgColor: 0,
      horizontalAlignment: alignments[text.align] ?? 'Middle', verticalAlignment: alignments[text.valign] ?? 'Middle' });
  }
  if (kind === 'cursor' || kind === 'button') {
    node.raycastTarget = true;
    node.interactable = spec.enabled !== false;
  }
  if (spec.states) {
    for (const [state, field] of [['hover', 'hoverChildId'], ['pressed', 'pressedChildId'], ['disabled', 'unavailableChildId']]) {
      node[field] = node.children.find(control => control.name === spec.states[state])?.id ?? null;
    }
  }
  return node;
}
const enemy = structuredClone(JSON.parse(read('game-ui-templates.json')).find(template => template.name === 'AbyssMonsterActor'));
enemy.name = 'probeEnemy';
enemy.visible = true;
enemy.active = true;
enemy.position = [0, -20];
enemy.children = enemy.children.filter(control => ['portrait','hpBorder','hpTrack','hp','intentIcon'].includes(control.name));
const bar = enemy.children.find(control => control.name === 'hp');
bar.position = [0,-155];
bar.text.content = '40/40';
for (const name of ['hpBorder','hpTrack']) {
  enemy.children.find(control => control.name === name).position = [0,-155];
}
const card = structuredClone(battleSpec.children.find(control => control.name === 'card1'));
card.visible = true;
for (const [name,text] of Object.entries({name:'打击',type:'攻击',label:'造成 6 点伤害。',cost:'1'})) {
  card.children.find(control => control.name === name).text.content = text;
}
const parts = battleSpec.children.filter(control => /^(?:chapterBattleScene|energy|draw|discard|endTurn)/.test(control.name));
const projected = { ...battleSpec, children: [...parts, enemy, card], visible: true };
root.children = [convert({ ...stageSpec, children: [projected] }), convert(layout.controls.find(control => control.name === 'canvasBackdrop'))];
root.scriptMappingIds = [1073760001];
const source = (ref,file) => execFileSync('git',['show',`${ref}:src/lua/${file}.lua`],{encoding:'utf8'});
const unpack = response => response.structuredContent;
const sections = presets.flatMap(preset => ['clear','near'].map(lane => ({preset,lane})));
const makeProgram = (viewport,cardLayout,lane) => `
local Theme=(function()\n${read('abyss_theme.lua')}\nend)()
local Viewport
local controls
local actor={hp=40}
local healthNames={'hpBorder','hpTrack','hp'}
local enemyView={geometry=function()
  local hp=controls.enemy:GetChild('hp')
  return {x=controls.enemy.anchoredPositionX,y=controls.enemy.anchoredPositionY,
    healthX=hp.anchoredPositionX,healthY=hp.anchoredPositionY,healthTextY=hp.anchoredPositionY,
    healthHeight=controls.enemy:GetChild('hpTrack').sizeDeltaY,hitWidth=hp.sizeDeltaX}
end}
local require=function(name)
  if name=='abyss_theme' then return Theme end
  if name=='abyss_viewport' then return Viewport end
  if name=='abyss_run' then return {} end -- no gameplay command is called by this focused rendering probe
  if name=='abyss_actor' then return {isActive=function(value)return value.hp>0 end} end
  if name=='abyss_battle_enemy_view' then return enemyView end -- read actual native health-control bounds
  error(name)
end
Viewport=(function()\n${viewport}\nend)()
local Layout=(function()\n${cardLayout}\nend)()
function OnStart()
  local root=script.object
  root.showCursor=true
  local w,h=game.GetUICanvasSize()
  local stage,_,frame=Viewport.apply(root,w,h,game.GetDevice()==Enum.Device.Mobile)
  local battle=stage:GetChild('battlePanel')
  controls={enemy=battle:GetChild('probeEnemy'),card=battle:GetChild('card1')}
  local healthX=${lane === 'near' ? 0 : 440}
  controls.enemy:SetAnchoredPosition(healthX,-20)
  for _,name in ipairs(healthNames) do
    controls.enemy:GetChild(name):SetAnchoredPosition(0,-155)
  end
  local owner={handWidthExtra=frame.input[3]-Theme.canvas.base[1]}
  local layout=Layout.install(owner)
  local isSelected=false
  local function draw(phase)
    if layout.prepareHandFocus then layout.prepareHandFocus({enemies={actor}}) end
    layout.placeCard(controls.card,1,0,isSelected)
    local hit=controls.card:GetChild('hit')
    print(string.format('READING %s %.6f %.6f %.6f %.6f %.6f %.6f %.6f %.6f',phase,
      controls.card.anchoredPositionX,controls.card.anchoredPositionY,controls.card.localScaleX,
      controls.card.localRotationZ,hit.sizeDeltaX,hit.sizeDeltaY,healthX,controls.enemy.anchoredPositionY-155))
  end
  draw('idle')
  controls.card:GetChild('hit'):AddCursorEventListener(Enum.CursorEventType.CursorClick,function()
    isSelected=not isSelected
    draw(isSelected and 'selected' or 'cancelled')
  end)
end
`;
const simulator = bridge();
const rows = [];
try {
  const {serverInfo} = await simulator.request('initialize',{protocolVersion:'2024-11-05',capabilities:{},clientInfo:{name:'card-reading-proof',version:'1'}});
  assert.equal(serverInfo.version,'0.5.2');
  for (const label of ['before','after']) {
    const ref = label === 'before' ? before : after;
    const viewport = source(ref,'abyss_viewport');
    const cardLayout = source(ref,'abyss_battle_card_layout');
    for (const {preset,lane} of sections) {
      const stem = `${label}-${preset}-${lane}`;
      const program = makeProgram(viewport, cardLayout, lane);
      save.assets.scripts=[{id:'s1',guid:1073760001,path:'reading-probe.lua',source:program,controlId:root.id,controlAsset:'server-control-template'}];
      save.assets.server.selectedId=root.id;
      const project=join(output,stem+'.save.json');
      fs.writeFileSync(project,JSON.stringify(save));
      const {handle}=unpack(await simulator.call('qxqy_project_open',{path:project}));
      const act=(action,args={})=>simulator.call('qxqy_studio_play',{handle,action,args}).then(unpack);
      const {canvasWidth,canvasHeight,canvasId}=await act('start',{canvasId:preset});
      assert.equal(canvasId,preset);
      const k=Math.min(canvasWidth/baseWidth,canvasHeight/baseHeight);
      const click={x:canvasWidth/2,y:canvasHeight/2-267*k};
      async function tap(){ await act('pointer',{type:'down',...click}); await act('pointer',{type:'up',...click}); }
      await tap();
      const shot=await simulator.call('qxqy_studio_play_screenshot',{handle});
      const receipt=unpack(shot);
      assert.deepEqual(receipt.assetWarnings,[]);
      const png=Buffer.from(shot.content.find(content=>content.type==='image').data,'base64');
      fs.writeFileSync(join(output,stem+'.png'),png);
      await tap();
      const {logs}=await act('get');
      assert(!logs.some(row=>row.level==='lua-error'),JSON.stringify(logs));
      const states=logs.filter(row=>row.text.startsWith('READING ')).map(row=>{
        const [,phase,...parts]=row.text.split(' ');
        const [x,y,scale,angle,hitWidth,hitHeight,healthX,healthY]=parts.map(Number);
        return {phase,x,y,scale,angle,hitWidth,hitHeight,healthX,healthY};
      });
      assert.deepEqual(states.map(state=>state.phase),['idle','selected','cancelled'],JSON.stringify(logs));
      assert.deepEqual({...states[0],phase:'cancelled'},states[2]);
      const row={ref,label,preset,lane,canvasWidth,canvasHeight,layoutSha256:digest(layoutBytes),viewportSha256:digest(viewport),layoutModuleSha256:digest(cardLayout),click,states,pngSha256:digest(png),receipt};
      rows.push(row);
      fs.writeFileSync(join(output,stem+'.json'),JSON.stringify(row,null,2)+'\n');
      console.log(JSON.stringify(row));
      await act('stop');
    }
  }
  const pose=(label,preset,lane)=>{
    const {healthX,healthY,...state}=rows.find(row=>row.label===label&&row.preset===preset&&row.lane===lane).states[1];
    return state;
  };
  for(const preset of presets){
    assert.deepEqual(pose('after',preset,'near'),pose('after',preset,'clear'));
    assert.deepEqual(pose('after',preset,'clear'),pose('before',preset,'clear'));
    if(preset==='mobile-16-9')assert.deepEqual(pose('before',preset,'near'),pose('before',preset,'clear'));
    else assert.notDeepEqual(pose('before',preset,'near'),pose('before',preset,'clear'));
  }
} finally { simulator.close(); }
