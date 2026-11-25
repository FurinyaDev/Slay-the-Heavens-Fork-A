import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import test from 'node:test';
import {productionPhases} from '../scripts/runtime-baseline/production-inputs.mjs';
import {profiles} from '../scripts/runtime-baseline/resource-receipt.mjs';
import {verifyAuditedBuild, verifyResourceReport} from '../scripts/runtime-baseline/verify-release-performance.mjs';

const head = 'a'.repeat(40);
const tree = 'b'.repeat(40);
const published = 'c'.repeat(40);
const sha256 = 'd'.repeat(64);
const flags = {cards:false, menuBackground:false, selectionAvatar:true, battlePortrait:true, monsters:true};
const receipt = {artFeatures:{flags}};

function reportFixture() {
  const evidence = {
    tree, workloadSha256:sha256, generatedLuaSha256:sha256, lockfile:{dependencies:sha256},
    configuration:{officialAssets:true, refinedReleaseMonsterArt:true, nativePageLifecycle:true, artFeatures:flags},
  };
  const results = Object.fromEntries(Object.entries(profiles).map(([name, profile]) => {
    const rows = productionPhases.map(phase => ({
      phase, elapsedMs:1, requireCalls:1, moduleLoads:1, nativeCalls:1, propertyWrites:1, snapshots:1,
      nativeMethods:{GetChild:1}, propertyNames:{visible:1}, memory:{rss:1, heapUsed:1},
    }));
    const resources = {
      cpuMax:profile.cpus === null ? 'max 100000' : `${profile.cpus * 100000} 100000`,
      memoryMax:String(profile.memoryBytes ?? 'max'), swapMax:profile.memoryBytes === null ? 'max' : '0',
      oom:0, oomKill:0, peakBytes:100, cpuUsageUsec:1, cpuPeriods:1, throttledPeriods:0, throttledUsec:0,
    };
    const arm = {samples:Array.from({length:3}, () => ({rows, resources, wallMs:1})), pass:true};
    return [name, {profile, candidate:structuredClone(arm), baseline:arm, comparisonStatus:'PAIRED', signals:[]}];
  }));
  return structuredClone({
    kind:'offline-production-host-resource-pressure', status:'PASS', mode:'full', comparisonStatus:'PAIRED',
    seed:42, alertPercent:20, repetitions:3, timeUtc:'2026-11-25T12:00:00Z',
    engine:{cpuModel:'fixture', kernel:'fixture', arch:'x64', docker:'28.4.0 2 linux amd64', imageId:`sha256:${sha256}`},
    candidate:{commit:head, ...evidence}, baseline:{commit:published, ...evidence}, results,
  });
}

test('accepts six formal paired tiers from the exact release and published builds', () => {
  assert.deepEqual(verifyResourceReport(reportFixture(), head, tree, published, receipt), {});
});

test('rejects the wrong published source, release tree, missing tier, or changed art profile', () => {
  assert.throws(() => verifyResourceReport(reportFixture(), head, tree, tree, receipt), /published build source/);
  assert.throws(() => verifyResourceReport(reportFixture(), head, tree, head, receipt), /distinct previously published/);
  assert.throws(() => verifyResourceReport(reportFixture(), head, head, published, receipt), /frozen source tree/);
  const report = reportFixture();
  delete report.results.light;
  assert.throws(() => verifyResourceReport(report, head, tree, published, receipt), /coverage is incomplete/);
  assert.throws(() => verifyResourceReport(reportFixture(), head, tree, published, {artFeatures:{flags:{}}}), /art flags differ/);
});

test('rejects weaker limits and cleared performance signals', () => {
  const wrongLimit = reportFixture();
  wrongLimit.results.stress.candidate.samples[0].resources.cpuMax = 'max 100000';
  assert.throws(() => verifyResourceReport(wrongLimit, head, tree, published, receipt), /CPU quota mismatch/);
  const drift = reportFixture();
  drift.results.stress.candidate.samples[0].resources.oom = 1;
  assert.throws(() => verifyResourceReport(drift, head, tree, published, receipt), /OOM during the workload/);
  const cleared = reportFixture();
  for (const sample of cleared.results.stress.candidate.samples) sample.rows[1].elapsedMs *= 2;
  assert.throws(() => verifyResourceReport(cleared, head, tree, published, receipt), /signals differ from samples/);
});

test('binds strict audio audit to the frozen receipt and downloaded bytes', () => {
  const digest = bytes => createHash('sha256').update(bytes).digest('hex');
  const gil = Buffer.from('fixture');
  const candidateSha256 = digest(gil);
  const buildId = '29f48ea1-fa9d-4f76-b124-2bffc83f7594';
  const candidate = Buffer.from(JSON.stringify({
    sourceCommit:head, sourceDirty:false, buildId, candidate:{sha256:candidateSha256},
    payloadDigest:sha256, release:{notesSha256:sha256},
  }));
  const audit = {
    ok:true, sourceCommit:head, liveWriteEnabled:false, candidate:{sha256Before:candidateSha256, sha256After:candidateSha256},
    buildMarker:{buildId, candidateSha256, receiptSha256:digest(candidate)}, expectedGraphs:[{name:'_GSTS_ABYSS_BGM'}],
  };
  assert.equal(verifyAuditedBuild(gil, candidate, audit, head).gilSha256, candidateSha256);
  assert.throws(() => verifyAuditedBuild(Buffer.from('tampered'), candidate, audit, head), /GIL bytes do not match/);
  assert.throws(() => verifyAuditedBuild(gil, Buffer.concat([candidate, Buffer.from('\n')]), audit, head), /strict audio audit required/);
  assert.throws(() => verifyAuditedBuild(gil, candidate, {...audit, expectedGraphs: []}, head), /strict audio audit required/);
});
