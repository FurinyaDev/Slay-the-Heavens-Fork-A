import assert from 'node:assert/strict';
import test from 'node:test';
import { compareSamples, lockfileIdentity, parseResources, profiles } from '../../scripts/runtime-baseline/resource-receipt.mjs';

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

test('time signals require at least three pairs above threshold and retain workload increases', () => {
  const rows = (elapsedMs, nativeCalls = 10) => ({ rows: [{ phase: 'fixture', elapsedMs, nativeCalls }] });
  const before = [rows(100), rows(100), rows(100)];
  const after = [rows(126, 11), rows(132, 11), rows(128, 11)];
  assert.deepEqual(compareSamples(before, after, 25).map(signal => signal.metric), ['elapsedMs', 'nativeCalls']);
  assert.deepEqual(compareSamples(before.slice(0, 1), after.slice(0, 1), 25).map(signal => signal.metric), ['nativeCalls']);
  assert.deepEqual(compareSamples(before, [rows(126), rows(105), rows(128)], 25), []);
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
