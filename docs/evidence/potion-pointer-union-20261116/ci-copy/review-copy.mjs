import assert from'node:assert/strict';import{mkdtempSync,readFileSync,writeFileSync,mkdirSync,rmSync,readdirSync,symlinkSync,linkSync,statSync}from'node:fs';import{tmpdir}from'node:os';import{join,dirname,resolve}from'node:path';import{pathToFileURL}from'node:url';
const{copyIntegrationCiClosure:copy}=await import(pathToFileURL(resolve('tests/helpers/copy-integration-source-closure.mjs')));
const root=mkdtempSync(join(tmpdir(),'review-ci-copy-')),src=join(root,'source');mkdirSync(src);let n=0;
const dest=()=>{const p=join(root,'d'+n);mkdirSync(p);return p;};
try{
 const count=copy(src);assert(count>180);n++;
 for(const p of ['tests/helpers/copy-integration-source-closure.mjs','tests/helpers/potion-pointer-ci-union.mjs','tests/helpers/potion-pointer-ci-union.json.gz','tests/helpers/potion-pointer-ci-copy-closure.json','tests/helpers/run-hud-ci-source.mjs']){
  const file=join(src,p),original=readFileSync(file);writeFileSync(file,Buffer.concat([original,Buffer.from('\n')]));const d=dest();assert.throws(()=>copy(d,{sourceRoot:src}),/fresh CI helper copy identity/);assert.deepEqual(readdirSync(d),[]);writeFileSync(file,original);n++;
 }
 const helper='tests/helpers/closeout-source-epoch.mjs',file=join(src,helper),original=readFileSync(file);const external=join(root,'outside');mkdirSync(external);const outside=join(external,'same.mjs');writeFileSync(outside,original);rmSync(file);symlinkSync(outside,file);assert.throws(()=>copy(dest(),{sourceRoot:src}),/source escaped/);rmSync(file);writeFileSync(file,original);n++;
 let d=dest();mkdirSync(join(d,'tests'));symlinkSync(external,join(d,'tests/helpers'));assert.throws(()=>copy(d,{sourceRoot:src}),/destination/);assert.deepEqual(readdirSync(external),['same.mjs']);n++;
 // A target hardlink must not normalize and mutate its source counterpart.
 writeFileSync(file,original.toString('utf8').replaceAll('\r\n','\n').replaceAll('\n','\r\n'));const crlf=readFileSync(file);d=dest();mkdirSync(dirname(join(d,helper)),{recursive:true});linkSync(file,join(d,helper));assert.equal(statSync(file).ino,statSync(join(d,helper)).ino);assert.throws(()=>copy(d,{sourceRoot:src}),e=>{assert.equal(e.message,'CI helper destination must be single-link regular file');return true;});assert.deepEqual(readFileSync(file),crlf);rmSync(join(d,helper));writeFileSync(file,original);n++;
 assert.throws(()=>copy(src,{sourceRoot:src}),/isolated/);n++;
 d=dest();assert.equal(copy(d,{sourceRoot:src}),count);for(const p of ['tests/helpers/potion-pointer-ci-union.json.gz','tests/helpers/potion-pointer-ci-copy-closure.json'])assert.deepEqual(readFileSync(join(d,p)),readFileSync(join(src,p)));n++;
 console.log('Independent CI-copy PASS',n,'checks: full fixed copy, captured trust-root drift, post-warm helper drift, no partial writes on bad source, source/destination escape, hardlink alias with CRLF preservation, same-root and copy-from-copy.');
}finally{rmSync(root,{recursive:true,force:true});}
