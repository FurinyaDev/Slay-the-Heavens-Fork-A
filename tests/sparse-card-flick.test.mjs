import test from 'node:test';
import assert from 'node:assert/strict';
import {runLua} from '../scripts/test-lua.mjs';

for(const [script,marker] of [
 ['tests/lua/sparse_card_flick.lua','SPARSE_CARD_FLICK_PASS 12'],
 ['tests/lua/sparse_card_flick_safety.lua','SPARSE_CARD_FLICK_SAFETY_PASS 8'],
])test(`sparse native card release: ${script}`,()=>{
 const result=runLua(script);
 assert.equal(result.status,0,result.stdout+result.stderr);
 assert.ok(result.stdout.includes(marker),result.stdout);
});
