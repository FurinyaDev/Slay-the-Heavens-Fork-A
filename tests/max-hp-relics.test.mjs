import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdirSync,mkdtempSync,readFileSync,rmSync,writeFileSync}from'node:fs';
import {tmpdir}from'node:os';
import {dirname,join}from'node:path';
import {createHash}from'node:crypto';
import {spawnSync}from'node:child_process';
import {javaShuffle,tiers}from'../tools/oracles/sts1_relic_queues.mjs';
import {buildLuaData}from'../scripts/build-lua-data.mjs';
import {runLua}from'../scripts/test-lua.mjs';
const json=p=>JSON.parse(readFileSync(p,'utf8'));
const readLf=p=>readFileSync(p,'utf8').replaceAll('\r\n','\n');
const sha=source=>createHash('sha256').update(source).digest('hex');
const oracle='tools/oracles/sts1_max_hp_relics.py';
const vectorBase='tests/fixtures/max-hp-relics-vectors';
const ironcladCatalog='data/catalogs/sts1-relic-queues.json';
const classCatalog='data/catalogs/sts1-class-relic-queues.json';
const currentCatalogHashes=new Map([
 [ironcladCatalog,'885091634415c830636361950213738c24e062c591b29b227c479ece625cef36'],
 [classCatalog,'60bfe3ac6381f8a3fbb6040ff99aaa1892d8de5fa4db309a99e376eb8bf7cb99'],
]);
const releasedNames=new Map([['Gambling Chip','Tactical Badge'],['SlaversCollar','ArenaCollar']]);
function beforeCatalogNames(path,source){
 if(!currentCatalogHashes.has(path))return source;
 assert.equal(sha(source),currentCatalogHashes.get(path),path+' exact released catalog');
 for(const [before,current]of releasedNames)source=source.replaceAll(JSON.stringify(current),JSON.stringify(before));
 return source;
}
function checkFrozenOracle(inputs){
 const directory=mkdtempSync(join(tmpdir(),'max-hp-relic-oracle-'));
 try{
  for(const [path,source]of inputs){
   const target=join(directory,path);
   mkdirSync(dirname(target),{recursive:true});
   writeFileSync(target,source);
  }
  return spawnSync('python',['-X','utf8',oracle,'--check'],{cwd:directory,encoding:'utf8',timeout:15000});
 }finally{rmSync(directory,{recursive:true,force:true});}
}
const lock=json('tests/fixtures/max-hp-relics-source.json');
const vectorJson=readLf(`${vectorBase}.json`);
assert.equal(sha(vectorJson),'6ebc2d04af04b05d779314d338679856241598437df39e45f9c512f441f679d9','complete frozen Max HP vector inputs');
const vectors=JSON.parse(vectorJson);
test('fixed-source max HP identities, rarity, truthful full catalogue and unaccepted platform/live records',()=>{
 assert.equal(lock.sourceCommit,'319009d5df0a82d9fb0f23cc22322286c6a87ec0');assert.equal(Object.keys(lock.files).length,9);
 const relics=json('data/relics.json').relics,inventory=json('data/release/launch-content.json');
 const catalog=json('docs/rules/evidence/sts1-relic-pool-catalog.json');
 for(const[id,fact]of Object.entries(lock.facts)){
  const definition=relics.find(d=>d.id===id);assert.equal(definition?.sourceId,fact.sourceId);assert.equal(definition.rarity,fact.rarity);
  assert.equal(definition.trigger,'hooks');assert.deepEqual(definition.effects,[]);
  const row=catalog.relics.find(d=>d.id===fact.sourceId);assert.equal(row.projectId,id);assert.equal(row.status,'existing-local-effect-not-full-pool-parity');
  if(id!=='strawberry'){
   const entry=inventory.relics.find(d=>d.id===id);assert.equal(entry?.profile,'maxHpRelics');
   assert.equal(inventory.profiles[entry.profile].live.status,'pending-natural-acquisition-and-execution');
   if(id==='lees_waffle')for(const catalog of [json('data/catalogs/sts1-relic-queues.json'),...Object.values(json('data/catalogs/sts1-class-relic-queues.json'))]){
    assert.ok(catalog.queues.shop.includes(fact.sourceId));for(const tier of ['common','uncommon','rare','boss'])assert.ok(!catalog.queues[tier].includes(fact.sourceId));
   }
  }
 }
});
test('independent source-method numeric and full-queue inputs reproduce without production imports',()=>{
 const generator=readLf(oracle),lua=readLf(`${vectorBase}.lua`);
 assert.equal(sha(generator),vectors.generatorSha256);
 assert.equal(sha(lua),vectors.luaSha256);
 const live=new Map(),original=new Map([[oracle,generator],[`${vectorBase}.lua`,lua],[`${vectorBase}.json`,vectorJson]]);
 for(const [path,hash]of Object.entries(vectors.inputs)){
  const source=readLf(path),prior=beforeCatalogNames(path,source);
  assert.equal(sha(prior),hash,path);
  live.set(path,source);
  original.set(path,prior);
 }
 const catalogs=inputs=>({ironclad:JSON.parse(inputs.get(ironcladCatalog)),...JSON.parse(inputs.get(classCatalog))});
 const historic=catalogs(original),current=catalogs(live);
 for(const row of vectors.cases.channels)for(const [i,tier]of tiers.entries()){
  const originalQueue=row.queues[tier],seed=row.rawLongHex[i];
  assert.deepEqual(javaShuffle(historic[row.character].queues[tier],seed),originalQueue);
  assert.deepEqual(javaShuffle(current[row.character].queues[tier],seed),originalQueue.map(id=>releasedNames.get(id)??id));
 }
 const result=checkFrozenOracle(original);
 assert.equal(result.status,0,result.stdout+result.stderr);assert.match(result.stdout,/160 health; 28 full source channel cases/);
});
// Preserve the complete health matrix while each independent fixture retains
// the runner's original 30-second deadline and full rollback snapshots.
for(const[fixture,marker]of [
 ['health','HEALTH_PASS 5'],
 ['health_invalid_strawberry_pear','HEALTH_INVALID_PASS 1'],
 ['health_invalid_mango_waffle','HEALTH_INVALID_PASS 1'],
 ['health_lifecycle','HEALTH_LIFECYCLE_PASS 4'],
 ['health_rollback','HEALTH_ROLLBACK_PASS 1'],
 ...['ironclad','silent','defect','watcher'].map(c=>[c,'CHANNELS_PASS '+c+' 7'])
]){
 test(`max HP relic source ${fixture}`,()=>{
  buildLuaData();const result=runLua(`tests/lua/max_hp_relics_${fixture}.lua`);
  assert.equal(result.status,0,result.stdout+result.stderr);assert.match(result.stdout,new RegExp('MAX_HP_RELICS_'+marker));
 });
}
