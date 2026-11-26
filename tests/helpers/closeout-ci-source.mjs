import {beforeV2UiHudSource,v2UiHudSourcePaths} from './v2-ui-hud-source.mjs';
import {beforeV2UiEvidence} from './v2-p1-ci-source.mjs';
import {exactSourceMatches} from './source-fingerprint.mjs';
import {authenticateDevelopBackflow,beforePreflightSource,preflightPriorRead} from './fork-preflight-source.mjs';
import {beforeKnownMasterBackflowSource} from './master-backflow-source.mjs';
// Exact named views for immutable receipts. Current Full uses raw discovery.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {sourceSlice} from './closeout-source-epoch.mjs';
import {preRunHudCiSource,runHudPriorRead,runHudPriorInventory} from './run-hud-ci-source.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex');
const capacityRoadmapBytes=readFileSync(new URL('./role-capacity-roadmap-source.json',import.meta.url));
assert.equal(hash(capacityRoadmapBytes.toString('utf8').replaceAll('\r\n','\n')),'e0c27a383c57f64071a4c9b78fd027588ac2998d53f49119a2a8e99bb65fcd02');
const capacityRoadmapBinding=JSON.parse(capacityRoadmapBytes);
assert.equal(hash(capacityRoadmapBinding.source),capacityRoadmapBinding.before);
const namingBytes=readFileSync(new URL('./naming-package-source.json',import.meta.url),'utf8').replaceAll('\r\n','\n');
assert.equal(hash(namingBytes),'c2f602587df404d4b7bf298406e8a288c8ad01038e9029c0b5ba7e3e4f1fe4d1');
const naming=JSON.parse(namingBytes);
assert.equal(hash(naming.source),naming.before);
const bytes=readFileSync(new URL('./closeout-ci-source.json.gz',import.meta.url));
assert.equal(hash(bytes),'cfc72306af30d0d4b0b61398e3ed0eea36767d6e005c146eb215897fc431a8f8');
const packed=JSON.parse(gunzipSync(bytes));
for(const [id,source]of Object.entries(packed.records))assert.equal(hash(source),id,'complete closeout CI record');
const freeze=value=>{if(value&&typeof value==='object'&&!Object.isFrozen(value)){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
export const closeoutCiProof=freeze(packed);
function target(name){assert(Object.hasOwn(packed.targets,name),'known closeout CI view');return packed.targets[name];}
const productionSource=path=>path==='config/architecture.json'||path.startsWith('src/lua/');
function beforeSilentPlanningSource(path,source,view){
 if(view!=='pr620'||path!=='tests/lua/silent_final_potions.lua'||!exactSourceMatches(source,{
  sha256:'68a55e5dd554fb96a911dd4b69e3f596ab0ccfe5a58b630292149849314ccaa7',gitBlob:'0e712bd58829ad95c89822c9c56b2757f1c8d006',
 }))return source;
 const normalized=source.replaceAll('\r\n','\n');
 if(source!==normalized&&source!==normalized.replaceAll('\n','\r\n'))return source;
 const prior=normalized.replace("'raven_adept_solo'","'cultist_solo'");
 assert(exactSourceMatches(prior,{
  sha256:'c84da8727d33ce9e3f50f47bf1abc7a46fa40a9f4e703153e4eb35e5af6dc0d4',gitBlob:'0646eeaefec1cdd3c122214f95a95f8b25eab5f6',
 }),'exact Silent planning fixture predecessor');
 return source===normalized?prior:prior.replaceAll('\n','\r\n');
}
export function preCloseoutCiSource(path,source,view){
 const before=target(view);
 if(before.scope==='workflow-only'&&path!=='.github/workflows/quality.yml')return source;
 // Runtime projections authenticate the current production closure together.
 if(productionSource(path))return source;
 source=beforeSilentPlanningSource(path,source,view);
 source=beforePreflightSource(path,source);
 if(path===capacityRoadmapBinding.path&&typeof source==='string'&&hash(source.replaceAll('\r\n','\n'))===capacityRoadmapBinding.current)return capacityRoadmapBinding.source;
 if(path===naming.path&&typeof source==='string'&&!source.includes('\r\r\n')&&hash(source.replaceAll('\r\n','\n'))===naming.current)return naming.source;
 source=preRunHudCiSource(path,source);
 const id=Object.hasOwn(packed.current,path)?packed.current[path]:null;
 if(!id||typeof source!=='string'||hash(source.replaceAll('\r\n','\n'))!==id)return source;
 const prior=before.files[path];
 return prior?packed.records[prior]:source;
}
const relicIconsFixture='tests/official-battle-relic-icons.test.mjs';
const relicIconsCurrent={
 sha256:'42cdba9fc7ea578ad1067275d26611a643c2b7018b999f94991fbf2557f69646',
 gitBlob:'f978b5eb65466e738260511962b24aef28d8ae07',
};
const relicIconsBeforeNaming={
 sha256:'7cd900d26bdbe7b63bc735af0fd305b6faf5897a0fa2e60cd44ab8af636ae70a',
 gitBlob:'4ea1b9f4d5aeef3f3e7844a7b1a9e1bd2808f0d8',
};
function beforeRelicIconsNaming(path,source){
 if(path!==relicIconsFixture)return source;
 source=beforeKnownMasterBackflowSource(path,source);
 const text=typeof source==='string'?source.replaceAll('\r\n','\n'):source;
 const crlf=source!==text;
 assert(exactSourceMatches(source,relicIconsCurrent)&&(!crlf||source===text.replaceAll('\n','\r\n')),
  'closeout added inventory source: '+path);
 // #951 changed two encounter IDs in the live fixture. Older inventory
 // receipts still use the independently authenticated pre-rename fixture.
 assert.equal(text.split("'raven_adept_solo'").length,3,'exact #951 relic encounter replacements');
 const prior=text.replaceAll("'raven_adept_solo'","'cultist_solo'");
 assert(exactSourceMatches(prior,relicIconsBeforeNaming),'exact #951 relic fixture predecessor');
 return crlf?prior.replaceAll('\n','\r\n'):prior;
}
export function closeoutInventory(paths,view,readSource=readFileSync){
 const before=target(view);
 assert.notEqual(before.scope,'workflow-only','workflow-only views cannot project test inventories');
 const readEvidence=(path,encoding)=>beforeV2UiEvidence(path,beforeRelicIconsNaming(path,readSource(path,encoding)));
 paths=runHudPriorInventory(paths,readEvidence);
 const readPrior=runHudPriorRead(readEvidence);
 const sorted=[...paths].sort();
 if(JSON.stringify(sorted)===JSON.stringify(before.inventory))return [...paths];
 assert.deepEqual(sorted,packed.inventory,'complete raw closeout inventory');
 for(const path of packed.inventory.filter(p=>!before.inventory.includes(p))){
  const source=readPrior(path,'utf8');
  assert.equal(hash(source.replaceAll('\r\n','\n')),packed.current[path],'closeout added inventory source: '+path);
 }
 return [...before.inventory];
}
export function closeoutRead(view,read=readFileSync,{readRuntime=read}={}){
 const before=target(view);
 if(before.scope!=='workflow-only'){
  const preflight=preflightPriorRead(read),readSource=path=>preflight(path,'utf8');
  read=(path,encoding)=>{
   const raw=preflight(path,encoding);
   if(!v2UiHudSourcePaths.includes(path))return raw;
   const source=typeof raw==='string'?raw:raw.toString('utf8');
   const prior=beforeV2UiHudSource(path,source,readSource);
   return typeof raw==='string'?prior:prior===source?raw:Buffer.from(prior);
  };
 }
 return (path,encoding)=>{
  const runtime=before.scope!=='workflow-only'&&productionSource(path);
  const value=(runtime?readRuntime:read)(path,encoding),source=typeof value==='string'?value:value.toString('utf8');
  let prior=preCloseoutCiSource(path,source,view);
  if(runtime){
   const readOwner=p=>readRuntime(p,'utf8');
   const candidate=path==='config/architecture.json'?authenticateDevelopBackflow(path,source,readOwner):source;
   prior=sourceSlice(path,candidate,view,readOwner);
  }
  return typeof value==='string'?prior:prior===source?value:Buffer.from(prior);
 };
}
