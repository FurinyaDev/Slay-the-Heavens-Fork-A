// Exact two-parent continuation of the existing Release card-contact join.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {sourceEpoch} from './closeout-source-epoch.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex'),norm=s=>s.replaceAll('\r\n','\n');
const bytes=readFileSync(new URL('./pointer-b9-integration.json.gz',import.meta.url));
assert.equal(hash(bytes),'01f79a6ed76adcb4f87f0d8be8065e3ac169128032e1e5d98269737de445c88d','complete actual pointer B9 integration');
const packet=JSON.parse(gunzipSync(bytes));
assert.deepEqual(packet.parents,{pointer:'4d74cd79836e18c70a244e04f6150f9ad36d6f6a',cardContact:'b9bca884ed9b9831965b409885d78f719b9a567a'});
for(const [path,row]of Object.entries(packet.files))for(const b of [row.current,...Object.values(row.before)].filter(Boolean)){
 assert.equal(b.source,norm(b.source),path);assert.equal(hash(b.source),b.sha256,path);
}
const freeze=value=>{if(value&&typeof value==='object'&&!Object.isFrozen(value)){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
export const pointerB9Packet=freeze(packet);
export function assertPointerB9Current(read=readFileSync){
 for(const path of sourceEpoch.proof.owners){
  const source=read(path,'utf8');assert.equal(typeof source,'string','fresh complete integration source: linked owner '+path);
  assert.equal(hash(norm(source)),sourceEpoch.proof.current[path].sha256,'fresh complete integration source: linked owner '+path);
 }
 for(const [path,row]of Object.entries(packet.files)){
  const source=read(path,'utf8');assert.equal(typeof source,'string','fresh complete integration source: pointer B9 '+path);
  assert.equal(hash(norm(source)),row.current.sha256,'fresh complete integration source: pointer B9 '+path);
 }
}
export function pointerB9Source(path,source,side='pointer',{read=readFileSync,production=false,authenticate=true}={}){
 assert(Object.hasOwn(packet.parents,side),'known actual B9 parent');
 if(!production&&(path.startsWith('src/')||path==='config/architecture.json'))return source;
 const row=Object.hasOwn(packet.files,path)?packet.files[path]:null,before=row?.before[side];
 if(!before||typeof source!=='string'||source.includes('\r\r\n')||hash(norm(source))!==row.current.sha256||before.sha256===row.current.sha256)return source;
 if(authenticate)assertPointerB9Current(read);
 return before.source;
}
export function pointerB9Read(side='pointer',read=readFileSync,{production=false,authenticate=true}={}){return(path,encoding)=>{
 const raw=read(path,encoding);if(typeof raw!=='string'&&!Buffer.isBuffer(raw))return raw;
 const text=typeof raw==='string'?raw:raw.toString('utf8');
 const prior=pointerB9Source(path,text,side,{read,production,authenticate});
 return typeof raw==='string'?prior:prior===text?raw:Buffer.from(prior);
};}
