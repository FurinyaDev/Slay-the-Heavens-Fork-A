// The entrance candidate uses the current runtime. Historical replays can
// read their pinned predecessor after verifying the complete changed Lua cohort.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {exactSourceMatches as matches} from './source-fingerprint.mjs';
import {restoreExactFixtureHunks} from './exact-fixture-hunks.mjs';

const archive=readFileSync(new URL('../fixtures/ui-entrance-source.json.gz',import.meta.url));
assert.equal(createHash('sha256').update(archive).digest('hex'),
 '4063625ad7c48bbc73e7b614d2344ab63f0091055deec439ca947590c2948429','exact entrance predecessor archive');
const {base,reviewedSource,files,witnesses}=JSON.parse(gunzipSync(archive));
assert.equal(base,'73c21489efaab409d4c0c46bee517d410d3427fc');
assert.equal(reviewedSource,'50b61b8fa243a39c189bf138a14702d73b39a903');
const owners=Object.keys(files);
export const addedEntranceModules=Object.freeze(owners.filter(path=>files[path].before===null));
const readLive=path=>readFileSync(path,'utf8');
const binding=path=>Object.hasOwn(files,path)?files[path]:undefined;
const predecessors=new Map();

function project(path,source,row){
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
 return project(path,source,Object.hasOwn(witnesses,path)?witnesses[path]:undefined);
}

export function authenticateUiEntrance(read){
 for(const owner of owners){
  let source;
  try{source=read(owner);}catch(error){assert.fail('combined linked owner missing: '+owner+': '+error.message);}
  assert(matches(source,files[owner].after),'combined linked owner identity: '+owner+' during entrance validation');
 }
}

export function entranceReader(read,authenticated=false){
 return owner=>{
  const source=read(owner);
  const row=binding(owner);
  if(!row)return source;
  if(authenticated)assert(matches(source,row.after),'combined linked owner identity: '+owner+' during entrance validation');
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
 if(row)assert(matches(source,row.after),'fresh current production owner: '+path);
}

export function entrancePredecessor(path,source,read=readLive){
 const predecessor=beforeUiEntrance(path,source);
 if(predecessor===source)return {source,read};
 authenticateUiEntrance(read);
 return {source:predecessor,read:entranceReader(read,true)};
}

export function entranceInventory(paths,read){
 assert(addedEntranceModules.every(path=>paths.includes(path)),'complete entrance module inventory');
 authenticateUiEntrance(read);
 return paths.filter(path=>!addedEntranceModules.includes(path));
}
