import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {validateSample} from '../benchmark-runtime-path.mjs';
import {compareSamples, matchingResourceCaps, parseResources, profiles} from './resource-receipt.mjs';
import {productionPhases} from './production-inputs.mjs';
import {resolvePublishedBaseline} from './published-baseline.mjs';

const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const hash = /^[a-f0-9]{64}$/;
const commit = /^[a-f0-9]{40}$/;

export function verifyAuditedBuild(gilBytes, receiptBytes, audit, sourceCommit) {
  const receipt = JSON.parse(receiptBytes);
  const gilSha256 = sha256(gilBytes);
  assert.equal(gilSha256, receipt.candidate?.sha256, 'Final GIL bytes do not match the build receipt');
  assert(receipt.sourceCommit === sourceCommit && receipt.sourceDirty === false && hash.test(receipt.payloadDigest) &&
    hash.test(receipt.release?.notesSha256) && /^[a-f0-9-]{36}$/.test(receipt.buildId), 'Frozen release candidate receipt required');
  assert(audit.ok === true && audit.sourceCommit === sourceCommit && audit.liveWriteEnabled === false &&
    audit.candidate?.sha256Before === gilSha256 && audit.candidate?.sha256After === gilSha256 &&
    audit.buildMarker?.buildId === receipt.buildId && audit.buildMarker?.candidateSha256 === gilSha256 &&
    audit.buildMarker?.receiptSha256 === sha256(receiptBytes) &&
    audit.expectedGraphs?.some(graph => graph.name === '_GSTS_ABYSS_BGM'), 'Same-package strict audio audit required');
  return {receipt, gilSha256};
}

function verifySample(sample, profile) {
  validateSample(sample, productionPhases);
  assert(Number.isFinite(sample.wallMs) && sample.wallMs > 0, 'Missing sample wall time');
  const caps = sample.resources;
  parseResources([
    ['cpu.max', caps.cpuMax], ['memory.max', caps.memoryMax], ['memory.swap.max', caps.swapMax],
    ['memory.events.oom', caps.oom], ['memory.events.oom_kill', caps.oomKill], ['memory.peak', caps.peakBytes],
    ['cpu.usage_usec', caps.cpuUsageUsec], ['cpu.nr_periods', caps.cpuPeriods],
    ['cpu.nr_throttled', caps.throttledPeriods], ['cpu.throttled_usec', caps.throttledUsec],
  ].map(([key, value]) => `RESOURCE ${key} ${value}`).join('\n'), profile);
}

export function verifyResourceReport(report, sourceCommit, sourceTree, published, receipt) {
  assert.equal(report.kind, 'offline-production-host-resource-pressure', 'Formal production resource report required');
  assert.equal(report.status, 'PASS', 'Resource workload failed');
  assert.equal(report.mode, 'full', 'All six tiers required');
  assert.equal(report.comparisonStatus, 'PAIRED', 'Same-workload cgroup pairs required');
  assert(report.seed === 42 && report.alertPercent === 20 && Number.isInteger(report.repetitions) &&
    report.repetitions >= 3, 'Unexpected workload, threshold or sample count');
  assert(Number.isFinite(Date.parse(report.timeUtc)) && report.engine?.cpuModel && report.engine?.kernel &&
    report.engine?.arch && /^\S+ 2 linux \S+$/.test(report.engine?.docker) && /^sha256:[a-f0-9]{64}$/.test(report.engine?.imageId),
    'Missing raw run environment');
  assert.equal(report.candidate?.commit, sourceCommit, 'Report and frozen source differ');
  assert.equal(report.candidate?.tree, sourceTree, 'Report and frozen source tree differ');
  assert.notEqual(published.commit, sourceCommit, 'Use a distinct previously published reference');
  assert.equal(report.baseline?.commit, published.commit, 'Comparison is not the published build source');
  assert.equal(report.baseline?.tree, published.tree, 'Comparison is not the published build tree');
  for (const arm of [report.candidate, report.baseline]) {
    assert(commit.test(arm.tree) && hash.test(arm.workloadSha256) && hash.test(arm.generatedLuaSha256) &&
      hash.test(arm.lockfile?.dependencies), 'Incomplete source, workload or dependency evidence');
  }
  assert.equal(report.candidate.workloadSha256, report.baseline.workloadSha256, 'Host workloads differ');
  assert.equal(report.candidate.lockfile.dependencies, report.baseline.lockfile.dependencies, 'Dependency graphs differ');
  assert.deepEqual(report.candidate.configuration, report.baseline.configuration, 'Production profiles differ');
  const config = report.candidate.configuration;
  assert(config?.officialAssets && config.refinedReleaseMonsterArt && config.nativePageLifecycle,
    'Formal native production profile required');
  assert.deepEqual(config.artFeatures, receipt.artFeatures?.flags, 'GIL and resource art flags differ');

  assert.deepEqual(Object.keys(report.results).sort(), Object.keys(profiles).sort(), 'Six-tier coverage is incomplete');
  const signals = {};
  for (const [name, profile] of Object.entries(profiles)) {
    const result = report.results[name];
    assert.deepEqual(result.profile, profile, 'Resource profile changed: ' + name);
    assert(result.candidate?.pass && result.baseline?.pass && result.comparisonStatus === 'PAIRED',
      'Resource profile failed or was not paired: ' + name);
    const before = result.baseline.samples;
    const after = result.candidate.samples;
    assert.equal(before.length, report.repetitions, 'Incomplete reference samples: ' + name);
    assert.equal(after.length, report.repetitions, 'Incomplete candidate samples: ' + name);
    for (const sample of [...before, ...after]) verifySample(sample, profile);
    assert(matchingResourceCaps(before, after), 'Measured cgroup limits differ: ' + name);
    const observed = compareSamples(before, after, report.alertPercent);
    assert.deepEqual(result.signals, observed, 'Source evidence signals differ from samples: ' + name);
    if (observed.length) signals[name] = observed;
  }
  return signals;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const destination = 'build/release-performance-evidence.json';
  const write = result => {
    mkdirSync('build', {recursive: true});
    writeFileSync(destination, JSON.stringify(result, null, 2) + '\n');
    console.log(JSON.stringify(result));
  };
  try {
    mkdirSync('build', {recursive: true});
    writeFileSync(destination, JSON.stringify({status: 'RUNNING'}) + '\n');
    const [gil, candidate, auditPath, evidence, ...extra] = process.argv.slice(2);
    assert(gil && candidate && auditPath && evidence && !extra.length,
      'Use verify-release-performance.mjs <final.gil> <candidate.json> <audit.json> <report.json>');
    const head = ref => execFileSync('git', ['rev-parse', ref], {encoding: 'utf8'}).trim();
    const sourceCommit = head('HEAD');
    const sourceTree = head('HEAD^{tree}');
    const auditBytes = readFileSync(auditPath);
    const {receipt, gilSha256} = verifyAuditedBuild(readFileSync(gil), readFileSync(candidate), JSON.parse(auditBytes), sourceCommit);
    const bytes = readFileSync(evidence);
    const raw = JSON.parse(bytes);
    const {version} = JSON.parse(readFileSync('package.json'));
    const published = await resolvePublishedBaseline(version);
    const signals = verifyResourceReport(raw, sourceCommit, sourceTree, published, receipt);
    const status = Object.keys(signals).length ? 'REVIEW_REQUIRED' : 'OFFLINE_RESOURCE_VERIFIED';
    write({status, sourceCommit, sourceTree, gilSha256, buildId: receipt.buildId, payloadDigest: receipt.payloadDigest,
      published, configuration: raw.candidate.configuration, environment: raw.engine,
      strictAudioAuditSha256: sha256(auditBytes), rawReportSha256: sha256(bytes), signals});
    if (status === 'REVIEW_REQUIRED') process.exitCode = 1;
  } catch (error) {
    write({status: 'BLOCKED', error: error.message});
    process.exitCode = 1;
  }
}
