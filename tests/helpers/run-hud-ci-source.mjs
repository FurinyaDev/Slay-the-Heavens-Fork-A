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
export function preRunHudCiSource(path,source){
 source=beforeSilentPlanningSource(path,source);
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
