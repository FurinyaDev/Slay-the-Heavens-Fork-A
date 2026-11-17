import assert from 'node:assert/strict';
import {readFileSync as read} from 'node:fs';
import {assertPotionPointerCiUnionCurrent as verify,potionPointerCiUnionRead as view} from '../../../..//tests/helpers/potion-pointer-ci-union.mjs';
const paths=['tests/mobile-card-release.test.mjs','tests/lua/support/battle_pointer_identity_cases.lua','tests/lua/support/battle_sparse_pointer_cases.lua'];
verify();let n=1;
for(const path of paths){for(const kind of ['missing','empty','drift']){const bad=(p,e)=>{if(p!==path)return read(p,e);if(kind==='missing')throw new Error('missing fixture');return e?(kind==='empty'?'':'--wrong'):Buffer.from(kind==='empty'?'':'--wrong');};assert.throws(()=>verify(bad));n++;}verify();n++;}
assert.equal(view('potion')('tests/mobile-card-release.test.mjs','utf8').match(/test\('/g).length,1);n++;
assert.equal(view('pointer')('tests/mobile-card-release.test.mjs','utf8'),read('tests/mobile-card-release.test.mjs','utf8'));n++;
console.log('PASS independent',n,'current mutation/recovery and parent-view controls');
