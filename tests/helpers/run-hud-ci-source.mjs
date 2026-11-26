// Exact outer continuation into the immutable 903bf closeout CI corpus.
// New files remain unmeasured raw Full work; no historical archive is rewritten.
import assert from 'node:assert/strict';
import {preNativePreviewCiSource} from './native-preview-ci-source.mjs';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {preStsStyleCiSource,stsStylePriorInventory,stsStylePriorRead} from './sts-style-ci-source.mjs';
import {beforePotionReadabilityEvidence} from './v2-ui-admission-ci-source.mjs';
import {beforeCloseoutHistoryTooling,beforeCloseoutRunHudFixture} from './closeout-current-backflow-source.mjs';
import {preMenuRedCiSource} from './menu-red-ci-source.mjs';
import {exactSourceMatches} from './source-fingerprint.mjs';
import {restoreExactFixtureHunks} from './exact-fixture-hunks.mjs';
const hash=s=>createHash('sha256').update(s).digest('hex');
const normalize=s=>s.replaceAll('\r\n','\n');
const toolingBytes=normalize(readFileSync(new URL('../fixtures/pr-history-tooling-continuation.json',import.meta.url),'utf8'));
assert.equal(hash(toolingBytes),'e7575d0355205c329a6b60da70e1c4709597ae129b24ba3045c76567ce1a3990','complete history tooling continuation');
const tooling=JSON.parse(toolingBytes);
for(const side of ['before','after'])assert.equal(hash(tooling[side].source),tooling[side].sha256,'complete history tooling '+side);
const beforeRepairBytes=readFileSync(new URL('./run-hud-before-ci-repair-ci-source.json.gz',import.meta.url));
assert.equal(hash(beforeRepairBytes),'fa385b20797f37ca5a8c0a406d6ecdad6b4c0539c27a825e751b7eadeb4f5408','immutable run HUD CI predecessor before Full repair');
export const runHudBeforeCiRepairProof=JSON.parse(gunzipSync(beforeRepairBytes));
const bytes=readFileSync(new URL('./run-hud-ci-source.json.gz',import.meta.url));
assert.equal(hash(bytes),'685bddcc6bed77545eadc456f82ed4de10a75402cfcf597533190eb1732cbe3b','complete run HUD CI continuation');
export const runHudCiProof=JSON.parse(gunzipSync(bytes));
assert.equal(runHudCiProof.schemaVersion,1);
assert.equal(runHudCiProof.normalization,'LF');
assert.equal(runHudCiProof.base,'903bf2a31e91f10fb24763ab4cea23d586d0bb83');
for(const [path,row]of Object.entries(runHudCiProof.files))for(const side of ['before','after']){
 const binding=row[side];if(binding===null)continue;
 assert.equal(hash(binding.source),binding.sha256,path+'/'+side);
 assert.equal(createHash('sha1').update(`blob ${Buffer.byteLength(binding.source)}\0`).update(binding.source).digest('hex'),binding.gitBlob);
 Object.freeze(binding);
}
const freeze=value=>{if(value&&typeof value==='object'&&!Object.isFrozen(value)){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
freeze(runHudCiProof);
freeze(runHudBeforeCiRepairProof);
function beforeSilentPlanningSource(path,source){
 if(path!=='tests/lua/silent_final_potions.lua'||!exactSourceMatches(source,{
  sha256:'68a55e5dd554fb96a911dd4b69e3f596ab0ccfe5a58b630292149849314ccaa7',gitBlob:'0e712bd58829ad95c89822c9c56b2757f1c8d006',
 }))return source;
 const lf=normalize(source);
 if(source!==lf&&source!==lf.replaceAll('\n','\r\n'))return source;
 const prior=lf.replace("'raven_adept_solo'","'cultist_solo'");
 assert(exactSourceMatches(prior,{
  sha256:'c84da8727d33ce9e3f50f47bf1abc7a46fa40a9f4e703153e4eb35e5af6dc0d4',gitBlob:'0646eeaefec1cdd3c122214f95a95f8b25eab5f6',
 }),'exact Silent planning fixture predecessor');
 return source===lf?prior:prior.replaceAll('\n','\r\n');
}
const defectPlanningTest='tests/defect-final-execute.test.mjs';
const defectPlanningTestCurrent={"sha256":"7492f9c4cc3f68b0c4a0009288a26589f926a988d115003aa2386ee3846db35b","gitBlob":"b1f884149f375b12bd8078bfb6cef5a1b8524458"};
const defectPlanningTestBefore={"sha256":"353e601af4ec137fb2b0a05e92cbf575b6583d22a09995b73508e22f8d835d5b","gitBlob":"53f6cdf4a47f0d88c102107b3a51c050fb96a87b"};
const defectPlanningTestHunks=[
 {"at":10,"before":"const before=read('tests/fixtures/defect-final-execute-before.lua');\nconst current=()=>read(path);","after":"const before=read('tests/fixtures/defect-final-execute-before.lua');\n// a111076f (#940) changed the base Equilibrium card body, which is recorded in\n// the complete state graph. Apply just that approved copy to the expected VM.\nconst previousEquilibriumText = \"text='获得13点格挡。本回合保留所有非虚无手牌。',\";\nconst approvedEquilibriumText = \"text='获得13点格挡。本回合保留所有非虚无手牌',\";\nconst expectedSource = before.replace(previousEquilibriumText, approvedEquilibriumText);\nconst current=()=>read(path);"},
 {"at":29,"before":" assert.equal(createHash('sha1').update(`blob ${Buffer.byteLength(before)}\\0`).update(before).digest('hex'),'16821c6065a7819bae767e1f6f511c497eba903a');\n});","after":" assert.equal(createHash('sha1').update(`blob ${Buffer.byteLength(before)}\\0`).update(before).digest('hex'),'16821c6065a7819bae767e1f6f511c497eba903a');\n assert.equal(before.split(previousEquilibriumText).length, 2, 'one frozen Equilibrium card body');\n});"},
 {"at":34,"before":"].map(n=>'tests/lua/'+n+'.lua')])test(`${fixture}: independent VMs compare complete graphs, aliases, returns, RNG, queues and errors`,()=>{\n const a=run(before,fixture),b=run(current(),fixture);\n assert.equal(a.status,0,a.error);assert.equal(b.status,0,b.error);","after":"].map(n=>'tests/lua/'+n+'.lua')])test(`${fixture}: independent VMs compare complete graphs, aliases, returns, RNG, queues and errors`,()=>{\n const a=run(expectedSource,fixture),b=run(current(),fixture);\n assert.equal(a.status,0,a.error);assert.equal(b.status,0,b.error);"},
];

// Current Equilibrium graph comparisons keep the approved card text. The
// original planning receipt reads its complete fixture from before #940.
function beforeDefectPlanningTest(path,source){
 if(path!==defectPlanningTest||!exactSourceMatches(source,defectPlanningTestCurrent))return source;
 const lf=normalize(source);
 if(source!==lf&&source!==lf.replaceAll('\n','\r\n'))return source;
 const prior=restoreExactFixtureHunks({path,beforeSha256:defectPlanningTestBefore.sha256,
  afterSha256:defectPlanningTestCurrent.sha256,hunks:defectPlanningTestHunks},path,lf);
 assert(exactSourceMatches(prior,defectPlanningTestBefore),'exact Defect planning test predecessor');
 return source===lf?prior:prior.replaceAll('\n','\r\n');
}
export function preRunHudCiSource(path,source){
 source=beforeSilentPlanningSource(path,source);
 source=beforeDefectPlanningTest(path,source);
 source=preMenuRedCiSource(path,beforePotionReadabilityEvidence(path,source));
 source=preStsStyleCiSource(path,source);
 source=preNativePreviewCiSource(path,source);
 source=beforeCloseoutHistoryTooling(path,source);
 source=beforeCloseoutRunHudFixture(path,source);
 if(path===tooling.path&&typeof source==='string'&&!source.includes('\r\r\n')&&
   normalize(source)===tooling.after.source&&hash(normalize(source))===tooling.after.sha256)return tooling.before.source;
 const row=Object.hasOwn(runHudCiProof.files,path)?runHudCiProof.files[path]:null;
 if(!row||!row.before||typeof source!=='string'||hash(normalize(source))!==row.after.sha256)return source;
 return row.before.source;
}
export function runHudPriorRead(read=readFileSync){return(path,encoding)=>{
 const raw=read(path,encoding),text=typeof raw==='string'?raw:raw.toString('utf8');
 const prior=preRunHudCiSource(path,text);
 return typeof raw==='string'?prior:prior===text?raw:Buffer.from(prior);
};}
export function runHudPriorInventory(paths,read=readFileSync){
 paths=stsStylePriorInventory(paths,read);read=stsStylePriorRead(read);
 const sorted=[...paths].sort(),p=runHudCiProof;
 if(!p.addedTests.some(path=>sorted.includes(path)))return [...paths];
 assert.deepEqual(sorted,p.afterInventory,'complete run HUD inventory');
 for(const path of p.addedTests){
  assert.equal(hash(normalize(read(path,'utf8'))),p.files[path].after.sha256,'run HUD added inventory source: '+path);
 }
 return [...p.beforeInventory];
}
