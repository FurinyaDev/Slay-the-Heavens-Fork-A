import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import test from 'node:test';
import {productionPhases} from '../scripts/runtime-baseline/production-inputs.mjs';
import {profiles} from '../scripts/runtime-baseline/resource-receipt.mjs';
import {resolvePublishedBaseline} from '../scripts/runtime-baseline/published-baseline.mjs';
import {verifyAuditedBuild, verifyResourceReport} from '../scripts/runtime-baseline/verify-release-performance.mjs';

const head = 'a'.repeat(40);
const tree = 'b'.repeat(40);
const published = {commit:'c'.repeat(40), tree:'e'.repeat(40)};
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
  const candidate = {commit:head, ...evidence};
  const extreme = {
    status:'PASS', candidate,
    probe:{resources:{cpuMax:'50000 100000', memoryMax:'134217728', swapMax:'0'},
      state:{Running:false, OOMKilled:true, ExitCode:137, StartedAt:'2026-11-25T11:02:00Z', FinishedAt:'2026-11-25T11:02:01Z'},
      stdout:'RESOURCE cpu.max 50000 100000\nRESOURCE memory.max 134217728\nRESOURCE memory.swap.max 0\n'},
    recovery:{recordedAt:'2026-11-25T11:03:00Z', sample:structuredClone(results.stress.candidate.samples[0])},
  };
  return structuredClone({
    kind:'offline-production-host-resource-pressure', status:'PASS', mode:'full', comparisonStatus:'PAIRED',
    seed:42, alertPercent:20, repetitions:3, timeUtc:'2026-11-25T12:00:00Z',
    engine:{cpuModel:'fixture', kernel:'fixture', arch:'x64', docker:'28.4.0 2 linux amd64', imageId:`sha256:${sha256}`},
    candidate, baseline:{...evidence, ...published}, results, extreme,
  });
}

test('accepts six formal paired tiers from the exact release and published builds', () => {
  assert.deepEqual(verifyResourceReport(reportFixture(), head, tree, published, receipt), {});
});

test('rejects the wrong published source, release tree, missing tier, or changed art profile', () => {
  assert.throws(() => verifyResourceReport(reportFixture(), head, tree, {...published, commit:tree}, receipt), /published build source/);
  assert.throws(() => verifyResourceReport(reportFixture(), head, tree, {...published, commit:head}, receipt), /distinct previously published/);
  assert.throws(() => verifyResourceReport(reportFixture(), head, head, published, receipt), /frozen source tree/);
  assert.throws(() => verifyResourceReport(reportFixture(), head, tree, {...published, tree}, receipt), /published build tree/);
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

test('requires an independent extreme failure and a later supported recovery sample', () => {
  const missing = reportFixture();
  delete missing.extreme;
  assert.throws(() => verifyResourceReport(missing, head, tree, published, receipt), /extreme failure and recovery proof/);
  const unbounded = reportFixture();
  unbounded.extreme.probe.state.OOMKilled = false;
  assert.throws(() => verifyResourceReport(unbounded, head, tree, published, receipt), /bounded cgroup OOM/);
  const altered = reportFixture();
  altered.extreme.probe.stdout = altered.extreme.probe.stdout.replace('memory.swap.max 0', 'memory.swap.max max');
  assert.throws(() => verifyResourceReport(altered, head, tree, published, receipt), /raw cgroup readback/);
  const early = reportFixture();
  early.extreme.recovery.recordedAt = '2026-11-25T11:01:30Z';
  assert.throws(() => verifyResourceReport(early, head, tree, published, receipt), /follow the observed extreme failure/);
});

test('resolves historical publication source and actual annotation tree independently', async () => {
  const tagObject = '43532708d2629200ea1541b49b8a02b7dc6c30da';
  const filename = 'slay-the-heavens-v2.1.1-2026-11-25.gil';
  const receipt = Buffer.from(JSON.stringify({version:'v2.1.1', sourceDirty:false, sourceCommit:published.commit, sha256, filename}));
  const release = {
    id:458194023, draft:false, prerelease:false, tag_name:'v2.1.1', html_url:'https://github.com/example',
    target_commitish:head,
    body:[
      '正式构建源码 `' + published.commit + '`',
      'SHA-256 `' + sha256 + '`',
      'blob/3f79269e90a8f2507f6782135563ecf573b357d7/docs/evidence/v2.1.1-2026-11-25/' + filename,
    ].join('\n'),
  };
  const response = new Map([
    ['/releases?per_page=100&page=1', [release]],
    ['/contents/docs/evidence/v2.1.1-2026-11-25/build-receipt.json?ref=3f79269e90a8f2507f6782135563ecf573b357d7',
      {encoding:'base64', content:receipt.toString('base64')}],
    ['/git/ref/tags/v2.1.1', {ref:'refs/tags/v2.1.1', object:{type:'tag', sha:tagObject}}],
    ['/git/tags/' + tagObject, {sha:tagObject, tag:'v2.1.1', object:{type:'commit', sha:head}}],
    ['/git/commits/' + published.commit, {sha:published.commit, tree:{sha:published.tree}}],
    ['/git/commits/' + head, {sha:head, tree:{sha:published.tree}}],
  ]);
  const request = async path => response.get(path.replace('/repos/FurinyaWorks/Slay-the-Heavens', ''));
  assert.deepEqual(await resolvePublishedBaseline('2.2.0', request), {
    ...published, version:'2.1.1', gilSha256:sha256, source:release.html_url, releaseId:release.id,
  });
  response.set('/git/commits/' + head, {sha:head, tree:{sha:tree}});
  await assert.rejects(resolvePublishedBaseline('2.2.0', request), /actual build source trees differ/);
});

test('chooses the latest confirmed prior engineering Release and authenticates its asset digest', async () => {
  const tagObject = 'a'.repeat(40);
  const comparison = {
    id:22, draft:false, prerelease:false, tag_name:'engine-v2.2.0', html_url:'https://github.com/confirmed',
    assets:[{state:'uploaded', name:'candidate.gil', digest:'sha256:' + sha256}],
    body:['<!-- release-metadata:v1 -->', '```json', JSON.stringify({
      version:'2.2.0', platform_version:'2.03', release_type:'minor', commit:published.commit,
      platform_evidence:'https://example.com/published', artifact:{name:'candidate.gil', sha256},
    }), '```'].join('\n'),
  };
  const unconfirmed = {
    ...comparison, id:23, tag_name:'engine-v2.2.1',
    body:comparison.body.replace('"2.2.0"', '"2.2.1"').replace('"2.03"', 'null').replace('"minor"', '"patch"'),
  };
  const response = new Map([
    ['/releases?per_page=100&page=1', [unconfirmed, comparison]],
    ['/git/ref/tags/engine-v2.2.0', {ref:'refs/tags/engine-v2.2.0', object:{type:'tag', sha:tagObject}}],
    ['/git/tags/' + tagObject, {sha:tagObject, tag:'engine-v2.2.0', object:{type:'commit', sha:published.commit}}],
    ['/git/commits/' + published.commit, {sha:published.commit, tree:{sha:published.tree}}],
  ]);
  const request = async path => response.get(path.replace('/repos/FurinyaWorks/Slay-the-Heavens', ''));
  assert.equal((await resolvePublishedBaseline('2.3.0', request)).releaseId, 22);
  comparison.assets[0].digest = 'sha256:' + '1'.repeat(64);
  await assert.rejects(resolvePublishedBaseline('2.3.0', request), /asset digest does not match/);
});
