import assert from 'node:assert/strict';
import test from 'node:test';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildLuaData, luaString } from '../scripts/build-lua-data.mjs';
import { buildUI } from '../scripts/build-ui.mjs';
import { mapLayout } from '../scripts/map-ui-layout.mjs';

const require = createRequire(import.meta.url);

test('official two-act boss emblems fit both viewports and the original pointer targets', () => {
  const groupNodes = mapLayout().controls[1].children[0].children.flatMap(group => group.children);
  const rooms = groupNodes.filter(node => /^node\d+$/.test(node.name));
  assert.equal(rooms.length, 92);
  assert.equal(groupNodes.filter(node => /^edge\d+$/.test(node.name)).length, 126);
  for (const room of rooms) {
    assert.equal(room.children.find(child => child.name === 'icon').raycastTarget, false);
    assert.deepEqual(room.children.find(child => child.name === 'hit').size, [56, 56]);
  }

  const dir = mkdtempSync(join(tmpdir(), 'map-boss-emblems-'));
  try {
    buildLuaData('data', join(dir, 'abyss_data.lua'));
    buildUI(dir, undefined, { officialAssets: true, nativePageLifecycle: true });
    const script = `package.path=${luaString(dir.replaceAll('\\','/')+'/?.lua;src/lua/?.lua;')}..package.path
dofile('tests/lua/support/map_boss_emblem.lua')`;
    const result = spawnSync(process.execPath, [require.resolve('fengari-node-cli/src/lua-cli.js'), '-e', script],
      { encoding: 'utf8', timeout: 60000 });
    assert.ifError(result.error);
    assert.equal(result.status, 0, result.stdout + result.stderr);
    assert.equal((result.stdout.match(/^PASS BOSS_EMBLEM /gm) ?? []).length, 12);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
