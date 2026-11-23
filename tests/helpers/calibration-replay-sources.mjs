import {beforeMapRoomReplayCohort} from './develop-replay-merge-source.mjs';
import {beforeMapNodeVisualsLineEndings} from './input-retirement-sts-binding.mjs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {readRetiredInputLuaReceipt,readRetiredInputTestReceipt} from './input-retirement-inventory.mjs';
import {beforeCombatEvents,beforeDevelopUiBackflows,beforePotionBackflow,readRetiredController,retiredControllerPath} from './input-retirement-source.mjs';
import {beforeActionButtons} from './action-buttons-source.mjs';
import {beforeDeckPages} from './develop-release-backflow-source.mjs';
import {beforeCurrentReplayFixes} from './current-replay-fix-sources.mjs';
import {beforeUiEntranceWitness} from './ui-entrance-source.mjs';
import {stsStylePriorRuntime} from './sts-style-prior-runtime.mjs';
import {restoreExactFixtureHunks} from './exact-fixture-hunks.mjs';
import {beforeSilentToolsDrawSource} from './silent-tools-draw-source.mjs';

const hash=(bytes,algorithm='sha256')=>createHash(algorithm).update(bytes).digest('hex');
const blob=source=>hash(`blob ${Buffer.byteLength(source)}\0${source}`,'sha1');
const lf=source=>source.replaceAll('\r\n','\n');
const bytes=readFileSync(new URL('./calibration-replay-sources.json.gz',import.meta.url));
assert.equal(hash(bytes),'ba41b8ca02fb157121f08addffdd14ade94d0d759494cfa9b56344426746c926','exact historical calibration input archive');
const packet=JSON.parse(gunzipSync(bytes));
assert.equal(packet.schemaVersion,1);
assert.equal(packet.base,'469e80240c5b7c60f75ff434bebac62d73c0bd0c');
const matches=(source,row)=>typeof source==='string'&&!source.includes('\r\r\n')&&
 hash(lf(source))===row.sha256&&blob(lf(source))===row.gitBlob;
const retirementBytes=readFileSync(new URL('./input-retirement-calibration-source.json.gz',import.meta.url));
assert.equal(hash(retirementBytes),'2ad6dd590a69fa7035d63d6fc2568dfff5ab815842192bc6a2eec619e316cfa1','exact calibration input retirement packet');
const retirement=JSON.parse(gunzipSync(retirementBytes));
assert.equal(retirement.base,'0461bcd30dac18818318cbafa77ad72fad069e0a');
for(const [path,row] of Object.entries(retirement.extra)){
 assert(Object.hasOwn(retirement.current,path),'registered calibration input successor: '+path);
 assert(matches(row.source,row),path+' exact retained fixture');
}
for(const row of retirement.retiredLua)assert(matches(row.source,row),'exact retired relic-view fixture');
for(const [path,row] of Object.entries(retirement.continuations))
 assert(matches(row.before.source,row.before),path+' exact input retirement CI test predecessor');
for(const [path,row] of Object.entries(packet.receipts))for(const [sha,retained] of Object.entries(row.before)){
 assert.equal(retained.sha256,sha,path+' recorded receipt identity');
 assert(matches(retained.source,retained),path+' exact retained receipt source');
}
for(const [path,row] of Object.entries(packet.continuations))
 assert(matches(row.before.source,row.before),path+' exact calibration continuation predecessor');

const runHudPotionFixture='tests/official-run-hud-reuse.test.mjs';
function beforeRunHudPotionFixture(path,source){
 if(path!==runHudPotionFixture||!matches(source,{
  sha256:'d25b9916ef640c869b28dc2c4227b522be54937e6e3ed91e6074de88653e30cd',gitBlob:'0d2a72ed384947c0d47be6eaac6de6d3ee2c2b6e',
 }))return source;
 const current=lf(source);
 // #872 appends a live potion assertion; only historical Run HUD reads omit it.
 const boundary=current.indexOf("\ntest('battle and noncombat potion popups share compact panel and action tokens',");
 assert(boundary>0,'exact Run HUD potion fixture suffix');
 const prior=current.slice(0,boundary);
 assert(matches(prior,{
  sha256:'0ac73d7298d2ef127daf0afc2b386073d19d9f5c25720b7f6513bfcaad4aa333',gitBlob:'bce30e2816a09bc594a84bec31c504b77ffe5d1f',
 }),'exact Run HUD potion fixture predecessor');
 return source.includes('\r\n')?prior.replaceAll('\n','\r\n'):prior;
}

export function beforeCalibrationReplay(path,source){
 source=beforeCurrentHistoricalStsSource(path,source);
 source=beforeMapNodeVisualsLineEndings(path,source);
 source=beforeRunHudPotionFixture(path,source);
 if(Object.hasOwn(retirement.continuations,path)){
  const {before,after}=retirement.continuations[path];
  if(matches(source,after))source=source.includes('\r\n')?before.source.replaceAll('\n','\r\n'):before.source;
 }
 if(!Object.hasOwn(packet.continuations,path))return source;
 const row=packet.continuations[path];
 if(!matches(source,row.after))return source;
 return source.includes('\r\n')?row.before.source.replaceAll('\n','\r\n'):row.before.source;
}
// These are test-helper continuations on the repaired baseline. Live test
// discovery, the current copier and the actual Silent runtime retain raw bytes.
const silentToolsReplayProofs = [
 {
  path:"tests/helpers/copy-integration-source-closure.mjs",
  beforeSha256:'1c6fb395d316833f309f3574faeb6b1930f7ea01ff540d40a82f8cad25a803c0',
  afterSha256:'4412a51015acd3cfd4c853315601b102e2bce1414f3207ea2c757ffe80a88154',
  hunks:[
  {at:337,
   before:` 'tests/helpers/current-replay-fix-sources.mjs':'54d1516c036a2cd208f697e912a4b359cc21dd47beed3ad1e9e37b9892fdf9a5',
 [runtime]:'278820e92b95d78ccca26cee32a353e53eaf8e87377fabe8c8dcb64f6995264d',
 [closeout]:'4f559399c631fbd0fd25ea7f1ceb8f3b8c6643e167f0116d9f151e12ee0a0ecb',`,
   after:` 'tests/helpers/current-replay-fix-sources.mjs':'54d1516c036a2cd208f697e912a4b359cc21dd47beed3ad1e9e37b9892fdf9a5',
 [runtime]:'c32e722ec57f1bfef0b1e2523c6867188611a7b74ffadde39c61c68530ffffee',
 'tests/helpers/silent-tools-draw-source.mjs':'fccfe657249e5dee3a423bf8f5d00d8d62328ac47c7a00dad851daef8e29813c',
 [closeout]:'4f559399c631fbd0fd25ea7f1ceb8f3b8c6643e167f0116d9f151e12ee0a0ecb',`,
  }
  ],
 },
 {
  path:"tests/helpers/combined-epoch/source-epoch-runtime.mjs",
  beforeSha256:'278820e92b95d78ccca26cee32a353e53eaf8e87377fabe8c8dcb64f6995264d',
  afterSha256:'c32e722ec57f1bfef0b1e2523c6867188611a7b74ffadde39c61c68530ffffee',
  hunks:[
  {at:19,
   before:`import {projectPotionTextSource,authorizePotionTextSource} from '../potion-text-source.mjs';
import {readFileSync} from 'node:fs';`,
   after:`import {projectPotionTextSource,authorizePotionTextSource} from '../potion-text-source.mjs';
import {beforeSilentToolsDrawSource,isSilentToolsDrawSuccessor} from '../silent-tools-draw-source.mjs';
import {readFileSync} from 'node:fs';`,
  },
  {at:130,
   before:`  const liveInput=source;
  const isLiveReader=liveReaders.has(rawReader(readSource));
  const projected=entrancePredecessor(path,source,rawReader(readSource),{allowConfigLayout});
  source=projected.source;readSource=projected.read;`,
   after:`  const liveInput=source;
  const actualReader=rawReader(readSource);
  const isLiveReader=liveReaders.has(actualReader);
  const toolsPrior=beforeSilentToolsDrawSource(path,source);
  const readToolsPrior=owner=>{
   assert.equal(typeof actualReader,'function','linked owner reader');
   return beforeSilentToolsDrawSource(owner,actualReader(owner));
  };
  const projected=entrancePredecessor(path,toolsPrior,readToolsPrior,{allowConfigLayout});
  source=projected.source;readSource=projected.read;`,
  },
  {at:156,
   before:`  // Develop successors and the default live reader require current owners.
  const historicalOwners=!isLiveReader&&backflow===rawInput
   &&(sourceHash(rawInput)===current.sha256||(path==='config/architecture.json'&&sameConfigLayout(rawInput)))?proof.current:undefined;
  const backflowReader=bindDevelopBackflow(readRaw,historicalOwners);
  backflowReader.authenticate(path,rawInput,{allowConfigLayout});`,
   after:`  // Develop successors and the default live reader require current owners.
  const historicalOwners=!isLiveReader&&toolsPrior===liveInput&&backflow===rawInput
   &&(sourceHash(rawInput)===current.sha256||(path==='config/architecture.json'&&sameConfigLayout(rawInput)))?proof.current:undefined;
  const backflowReader=bindDevelopBackflow(readRaw,historicalOwners);
  if(toolsPrior!==liveInput)assert(isSilentToolsDrawSuccessor(path,actualReader(path)),
   'combined linked owner identity: '+path+' changed during owner validation');
  backflowReader.authenticate(path,rawInput,{allowConfigLayout});`,
  }
  ],
 },
 {
  path:"tests/helpers/silent-final-apply-vm.mjs",
  beforeSha256:'50d8bc937b8718e3ae0127ec7e040d85268b9ce91aca71d3c275f0cdb80c47de',
  afterSha256:'de6a9cefdf8065cf65d69bf1efbf331955de5be7c99e4ec9bf8c0ebf7152006c',
  hunks:[
  {at:11,
   before:`const sites=[
 ["local c=actions().fresh(combat,s,e.template.cardId,e.template)","attempt to index a nil value (field 'template')"],`,
   after:`const sites=[
 ["assert(s.potionRng,'missing persistent potion RNG')",'missing persistent potion RNG'],
 ["local c=actions().fresh(combat,s,e.template.cardId,e.template)","attempt to index a nil value (field 'template')"],`,
  },
  {at:48,
   before:`  local outer=depth==0;depth=depth+1;local returned=table.pack(pcall(fn,s,...));depth=depth-1
  if outer then SILENT_GRAPH_WRITE({state=s,returned=returned},name)end
  if not returned[1]then error(returned[2],0)end`,
   after:`  local outer=depth==0;depth=depth+1;local returned=table.pack(pcall(fn,s,...));depth=depth-1
  if outer then
   local observed=returned
   if not returned[1] and type(returned[2])=='string'then
    observed=table.pack(table.unpack(returned,1,returned.n));observed[2]=SILENT_ERROR(returned[2])
   end
   SILENT_GRAPH_WRITE({state=s,returned=observed},name)
  end
  if not returned[1]then error(returned[2],0)end`,
  }
  ],
 }
];
const silentToolsReplayByPath = new Map(silentToolsReplayProofs.map(proof => [proof.path, proof]));
function beforeSilentToolsReplay(path, source) {
 const proof = silentToolsReplayByPath.get(path);
 if (!proof) return beforeSilentToolsDrawSource(path, source);
 const before = restoreExactFixtureHunks(proof, path, source);
 return before !== source && source.includes('\r\n') ? before.replaceAll('\n','\r\n') : before;
}

const copierPath='tests/helpers/copy-integration-source-closure.mjs';
const historicalStsEntry='tests/helpers/historical-sts-style-entry.mjs';
export function beforeCurrentHistoricalStsSource(path,source){
 if(Buffer.isBuffer(source)){
  const text=source.toString('utf8'),prior=beforeCurrentHistoricalStsSource(path,text);
  return prior===text?source:Buffer.from(prior);
 }
 source=beforeUiEntranceWitness(path,beforeSilentToolsReplay(path,source));
 if(path===copierPath)return beforeCurrentReplayCopier(path,source);
 if(path!==historicalStsEntry)return beforeCurrentReplayFixes(path,source);
 if(!matches(source,{
  sha256:'f358b5956f55a33890ea4f4481b75bcd0bfc56048cbc50e4b45a0f9870654c3b',gitBlob:'eb9b2d891344249dfb6644f8800240e3078d38b6',
 }))return source;
 const prior=lf(source)
  .replace("import {beforeCurrentHistoricalStsSource} from './calibration-replay-sources.mjs';\n",'')
  .replace('beforeCurrentHistoricalStsSource(p,readFileSync(join(root,p),e))','readFileSync(join(root,p),e)');
 assert(matches(prior,{
  sha256:'96c580efcf1c7ed4e1be8b1bc3a27d15212c8b485e5a345d5ec450ad364017ae',gitBlob:'ce9126941e02931a16a28e10e20182c41799c7ef',
 }),'exact historical StS runner predecessor');
 return source.includes('\r\n')?prior.replaceAll('\n','\r\n'):prior;
}
function beforeCurrentReplayCopier(path,source){
 if(path===copierPath&&matches(source,{
  sha256:'1c6fb395d316833f309f3574faeb6b1930f7ea01ff540d40a82f8cad25a803c0',gitBlob:'d986351a338f04b2bc7ae63f2ee199670f393607',
 })){
  const prior=lf(source).replace(/const entranceFiles=Object.freeze\(\{\n[\s\S]+?\n\}\);\n/,'')
   .replace('Object.entries(entranceFiles)','Object.entries(currentReplayFiles)');
  assert.equal(hash(prior),'f606b9a16cf0800cdec7f8a781aaab7deca6f05e08937a3488fef86a54b6742b','exact entrance copier predecessor');
  source=source.includes('\r\n')?prior.replaceAll('\n','\r\n'):prior;
 }
 if(path!==copierPath||!matches(source,{
  sha256:'f606b9a16cf0800cdec7f8a781aaab7deca6f05e08937a3488fef86a54b6742b',gitBlob:'a796a1ddf69bd0a3c19e21eb7be78d21f498e720',
 }))return source;
 const text=lf(source);
 const block='const currentReplayFiles=Object.freeze({\n';
 const start=text.indexOf(block),end=text.indexOf('const inside=',start);
 assert(start>=0&&end>start,'exact current replay copy closure extension');
 const prior=(text.slice(0,start)+text.slice(end)).replace('Object.entries(currentReplayFiles))','Object.entries(actionButtonFiles))');
 assert(matches(prior,{
  sha256:'848e21017bfe022dd0a5e8215ffa94aee50b328ac9d7055ef1fade4f3a170677',gitBlob:'f3005ce3dcd73c1a5bd64fc252535ee6950bc6ff',
 }),'exact pre-repair helper copy closure');
 return source.includes('\r\n')?prior.replaceAll('\n','\r\n'):prior;
}

function matchesCurrentReceipt(path,source,expected){
 source=beforeUiEntranceWitness(path,beforeSilentToolsReplay(path,source));
 if(matches(source,expected))return true;
 const ui=beforeDevelopUiBackflows(path,source);
 const actions=beforeActionButtons(path,ui);
 return [beforePotionBackflow(path,source),ui,actions,beforeCombatEvents(path,actions),beforeDeckPages(path,source)]
  .some(prior=>matches(prior,expected));
}

// A frozen receipt may read a registered old blob only after checking the
// corresponding current file. Raw Full discovery and inputs use their normal readers.
export function readCalibrationReceiptInput(path,digest,read,readCurrent=readFileSync){
 const fallback=()=>{
  const source=read(),prior=beforeCurrentReplayFixes(path,beforeSilentToolsReplay(path,source));
  return typeof prior==='string'&&hash(lf(prior))===digest?prior:source;
 };
 const retired=readRetiredInputTestReceipt(path,digest,readCurrent);
 if(retired!==undefined)return retired;
 if(path==='tests/lua/relic_view_controller_click.lua'){
  const row=retirement.retiredLua.find(row=>row.sha256===digest);
  if(row)return readRetiredInputLuaReceipt(path,digest,readCurrent,row);
 }
 const current=Object.hasOwn(retirement.current,path)?retirement.current[path]:null;
 const retained=Object.hasOwn(packet.receipts,path)&&Object.hasOwn(packet.receipts[path].before,digest)?packet.receipts[path].before[digest]:null;
 if(path===retiredControllerPath&&digest===stsStylePriorRuntime.files[path].sha256){
  assert(readRetiredController(p=>readCurrent(p,'utf8')).restored,'retired production controller receipt requires the current pointer owner');
  return stsStylePriorRuntime.files[path].source;
 }
 if(current){
  const extra=Object.hasOwn(retirement.extra,path)?retirement.extra[path]:null;
  const prior=Object.hasOwn(stsStylePriorRuntime.files,path)?stsStylePriorRuntime.files[path]:null;
  const witness=retained??(extra?.sha256===digest?extra:prior?.sha256===digest?prior:null);
  if(witness){
   assert(matchesCurrentReceipt(path,readCurrent(path,'utf8'),current),'current receipt input changed: '+path);
   assert(matches(witness.source,witness),path+' exact retained calibration input');
   return witness.source;
  }
 }
 if(!Object.hasOwn(packet.receipts,path))return fallback();
 const row=packet.receipts[path];
 if(!Object.hasOwn(row.before,digest))return fallback();
 if(row.current===null)assert.throws(()=>readCurrent(path,'utf8'),{code:'ENOENT'},'retired receipt input reappeared: '+path);
 else{
  const raw=beforeCurrentHistoricalStsSource(path,readCurrent(path,'utf8'));
  let current=raw;
  if(path==='tests/helpers/combined-epoch/source-epoch-runtime.mjs'||path==='tests/helpers/copy-integration-source-closure.mjs'||
     path==='tests/helpers/round3-catalog-source-inverse.mjs'){
   current=beforeMapRoomReplayCohort(path,raw);
   assert.notEqual(current,raw,'current receipt input changed: '+path);
  }
  assert(matchesCurrentReceipt(path,current,row.current),'current receipt input changed: '+path);
 }
 return row.before[digest].source;
}
