// Exact current preparation -> independent parent views. Not release acceptance.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {sourceEpoch} from './closeout-source-epoch.mjs';
const PACKET_SHA='ed0dd1a847de736030747f4b1b2a051e42930830a885046ffc96c11270098ccb';
const hash=b=>createHash('sha256').update(b).digest('hex'),norm=s=>s.replaceAll('\r\n','\n');
const bytes=readFileSync(new URL('./potion-pointer-ci-union.json.gz',import.meta.url));
assert.equal(hash(bytes),PACKET_SHA,'immutable potion-pointer CI union');
const packet=JSON.parse(gunzipSync(bytes));
assert.equal(packet.schemaVersion,1);assert.equal(packet.normalization,'LF');
assert.equal(packet.baseCommit,'29ae8d2cb2a5b729c348191ee56910b1aa77386c');
assert.deepEqual(packet.viewCommits,{potion:'eabff9b0bf2cce17ae05913c0e5d47366d0ff173',pointer:'ad6fe84dbcc11e28e8a82258f889a6841b46c8c6'});
const saved=(row,target)=>{const view=row.views[target];return view?row.current.encoding==='base64'?Buffer.from(view.source,'base64'):view.source:null;};
for(const row of Object.values(packet.files))for(const target of Object.keys(row.views))if(row.views[target].sha256!==row.current.sha256)assert.equal(hash(saved(row,target)),row.views[target].sha256,'complete exact CI union predecessor');
const freeze=v=>{if(v&&typeof v==='object'&&!Object.isFrozen(v)){Object.values(v).forEach(freeze);Object.freeze(v);}return v;};
export const potionPointerCiUnionPacket=freeze(packet);
export function assertPotionPointerCiUnionCurrent(read=readFileSync){
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
 for(const path of new Set([...Object.keys(sourceEpoch.proof.current),...Object.keys(packet.files),'tests/helpers/potion-pointer-ci-union.json.gz'])){
  if(sourceEpoch.proof.current[path]===null&&!Object.hasOwn(packet.files,path))continue;
  const bytes=read(path);assert(Buffer.isBuffer(bytes),'validation capture bytes '+path);captured.set(path,Buffer.from(bytes));
 }
 const snapshot=(path,encoding)=>{const value=captured.has(path)?Buffer.from(captured.get(path)):read(path);return encoding?value.toString(encoding):value;};
 assertPotionPointerCiUnionCurrent(snapshot);
 let active=true;
 const prior=(path,encoding)=>{
  assert(active,'CI union validation reader escaped synchronous scope');
  const raw=snapshot(path,encoding),row=Object.hasOwn(packet.files,path)?packet.files[path]:null;
  if(!row?.views[target]||row.views[target].sha256===row.current.sha256)return raw;
  const value=saved(row,target);return encoding?Buffer.isBuffer(value)?value.toString(encoding):value:Buffer.isBuffer(value)?Buffer.from(value):Buffer.from(value);
 };
 try{const result=validate(prior);assert(!result||typeof result.then!=='function','CI union validation must be synchronous');}
 finally{active=false;captured.clear();}
}
