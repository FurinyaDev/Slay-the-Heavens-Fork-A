import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { matchesGlob } from 'node:path';
import test from 'node:test';
import { compareSamples, lockfileIdentity, matchingResourceCaps, parseResources, profiles, selectResourceReference } from '../../scripts/runtime-baseline/resource-receipt.mjs';

test('pull requests changing battle scene and viewport inputs run Fast performance diagnostics', () => {
  const workflow = readFileSync(new URL('../../.github/workflows/performance-regression.yml', import.meta.url), 'utf8')
    .replaceAll('\r\n', '\n');
  const pullRequest = workflow.match(/^  pull_request:\n((?:    [^\n]*\n)+)/m)?.[1];
  assert.ok(pullRequest, 'pull_request event');
  const paths = pullRequest.match(/^    paths:\n((?:      - [^\n]+\n)+)/m)?.[1] ?? '';
  const patterns = [...paths.matchAll(/^      - '([^']+)'$/gm)].map(([, pattern]) => pattern);
  const selects = path => patterns.some(pattern => matchesGlob(path, pattern));
  const existingInputs = [
    '.github/workflows/performance-regression.yml',
    'scripts/runtime-baseline/worker.mjs',
    'scripts/build-ui.mjs',
    'scripts/monster-art.mjs',
    'src/lua/abyss_map_ui.lua',
    'src/lua/abyss_ui.lua',
    'src/lua/abyss_battle_ui.lua',
    'src/lua/abyss_deck_ui.lua',
    'src/lua/abyss_page_reveal.lua',
    'tests/benchmarks/resource-suite.test.mjs',
    'tests/release-performance.test.mjs',
  ];
  const battlePresentationInputs = [
    'data/presentation/native-monster-art.json',
    'data/presentation/ui_theme.json',
    'data/release/refined-monster-art.json',
    'scripts/build-native-candidate.mjs',
    'scripts/native-candidate-scripts.mjs',
    'scripts/official-assets-layout.mjs',
    'scripts/refined-release-monsters.mjs',
    'scripts/v220-battle-scene-geometry.mjs',
    'scripts/v220-chapter-battle-scenes.mjs',
    'scripts/viewport-layout.mjs',
    'src/lua/abyss_actor_motion.lua',
    'src/lua/abyss_byrd_ground_trial.lua',
    'src/lua/abyss_card_flow.lua',
    'src/lua/abyss_chapter_battle_scene.lua',
    'src/lua/abyss_feedback.lua',
    'src/lua/abyss_feedback_actor_painter.lua',
    'src/lua/abyss_game_ui.lua',
    'src/lua/abyss_game_ui_view.lua',
    'src/lua/abyss_monster_art.lua',
    'src/lua/abyss_node_ui_input.lua',
    'src/lua/abyss_viewport.lua',
  ];
  assert.deepEqual([...existingInputs, ...battlePresentationInputs].filter(path => !selects(path)), []);
  for (const path of ['docs/design/UI_DESIGN.md', 'experiments/byrd-ground-trial/test.mjs',
    'art/unrelated.png', 'src/lua/abyss_curses.lua']) {
    assert.equal(selects(path), false, path);
  }
  assert.match(workflow, /RESOURCE_MODE: \$\{\{ github\.event_name == 'pull_request' && 'fast' \|\| inputs\.mode \}\}/);
});

const receipt = [
  'RESOURCE cpu.max 50000 100000',
  'RESOURCE memory.max 1073741824',
  'RESOURCE memory.swap.max 0',
  'RESOURCE memory.peak 580000000',
  'RESOURCE cpu.usage_usec 1000000',
  'RESOURCE cpu.nr_periods 20',
  'RESOURCE cpu.nr_throttled 19',
  'RESOURCE cpu.throttled_usec 900000',
  'RESOURCE memory.events.max 0',
  'RESOURCE memory.events.oom 0',
  'RESOURCE memory.events.oom_kill 0',
].join('\n');

test('stress requires recorded cgroup limits and clean memory events', () => {
  const resources = parseResources(receipt, profiles.stress);
  assert.equal(resources.throttledPeriods, 19);
  assert.equal(resources.peakBytes, 580000000);
  assert.throws(() => parseResources(receipt.replace('50000', 'max'), profiles.stress), /CPU quota/);
  assert.throws(() => parseResources(receipt.replace('1073741824', 'max'), profiles.stress), /memory cap/);
  assert.throws(() => parseResources(receipt.replace('swap.max 0', 'swap.max max'), profiles.stress), /swap cap/);
  assert.throws(() => parseResources(receipt.replace('oom_kill 0', 'oom_kill 1'), profiles.stress), /OOM/);
  assert.throws(() => parseResources(receipt.replace('cpu.nr_periods 20', 'cpu.nr_periods NaN'), profiles.stress), /cpu.nr_periods/);
});

test('a profile without a requested limit records the Docker host default', () => {
  const hostDefaults = receipt.replace('50000 100000', '400000 100000')
    .replace('1073741824', '17179869184').replace('swap.max 0', 'swap.max max');
  const baseline = parseResources(hostDefaults, profiles.baseline);
  assert.equal(baseline.cpuMax, '400000 100000');
  assert.equal(baseline.memoryMax, '17179869184');
  assert.equal(baseline.swapMax, 'max');
  assert.throws(() => parseResources(hostDefaults.replace('memory.max 17179869184', 'memory.max NaN'), profiles.baseline), /memory.max/);
  assert.throws(() => parseResources(hostDefaults, profiles['cpu-only']), /CPU quota/);
  assert.throws(() => parseResources(hostDefaults, profiles['memory-only']), /memory cap/);
});

test('time signals require at least three pairs above threshold and retain workload increases', () => {
  const rows = (elapsedMs, nativeCalls = 10) => ({ rows: [{ phase: 'fixture', elapsedMs, nativeCalls }] });
  const before = [rows(100), rows(100), rows(100)];
  const after = [rows(126, 11), rows(132, 11), rows(128, 11)];
  assert.deepEqual(compareSamples(before, after, 25).map(signal => signal.metric), ['elapsedMs', 'nativeCalls']);
  assert.deepEqual(compareSamples(before.slice(0, 1), after.slice(0, 1), 25).map(signal => signal.metric), ['nativeCalls']);
  assert.deepEqual(compareSamples(before, [rows(126), rows(105), rows(128)], 25), []);
});

test('six consistently slower pairs flag a median regression despite a small individual increase', () => {
  const rows = elapsedMs => ({ rows: [{ phase: 'deck-roundtrip', elapsedMs }] });
  const before = [100, 200, 300, 400, 500, 600].map(rows);
  const after = [150.8, 279.6, 362.1, 481.6, 524, 763.8].map(rows);
  assert.deepEqual(compareSamples(before, after, 20).map(signal => [signal.phase, signal.metric]), [
    ['deck-roundtrip', 'elapsedMs'],
  ]);
  assert.deepEqual(compareSamples(before, [...after.slice(0, -1), rows(595)], 20), []);
});


test('project SemVer bookkeeping alone preserves dependency pairing', () => {
  const lock = (version, fengari) => JSON.stringify({ version, packages: {
    '': { version, devDependencies: { fengari: '^0.1.0' } },
    'node_modules/fengari': { version: fengari, integrity: 'hash' },
  } });
  const baseline = lockfileIdentity(lock('2.0.0', '0.1.5'));
  const candidate = lockfileIdentity(lock('2.1.1', '0.1.5'));
  assert.notEqual(candidate.raw, baseline.raw);
  assert.equal(candidate.dependencies, baseline.dependencies);
  assert.notEqual(lockfileIdentity(lock('2.1.1', '0.1.6')).dependencies, baseline.dependencies);
});

test('automatic diagnostics preserve unpaired provenance and explicit mismatches fail before measurement', () => {
  const candidate = {workloadSha256: 'workload', lockfile: {dependencies: 'dependencies'}};
  const reference = {...candidate, commit: 'reference'};
  assert.deepEqual(selectResourceReference(candidate, null), {baseline: null});
  assert.deepEqual(selectResourceReference(candidate, reference), {baseline: reference});
  for (const [incompatible, reason] of [
    [{...reference, workloadSha256: 'other-workload'}, 'Host workload changed; timings cannot be paired'],
    [{...reference, lockfile: {dependencies: 'other-dependencies'}}, 'Resolved dependency graph changed; timings cannot be paired'],
  ]) {
    assert.deepEqual(selectResourceReference(candidate, incompatible, true), {
      baseline: null, unpairedReference: {...incompatible, reason},
    });
    assert.throws(() => selectResourceReference(candidate, incompatible), {message: reason});
  }
});

test('the same requested profile cannot pair two different measured default resource limits', () => {
  const baseline = [{resources: parseResources(receipt, profiles.baseline)}];
  assert.equal(matchingResourceCaps(baseline, baseline), true);
  assert.equal(matchingResourceCaps(baseline, []), false);
  for (const [original, changed] of [['50000', '400000'], ['1073741824', 'max'], ['swap.max 0', 'swap.max max']]) {
    const candidate = [{resources: parseResources(receipt.replace(original, changed), profiles.baseline)}];
    assert.equal(matchingResourceCaps(baseline, candidate), false);
  }
});
