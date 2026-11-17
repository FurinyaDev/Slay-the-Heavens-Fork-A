import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync as actualReadFileSync,readdirSync as actualReaddirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {discoverJs as actualDiscoverJs,jsShard,timings} from '../scripts/ci-shards.mjs';
import {shardLuaScripts} from '../scripts/test-lua.mjs';
import {releasePcMapSourceEpoch as sourceEpoch,sourceEpoch as actualSourceEpoch,releaseCardContactSourceEpoch,releasePcSourceEpoch,releaseSelectionMapSourceEpoch,preReleasePcSourceEpoch} from './helpers/closeout-source-epoch.mjs';
import {pcMapPacket,pcMapSource,pcMapRead,pcMapProductionRead,pcMapPriorInventory,assertPcMapCurrent,assertPcMapRawInventory,pcDomainSource,pcDomainRead,pcB9Packet,pcB9ProductionRead,pcB9PriorInventory,pcB9Source,assertPcB9Current} from './helpers/pc-map-integration.mjs';
import {releaseMergeCiPacket,releaseMergeRead,assertReleaseMergeCurrent} from './helpers/release-bootstrap-merge-ci-source.mjs';
import {assertReleasePcCiCurrent} from './helpers/release-pc-ci-source.mjs';
import {assertReleaseSelectionMapCiCurrent,assertReleaseSelectionMapExecutionGuards} from './helpers/release-selection-map-ci-source.mjs';
import {integratedSource,integratedRead} from './helpers/integrated-ci-source.mjs';
const hash=s=>createHash('sha256').update(s).digest('hex'),norm=s=>s.replaceAll('\r\n','\n');
// Exact PC/map parent assertions stay in their named view; new raw union is tested below.
const readFileSync=pcB9ProductionRead('pc',actualReadFileSync);
const discoverJs=()=>pcB9PriorInventory(actualDiscoverJs(),'pc');
const readdirSync=p=>p==='tests/lua'?pcB9PriorInventory(actualReaddirSync(p).filter(n=>n.endsWith('.lua')).map(n=>'tests/lua/'+n),'pc','lua').map(n=>n.slice(10)):actualReaddirSync(p);

test('pc map union retains both complete producer domains and exact three-way input',()=>{
 const p=sourceEpoch.proof,base=preReleasePcSourceEpoch.proof;
 const paths=['config/architecture.json',...readdirSync('src/lua').filter(p=>p.endsWith('.lua')).map(p=>'src/lua/'+p)].sort();
 assert.equal(paths.length,352);assert.equal(p.owners.length,120);assert.equal(Object.keys(p.targets).length,69);
 for(const path of paths)assert.equal(norm(readFileSync(path,'utf8')),p.current[path].source,path);
 for(const [name,target]of Object.entries(base.targets))assert.deepEqual(p.targets[name],target);
 for(const side of [releasePcSourceEpoch,releaseSelectionMapSourceEpoch])for(const [name,target]of Object.entries(side.proof.targets))assert.deepEqual(p.targets[name],target,name);
 assert.deepEqual(p.targets.releasePcReviewed.files,releasePcSourceEpoch.proof.current);
 assert.deepEqual(p.targets.releaseSelectionMapReviewed.files,releaseSelectionMapSourceEpoch.proof.current);
 const input='src/lua/abyss_game_ui_view.lua',source=p.current[input].source;
 assert.notEqual(source,releasePcSourceEpoch.proof.current[input].source);
 assert.notEqual(source,releaseSelectionMapSourceEpoch.proof.current[input].source);
 assert.equal(createHash('sha1').update('blob '+Buffer.byteLength(source)+'\0').update(source).digest('hex'),'8402aac72c995819ce8ad792b54491624a57ee41');
 assert.equal(p.currentTreeCommitted,false);
 for(const target of ['releasePcReviewed','releaseSelectionMapReviewed']){
  const read=p=>readFileSync(p,'utf8');assert.equal(sourceEpoch.preCombinedSource(input,source,{target,readSource:read}),p.targets[target].files[input].source);
  for(const owner of p.owners)for(const bad of [null,read(owner)+'\n',Buffer.from(read(owner))])
   assert.throws(()=>sourceEpoch.preCombinedSource(input,source,{target,readSource:p=>p===owner?bad:read(p)}),/linked owner/);
 }
});
test('pc map actual raw input rejects every current drift before either historical domain',()=>{
 assertPcMapCurrent();
 for(const [path,row]of Object.entries(pcMapPacket.files)){
  const raw=readFileSync(path,'utf8');assert.equal(hash(norm(raw)),row.current,path);
  for(const mode of ['missing','changed','buffer'])assert.throws(()=>assertPcMapCurrent((p,e)=>{
   if(p!==path)return actualReadFileSync(p,e);if(mode==='missing')throw Error('missing '+p);
   return mode==='buffer'?Buffer.from(raw):raw+'\n';
  }),error=>{assert(error.message.includes(path));return true;});
  for(const side of ['pc','selection'])for(const foreign of [raw+'\n',raw.slice(1),null,{},17,Buffer.from(raw)])
   assert.equal(pcMapSource(path,foreign,side),foreign,path);
  if(path.startsWith('src/')||path==='config/architecture.json')for(const side of ['pc','selection'])assert.equal(pcMapRead(side)(path,'utf8'),raw);
 }
 for(const path of Object.keys(pcMapPacket.archives))assert.throws(()=>assertPcMapCurrent((p,e)=>p===path?actualReadFileSync(p).subarray(1):actualReadFileSync(p,e)),/immutable pc\/map predecessor/);
 const nav=pcMapProductionRead('pc');
 assertReleaseMergeCurrent(nav);
 assertReleasePcCiCurrent(pcDomainRead('slicePrior'));
 assertReleaseSelectionMapCiCurrent(pcMapProductionRead('selection'));
 for(const [path,row]of Object.entries(releaseMergeCiPacket.files))for(const target of ['slicePrior','bootstrapView']){
  const raw=nav(path,'utf8'),got=releaseMergeRead(target,nav)(path,'utf8');
  assert.equal(norm(got),path.startsWith('src/')?norm(raw):row[target]?.source??norm(raw),path+':'+target);
 }
});
test('pc map actual Full inventory and execution guards cover the complete union',()=>{
 const inventories={js:discoverJs(),lua:readdirSync('tests/lua').filter(p=>p.endsWith('.lua')).map(p=>'tests/lua/'+p).sort()};
 assertReleaseSelectionMapExecutionGuards(readFileSync('.github/workflows/quality.yml','utf8'));
 assert.equal(timings.unknownJsMs,10000);assert.equal(timings.unknownLuaMs,10000);
 for(const [kind,paths]of Object.entries(inventories)){
  assert.deepEqual(paths,pcMapPacket.inventories.joint[kind]);
  for(const side of ['pc','selection']){
   assert.deepEqual(pcMapPriorInventory(paths,side,kind),pcMapPacket.inventories[side][kind]);
   for(const path of pcMapPacket.inventories[side][kind])assert(paths.includes(path));
  }
  for(const bad of [[],paths.slice(1),[...paths,paths[0]],[...paths,'tests/foreign.test.mjs']])
   assert.throws(()=>assertPcMapRawInventory(bad,kind),/raw inventory/);
 }
 for(const [platform,n]of [['win32',18],['linux',15]]){
  const bins=Array.from({length:n},(_,i)=>jsShard(inventories.js,(i+1)+'/'+n,platform));
  assert.deepEqual(bins.flatMap(b=>b.files).sort(),inventories.js);
  if(platform==='win32'){
   const lua=Array.from({length:n},(_,i)=>shardLuaScripts(inventories.lua,(i+1)+'/'+n,{...timings,windowsJsShardMs:bins[0].loads},2));
   assert.deepEqual(lua.flat().sort(),inventories.lua);
  }
 }
});
test('pc domain authorization is fresh on every call after warm success and recovery',()=>{
 const path='tests/helpers/integrated-ci-source.mjs',source=readFileSync(path,'utf8');
 const linked=sourceEpoch.proof.owners.find(p=>!Object.hasOwn(pcMapPacket.files,p));assert(linked);
 let bad=false,calls=0;
 const read=(p,e)=>{if(p===linked){calls++;if(bad)return e?readFileSync(p,e)+'\n':Buffer.concat([readFileSync(p),Buffer.from('\n')]);}return actualReadFileSync(p,e);};
 const expected=releaseMergeCiPacket.files[path].slicePrior.source;
 for(let i=0;i<2;i++){calls=0;assert.equal(pcDomainSource(path,source,'slicePrior',read),expected);assert(calls>0);}
 bad=true;assert.throws(()=>pcDomainSource(path,source,'slicePrior',read),/linked owner identity/);
 bad=false;calls=0;assert.equal(pcDomainSource(path,source,'slicePrior',read),expected);assert(calls>0);
});
test('accepted pc domains freshly reject map-only CI source and archive drift',()=>{
 const path='tests/helpers/integrated-ci-source.mjs',source=readFileSync(path,'utf8'),expected=releaseMergeCiPacket.files[path].slicePrior.source;
 assert.equal(pcDomainSource(path,source,'slicePrior'),expected);
 assert.deepEqual(pcDomainRead('slicePrior')(path),Buffer.from(expected));
 const opaque=Buffer.from(source);assert.equal(pcDomainRead('slicePrior',()=>opaque)(path,'utf8'),opaque,'wrong-typed UTF8 input remains opaque');
 for(const owner of ['scripts/official-map-return-controls.mjs','tests/helpers/release-selection-map-ci-source.json.gz']){
  assert(Object.hasOwn(pcMapPacket.files,owner)||Object.hasOwn(pcMapPacket.archives,owner));
  for(const absent of [false,true])assert.throws(()=>pcDomainSource(path,source,'slicePrior',(p,e)=>{
   if(p!==owner)return actualReadFileSync(p,e);if(absent)throw Error('missing '+p);
   const raw=actualReadFileSync(p,e);return typeof raw==='string'?raw+'\n':Buffer.concat([raw,Buffer.from('\n')]);
  }),error=>{assert(error.message.includes(owner));return true;});
  assert.equal(pcDomainSource(path,source,'slicePrior'),expected,'fresh recovery after '+owner);
 }
 let reads=0;const foreign=source+'\n';
 assert.equal(pcDomainSource(path,foreign,'slicePrior',()=>{reads++;throw Error('foreign read');}),foreign);assert.equal(reads,0);
});
test('integrated public source and reader freshly reject map-only drift after warm success',()=>{
 const path='tests/ci-complete-calibration.test.mjs',source=readFileSync(path,'utf8');
 const expected=integratedSource(path,source,'native');assert.notEqual(expected,source);
 for(const owner of ['scripts/official-map-return-controls.mjs','tests/helpers/release-selection-map-ci-source.json.gz']){
  let bad=false,absent=false;
  const read=(p,e)=>{
   if(!bad||p!==owner)return actualReadFileSync(p,e);if(absent)throw Error('missing '+p);
   const raw=actualReadFileSync(p,e);return typeof raw==='string'?raw+'\n':Buffer.concat([raw,Buffer.from('\n')]);
  };
  const reader=integratedRead('native',{read});
  assert.equal(integratedSource(path,source,'native',read),expected);assert.equal(reader(path,'utf8'),expected);
  bad=true;
  for(absent of [false,true])for(const call of [()=>integratedSource(path,source,'native',read),()=>reader(path,'utf8')])
   assert.throws(call,error=>{assert(error.message.includes(owner));return true;});
  bad=false;assert.equal(integratedSource(path,source,'native',read),expected);assert.equal(reader(path,'utf8'),expected);
 }
 let reads=0;const foreign=source+'\n';assert.equal(integratedSource(path,foreign,'native',()=>{reads++;throw Error('foreign read');}),foreign);assert.equal(reads,0);
});

test('PC B9 raw union retains both full parent source domains and the sole inherited card contact owner',()=>{
 const p=actualSourceEpoch.proof,pc=sourceEpoch.proof,b9=releaseCardContactSourceEpoch.proof;
 assert.equal(p.owners.length,121);assert.deepEqual(p.owners,[...pc.owners,'src/lua/abyss_card_flow.lua'].sort());
 const paths=['config/architecture.json',...actualReaddirSync('src/lua').filter(n=>n.endsWith('.lua')).map(n=>'src/lua/'+n)].sort();
 assert.equal(paths.length,352);
 for(const path of paths)assert.equal(norm(actualReadFileSync(path,'utf8')),p.current[path].source,path+' actual current');
 for(const before of [pc,b9])for(const [name,target]of Object.entries(before.targets))assert.deepEqual(p.targets[name],target,name+' complete parent');
 assert.deepEqual(p.targets.releasePcMapReviewed.files,pc.current);assert.deepEqual(p.targets.releaseCardContactReviewed.files,b9.current);
 assert.deepEqual(paths.filter(path=>p.current[path].sha256!==pc.current[path].sha256),['src/lua/abyss_card_flow.lua']);
 assert.equal(p.current['src/lua/abyss_card_flow.lua'].gitBlob,'486b63e804f138ee7a1ba1dc8241bdf9d3b99731');
 assert.equal(p.current['src/lua/abyss_game_ui_view.lua'].gitBlob,'8402aac72c995819ce8ad792b54491624a57ee41');
});

test('PC B9 current and historical readers reject warm source archive and owner drift through the same raw caller',()=>{
 assertPcB9Current();const anchor='tests/helpers/integrated-ci-source.mjs',source=actualReadFileSync(anchor,'utf8');
 let bad=null,value;const read=(p,e)=>p===bad?value:actualReadFileSync(p,e);
 for(const side of ['pc','b9']){
  bad=null;const before=pcB9Source(anchor,source,side,read);assert.notEqual(before,source);
  for(const path of [Object.keys(pcB9Packet.files)[0],'src/lua/abyss_card_flow.lua','tests/helpers/pc-b9-ci-source.json.gz']){
   for(const replacement of [null,actualReadFileSync(path,'utf8')+'\n']){
    bad=path;value=replacement;assert.throws(()=>pcB9Source(anchor,source,side,read),error=>{assert(error.message.includes(path));return true;});
    bad=null;assert.equal(pcB9Source(anchor,source,side,read),before);
   }
  }
 }
 const actual={js:actualDiscoverJs(),lua:actualReaddirSync('tests/lua').filter(n=>n.endsWith('.lua')).map(n=>'tests/lua/'+n).sort()};
 for(const kind of ['js','lua'])assert.deepEqual(actual[kind],pcB9Packet.inventory[kind]);
 for(const kind of ['js','lua'])for(const broken of [actual[kind].slice(1),[...actual[kind],actual[kind][0]],[...actual[kind],'tests/foreign.'+kind]])
  assert.throws(()=>pcB9PriorInventory(broken,'pc',kind),/raw inventory/);
});
