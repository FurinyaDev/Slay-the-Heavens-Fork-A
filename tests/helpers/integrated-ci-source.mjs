import {beforeCoopJsInventory,beforeShopEntryInventory,beforePreflightSource,preflightPriorRead} from './fork-preflight-source.mjs';
// Explicit immutable source views for the reviewed integration inputs.
// Production projectors never import this CI-only archive.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {integratedCiBytes} from './integrated-ci-binding.mjs';
import {releaseBootstrapCiSource,releaseBootstrapCiCheckedSource,assertReleaseBootstrapCiCurrent} from './release-bootstrap-ci-source.mjs';
import {exactSourceMatches} from './source-fingerprint.mjs';
const hash=s=>createHash('sha256').update(s).digest('hex'),norm=s=>s.replaceAll('\r\n','\n');
const freeze=v=>{if(v&&typeof v==='object'&&!Object.isFrozen(v)){Object.values(v).forEach(freeze);Object.freeze(v);}return v;};
export const integratedCiProof=freeze(JSON.parse(gunzipSync(integratedCiBytes)));
assert.equal(integratedCiProof.schemaVersion,1);
assert.deepEqual(integratedCiProof.sources,{native:'97af2fed6db0d8c77ea29165ec6395bfb55e2161',closeout:'fdb91c7e30688f593728bde26db0e4d6f614d933',sts:'afd8834b1e7f613b7d68c7a4b6d68ca196f37064',menu:'ec0d0b990bb4baa7d45413101599ef3030f33892',selection:'f0581b708a62378fa838233139d2efef1db7ed8b',release:'900527d931df941eed642a9667ccde92f76b73db'});
for(const [path,row]of Object.entries(integratedCiProof.files))for(const binding of [row.current,...Object.values(row.views)].filter(Boolean)){
 assert.equal(binding.source,norm(binding.source));assert.equal(hash(binding.source),binding.sha256,path+' complete source');
 assert.equal(createHash('sha1').update(`blob ${Buffer.byteLength(binding.source)}\0`).update(binding.source).digest('hex'),binding.gitBlob);
}
// These live fixtures include release backflows for event art, menu guidance,
// and approved text. The sealed integration receipt keeps its original source.
const luaFixtureSuccessors=Object.freeze({
 'tests/lua/lowcost_art.lua':{
  sha256:'e8f5c000ae62bb8997c5abf996ed64320cf8a916d0973d37645da19e44ebdf35',gitBlob:'de401a3a1fad9faaa8a71cfaabf02ce850ff6347',
 },
 'tests/lua/session_menu_choices.lua':{
  sha256:'704f77d7a3a9efd5feffd3659cd2b6d1416d13e5c177bc4c06c89212a24bcaf9',gitBlob:'474b88996f4b6469a5b6dad660b2b6240aba63bb',
 },
 'tests/lua/session_menu_navigation.lua':{
  sha256:'15e495490244a447d8f9311bce88f03dc3ed30f6282ec108a5b4a4421b88624d',gitBlob:'53a04c8d5e53b4a62c789bc083e385b41bb04255',
 },
});
const integratedEvidenceSuccessors=Object.freeze({
 'CHANGELOG.md':{
  sha256:'8df706839da1f445aae118f5483af85c68a910e6b279c5207534e604d651513b',gitBlob:'41409da7947a7b3b688810473e94a64b72367081',
 },
 // #940, #942 and #951 update the live architecture with approved owners.
 'config/architecture.json':{
  sha256:'7149b7878a8258a6de4b23d95742dc3c4e31d38bf558f80a35efe51aac401e00',gitBlob:'4aa8367e9d694587c9b58202185524fe3376640a',
 },
 // #951 synchronizes the existing low-cost enemy art IDs.
 'data/presentation/lowcost-enemy-art.json':{
  sha256:'ea93d485c6aa0a5db2e0565a6f123fbc7d83a1aad9bc0ee4393ce92c4679a133',gitBlob:'60d4f24c7c83757009146771ead479246c75086b',
 },
 // #822 and #951 update the approved relic icon and IDs.
 'data/presentation/lowcost-relic-art.json':{
  sha256:'11656534ea60482edbdce97c0cd1298ea0f43410f74264c1eae4893e16b33dd0',gitBlob:'501272bd18fbd6054d8f5cefcf93fb9fb7867125',
 },
 // #938, #940, #942, #951 and #984 update the approved live theme after #912.
 'data/presentation/ui_theme.json':{
  sha256:'72cae11890ce1a018fa145152188cd6ff6779f899db201f9d3799171db7abb4e',gitBlob:'2d5262e17653444c27bba75679748ccc06ea1d09',
 },
 // #951 adds release-text checks to the active syntax and platform scripts.
 'package.json':{
  sha256:'ba29a08fc203195bba8c9acd047274167f2de046f8a29e54a681f72faa314e77',gitBlob:'8b3f35c25c42aa7276a5ab334ae7112fe9dbe01b',
 },
});
export function assertIntegratedLuaFixturesCurrent(read){
 for(const [path,binding] of Object.entries(luaFixtureSuccessors))
  assert(exactSourceMatches(read(path,'utf8'),binding),'fresh current integrated Lua fixture source: '+path);
}
function beforeIntegrationEvidence(path,source){
 const binding=Object.hasOwn(integratedEvidenceSuccessors,path)?integratedEvidenceSuccessors[path]
  :Object.hasOwn(luaFixtureSuccessors,path)?luaFixtureSuccessors[path]:undefined;
 if(!binding||!exactSourceMatches(source,binding))return source;
 const prior=integratedCiProof.files[path].current.source;
 return source.includes('\r\n')?prior.replaceAll('\n','\r\n'):prior;
}
export function integratedSource(path,source,target){
 source=beforePreflightSource(path,source);
 assert(Object.hasOwn(integratedCiProof.sources,target),'known integration input');
 if(path.startsWith('src/')||path==='config/architecture.json')return source;
 const row=Object.hasOwn(integratedCiProof.files,path)?integratedCiProof.files[path]:null;
 source=releaseBootstrapCiSource(path,beforeIntegrationEvidence(path,source),row?.current);
 if(!row?.views[target]||typeof source!=='string'||source.includes('\r\r\n')||hash(norm(source))!==row.current.sha256)return source;
 if(row.views[target].sha256===row.current.sha256)return source;
 return row.views[target].source;
}
export function integratedRead(target,{read=readFileSync}={}){read=preflightPriorRead(read);return(path,encoding)=>{
 const raw=read(path,encoding);
 const binary=Object.hasOwn(integratedCiProof.binaryViews,path)?integratedCiProof.binaryViews[path]:null;
 if(Buffer.isBuffer(raw)&&binary?.views[target]&&hash(raw)===binary.current){
  const saved=binary.views[target],bytes=read(saved.path);assert.equal(hash(bytes),saved.sha256,'complete immutable integration binary predecessor');return bytes;
 }
 const text=typeof raw==='string'?raw:raw.toString('utf8'),prior=integratedSource(path,text,target);
 return typeof raw==='string'?prior:prior===text?raw:Buffer.from(prior);
};}
export function assertIntegratedCurrent(read=readFileSync){
 assertReleaseBootstrapCiCurrent(read);
 const rawRead=read;
 read=preflightPriorRead(rawRead);
 for(const [path,row]of Object.entries(integratedCiProof.files)){
  const binding=integratedEvidenceSuccessors[path];
  const source=binding?rawRead(path,'utf8'):read(path,'utf8');
  if(binding)assert(exactSourceMatches(source,binding),'fresh complete integration source: '+path);
  const prior=releaseBootstrapCiCheckedSource(path,beforeIntegrationEvidence(path,source),row.current);
  assert.equal(hash(norm(prior)),row.current.sha256,'fresh complete integration source: '+path);
 }
 for(const [path,row]of Object.entries(integratedCiProof.closure))assert.equal(hash(path.endsWith('.gz')?read(path):norm(releaseBootstrapCiSource(path,read(path,'utf8'),integratedCiProof.files[path]?.current))),row.after,'fresh integration copy owner: '+path);
}
export function extendIntegratedHelperClosure(original){
 const current={...original},patch=integratedCiProof.closure;
 assert.deepEqual(Object.keys(patch).sort(),['tests/helpers/closeout-source-epoch.mjs','tests/helpers/combined-epoch/source-epoch-runtime.mjs','tests/helpers/menu-presentation-source.json.gz','tests/helpers/menu-red-production-source.json.gz','tests/helpers/menu-red-source-epoch.mjs','tests/helpers/release-source-epoch.json.gz','tests/helpers/release-source-epoch.mjs','tests/helpers/session-menu-source-epoch.json.gz','tests/helpers/session-menu-source-epoch.mjs']);
 for(const [path,row]of Object.entries(patch)){assert.equal(row.before,original[path]??null,'exact integration copy predecessor: '+path);assert.match(row.after,/^[a-f0-9]{64}$/);current[path]=row.after;}
 return freeze(current);
}
// These approved test revisions remain executable in the raw Full inventory.
// Their exact identities authorize only the historical inventory comparison.
const jsInventorySuccessors=Object.freeze({
 'tests/deck-browser-reveal-reuse.test.mjs':{
  sha256:'f9f446f381fff3b96527f9047fc9e175287dae6dcdd30c1cf3f63bf79283758b',
  gitBlob:'f84703488081cc2c4106aeb17c1a75a52ef3a3d8',
 },
 'tests/official-choice-pagination.test.mjs':{
  sha256:'2f8794a5d9f7e7c87578672afd0069929947e0de5217f8e805ee1b43c93ba321',
  gitBlob:'7519d2b322d91c39387a244e14a2dc7b220eb39d',
 },
 'tests/sts-card-reference-runtime.test.mjs':{
  sha256:'b72ccb3d21a095000282b340d873e6b3b65224c758c13e2e21f7b3f98569080e',
  gitBlob:'75cac3711224bdf9f4622efd0cefe24b26ea0c98',
 },
 'tests/sts-character-browser.test.mjs':{
  sha256:'a8c371980710a7824aff8328cf5c041b06b1199eea548cb4e51b17668a7d40dc',
  gitBlob:'be5b6ad2bc339cfc227818355a4505b94f88ddf9',
 },
 'tests/sts-page-reveal.test.mjs':{
  sha256:'aad08a2635e39b294b0b756feabbd878d3a1708fc636a607d60393cfc6e04456',
  gitBlob:'7dcb8cedafdd5ca8b9a58f57662c2c5940422bd2',
 },
});
// Exact complete inventories for historical receipts; raw Full discovery remains live.
export function integratedPriorInventory(paths,target,kind='js',read=readFileSync){
 const current=kind==='js'?integratedCiProof.inventory:integratedCiProof.luaInventory;
 const prior=integratedCiProof.inventories[target]?.[kind];
 assert(prior,'known integration inventory');
 if(kind==='js')paths=beforeCoopJsInventory(paths,current,read);
 else paths=beforeShopEntryInventory(paths,kind,read);
 // New standalone reviewed views consume raw discovery. Older chained views
 // retain their existing idempotent prior-inventory contract.
 if(target==='selection'||target==='release')assert.deepEqual([...paths].sort(),current,'complete reviewed raw '+kind+' inventory');
 if(JSON.stringify([...paths].sort())===JSON.stringify(prior))return [...paths];
 const added=current.filter(p=>!prior.includes(p));
 if(added.length===0){
  assert.deepEqual([...paths].sort(),current,'complete identical integration '+kind+' inventory');
  return [...prior];
 }
 if(!added.some(path=>paths.includes(path)))return [...paths];
 assert.deepEqual([...paths].sort(),current,kind==='lua'?'complete integration Lua discovery inventory':'complete integration js inventory');
 for(const path of added){
  const row=integratedCiProof.files[path];assert(row,'complete added inventory source: '+path);
  const source=read(path,'utf8');
  if(Object.hasOwn(jsInventorySuccessors,path)&&exactSourceMatches(source,jsInventorySuccessors[path]))continue;
  const preflight=beforePreflightSource(path,source);
  assert.equal(hash(norm(releaseBootstrapCiSource(path,beforeIntegrationEvidence(path,preflight),row.current))),row.current.sha256,'fresh added inventory source: '+path);
 }
 return [...prior];
}
export function renderIntegratedCiBinding(sha){
 assert.match(sha,/^[a-f0-9]{64}$/);
 return `// Fixed trust leaf; excluded from its own archive.\nimport assert from 'node:assert/strict';\nimport {readFileSync} from 'node:fs';\nimport {createHash} from 'node:crypto';\nexport const integratedCiBytes=readFileSync(new URL('./integrated-ci-source.json.gz',import.meta.url));\nassert.equal(createHash('sha256').update(integratedCiBytes).digest('hex'),${JSON.stringify(sha)},'complete reviewed integration CI sources');\n`;
}
