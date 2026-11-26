import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {restoreExactFixtureHunks} from './exact-fixture-hunks.mjs';
import {exactSourceMatches} from './source-fingerprint.mjs';

const bytes=readFileSync(new URL('../fixtures/closeout-current-backflow-source.json.gz',import.meta.url));
assert.equal(createHash('sha256').update(bytes).digest('hex'),
 '172c9233f6a8a5db62d55e43bc8c2751763e5db09176902a10abda2bf89d5da9','exact current closeout backflow packet');
const {schemaVersion,base,head,files,owners}=JSON.parse(gunzipSync(bytes));
assert.equal(schemaVersion,1);
assert.equal(base,'903bf2a31e91f10fb24763ab4cea23d586d0bb83');
assert.equal(head,'7228aaa83b0995e1dc6e36955cfd6e773c199f07');

function readExactOwner(path,binding,read){
 if(binding===null){
  assert.throws(()=>read(path,'utf8'),{code:'ENOENT'},'retired closeout owner reappeared: '+path);
  return;
 }
 const source=read(path,'utf8');
 assert(exactSourceMatches(source,binding),'fresh current closeout owner: '+path);
 const lf=source.replaceAll('\r\n','\n');
 assert(source===lf||source===lf.replaceAll('\n','\r\n'),'mixed closeout source line endings: '+path);
 return source;
}

// These are reads of the original frozen Closeout hashes. Verify the live
// Joust projection's linked production cohort before reconstructing old bytes.
export function readCloseoutCurrentBackflowReceipt(path,digest,read){
 if(!Object.hasOwn(files,path)||files[path].beforeSha256!==digest)return;
 const row=files[path];
 const source=readExactOwner(path,{sha256:row.afterSha256,gitBlob:row.afterBlob},read);
 for(const [owner,binding] of Object.entries(owners)){
  const live=readExactOwner(owner,binding,read);
  if(owner===path)assert.equal(live,source,'closeout owner changed during the receipt read: '+path);
 }
 const prior=restoreExactFixtureHunks({...row,path},path,source);
 assert(exactSourceMatches(prior,{sha256:row.beforeSha256,gitBlob:row.beforeBlob}),'exact current closeout predecessor: '+path);
 return prior;
}
