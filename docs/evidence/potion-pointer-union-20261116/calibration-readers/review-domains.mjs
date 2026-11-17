import assert from'node:assert/strict';import{readFileSync}from'node:fs';import{pathToFileURL}from'node:url';import{resolve}from'node:path';
const imp=f=>import(pathToFileURL(resolve('tests/helpers/'+f+'.mjs')));
const i=await imp('integrated-ci-source'),c=await imp('closeout-ci-source'),h=await imp('run-hud-ci-source'),s=await imp('sts-style-ci-source'),j=await imp('joint-ui-ci-source-inverse'),m=await imp('menu-red-ci-source'),u=await imp('potion-pointer-ci-union');
const{discoverJs}=await import(pathToFileURL(resolve('scripts/ci-shards.mjs')));let n=0;
const badPath=(target)=>(p,e)=>{const b=readFileSync(p,e);return p===target?typeof b==='string'?b+'\n':Buffer.concat([b,Buffer.from('\n')]):b;};
const historical=u.potionPointerCiUnionRead('potion',readFileSync,{production:true});
const entry=[
 ['integrated',(r,raw)=>i.integratedPriorInventory([],'sts','js',r,raw)],
 ['closeout',(r,raw)=>c.closeoutInventory([],'pr620',r,raw)],
 ['hud',(r,raw)=>h.runHudPriorInventory([],r,raw)],
 ['sts',(r,raw)=>s.stsStylePriorInventory([],r,raw)],
 ['joint',(r,raw)=>j.jointCiInventoryAt([],'officialAssetsFlow',r,'pr620',raw)],
 ['ratchet',(r,raw)=>j.preRatchetInventory([],r,raw)],
 ['menu',(r,raw)=>m.menuRedPriorLua([],r,raw)]
];
for(const[name,call]of entry){
 assert.throws(()=>call(historical,badPath('config/architecture.json')),/fresh union owner config\/architecture.json/,name+' explicit raw-current drift');n++;
 assert.throws(()=>call(badPath('config/architecture.json'),undefined),/fresh union owner config\/architecture.json/,name+' omitted current must retain caller');n++;
 assert.throws(()=>call(historical,badPath('tests/helpers/menu-red-ci-source.mjs')),/fresh union input tests\/helpers\/menu-red-ci-source.mjs/,name+' noncaller new input drift');n++;
}
const paths=discoverJs(),first=i.integratedPriorInventory(paths,'sts','js',historical,readFileSync);assert(first.length>0&&first.length<paths.length);n++;
const cold=i.integratedPriorInventory(paths,'sts','js',historical,readFileSync);first[0]='tamper';assert.notDeepEqual(first,cold);n++;
const changed=s.stsStyleCiProof.addedTests[0];const badHistory=(p,e)=>{const b=historical(p,e);return p===changed?typeof b==='string'?b+'\n':Buffer.concat([b,Buffer.from('\n')]):b;};
assert.throws(()=>s.stsStylePriorInventory(paths,badHistory,readFileSync),/inventory source/);n++;
assert.throws(()=>i.integratedPriorInventory(paths,'sts','js',historical,badPath('tests/helpers/potion-pointer-ci-before-readers.json.gz')),/fresh pre-readers union/);n++;
assert.deepEqual(i.integratedPriorInventory(paths,'sts','js',historical,readFileSync),cold);n++;
assert.throws(()=>s.assertStsStyleCiCurrent([],badPath('config/architecture.json')),/fresh union owner config\/architecture.json/);n++;

const binaryPath='tests/helpers/menu-red-production-source.json.gz';
const binary=i.integratedRead('menu',{read:readFileSync,currentRead:readFileSync})(binaryPath);assert(Buffer.isBuffer(binary));n++;
assert.throws(()=>i.integratedRead('menu',{read:readFileSync,currentRead:badPath('config/architecture.json')})(binaryPath),/fresh union owner config\/architecture.json/);n++;
const savedPath=i.integratedCiProof.binaryViews[binaryPath].views.menu.path;
assert.throws(()=>i.integratedRead('menu',{read:badPath(savedPath),currentRead:readFileSync})(binaryPath),/complete immutable integration binary predecessor/);n++;
const corrupt=badPath(binaryPath);assert.deepEqual(i.integratedRead('menu',{read:corrupt,currentRead:readFileSync})(binaryPath),corrupt(binaryPath));n++;

console.log('Independent explicit reader-domain PASS',n,'checks: seven entry points propagate supplied raw-current, omitted raw retains caller, noncaller drift, historical mutation, binary archive freshness, recovery and array isolation.');
