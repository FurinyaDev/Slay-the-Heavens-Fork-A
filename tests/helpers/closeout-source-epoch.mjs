// One exact current production closure; original slices and archives stay immutable.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {createSourceEpochProjector} from './combined-epoch/source-epoch-runtime.mjs';
import {extendStsStyleEpoch} from './sts-style-source-epoch-runtime.mjs';
import {stsStylePatch} from './sts-style-source-proof.mjs';
import {extendFeedbackSourceEpoch} from './sts-feedback-source-runtime.mjs';
import {feedbackProductionPatch} from './sts-feedback-production.mjs';
import {extendMenuRedSourceEpoch,extendMenuPresentationEpoch} from './menu-red-source-epoch.mjs';
import {extendReleaseSourceEpoch} from './release-source-epoch.mjs';
import {extendSessionMenuEpoch} from './session-menu-source-epoch.mjs';
import {extendReleasePcSource,extendSplitReleasePcSource} from './release-pc-source.mjs';
import {extendReleasePc22BasicFeedbackSource} from './release-pc22-basic-feedback-source.mjs';
import {extendReleaseSelectionMapSource} from './release-selection-map-source.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex');
const bytes=readFileSync(new URL('./closeout-source-epoch.json.gz',import.meta.url));
assert.equal(hash(bytes),'36aba7fc07f732a191a750d437eefd27e9b9567221811747abf13c97a9ac237a');
const packed=JSON.parse(gunzipSync(bytes));
const expand=files=>Object.fromEntries(Object.entries(files).map(([path,id])=>[path,id===null?null:packed.records[id]]));
const priorProof={...packed,current:expand(packed.current),targets:Object.fromEntries(Object.entries(packed.targets).map(([name,target])=>[name,{...target,files:expand(target.files)}]))};
delete priorProof.records;
const freeze=value=>{if(value&&typeof value==='object'&&!Object.isFrozen(value)){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
export const closeoutPriorEpoch=createSourceEpochProjector(freeze(priorProof),{allowConfigLayout:true,reuseFrozenInput:true});
// Only this five-source continuation advances. The complete old closeout archive,
// target views and receipt identities above remain independent and immutable.
const shopBytes=readFileSync(new URL('./shop-deck-source-epoch.json.gz',import.meta.url));
assert.equal(hash(shopBytes),'f5546b3bd0264af9e4fff867637fe217e4e7c32482e72104d7d3c1f3cc43a03b','shop/deck complete archive identity');
const outer=createSourceEpochProjector(JSON.parse(gunzipSync(shopBytes))).proof;
assert.equal(outer.targets.prior.commit,'903bf2a31e91f10fb24763ab4cea23d586d0bb83');
assert.deepEqual(Object.keys(outer.current),['src/lua/abyss_deck_ui.lua','src/lua/abyss_merchant.lua','src/lua/abyss_game_ui_input.lua','src/lua/abyss_node_ui_feedback.lua','src/lua/abyss_potion_discard_ui.lua']);
for(const [path,binding]of Object.entries(outer.targets.prior.files))assert.deepEqual(binding,priorProof.current[path],'shop/deck exact closeout predecessor: '+path);
const current={...priorProof.current,...outer.current};
const fourBytes=readFileSync(new URL('./shop-deck-four-source-epoch.json.gz',import.meta.url));
assert.equal(hash(fourBytes),'51034e9da34cbe0ab153f00ab66a16918db1097ef7173932ab326cc6c2076f2b','immutable PR639 four-source predecessor');
const four=createSourceEpochProjector(JSON.parse(gunzipSync(fourBytes))).proof;
for(const [path,binding]of Object.entries(four.targets.prior.files))assert.deepEqual(binding,priorProof.current[path],'four-source predecessor: '+path);
export const shopDeckFourSourcePrior=freeze(four);
const beforeRepairBytes=readFileSync(new URL('./shop-deck-before-ci-repair-source-epoch.json.gz',import.meta.url));
assert.equal(hash(beforeRepairBytes),'94d6f85a83a1593bbbaf34ae13986ddfbca97312e183b4e7f6b08ca58b8d911b','immutable PR639 five-source predecessor before Full repair');
export const shopDeckBeforeCiRepairPrior=freeze(createSourceEpochProjector(JSON.parse(gunzipSync(beforeRepairBytes))).proof);
for(const [path,binding]of Object.entries(shopDeckBeforeCiRepairPrior.targets.prior.files))assert.deepEqual(binding,priorProof.current[path],'five-source predecessor: '+path);
const targets={...priorProof.targets,shopDeckPrior:{commit:outer.targets.prior.commit,files:priorProof.current},
 shopDeckFourPrior:{commit:four.currentCommit,files:{...priorProof.current,...four.current}},
 shopDeckBeforeCiRepairPrior:{commit:shopDeckBeforeCiRepairPrior.currentCommit,files:{...priorProof.current,...shopDeckBeforeCiRepairPrior.current}}};
const owners=Object.keys(current).filter(path=>Object.values(targets).some(target=>target.files[path]?.sha256!==current[path]?.sha256));
export const ciRepairSourceEpoch=createSourceEpochProjector(freeze({...priorProof,currentTreeCommitted:false,
 currentCommit:outer.currentCommit,currentCommitRole:outer.currentCommitRole,current,targets,owners}),{allowConfigLayout:true,reuseFrozenInput:true});
export const stsStyleEpoch=extendStsStyleEpoch(ciRepairSourceEpoch,stsStylePatch);
export const menuRedPriorEpoch=extendFeedbackSourceEpoch(stsStyleEpoch,feedbackProductionPatch);
export const menuRedEpoch=extendMenuRedSourceEpoch(menuRedPriorEpoch);
export const menuPresentationEpoch=extendMenuPresentationEpoch(menuRedEpoch);
export const releaseSourceEpoch=extendReleaseSourceEpoch(menuPresentationEpoch);
export const preReleasePcSourceEpoch=extendSessionMenuEpoch(releaseSourceEpoch);
export const preReleaseSelectionMapSourceEpoch=preReleasePcSourceEpoch;
export const preSplitSourceEpoch=extendReleasePcSource(preReleasePcSourceEpoch);
export const releasePcSourceEpoch=extendSplitReleasePcSource(preSplitSourceEpoch);
export const releaseSelectionMapSourceEpoch=extendReleaseSelectionMapSource(preReleaseSelectionMapSourceEpoch);
const joinedInputBytes=readFileSync(new URL('./pc-map-merged-view.json',import.meta.url),'utf8').replaceAll('\r\n','\n');
assert.equal(hash(joinedInputBytes),'840440266b2a19cd93b8268b4fb9fba8a03cbb16c6df9b1bef4cd931f9b23324','exact three-way PC/map view binding');
const joinedInput=JSON.parse(joinedInputBytes);
assert.deepEqual(joinedInput.heads,['5fe72de406f42ebbf406ac386d4c03a3a903373b','33d71575c5f186a1b54f7bf3e4f1826c145aa1d9']);
assert.equal(joinedInput.path,'src/lua/abyss_game_ui_view.lua');
assert.equal(joinedInput.currentTreeCommitted,false);
// Join disjoint approved owners against their exact common predecessor. Both
// standalone corpora and every original target retain their original identity.
function joinReleaseSources(){
const base=preReleasePcSourceEpoch.proof;
const navigation=releasePcSourceEpoch.proof,selection=releaseSelectionMapSourceEpoch.proof;
const current={...base.current},targets={...base.targets};
for(const side of [navigation,selection]){
 for(const [path,row]of Object.entries(side.current))if(row?.sha256!==base.current[path]?.sha256){
  if(current[path]?.sha256!==base.current[path]?.sha256){
   assert.equal(path,joinedInput.path,'only the declared three-way owner overlaps');
   assert.deepEqual(joinedInput.before,[current[path],row],'complete exact two standalone input bindings');
   current[path]=joinedInput.current;
  }else current[path]=row;
 }
 for(const [name,target]of Object.entries(side.targets)){
  if(Object.hasOwn(targets,name))assert.deepEqual(targets[name],target,'unchanged common Release target: '+name);
  else targets[name]=target;
 }
}
targets.releasePcReviewed={commit:navigation.currentCommit,files:navigation.current};
targets.releaseSelectionMapReviewed={commit:selection.currentCommit,files:selection.current};
const owners=Object.keys(current).sort().filter(path=>Object.values(targets).some(target=>target.files[path]?.sha256!==current[path]?.sha256));
return createSourceEpochProjector(freeze({...base,current,targets,owners,
 currentTreeCommitted:false,currentCommit:'5fe72de406f42ebbf406ac386d4c03a3a903373b',
 currentCommitRole:'integration worktree capture; standalone committed product producers are retained separately',
 releasePcProducers:navigation.releasePcProducers,
 releaseSelectionMapProducers:selection.releaseSelectionMapProducers}),{allowConfigLayout:true,reuseFrozenInput:true});
}
export const releasePcMapSourceEpoch=joinReleaseSources();
export const preReleasePc22BasicFeedbackSourceEpoch=preReleasePcSourceEpoch;
export const releasePc22BasicFeedbackSourceEpoch=extendReleasePc22BasicFeedbackSource(preReleasePc22BasicFeedbackSourceEpoch);
function joinCardContactSources(){
const base=preReleasePc22BasicFeedbackSourceEpoch.proof;
const pc22=releasePc22BasicFeedbackSourceEpoch.proof,selection=releaseSelectionMapSourceEpoch.proof;
const current={...base.current},targets={...base.targets};
for(const side of [pc22,selection]){
 for(const [path,row]of Object.entries(side.current))if(row?.sha256!==base.current[path]?.sha256){
  assert.deepEqual(current[path],base.current[path],'disjoint Release integration owner: '+path);
  current[path]=row;
 }
 for(const [name,target]of Object.entries(side.targets)){
  if(Object.hasOwn(targets,name))assert.deepEqual(targets[name],target,'unchanged common Release target: '+name);
  else targets[name]=target;
 }
}
targets.releasePc22BasicFeedbackReviewed={commit:pc22.currentCommit,files:pc22.current};
targets.releaseSelectionMapReviewed={commit:selection.currentCommit,files:selection.current};
const owners=Object.keys(current).sort().filter(path=>Object.values(targets).some(target=>target.files[path]?.sha256!==current[path]?.sha256));
return createSourceEpochProjector(freeze({...base,current,targets,owners,
 currentTreeCommitted:false,currentCommit:'17580f25c742a7facb5626db8fc17efb4abe269b',
 currentCommitRole:'integration worktree capture; standalone committed product producers are retained separately',
 releasePc22BasicFeedbackProducers:pc22.releasePc22BasicFeedbackProducers,
 releaseSelectionMapProducers:selection.releaseSelectionMapProducers}),{allowConfigLayout:true,reuseFrozenInput:true});
}
export const releaseCardContactSourceEpoch=joinCardContactSources();
// Actual B9 contributes one disjoint current owner; both complete parent domains remain named.
function joinPcAndB9(){
 const pc=releasePcMapSourceEpoch.proof,b9=releaseCardContactSourceEpoch.proof;
 const path='src/lua/abyss_card_flow.lua';
 assert.deepEqual(pc.current[path],preReleasePc22BasicFeedbackSourceEpoch.proof.current[path],'PC did not change inherited card contact owner');
 const current={...pc.current,[path]:b9.current[path]},targets={...pc.targets};
 for(const [name,target]of Object.entries(b9.targets)){
  if(Object.hasOwn(targets,name))assert.deepEqual(targets[name],target,'retained common PC/B9 target: '+name);
  else targets[name]=target;
 }
 targets.releasePcMapReviewed={commit:pc.currentCommit,files:pc.current};
 targets.releaseCardContactReviewed={commit:b9.currentCommit,files:b9.current};
 const owners=Object.keys(current).sort().filter(p=>Object.values(targets).some(t=>t.files[p]?.sha256!==current[p]?.sha256));
 return createSourceEpochProjector(freeze({...pc,current,targets,owners,currentTreeCommitted:false,
  currentCommit:'10d7ef9658872ec7d118b585fbc81e3da585c552',
  currentCommitRole:'PC/B9 worktree capture; both exact committed parents and original standalone producers retained',
  releaseB9Parents:['10d7ef9658872ec7d118b585fbc81e3da585c552','b9bca884ed9b9831965b409885d78f719b9a567a'],
  releasePc22BasicFeedbackProducers:b9.releasePc22BasicFeedbackProducers}),{allowConfigLayout:true,reuseFrozenInput:true});
}
export const sourceEpoch=joinPcAndB9();
const proof=sourceEpoch.proof;
// Snapshot consumers must first authenticate every live current owner. This is
// per invocation; neither live reads nor authorization are cached.
export function sourceSlice(path,source,target,readSource=p=>readFileSync(p,'utf8')){
 assert(Object.hasOwn(proof.targets,target),'known closeout source slice');
 const row=Object.hasOwn(proof.current,path)?proof.current[path]:null;
 if(!row||typeof source!=='string'||hash(source.replaceAll('\r\n','\n'))!==row.sha256)return source;
 const before=proof.targets[target].files[path];
 if(!before||before.sha256===row.sha256)return source;
 return sourceEpoch.preCombinedSource(path,source,{target,readSource});
}
