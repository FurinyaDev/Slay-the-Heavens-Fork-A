import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {
 lifecycleHash,relicLifecycleArchiveSha256,relicLifecycleGeneratedBindings,relicLifecycleGroups,
 relicLifecycleRevision,runRelicLifecycle,
} from './relic-lifecycle-baseline.mjs';

// The frozen VM can load only the authenticated Lua corpus and generated
// modules. Include the executable JS and every file entered with dofile too.
const replayFiles=[
 'package-lock.json',
 'scripts/build-lua-data.mjs',
 'scripts/build-native-candidate.mjs',
 'tests/helpers/lua-graph-observer.mjs',
 'tests/helpers/relic-lifecycle-baseline.mjs',
 'tests/helpers/relic-lifecycle-baseline-vm.mjs',
 'tests/helpers/relic-lifecycle-baseline-fixtures.lua',
 'tests/helpers/relic-lifecycle-baseline-support.lua',
 'tests/lua/common_relic_equipment.lua',
 'tests/lua/rare_relics_hooks.lua',
 'tests/lua/relic_query_contract.lua',
 ...relicLifecycleGroups.map(group=>`tests/lua/relic_lifecycle_${group}.lua`),
];

export function relicLifecycleReplayInput(generated,read=path=>readFileSync(path,'utf8')){
 const sourceHashes=replayFiles.map(path=>[path,lifecycleHash(read(path).replaceAll('\r\n','\n'))]);
 const generatedHashes=Object.keys(generated).sort().map(name=>{
  const {path,sha256}=generated[name];
  return [name,path,sha256];
 });
 return lifecycleHash(JSON.stringify({
  nodeVersion:process.versions.node,frozenArchive:relicLifecycleArchiveSha256,sourceHashes,generatedHashes,
 }));
}

export function lifecycleGeneratedIdentities(generated=relicLifecycleGeneratedBindings()){
 return Object.fromEntries(Object.entries(generated).map(([name,{path,sha256}])=>[name,{path,sha256}]));
}

export function verifyLifecycleTrace(result,group){
 const {checkpoints,traceBytes,traceSha256,registeredCases,executedCases,coverage}=result.manifest;
 assert.equal(result.status,0,`${group}: ${result.stdout}${result.stderr}`);
 assert.match(result.stdout,new RegExp(`RELIC_LIFECYCLE_PASS ${group} checkpoints=`));
 assert(checkpoints>0,'explicit trace must contain actual full checkpoints');
 assert.equal(lifecycleHash(result.graph),traceSha256,'read-back complete graph hash');
 assert.equal(Buffer.byteLength(result.graph),traceBytes,'complete graph byte count');
 const records=result.graph.trim().split('\n');
 assert.equal(records.length,checkpoints,'complete recorded checkpoint count');
 let hasTable=false;
 for(const line of records){
  const record=JSON.parse(line);
  hasTable||=record.graph.definitions.some(definition=>definition[0]==='table');
 }
 assert(hasTable,'actual table graph definitions');
 return lifecycleHash(JSON.stringify({
  checkpoints,traceBytes,traceSha256,registeredCases,executedCases,
  coverage:Object.entries(coverage).sort(),stdout:result.stdout,
 }));
}

export function verifyFrozenLifecycle(result,generated){
 const {manifest}=result;
 assert.equal(manifest.frozenRevision,relicLifecycleRevision);
 assert.equal(manifest.frozenArchiveSha256,relicLifecycleArchiveSha256);
 assert.equal(manifest.preloadedSources,329);
 assert(manifest.loadedFrozen.includes('abyss_run'));
 assert.deepEqual(manifest.generatedBindings,generated,'identical generated source input hashes');
}

// #951 changes these identities but retains the lifecycle operations. #940
// drops the trailing period from the fully formatted block description.
const releasedNames=new Map([
 ['噬咬','迅袭'],['激素','元素增幅'],['daggerSacrifice','daggerExpenditure'],
 ['gamblingActivated','tacticalBadgeActivated'],['rareGamblingChip','rareTacticalBadge'],
 ['gambling_chip','tactical_badge'],['Gambling Chip','Tactical Badge'],
 ['calculated_gamble','calculated_exchange'],['Calculated Gamble','Calculated Exchange'],
 ['calculatedGamble','calculatedExchange'],['Cultist','Raven Adept'],
 ['Blue Slaver','Blue Guard'],['Red Slaver','Red Guard'],
 ['MutagenicStrength','AugmentationCore'],['mutagenic_strength','augmentation_core'],
 ['CultistMask','RavenMask'],['cultist_mask','raven_mask'],
 ['获得13点格挡。本回合保留所有非虚无手牌。','获得13点格挡。本回合保留所有非虚无手牌'],
]);

function compareNamedTokens(current,frozen,tokens,context){
 if(current===frozen)return;
 let oldOffset=0,newOffset=0;
 for(const token of tokens){
  const [base,literal]=token,replacement=releasedNames.get(JSON.parse(literal));
  if(replacement===undefined)continue;
  const prefix=frozen.slice(oldOffset,token.index);
  assert.ok(current.startsWith(prefix,newOffset),context+' graph or output before '+literal);
  newOffset+=prefix.length;
  const approved=base.replace(literal,()=>JSON.stringify(replacement));
  if(current.startsWith(base,newOffset))newOffset+=base.length;
  else{
   assert.ok(current.startsWith(approved,newOffset),context+' exact released spelling of '+literal);
   newOffset+=approved.length;
  }
  oldOffset=token.index+base.length;
 }
 assert.ok(current.slice(newOffset)===frozen.slice(oldOffset),context+' complete graph or output suffix');
}

// #919 adds a private copy of the relic list to the enemy intent preview.
// The parasite witness has exactly one observed preview with an empty list.
// Validate its added edge and node before aligning the later allocation IDs.
function beforeEmptyPreviewRelics(lines,frozen){
 const rows=lines.map(line=>line?JSON.parse(line):null);
 const table=(graph,value)=>{
  assert.equal(value?.[0],'table','expected preview graph table');
  const node=graph.definitions.find(row=>row[0]==='table'&&row[1]===value[1]);
  assert(node,'expected defined preview graph table');
  return node;
 };
 const value=(node,kind,key)=>node[2].find(entry=>entry[0][0]===kind&&entry[0][1]===key)?.[1];
 const args=({graph})=>table(graph,value(table(graph,graph.root),'string','args'));
 const changes=[];
 for(const [index,row]of rows.entries()){
  if(row?.label!=='rare.blockPower:enter')continue;
  const currentArgs=args(row);
  if(value(currentArgs,'number','3')?.join('\0')!=='string\0weak')continue;
  const historical=JSON.parse(frozen[index]);
  assert.equal(historical.label,row.label,'expected original preview checkpoint');
  const owner=table(row.graph,value(currentArgs,'number','1'));
  const previous=table(historical.graph,value(args(historical),'number','1'));
  assert.equal(value(previous,'string','relics'),undefined,'the original preview has no copied relics');
  const relics=value(owner,'string','relics');
  const added=table(row.graph,relics);
  assert.deepEqual(added,['table',relics[1],[],null],'exact copied empty preview relic list');
  assert.equal(owner[1],previous[1],'same preview owner before the added allocation');
  changes.push({index,owner,added});
 }
 assert.equal(changes.length,1,'one new empty relic list in the read-only preview');
 const [{index,owner,added}]=changes,removed=added[1];
 owner[2]=owner[2].filter(entry=>entry[0][0]!=='string'||entry[0][1]!=='relics');
 rows[index].graph.definitions=rows[index].graph.definitions.filter(node=>node!==added);
 const references=new Set(['table','function','userdata','thread','nativeControl']);
 function shift(node){
  if(!Array.isArray(node))return;
  if(references.has(node[0])){
   assert.notEqual(node[1],removed,'private preview relic list has exactly one observed edge');
   if(node[1]>removed)node[1]--;
  }
  for(const value of node)shift(value);
 }
 for(const row of rows.slice(index)){
  if(row){shift(row.graph.root);shift(row.graph.definitions);}
 }
 return rows.map(row=>row?JSON.stringify(row):'');
}

export function compareReleasedLifecycleTraces(after,before,group){
 for(const key of ['checkpoints','coverage']){
  assert.deepEqual(after.manifest[key],before.manifest[key],`${group}: exact ${key}`);
 }
 for(const key of ['registeredCases','executedCases']){
  const expected=before.manifest[key].map(name=>name==='rare.chooseGambling nil/function restore'
   ?'rare.chooseTacticalExchange nil/function restore':name);
  assert.deepEqual(after.manifest[key],expected,`${group}: exact ${key}`);
 }
 const raw=after.graph.split('\n'),frozen=before.graph.split('\n');
 const current=group==='parasite_09'?beforeEmptyPreviewRelics(raw,frozen):raw;
 assert.equal(current.length,frozen.length,`${group}: every graph checkpoint`);
 for(let i=0;i<frozen.length;i++){
  const line=frozen[i].replace(/^(\{"label":"ordinary (?:replacement|nil) rare\.)chooseGambling"/u,'$1chooseTacticalExchange"');
  compareNamedTokens(current[i],line,line.matchAll(/\["string",("(?:[^"\\]|\\.)*")\]/gu),`${group} checkpoint ${i+1}`);
 }
 const afterOutput=after.stdout.split('\n'),beforeOutput=before.stdout.split('\n');
 assert.equal(afterOutput.length,beforeOutput.length,`${group}: every output line`);
 for(let i=0;i<beforeOutput.length;i++){
  const line=beforeOutput[i];
  if(line.startsWith('RELIC_QUERY_ALIAS ')){
   compareNamedTokens(afterOutput[i],line,line.matchAll(/("(?:[^"\\]|\\.)*")/gu),`${group} output ${i+1}`);
  }else assert.equal(afterOutput[i],line,`${group}: exact output ${i+1}`);
 }
}

// Reproduce the reference from full frozen VMs in a built checkout. CI uses
// the real replay whenever an input changes or RELIC_LIFECYCLE_REPLAY=1 is set.
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 const generated=lifecycleGeneratedIdentities(),groups={};
 for(const group of relicLifecycleGroups){
  const result=runRelicLifecycle(group,{frozen:true});
  groups[group]=verifyLifecycleTrace(result,group);
  verifyFrozenLifecycle(result,generated);
 }
 console.log(JSON.stringify({schemaVersion:1,replayInput:relicLifecycleReplayInput(generated),groups},null,2));
}
