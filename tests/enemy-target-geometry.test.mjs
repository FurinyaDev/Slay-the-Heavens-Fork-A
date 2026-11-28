import test from 'node:test';
import assert from 'node:assert/strict';
import {runLua} from '../scripts/test-lua.mjs';

test('enemy reticle, native hitbox and overlap agree with the runtime geometry', () => {
  const result = runLua('tests/lua/enemy_target_geometry.lua');
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /enemy target geometry passed/);
});
