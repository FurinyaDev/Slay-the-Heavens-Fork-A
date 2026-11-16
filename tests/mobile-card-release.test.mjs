import test from 'node:test';
import assert from 'node:assert/strict';
import {runLua} from '../scripts/test-lua.mjs';
test('mobile drag release clears invalid selections and preserves desktop target carry',()=>{
 const result=runLua('tests/lua/mobile_card_release.lua');
 assert.equal(result.status,0,result.stdout+result.stderr);
 assert.match(result.stdout,/MOBILE_CARD_RELEASE 7 passed; 0 failed/);
});

test('released pointer identity survives mixed Click metadata without admitting stale or overlapping input',()=>{
 const result=runLua('tests/lua/support/battle_pointer_identity_cases.lua');
 assert.equal(result.status,0,result.stdout+result.stderr);
 assert.match(result.stdout,/BATTLE_POINTER_IDENTITY 26 passed; 0 failed/);
});

test('coalesced PC and touch release uses the real Down sample and cannot replay its tail',()=>{
 const result=runLua('tests/lua/support/battle_sparse_pointer_cases.lua');
 assert.equal(result.status,0,result.stdout+result.stderr);
 assert.match(result.stdout,/BATTLE_SPARSE_POINTER 2 passed/);
});
