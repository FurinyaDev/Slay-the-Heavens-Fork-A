import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {restoreExactFixtureHunks} from './exact-fixture-hunks.mjs';
import {exactSourceMatches} from './source-fingerprint.mjs';

function readPacket(name,digest,base,head){
 const bytes=readFileSync(new URL(`../fixtures/${name}.json.gz`,import.meta.url));
 assert.equal(createHash('sha256').update(bytes).digest('hex'),digest,'exact closeout Lua source packet: '+name);
 const packet=JSON.parse(gunzipSync(bytes));
 assert.equal(packet.schemaVersion,1);
 assert.equal(packet.base,base);
 assert.equal(packet.head,head);
 return packet.files;
}

const vocabulary=readPacket('closeout-lua-vocabulary-source',
 '09e76062cb37be9e4adc50116ba16dab01e2e35e8e5a75cf13f31fa9969633e7',
 '7348ab8598c8607712d525bd732239f89bb52830','b2f74d99a3d80e60b99165b6380987cda8b4488d');
const backflow=readPacket('closeout-lua-backflow-source',
 'fa68ecd91ff928598642c04a6a761a3a23d6120980a0fe6cd208a34b4cd198f7',
 '903bf2a31e91f10fb24763ab4cea23d586d0bb83','7228aaa83b0995e1dc6e36955cfd6e773c199f07');

function receiptFor(files,path,digest){
 if(!Object.hasOwn(files,path))return;
 const row=files[path];
 return digest===row.beforeSha256?row:undefined;
}

// The backflow packet carries the reviewed live successor for paths that moved
// beyond #951 and wires the genuine merchant fixture rename to the old receipt.
// Only an exact receipt digest and live Git identity authorize an older read.
export function readCloseoutLuaVocabularyReceipt(path,digest,readCurrent){
 const row=receiptFor(backflow,path,digest)??receiptFor(vocabulary,path,digest);
 if(!row)return;
 const sourcePath=row.sourcePath??path;
 if(sourcePath!==path)assert.throws(()=>readCurrent(path,'utf8'),{code:'ENOENT'},'renamed closeout Lua receipt input reappeared: '+path);
 const source=readCurrent(sourcePath,'utf8');
 const continuation=row.continuation;
 const continued=continuation&&exactSourceMatches(source,continuation);
 const current={sha256:row.afterSha256,gitBlob:row.afterBlob};
 assert(continued||exactSourceMatches(source,current),'current closeout Lua receipt input changed: '+path);
 const lf=source.replaceAll('\r\n','\n');
 assert(source===lf||source===lf.replaceAll('\n','\r\n'),'mixed closeout Lua receipt line endings: '+path);
 const predecessor=continued?restoreExactFixtureHunks({path,beforeSha256:current.sha256,
  afterSha256:continuation.sha256,hunks:continuation.hunks},path,lf):lf;
 assert(exactSourceMatches(predecessor,current),'exact closeout Lua continuation predecessor: '+path);
 const prior=restoreExactFixtureHunks({...row,path},path,predecessor);
 assert(exactSourceMatches(prior,{sha256:row.beforeSha256,gitBlob:row.beforeBlob}),
  'exact closeout Lua receipt predecessor: '+path);
 return prior;
}
