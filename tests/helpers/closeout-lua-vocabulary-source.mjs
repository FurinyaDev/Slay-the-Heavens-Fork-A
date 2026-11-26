import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {restoreExactFixtureHunks} from './exact-fixture-hunks.mjs';
import {exactSourceMatches} from './source-fingerprint.mjs';

const bytes=readFileSync(new URL('../fixtures/closeout-lua-vocabulary-source.json.gz',import.meta.url));
assert.equal(createHash('sha256').update(bytes).digest('hex'),
 '09e76062cb37be9e4adc50116ba16dab01e2e35e8e5a75cf13f31fa9969633e7','exact #951 closeout Lua source packet');
const {schemaVersion,base,head,files}=JSON.parse(gunzipSync(bytes));
assert.equal(schemaVersion,1);
assert.equal(base,'7348ab8598c8607712d525bd732239f89bb52830');
assert.equal(head,'b2f74d99a3d80e60b99165b6380987cda8b4488d');

// Each entry binds a closeout receipt's original digest to the exact #951
// successor. Live Lua execution and other receipt epochs retain their readers.
export function readCloseoutLuaVocabularyReceipt(path,digest,readCurrent){
 const row=Object.hasOwn(files,path)?files[path]:undefined;
 if(!row||digest!==row.beforeSha256)return undefined;
 const source=readCurrent(path,'utf8');
 assert(exactSourceMatches(source,{sha256:row.afterSha256,gitBlob:row.afterBlob}),
  'current closeout Lua receipt input changed: '+path);
 const lf=source.replaceAll('\r\n','\n');
 assert(source===lf||source===lf.replaceAll('\n','\r\n'),'mixed closeout Lua receipt line endings: '+path);
 const prior=restoreExactFixtureHunks({...row,path},path,lf);
 assert(exactSourceMatches(prior,{sha256:row.beforeSha256,gitBlob:row.beforeBlob}),
  'exact #951 closeout Lua receipt predecessor: '+path);
 return prior;
}
