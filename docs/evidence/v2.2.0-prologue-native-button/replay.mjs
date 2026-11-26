import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {bridge} from '../../experiments/art-tech-lab/rpc.mjs';

const [mode,savePath,directory]=process.argv.slice(2);
assert(['before','after'].includes(mode)&&savePath&&directory);
fs.mkdirSync(directory,{recursive:true});
const b=bridge();
const unpack=result=>result.structuredContent;
const call=async(name,args)=>unpack(await b.call(name,args));
const records=[];
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');

function find(nodes,name){
  for(const n of nodes){ if(n.name===name)return n; const found=find(n.children??[],name); if(found)return found; }
}
function control(state,parts){
  const [first,...rest]=parts.split('/');
  return rest.reduce((node,name)=>node?.children.find(child=>child.name===name),find(state.tree,first));
}
function labels(node){
  if(!node?.visible || !node.activeInHierarchy)return [];
  return [...(node.text?[node.text]:[]),...(node.children??[]).flatMap(labels)];
}
function screenRect(node){
  const box=node.box;
  return {left:(box.left-160)*1.25,bottom:(box.bottom-90)*1.25,width:box.width*1.25,height:box.height*1.25};
}
function center(node){const box=screenRect(node);return {x:box.left+box.width/2,y:box.bottom+box.height/2};}
function samePoint(rect,p){return p.x>=rect.left&&p.x<=rect.left+rect.width&&p.y>=rect.bottom&&p.y<=rect.bottom+rect.height;}
function errors(state){return state.logs.filter(row=>row.level==='lua-error'||row.level==='error');}
const eventPath='stage/nodePanel/eventView';
const hitPath=eventPath+'/option1/hit';

try {
  const {serverInfo}=await b.request('initialize',{protocolVersion:'2024-11-05',capabilities:{},clientInfo:{name:'prologue-runtime-control-alias',version:'1'}});
  assert.equal(serverInfo.version,'0.5.2');
  const {handle}=await call('qxqy_project_open',{path:savePath});
  const act=(action,args={})=>call('qxqy_studio_play',{handle,action,args});
  const step=async frames=>{for(let i=0;i<frames;i++)await act('step',{dt:1/30});};
  const inspect=()=>act('get',{inspect:true});
  const initial=await act('start',{canvasId:'pc-16-9'});
  assert.deepEqual([initial.canvasWidth,initial.canvasHeight],[1600,900]);
  assert.equal(initial.mountError,null);
  const pointer=(type,point)=>act('pointer',{type,...point});
  const shot=async name=>{
    const reply=await b.call('qxqy_studio_play_screenshot',{handle});
    const png=Buffer.from(reply.content.find(row=>row.type==='image').data,'base64');
    const receipt=unpack(reply), file=`${name}.png`;
    fs.writeFileSync(path.join(directory,file),png);
    records.push({action:'screenshot',file,sha256:hash(png),receipt});
  };
  const tap=async (path,point)=>{
    const old=await inspect(); const hit=control(old,path);
    assert(hit&&hit.visible&&hit.activeInHierarchy,`inactive ${path}`);
    point??=center(hit);
    assert(samePoint(screenRect(hit),point),`${path} outside ${JSON.stringify(hit.box)} at ${JSON.stringify(point)}`);
    await pointer('down',point);
    const held=control(await inspect(),path);
    if(path===hitPath)assert(held?.pressed,`coordinates did not press ${path}`);
    console.log(JSON.stringify({tap:path,point,pressed:held?.pressed}));
    await pointer('up',point);
    records.push({action:'tap',path,point,frame:old.frame,hitId:hit.id,target:screenRect(hit),pressed:held.pressed});
  };
  await step(30);
  await tap('stage/menuPanel/start/hit');
  await step(20);
  await tap('stage/characterPanel/traveler/hit');
  await step(52);
  if(process.env.PROLOGUE_POINTER_DEBUG==='1'){
    const ready=await inspect();
    const root=control(ready,'stage/characterPanel');
    const inspectNode=n=>({name:n.name,active:n.active,visible:n.visible,activeInHierarchy:n.activeInHierarchy,raycastTarget:n.raycastTarget,interactable:n.interactable,kind:n.kind,text:n.text,box:n.box});
    const confirm=control(ready,'stage/characterPanel/confirm');
    const pt=center(control(ready,'stage/characterPanel/confirm/hit'));
    function at(nodes,trail=[]){
      return nodes.flatMap(node=>{
        if(!node.visible || !node.activeInHierarchy)return [];
        const path=[...trail,node.name];
        const found=node.box&&samePoint(node.box,pt)&&node.raycastTarget&&['button','cursor','presetButton'].includes(node.kind)?[{path:path.join('/'),...inspectNode(node)}]:[];
        return [...found,...at(node.children??[],path)];
      });
    }
    console.log(JSON.stringify({characterPanel:inspectNode(root),confirm:inspectNode(confirm),children:confirm.children.map(inspectNode),candidateReceivers:at(ready.tree),point:pt,labels:labels(root)},null,2));
    await shot('selection-debug');
  }
  await tap('stage/characterPanel/confirm/hit');
  await step(35);
  let current=await inspect();
  let currentLabels=labels(control(current,eventPath));
  assert(current.logs.some(row=>row.text.startsWith('ABYSS_RUN seed=')),JSON.stringify(current.logs));
  assert(current.logs.some(row=>row.text.startsWith('ABYSS_PAGE_REVEAL visible page=nodePanel')),JSON.stringify(current.logs));
  assert(currentLabels.some(text=>text.includes('继续')),JSON.stringify(currentLabels));
  assert.deepEqual(errors(current),[]);
  await shot('intro');
  console.log(JSON.stringify({introHit:screenRect(control(current,hitPath)),introLabels:currentLabels}));
  const originalPoint={x:517,y:105};
  const outside={x:74,y:105};
  assert(samePoint(screenRect(control(current,hitPath)),originalPoint));
  await pointer('down',originalPoint);
  await pointer('move',outside);
  await pointer('up',outside);
  assert.deepEqual(labels(control(await inspect(),eventPath)),currentLabels,'drag-out advanced the intro');
  records.push({action:'drag out',start:originalPoint,end:outside});
  await tap(hitPath,originalPoint);
  await step(6);
  current=await inspect();
  const afterLabels=labels(control(current,eventPath));
  records.push({action:'result',same:JSON.stringify(afterLabels)===JSON.stringify(currentLabels),intro:currentLabels,after:afterLabels});
  if(mode==='before') assert.deepEqual(afterLabels,currentLabels,'negative control must reproduce the blocked intro');
  else assert(afterLabels.some(text=>text.includes('选择一份恩赐')),JSON.stringify(afterLabels));
  await shot(mode==='before'?'stalled':'blessing');
  if(mode==='after'){
    await tap(hitPath);await step(6);current=await inspect();
    const resultLabels=labels(control(current,eventPath));
    assert(resultLabels.some(text=>text.includes('启程')),JSON.stringify(resultLabels));
    records.push({action:'blessing selected',labels:resultLabels});
    await shot('departure');
    await tap(hitPath);await step(35);current=await inspect();
    const map=control(current,'stage/mapPanel');
    assert(map?.visible&&map.activeInHierarchy,'departure did not reach map');
    records.push({action:'map reached',visible:map.visible,activeInHierarchy:map.activeInHierarchy});
    await shot('map');
  }
  assert.deepEqual(errors(current),[]);
  await act('stop');
  const report={mode,simulator:serverInfo.version,saveSha256:hash(fs.readFileSync(savePath)),canvas:[1600,900],luaErrors:errors(current),logs:current.logs,records};
  fs.writeFileSync(path.join(directory,'mouse-replay.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({mode,records},null,2));
} finally { b.close(); }
