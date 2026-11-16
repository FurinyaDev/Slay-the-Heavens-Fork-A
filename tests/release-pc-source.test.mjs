import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync as physicalReadFileSync,readdirSync} from 'node:fs';
import {releaseMergeRead,releaseMergeSource,releaseMergeCiPacket,assertReleaseMergeCurrent,assertReleaseMergeGitProvenance,releaseMergeArchivedGitRead} from './helpers/release-bootstrap-merge-ci-source.mjs';
const readFileSync=releaseMergeRead('slicePrior',physicalReadFileSync);
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {discoverJs} from '../scripts/ci-shards.mjs';
import {sourceEpoch,preReleasePcSourceEpoch,preSplitSourceEpoch} from './helpers/closeout-source-epoch.mjs';
import {releasePcSourcePacket,releasePcSplitSourcePacket,extendReleasePcSource} from './helpers/release-pc-source.mjs';
import {releasePcCiPacket,releasePcCiSource,releasePcPriorInventory,assertReleasePcRawInventory,assertReleasePcCiCurrent,releasePcSplitPriorSource} from './helpers/release-pc-ci-source.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex'),norm=s=>s.replaceAll('\r\n','\n');

test('release PC production preserves every complete prior target and freshly authenticates the committed source tree',()=>{
 const p=sourceEpoch.proof,prior=preReleasePcSourceEpoch.proof;
 for(const [name,target]of Object.entries(prior.targets))assert.deepEqual(p.targets[name],target,name);
 assert.deepEqual(p.targets.releasePcPrior.files,prior.current);
 assert.equal(p.currentTreeCommitted,true);assert.equal(p.currentCommit,releasePcSplitSourcePacket.currentCommit);
 assert.equal(preSplitSourceEpoch.proof.currentCommit,releasePcSourcePacket.currentCommit);
 assert.equal(preSplitSourceEpoch.proof.owners.length,119);
 assert.deepEqual(p.targets.releasePcSplitPrior.files,preSplitSourceEpoch.proof.current);
 assert.deepEqual(p.owners,[...preSplitSourceEpoch.proof.owners,'src/lua/abyss_combat_enemy_setup.lua'].sort());
 for(const [name,target]of Object.entries(preSplitSourceEpoch.proof.targets))assert.deepEqual(p.targets[name],target,name);
 const files=['config/architecture.json',...readdirSync('src/lua').filter(n=>n.endsWith('.lua')).map(n=>'src/lua/'+n)].sort();
 assert.deepEqual(files,Object.keys(p.current).filter(path=>p.current[path]!==null).sort());
 for(const path of files)assert.equal(norm(readFileSync(path,'utf8')),p.current[path].source,path);
 for(const [path,before]of Object.entries(releasePcSourcePacket.before))assert.deepEqual(before,prior.current[path]);
 assert.throws(()=>extendReleasePcSource(preReleasePcSourceEpoch,{...releasePcSourcePacket,current:{}}),/approved release PC after bindings/);
});

test('release PC CI validates complete live bindings while unknown or changed bytes stay visible',()=>{
 assertReleasePcCiCurrent(readFileSync);
 for(const [path,row]of Object.entries(releasePcCiPacket.files)){
   const source=norm(releasePcSplitPriorSource(path,readFileSync(path,'utf8')));assert.equal(hash(source),row.current.sha256,path);
  const production=path.startsWith('src/')||path==='config/architecture.json';
  assert.equal(releasePcCiSource(path,source),production?source:row.before?.source??source,path);
  for(const foreign of [source+'\n',source.slice(1),null,{},17])assert.equal(releasePcCiSource(path,foreign),foreign,path);
  for(const foreignPath of ['__proto__','constructor','foreign/'+path])assert.equal(releasePcCiSource(foreignPath,source),source);
  assert.throws(()=>assertReleasePcCiCurrent((p,encoding)=>{
   const raw=readFileSync(p,encoding);return p===path?typeof raw==='string'?raw+'\n':Buffer.concat([raw,Buffer.from('\n')]):raw;
  }),/fresh complete integration source/);
 }
 for(const path of Object.keys(releasePcSourcePacket.current))assert.equal(releasePcCiSource(path,sourceEpoch.proof.current[path].source),sourceEpoch.proof.current[path].source,'CI does not intercept production authorization');
});

test('release PC raw JS and Lua inventories reject missing duplicate foreign and changed additions',()=>{
 const inventories={js:discoverJs(),lua:readdirSync('tests/lua').filter(n=>n.endsWith('.lua')).map(n=>'tests/lua/'+n).sort()};
 for(const [kind,paths]of Object.entries(inventories)){
  assert.deepEqual(paths,releasePcCiPacket.currentInventory[kind]);
  assertReleasePcRawInventory(paths,kind);
  assert.deepEqual(releasePcPriorInventory(paths,kind,readFileSync),releasePcCiPacket.priorInventory[kind]);
  const opaque=[`tests/${kind==='lua'?'lua/':''}foreign.${kind==='lua'?'lua':'test.mjs'}`];
  assert.deepEqual(releasePcPriorInventory(opaque,kind),opaque,'unrelated historical input stays opaque for its own validator');
  const noAdditions=paths.filter(path=>releasePcCiPacket.priorInventory[kind].includes(path));
  assert.throws(()=>assertReleasePcRawInventory(noAdditions,kind),/raw discovery inventory/,'deleting every release addition cannot pass raw Full validation');
  assert.throws(()=>assertReleasePcRawInventory(opaque,kind),/raw discovery inventory/);
  for(const bad of [paths.slice(1),[...paths,paths[0]],[...paths,`tests/${kind==='lua'?'lua/':''}foreign.${kind==='lua'?'lua':'test.mjs'}`]])
   assert.throws(()=>releasePcPriorInventory(bad,kind),/raw .* inventory/);
  for(const path of paths.filter(p=>!releasePcCiPacket.priorInventory[kind].includes(p)))
   assert.throws(()=>releasePcPriorInventory(paths,kind,(p,e)=>readFileSync(p,e)+(p===path?'\n':'')),/fresh release PC added inventory source/);
 }
});

test('actual Release merge authenticates separate slice and bootstrap views with fresh complete current bindings',()=>{
 assertReleaseMergeCurrent();
 for(const [path,row]of Object.entries(releaseMergeCiPacket.files)){
  const current=physicalReadFileSync(path,'utf8').replaceAll('\r\n','\n');
  assert.equal(hash(current),row.current.sha256,path);
  const production=path.startsWith('src/')||path==='config/architecture.json';
  for(const target of ['slicePrior','bootstrapView']){
   assert.equal(releaseMergeSource(path,current,target),production?current:row[target]?.source??current,path+':'+target);
   for(const foreign of [current+'\n',current.slice(1),current.replaceAll('\n','\r\r\n'),Buffer.from(current),null,17]){
    let reads=0;assert.equal(releaseMergeSource(path,foreign,target,()=>{reads++;throw Error('foreign linked read');}),foreign);assert.equal(reads,0);
   }
  }
  for(const mode of ['changed','missing','buffer','throw'])assert.throws(()=>assertReleaseMergeCurrent((p,e)=>{
   if(p!==path)return physicalReadFileSync(p,e);
   if(mode==='throw')throw Error('missing injected '+p);
   if(mode==='missing')return null;
   if(mode==='buffer')return Buffer.from(physicalReadFileSync(p,e));
   return physicalReadFileSync(p,e)+'\n';
  }));
 }
 const archive=Object.keys(releaseMergeCiPacket.immutableArchives)[0];
 assert.throws(()=>assertReleaseMergeCurrent((p,e)=>p===archive?physicalReadFileSync(p).subarray(1):physicalReadFileSync(p,e)),/retained actual Release merge archive/);
 const path=Object.keys(releaseMergeCiPacket.files).find(p=>!p.startsWith('src/')&&p!=='config/architecture.json'),current=physicalReadFileSync(path,'utf8');
 let drift=false;const reader=(p,e)=>{const raw=physicalReadFileSync(p,e);return drift&&p===path?raw+'\n':raw;};
 releaseMergeSource(path,current,'slicePrior',reader);drift=true;
 assert.throws(()=>releaseMergeSource(path,current,'slicePrior',reader),/fresh complete integration source/,'warm success never authorizes later linked drift');
});

test('actual Release merge proves all production base Git blobs and exact bootstrap sources without relabelling producers',()=>{
 assertReleaseMergeGitProvenance(releaseMergeArchivedGitRead());
 assert.equal(releaseMergeCiPacket.releaseCommit,'1cc5479b713edab6fd26db4e20f8eb22b7401cb2');
 assert.equal(releaseMergeCiPacket.releaseParent,'36b9b157ee6f05b65eb9f1da7e2978647d36c210');
 assert.equal(Object.keys(releaseMergeCiPacket.bootstrapGitBindings).length,10,'every complete bootstrap current binding has actual Git provenance');
});

test('PC fixture repair retains the complete prior merge packet and exact historical test bindings',()=>{
 const releaseMergeCiPacket=JSON.parse(gunzipSync(physicalReadFileSync('tests/helpers/release-bootstrap-merge-ci-source.json.gz')));
 const path='tests/helpers/release-bootstrap-merge-before-owner-repair-ci-source.json.gz';
 const bytes=physicalReadFileSync(path);
 assert.equal(hash(bytes),'30ecf61e75ea05e477ef862fa21ad7a1532316f2042eac3cc8028bccfb91ddc6');
 assert.equal(releaseMergeCiPacket.immutableArchives[path],hash(bytes));
 const prior=JSON.parse(gunzipSync(bytes));
 const added=['tests/defect-final-source-epoch.test.mjs','tests/encounter-formation-source-epoch.test.mjs','tests/session-menu-navigation.test.mjs','tests/card-input-slices.test.mjs','tests/helpers/historical-card-input.mjs'].filter(path=>!Object.hasOwn(prior.files,path));
 assert.deepEqual(Object.keys(releaseMergeCiPacket.files).sort(),[...Object.keys(prior.files),...added].sort());
 const changed=[];
 for(const [path,row]of Object.entries(prior.files)){
  assert.deepEqual(releaseMergeCiPacket.files[path].slicePrior,row.slicePrior,path);
  assert.deepEqual(releaseMergeCiPacket.files[path].bootstrapView,row.bootstrapView,path);
  if(releaseMergeCiPacket.files[path].current.sha256!==row.current.sha256)changed.push(path);
  else assert.deepEqual(releaseMergeCiPacket.files[path].current,row.current,path);
 }
 assert.deepEqual(changed,['tests/release-pc-source.test.mjs']);
 const blobs={'tests/defect-final-source-epoch.test.mjs':'072e6fd3f0ed3ef7d797b221329c91fdfc1200e7','tests/encounter-formation-source-epoch.test.mjs':'d137ae680404eb393544e301c08d0b1f7589afb6','tests/session-menu-navigation.test.mjs':'941ebaacf4473878991633141fc8fda5205dbfda','tests/card-input-slices.test.mjs':'3619aeeb1a7aed1d8a484bd41e1992389f6affd2','tests/helpers/historical-card-input.mjs':'4a8d093d278d15f3518a2dd3aea7f93abbd57a4c'};
 for(const path of added)for(const view of ['slicePrior','bootstrapView']){
  const row=releaseMergeCiPacket.files[path][view];
  assert.equal(row.gitBlob,blobs[path],path+':'+view);
  assert.equal(createHash('sha1').update(`blob ${Buffer.byteLength(row.source)}\0`).update(row.source).digest('hex'),blobs[path]);
 }
 assert.equal(Object.keys(prior.immutableArchives).length,95);
 for(const [path,sha]of Object.entries(prior.immutableArchives))assert.equal(releaseMergeCiPacket.immutableArchives[path],sha,path);
 assert.equal(Object.keys(releaseMergeCiPacket.immutableArchives).length,96);
 for(const field of Object.keys(prior).filter(key=>!['files','immutableArchives'].includes(key)))assert.deepEqual(releaseMergeCiPacket[field],prior[field],field);
});

test('archived Git provenance rejects changed missing and mistyped objects without a checkout database',()=>{
 const proof=releaseMergeCiPacket.gitObjectProof,commit=releaseMergeCiPacket.releaseCommit;
 assertReleaseMergeGitProvenance(releaseMergeArchivedGitRead(proof));
 const changed=structuredClone(proof);changed[commit].base64=Buffer.from('changed Git commit').toString('base64');
 assert.throws(()=>releaseMergeArchivedGitRead(changed),/complete archived Git object/);
 const missing=structuredClone(proof);delete missing[commit];
 assert.throws(()=>assertReleaseMergeGitProvenance(releaseMergeArchivedGitRead(missing)),/required complete Git commit/);
 const mistyped=structuredClone(proof);mistyped[commit].type='tree';
 assert.throws(()=>releaseMergeArchivedGitRead(mistyped),/complete archived Git object/);
 for(const [id,row]of Object.entries(proof).filter(([,row])=>row.type==='tree')){
  const missing=structuredClone(proof);delete missing[id];
  assert.throws(()=>assertReleaseMergeGitProvenance(releaseMergeArchivedGitRead(missing)),/required complete Git tree/);
 }
});

test('split continuation retains the exact 119-owner predecessor and every prior CI byte',()=>{
 const path='tests/helpers/release-bootstrap-merge-ci-source.json.gz',bytes=physicalReadFileSync(path);
 assert.equal(hash(bytes),'533b470c786e02972a0359d6df10b6dbc3d0f946e7e054561f53f9635e77e966');
 const prior=JSON.parse(gunzipSync(bytes));assert.equal(releaseMergeCiPacket.immutableArchives[path],hash(bytes));
 for(const field of Object.keys(prior).filter(key=>!['files','immutableArchives'].includes(key)))assert.deepEqual(releaseMergeCiPacket[field],prior[field],field);
 for(const [path,row]of Object.entries(prior.files))for(const view of ['slicePrior','bootstrapView'])assert.deepEqual(releaseMergeCiPacket.files[path][view],row[view],path+':'+view);
 for(const [path,sha]of Object.entries(prior.immutableArchives))assert.equal(releaseMergeCiPacket.immutableArchives[path],sha,path);
 assert.deepEqual(Object.keys(releaseMergeCiPacket.immutableArchives).sort(),[...Object.keys(prior.immutableArchives),path,'tests/helpers/release-pc-split-source.json.gz'].sort());
 for(const path of ['src/lua/abyss_combat.lua','src/lua/abyss_combat_enemy_setup.lua']){
  const source=physicalReadFileSync(path,'utf8');
  assert.equal(releasePcCiSource(path,source),source,'general CI routing leaves production raw');
  assert.equal(releasePcSplitPriorSource(path,source),preSplitSourceEpoch.proof.current[path].source);
  assert.throws(()=>assertReleasePcCiCurrent((p,e)=>p===path?preSplitSourceEpoch.proof.current[path].source:physicalReadFileSync(p,e)),/fresh complete integration source/,'old 119-owner bytes cannot pass as current');
  for(const value of [null,source+'\n',new Error('missing split owner')]){
   const read=(p,e)=>{if(p!==path)return physicalReadFileSync(p,e);if(value instanceof Error)throw value;return value;};
   assert.throws(()=>sourceEpoch.preCombinedSource('config/architecture.json',physicalReadFileSync('config/architecture.json','utf8'),{target:'develop',readSource:p=>read(p,'utf8')}),/linked owner/);
  }
 }
});

test('actual Release merge CI trust packet rejects truncated isolated copies',async()=>{
 const leaf=physicalReadFileSync('tests/helpers/release-bootstrap-merge-ci-source.mjs','utf8');
  const bytes=physicalReadFileSync('tests/helpers/release-pc-split-ci-source.json.gz');
  const marker="const bytes=readFileSync(new URL('./release-pc-split-ci-source.json.gz',import.meta.url));";
 assert.equal(leaf.split(marker).length,2);
 const broken=leaf.replace(marker,`const bytes=Buffer.from(${JSON.stringify(bytes.subarray(0,bytes.length-1).toString('base64'))},'base64');`);
 await assert.rejects(import('data:text/javascript;base64,'+Buffer.from(broken).toString('base64')),/complete actual Release merge CI composition/);
});
