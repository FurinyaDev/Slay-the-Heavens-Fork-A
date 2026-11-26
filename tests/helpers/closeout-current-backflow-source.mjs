import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {restoreExactFixtureHunks} from './exact-fixture-hunks.mjs';
import {exactSourceMatches} from './source-fingerprint.mjs';

const bytes=readFileSync(new URL('../fixtures/closeout-current-backflow-source.json.gz',import.meta.url));
assert.equal(createHash('sha256').update(bytes).digest('hex'),
 'f84c7d844ab54a57b327aed2ed0d6ab2108983ff2f42ecd3c553a82064eefc62','exact current closeout backflow packet');
const {schemaVersion,base,head,files,owners,continuation}=JSON.parse(gunzipSync(bytes));
assert.equal(schemaVersion,1);
assert.equal(base,'903bf2a31e91f10fb24763ab4cea23d586d0bb83');
assert.equal(head,'7228aaa83b0995e1dc6e36955cfd6e773c199f07');
assert.equal(continuation.commit,'3c9837614568f0cd37d926167153727a3f25218e');

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

// The immutable pr612 tooling view reads the exact predecessor of the
// current test fixture. Live Joust still executes the current test bytes.
export function beforeCloseoutJoustCiFixture(path,source){
 if(path!=='tests/joust-event.test.mjs')return source;
 const row=files[path];
 if(!exactSourceMatches(source,{sha256:row.afterSha256,gitBlob:row.afterBlob}))return source;
 const lf=source.replaceAll('\r\n','\n');
 if(source!==lf&&source!==lf.replaceAll('\n','\r\n'))return source;
 const prior=restoreExactFixtureHunks({...row,path},path,source);
 assert(exactSourceMatches(prior,{sha256:row.beforeSha256,gitBlob:row.beforeBlob}),'exact pr612 Joust fixture predecessor');
 return source===lf?prior:prior.replaceAll('\n','\r\n');
}

// These are reads of the original frozen Closeout hashes. Verify the live
// Joust projection's linked production cohort before reconstructing old bytes.
export function readCloseoutCurrentBackflowReceipt(path,digest,read){
 if(!Object.hasOwn(files,path)||files[path].beforeSha256!==digest)return;
 const row=files[path];
 const source=readExactOwner(path,{sha256:row.afterSha256,gitBlob:row.afterBlob},read);
 // The Guardian subtitle advances five linked sources as one reviewed unit.
 // Select the revision from a fresh owner and reject mixed revisions.
 const successor=continuation.owners;
 const [markerPath,markerBinding]=Object.entries(successor)[0];
 const marker=read(markerPath,'utf8');
 const current=exactSourceMatches(marker,markerBinding)?successor:{};
 for(const [owner,binding] of Object.entries(owners)){
  const live=readExactOwner(owner,current[owner]??binding,read);
  if(owner===path)assert.equal(live,source,'closeout owner changed during the receipt read: '+path);
  if(owner===markerPath)assert.equal(live,marker,'closeout owner changed during the receipt read: '+owner);
 }
 const prior=restoreExactFixtureHunks({...row,path},path,source);
 assert(exactSourceMatches(prior,{sha256:row.beforeSha256,gitBlob:row.beforeBlob}),'exact current closeout predecessor: '+path);
 return prior;
}
