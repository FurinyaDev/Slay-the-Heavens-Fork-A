import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {discoverJs} from '../scripts/ci-shards.mjs';
import {sourceEpoch,preReleasePcSourceEpoch} from './helpers/closeout-source-epoch.mjs';
import {releasePcSourcePacket,extendReleasePcSource} from './helpers/release-pc-source.mjs';
import {releasePcCiPacket,releasePcCiSource,releasePcPriorInventory,assertReleasePcRawInventory,assertReleasePcCiCurrent} from './helpers/release-pc-ci-source.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex'),norm=s=>s.replaceAll('\r\n','\n');

test('release PC production preserves every complete prior target and freshly authenticates the committed source tree',()=>{
 const p=sourceEpoch.proof,prior=preReleasePcSourceEpoch.proof;
 for(const [name,target]of Object.entries(prior.targets))assert.deepEqual(p.targets[name],target,name);
 assert.deepEqual(p.targets.releasePcPrior.files,prior.current);
 assert.equal(p.currentTreeCommitted,true);assert.equal(p.currentCommit,releasePcSourcePacket.currentCommit);
 const files=['config/architecture.json',...readdirSync('src/lua').filter(n=>n.endsWith('.lua')).map(n=>'src/lua/'+n)].sort();
 assert.deepEqual(files,Object.keys(p.current).filter(path=>p.current[path]!==null).sort());
 for(const path of files)assert.equal(norm(readFileSync(path,'utf8')),p.current[path].source,path);
 for(const [path,before]of Object.entries(releasePcSourcePacket.before))assert.deepEqual(before,prior.current[path]);
 assert.throws(()=>extendReleasePcSource(preReleasePcSourceEpoch,{...releasePcSourcePacket,current:{}}),/approved release PC after bindings/);
});

test('release PC CI validates complete live bindings while unknown or changed bytes stay visible',()=>{
 assertReleasePcCiCurrent();
 for(const [path,row]of Object.entries(releasePcCiPacket.files)){
  const source=norm(readFileSync(path,'utf8'));assert.equal(hash(source),row.current.sha256,path);
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
  assert.deepEqual(releasePcPriorInventory(paths,kind),releasePcCiPacket.priorInventory[kind]);
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
