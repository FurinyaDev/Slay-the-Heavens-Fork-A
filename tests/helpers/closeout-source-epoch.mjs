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
import {extendReleaseSelectionMapSource} from './release-selection-map-source.mjs';
import {extendReleasePc22BasicFeedbackSource} from './release-pc22-basic-feedback-source.mjs';
import {extendMobilePotionSource} from './mobile-potion-source.mjs';
import {extendPotionRegressionSource} from './potion-regression-source.mjs';
import {extendPotionClickSource} from './potion-click-source.mjs';
import {extendPotionPost697Source} from './potion-post697-source.mjs';
import {extendPotionPointerUnion} from './potion-pointer-source.mjs';
import {extendBattlePointerSource} from './battle-pointer-source.mjs';
import {extendBattlePointerSparseSource} from './battle-pointer-sparse-source.mjs';
import {extendBattlePointerInspectionSource} from './battle-pointer-inspection-source.mjs';
import {extendBattlePointerDismissSource} from './battle-pointer-dismiss-source.mjs';
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
export const preReleaseSelectionMapSourceEpoch=extendSessionMenuEpoch(releaseSourceEpoch);
export const preBattlePointerSourceEpoch=extendReleaseSelectionMapSource(preReleaseSelectionMapSourceEpoch);
export const preBattlePointerSparseSourceEpoch=extendBattlePointerSource(preBattlePointerSourceEpoch);
export const preBattlePointerInspectionSourceEpoch=extendBattlePointerSparseSource(preBattlePointerSparseSourceEpoch);
export const preBattlePointerDismissSourceEpoch=extendBattlePointerInspectionSource(preBattlePointerInspectionSourceEpoch);
export const pointerSourceEpoch=extendBattlePointerDismissSource(preBattlePointerDismissSourceEpoch);
export const preReleasePc22BasicFeedbackSourceEpoch=preReleaseSelectionMapSourceEpoch;
export const releasePc22BasicFeedbackSourceEpoch=extendReleasePc22BasicFeedbackSource(preReleasePc22BasicFeedbackSourceEpoch);
export const releaseSelectionMapSourceEpoch=preBattlePointerSourceEpoch;
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
export const cardContactSourceEpoch=joinCardContactSources();
// The actual B9 join adds only its disjoint card-flow owner to the complete pointer corpus.
function joinPointerB9Sources(){
 const base=preReleaseSelectionMapSourceEpoch.proof,pointer=pointerSourceEpoch.proof,contact=cardContactSourceEpoch.proof;
 const current={...base.current},targets={...base.targets};
 for(const side of [pointer,contact]){
  for(const [path,row]of Object.entries(side.current))if(row?.sha256!==base.current[path]?.sha256){
   assert(current[path]?.sha256===base.current[path]?.sha256||current[path]?.sha256===row.sha256,'compatible actual B9 owner: '+path);
   current[path]=row;
  }
  for(const [name,target]of Object.entries(side.targets)){
   if(Object.hasOwn(targets,name))assert.deepEqual(targets[name],target,'unchanged actual B9 target: '+name);
   else targets[name]=target;
  }
 }
 targets.battlePointerB9Prior={commit:'4d74cd79836e18c70a244e04f6150f9ad36d6f6a',files:pointer.current};
 targets.releaseCardContactReviewed={commit:'b9bca884ed9b9831965b409885d78f719b9a567a',files:contact.current};
 const owners=Object.keys(current).sort().filter(path=>Object.values(targets).some(target=>target.files[path]?.sha256!==current[path]?.sha256));
 return createSourceEpochProjector(freeze({...pointer,current,targets,owners,currentTreeCommitted:false,
  currentCommit:'4d74cd79836e18c70a244e04f6150f9ad36d6f6a',currentCommitRole:'actual B9 merge worktree capture; both exact parent corpora and producers retained',
  releasePc22BasicFeedbackProducers:contact.releasePc22BasicFeedbackProducers}),{allowConfigLayout:true,reuseFrozenInput:true});
}
export const pointer711SourceEpoch=joinPointerB9Sources();
// Retain the exact, already-reviewed eab/ad6 preparation as a named immutable parent.
export const preMobilePotionSourceEpoch=preReleaseSelectionMapSourceEpoch;
export const prePotionRegressionSourceEpoch=extendMobilePotionSource(preMobilePotionSourceEpoch);
export const prePotionClickSourceEpoch=extendPotionRegressionSource(prePotionRegressionSourceEpoch);
export const prePotionPost697SourceEpoch=extendPotionClickSource(prePotionClickSourceEpoch);
export const releaseSelectionMapLegacyEpoch=preBattlePointerSourceEpoch;
export const potionBeforePointerEpoch=extendPotionPost697Source(prePotionPost697SourceEpoch,releaseSelectionMapLegacyEpoch);
export const pointerBeforePotionEpoch=preBattlePointerDismissSourceEpoch;
export const legacyPotionPointerSourceEpoch=extendPotionPointerUnion(potionBeforePointerEpoch,pointerBeforePotionEpoch,releaseSelectionMapLegacyEpoch);
function joinCurrentPotionPointer(){
 const left=legacyPotionPointerSourceEpoch.proof,right=pointer711SourceEpoch.proof,base=pointerBeforePotionEpoch.proof;
 const current={},targets={...left.targets};
 assert.deepEqual(Object.keys(left.current).sort(),Object.keys(right.current).sort(),'complete current potion-pointer corpus');
 for(const path of Object.keys(left.current)){
  const a=left.current[path],b=right.current[path],old=base.current[path];
  if(a?.sha256===b?.sha256)current[path]=a;
  else if(a?.sha256===old?.sha256)current[path]=b;
  else {assert.deepEqual(b,old,'no new overlapping product change: '+path);current[path]=a;}
 }
 for(const [name,target]of Object.entries(right.targets)){
  if(Object.hasOwn(targets,name))assert.deepEqual(targets[name],target,'unchanged potion-pointer target: '+name);
  else targets[name]=target;
 }
 targets.potionPointerPreparationPrior={commit:'0780e604323bc78139e0fcf3fc68f1b9d78e6ca8',files:left.current};
 targets.pointer711Reviewed={commit:'2c546641c79775ddfa6e9532ce5c65e1ea5793de',files:right.current};
 const owners=Object.keys(current).sort().filter(path=>Object.values(targets).some(target=>target.files[path]?.sha256!==current[path]?.sha256));
 return createSourceEpochProjector(freeze({...left,...right,current,targets,owners,currentTreeCommitted:false,
  currentCommit:'0780e604323bc78139e0fcf3fc68f1b9d78e6ca8',currentCommitRole:'preparation on exact pointer711 and B9; DependsOn711 unmet, no release acceptance'}),{allowConfigLayout:true,reuseFrozenInput:true});
}
export const sourceEpoch=joinCurrentPotionPointer();
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
