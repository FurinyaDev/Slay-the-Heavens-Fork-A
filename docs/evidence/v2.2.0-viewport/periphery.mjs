import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import { dirname, join } from 'node:path';
import { bridge } from '../../../experiments/art-tech-lab/rpc.mjs';
import { nativeTheme } from '../../../scripts/native-ui-theme.mjs';

const [layoutFile, ...presets] = process.argv.slice(2);
assert(layoutFile && presets.length, 'Pass the generated game-ui.json and Simulator presets');
const out = process.env.VIEWPORT_PROOF_OUT ?? '.artifacts/viewport-edge';
const verifyFlights = process.env.VIEWPORT_VERIFY_FLIGHTS === '1';
fs.mkdirSync(out, { recursive: true });
const layoutBytes = fs.readFileSync(layoutFile);
const layoutSha256 = createHash('sha256').update(layoutBytes).digest('hex');
const layout = JSON.parse(layoutBytes);
const stageSpec = layout.controls.find(control => control.name === 'stage');
const battleSpec = stageSpec.children.find(control => control.name === 'battlePanel');
const select = /^(?:energy|draw|discard|exhaust|endTurn)/;
const parts = battleSpec.children.filter(control => select.test(control.name));
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
    Object.assign(node, { imageId: spec.image, imageColor: argb(spec.colour, spec.opacity), imageType: 'Basic' });
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
const choose = name => parts.find(control => control.name === name);
const projected = { ...battleSpec, children: [...parts], visible: true };
if (verifyFlights) {
  const feedback = battleSpec.children.find(control => control.name === 'feedback');
  projected.children.push({ ...feedback, children: feedback.children.filter(control => /^cardTrail\d+$/.test(control.name)) });
}
root.children = [
  convert({ ...stageSpec, children: [projected] }),
  convert(layout.controls.find(control => control.name === 'canvasBackdrop')),
];
root.scriptMappingIds = [1073760001];
const viewport = fs.readFileSync('src/lua/abyss_viewport.lua', 'utf8');
const theme = fs.readFileSync(join(dirname(layoutFile), 'abyss_theme.lua'), 'utf8');
const flight = verifyFlights ? `
local Flow=(function()
${fs.readFileSync('src/lua/abyss_card_flow.lua', 'utf8')}
end)()
local function checkFlights(battle,frame)
  local flow=Flow.new(battle,{color=Color,imageSource=Enum.ImageSource.StaticReference})
  local catalog={cards={strike={type='attack',name='Strike'}}}
  local before={hand={{uid=1,cardId='strike'}},catalog=catalog}
  local trail=battle:GetChild('feedback'):GetChild('cardTrail1')
  local layout=Theme.layout
  local bases={draw=layout.drawPile.position,discard=layout.discardPile.position,
    exhaust={layout.topBar.exhaustIcon[1],layout.topBar.y}}
  for _,pile in ipairs({'draw','discard','exhaust'})do
    local after={catalog=catalog,[pile]=before.hand}
    flow:sync(before,after)
    local burn=Flow.burn
    flow:update(pile=='exhaust'and (burn.hold+burn.burn+burn.fly) or Theme.motion.slow,catalog,{})
    local icon=battle:GetChild(pile..'Icon')
    local anchor=icon.anchorMinX-.5
    local expectedX=bases[pile][1]+anchor*(frame.input[3]-Theme.canvas.base[1])
    local iconX=icon.anchoredPositionX+anchor*frame.input[3]
    local x,y=trail.anchoredPositionX,trail.anchoredPositionY
    assert(trail.visible and flow.active[1].arrived and math.abs(x-expectedX)<1e-8,
      string.format('%s flight landed at %.5f, expected %.5f',pile,x,expectedX))
    assert(math.abs(y-bases[pile][2])<1e-8)
    assert(math.abs(x-iconX)<=icon.sizeDeltaX/2 and math.abs(y-icon.anchoredPositionY)<=icon.sizeDeltaY/2)
    print(string.format('V220_PILE_FLIGHT %s %.5f %.5f %.5f %.5f',pile,x,y,iconX,icon.anchoredPositionY))
    flow:reset()
  end
end
` : '';
const program = `
local Theme=(function()
${theme}
end)()
local Viewport
local require=function(name)
  if name=="abyss_theme" then return Theme end
  if name=="abyss_viewport" then return Viewport end
  error(name)
end
Viewport=(function()
${viewport}
end)()
${flight}
function OnStart()
  script.object.showCursor=true
  local w,h=game.GetUICanvasSize()
  local stage,_,frame=Viewport.apply(script.object,w,h,game.GetDevice()==Enum.Device.Mobile)
  local battle=stage:GetChild('battlePanel')
  ${verifyFlights ? 'checkFlights(battle,frame)' : ''}
  for _,name in ipairs({'drawIcon','discardIcon','endTurn'}) do
    local control=battle:GetChild(name)
    local hit=control:GetChild("hit") or control
    hit:AddCursorEventListener(Enum.CursorEventType.CursorClick,function(event)
      local x,y=event:GetUIPos()
      local sx,sy=Viewport.toStage(x,y,w,h)
      print(string.format("V220_BATTLE_EDGE %s %.5f %.5f %.5f %.5f",name,x,y,sx,sy))
    end)
  end
end
`;
save.assets.scripts = [{
  id: 's1', guid: 1073760001, path: 'periphery-probe.lua', source: program,
  controlId: root.id, controlAsset: 'server-control-template',
}];
save.assets.server.selectedId = root.id;
const project = out + '/periphery.save.json';
fs.writeFileSync(project, JSON.stringify(save));

const simulator = bridge();
const unpack = response => response.structuredContent;
try {
  const {serverInfo} = await simulator.request('initialize', { protocolVersion: '2024-11-05', capabilities: {},
    clientInfo: { name: 'periphery-probe', version: '1' } });
  assert.equal(serverInfo.version, '0.5.2');
  for (const preset of presets) {
    const {handle} = unpack(await simulator.call('qxqy_project_open', { path: project }));
    const act = (action, args = {}) => simulator.call('qxqy_studio_play', { handle, action, args }).then(unpack);
    const { canvasWidth, canvasHeight, canvasId } = await act('start', { canvasId: preset });
    assert.equal(canvasId, preset);
    const scale = Math.min(canvasWidth / baseWidth, canvasHeight / baseHeight);
    const points = [];
    for (const name of ['drawIcon', 'discardIcon', 'endTurn']) {
      const control = choose(name);
      const hit = control.children.find(node => node.name === 'hit') ?? control;
      const anchor = control.anchor?.min[0] ?? .5;
      const [dx, dy] = hit === control ? [0, 0] : hit.position ?? [0, 0];
      const x = canvasWidth * anchor + (control.position[0] + dx) * scale;
      const y = canvasHeight / 2 + (control.position[1] + dy) * scale;
      points.push({ name, x, y });
      await act('pointer', { type: 'down', x, y });
      await act('pointer', { type: 'up', x, y });
    }
    const {logs} = await act('get');
    const hits = logs.filter(row => row.text.startsWith('V220_BATTLE_EDGE'));
    const flights = logs.filter(row => row.text.startsWith('V220_PILE_FLIGHT'));
    assert(!logs.some(row => row.level === 'lua-error'), JSON.stringify(logs));
    assert.deepEqual(hits.map(row => row.text.split(' ')[1]), points.map(point => point.name));
    if (verifyFlights) assert.deepEqual(flights.map(row => row.text.split(' ')[1]), ['draw', 'discard', 'exhaust']);
    const shot = await simulator.call('qxqy_studio_play_screenshot', { handle });
    const receipt = unpack(shot);
    assert.deepEqual(receipt.assetWarnings, []);
    const png = Buffer.from(shot.content.find(content => content.type === 'image').data, 'base64');
    fs.writeFileSync(out + '/' + preset + '-periphery.png', png);
    const report = { layoutSha256, preset, scale, points, hits, ...(verifyFlights ? { flights } : {}), receipt,
      pngSha256: createHash('sha256').update(png).digest('hex') };
    fs.writeFileSync(out + '/' + preset + '-periphery.json', JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify(report));
    await act('stop');
  }
} finally {
  simulator.close();
}
