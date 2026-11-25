import assert from 'node:assert/strict';
import fs from 'node:fs';
import {withViewport} from '../../../scripts/viewport-layout.mjs';
import {nativeTheme} from '../../../scripts/native-ui-theme.mjs';
import {bridge} from '../../../experiments/art-tech-lab/rpc.mjs';

const out='.artifacts/viewport-proof';
fs.mkdirSync(out,{recursive:true});
const [baseWidth,baseHeight]=nativeTheme.canvas.base;
const save=JSON.parse(fs.readFileSync('experiments/art-tech-lab/seed.save.json'));
const root=save.assets.server.root.children[0];
const samples=Object.fromEntries(root.children.map(n=>[n.kind,n]));
const [backdrop,stage]=withViewport({controls:[]},nativeTheme).controls;
root.name='viewportProbe';
root.children=[];
let sequence=0;
function add(parent,kind,name,{x=0,y=0,w=0,h=0,anchorMin=[.5,.5],anchorMax=anchorMin,color=0xffffffff}={}) {
  const node=structuredClone(kind==='container'?root:samples[kind]);
  node.children=[];node.id='vp'+ ++sequence;node.guid=1073750000+sequence;node.name=name;node.scriptMappingIds=[];delete node.isRootContainer;
  for(const transform of Object.values(node.transformByPlatform)){
    transform.offset={x,y};transform.size={x:w,y:h};
    transform.anchorMin={x:anchorMin[0],y:anchorMin[1]};transform.anchorMax={x:anchorMax[0],y:anchorMax[1]};
    transform.scale={x:1,y:1,z:1};
  }
  if(kind==='image'){node.imageId=100001;node.imageColor=color}
  parent.children.unshift(node);
  return node;
}
add(root,'image',backdrop.name,{w:backdrop.size[0],h:backdrop.size[1],anchorMin:backdrop.anchor.min,anchorMax:backdrop.anchor.max,color:0xff192c42});
const nested=add(root,'container',stage.name,{w:stage.size[0],h:stage.size[1]});
add(nested,'image','stageRect',{w:baseWidth,h:baseHeight,color:0xff334762});
add(nested,'image','centerSquare',{w:100,h:100,color:0xffbbb682});
for(const [i,x] of [[1,60],[2,-60]]) {
  const box={x,y:-80,w:70,h:60,anchorMin:[i-1,.5]};
  add(nested,'image','badge'+i,{...box,color:i===1?0xff69c785:0xffc78069});
  add(nested,'cursor','hit'+i,box);
}
const lua=fs.readFileSync('src/lua/abyss_viewport.lua','utf8');
const program=`
local require=function(name)
  assert(name=="abyss_theme")
  return {canvas={base={${baseWidth},${baseHeight}},mobileBleedX=${nativeTheme.canvas.mobileBleedX}}}
end
local Viewport=(function()
${lua}
end)()
function OnStart()
  script.object.showCursor=true
  local w,h=game.GetUICanvasSize()
  local mobile=game.GetDevice()==Enum.Device.Mobile
  local stage,scale,frame=Viewport.apply(script.object,w,h,mobile)
  assert(stage.sizeDeltaX==frame.input[3] and stage.sizeDeltaY==frame.input[4])
  print(string.format("V220_VIEWPORT canvas %d %d scale %0.8f device %s",w,h,scale,tostring(game.GetDevice())))
  print(string.format("V220_VIEWPORT frame logical %.4f %.4f visual %.4f %.4f",frame.input[3],frame.input[4],frame.visual[3],frame.visual[4]))
  for i=1,2 do
    local anchor=(i==1 and -1 or 1)*(frame.input[3]/2-60)
    local hit=stage:GetChild("hit"..i)
    hit:AddCursorEventListener(Enum.CursorEventType.CursorClick,function(event)
      local x,y=event:GetUIPos()
      local mx,my=game.GetCursorUIPos()
      assert(x==mx and y==my,"event and cursor use different origins")
      local sx,sy=Viewport.toStage(x,y,w,h)
      assert(math.abs(sx-anchor)<1 and math.abs(sy+80)<1,"stage point outside anchor")
      print(string.format("V220_VIEWPORT hit %d ui %.5f %.5f cursor %.5f %.5f local %.5f %.5f",i,x,y,mx,my,sx,sy))
    end)
  end
end`;
save.assets.server.selectedId=root.id;
save.assets.scripts=[{id:'s1',guid:1073760001,path:'viewport-proof.lua',source:program,controlId:root.id,controlAsset:'server-control-template'}];
root.scriptMappingIds=[1073760001];
const project=out+'/viewport.save.json';
fs.writeFileSync(project,JSON.stringify(save));
const b=bridge();
const unpack=r=>r.structuredContent??JSON.parse(r.content.find(c=>c.type==='text').text);
try {
  const status=await b.request('initialize',{protocolVersion:'2024-11-05',capabilities:{},clientInfo:{name:'viewport-proof',version:'1'}});
  assert.equal(status.serverInfo.version,'0.5.2');
  const ids=process.argv.slice(2);
  for(const id of ids){
    const {handle}=unpack(await b.call('qxqy_project_open',{path:project}));
    const call=(action,args)=>b.call('qxqy_studio_play',{handle,action,args}).then(unpack);
    const initial=await call('start',{canvasId:id,muteAudio:false});
    assert.equal(initial.canvasId,id);
    const result=await b.call('qxqy_studio_play_screenshot',{handle});
    const png=Buffer.from(result.content.find(c=>c.type==='image').data,'base64');
    const width=png.readUInt32BE(16),height=png.readUInt32BE(20);
    const scale=Math.min(width/baseWidth,height/baseHeight);
    const y=height/2-80*scale;
    for(const x of [60*scale,width-60*scale]){
      await call('pointer',{type:'down',x,y});
      await call('pointer',{type:'up',x,y});
    }
    const state=await call('get');
    assert.equal(state.logs.filter(line=>line.text.includes('V220_VIEWPORT hit ')).length,2);
    assert(!state.logs.some(line=>line.level==='lua-error'));
    fs.writeFileSync(out+'/'+id+'.png',png);
    const {canvasWidth,canvasHeight,platform,device,logs}=state;
    const receipt=unpack(result);
    assert.deepEqual(receipt.assetWarnings,[]);
    fs.writeFileSync(out+'/'+id+'.result.json',JSON.stringify({canvasWidth,canvasHeight,platform,device,logs,receipt},null,2)+'\n');
    console.log(id,width,height,JSON.stringify(state.logs??state.snapshot?.logs));
    await call('stop',{});
  }
} finally {b.close()}
