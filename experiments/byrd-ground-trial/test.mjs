import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildLuaData } from '../../scripts/build-lua-data.mjs';
import { buildUI } from '../../scripts/build-ui.mjs';

const require = createRequire(import.meta.url);
const output = mkdtempSync(join(tmpdir(), 'sth-byrd-ground-proof-'));
try {
  buildUI(output, undefined, { officialAssets: true, refinedReleaseMonsterArt: true, nativePageLifecycle: true });
  buildLuaData('data', join(output, 'abyss_data.lua'));
  const lua = require.resolve('fengari-node-cli/src/lua-cli.js');
  const searchPath = output.replaceAll('\\', '/') + '/?.lua;./src/lua/?.lua;;';
  const run = spawnSync(process.execPath, [lua, '-e', "dofile('tests/lua/support/byrd_ground_trial.lua')"], {
    env: { ...process.env, LUA_PATH: searchPath, LUA_PATH_5_3: searchPath, LUA_INIT: '', LUA_INIT_5_3: '' },
    stdio: 'inherit',
    timeout: 120_000,
  });
  if (run.error) throw run.error;
  process.exitCode = run.status ?? 1;
} finally {
  rmSync(output, { recursive: true, force: true });
}
