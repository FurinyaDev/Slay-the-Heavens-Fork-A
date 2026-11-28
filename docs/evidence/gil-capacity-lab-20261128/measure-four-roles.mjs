import {readFileSync, writeFileSync, readdirSync, mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve, join} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {gzipSync} from 'node:zlib';
import {execFileSync} from 'node:child_process';

const repo=resolve(process.argv[2]??process.cwd());
const withUi=process.argv.includes('--ui');
const withRuntime=process.argv.includes('--runtime');
const src=(...paths)=>join(repo,...paths);
const read=(...paths)=>readFileSync(src(...paths),'utf8');
const readJson=(...paths)=>JSON.parse(read(...paths));
const checked=execFileSync('git',['rev-parse','HEAD'],{cwd:repo,encoding:'utf8'}).trim();
const size=value=>({bytes:Buffer.byteLength(value),gzipBytes:gzipSync(value,{level:9}).length});
const mod=async file=>import(pathToFileURL(src('scripts',file)));
const {loadOriginalV4, originalV4ToLua}=await mod('build-original-v4.mjs');
const isHeavens=readdirSync(src('scripts')).includes('native-script-storage.mjs');
const storage=isHeavens?await mod('native-script-storage.mjs'):null;
const heading='-- Generated from frozen Original V4 JSON. Do not edit.\nreturn ';
const frozen=loadOriginalV4(src('data','original_v4'));
const dataName='abyss_original_v4_data';
const pack=value=>storage?storage.packNativeScript(dataName,value,'lossless-lua-v2'):value;
const originalBytes=heading+originalV4ToLua(frozen)+'\n';
const currentBytes=storage?storage.packNativeScript(dataName,originalBytes,storage.nativeScriptStorageProfile):originalBytes;
const roleProbeModules=new Map();
const selectRoles={HT:'hutao',AR:'arlecchino',FR:'furina',RD:'raiden'};
const prefixes=[[],['RD'],['RD','HT'],['RD','HT','AR'],['RD','HT','AR','FR']];
const inventory=prefixes.map(roles=>{
  const cards=frozen.cards.filter(card=>roles.includes(card.role));
  const selectedRules=structuredClone(frozen.rules);
  selectedRules.roles=Object.fromEntries(roles.map(role=>[role,frozen.rules.roles[role]]));
  const code=heading+originalV4ToLua({version:frozen.version,cards,rules:selectedRules})+'\n';
  if(roles.length===4 && code!==originalBytes)throw Error('full matrix serializer drift');
  const packed=pack(code);
  roleProbeModules.set(roles.length,packed);
  const raw=size(code),native=size(packed);
  return {roles,cards:cards.length,raw,native,deltaNativeVsAvailableBuilder:native.bytes-size(currentBytes).bytes};
});
for(const [i,row] of inventory.entries())row.deltaNativeFromPrevious=i?row.native.bytes-inventory[i-1].native.bytes:null;
const singles=Object.fromEntries(Object.keys(selectRoles).map(role=>{
  const cards=frozen.cards.filter(card=>card.role===role);
  const code=heading+originalV4ToLua({version:frozen.version,cards,rules:{...frozen.rules,roles:{[role]:frozen.rules.roles[role]}}})+'\n';
  return [role,{...size(pack(code)),rarityCounts:Object.fromEntries([...new Set(cards.map(card=>card.rarity))].map(rarity=>[rarity,cards.filter(card=>card.rarity===rarity).length]))}];
}));
const theme=readJson('data','presentation','ui_theme.json');
const artStatus=Object.fromEntries(Object.entries(theme.icon.heroSlots).filter(([key])=>['large','bust','battle'].includes(key)).map(([key,value])=>[key,Object.fromEntries(Object.values(selectRoles).map(role=>[role,value[role]]))]));
const gameplayModules=Object.fromEntries(readdirSync(src('src','lua')).filter(name=>name.startsWith('abyss_original_v4')).map(name=>{
 const raw=read('src','lua',name);
 return [name,{raw:size(raw),current:size(storage?storage.packNativeScript(name.slice(0,-4),raw,storage.nativeScriptStorageProfile):raw)}];
}));
const report={source:checked,moduleSha256:createHash('sha256').update(originalBytes).digest('hex'),nativeAvailableBuilderOriginalData:size(currentBytes),inventory,singles,
 combinedSavingsNativeVsStandalones:Object.values(singles).reduce((total,row)=>total+row.bytes,0)-inventory.at(-1).native.bytes,
 combinedSavingsGzipVsStandalones:Object.values(singles).reduce((total,row)=>total+row.gzipBytes,0)-inventory.at(-1).native.gzipBytes,
 gameplayModules,artStatus,officialCapacity:'UNVERIFIED'};
const output=src('build','four-role-probe');
mkdirSync(output,{recursive:true});
if(withUi||withRuntime)process.chdir(repo);
if(withUi){
  const production=src('build','role-ui-base');
  const all=src('build','role-ui-existing-all');
  for(const [directory,extra] of [[production,[]],[all,['--experimental-characters']]]){
    execFileSync(process.execPath,['scripts/build-ui.mjs',directory,'--official-assets','--refined-release-monsters','--native-page-lifecycle',...extra]);
  }
  function layoutMetrics(layout){
    let controls=0,hidden=0;
    function visit(node,ancestorHidden=false){
      const nodeHidden=ancestorHidden||node.visible===false;
      for(const child of node.controls??node.children??[]){
        controls++;if(nodeHidden||child.visible===false)hidden++;
        visit(child,nodeHidden);
      }
    }
    visit(layout);
    return {...size(JSON.stringify(layout)),controls,hidden};
  }
  const productionLayout=readJson('build','role-ui-base','game-ui.json');
  const allLayout=readJson('build','role-ui-existing-all','game-ui.json');
  const fourLayout=structuredClone(allLayout);
  const slotPath=(layout)=>['stage','characterPanel','details','infoMotion'].reduce((node,id)=>(node.controls??node.children).find(item=>item.name===id),layout);
  const one=slotPath(productionLayout), eight=slotPath(allLayout), four=slotPath(fourLayout);
  if(one.children.length!==1||eight.children.length!==8)throw Error('Selector pool baseline changed');
  four.children=four.children.slice(0,4);
  const single=layoutMetrics(productionLayout), probe=layoutMetrics(fourLayout), allFacts=layoutMetrics(allLayout);
  report.selectionPool={single,probe,allFacts,fourVsOne:Object.fromEntries(Object.keys(single).map(key=>[key,probe[key]-single[key]])),
    sameTemplateBytes:read('build','role-ui-base','game-ui-templates.json')===read('build','role-ui-existing-all','game-ui-templates.json'),
    samePortraitModule:read('build','role-ui-base','abyss_traveler_portrait_assets.lua')===read('build','role-ui-existing-all','abyss_traveler_portrait_assets.lua')};
  const {writePortraitModule,portraitRuntimeInventory,portraitModule}=await mod('official-portraits.mjs');
  const officialSelectionAndBattle=read('build','role-ui-base',portraitModule+'.lua');
  const productionFlags=read('build','role-ui-base','art-render-v2.json');
  const artVariants={};
  for(const [label,selectionAvatar,battlePortrait] of [['off',false,false],['selection',true,false],['battle',false,true],['both',true,true]]){
    const directory=join(output,'art-'+label);
    mkdirSync(directory,{recursive:true});
    writeFileSync(join(directory,'art-render-v2.json'),productionFlags);
    const literal=writePortraitModule(directory,{root:repo,officialAssets:true,selectionAvatar,battlePortrait});
    if(label==='both'&&literal!==officialSelectionAndBattle)throw Error('Portrait matrix and production build differ');
    artVariants[label]={raw:size(literal),native:size(storage.packNativeScript(portraitModule,literal,storage.nativeScriptStorageProfile)),
      assets:portraitRuntimeInventory(directory)?.assets??[]};
  }
  const {off,selection,battle,both}=artVariants;
  report.geoPortraitControl={variants:artVariants,selectionAfterBattleBytes:both.native.bytes-battle.native.bytes,
    battleAfterSelectionBytes:both.native.bytes-selection.native.bytes,
    nonAdditivityVsSeparate:selection.native.bytes+battle.native.bytes-off.native.bytes-both.native.bytes,
    missingNewRoleArt:['hutao','arlecchino','furina','raiden'],measurementScope:'Existing Geo producer only. No custom-role art estimate.'};
}
if(withRuntime){
  execFileSync(process.execPath,['scripts/build-lua-data.mjs']);
  execFileSync(process.execPath,['scripts/build-ui.mjs']);
  const source=read('src','lua','abyss_run_admission.lua');
  const original="local competition={ironclad='ironclad'}";
  const replacement="local competition={ironclad='ironclad',raiden='raiden',RD='raiden',hutao='hutao',HT='hutao',arlecchino='arlecchino',AR='arlecchino'}";
  if(source.split(original).length!==2)throw Error('Expected one Geo-only admission baseline');
  const probe=source.replace(original,replacement);
  const admission=join(output,'admission.lua');
  writeFileSync(admission,probe);
  writeFileSync(join(output,dataName+'.lua'),roleProbeModules.get(3));
  const pathForLua=value=>JSON.stringify(value.replaceAll('\\','/'));
  const script=fileURLToPath(new URL('./role-runtime.lua',import.meta.url));
  const luaPath=[join(output,'?.lua'),'./build/lua/?.lua','./src/lua/?.lua',';'].join(';').replaceAll('\\','/');
  const run=execFileSync(process.execPath,['node_modules/fengari-node-cli/src/lua-cli.js','-e',
    'ROLE_ADMISSION_PROBE_PATH='+pathForLua(admission)+'; dofile('+pathForLua(script)+')'],
    {encoding:'utf8',env:{...process.env,LUA_PATH:luaPath,LUA_PATH_5_3:luaPath,LUA_INIT:'',LUA_INIT_5_3:''}});
  const marker=run.trim().split(/\r?\n/);
  if(marker.length!==4||!marker.every(line=>line.startsWith('FOUR_ROLE_PROBE_PASS ')))throw Error('Incomplete role probe: '+run);
  const packAdmission=value=>storage?storage.packNativeScript('abyss_run_admission',value,storage.nativeScriptStorageProfile):value;
  report.patchedAdmissionProbe={roles:marker.map(line=>line.split(' ').at(-1)),rawBytesDelta:size(probe).bytes-size(source).bytes,
    nativeBytesDelta:size(packAdmission(probe)).bytes-size(packAdmission(source)).bytes,
    scope:'Select.canConfirm, 10-card deck, distinct starting relic for original V4, normal combat, a committed card, controlled Act 1 boss-chest transition, first Act 2 combat, and controlled two_act_complete ending'};
}
writeFileSync(join(output,'matrix.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
