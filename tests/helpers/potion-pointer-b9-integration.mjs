// Exact continuation of the reviewed potion-pointer preparation and current pointer711. DependsOn711 unmet.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {sourceEpoch} from './closeout-source-epoch.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex'),norm=s=>s.replaceAll('\r\n','\n');
const bytes=readFileSync(new URL('./potion-pointer-b9-integration.json.gz',import.meta.url));
assert.equal(hash(bytes),'ccd79b18af8fd49c575aeb24212a86cca52dedfd05ee428fac50c43943352a17','complete current potion pointer B9 preparation');
const packet=JSON.parse(gunzipSync(bytes));
assert.deepEqual(packet.parents,{legacy:'0780e604323bc78139e0fcf3fc68f1b9d78e6ca8',pointer711:'2c546641c79775ddfa6e9532ce5c65e1ea5793de'});
for(const [path,row]of Object.entries(packet.files))for(const b of [row.current,...Object.values(row.before)].filter(Boolean)){
 assert.equal(b.source,norm(b.source),path);assert.equal(hash(b.source),b.sha256,path);
}
const freeze=value=>{if(value&&typeof value==='object'&&!Object.isFrozen(value)){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
export const potionPointerB9Packet=freeze(packet);
export function assertPotionPointerB9Current(read=readFileSync){
 assert.equal(hash(read('tests/helpers/potion-pointer-b9-integration.json.gz')),hash(bytes),'fresh complete current potion-pointer witness');
 for(const [path,sha]of Object.entries(packet.archives))assert.equal(hash(read(path)),sha,'fresh immutable potion-pointer predecessor '+path);
 for(const [path,row]of Object.entries(sourceEpoch.proof.current)){
  if(!row)continue;
  const source=read(path,'utf8');assert.equal(typeof source,'string','fresh union owner '+path+'; linked owner; fresh complete integration source');
  assert.equal(hash(norm(source)),sourceEpoch.proof.current[path].sha256,'fresh union owner '+path+'; linked owner; fresh complete integration source');
 }
 for(const [path,row]of Object.entries(packet.files)){
  const source=read(path,'utf8');assert.equal(typeof source,'string','fresh union input '+path+'; fresh complete integration source');
  assert.equal(hash(norm(source)),row.current.sha256,'fresh union input '+path+'; fresh complete integration source');
 }
}
export function potionPointerB9Source(path,source,side='legacy',{read=readFileSync,production=false,authenticate=true}={}){
 assert(Object.hasOwn(packet.parents,side),'known actual B9 parent');
 if(!production&&(path.startsWith('src/')||path==='config/architecture.json'))return source;
 const row=Object.hasOwn(packet.files,path)?packet.files[path]:null,before=row?.before[side];
 if(!before||typeof source!=='string'||source.includes('\r\r\n')||hash(norm(source))!==row.current.sha256||before.sha256===row.current.sha256)return source;
 if(authenticate)assertPotionPointerB9Current(read);
 return before.source;
}
export function potionPointerB9Read(side='legacy',read=readFileSync,{production=false,authenticate=true}={}){return(path,encoding)=>{
 const raw=read(path,encoding);if(typeof raw!=='string'&&!Buffer.isBuffer(raw))return raw;
 const text=typeof raw==='string'?raw:raw.toString('utf8');
 const prior=potionPointerB9Source(path,text,side,{read,production,authenticate});
 return typeof raw==='string'?prior:prior===text?raw:Buffer.from(prior);
};}

export function potionPointerB9Inventory(kind='js'){assert(['js','lua'].includes(kind));return [...packet.inventory.current[kind]];}
export function potionPointerB9PriorInventory(paths,side='legacy',kind='js',read=readFileSync){
 assert(Object.hasOwn(packet.parents,side));assert(['js','lua'].includes(kind));
 const current=packet.inventory.current[kind],before=packet.inventory[side][kind],sorted=[...paths].sort();
 if(JSON.stringify(sorted)===JSON.stringify(before))return [...paths];
 const added=current.filter(p=>!before.includes(p));if(!added.some(p=>paths.includes(p)))return [...paths];
 assert.deepEqual(sorted,current,'complete current potion pointer raw '+kind+' inventory');
 assertPotionPointerB9Current(read);
 return [...before];
}
