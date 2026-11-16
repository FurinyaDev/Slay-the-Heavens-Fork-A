// Copies only immutable test helper dependencies; production owners remain explicit fixtures.
import assert from 'node:assert/strict';
import {officialUiRepairClosure} from './official-ui-repair-closure.mjs';
import {feedbackCiPatch} from './sts-feedback-ci.mjs';
import {extendFeedbackHelperClosure} from './sts-feedback-source-runtime.mjs';
import {extendIntegratedHelperClosure} from './integrated-ci-source.mjs';
import {readFileSync,writeFileSync,mkdirSync,realpathSync,existsSync} from 'node:fs';
import {join,dirname,relative,isAbsolute} from 'node:path';
import {createHash} from 'node:crypto';
const hash=b=>createHash('sha256').update(b).digest('hex');
// Git source identities use LF; binary witnesses (especially gzip) retain
// their exact bytes. Never decode an arbitrary helper dependency as text.
export function integrationClosureBytes(path,content){
 assert(Buffer.isBuffer(content),'helper closure requires bytes');
 if(!/\.(?:mjs|js|json|lua|md|yml|yaml)$/.test(path))return content;
 const text=content.toString('utf8');
 assert(Buffer.from(text).equals(content),'helper source must be valid UTF-8: '+path);
 return Buffer.from(text.replaceAll('\r\n','\n'));
}
const bytes=readFileSync(new URL('./integration-source-closure.json',import.meta.url));
assert.equal(hash(bytes),'800fcc9efd889f482259d0e1e9f1501f0e9597ac05552622ede00dd3dcdb4a94','complete integration helper closure identity');
const currentBytes=readFileSync(new URL('./closeout-source-closure.json',import.meta.url));
assert.equal(hash(currentBytes),'031c42758ec5b37d1782c5fdb70542358d4b2631a5ee9b486b6bb5faccc988b5','complete closeout source helper closure');
const files={...extendIntegratedHelperClosure(extendFeedbackHelperClosure(JSON.parse(currentBytes),feedbackCiPatch.helperClosure))};
export const releaseSelectionMapHelperCopies=[
 {path:'tests/helpers/closeout-source-epoch.mjs',before:'163f0f84fcd4f9b4bcb982b250891a9c5156df556699d8a65ec0cf1b354d25f7',after:'9bc2594f88cd780a31a429f5a493568f076d039ab92f55b952631b586ce335c1'},
 {path:'tests/helpers/release-selection-map-source.mjs',before:null,after:'920fd01fa07dad36ed7e9b70ace199246000d87ad20c258221a2aca4a8e0ee52'},
 {path:'tests/helpers/release-selection-map-source.json.gz',before:null,after:'0c056c020ad655d5a2a901a6f196350582eaf0709afa736f363a0d68509daf62'}
];
for(const row of releaseSelectionMapHelperCopies){assert.equal(files[row.path]??null,row.before,'exact release selection map helper-copy predecessor: '+row.path);files[row.path]=row.after;}
export const battlePointerHelperCopies=[
 {
  "path": "tests/helpers/closeout-source-epoch.mjs",
  "before": "9bc2594f88cd780a31a429f5a493568f076d039ab92f55b952631b586ce335c1",
  "after": "00240dea8c750c8726eab9d12e49d79ec102ac57612f55b2bb97cc232d122097"
 },
 {
  "path": "tests/helpers/battle-pointer-source.mjs",
  "before": null,
  "after": "b8e4d236b50f7f4770fb839772daa3607b678d82dfdae5c80cb39f4e932c3643"
 },
 {
  "path": "tests/helpers/battle-pointer-source.json.gz",
  "before": null,
  "after": "c6ed821e15ab4e79de278db32122712c07716360166c995a6bf0f7a70c11639a"
 }
];
for(const row of battlePointerHelperCopies){assert.equal(files[row.path]??null,row.before,'exact battle pointer helper-copy predecessor: '+row.path);files[row.path]=row.after;}
export const battlePointerSparseHelperCopies=[
 {
  "path": "tests/helpers/closeout-source-epoch.mjs",
  "before": "00240dea8c750c8726eab9d12e49d79ec102ac57612f55b2bb97cc232d122097",
  "after": "60c35fcb13cb9bc6ee8c4b9212af65f5c50ca43412afa9544a781628dc41167d"
 },
 {
  "path": "tests/helpers/battle-pointer-sparse-source.mjs",
  "before": null,
  "after": "d942cd6fc3f9cbc4a75165ae4f5fb68ffb4acee3855631ca799fddfe3208d704"
 },
 {
  "path": "tests/helpers/battle-pointer-sparse-source.json.gz",
  "before": null,
  "after": "789e74619b3ce005e0e9ebe75885fb2d8a71799dae5b98acc70a31ba87284518"
 }
];
for(const row of battlePointerSparseHelperCopies){assert.equal(files[row.path]??null,row.before,'exact sparse battle pointer helper-copy predecessor: '+row.path);files[row.path]=row.after;}
const inside=(root,path)=>{const r=relative(root,path);return r!==''&&!isAbsolute(r)&&r!=='..'&&!r.startsWith('../')&&!r.startsWith('..\\');};
export function copyIntegrationSourceClosure(directory,{sourceRoot=process.cwd()}={}){
 const destination=realpathSync.native(directory);
 assert.notEqual(destination,realpathSync.native(sourceRoot),'isolated helper copy destination');
 for(const [path,sha]of Object.entries(files)){
  assert((path.startsWith('tests/helpers/')||path.startsWith('tests/fixtures/'))&&!path.split('/').includes('..'),'fixed helper path');
  const source=join(sourceRoot,path),content=integrationClosureBytes(path,readFileSync(source));assert.equal(hash(content),sha,'fresh helper copy identity: '+path);
  const target=join(directory,path);mkdirSync(dirname(target),{recursive:true});
  assert(inside(destination,realpathSync.native(dirname(target))),'helper destination parent escaped');
  if(existsSync(target))assert(inside(destination,realpathSync.native(target))&&realpathSync.native(target)!==realpathSync.native(source),'helper destination aliases source');
  writeFileSync(target,content);
 }
}
