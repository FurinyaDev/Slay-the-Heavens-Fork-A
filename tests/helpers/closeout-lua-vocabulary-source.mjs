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
 'a9b4b58832c0822f591b3af44ecbb1395efdceca6bb30fa16034e393fd5b9d03',
 '7348ab8598c8607712d525bd732239f89bb52830','b2f74d99a3d80e60b99165b6380987cda8b4488d');
const backflow=readPacket('closeout-lua-backflow-source',
 '820ad57a42fa899c4ba7c92f9dcb4ce601c2ffa5699ea2488f189db617278580',
 '903bf2a31e91f10fb24763ab4cea23d586d0bb83','7228aaa83b0995e1dc6e36955cfd6e773c199f07');
const floorSources=readPacket('closeout-planning-floor-source',
 '64f1e0473854162933cf02650519ad07ce99306905344722baf5eea2b6f5da93',
 '1eb288472d7b33b7450eec97a624ca2ffa526f39','863c0983b4d8cad1c7a77391f860ba038e3cb6d4');

function receiptFor(files,path,digest){
 if(!Object.hasOwn(files,path))return;
 const row=files[path];
 return digest===row.beforeSha256?row:undefined;
}

function floorReceipt(path,digest){
 if(!Object.hasOwn(floorSources,path))return;
 const rows=floorSources[path];
 return Object.hasOwn(rows,digest)?rows[digest]:undefined;
}

// The backflow packet carries the reviewed live successor for paths that moved
// beyond #951 and wires the genuine merchant fixture rename to the old receipt.
// Formation and Golden Idol costs retain their own exact source inputs.
// Only an exact receipt digest and live Git identity authorize an older read.
export function readCloseoutLuaVocabularyReceipt(path,digest,readCurrent){
 const row=receiptFor(backflow,path,digest)??receiptFor(vocabulary,path,digest)??floorReceipt(path,digest);
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
