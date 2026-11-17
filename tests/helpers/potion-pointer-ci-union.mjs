// Exact current preparation -> independent parent views. Not release acceptance.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {sourceEpoch} from './closeout-source-epoch.mjs';
const PACKET_SHA='2550d7de0c1b491e342b2a50d453fd4553593f524da152181da6cff0fcdd0435';
const hash=b=>createHash('sha256').update(b).digest('hex'),norm=s=>s.replaceAll('\r\n','\n');
const bytes=readFileSync(new URL('./potion-pointer-ci-union.json.gz',import.meta.url));
assert.equal(hash(bytes),PACKET_SHA,'immutable potion-pointer CI union');
const packet=JSON.parse(gunzipSync(bytes));
const calibrationPriorPath='tests/helpers/potion-pointer-ci-before-calibration.json.gz';
const calibrationPriorSha='7b049aac614a17f37f3c272e11c45df127c43f83d5109567018ea548ac921081';
const calibrationPriorBytes=readFileSync(new URL('./potion-pointer-ci-before-calibration.json.gz',import.meta.url));
assert.equal(hash(calibrationPriorBytes),calibrationPriorSha,'exact pre-calibration union');
assert.equal(packet.calibrationPredecessorCommit,'d2a8fa6d3d0beba9774b07083589a867497efba2');
assert.equal(packet.calibrationPredecessorSha256,calibrationPriorSha);
const calibrationPrior=JSON.parse(gunzipSync(calibrationPriorBytes));
assert.deepEqual(Object.keys(packet.files),Object.keys(calibrationPrior.files));
for(const [path,row]of Object.entries(packet.files))if(path!=='tests/ci-complete-calibration.test.mjs')assert.deepEqual(row,calibrationPrior.files[path],'unchanged pre-calibration input '+path);
const integratedPriorBytes=readFileSync(new URL('./potion-pointer-ci-before-integrated.json.gz',import.meta.url));
const integratedPriorSha='4e21ceac3bdf6bf34a7f4c3d9426c8b26a3c6f7eee600b3688f79154fcc0b22b';
assert.equal(hash(integratedPriorBytes),integratedPriorSha,'exact pre-integrated union');
assert.equal(packet.integratedPredecessorCommit,'324d2a2797201725cb104097567d69da681b84a8');
assert.equal(packet.integratedPredecessorSha256,integratedPriorSha);
const integratedPrior=JSON.parse(gunzipSync(integratedPriorBytes));
assert.deepEqual(Object.keys(packet.files),Object.keys(integratedPrior.files));
for(const [path,row]of Object.entries(packet.files))if(!['tests/integrated-ci-source.cases.mjs','tests/ci-complete-calibration.test.mjs'].includes(path))assert.deepEqual(row,integratedPrior.files[path],'unchanged previous consumer binding '+path);
const priorPacketPath='tests/helpers/potion-pointer-ci-before-selection.json.gz';
const priorPacketSha='ed0dd1a847de736030747f4b1b2a051e42930830a885046ffc96c11270098ccb';
const priorBytes=readFileSync(new URL('./potion-pointer-ci-before-selection.json.gz',import.meta.url));
assert.equal(hash(priorBytes),priorPacketSha,'immutable pre-selection CI union');
assert.equal(packet.predecessorCommit,'7d02a6ae3be107730b7c1c128720e22c8431cbbe');
assert.equal(packet.predecessorPacketSha256,priorPacketSha);
const previous=JSON.parse(gunzipSync(priorBytes));
assert.deepEqual(Object.keys(packet.files),Object.keys(previous.files),'complete predecessor CI input set');
for(const [path,row]of Object.entries(packet.files)){
 assert.deepEqual(Object.keys(row.views),Object.keys(previous.files[path].views),'unchanged parent domains '+path);
 for(const [target,view]of Object.entries(row.views)){
  const before=previous.files[path].views[target];
  assert.equal(view.sha256,before.sha256,'unchanged original parent identity '+path);
  if(before.source!==undefined)assert.equal(view.source,before.source,'unchanged complete original parent source '+path);
 }
 if(!['tests/release-selection-map-source.test.mjs','tests/integrated-ci-source.cases.mjs','tests/ci-complete-calibration.test.mjs'].includes(path))assert.deepEqual(row.current,previous.files[path].current,'unchanged other union input '+path);
}
assert.equal(packet.schemaVersion,1);assert.equal(packet.normalization,'LF');
assert.equal(packet.baseCommit,'29ae8d2cb2a5b729c348191ee56910b1aa77386c');
assert.deepEqual(packet.viewCommits,{potion:'eabff9b0bf2cce17ae05913c0e5d47366d0ff173',pointer:'ad6fe84dbcc11e28e8a82258f889a6841b46c8c6'});
const saved=(row,target)=>{const view=row.views[target];return view?row.current.encoding==='base64'?Buffer.from(view.source,'base64'):view.source:null;};
for(const row of Object.values(packet.files))for(const target of Object.keys(row.views))if(row.views[target].sha256!==row.current.sha256)assert.equal(hash(saved(row,target)),row.views[target].sha256,'complete exact CI union predecessor');
const freeze=v=>{if(v&&typeof v==='object'&&!Object.isFrozen(v)){Object.values(v).forEach(freeze);Object.freeze(v);}return v;};
export const potionPointerCiUnionPacket=freeze(packet);
const authenticatedSnapshots=new WeakSet();
export function assertPotionPointerCiUnionCurrent(read=readFileSync){
 if(authenticatedSnapshots.has(read))return;
 assert.equal(hash(read(calibrationPriorPath)),calibrationPriorSha,'fresh pre-calibration union');
 assert.equal(hash(read('tests/helpers/potion-pointer-ci-before-integrated.json.gz')),integratedPriorSha,'fresh pre-integrated union');
 assert.equal(hash(read(priorPacketPath)),priorPacketSha,'fresh immutable pre-selection CI union');
 assert.equal(hash(read('tests/helpers/potion-pointer-ci-union.json.gz')),PACKET_SHA,'fresh immutable potion-pointer CI union');
 // Authenticate every product source, not merely the changed/previously-owned slice.
 for(const [path,row]of Object.entries(sourceEpoch.proof.current))if(row){
  const raw=read(path,'utf8');assert.equal(typeof raw,'string','fresh union owner '+path);
  assert(!raw.includes('\r\r\n'),'malformed union owner '+path);
  assert.equal(hash(norm(raw)),row.sha256,'fresh union owner '+path);
 }
 for(const [path,row]of Object.entries(packet.files)){
  const raw=read(path,row.current.encoding==='base64'?undefined:'utf8');
  if(typeof raw==='string')assert(!raw.includes('\r\r\n'),'malformed union input '+path);
  assert.equal(hash(typeof raw==='string'?norm(raw):raw),row.current.sha256,'fresh union input '+path);
 }
}
export function potionPointerCiUnionSource(path,source,target='potion',read=readFileSync,{production=false}={}){
 assert(Object.hasOwn(packet.viewCommits,target),'explicit potion-pointer predecessor');
 if(!production&&(path.startsWith('src/')||path==='config/architecture.json'))return source;
 const row=Object.hasOwn(packet.files,path)?packet.files[path]:null;
 if(!row?.views[target]||row.current.encoding!=='utf8'||typeof source!=='string'||source.includes('\r\r\n')||hash(norm(source))!==row.current.sha256)return source;
 const prior=saved(row,target);if(row.views[target].sha256===row.current.sha256)return source;
 assertPotionPointerCiUnionCurrent(read);return prior;
}
export function potionPointerCiUnionRead(target='potion',read=readFileSync,{production=false}={}){return(path,encoding)=>{
 const raw=read(path,encoding);if(raw===null||raw===undefined)return raw;
 const row=Object.hasOwn(packet.files,path)?packet.files[path]:null;
 if(Buffer.isBuffer(raw)&&row?.current.encoding==='base64'&&row.views[target]&&hash(raw)===row.current.sha256&&row.views[target].sha256!==row.current.sha256){assertPotionPointerCiUnionCurrent(read);return Buffer.from(saved(row,target));}
 const text=typeof raw==='string'?raw:raw.toString('utf8');
 const prior=potionPointerCiUnionSource(path,text,target,read,{production});
 return typeof raw==='string'?prior:prior===text?raw:Buffer.from(prior);
};}
// A complete synchronous assertion consumes one immutable capture, not a reusable
// public reader. Fresh public projections above intentionally never use this path.
export function withPotionPointerCiUnionValidation(target,read,validate){
 assert(Object.hasOwn(packet.viewCommits,target));
 const captured=new Map();
 for(const path of new Set([...Object.keys(sourceEpoch.proof.current),...Object.keys(packet.files),'tests/helpers/potion-pointer-ci-union.json.gz',priorPacketPath,calibrationPriorPath,'tests/helpers/potion-pointer-ci-before-integrated.json.gz'])){
  if(sourceEpoch.proof.current[path]===null&&!Object.hasOwn(packet.files,path))continue;
  const bytes=read(path);assert(Buffer.isBuffer(bytes),'validation capture bytes '+path);captured.set(path,Buffer.from(bytes));
 }
 let active=true;
 const snapshot=(path,encoding)=>{assert(active,'CI union current snapshot escaped synchronous scope');const value=captured.has(path)?Buffer.from(captured.get(path)):read(path);return encoding?value.toString(encoding):value;};
 assertPotionPointerCiUnionCurrent(snapshot);
 authenticatedSnapshots.add(snapshot);
 const prior=(path,encoding)=>{
  assert(active,'CI union validation reader escaped synchronous scope');
  const raw=snapshot(path,encoding),row=Object.hasOwn(packet.files,path)?packet.files[path]:null;
  if(!row?.views[target]||row.views[target].sha256===row.current.sha256)return raw;
  const value=saved(row,target);return encoding?Buffer.isBuffer(value)?value.toString(encoding):value:Buffer.isBuffer(value)?Buffer.from(value):Buffer.from(value);
 };
 try{const result=validate(prior,snapshot);assert(!result||typeof result.then!=='function','CI union validation must be synchronous');}
 finally{active=false;authenticatedSnapshots.delete(snapshot);captured.clear();}
}
