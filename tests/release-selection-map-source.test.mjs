import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync as rawReadFileSync,readdirSync,mkdtempSync,mkdirSync,rmSync,existsSync,writeFileSync,unlinkSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {pathToFileURL} from 'node:url';
import {copyIntegrationSourceClosure} from './helpers/copy-integration-source-closure.mjs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {discoverJs} from '../scripts/ci-shards.mjs';
import {sourceEpoch as currentSourceEpoch,preBattlePointerSourceEpoch as sourceEpoch,preReleaseSelectionMapSourceEpoch} from './helpers/closeout-source-epoch.mjs';
import {battlePointerSourcePacket,extendBattlePointerSource} from './helpers/battle-pointer-source.mjs';
import {battlePointerCiPacket,battlePointerCiSource,battlePointerCiRead,assertBattlePointerCiCurrent,assertBattlePointerRawInventory} from './helpers/battle-pointer-ci-source.mjs';
import {releaseSelectionMapSourcePacket,extendReleaseSelectionMapSource} from './helpers/release-selection-map-source.mjs';
import {releaseSelectionMapCiPacket,releaseSelectionMapCiSource,releaseSelectionMapPriorInventory,assertReleaseSelectionMapRawInventory,assertReleaseSelectionMapCiCurrent,assertReleaseSelectionMapExecutionGuards} from './helpers/release-selection-map-ci-source.mjs';
// The original selection-map contracts retain their complete pre-pointer view.
// Production history is projected only after fresh authentication of all current owners.
const pointerBeforeCiRead=battlePointerCiRead(rawReadFileSync);
const liveSource=path=>rawReadFileSync(path,'utf8');
function readFileSync(path,encoding){
 const raw=pointerBeforeCiRead(path,encoding);
 if(!path.startsWith('src/'))return raw;
 const text=typeof raw==='string'?raw:raw.toString('utf8');
 const prior=currentSourceEpoch.preCombinedSource(path,text,{target:'battlePointerPrior',readSource:liveSource});
 return typeof raw==='string'?prior:prior===text?raw:Buffer.from(prior);
}
const hash=b=>createHash('sha256').update(b).digest('hex'),norm=s=>s.replaceAll('\r\n','\n');

test('actual merged Release authenticates every unchanged Lua and architecture predecessor without advancing the product epoch',()=>{
 const bytes=readFileSync('tests/helpers/release-selection-map-base-source.json.gz');
 assert.equal(hash(bytes),'4678cdb4036cab5217a359657ae15735c7a2af47936ec58067018dd2d53c9dfa');
 const proof=JSON.parse(gunzipSync(bytes)),prior=preReleaseSelectionMapSourceEpoch.proof;
 assert.equal(proof.baseCommit,'1cc5479b713edab6fd26db4e20f8eb22b7401cb2');
 assert.deepEqual(proof.baseParents,['36b9b157ee6f05b65eb9f1da7e2978647d36c210']);
 assert.equal(proof.equivalentCommit,releaseSelectionMapSourcePacket.baseCommit);
 assert.equal(proof.sourceCount,352);assert.equal(proof.ownerCount,116);
 assert.deepEqual(Object.keys(proof.files).sort(),Object.keys(prior.current).filter(path=>prior.current[path]!==null).sort());
 for(const [path,row]of Object.entries(proof.files)){
  assert.equal(row.gitBlob,row.oldGitBlob,path+' unchanged exact Git blob');
  assert.equal(hash(row.source),row.sha256,path);
  assert.equal(createHash('sha1').update(`blob ${Buffer.byteLength(row.source)}\0`).update(row.source).digest('hex'),row.gitBlob,path);
  assert.equal(row.source,prior.current[path].source,path+' complete authenticated prior source');
 }
 assert.equal(releaseSelectionMapSourcePacket.currentCommit,'74a598a52a0b846bc1bec1ef57083b2fdb1bbc39');
});

test('release selection map production preserves every complete prior target and freshly authenticates the committed source tree',()=>{
 const p=sourceEpoch.proof,prior=preReleaseSelectionMapSourceEpoch.proof;
 for(const [name,target]of Object.entries(prior.targets))assert.deepEqual(p.targets[name],target,name);
 assert.deepEqual(p.targets.releaseSelectionMapPrior.files,prior.current);
 assert.equal(p.currentTreeCommitted,true);assert.equal(p.currentCommit,releaseSelectionMapSourcePacket.currentCommit);
 const files=['config/architecture.json',...readdirSync('src/lua').filter(n=>n.endsWith('.lua')).map(n=>'src/lua/'+n)].sort();
 assert.deepEqual(files,Object.keys(p.current).filter(path=>p.current[path]!==null).sort());
 for(const path of files)assert.equal(norm(readFileSync(path,'utf8')),p.current[path].source,path);
 for(const [path,before]of Object.entries(releaseSelectionMapSourcePacket.before))assert.deepEqual(before,prior.current[path]);
 assert.throws(()=>extendReleaseSelectionMapSource(preReleaseSelectionMapSourceEpoch,{...releaseSelectionMapSourcePacket,current:{}}),/only the approved selection map owners advance/);
});

test('release selection map CI validates complete live bindings while unknown or changed bytes stay visible',()=>{
 assertReleaseSelectionMapCiCurrent(readFileSync);
 for(const [path,row]of Object.entries(releaseSelectionMapCiPacket.files)){
  const source=norm(readFileSync(path,'utf8'));assert.equal(hash(source),row.current.sha256,path);
  const production=path.startsWith('src/')||path==='config/architecture.json';
  assert.equal(releaseSelectionMapCiSource(path,source),production?source:row.before?.source??source,path);
  for(const foreign of [source+'\n',source.slice(1),null,{},17])assert.equal(releaseSelectionMapCiSource(path,foreign),foreign,path);
  for(const foreignPath of ['__proto__','constructor','foreign/'+path])assert.equal(releaseSelectionMapCiSource(foreignPath,source),source);
  assert.throws(()=>assertReleaseSelectionMapCiCurrent((p,encoding)=>{
   const raw=readFileSync(p,encoding);return p===path?typeof raw==='string'?raw+'\n':Buffer.concat([raw,Buffer.from('\n')]):raw;
  }),/fresh complete integration source/);
 }
 for(const path of Object.keys(releaseSelectionMapSourcePacket.current))assert.equal(releaseSelectionMapCiSource(path,sourceEpoch.proof.current[path].source),sourceEpoch.proof.current[path].source,'CI does not intercept production authorization');
});

test('release selection map raw JS and Lua inventories reject missing duplicate foreign and changed additions',()=>{
 const inventories={js:discoverJs(),lua:readdirSync('tests/lua').filter(n=>n.endsWith('.lua')).map(n=>'tests/lua/'+n).sort()};
 for(const [kind,paths]of Object.entries(inventories)){
  assert.deepEqual(paths,releaseSelectionMapCiPacket.currentInventory[kind]);
  assertReleaseSelectionMapRawInventory(paths,kind);
  assert.deepEqual(releaseSelectionMapPriorInventory(paths,kind),releaseSelectionMapCiPacket.priorInventory[kind]);
  const opaque=[`tests/${kind==='lua'?'lua/':''}foreign.${kind==='lua'?'lua':'test.mjs'}`];
  assert.deepEqual(releaseSelectionMapPriorInventory(opaque,kind),opaque,'unrelated historical input stays opaque for its own validator');
  const noAdditions=paths.filter(path=>releaseSelectionMapCiPacket.priorInventory[kind].includes(path));
  if(paths.length!==noAdditions.length)assert.throws(()=>assertReleaseSelectionMapRawInventory(noAdditions,kind),/raw discovery inventory/,'deleting every release addition cannot pass raw Full validation');
  assert.throws(()=>assertReleaseSelectionMapRawInventory(opaque,kind),/raw discovery inventory/);
  for(const bad of [paths.slice(1),[...paths,paths[0]],[...paths,`tests/${kind==='lua'?'lua/':''}foreign.${kind==='lua'?'lua':'test.mjs'}`]])
   assert.throws(()=>assertReleaseSelectionMapRawInventory(bad,kind),/raw discovery inventory/);
  for(const path of paths.filter(p=>!releaseSelectionMapCiPacket.priorInventory[kind].includes(p)))
   assert.throws(()=>releaseSelectionMapPriorInventory(paths,kind,(p,e)=>readFileSync(p,e)+(p===path?'\n':'')),/fresh release selection map added inventory source/);
 }
});

test('release selection map raw workflow checks each real execution deadline and trusted local route',()=>{
 const workflow=norm(readFileSync('.github/workflows/quality.yml','utf8'));
 assertReleaseSelectionMapExecutionGuards(workflow);
 for(const [before,after]of [
  ["matrix.os == 'windows-2025' && 45 || 30","matrix.os == 'windows-2025' && 30 || 30"],
  ["local-special' && 75 || 45","local-special' && 75 || 30"],
  ["local-special' && 75 || 45","local-special' && 76 || 45"],
  ['runs-on: ubuntu-24.04\n    timeout-minutes: 30','runs-on: ubuntu-24.04\n    timeout-minutes: 20'],
  ["github.event_name == 'workflow_dispatch' && inputs.runner_pool",'inputs.runner_pool'],
  ["github.ref == 'refs/heads/develop' || github.ref == 'refs/heads/master'",'true']]){
  assert(workflow.includes(before),'negative control must change a real workflow input');
  assert.throws(()=>assertReleaseSelectionMapExecutionGuards(workflow.replaceAll(before,after)),/raw Quality/,before);
 }
 const fast="    timeout-minutes: ${{ matrix.os == 'windows-2025' && 45 || 30 }}";
 const posix='    timeout-minutes: 30';
 assert(workflow.includes(fast));assert(workflow.includes(posix));
 for(const bad of [workflow.replace(fast,''),workflow.replace(fast,fast+'\n'+fast),
  workflow.replace(fast,'      timeout-minutes: 45'),
  workflow.replace(fast,'').replace(posix,posix+'\n'+fast)])
  assert.throws(()=>assertReleaseSelectionMapExecutionGuards(bad),/raw Quality/,'missing, duplicate, step-only and wrong-job guards fail');
});

test('release selection map production requires fresh complete owners and leaves foreign bytes visible',()=>{
 const p=sourceEpoch.proof,prior=preReleaseSelectionMapSourceEpoch.proof;
 assert.equal(Object.keys(p.current).length,352);assert.equal(p.owners.length,116);
 assert.equal(Object.keys(prior.targets).length,64);assert.equal(Object.keys(p.targets).length,65);
 const anchor=Object.keys(releaseSelectionMapSourcePacket.current)[0],raw=path=>readFileSync(path,'utf8');
 const source=norm(raw(anchor)),expected=prior.current[anchor].source;
 for(const current of [source,source.replaceAll('\n','\r\n')]){
  const seen=[];assert.equal(sourceEpoch.preCombinedSource(anchor,current,{target:'releaseSelectionMapPrior',readSource:path=>{seen.push(path);return raw(path);}}),expected);
  assert.deepEqual(seen,p.owners,'every invocation freshly authenticates all owners');
 }
 for(const owner of p.owners)for(const mode of ['changed','missing','buffer','throw']){
  const read=path=>{if(path!==owner)return raw(path);if(mode==='throw')throw Error('injected missing owner');if(mode==='missing')return null;if(mode==='buffer')return Buffer.from(raw(path));return raw(path)+'\n';};
  assert.throws(()=>sourceEpoch.preCombinedSource(anchor,source,{target:'releaseSelectionMapPrior',readSource:read}),/linked owner/);
 }
 for(const foreign of [source+'\n',source.slice(1),source.replaceAll('\n','\r\r\n'),Buffer.from(source),null,17]){
  let reads=0;assert.equal(sourceEpoch.preCombinedSource(anchor,foreign,{target:'releaseSelectionMapPrior',readSource:()=>{reads++;throw Error('foreign bytes');}}),foreign);assert.equal(reads,0);
 }
 assert.throws(()=>sourceEpoch.preCombinedSource(anchor,source,{target:'foreign'}),/unknown source target/);
 for(const mutate of [v=>{v.before[anchor].source+='\n';},v=>{delete v.current[anchor];},v=>{v.currentCommit='f'.repeat(40);},v=>{v.producers[anchor].parents=[];}]){
  const bad=structuredClone(releaseSelectionMapSourcePacket);mutate(bad);assert.throws(()=>extendReleaseSelectionMapSource(preReleaseSelectionMapSourceEpoch,bad));
 }
});

test('release selection map isolated production copy includes exact helper and packet without CI trust leaf',async t=>{
 const directory=mkdtempSync(join(tmpdir(),'release-selection-map-copy-'));
 t.after(()=>rmSync(directory,{recursive:true,force:true}));
 copyIntegrationSourceClosure(directory);
 for(const file of ['release-selection-map-source.mjs','release-selection-map-source.json.gz'])assert(existsSync(join(directory,'tests/helpers',file)));
 assert(!existsSync(join(directory,'tests/helpers/release-selection-map-ci-source.mjs')));
 const copied=await import(pathToFileURL(join(directory,'tests/helpers/closeout-source-epoch.mjs')).href);
 assert.deepEqual(copied.sourceEpoch.proof,currentSourceEpoch.proof);
 const sourceRoot=join(directory,'drift');mkdirSync(sourceRoot);
 // The original closure copier authenticates dependencies from a distinct root.
 copyIntegrationSourceClosure(sourceRoot,{sourceRoot:directory});
 const adapter=join(directory,'tests/helpers/release-selection-map-source.mjs');writeFileSync(adapter,readFileSync(adapter,'utf8')+'\n');
 assert.throws(()=>copyIntegrationSourceClosure(sourceRoot,{sourceRoot:directory}),/fresh helper copy identity/);
});

test('battle pointer production extends all eight committed owners and preserves every complete prior target',()=>{
 const p=currentSourceEpoch.proof,prior=sourceEpoch.proof;
 assert.equal(battlePointerSourcePacket.baseCommit,'33d71575c5f186a1b54f7bf3e4f1826c145aa1d9');
 assert.equal(battlePointerSourcePacket.currentCommit,'2bc0d126e74d518664b6719274448624a1c67121');
 assert.equal(p.currentCommit,battlePointerSourcePacket.currentCommit);assert.equal(p.currentTreeCommitted,true);
 assert.equal(Object.keys(battlePointerSourcePacket.current).length,8);assert.equal(Object.keys(p.current).length,352);
 assert.equal(p.owners.length,121);assert.equal(Object.keys(prior.targets).length,65);assert.equal(Object.keys(p.targets).length,66);
 for(const [name,target]of Object.entries(prior.targets))assert.deepEqual(p.targets[name],target,name);
 assert.deepEqual(p.targets.battlePointerPrior,{commit:battlePointerSourcePacket.baseCommit,files:prior.current});
 const files=['config/architecture.json',...readdirSync('src/lua').filter(n=>n.endsWith('.lua')).map(n=>'src/lua/'+n)].sort();
 assert.deepEqual(files,Object.keys(p.current).filter(path=>p.current[path]!==null).sort());
 for(const path of files)assert.equal(norm(rawReadFileSync(path,'utf8')),p.current[path].source,path);
 for(const [path,before]of Object.entries(battlePointerSourcePacket.before)){
  assert.deepEqual(before,prior.current[path],path+' complete predecessor');
  assert.deepEqual(p.current[path],battlePointerSourcePacket.current[path]);
  assert.equal(battlePointerSourcePacket.producers[path].commit,battlePointerSourcePacket.currentCommit);
  assert.deepEqual(battlePointerSourcePacket.producers[path].parents,[battlePointerSourcePacket.baseCommit]);
 }
 for(const path of Object.keys(prior.current).filter(path=>!Object.hasOwn(battlePointerSourcePacket.current,path)))assert.deepEqual(p.current[path],prior.current[path],path+' unchanged');
});

test('battle pointer source rejects every stale missing or malformed linked owner and every partial packet',()=>{
 const p=currentSourceEpoch.proof,anchor=Object.keys(battlePointerSourcePacket.current)[0],raw=path=>rawReadFileSync(path,'utf8');
 const source=norm(raw(anchor)),expected=sourceEpoch.proof.current[anchor].source;
 for(const current of [source,source.replaceAll('\n','\r\n')]){
  const seen=[];assert.equal(currentSourceEpoch.preCombinedSource(anchor,current,{target:'battlePointerPrior',readSource:path=>{seen.push(path);return raw(path);}}),expected);
  assert.deepEqual(seen,p.owners,'all current owners freshly authenticated on each invocation');
 }
 for(const owner of p.owners)for(const mode of ['changed','missing','buffer','throw']){
  const read=path=>{if(path!==owner)return raw(path);if(mode==='throw')throw Error('injected missing owner');if(mode==='missing')return null;if(mode==='buffer')return Buffer.from(raw(path));return raw(path)+'\n';};
  assert.throws(()=>currentSourceEpoch.preCombinedSource(anchor,source,{target:'battlePointerPrior',readSource:read}),/linked owner/,owner+' '+mode);
 }
 for(const foreign of [source+'\n',source.slice(1),source.replaceAll('\n','\r\r\n'),Buffer.from(source),null,17]){
  let reads=0;assert.equal(currentSourceEpoch.preCombinedSource(anchor,foreign,{target:'battlePointerPrior',readSource:()=>{reads++;throw Error('foreign bytes');}}),foreign);assert.equal(reads,0);
 }
 assert.throws(()=>currentSourceEpoch.preCombinedSource(anchor,source,{target:'foreign'}),/unknown source target/);
 for(const mutate of [v=>{v.before[anchor].source+='\n';},v=>{delete v.current[anchor];},v=>{v.currentCommit='f'.repeat(40);},v=>{v.producers[anchor].parents=[];},v=>{delete v.before[anchor];},v=>{v.current[anchor].sha256='f'.repeat(64);}]){
  const bad=structuredClone(battlePointerSourcePacket);mutate(bad);assert.throws(()=>extendBattlePointerSource(sourceEpoch,bad));
 }
});

test('battle pointer CI authenticates every current source while foreign bytes and production authorization stay visible',()=>{
 assertBattlePointerCiCurrent();
 for(const [path,row]of Object.entries(battlePointerCiPacket.files)){
  const source=norm(rawReadFileSync(path,'utf8'));assert.equal(hash(source),row.current.sha256,path);
  const production=path.startsWith('src/')||path==='config/architecture.json';
  assert.equal(battlePointerCiSource(path,source),production?source:row.before?.source??source,path);
  for(const foreign of [source+'\n',source.slice(1),source.replaceAll('\n','\r\r\n'),null,{},17])assert.equal(battlePointerCiSource(path,foreign),foreign,path);
  for(const foreignPath of ['__proto__','constructor','foreign/'+path])assert.equal(battlePointerCiSource(foreignPath,source),source);
  for(const mode of ['changed','missing'])assert.throws(()=>assertBattlePointerCiCurrent((p,e)=>{
   if(p!==path)return rawReadFileSync(p,e);if(mode==='missing')throw Error('missing '+p);const value=rawReadFileSync(p,e);return typeof value==='string'?value+'\n':Buffer.concat([value,Buffer.from('\n')]);
  }),error=>{assert(error.message.includes(path));return true;});
 }
 for(const [path,sha]of Object.entries(battlePointerCiPacket.immutableArchives)){
  assert.equal(hash(rawReadFileSync(path)),sha,path);
  assert.throws(()=>assertBattlePointerCiCurrent((p,e)=>p===path?rawReadFileSync(p).subarray(1):rawReadFileSync(p,e)),/retained complete immutable battle pointer predecessor/);
 }
});

test('battle pointer retains exact raw JS and Lua inventories with all missing duplicate and foreign negatives',()=>{
 const inventories={js:discoverJs(),lua:readdirSync('tests/lua').filter(n=>n.endsWith('.lua')).map(n=>'tests/lua/'+n).sort()};
 assert.deepEqual(battlePointerCiPacket.priorInventory,releaseSelectionMapCiPacket.currentInventory);
 assert.deepEqual(battlePointerCiPacket.currentInventory,battlePointerCiPacket.priorInventory);
 for(const [kind,paths]of Object.entries(inventories)){
  assertBattlePointerRawInventory(paths,kind);
  for(const bad of [[],paths.slice(1),[...paths,paths[0]],[...paths,`tests/${kind==='lua'?'lua/':''}foreign.${kind==='lua'?'lua':'test.mjs'}`]])
   assert.throws(()=>assertBattlePointerRawInventory(bad,kind),/raw discovery inventory/);
 }
});

test('battle pointer isolated production closure includes both exact new dependencies without CI trust leaves',async t=>{
 const directory=mkdtempSync(join(tmpdir(),'battle-pointer-copy-'));t.after(()=>rmSync(directory,{recursive:true,force:true}));
 copyIntegrationSourceClosure(directory);
 for(const file of ['battle-pointer-source.mjs','battle-pointer-source.json.gz'])assert(existsSync(join(directory,'tests/helpers',file)));
 for(const file of ['battle-pointer-ci-source.mjs','battle-pointer-ci-source.json.gz'])assert(!existsSync(join(directory,'tests/helpers',file)));
 const copied=await import(pathToFileURL(join(directory,'tests/helpers/closeout-source-epoch.mjs')).href);assert.deepEqual(copied.sourceEpoch.proof,currentSourceEpoch.proof);
 const destination=join(directory,'next');mkdirSync(destination);
 for(const file of ['battle-pointer-source.mjs','battle-pointer-source.json.gz']){
  const path=join(directory,'tests/helpers',file),bytes=rawReadFileSync(path),changed=Buffer.from(bytes);changed[changed.length-1]^=1;
  writeFileSync(path,changed);assert.throws(()=>copyIntegrationSourceClosure(destination,{sourceRoot:directory}),/fresh helper copy identity/);
  if(file.endsWith('.gz'))await assert.rejects(import(pathToFileURL(join(directory,'tests/helpers/battle-pointer-source.mjs')).href+'?corrupt-packet'),/complete battle pointer production packet/);
  unlinkSync(path);assert.throws(()=>copyIntegrationSourceClosure(destination,{sourceRoot:directory}),/ENOENT/);writeFileSync(path,bytes);
 }
 copyIntegrationSourceClosure(destination,{sourceRoot:directory});
});


test('battle pointer CI trust leaf rejects an incomplete or changed complete archive',async()=>{
 const leaf=rawReadFileSync('tests/helpers/battle-pointer-ci-source.mjs','utf8'),bytes=rawReadFileSync('tests/helpers/battle-pointer-ci-source.json.gz');
 const marker="const bytes=readFileSync(new URL('./battle-pointer-ci-source.json.gz',import.meta.url));";
 assert.equal(leaf.split(marker).length,2);
 const changed=Buffer.from(bytes);changed[changed.length-1]^=1;
 for(const bad of [bytes.subarray(0,bytes.length-1),changed]){
  const broken=leaf.replace(marker,`const bytes=Buffer.from(${JSON.stringify(bad.toString('base64'))},'base64');`);
  await assert.rejects(import('data:text/javascript;base64,'+Buffer.from(broken).toString('base64')),/complete battle pointer CI continuation/);
 }
});
