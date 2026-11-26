import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { luaString } from './build-lua-data.mjs';

const require = createRequire(import.meta.url);
const fixture = 'tests/lua/selected_hand_safe_area.lua';
export const productScopePass = 'ok wide selected hand ignores enemy health geometry';
export const requiresProductScope = plan => plan?.version === 'v2.2.0' && plan.main === 'TASK-115';

export function runProductScopeProbe(dir, { source = false } = {}) {
  const paths = [join(dir, '?.lua'), ...(source ? ['src/lua/?.lua'] : [])].join(';').replaceAll('\\', '/');
  // The fixture adds its ordinary developer lookup paths. The frozen runner
  // resolves every runtime require against the selected inputs only.
  const entry = `
    local lua = package.searchers[2]
    package.searchers = {function(name)
      package.path = ${luaString(paths)}
      return lua(name)
    end}
    assert(require('abyss_theme').presentationProfile == 'official-assets-first', 'invalid product-scope profile')
    dofile(${luaString(fixture)})
  `;
  const result = spawnSync(process.execPath, [require.resolve('fengari-node-cli/src/lua-cli.js'), '-e', entry], {
    encoding: 'utf8', timeout: 60_000, env: { ...process.env, LUA_INIT: '', LUA_INIT_5_3: '' },
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(result.stderr.trim() || `Product-scope Lua exit ${result.status ?? result.signal}`);
  if (!result.stdout.trim().split(/\r?\n/).includes(productScopePass)) throw new Error('Product-scope probe did not verify health geometry independence');
  return productScopePass;
}

export async function verifyReleaseProductScope({ gil, reader } = {}) {
  const git = (...args) => execFileSync('git', ['--no-replace-objects', ...args], { encoding: 'utf8' }).trim();
  const head = git('rev-parse', 'HEAD'), tree = git('rev-parse', 'HEAD^{tree}');
  const dir = mkdtempSync(join(tmpdir(), 'sth-release-product-'));
  try {
    git('diff', '--quiet', 'HEAD', '--');
    if (git('ls-files', '--others', '--exclude-standard', '--', 'src', 'data', 'config', 'scripts', 'tests')) {
      throw new Error('Untracked product-scope inputs');
    }
    let readback;
    if (gil) {
      const { prepareGilProductionInputs } = await import('./runtime-baseline/gil-inputs.mjs');
      readback = await prepareGilProductionInputs(dir, resolve(gil), resolve(reader));
    } else {
      const [{ buildLuaData }, { buildUI }, { nativeAudioBuildArgs }] = await Promise.all([
        import('./build-lua-data.mjs'), import('./build-ui.mjs'), import('./build-native-audio-game.mjs'),
      ]);
      const { options } = nativeAudioBuildArgs(['offline.gil', '--work-key=offline-product-scope']);
      if (!options.officialAssets || !options.nativePageLifecycle || !options.refinedReleaseMonsterArt) {
        throw new Error('Product comparison requires the formal production preset');
      }
      buildLuaData('data', join(dir, 'abyss_data.lua'));
      buildUI(dir, undefined, options);
    }
    const check = readback?.productScope ?? runProductScopeProbe(dir, { source: !gil });
    git('diff', '--quiet', 'HEAD', '--');
    if (git('rev-parse', 'HEAD') !== head) throw new Error('Product-scope source changed during verification');
    return { head, tree, profile: 'official-assets-first', check,
      ...(readback && { gilSha256: readback.gilSha256, moduleDigestsSha256: readback.moduleDigestsSha256 }) };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const [gil, reader, ...extra] = process.argv.slice(2);
    if (Boolean(gil) !== Boolean(reader) || extra.length) throw new Error('Provide both formal GIL and pinned native reader, or neither');
    console.log(JSON.stringify(await verifyReleaseProductScope({ gil, reader }), null, 2));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
