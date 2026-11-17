import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {potionPointerCiUnionPacket as packet,assertPotionPointerCiUnionCurrent as current,withPotionPointerCiUnionValidation as scope} from '../../../../tests/helpers/potion-pointer-ci-union.mjs';
let checks=0;
const paths=['tests/mobile-card-release.test.mjs','tests/lua/support/battle_pointer_identity_cases.lua','tests/lua/support/battle_sparse_pointer_cases.lua'];
for(const p of paths){assert.deepEqual(readFileSync(p),execFileSync('git',['show',`ad6fe84dbcc11e28e8a82258f889a6841b46c8c6:${p}`]));checks++;}
current();checks++;
for(const p of [...paths,'tests/helpers/potion-pointer-ci-before-behavior.json.gz']){
 for(const kind of ['missing','empty','drift','null']){
  const read=(q,e)=>{if(q!==p)return readFileSync(q,e);if(kind==='missing')throw Error('missing '+p);if(kind==='null')return null;const b=kind==='empty'?Buffer.alloc(0):Buffer.concat([readFileSync(q),Buffer.from('\n')]);return e?b.toString(e):b;};
  assert.throws(()=>current(read),kind==='missing'?new RegExp('missing '+p.replaceAll('.','\\.')):kind==='null'?TypeError:new RegExp(p.endsWith('json.gz')?'fresh pre-behavior union':'fresh union input '+p.replaceAll('.','\\.')));checks++;
 }
}
current((p,e)=>{const b=readFileSync(p,e);return typeof b==='string'?b.replaceAll('\n','\r\n'):b;});checks++;
let escaped;scope('pointer',readFileSync,(read,snapshot)=>{escaped=snapshot;for(const p of paths)assert.deepEqual(read(p),execFileSync('git',['show',`ad6fe84:${p}`]));});checks++;
assert.throws(()=>escaped(paths[0]),/escaped synchronous scope/);checks++;
current();checks++;
console.log(JSON.stringify({status:'PASS',checks,inputs:Object.keys(packet.files).length,originalPointerFiles:3}));
