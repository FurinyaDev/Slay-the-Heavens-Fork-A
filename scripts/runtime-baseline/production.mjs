import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {dirname, join, resolve} from 'node:path';
import {parseArgs} from 'node:util';
import {prepareProductionInputs, productionPhases} from './production-inputs.mjs';
import {luaString} from '../build-lua-data.mjs';
import {validateSample, percentile} from '../benchmark-runtime-path.mjs';
import {lfsArguments, lfsEnvironment} from '../ci-reviewed-lfs.mjs';
import {gitSourceIdentity} from '../release-notes.mjs';

const {values} = parseArgs({options: {output: {type: 'string', default: 'build/performance-regression/production.json'}}});
const reportPath = resolve(values.output);
rmSync(reportPath, {force: true});
mkdirSync(dirname(reportPath), {recursive: true});
const directory = mkdtempSync(join(dirname(reportPath), 'production-'));
process.on('exit', () => rmSync(directory, {recursive: true, force: true}));
const {sourceCommit} = gitSourceIdentity();
const tree = spawnSync('git', ['rev-parse', 'HEAD^{tree}'], {encoding: 'utf8'});
assert(sourceCommit && tree.status === 0 && /^[a-f0-9]{40}$/.test(tree.stdout.trim()),
  'Production Host requires a Git source identity');
const inputDirectories = ['art', 'config', 'data', 'docs', 'scripts', 'src', 'tests', 'tools'];
const env = lfsEnvironment();
function materialInputsChanged() {
  // CI restores verified media from its bundle, which changes worktree stat
  // sizes even when the LFS-clean bytes match the candidate's index pointers.
  const filters = lfsArguments.slice(0, lfsArguments.indexOf('lfs'));
  const tracked = spawnSync('git', [...filters, 'diff', '--quiet', 'HEAD', '--'], {env});
  const extra = spawnSync('git', ['ls-files', '--others', '--exclude-standard', '-z', '--', ...inputDirectories], {env});
  assert([0, 1].includes(tracked.status) && extra.status === 0, 'Unable to check Production Host inputs');
  return tracked.status === 1 || extra.stdout.length !== 0;
}
const source = {sourceCommit, sourceDirty: materialInputsChanged()};
function verifyCandidate() {
  if (process.env.GITHUB_ACTIONS !== 'true') return;
  assert.equal(sourceCommit, process.env.GITHUB_SHA, 'Production Host ran outside the CI candidate');
  assert.equal(gitSourceIdentity().sourceCommit, sourceCommit, 'Production Host checkout changed during measurement');
  assert(!source.sourceDirty && !materialInputsChanged(), 'Production Host requires clean CI inputs');
}
verifyCandidate();
const options = await prepareProductionInputs(directory);

const samples = [];
for (let i = 0; i < 3; i++) {
  const result = spawnSync(process.execPath, ['scripts/runtime-baseline/worker.mjs', directory], {
    encoding: 'utf8', timeout: 90_000, maxBuffer: 4 * 1024 * 1024,
  });
  assert(result.status === 0 && !result.error, [result.error, result.stderr, result.stdout].filter(Boolean).join('\n'));
  const lines = result.stdout.split('\n');
  const prefix = 'RUNTIME_BASELINE_JSON ';
  const records = lines.filter(line => line.startsWith(prefix));
  assert.equal(records.length, 1);
  assert(lines.includes('PRODUCTION_HOST_PASS seed=42'));
  const sample = validateSample(JSON.parse(records[0].slice(prefix.length)), productionPhases);
  const cold = sample.rows.find(row => row.phase === 'cold-start');
  assert(cold.nativeMethods.GetChild > 0 && cold.nativeMethods.GetChildren > 0, 'missing startup native query counts');
  samples.push(sample);
  console.log(lines.filter(line => line.startsWith('PRODUCTION ')).join('\n'));
}
// Run the existing product assertions directly against current generated
// controls even when the historical menu-layout digest reports drift.
const require = createRequire(import.meta.url);
const path = luaString(directory.replaceAll('\\', '/') + '/?.lua;src/lua/?.lua');
const ui = spawnSync(process.execPath, [require.resolve('fengari-node-cli/src/lua-cli.js'), '-e',
  `package.path=${path};dofile('tests/lua/support/sts_ui_closeout.lua')`],
  {encoding: 'utf8', timeout: 60_000, maxBuffer: 4 * 1024 * 1024});
assert(ui.status === 0 && !ui.error && ui.stdout.includes('STS_UI_CLOSEOUT_PASS'),
  [ui.error, ui.stderr, ui.stdout].filter(Boolean).join('\n'));
console.log('STS_UI_CLOSEOUT_PASS');

const generated = createHash('sha256');
for (const name of readdirSync(directory).filter(name => name.endsWith('.lua')).sort()) {
  const digest = createHash('sha256').update(readFileSync(join(directory, name))).digest('hex');
  generated.update(JSON.stringify([name, digest]));
}
const report = {
  status: 'OFFLINE_HOST_PASS',
  ...source, sourceTree: tree.stdout.trim(), seed: 42, officialClient: 'UNVERIFIED',
  environment: {node: process.version, platform: process.platform, arch: process.arch},
  configuration: options, generatedLuaSha256: generated.digest('hex'),
  samples, phases: Object.fromEntries(productionPhases.map((name, i) => {
    const values = samples.map(sample => sample.rows[i].elapsedMs);
    return [name, {p50Ms: percentile(values, .5), maxMs: Math.max(...values)}];
  })),
};
verifyCandidate();
writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({status: report.status, ...source, sourceTree: report.sourceTree,
  configuration: options, generatedLuaSha256: report.generatedLuaSha256, environment: report.environment,
  officialClient: report.officialClient}));
console.log(JSON.stringify(report.phases));
