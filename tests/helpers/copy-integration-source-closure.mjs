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
const commonReleaseCopies={...files};
export const releasePcHelperCopies=[
 {path:'tests/helpers/closeout-source-epoch.mjs',before:'163f0f84fcd4f9b4bcb982b250891a9c5156df556699d8a65ec0cf1b354d25f7',after:'05043cc9ebf2b318f8f2291b0b5f4a35976c97a6316531607c8fad06daee324e'},
 {path:'tests/helpers/release-pc-source.mjs',before:null,after:'445a19e6d1e57fd00d8def9a790c149eef277636fd92c8dcc03085947ab5e94f'},
 {path:'tests/helpers/release-pc-source.json.gz',before:null,after:'007271848a37da024ef7e25d6e2c7719b2c1d3aeffd36fa157b18e26895253ee'}
];
for(const row of releasePcHelperCopies){assert.equal(files[row.path]??null,row.before,'exact release PC helper-copy predecessor: '+row.path);files[row.path]=row.after;}
const splitHelperCopies=[
 {path:'tests/helpers/closeout-source-epoch.mjs',before:releasePcHelperCopies[0].after,after:'84a9556aef4ab1737b726280f3014c6975bc63bc50ff453131fb98a5d15cb1b2'},
 {path:'tests/helpers/release-pc-source.mjs',before:releasePcHelperCopies[1].after,after:'a7b7c23646bfb48745d2a8ff59e2b3b61fd28838ff7642f016211fa96abec07d'},
 {path:'tests/helpers/release-pc-split-source.json.gz',before:null,after:'26580fd476d567246a300c235c41c70dcaeeb826792ce9f79cf0f623072a8399'}
];
for(const row of splitHelperCopies){assert.equal(files[row.path]??null,row.before,'exact split helper-copy predecessor: '+row.path);files[row.path]=row.after;}
export const releaseSelectionMapHelperCopies=[
 {path:'tests/helpers/closeout-source-epoch.mjs',before:'163f0f84fcd4f9b4bcb982b250891a9c5156df556699d8a65ec0cf1b354d25f7',after:'9bc2594f88cd780a31a429f5a493568f076d039ab92f55b952631b586ce335c1'},
 {path:'tests/helpers/release-selection-map-source.mjs',before:null,after:'920fd01fa07dad36ed7e9b70ace199246000d87ad20c258221a2aca4a8e0ee52'},
 {path:'tests/helpers/release-selection-map-source.json.gz',before:null,after:'0c056c020ad655d5a2a901a6f196350582eaf0709afa736f363a0d68509daf62'}
];
for(const row of releaseSelectionMapHelperCopies){assert.equal(commonReleaseCopies[row.path]??null,row.before,'exact standalone Map helper-copy predecessor: '+row.path);if(row.path!=='tests/helpers/closeout-source-epoch.mjs')files[row.path]=row.after;}
files['tests/helpers/closeout-source-epoch.mjs']='485db0d928e7cf4d13f55b3a15df6272af3acb6adb31a1b4d140297871c73133';
files['tests/helpers/pc-map-merged-view.json']='840440266b2a19cd93b8268b4fb9fba8a03cbb16c6df9b1bef4cd931f9b23324';
files['tests/helpers/release-pc22-basic-feedback-source.mjs']='395e3810c67852768340eb868ee7397bb9ed0b232ff112efa93fb4b520e80b96';
files['tests/helpers/release-pc22-basic-feedback-source.json.gz']='1cb0fddfea365de7be5331dc169bd438f2cde36b372c4c15bf9c8ac8a2eed157';
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
