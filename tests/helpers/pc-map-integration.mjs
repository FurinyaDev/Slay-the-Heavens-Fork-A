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
export function pcMapSource(path,source,side='pc'){
 assert(['pc','selection'].includes(side),'known pc/map standalone view');
 if(path.startsWith('src/')||path==='config/architecture.json')return source;
 const row=Object.hasOwn(pcMapPacket.files,path)?pcMapPacket.files[path]:null;
 if(!row||typeof source!=='string'||source.includes('\r\r\n')||hash(norm(source))!==row.current)return source;
 const id=row.views[side];return id===null?source:pcMapPacket.sources[id];
}
export function pcMapRead(side='pc',read=readFileSync){return(path,encoding)=>{
 const raw=read(path,encoding);return typeof raw==='string'?pcMapSource(path,raw,side):raw;
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
export function pcMapPriorInventory(paths,side='pc',kind='js'){
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
 for(const [path,row]of Object.entries(pcMapPacket.files)){
  const s=read(path,'utf8');assert.equal(typeof s,'string','fresh pc/map source: '+path);
  assert.equal(hash(norm(s)),row.current,'fresh complete integration source: pc/map '+path);
 }
 for(const [path,id]of Object.entries(pcMapPacket.archives))assert.equal(hash(read(path)),id,'immutable pc/map predecessor: '+path);
}
export function pcDomainSource(path,source,target,read=readFileSync){
 const current=pcMapSource(path,source,'pc');
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
