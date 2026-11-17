// Exact ad6 predecessor for this four-owner product repair. No inventory changes.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {sourceEpoch} from './closeout-source-epoch.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex'),norm=s=>s.replaceAll('\r\n','\n');
const bytes=readFileSync(new URL('./battle-pointer-dismiss-ci-source.json.gz',import.meta.url));
assert.equal(hash(bytes),'8ff30eb8c4027230a7fb58359cd48648b151aec8ae132653fd01f31cf05cbe71','complete dismiss battle pointer CI continuation');
const packet=JSON.parse(gunzipSync(bytes));
assert.equal(packet.schemaVersion,1);assert.equal(packet.normalization,'LF');
assert.equal(packet.baseCommit,'ad6fe84dbcc11e28e8a82258f889a6841b46c8c6');
assert.equal(packet.productCommit,'51fdbbfa80fef284919777ee2408dbd201f95a70');
for(const [path,row]of Object.entries(packet.files))for(const binding of [row.before,row.current]){
 assert.equal(binding.source,norm(binding.source),path);assert.equal(hash(binding.source),binding.sha256,path);
 assert.equal(createHash('sha1').update(`blob ${Buffer.byteLength(binding.source)}\0`).update(binding.source).digest('hex'),binding.gitBlob,path);
}
const freeze=v=>{if(v&&typeof v==='object'&&!Object.isFrozen(v)){Object.values(v).forEach(freeze);Object.freeze(v);}return v;};
export const dismissCiPacket=freeze(packet);
export function assertDismissCiCurrent(read=readFileSync){
 for(const path of sourceEpoch.proof.owners){
  const source=read(path,'utf8');assert.equal(typeof source,'string','fresh linked owner: '+path);
  assert.equal(hash(norm(source)),sourceEpoch.proof.current[path].sha256,'fresh linked owner: '+path);
 }
 for(const [path,row]of Object.entries(packet.files)){
  const source=read(path,'utf8');assert.equal(typeof source,'string',(path.startsWith('src/')?'fresh linked owner: ':'fresh dismiss source: ')+path);
  assert.equal(hash(norm(source)),row.current.sha256,(path.startsWith('src/')?'fresh linked owner: ':'fresh dismiss source: ')+path);
 }
}
export function dismissPriorSource(path,source,{read=readFileSync,production=false,authenticate=true}={}){
 if(!production&&(path.startsWith('src/')||path==='config/architecture.json'))return source;
 const row=Object.hasOwn(packet.files,path)?packet.files[path]:null;
 if(!row||typeof source!=='string'||source.includes('\r\r\n')||hash(norm(source))!==row.current.sha256||row.before.sha256===row.current.sha256)return source;
 if(authenticate)assertDismissCiCurrent(read);
 return row.before.source;
}
export function dismissBeforeRead(read=readFileSync,{production=false,authenticate=true}={}){return(path,encoding)=>{
 const raw=read(path,encoding);if(typeof raw!=='string'&&!Buffer.isBuffer(raw))return raw;
 const text=typeof raw==='string'?raw:raw.toString('utf8');
 const prior=dismissPriorSource(path,text,{read,production,authenticate});
 return typeof raw==='string'?prior:prior===text?raw:Buffer.from(prior);
};}
