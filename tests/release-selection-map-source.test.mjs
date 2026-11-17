import test from 'node:test';
import {potionPointerB9PriorInventory} from './helpers/potion-pointer-b9-integration.mjs';
import {pointerB9Read} from './helpers/pointer-b9-integration.mjs';
import {integrationPriorInventory} from './helpers/release-card-contact-integration.mjs';
import {battlePointerDismissSourcePacket,extendBattlePointerDismissSource} from './helpers/battle-pointer-dismiss-source.mjs';
import {dismissCiPacket,dismissBeforeRead,assertDismissCiCurrent} from './helpers/battle-pointer-dismiss-ci-source.mjs';
import {inspectionBeforeRead,inspectionCiSource,assertInspectionCiCurrent,inspectionCiPacket} from './helpers/battle-pointer-inspection-ci-source.mjs';
import {battlePointerInspectionSourcePacket,extendBattlePointerInspectionSource} from './helpers/battle-pointer-inspection-source.mjs';
import {integratedSource,integratedRead,integratedCiProof} from './helpers/integrated-ci-source.mjs';
import assert from 'node:assert/strict';
import {readFileSync as actualReadFileSync,readdirSync as actualReaddirSync,mkdtempSync,mkdirSync,rmSync,existsSync,writeFileSync,unlinkSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {pathToFileURL} from 'node:url';
import {copyIntegrationSourceClosure} from './helpers/copy-integration-source-closure.mjs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {discoverJs as jointDiscoverJs} from '../scripts/ci-shards.mjs';
const discoverJs=()=>integrationPriorInventory(potionPointerB9PriorInventory(jointDiscoverJs(),'pointer711'),'selection');
const readdirSync=path=>path==='tests/lua'?integrationPriorInventory(potionPointerB9PriorInventory(actualReaddirSync(path).filter(p=>p.endsWith('.lua')).map(p=>'tests/lua/'+p),'pointer711','lua'),'selection','lua').map(p=>p.slice(10)):actualReaddirSync(path);
import {sourceEpoch as jointSourceEpoch,pointerSourceEpoch as dismissSourceEpoch,preBattlePointerDismissSourceEpoch as inspectionSourceEpoch,preBattlePointerInspectionSourceEpoch as finalSourceEpoch,preBattlePointerSparseSourceEpoch as currentSourceEpoch,preBattlePointerSourceEpoch as sourceEpoch,preReleaseSelectionMapSourceEpoch} from './helpers/closeout-source-epoch.mjs';
import {battlePointerSparseSourcePacket,extendBattlePointerSparseSource} from './helpers/battle-pointer-sparse-source.mjs';
import {battlePointerSparseCiPacket,battlePointerSparseCiSource,battlePointerSparseCiRead,battlePointerSparseCiValidationRead,assertBattlePointerSparseCiCurrent,assertBattlePointerSparseRawInventory} from './helpers/battle-pointer-sparse-ci-source.mjs';
import {battlePointerSourcePacket,extendBattlePointerSource} from './helpers/battle-pointer-source.mjs';
import {battlePointerCiPacket,battlePointerCiSource,battlePointerCiRead,assertBattlePointerCiCurrent,assertBattlePointerRawInventory} from './helpers/battle-pointer-ci-source.mjs';
import {releaseSelectionMapSourcePacket,extendReleaseSelectionMapSource} from './helpers/release-selection-map-source.mjs';
import {releaseSelectionMapCiPacket,releaseSelectionMapCiSource,releaseSelectionMapPriorInventory,assertReleaseSelectionMapRawInventory,assertReleaseSelectionMapCiCurrent,assertReleaseSelectionMapExecutionGuards} from './helpers/release-selection-map-ci-source.mjs';
// The complete 2bc pointer contracts retain their independently authenticated view.
// These fixtures select the complete frozen 5a inputs explicitly; they are not
// current-to-history authorization. The inspection tests below use raw disk.
const inspectionCheckpointRead=(path,encoding)=>{
 const before=Object.hasOwn(inspectionCiPacket.files,path)?inspectionCiPacket.files[path].before:null;
 const checkpoint=before??dismissCiPacket.files[path]?.before;
 if(!checkpoint)return pointerB9Read('pointer',actualReadFileSync,{production:true,authenticate:false})(path,encoding);
 const bytes=Buffer.from(checkpoint.source);return encoding?bytes.toString(encoding):bytes;
};
const sparseBeforeCiRead=battlePointerSparseCiRead(inspectionCheckpointRead);
// The original CI packet validates its explicit complete predecessor bindings.
const pointerCiValidationRead=battlePointerSparseCiValidationRead(inspectionCheckpointRead);
const actualSource=path=>pointerB9Read('pointer',actualReadFileSync,{production:true,authenticate:false})(path,'utf8');
// Original inspection contracts explicitly retain their complete ad6 checkpoint.
const ad6Source=path=>dismissCiPacket.files[path]?.before.source??actualSource(path);
const inspectionBeforeCiRead=inspectionBeforeRead(actualReadFileSync);
// Explicit complete 82b fixture for its unchanged historical tests. Live
// inspection authorization is exercised separately below against raw disk.
const finalSource=path=>battlePointerInspectionSourcePacket.before[path]?.source??ad6Source(path).replaceAll('\r\n','\n');
function rawReadFileSync(path,encoding){
 const raw=sparseBeforeCiRead(path,encoding);
 if(!path.startsWith('src/'))return raw;
 const text=finalSource(path);
 const prior=finalSourceEpoch.preCombinedSource(path,text,{target:'battlePointerSparsePrior',readSource:finalSource});
 return typeof raw==='string'?prior:prior===text?raw:Buffer.from(prior);
}
// The original selection-map contracts retain their complete pre-pointer view.
// Production history is projected only after fresh authentication of all current owners.
const pointerBeforeCiRead=battlePointerCiRead(rawReadFileSync);
function readFileSync(path,encoding){
 const raw=path.startsWith('src/')?actualReadFileSync(path,encoding):pointerBeforeCiRead(path,encoding);
 if(!path.startsWith('src/'))return raw;
 const text=finalSource(path);
 const prior=finalSourceEpoch.preCombinedSource(path,text,{target:'battlePointerPrior',readSource:finalSource});
 return typeof raw==='string'?prior:prior===text?raw:Buffer.from(prior);
}
const hash=b=>createHash('sha256').update(b).digest('hex'),norm=s=>s.replaceAll('\r\n','\n');

test('inspection continuation preserves 67 complete targets and exact two-owner committed producer',()=>{
 const p=inspectionSourceEpoch.proof,prior=finalSourceEpoch.proof,packet=battlePointerInspectionSourcePacket;
 assert.equal(p.currentCommit,'b01cdd5858924cc9caf84cc3134fa52e5958add7');assert.equal(p.currentTreeCommitted,true);
 assert.equal(Object.keys(p.current).length,352);assert.equal(p.owners.length,121);assert.equal(Object.keys(p.targets).length,68);
 for(const [name,target]of Object.entries(prior.targets))assert.deepEqual(p.targets[name],target,name);
 assert.deepEqual(p.targets.battlePointerInspectionPrior,{commit:packet.baseCommit,files:prior.current});
 for(const [path,row]of Object.entries(p.current))if(row)assert.equal(norm(ad6Source(path)),row.source,path);
 for(const [path,row]of Object.entries(packet.current)){
  assert.deepEqual(packet.before[path],prior.current[path]);assert.deepEqual(row,p.current[path]);
  assert.deepEqual(packet.producers[path],{commit:packet.currentCommit,parents:[packet.captureBase]});
 }
 for(const path of Object.keys(prior.current))if(!Object.hasOwn(packet.current,path))assert.deepEqual(p.current[path],prior.current[path],path);
 for(const mutate of [v=>{delete v.current[Object.keys(v.current)[0]];},v=>{v.before[Object.keys(v.before)[0]].source+='\n';},v=>{v.currentCommit='f'.repeat(40);},v=>{v.producers[Object.keys(v.producers)[0]].parents=[];}]){
  const bad=structuredClone(packet);mutate(bad);assert.throws(()=>extendBattlePointerInspectionSource(finalSourceEpoch,bad));
 }
});

test('inspection public source authenticates every raw owner and never caches authorization',()=>{
 const p=inspectionSourceEpoch.proof,path=Object.keys(battlePointerInspectionSourcePacket.current)[0],source=ad6Source(path),before=finalSourceEpoch.proof.current[path].source;
 let drift=null;const read=owner=>ad6Source(owner)+(owner===drift?'\n':'');
 const project=()=>inspectionSourceEpoch.preCombinedSource(path,source,{target:'battlePointerInspectionPrior',readSource:read});
 assert.equal(project(),before);
 for(const owner of p.owners){drift=owner;assert.throws(project,/linked owner/,owner);drift=null;assert.equal(project(),before);}
 for(const foreign of [source+'\n',source.slice(1),source.replaceAll('\n','\r\r\n'),Buffer.from(source),null,17]){
  let reads=0;assert.equal(inspectionSourceEpoch.preCombinedSource(path,foreign,{target:'battlePointerInspectionPrior',readSource:()=>{reads++;throw Error('foreign');}}),foreign);assert.equal(reads,0);
 }
});

test('inspection CI validates fresh raw sources archives and reused public readers without projecting production',()=>{
 assertInspectionCiCurrent();
 const path='tests/helpers/closeout-source-epoch.mjs',row=inspectionCiPacket.files[path],source=actualSource(path);
 let drift=null;const read=(p,e)=>{const raw=actualReadFileSync(p,e);return p===drift?typeof raw==='string'?raw+'\n':Buffer.concat([raw,Buffer.from('\n')]):raw;};
 const reader=inspectionBeforeRead(read);
 assert.equal(reader(path,'utf8'),row.before.source);
 for(const owner of inspectionSourceEpoch.proof.owners){
  drift=owner;assert.throws(()=>reader(path,'utf8'),/linked owner/,owner);drift=null;
 }
 assert.equal(reader(path,'utf8'),row.before.source);
 for(const [p,r]of Object.entries(inspectionCiPacket.files)){
  const raw=ad6Source(p);assert.equal(hash(norm(raw)),r.current.sha256,p);
  if(p.startsWith('src/'))assert.equal(inspectionCiSource(p,raw,read),raw,p);
  drift=p;assert.throws(()=>assertInspectionCiCurrent(read),error=>{assert(error.message.includes(p));return true;});drift=null;
 }
 for(const [p,sha]of Object.entries(inspectionCiPacket.immutableArchives)){
  assert.equal(hash(actualReadFileSync(p)),sha,p);drift=p;assert.throws(()=>reader(path,'utf8'),/immutable sparse battle pointer predecessor/,p);drift=null;
 }
 for(const foreign of [source+'\n',source.slice(1),source.replaceAll('\n','\r\r\n'),null,{},17])assert.equal(inspectionCiSource(path,foreign),foreign);
 for(const p of ['__proto__','constructor','foreign/'+path])assert.equal(inspectionCiSource(p,source),source);
 assert.equal(reader(path,'utf8'),row.before.source);
});

test('inspection guards direct old text and binary projections through reused readers',()=>{
 const textPath='tests/ci-complete-calibration.test.mjs',binaryPath='tests/helpers/menu-red-production-source.json.gz';
 const text=actualSource(textPath),binary=actualReadFileSync(binaryPath);
 assert(!Object.hasOwn(inspectionCiPacket.files,textPath),'exercise the old layer outside the new continuation');
 let drift=null;const read=(p,e)=>{const raw=actualReadFileSync(p,e);return p===drift?typeof raw==='string'?raw+'\n':Buffer.concat([raw,Buffer.from('\n')]):raw;};
 const binaryReader=integratedRead('menu',{read});
 assert.equal(integratedSource(textPath,text,'native',read),integratedCiProof.files[textPath].views.native.source);
 assert.notEqual(hash(binaryReader(binaryPath)),hash(binary));
 for(const [path,target]of [[textPath,'release'],['tests/helpers/release-selection-map-ci-source.mjs','native'],['tests/integrated-ci-source.cases.mjs','native']]){
  const raw=actualSource(path),expected=integratedSource(path,raw,target,read);assert.notEqual(expected,raw,path+' old-layer early return converts');
  drift='src/lua/abyss_battle_input_state.lua';assert.throws(()=>integratedSource(path,raw,target,read),/linked owner/,path);drift=null;
  assert.equal(integratedSource(path,raw,target,read),expected,path+' recovers');
 }
 drift='src/lua/abyss_battle_input_state.lua';
 assert.throws(()=>releaseSelectionMapPriorInventory(discoverJs(),'js',read),/linked owner/,'raw inventory projector retains its caller reader');
 drift=null;assert.deepEqual(releaseSelectionMapPriorInventory(discoverJs(),'js',read),releaseSelectionMapCiPacket.priorInventory.js);
 for(const owner of inspectionSourceEpoch.proof.owners){
  drift=owner;assert.throws(()=>integratedSource(textPath,text,'native',read),/linked owner/,owner);assert.throws(()=>binaryReader(binaryPath),/linked owner/,owner);drift=null;
 }
 for(const path of ['tests/helpers/battle-pointer-source.json.gz','tests/helpers/battle-pointer-sparse-source.json.gz']){
  drift=path;assert.throws(()=>integratedSource(textPath,text,'native',read),/immutable sparse battle pointer predecessor/);assert.throws(()=>binaryReader(binaryPath),/immutable sparse battle pointer predecessor/);drift=null;
 }
 assert.equal(integratedSource(textPath,text,'native',read),integratedCiProof.files[textPath].views.native.source);
 assert.notEqual(hash(binaryReader(binaryPath)),hash(binary));
 for(const foreign of [text+'\n',text.slice(1),null,{},17]){let reads=0;assert.equal(integratedSource(textPath,foreign,'native',()=>{reads++;throw Error('foreign');}),foreign);assert.equal(reads,0);}
});

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
 assert.deepEqual(copied.sourceEpoch.proof,jointSourceEpoch.proof);
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
 assertBattlePointerCiCurrent(pointerCiValidationRead);
 for(const [path,row]of Object.entries(battlePointerCiPacket.files)){
  const source=norm(pointerCiValidationRead(path,'utf8'));assert.equal(hash(source),row.current.sha256,path);
  const production=path.startsWith('src/')||path==='config/architecture.json';
  assert.equal(battlePointerCiSource(path,source),production?source:row.before?.source??source,path);
  for(const foreign of [source+'\n',source.slice(1),source.replaceAll('\n','\r\r\n'),null,{},17])assert.equal(battlePointerCiSource(path,foreign),foreign,path);
  for(const foreignPath of ['__proto__','constructor','foreign/'+path])assert.equal(battlePointerCiSource(foreignPath,source),source);
  for(const mode of ['changed','missing'])assert.throws(()=>assertBattlePointerCiCurrent((p,e)=>{
   if(p!==path)return pointerCiValidationRead(p,e);if(mode==='missing')throw Error('missing '+p);const value=pointerCiValidationRead(p,e);return typeof value==='string'?value+'\n':Buffer.concat([value,Buffer.from('\n')]);
  }),error=>{assert(error.message.includes(path));return true;});
 }
 for(const [path,sha]of Object.entries(battlePointerCiPacket.immutableArchives)){
  assert.equal(hash(pointerCiValidationRead(path)),sha,path);
  assert.throws(()=>assertBattlePointerCiCurrent((p,e)=>p===path?pointerCiValidationRead(p).subarray(1):pointerCiValidationRead(p,e)),/retained complete immutable battle pointer predecessor/);
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
 const copied=await import(pathToFileURL(join(directory,'tests/helpers/closeout-source-epoch.mjs')).href);assert.deepEqual(copied.sourceEpoch.proof,jointSourceEpoch.proof);
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

test('sparse battle pointer production advances only the committed card-binding owner and retains all 66 prior targets',()=>{
 const p=finalSourceEpoch.proof,prior=currentSourceEpoch.proof,packet=battlePointerSparseSourcePacket,path='src/lua/abyss_battle_card_bindings.lua';
 assert.deepEqual(Object.keys(packet.current),[path]);assert.equal(packet.baseCommit,'2bc0d126e74d518664b6719274448624a1c67121');
 assert.equal(packet.currentCommit,'82b1a114ca486140ae913cca6a0834cab52417cb');assert.equal(p.currentCommit,packet.currentCommit);assert.equal(p.currentTreeCommitted,true);
 assert.deepEqual(packet.producers[path],{commit:packet.currentCommit,parents:['01c2e763f60eadff72c07325dbe671cd2267d0a4']});
 assert.deepEqual(packet.before[path],prior.current[path]);assert.deepEqual(packet.current[path],p.current[path]);
 assert.equal(Object.keys(prior.targets).length,66);assert.equal(Object.keys(p.targets).length,67);assert.equal(p.owners.length,121);
 for(const [name,target]of Object.entries(prior.targets))assert.deepEqual(p.targets[name],target,name);
 assert.deepEqual(p.targets.battlePointerSparsePrior,{commit:packet.baseCommit,files:prior.current});
 for(const owner of Object.keys(prior.current).filter(owner=>owner!==path))assert.deepEqual(p.current[owner],prior.current[owner],owner+' unchanged');
 const files=['config/architecture.json',...readdirSync('src/lua').filter(n=>n.endsWith('.lua')).map(n=>'src/lua/'+n)].sort();
 assert.deepEqual(files,Object.keys(p.current).filter(path=>p.current[path]!==null).sort());
 for(const owner of files)assert.equal(norm(finalSource(owner)),p.current[owner].source,owner);
});

test('sparse battle pointer source freshly rejects each missing changed or malformed owner and partial packets',()=>{
 const epoch=finalSourceEpoch,p=epoch.proof,anchor='src/lua/abyss_battle_card_bindings.lua',source=finalSource(anchor),expected=currentSourceEpoch.proof.current[anchor].source;
 for(const input of [source,source.replaceAll('\n','\r\n')]){
  const seen=[];assert.equal(epoch.preCombinedSource(anchor,input,{target:'battlePointerSparsePrior',readSource:path=>{seen.push(path);return finalSource(path);}}),expected);assert.deepEqual(seen,p.owners);
 }
 for(const owner of p.owners)for(const mode of ['changed','missing','buffer','throw']){
  const read=path=>{if(path!==owner)return finalSource(path);if(mode==='throw')throw Error('missing');if(mode==='missing')return null;if(mode==='buffer')return Buffer.from(finalSource(path));return finalSource(path)+'\n';};
  assert.throws(()=>epoch.preCombinedSource(anchor,source,{target:'battlePointerSparsePrior',readSource:read}),/linked owner/,owner+' '+mode);
 }
 for(const input of [source+'\n',source.slice(1),source.replaceAll('\n','\r\r\n'),Buffer.from(source),null,17]){
  let reads=0;assert.equal(epoch.preCombinedSource(anchor,input,{target:'battlePointerSparsePrior',readSource:()=>{reads++;throw Error('foreign');}}),input);assert.equal(reads,0);
 }
 for(const mutate of [v=>{v.before[anchor].source+='\n';},v=>{delete v.current[anchor];},v=>{v.currentCommit='f'.repeat(40);},v=>{v.producers[anchor].parents=[];}]){
  const bad=structuredClone(battlePointerSparseSourcePacket);mutate(bad);assert.throws(()=>extendBattlePointerSparseSource(currentSourceEpoch,bad));
 }
});

test('sparse battle pointer CI preserves every old archive, complete inventory and foreign-byte rejection',()=>{
 assertBattlePointerSparseCiCurrent();
 assert.deepEqual(battlePointerSparseCiPacket.priorInventory,battlePointerCiPacket.currentInventory);
 assert.deepEqual(battlePointerSparseCiPacket.currentInventory,battlePointerCiPacket.currentInventory);
 for(const [kind,paths]of Object.entries({js:discoverJs(),lua:readdirSync('tests/lua').filter(n=>n.endsWith('.lua')).map(n=>'tests/lua/'+n).sort()})){
  assertBattlePointerSparseRawInventory(paths,kind);
  for(const bad of [[],paths.slice(1),[...paths,paths[0]],[...paths,`tests/${kind==='lua'?'lua/':''}foreign.${kind==='lua'?'lua':'test.mjs'}`]])assert.throws(()=>assertBattlePointerSparseRawInventory(bad,kind),/raw discovery inventory/);
 }
 for(const [path,row]of Object.entries(battlePointerSparseCiPacket.files)){
  const source=norm(inspectionBeforeRead(actualReadFileSync,{production:true})(path,'utf8')),production=path.startsWith('src/');
  assert.equal(hash(source),row.current.sha256,path);assert.equal(battlePointerSparseCiSource(path,source),production?source:row.before?.source??source,path);
  for(const foreign of [source+'\n',source.slice(1),source.replaceAll('\n','\r\r\n'),null,{},17])assert.equal(battlePointerSparseCiSource(path,foreign),foreign,path);
  for(const foreignPath of ['__proto__','constructor','foreign/'+path])assert.equal(battlePointerSparseCiSource(foreignPath,source),source);
  for(const mode of ['changed','missing'])assert.throws(()=>assertBattlePointerSparseCiCurrent((p,e)=>{
   if(p!==path)return actualReadFileSync(p,e);if(mode==='missing')throw Error('missing '+p);return actualReadFileSync(p,e)+'\n';
  }),error=>{assert(error.message.includes(path));return true;});
 }
 for(const [path,sha]of Object.entries(battlePointerSparseCiPacket.immutableArchives)){
  assert.equal(hash(actualReadFileSync(path)),sha,path);
  assert.throws(()=>assertBattlePointerSparseCiCurrent((p,e)=>p===path?actualReadFileSync(p).subarray(1):actualReadFileSync(p,e)),/immutable sparse battle pointer predecessor/);
 }
 assert.equal(hash(actualReadFileSync('tests/helpers/battle-pointer-source.json.gz')),'c6ed821e15ab4e79de278db32122712c07716360166c995a6bf0f7a70c11639a');
 assert.equal(hash(actualReadFileSync('tests/helpers/battle-pointer-ci-source.json.gz')),'c5a93b3780fe741cec5393eabf5fe4c0d684952eb2bcf3b50e6b62fcbc0983ea');
});

test('sparse battle pointer isolated production copy retains new dependencies and rejects changed or deleted bytes',async t=>{
 const directory=mkdtempSync(join(tmpdir(),'sparse-battle-pointer-copy-'));t.after(()=>rmSync(directory,{recursive:true,force:true}));copyIntegrationSourceClosure(directory);
 for(const file of ['battle-pointer-sparse-source.mjs','battle-pointer-sparse-source.json.gz'])assert(existsSync(join(directory,'tests/helpers',file)));
 for(const file of ['battle-pointer-sparse-ci-source.mjs','battle-pointer-sparse-ci-source.json.gz'])assert(!existsSync(join(directory,'tests/helpers',file)));
 const copied=await import(pathToFileURL(join(directory,'tests/helpers/closeout-source-epoch.mjs')).href);assert.deepEqual(copied.sourceEpoch.proof,jointSourceEpoch.proof);
 const destination=join(directory,'next');mkdirSync(destination);
 for(const file of ['battle-pointer-sparse-source.mjs','battle-pointer-sparse-source.json.gz']){
  const path=join(directory,'tests/helpers',file),bytes=actualReadFileSync(path),changed=Buffer.from(bytes);changed[changed.length-1]^=1;
  writeFileSync(path,changed);assert.throws(()=>copyIntegrationSourceClosure(destination,{sourceRoot:directory}),/fresh helper copy identity/);
  if(file.endsWith('.gz'))await assert.rejects(import(pathToFileURL(join(directory,'tests/helpers/battle-pointer-sparse-source.mjs')).href+'?corrupt-packet'),/complete sparse battle pointer production packet/);
  unlinkSync(path);assert.throws(()=>copyIntegrationSourceClosure(destination,{sourceRoot:directory}),/ENOENT/);writeFileSync(path,bytes);
 }
 copyIntegrationSourceClosure(destination,{sourceRoot:directory});
});

test('sparse battle pointer CI trust leaf rejects changed and incomplete packets',async()=>{
 const leaf=inspectionBeforeCiRead('tests/helpers/battle-pointer-sparse-ci-source.mjs','utf8'),bytes=actualReadFileSync('tests/helpers/battle-pointer-sparse-ci-source.json.gz');
 const marker="const bytes=readFileSync(new URL('./battle-pointer-sparse-ci-source.json.gz',import.meta.url));";assert.equal(leaf.split(marker).length,2);
 const changed=Buffer.from(bytes);changed[changed.length-1]^=1;
 for(const bad of [bytes.subarray(0,bytes.length-1),changed]){
  const broken=leaf.replace(marker,`const bytes=Buffer.from(${JSON.stringify(bad.toString('base64'))},'base64');`);
  await assert.rejects(import('data:text/javascript;base64,'+Buffer.from(broken).toString('base64')),/complete sparse battle pointer CI continuation/);
 }
});


test('dismiss continuation authenticates the four committed owners and retains all 68 inspection targets',()=>{
 const current=dismissSourceEpoch.proof,prior=inspectionSourceEpoch.proof,packet=battlePointerDismissSourcePacket;
 assert.equal(Object.keys(current.current).length,352);assert.equal(current.owners.length,121);
 assert.equal(Object.keys(current.targets).length,69);
 for(const [name,target]of Object.entries(prior.targets))assert.deepEqual(current.targets[name],target,name);
 assert.deepEqual(current.targets.battlePointerDismissPrior,{commit:packet.baseCommit,files:prior.current});
 assert.deepEqual(current.battlePointerInspectionProducers,prior.battlePointerInspectionProducers);
 assert.equal(current.currentCommit,'51fdbbfa80fef284919777ee2408dbd201f95a70');
 for(const [path,row]of Object.entries(current.current))assert.equal(norm(actualSource(path)),row.source,path);
 for(const path of Object.keys(prior.current))if(!Object.hasOwn(packet.current,path))assert.deepEqual(current.current[path],prior.current[path],path);
 for(const [path,row]of Object.entries(packet.before))assert.deepEqual(row,prior.current[path],path);
 for(const mutate of [v=>{delete v.current[Object.keys(v.current)[0]];},v=>{v.before[Object.keys(v.before)[0]].source+='\n';},v=>{v.producers[Object.keys(v.producers)[0]].parents=[];}]){
  const bad=structuredClone(packet);mutate(bad);assert.throws(()=>extendBattlePointerDismissSource(inspectionSourceEpoch,bad));
 }
});

test('dismiss current readers reject changed and missing owners and fixtures before producing exact ad6 bytes',()=>{
 assertInspectionCiCurrent();assertDismissCiCurrent();
 const path='tests/helpers/closeout-source-epoch.mjs',before=dismissCiPacket.files[path].before.source;
 let bad=null,mode=null;
 const read=(p,e)=>{if(p===bad){if(mode==='missing')throw Error('missing '+p);if(mode==='null')return null;const raw=actualReadFileSync(p,e);return typeof raw==='string'?raw+'\n':Buffer.concat([raw,Buffer.from('\n')]);}return actualReadFileSync(p,e);};
 const reader=dismissBeforeRead(read,{production:true});
 assert.equal(reader(path,'utf8'),before);
 for(const p of Object.keys(dismissCiPacket.files))for(const failure of ['drift','missing','null']){
  bad=p;mode=failure;const trigger=p===path?'src/lua/abyss_battle_actions.lua':path;
  assert.throws(()=>reader(trigger,'utf8'),error=>{assert(error.message.includes(p));return true;});bad=null;
  assert.equal(reader(path,'utf8'),before,'same reader reauthenticates recovery');
 }
 for(const [p,row]of Object.entries(battlePointerDismissSourcePacket.current)){
  assert.equal(reader(p,'utf8'),battlePointerDismissSourcePacket.before[p].source);
  const source=actualSource(p),prior=inspectionSourceEpoch.proof.current[p].source;
  assert.equal(dismissSourceEpoch.preCombinedSource(p,source,{target:'battlePointerDismissPrior',readSource:actualSource}),prior);
  for(const owner of Object.keys(battlePointerDismissSourcePacket.current)){
   assert.throws(()=>dismissSourceEpoch.preCombinedSource(p,source,{target:'battlePointerDismissPrior',readSource:q=>q===owner?null:actualSource(q)}),/linked owner/,owner);
  }
  assert.equal(row.source,norm(source));
 }
 const foreign=actualSource(path)+'# foreign';
 assert.equal(dismissBeforeRead(()=>foreign,{production:true})(path,'utf8'),foreign);
 const binary=actualReadFileSync('tests/helpers/battle-pointer-inspection-source.json.gz');
 assert.deepEqual(reader('tests/helpers/battle-pointer-inspection-source.json.gz'),binary);
});

// Preserve the original 0780 contracts in their explicit independent parent domain.
{
const {potionPointerB9PriorInventory}=await import('./helpers/potion-pointer-b9-integration.mjs');
const {default:nodeTest}=await import('node:test');
const {default:assert}=await import('node:assert/strict');
const {readFileSync : actualUnionReadFileSync,readdirSync,mkdtempSync,mkdirSync,rmSync,existsSync,writeFileSync}=await import('node:fs');
const {potionPointerCiUnionRead,withPotionPointerCiUnionValidation}=await import('./helpers/potion-pointer-ci-union.mjs');
const publicPotionRead=potionPointerCiUnionRead('potion',actualUnionReadFileSync,{production:true});
let scopedPotionRead=null;
const actualPost697ReadFileSync=(...args)=>(scopedPotionRead??publicPotionRead)(...args);
// Original historical assertions run only inside a freshly authenticated synchronous snapshot.
const test=(name,fn)=>nodeTest(name,()=>withPotionPointerCiUnionValidation('potion',actualUnionReadFileSync,read=>{
 scopedPotionRead=read;try{return fn();}finally{scopedPotionRead=null;}
}));
const {potionPost697HistoricalRead,potionPost697PriorInventory}=await import('./helpers/potion-post697-ci-source.mjs');
const readFileSync=potionPost697HistoricalRead('selection',actualPost697ReadFileSync);
const {join}=await import('node:path');
const {tmpdir}=await import('node:os');
const {pathToFileURL}=await import('node:url');
const {copyIntegrationSourceClosure}=await import('./helpers/copy-integration-source-closure.mjs');
const {createHash}=await import('node:crypto');
const {gunzipSync}=await import('node:zlib');
const {discoverJs : jointPreparationDiscoverJs}=await import('../scripts/ci-shards.mjs');
const actualPost697DiscoverJs=()=>potionPointerB9PriorInventory(jointPreparationDiscoverJs(),'legacy');
const discoverJs=()=>potionPost697PriorInventory(actualPost697DiscoverJs(),'js',actualPost697ReadFileSync,'selection');
const {sourceEpoch : activePost697Epoch,releaseSelectionMapLegacyEpoch : sourceEpoch,preReleaseSelectionMapSourceEpoch}=await import('./helpers/closeout-source-epoch.mjs');
const {releaseSelectionMapSourcePacket,extendReleaseSelectionMapSource}=await import('./helpers/release-selection-map-source.mjs');
const {releaseSelectionMapCiPacket,releaseSelectionMapCiSource,releaseSelectionMapPriorInventory,assertReleaseSelectionMapRawInventory,assertReleaseSelectionMapCiCurrent : priorSelectionMapCiCurrent,assertReleaseSelectionMapExecutionGuards}=await import('./helpers/release-selection-map-ci-source.mjs');
const assertReleaseSelectionMapCiCurrent=(read=readFileSync)=>priorSelectionMapCiCurrent(read);
const hash=b=>createHash('sha256').update(b).digest('hex'),norm=s=>s.replaceAll('\r\n','\n');


test('legacy landed697 release selection map production preserves every complete prior target and freshly authenticates the committed source tree',()=>{
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

test('legacy landed697 release selection map CI validates complete live bindings while unknown or changed bytes stay visible',()=>{
 assertReleaseSelectionMapCiCurrent();
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

test('legacy landed697 release selection map raw JS and Lua inventories reject missing duplicate foreign and changed additions',()=>{
 const inventories={js:discoverJs(),lua:potionPost697PriorInventory(potionPointerB9PriorInventory(readdirSync('tests/lua').filter(n=>n.endsWith('.lua')).map(n=>'tests/lua/'+n).sort(),'legacy','lua'),'lua',actualPost697ReadFileSync,'selection')};
 for(const [kind,paths]of Object.entries(inventories)){
  assert.deepEqual(paths,releaseSelectionMapCiPacket.currentInventory[kind]);
  assertReleaseSelectionMapRawInventory(paths,kind);
  assert.deepEqual(releaseSelectionMapPriorInventory(paths,kind,readFileSync),releaseSelectionMapCiPacket.priorInventory[kind]);
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

test('legacy landed697 release selection map raw workflow checks each real execution deadline and trusted local route',()=>{
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

test('legacy landed697 release selection map production requires fresh complete owners and leaves foreign bytes visible',()=>{
 const p=sourceEpoch.proof,prior=preReleaseSelectionMapSourceEpoch.proof;
 assert.equal(Object.keys(p.current).length,352);assert.equal(p.owners.length,116);
 assert.equal(Object.keys(prior.targets).length,64);assert.equal(Object.keys(p.targets).length,65);
 const anchor=Object.keys(releaseSelectionMapSourcePacket.current)[0],raw=path=>p.current[path]?.source??null; // Immutable, Git-proved 33d projector domain; live union is tested independently.
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

nodeTest('legacy landed697 release selection map isolated production copy includes exact helper and packet without CI trust leaf',async t=>{
 const directory=mkdtempSync(join(tmpdir(),'release-selection-map-copy-'));
 t.after(()=>rmSync(directory,{recursive:true,force:true}));
 copyIntegrationSourceClosure(directory);
 for(const file of ['release-selection-map-source.mjs','release-selection-map-source.json.gz'])assert(existsSync(join(directory,'tests/helpers',file)));
 assert(!existsSync(join(directory,'tests/helpers/release-selection-map-ci-source.mjs')));
 const copied=await import(pathToFileURL(join(directory,'tests/helpers/closeout-source-epoch.mjs')).href);
 assert.deepEqual(copied.releaseSelectionMapLegacyEpoch.proof,sourceEpoch.proof);
 assert.deepEqual(copied.sourceEpoch.proof,activePost697Epoch.proof);
 const sourceRoot=join(directory,'drift');mkdirSync(sourceRoot);
 // The original closure copier authenticates dependencies from a distinct root.
 copyIntegrationSourceClosure(sourceRoot,{sourceRoot:directory});
 const adapter=join(directory,'tests/helpers/release-selection-map-source.mjs');writeFileSync(adapter,readFileSync(adapter,'utf8')+'\n');
 assert.throws(()=>copyIntegrationSourceClosure(sourceRoot,{sourceRoot:directory}),/fresh helper copy identity/);
});
}
