// Current join is separate from the immutable pc slice/bootstrap domains.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {sourceEpoch} from './closeout-source-epoch.mjs';
import {releaseMergeCiPacket,releaseMergeSource as oldMergeSource,assertReleaseMergeCurrent as oldMergeCurrent} from './release-bootstrap-merge-ci-source.mjs';
import {releasePcCiPacket} from './release-pc-ci-source.mjs';
import {releaseSelectionMapCiPacket} from './release-selection-map-ci-source.mjs';
const hash=s=>createHash('sha256').update(s).digest('hex'),norm=s=>s.replaceAll('\r\n','\n');
const bytes=readFileSync(new URL('./pc-map-ci-9fcd95443b2c.json.gz',import.meta.url));
assert.equal(hash(bytes),'9fcd95443b2ca22a054032aa2073b9433792933dd82310f43e2ebf1cd68d463d','complete pc/map outer join');
export const pcMapPacket=JSON.parse(gunzipSync(bytes));
const freeze=v=>{if(v&&typeof v==='object'&&!Object.isFrozen(v)){Object.values(v).forEach(freeze);Object.freeze(v);}return v;};
assert.equal(pcMapPacket.head,'5fe72de406f42ebbf406ac386d4c03a3a903373b');
assert.equal(pcMapPacket.base,'33d71575c5f186a1b54f7bf3e4f1826c145aa1d9');
assert.deepEqual(Object.keys(pcMapPacket).sort(),['archives','base','currentTreeCommitted','files','head','inventories','normalization','schemaVersion','sources']);
assert.equal(pcMapPacket.schemaVersion,1);assert.equal(pcMapPacket.normalization,'LF');assert.equal(pcMapPacket.currentTreeCommitted,false);
const originals=[releasePcCiPacket,releaseMergeCiPacket,releaseSelectionMapCiPacket];
const expectedPaths=[...new Set([...originals.flatMap(p=>Object.keys(p.files)),
 'tests/helpers/release-pc-ci-source.mjs','tests/helpers/release-bootstrap-merge-ci-source.mjs','tests/helpers/release-selection-map-ci-source.mjs',
 'tests/helpers/pc-map-legacy-domains.mjs','tests/helpers/pc-map-merged-view.json','tests/release-pc-map-integration.test.mjs',
 'tests/release-pc-source.test.mjs','tests/release-selection-map-source.test.mjs'])].sort();
assert.deepEqual(Object.keys(pcMapPacket.files).sort(),expectedPaths,'complete outer join source domain');
const archivePaths=[...new Set([...originals.flatMap(p=>Object.keys(p.immutableArchives)),
 'tests/helpers/release-pc-ci-source.json.gz','tests/helpers/release-pc-split-ci-source.json.gz','tests/helpers/release-bootstrap-merge-ci-source.json.gz','tests/helpers/release-selection-map-ci-source.json.gz'])].sort();
assert.deepEqual(Object.keys(pcMapPacket.archives).sort(),archivePaths,'complete outer join archive domain');
for(const original of originals)for(const [path,id]of Object.entries(original.immutableArchives))assert.equal(pcMapPacket.archives[path],id,'unchanged original archive identity: '+path);
assert.deepEqual(pcMapPacket.inventories.pc,releasePcCiPacket.currentInventory);
assert.deepEqual(pcMapPacket.inventories.selection,releaseSelectionMapCiPacket.currentInventory);
for(const kind of ['js','lua'])assert.deepEqual(pcMapPacket.inventories.joint[kind],[...new Set([
 ...releasePcCiPacket.currentInventory[kind],...releaseSelectionMapCiPacket.currentInventory[kind],...(kind==='js'?['tests/release-pc-map-integration.test.mjs']:[])])].sort());
for(const [id,source]of Object.entries(pcMapPacket.sources))assert.equal(hash(source),id,'complete immutable standalone source atom');
for(const row of Object.values(pcMapPacket.files)){
 assert.deepEqual(Object.keys(row).sort(),['current','views']);assert.match(row.current,/^[a-f0-9]{64}$/);
 assert.deepEqual(Object.keys(row.views).sort(),['pc','selection']);
 for(const id of Object.values(row.views))assert(id===null||Object.hasOwn(pcMapPacket.sources,id),'complete standalone source reference');
}
freeze(pcMapPacket);
// Exact B9 continuation over the complete PC/map and card-contact parent views.
// This private leaf adds no producer, tracker, unchecked public reader or authorization cache.
const b9Bytes=norm(readFileSync(new URL('./release-card-contact-integration.json',import.meta.url),'utf8'));
assert.equal(hash(b9Bytes),'374e9f3ab0117d08ec202c406d9be466f7f94644b86daf8a3095a3e3a298c171');
const b9Parent=JSON.parse(b9Bytes);
const b9JoinBytes=readFileSync(new URL('./pc-b9-ci-source.json.gz',import.meta.url));
assert.equal(hash(b9JoinBytes),'58c183274762f9653a31811fcccb28bc929498cca67a01c6308f8ecc04281680','complete PC B9 continuation');
export const pcB9Packet=freeze(JSON.parse(gunzipSync(b9JoinBytes)));
assert.deepEqual(pcB9Packet.parents,['10d7ef9658872ec7d118b585fbc81e3da585c552','b9bca884ed9b9831965b409885d78f719b9a567a']);
assert.equal(pcB9Packet.schemaVersion,1);assert.equal(pcB9Packet.normalization,'LF');
for(const [path,row]of Object.entries(pcB9Packet.files))for(const binding of Object.values(row.before).filter(Boolean)){
 assert.equal(hash(binding.source),binding.sha256,path+' complete PC/B9 predecessor');
 assert.equal(createHash('sha1').update(`blob ${Buffer.byteLength(binding.source)}\0`).update(binding.source).digest('hex'),binding.gitBlob,path);
}
function pcB9Before(path,source,side){
 assert(['pc','b9'].includes(side),'known PC B9 parent domain');
 if(path.startsWith('src/')||path==='config/architecture.json')return source;
 const row=Object.hasOwn(pcB9Packet.files,path)?pcB9Packet.files[path]:null,before=row?.before[side];
 if(!before||typeof source!=='string'||source.includes('\r\r\n')||hash(norm(source))!==row.currentSha256||before.sha256===row.currentSha256)return source;
 return before.source;
}
export function assertPcB9Current(read=readFileSync){
 const packet=read('tests/helpers/pc-b9-ci-source.json.gz');
 assert(Buffer.isBuffer(packet),'fresh complete integration source: PC B9 packet tests/helpers/pc-b9-ci-source.json.gz');
 assert.equal(hash(packet),hash(b9JoinBytes),'fresh complete integration source: PC B9 packet tests/helpers/pc-b9-ci-source.json.gz');
 for(const [path,row]of Object.entries(pcB9Packet.files)){
  const source=read(path,'utf8');assert.equal(typeof source,'string','fresh complete integration source: PC B9 '+path);
  assert(!source.includes('\r\r\n'),'fresh complete integration source: PC B9 '+path);
  assert.equal(hash(norm(source)),row.currentSha256,'fresh complete integration source: PC B9 '+path);
 }
 for(const [path,sha]of Object.entries(pcB9Packet.archives))assert.equal(hash(read(path)),sha,'immutable pc/map predecessor / retained complete immutable Release join predecessor: '+path);
 for(const path of sourceEpoch.proof.owners){
  const source=read(path,'utf8');assert.equal(typeof source,'string','linked owner identity: '+path);
  assert.equal(hash(norm(source)),sourceEpoch.proof.current[path].sha256,'linked owner identity: '+path);
 }
}
export function pcB9Source(path,source,side='pc',read=readFileSync){
 const before=pcB9Before(path,source,side);if(before!==source)assertPcB9Current(read);return before;
}
export function pcB9Read(side='pc',read=readFileSync){
 assert(['pc','b9'].includes(side),'known PC B9 parent domain');
 return(path,encoding)=>{
 const raw=read(path,encoding);if(typeof raw==='string')return pcB9Source(path,raw,side,read);
 if(encoding||!Buffer.isBuffer(raw)||!Object.hasOwn(pcB9Packet.files,path))return raw;
 const text=raw.toString('utf8'),before=pcB9Source(path,text,side,read);return before===text?raw:Buffer.from(before);
};}
export function pcB9ProductionRead(side='pc',read=readFileSync){
 assert(['pc','b9'].includes(side),'known PC B9 parent domain');
 const ci=pcB9Read(side,read);return(path,encoding)=>{
  if(!path.startsWith('src/')&&path!=='config/architecture.json')return ci(path,encoding);
  const raw=read(path,encoding);if(typeof raw!=='string')return raw;
  const before=sourceEpoch.preCombinedSource(path,raw,{target:side==='pc'?'releasePcMapReviewed':'releaseCardContactReviewed',readSource:p=>read(p,'utf8')});
  if(before!==raw)assertPcB9Current(read);return before;
 };
}
export function pcB9PriorInventory(paths,side='pc',kind='js',read=readFileSync){
 assert(['pc','b9'].includes(side));assert(['js','lua'].includes(kind));
 const current=pcB9Packet.inventory[kind],prior=side==='pc'?pcMapPacket.inventories.joint[kind]:pcB9Packet.priorB9Inventory[kind];
 const added=current.filter(p=>!prior.includes(p)),sorted=[...paths].sort();
 if(!added.some(p=>paths.includes(p)))return [...paths];
 assert.deepEqual(sorted,current,'complete PC B9 raw inventory');assertPcB9Current(read);return [...prior];
}

export function pcMapSource(path,source,side='pc',read=readFileSync){
 source=pcB9Source(path,source,'pc',read);
 assert(['pc','selection'].includes(side),'known pc/map standalone view');
 if(path.startsWith('src/')||path==='config/architecture.json')return source;
 const row=Object.hasOwn(pcMapPacket.files,path)?pcMapPacket.files[path]:null;
 if(!row||typeof source!=='string'||source.includes('\r\r\n')||hash(norm(source))!==row.current)return source;
 const id=row.views[side];return id===null?source:pcMapPacket.sources[id];
}
export function pcMapRead(side='pc',read=readFileSync){return(path,encoding)=>{
 const raw=read(path,encoding);return typeof raw==='string'?pcMapSource(path,raw,side,read):raw;
};}
export function pcMapProductionRead(side='pc',read=readFileSync){
 assert(['pc','selection'].includes(side),'known PC/map standalone production view');
 const ci=pcMapRead(side,read);
 return(path,encoding)=>{
  if(!path.startsWith('src/')&&path!=='config/architecture.json')return ci(path,encoding);
  const raw=read(path,encoding);if(typeof raw!=='string')return raw;
  return sourceEpoch.preCombinedSource(path,raw,{target:side==='pc'?'releasePcReviewed':'releaseSelectionMapReviewed',readSource:p=>read(p,'utf8')});
 };
}
// One synchronous validator invocation owns this reader. A new reader is made
// for every public call; authorization is never shared between calls or runs.
export function pcValidationRead(read=readFileSync){
 const ci=pcMapRead('pc',read);let ownersChecked=false;
 return(path,encoding)=>{
  if(!path.startsWith('src/')&&path!=='config/architecture.json')return ci(path,encoding);
  const raw=read(path,encoding);if(typeof raw!=='string')return raw;
  const p=sourceEpoch.proof,input='src/lua/abyss_game_ui_input.lua';
  if(!ownersChecked){
   const current=read(input,'utf8');assert.equal(typeof current,'string','linked owner identity: '+input);
   assert.equal(hash(norm(current)),p.current[input].sha256,'linked owner identity: '+input);
   sourceEpoch.preCombinedSource(input,current,{target:'releasePcReviewed',readSource:p=>read(p,'utf8')});
   ownersChecked=true;
  }
  const row=p.current[path];
  return row&&hash(norm(raw))===row.sha256?p.targets.releasePcReviewed.files[path]?.source??raw:raw;
 };
}
export function pcMapPriorInventory(paths,side='pc',kind='js',read=readFileSync){
 paths=pcB9PriorInventory(paths,'pc',kind,read);
 assert(['pc','selection'].includes(side));assert(['js','lua'].includes(kind));
 const sorted=[...paths].sort(),current=pcMapPacket.inventories.joint[kind],prior=pcMapPacket.inventories[side][kind];
 if(JSON.stringify(sorted)===JSON.stringify(prior))return [...paths];
 const added=current.filter(p=>!prior.includes(p));
 if(!added.some(p=>paths.includes(p)))return [...paths];
 assert.deepEqual(sorted,current,'complete pc/map raw inventory');return [...prior];
}
export function assertPcMapRawInventory(paths,kind='js'){
 assert(['js','lua'].includes(kind));assert.deepEqual([...paths].sort(),pcMapPacket.inventories.joint[kind],'complete pc/map raw inventory');
}
export function assertPcMapCurrent(read=readFileSync){
 assertPcB9Current(read);
 for(const [path,row]of Object.entries(pcMapPacket.files)){
  const s=pcB9Before(path,read(path,'utf8'),'pc');assert.equal(typeof s,'string','fresh pc/map source: '+path);
  assert.equal(hash(norm(s)),row.current,'fresh complete integration source: pc/map '+path);
 }
 for(const [path,id]of Object.entries(pcMapPacket.archives))assert.equal(hash(read(path)),id,'immutable pc/map predecessor: '+path);
}
export function pcDomainSource(path,source,target,read=readFileSync){
 const current=pcMapSource(path,source,'pc',read);
 if(path.startsWith('src/')||path==='config/architecture.json')return source;
 const row=Object.hasOwn(releaseMergeCiPacket.files,path)?releaseMergeCiPacket.files[path]:null;
 if(row?.[target]&&typeof current==='string'&&!current.includes('\r\r\n')&&hash(norm(current))===row.current.sha256)
  assertPcMapCurrent(read);
 return oldMergeSource(path,current,target,pcValidationRead(read));
}
export function pcDomainRead(target,read=readFileSync){return(path,encoding)=>{
 const raw=read(path,encoding);
 if(typeof raw==='string')return pcDomainSource(path,raw,target,read);
 if(encoding||!Buffer.isBuffer(raw)||!Object.hasOwn(releaseMergeCiPacket.files,path))return raw;
 const text=raw.toString('utf8'),prior=pcDomainSource(path,text,target,read);
 return prior===text?raw:Buffer.from(prior);
};}
export function assertPcDomainCurrent(read=readFileSync){
 assertPcMapCurrent(read);oldMergeCurrent(pcValidationRead(read));
}
export {pcMapRead as integrationRead,pcMapSource as integrationCiSource,pcMapProductionRead as integrationProductionRead,pcMapPriorInventory as integrationPriorInventory};
export function integrationInventory(kind='js'){assert(['js','lua'].includes(kind));return [...pcMapPacket.inventories.joint[kind]];}
