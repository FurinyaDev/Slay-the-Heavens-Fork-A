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
export const battlePointerInspectionHelperCopies=[
 {
  "path": "tests/helpers/closeout-source-epoch.mjs",
  "before": "60c35fcb13cb9bc6ee8c4b9212af65f5c50ca43412afa9544a781628dc41167d",
  "after": "6d7e34b712195df0d8d4d3e6915dcb1d6cc13d9fc9b2da86b3727740ff5a9c1d"
 },
 {
  "path": "tests/helpers/battle-pointer-inspection-source.mjs",
  "before": null,
  "after": "cbc3c05473bc514f2642ead74a3ce879ab9af6d40a19062f188195b7af3a2a23"
 },
 {
  "path": "tests/helpers/battle-pointer-inspection-source.json.gz",
  "before": null,
  "after": "647685ce68d914a68ea5308308cebe8c0f6ceeefbca2a3698db04e4640dd48f6"
 }
];
for(const row of battlePointerInspectionHelperCopies){assert.equal(files[row.path]??null,row.before,'exact inspection helper-copy predecessor: '+row.path);files[row.path]=row.after;}
export const battlePointerDismissHelperCopies=[
  {
    "path": "tests/helpers/closeout-source-epoch.mjs",
    "before": "6d7e34b712195df0d8d4d3e6915dcb1d6cc13d9fc9b2da86b3727740ff5a9c1d",
    "after": "2cc9da456afc3a7c62ed1e3b35df03d759536f84bdea5aacca8406612b24eda4"
  },
  {
    "path": "tests/helpers/battle-pointer-dismiss-source.mjs",
    "before": null,
    "after": "8d8c1fc28ee373a0758e4a4d8998800da75fb1def75c03a7fba1b89b21ed496e"
  },
  {
    "path": "tests/helpers/battle-pointer-dismiss-source.json.gz",
    "before": null,
    "after": "6f96a2ad90170ab7571bc900109537d3097d027c4a39310894176e5b641ea13c"
  }
];
for(const row of battlePointerDismissHelperCopies){assert.equal(files[row.path]??null,row.before,'exact dismiss helper-copy predecessor: '+row.path);files[row.path]=row.after;}
export const releasePc22BasicFeedbackHelperCopies=[
 {path:'tests/helpers/closeout-source-epoch.mjs',before:'163f0f84fcd4f9b4bcb982b250891a9c5156df556699d8a65ec0cf1b354d25f7',after:'0c7ff98c42c47a1a48ad83537d1d7c37a6cc23aed55ada9c763122d4ea102d07'},
 {path:'tests/helpers/release-pc22-basic-feedback-source.mjs',before:null,after:'395e3810c67852768340eb868ee7397bb9ed0b232ff112efa93fb4b520e80b96'},
 {path:'tests/helpers/release-pc22-basic-feedback-source.json.gz',before:null,after:'1cb0fddfea365de7be5331dc169bd438f2cde36b372c4c15bf9c8ac8a2eed157'}
];
for(const row of releasePc22BasicFeedbackHelperCopies)if(row.path!=='tests/helpers/closeout-source-epoch.mjs'){assert.equal(files[row.path]??null,row.before,'exact B9 production helper predecessor: '+row.path);files[row.path]=row.after;}
assert.equal(files['tests/helpers/closeout-source-epoch.mjs'],'2cc9da456afc3a7c62ed1e3b35df03d759536f84bdea5aacca8406612b24eda4','exact pointer helper before B9 join');
files['tests/helpers/closeout-source-epoch.mjs']='d79c667b3a0b2cebf6d248805cd3add5446ce95c62da969a2bdbd21e707e099b';
export const mobilePotionHelperCopies=[
 {path:'tests/helpers/closeout-source-epoch.mjs',before:'163f0f84fcd4f9b4bcb982b250891a9c5156df556699d8a65ec0cf1b354d25f7',after:'05ffc1ef75dd3acce2d91062714c19ed578de2dd45d7897b238019aaaaaf3c60'},
 {path:'tests/helpers/mobile-potion-source.mjs',before:null,after:'6ed42296f87ed7ba349e6f1cf258c60003bfd7cdea70279a8ada00d06ce84669'},
 {path:'tests/helpers/mobile-potion-source.json.gz',before:null,after:'2af4fb9d547eb50d7dc75fd54fc4b505ecaf8b5f343330e31ac91054d75c2a06'}
];
export const potionRegressionHelperCopies=[
 {path:'tests/helpers/closeout-source-epoch.mjs',before:'05ffc1ef75dd3acce2d91062714c19ed578de2dd45d7897b238019aaaaaf3c60',after:'c094647f798d6ca9c98c49b646cbd0ba034d90bd107d07e060c9d24396ec4a28'},
 {path:'tests/helpers/potion-regression-source.mjs',before:null,after:'222f5d4ca9ae55b0ff47c18d466fed620ea1ea87209b82f9c4567615409b4cad'},
 {path:'tests/helpers/potion-regression-source.json.gz',before:null,after:'fff211fab47d021bb4d6cd936a719bba03afcec03f7078aa49d3b165de5b8b2d'}
];
export const potionClickHelperCopies=[
 {path:'tests/helpers/closeout-source-epoch.mjs',before:'c094647f798d6ca9c98c49b646cbd0ba034d90bd107d07e060c9d24396ec4a28',after:'b0260eb43becd74e52a8b5ed04e1909f52741d8cc9813c42ec5bc109f3c5723c'},
 {path:'tests/helpers/potion-click-source.mjs',before:null,after:'eb133eb610ed646a566bde84c1113083ef710f68ad6bb34cb219fd306837dc82'},
 {path:'tests/helpers/potion-click-source.json.gz',before:null,after:'823ccaff8ee4d2d6e48fb94c758f9ae11a001c73872fef2a890109de0c8e0dbf'}
];
export const potionPost697HelperCopies=[{"path":"tests/helpers/closeout-source-epoch.mjs","before":"b0260eb43becd74e52a8b5ed04e1909f52741d8cc9813c42ec5bc109f3c5723c","after":"217f68beb3e466b842b8be13c71a9172960f8c07d0f3fc87ee0a8c9e41b33829"},{"path":"tests/helpers/release-selection-map-source.mjs","before":null,"after":"920fd01fa07dad36ed7e9b70ace199246000d87ad20c258221a2aca4a8e0ee52"},{"path":"tests/helpers/release-selection-map-source.json.gz","before":null,"after":"0c056c020ad655d5a2a901a6f196350582eaf0709afa736f363a0d68509daf62"},{"path":"tests/helpers/potion-post697-source.mjs","before":null,"after":"adf79a31356f5568a0c7d061ed0f82fcee8fa70966d152359ec74bd24f14b66d"},{"path":"tests/helpers/potion-post697-source.json.gz","before":null,"after":"af71c0335451f4729681a86aea723526b151d5d1732d6885d1a7a0d50cc79304"}];
// Product-only union copy closure. Original potion predecessors stay pinned above.
// These are exact e887877 helper identities, not CI or device acceptance.
export const potionPointerUnionHelperCopies=[
 {
  "path": "tests/helpers/closeout-source-epoch.mjs",
  "before": "217f68beb3e466b842b8be13c71a9172960f8c07d0f3fc87ee0a8c9e41b33829",
  "after": "1dd29a292fd94386539ca5be29551649ab45611cf6843c8b9714aad28fe45b4b"
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
 },
 {
  "path": "tests/helpers/battle-pointer-inspection-source.mjs",
  "before": null,
  "after": "cbc3c05473bc514f2642ead74a3ce879ab9af6d40a19062f188195b7af3a2a23"
 },
 {
  "path": "tests/helpers/battle-pointer-inspection-source.json.gz",
  "before": null,
  "after": "647685ce68d914a68ea5308308cebe8c0f6ceeefbca2a3698db04e4640dd48f6"
 },
 {
  "path": "tests/helpers/potion-pointer-source.mjs",
  "before": null,
  "after": "76cada4c61d964c5ceae82e1b5150d12864bfa04f5cb4f17dec9c24438f7f793"
 },
 {
  "path": "tests/helpers/potion-pointer-product-bindings.json",
  "before": null,
  "after": "016c3f5095a8556c00b940e72c2f44472dbf481ab0f9dd32511342781c29390e"
 }
];
for(const rows of [mobilePotionHelperCopies,potionRegressionHelperCopies,potionClickHelperCopies,potionPost697HelperCopies,potionPointerUnionHelperCopies])for(const row of rows){
 if(row.path==='tests/helpers/closeout-source-epoch.mjs')continue;
 if(Object.hasOwn(files,row.path))assert.equal(files[row.path],row.after,'same reviewed helper in both parents: '+row.path);
 else {assert.equal(files[row.path]??null,row.before,'exact potion helper-copy predecessor: '+row.path);files[row.path]=row.after;}
}
assert.equal(files['tests/helpers/closeout-source-epoch.mjs'],'d79c667b3a0b2cebf6d248805cd3add5446ce95c62da969a2bdbd21e707e099b','exact pointer711 production copy predecessor');
files['tests/helpers/closeout-source-epoch.mjs']='455d3be5f8a2065387079bf74d5214536943b7fc55e8f506de5d3ded9a7ca5fb';
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

// Preserve the original bounded isolated CI copy checks on the exact new current closure.
import {lstatSync} from 'node:fs';
import {potionPointerB9Packet} from './potion-pointer-b9-integration.mjs';
const ciManifestPath='tests/helpers/potion-pointer-b9-ci-copy-closure.json';
const ciManifestBytes=readFileSync(new URL('./potion-pointer-b9-ci-copy-closure.json',import.meta.url));
assert.equal(hash(ciManifestBytes),'6b482151cd2295ef0fe5cd67a7bb2d8685920f90514dd6c0baae07818f9ecc51','exact CI helper-copy manifest');
const ciManifest=JSON.parse(ciManifestBytes);
assert.equal(ciManifest.schemaVersion,1);
assert.equal(ciManifest.predecessorCommit,'0780e604323bc78139e0fcf3fc68f1b9d78e6ca8');
const ciTrustedCopies=new Map([
 ['tests/helpers/copy-integration-source-closure.mjs',readFileSync(new URL('./copy-integration-source-closure.mjs',import.meta.url))],
 ['tests/helpers/potion-pointer-b9-integration.mjs',readFileSync(new URL('./potion-pointer-b9-integration.mjs',import.meta.url))],
 ['tests/helpers/potion-pointer-b9-integration.json.gz',readFileSync(new URL('./potion-pointer-b9-integration.json.gz',import.meta.url))],
 [ciManifestPath,ciManifestBytes]
]);
assert.equal(hash(integrationClosureBytes('tests/helpers/copy-integration-source-closure.mjs',ciTrustedCopies.get('tests/helpers/copy-integration-source-closure.mjs'))),potionPointerB9Packet.files['tests/helpers/copy-integration-source-closure.mjs'].current.sha256,'current union CI copier identity');
export function copyIntegrationCiClosure(directory,{sourceRoot=process.cwd()}={}){
 const destination=realpathSync.native(directory),origin=realpathSync.native(sourceRoot);
 assert.notEqual(destination,origin,'isolated CI helper copy destination');
 const expected={...ciManifest.files};
 for(const [path,bytes]of ciTrustedCopies){assert(!Object.hasOwn(expected,path),'noncyclic CI copy identity');expected[path]=hash(integrationClosureBytes(path,bytes));}
 const captured=new Map();
 // Validate the complete source before writing any file. No live-tree fallback.
 for(const [path,sha]of Object.entries(expected)){
  assert((path.startsWith('tests/helpers/')||path.startsWith('tests/fixtures/'))&&!path.split('/').includes('..'),'fixed CI helper path');
  const source=join(origin,path);assert(inside(origin,realpathSync.native(source)),'CI helper source escaped');
  assert(!lstatSync(source).isSymbolicLink(),'CI helper source is symlink');
  const content=integrationClosureBytes(path,readFileSync(source));assert.equal(hash(content),sha,'fresh CI helper copy identity: '+path);captured.set(path,content);
 }
 for(const [path,content]of captured){
  const source=join(origin,path),target=join(destination,path);
  for(let parent=dirname(target);parent!==destination;parent=dirname(parent))if(existsSync(parent))assert(!lstatSync(parent).isSymbolicLink(),'CI helper destination parent is symlink');
  mkdirSync(dirname(target),{recursive:true});
  assert(inside(destination,realpathSync.native(dirname(target))),'CI helper destination parent escaped');
  let stat;try{stat=lstatSync(target);}catch(error){if(error.code!=='ENOENT')throw error;}
  if(stat){
   assert(!stat.isSymbolicLink(),'CI helper destination is symlink');
   assert(stat.isFile()&&stat.nlink===1,'CI helper destination must be single-link regular file');
   assert(inside(destination,realpathSync.native(target))&&realpathSync.native(target)!==realpathSync.native(source),'CI helper destination aliases source');
  }
 }
 for(const [path,content]of captured)writeFileSync(join(destination,path),content);
 return captured.size;
}
