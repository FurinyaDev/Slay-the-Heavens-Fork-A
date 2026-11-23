// The entrance candidate uses the current runtime. Historical replays can
// read their pinned predecessor after verifying the complete changed Lua cohort.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {exactSourceMatches as matches} from './source-fingerprint.mjs';
import {restoreExactFixtureHunks} from './exact-fixture-hunks.mjs';
import {beforeCurrentReplayFixes} from './current-replay-fix-sources.mjs';

const archive=readFileSync(new URL('../fixtures/ui-entrance-source.json.gz',import.meta.url));
assert.equal(createHash('sha256').update(archive).digest('hex'),
 '7ac3f53b242819cdb569c0a1ebf60de0605b72297a1072ea612bfeb11b0597c9','exact entrance predecessor archive');
const {base,reviewedSource,files,witnesses}=JSON.parse(gunzipSync(archive));
assert.equal(base,'301b854cd8a0bb689c3250f5b05b56bd47409780');
assert.equal(reviewedSource,'50b61b8fa243a39c189bf138a14702d73b39a903');
const owners=Object.keys(files);
export const addedEntranceModules=Object.freeze(owners.filter(path=>files[path].before===null));
const readLive=path=>readFileSync(path,'utf8');
const binding=path=>Object.hasOwn(files,path)?files[path]:undefined;
const currentInput=(path,source)=>['src/lua/abyss_node_ui_faces.lua','src/lua/abyss_game_ui.lua','src/lua/abyss_game_ui_run.lua',
 'tests/lua/shop_entry.lua','tests/helpers/combined-epoch/source-epoch-runtime.mjs'].includes(path)
 ?beforeCurrentReplayFixes(path,source):source;
function currentMatches(path,source,expected){
 const normalized=currentInput(path,source);
 if(['src/lua/abyss_node_ui_faces.lua','src/lua/abyss_game_ui.lua','src/lua/abyss_game_ui_run.lua'].includes(path)
  &&normalized===source)return false;
 return matches(normalized,expected);
}
const predecessors=new Map();

const act3MenuSource={
 path:'src/lua/abyss_game_ui_menu_view.lua',
 before:{sha256:'a8a0e37eaa4e17f3e504cf5ec21a4f8a342a127b03dde4541ab8539d2deb86bf',gitBlob:'b179a308ff877a041167b107ad6521078806e51a'},
 after:{sha256:'3aedad847857077249e9f7e94bad650c747a7a80d69a2aeb5ed75e815f98fea6',gitBlob:'d3e04cffb3675cca8b1846d776a835b9180284be'},
 hunks:[
  {at:90,before:"end\nlocal function endingTitle(run)",after:"end\nlocal function normalCampaignVictory(run)\n    local flow=run.nodeFlow\n    return run.phase=='victory' and run.act==3 and flow and flow.result=='normal_victory'\nend\nlocal function endingTitle(run)"},
  {at:97,before:"    if run.ending=='true_victory' then return '真结局 · 深渊已被封印' end\n    return '深渊已被封印'",
   after:"    if run.ending=='true_victory' then return '真结局 · 深渊已被封印' end\n    if normalCampaignVictory(run) then return '三幕冒险完成' end\n    return '深渊已被封印'"},
  {at:103,before:"    if victory and run.ending=='true_victory' then return '腐化之心已击败。真结局已达成。' end\n    return Narrative.flow[mode].full",
   after:"    if victory and run.ending=='true_victory' then return '腐化之心已击败。真结局已达成。' end\n    if victory and normalCampaignVictory(run) then return '三幕冒险已完成。本局挑战到此结束。' end\n    return Narrative.flow[mode].full"},
  {at:111,before:"    if victory and run.ending=='true_victory' then return ctx.owner.map.terminalFloor or floors end\n    return floors",
   after:"    if victory and run.ending=='true_victory' then return ctx.owner.map.terminalFloor or floors end\n    if victory and normalCampaignVictory(run) then return Acts.get(3).last end\n    return floors"},
 ],
};
const act3MenuReaders=new WeakMap();
const act3EndingFixture={
 path:'tests/lua/full_source_campaign_entry.lua',
 before:{sha256:'6eb5e8016625dd7d3586d81872814c5d28021371e2d9c4ce78f4741a5f9ea3b3',gitBlob:'7d9f18b6c5c63d4cf18593f7811fab0334b2d769'},
 after:{sha256:'93a77941f39e79436dd26058e57e4cc60022e4293b85b3c91254846fa79c0aec',gitBlob:'bf6707072ef5e17d1b017a8f7567e355568c2ccb'},
 hunks:[{at:150,
  before:"assert(host.run.act==3 and host.map.act==3 and not host.run.endingHistoryResult)\nassert(not host:advanceAct(),'missing real history/keys must keep Act4 locked')",
  after:"assert(host.run.act==3 and host.map.act==3 and not host.run.endingHistoryResult)\nassert(F.statValue(root,'floor')=='51 / 51','normal third-act result must use the real campaign floor range')\nassert(root:GetChild('menuPanel'):GetChild('title').text=='三幕冒险完成')\nassert(F.resultText(root,'subtitle')=='三幕冒险已完成。本局挑战到此结束。')\nassert(not host:advanceAct(),'missing real history/keys must keep Act4 locked')",
 }],
};

function beforeAct3EndingMenu(path,source){
 return path===act3MenuSource.path?project(path,source,act3MenuSource):source;
}

function act3MenuReader(read,authenticated=false){
 const binding=act3MenuReaders.get(read);
 if(binding){
  if(authenticated)binding.requireCurrent();
  return read;
 }
 const reader=path=>{
  const source=read(path),prior=beforeAct3EndingMenu(path,source);
  if(path===act3MenuSource.path){
   if(authenticated)assert(prior!==source,'combined linked owner identity: '+path+' during Act 3 ending validation');
   authenticated=prior!==source;
  }
  return prior;
 };
 act3MenuReaders.set(reader,{read,requireCurrent:()=>{authenticated=true;}});
 return reader;
}

function project(path,source,row){
 if(row)source=currentInput(path,source);
 if(!row||!matches(source,row.after))return source;
 if(!row.before)return null;
 if(!predecessors.has(path)){
  const prior=restoreExactFixtureHunks({
   path,beforeSha256:row.before.sha256,afterSha256:row.after.sha256,hunks:row.hunks,
  },path,source);
  assert(matches(prior,row.before),'exact entrance predecessor: '+path);
  predecessors.set(path,prior);
 }
 const prior=predecessors.get(path);
 return source.includes('\r\n')?prior.replaceAll('\n','\r\n'):prior;
}

export function beforeUiEntrance(path,source){
 return project(path,source,binding(path));
}

export function beforeUiEntranceWitness(path,source){
 if(path===act3EndingFixture.path)source=project(path,source,act3EndingFixture);
 return project(path,source,Object.hasOwn(witnesses,path)?witnesses[path]:undefined);
}

export function authenticateUiEntrance(read){
 assert.equal(typeof read,'function','linked owner reader');
 for(const owner of owners){
  let source;
  try{source=read(owner);}catch(error){assert.fail('combined linked owner missing: '+owner+': '+error.message);}
  assert(currentMatches(owner,source,files[owner].after),'combined linked owner identity: '+owner+' during entrance validation');
 }
}

export function entranceReader(read,authenticated=false){
 read=act3MenuReader(read);
 return owner=>{
  const source=read(owner);
  const row=binding(owner);
  if(!row)return source;
  if(authenticated)assert(currentMatches(owner,source,row.after),'combined linked owner identity: '+owner+' during entrance validation');
  const prior=beforeUiEntrance(owner,source);
  if(prior!==source&&!authenticated){
   authenticateUiEntrance(read);
   authenticated=true;
  }
  return prior;
 };
}

export function assertCurrentUiEntrance(path,source){
 const row=binding(path);
 if(row)assert(currentMatches(path,source,row.after),'fresh current production owner: '+path);
}

export function entrancePredecessor(path,source,read=readLive,{allowConfigLayout=false}={}){
 const input=source;
 const menuPrior=beforeAct3EndingMenu(path,source);
 if(menuPrior!==source){
  const readCurrent=act3MenuReaders.get(read)?.read??read;
  assert(matches(readCurrent(path),act3MenuSource.after),'combined linked owner identity: '+path+' during Act 3 ending validation');
  return {source:menuPrior,read:act3MenuReader(read,true)};
 }
 read=act3MenuReader(read);
 if(allowConfigLayout&&path==='config/architecture.json'&&typeof source==='string'
  &&!matches(source,files[path].after)){
  // Only the caller's JSON layout may vary. Tokens retain key order, duplicate
  // keys and string spelling; every linked owner still requires exact bytes.
  let valid=true;try{JSON.parse(source);}catch{valid=false;}
  const tokens=source.replace(/"(?:\\.|[^"\\])*"|[ \t\r\n]+/g,token=>token.startsWith('"')?token:'');
  if(valid&&createHash('sha256').update(tokens).digest('hex')==='1491505818bb5df2d41ed3db63d5463c24b71837516b09844655854b7f89682b'){
   source=read(path);
   assert(matches(source,files[path].after),'combined linked owner identity: '+path+' during entrance validation');
  }
 }
 const predecessor=beforeUiEntrance(path,source);
 if(predecessor===source)return {source:input,read};
 authenticateUiEntrance(read);
 return {source:predecessor,read:entranceReader(read,true)};
}

export function entranceInventory(paths,read){
 for(const module of addedEntranceModules){
  assert.equal(paths.filter(path=>path===module).length,1,'complete entrance module inventory: '+module);
 }
 authenticateUiEntrance(read);
 return paths.filter(path=>!addedEntranceModules.includes(path));
}
