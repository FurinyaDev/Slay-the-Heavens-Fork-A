import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { counters, percentile } from '../benchmark-runtime-path.mjs';

const GiB = 1024 ** 3;
export const profiles = {
  baseline: { cpus: null, memoryBytes: null },
  'cpu-only': { cpus: 0.5, memoryBytes: null },
  'memory-only': { cpus: null, memoryBytes: GiB },
  light: { cpus: 2, memoryBytes: 4 * GiB },
  medium: { cpus: 1, memoryBytes: 2 * GiB },
  stress: { cpus: 0.5, memoryBytes: GiB },
};

export function lockfileIdentity(bytes) {
  const dependencies = JSON.parse(bytes);
  // Project SemVer can change between two otherwise identical dependency graphs.
  delete dependencies.version;
  delete dependencies.packages[''].version;
  return {
    raw: createHash('sha256').update(bytes).digest('hex'),
    dependencies: createHash('sha256').update(JSON.stringify(dependencies)).digest('hex'),
  };
}

export function parseResources(output, profile) {
  const fields = new Map();
  for (const line of output.split('\n')) {
    if (!line.startsWith('RESOURCE ')) continue;
    const [, key, value] = /^RESOURCE (\S+) (.+)$/.exec(line) ?? [];
    assert(key && !fields.has(key), `invalid cgroup receipt: ${line}`);
    fields.set(key, value);
  }
  const integer = key => {
    const value = fields.get(key);
    assert(/^\d+$/.test(value) && Number.isSafeInteger(Number(value)), `missing or invalid ${key}`);
    return Number(value);
  };
  const cpuMax = fields.get('cpu.max');
  assert(/^(max|[1-9]\d*) [1-9]\d*$/.test(cpuMax), 'missing or invalid cgroup cpu.max');
  const [quota, period] = cpuMax.split(' ');
  if (profile.cpus !== null) {
    assert.equal(quota === 'max' ? null : Number(quota) / Number(period), profile.cpus, 'CPU quota mismatch');
  }
  const memoryMax = fields.get('memory.max');
  const swapMax = fields.get('memory.swap.max');
  assert(/^(max|\d+)$/.test(memoryMax), 'missing or invalid cgroup memory.max');
  assert(/^(max|\d+)$/.test(swapMax), 'missing or invalid cgroup memory.swap.max');
  if (profile.memoryBytes !== null) {
    assert.equal(memoryMax, String(profile.memoryBytes), 'memory cap mismatch');
    assert.equal(swapMax, '0', 'swap cap mismatch');
  }
  const oom = integer('memory.events.oom');
  const oomKill = integer('memory.events.oom_kill');
  assert.equal(oom + oomKill, 0, 'cgroup recorded an OOM during the workload');
  return {
    cpuMax, memoryMax, swapMax, oom, oomKill,
    peakBytes: integer('memory.peak'),
    cpuUsageUsec: integer('cpu.usage_usec'),
    cpuPeriods: integer('cpu.nr_periods'),
    throttledPeriods: integer('cpu.nr_throttled'),
    throttledUsec: integer('cpu.throttled_usec'),
  };
}

export function summarize(values) {
  return Object.fromEntries([50, 95, 99].map(p => [`p${p}`, percentile(values, p / 100)]));
}

export function compareSamples(before, after, alertPercent) {
  assert.equal(before.length, after.length, 'comparison requires complete pairs');
  const signals = [];
  for (const [index, { phase }] of before[0].rows.entries()) {
    for (const metric of ['elapsedMs', ...counters]) {
      const previous = before.map(sample => sample.rows[index][metric]);
      const current = after.map(sample => sample.rows[index][metric]);
      const timing = metric === 'elapsedMs';
      const minimumPairs = timing ? 3 : 1;
      const multiplier = timing ? 1 + alertPercent / 100 : 1;
      const allAboveThreshold = previous.length >= minimumPairs && current.every((value, i) => value > previous[i] * multiplier);
      const consistentTimingIncrease = timing && previous.length >= 6
        && previous.every((value, i) => value > 0 && current[i] > value)
        && percentile(current.map((value, i) => value / previous[i]), 0.5) > multiplier;
      if (allAboveThreshold || consistentTimingIncrease) {
        signals.push({ phase, metric, before: summarize(previous), after: summarize(current) });
      }
    }
  }
  return signals;
}
export function selectResourceReference(candidate, reference, automatic = false) {
  if (!reference) return { baseline: null };
  const reason = candidate.workloadSha256 !== reference.workloadSha256
    ? 'Host workload changed; timings cannot be paired'
    : candidate.lockfile.dependencies !== reference.lockfile.dependencies
      ? 'Resolved dependency graph changed; timings cannot be paired'
      : null;
  if (!reason) return { baseline: reference };
  assert(automatic, reason);
  return { baseline: null, unpairedReference: { ...reference, reason } };
}

export function matchingResourceCaps(before, after) {
  return before.length > 0 && before.length === after.length && before.every((row, i) =>
    ['cpuMax', 'memoryMax', 'swapMax'].every(key => row.resources[key] === after[i].resources[key]));
}
