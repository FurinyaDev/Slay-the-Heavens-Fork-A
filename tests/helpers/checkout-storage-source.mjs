// Complete pre-migration CI inputs, used only for historical source replay.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';

const hash=(source,algorithm='sha256')=>createHash(algorithm).update(source).digest('hex');
const blob=source=>hash(`blob ${Buffer.byteLength(source)}\0${source}`,'sha1');
const archive=readFileSync(new URL('./checkout-storage-source.json.gz',import.meta.url));
assert.equal(hash(archive),'648d2d6644e8065318d2ad6d86defa1c3a6af37ef7600eed57a82411151ea905','exact checkout storage source receipt');
const {schemaVersion,base,files}=JSON.parse(gunzipSync(archive));
assert.equal(schemaVersion,1);
assert.equal(base,'6492e8dccbcf847a0eba7ad3995da50257032e08');
assert.deepEqual(Object.keys(files),['.gitattributes','config/ci-media-lfs.json','docs/legal/assets.json',
 'scripts/ci-media-lfs.mjs','tests/ci-reviewed-lfs.test.mjs','tests/helpers/fork-preflight-source.mjs']);
for(const [path,{before,after}] of Object.entries(files)){
 assert.equal(hash(before.source),before.sha256,'exact checkout storage predecessor: '+path);
 assert.equal(blob(before.source),before.gitBlob,'exact checkout storage predecessor blob: '+path);
 assert.match(after.sha256,/^[a-f0-9]{64}$/);
 assert.match(after.gitBlob,/^[a-f0-9]{40}$/);
}

export function beforeCheckoutStorageSource(path,source){
 if(!Object.hasOwn(files,path)||typeof source!=='string'||source.includes('\r\r\n'))return source;
 const current=source.replaceAll('\r\n','\n');
 const {before,after}=files[path];
 if(hash(current)!==after.sha256||blob(current)!==after.gitBlob)return source;
 return source.includes('\r\n')?before.source.replaceAll('\n','\r\n'):before.source;
}
