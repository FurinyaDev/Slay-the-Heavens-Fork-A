import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import test from 'node:test';
import {formalPublishBranch, freezeReleaseCandidate, publicationTarget, verifyReleaseFull, verifyReleasePublication} from '../scripts/release-ci.mjs';
import {currentFullQualityJobs} from '../scripts/verify-delivery.mjs';
import {frozenPerformanceInputs} from '../scripts/runtime-baseline/frozen-performance-inputs.mjs';
import {requireReleasePerformance} from '../scripts/runtime-baseline/require-release-performance.mjs';
import {finalActorAlphaBinding} from '../scripts/art/actor-alpha-release-custody.mjs';
import {artFeatureReceipt} from '../scripts/art-features.mjs';
import {uiProfileReceipt} from '../scripts/ui-profile.mjs';
import {refinedReleaseOfficialAssetsProfile, refinedReleaseOfficialAssetFlags} from '../scripts/official-assets-profile.mjs';
import {sha256} from '../scripts/runtime-baseline/release-performance-artifacts.mjs';
import {head, tree, published, sha256 as workloadSha256, reportFixture, receipt, moduleDigestsSha256} from './helpers/release-performance-fixture.mjs';
import {beforeHotfixPublicationGate, hotfixPublicationGate} from './helpers/release-ci-workflow.mjs';

const repo = 'FurinyaWorks/Slay-the-Heavens';
const repository = {id:1429751262,full_name:repo};
const branch = 'release/v2.2.0';
const full = {repo, branch, head, runId:10, attempt:3, checkoutArtifactId:60};

function fixture(source = full, formalAttempt = 2, gilArtifactId = 30, gilAttempt = 1) {
  const {branch} = source;
  const version = branch.split('/v').at(-1);
  const refPath = '/git/ref/heads/' + branch;
  const workflowPath = '/actions/workflows/performance-regression.yml/runs?event=workflow_dispatch&branch=' +
    encodeURIComponent(branch) + '&head_sha=' + head + '&per_page=100&page=1';
  const fullPath = '/actions/workflows/quality.yml/runs?event=workflow_dispatch&branch=' +
    encodeURIComponent(branch) + '&per_page=100&page=1';
  const controller = '1'.repeat(40);
  const gil = {name:'gil-candidate-v' + version + '-' + head + '-' + '2'.repeat(64), id:gilArtifactId, runId:20, attempt:gilAttempt, controllerSha:controller,
    digest:'sha256:' + '3'.repeat(64), gilSha256:'4'.repeat(64), payloadDigest:'5'.repeat(64), buildId:'f960b8ee-5310-47d9-b21b-3bea1ef578c1',
    receiptSha256:'6'.repeat(64), manifestSha256:'7'.repeat(64), qualityRun:source.runId, qualityAttempt:source.attempt,
    qualityCheckoutArtifact:source.checkoutArtifactId};
  const formal = {name:'release-performance-40-' + formalAttempt, id:50, runId:40, attempt:formalAttempt, controllerSha:head, digest:'sha256:' + '8'.repeat(64)};
  const responses = new Map();
  const addPublished = (target, ref, path, display_title, step) => {
    const run = {id:target.runId, run_attempt:target.attempt, path:'.github/workflows/' + path, head_sha:target.controllerSha,
      head_branch:ref, repository, head_repository:repository, event:'workflow_dispatch', status:'completed', conclusion:'success', display_title};
    const artifact = {name:target.name, id:target.id, digest:target.digest, expired:false, expires_at:'2099-11-25T00:00:00Z',
      created_at:'2026-11-25T12:02:00Z', workflow_run:{id:target.runId, repository_id:repository.id, head_repository_id:repository.id,
        head_branch:ref, head_sha:target.controllerSha}};
    const pathPrefix = '/actions/runs/' + target.runId;
    const attemptPrefix = pathPrefix + '/attempts/' + target.attempt;
    responses.set('/actions/artifacts/' + target.id, artifact);
    responses.set(pathPrefix, run);
    responses.set(attemptPrefix, {...run, run_started_at:'2026-11-25T12:00:00Z'});
    responses.set(attemptPrefix + '/jobs?per_page=100', {jobs:[{run_attempt:target.attempt, head_sha:target.controllerSha,
      conclusion:'success', steps:[{name:step, conclusion:'success'}]}]});
    return {artifact, run};
  };
  const {run, artifact} = addPublished(formal, branch, 'performance-regression.yml', 'Formal resource release / ' + branch + ' / ' + head,
    'Bind formal resource report to audited GIL');
  addPublished(gil, 'develop', 'gil-candidate.yml', 'GIL candidate / ' + branch + ' / ' + head, 'Verify the archived download');
  responses.set(refPath, {ref:'refs/heads/' + branch, object:{type:'commit', sha:head}});
  responses.set(workflowPath, {workflow_runs:[run]});
  responses.set(fullPath, {workflow_runs:[{id:source.runId, run_attempt:source.attempt, head_sha:head, status:'completed', conclusion:'success'}]});
  responses.set('/actions/runs/40/artifacts?per_page=100&page=1', {artifacts:[artifact]});
  const report = Buffer.from(JSON.stringify(reportFixture()));
  const evidence = {schemaVersion:1, kind:'release-performance', source:{head, branch, version, tree}, runId:40, attempt:formalAttempt,
    gil, published, workloadSha256, reportSha256:sha256(report), artFeatures:receipt.artFeatures, moduleDigestsSha256};
  const options = {
    readSource:() => ({version, tree, workloadSha256}), readBaseline:async () => published,
    readArtifact:async locator => {
      assert.equal(locator.id, 50);
      return {'report.json':report, 'evidence.json':Buffer.from(JSON.stringify(evidence))};
    },
  };
  const request = async path => responses.get(path.slice(('/repos/' + repo).length));
  return {options, request, check:() => requireReleasePerformance(source, request, options), responses, evidence, run,
    refPath, workflowPath, fullPath};
}

test('requires the same frozen source, latest successful attempt and audited GIL before publication', async () => {
  const run = fixture();
  const proof = await run.check();
  assert.equal(proof.reportSha256, run.evidence.reportSha256);
  assert.equal(proof.gil.gilSha256, run.evidence.gil.gilSha256);
  assert.equal(proof.artifactId, 50);
  assert.equal(proof.attempt, 2);
});

test('no evidence or a newer failing formal run blocks a prior green result', async () => {
  const missing = fixture();
  missing.responses.set(missing.workflowPath, {workflow_runs:[]});
  await assert.rejects(missing.check(), /Latest formal release performance run must pass/);
  const failing = fixture();
  failing.responses.get(failing.workflowPath).workflow_runs.push({...failing.run, id:41, conclusion:'failure'});
  await assert.rejects(failing.check(), /Latest formal release performance run must pass/);
  const old = fixture();
  old.run.run_attempt = 3;
  await assert.rejects(old.check(), /one sealed artifact/);
});

test('rejects report tampering, a different original GIL, or a moving freeze', async () => {
  const tampered = fixture();
  tampered.evidence.reportSha256 = '9'.repeat(64);
  await assert.rejects(tampered.check(), /downloaded report differ/);
  const changed = fixture();
  changed.responses.get('/actions/artifacts/30').digest = 'sha256:' + '9'.repeat(64);
  await assert.rejects(changed.check(), /Audited GIL archive changed/);
  const moving = fixture();
  const original = moving.options.readArtifact;
  moving.options.readArtifact = async locator => {
    moving.responses.get(moving.refPath).object.sha = 'f'.repeat(40);
    return original(locator);
  };
  await assert.rejects(moving.check(), /Release HEAD changed/);
});

test('a new Full attempt or checkout receipt on the same run and source invalidates the GIL and formal result', async () => {
  const current = fixture();
  await assert.rejects(requireReleasePerformance({...full, attempt:4}, current.request, current.options), /current frozen Full run, attempt/);
  await assert.rejects(requireReleasePerformance({...full, checkoutArtifactId:61}, current.request, current.options), /checkout artifact differ/);
  current.responses.get(current.fullPath).workflow_runs[0].run_attempt = 4;
  await assert.rejects(current.check(), /Frozen Full changed during performance verification/);
});

test('formal same-package input starts without Full for a trusted v2 GIL', async () => {
  const source = execFileSync('git', ['rev-parse', 'HEAD'], {encoding:'utf8'}).trim();
  const {version} = JSON.parse(readFileSync('package.json'));
  const env = {GITHUB_ACTIONS:'true', GITHUB_EVENT_NAME:'workflow_dispatch', GITHUB_REPOSITORY:repo,
    GITHUB_REPOSITORY_ID:String(repository.id), GITHUB_REF_NAME:'release/v' + version, GITHUB_SHA:source,
    GITHUB_RUN_ID:'40', GITHUB_RUN_ATTEMPT:'1', GIL_ARTIFACT_ID:'30'};
  const gil = {schemaVersion:2, custody:'gil-build-v2', id:30};
  const result = await frozenPerformanceInputs(env, {
    request:async () => ({ref:'refs/heads/' + env.GITHUB_REF_NAME, object:{type:'commit', sha:source}}),
    readGil:async (_, id, target) => {
      assert.deepEqual([id, target], [30, {head:source, branch:env.GITHUB_REF_NAME, version}]);
      return {receipt:{release:{version:'v' + version}}, binding:gil, gilBytes:Buffer.from('trusted')};
    },
    readBaseline:async () => published,
    readFull:async () => assert.fail('Full may still be pending'),
  });
  assert.deepEqual(result.gil, gil);
});

function v2Performance() {
  const current = fixture();
  const gil = current.evidence.gil;
  delete gil.qualityRun;
  delete gil.qualityAttempt;
  delete gil.qualityCheckoutArtifact;
  Object.assign(gil, {schemaVersion:2, custody:'gil-build-v2', requestId:'2'.repeat(64), gilSizeBytes:123});
  current.evidence.schemaVersion = 2;
  // Simulated output of A1's trusted producer and immutable byte verifier.
  const verified = structuredClone(gil);
  current.options.readGil = async (_, id) => {
    assert.equal(id, verified.id);
    return {binding:verified, receipt};
  };
  return current;
}

test('v2 formal evidence survives the latest successful Full retry but rejects a substituted build', async () => {
  const current = v2Performance();
  const retry = {...full, attempt:4};
  current.responses.get(current.fullPath).workflow_runs[0].run_attempt = retry.attempt;
  const proof = await requireReleasePerformance(retry, current.request, current.options);
  const noQualityReads = path => {
    assert(!path.includes('/workflows/quality.yml'), 'v2 performance must verify independently of Full');
    return current.request(path);
  };
  const independent = await requireReleasePerformance({repo, branch, head}, noQualityReads, current.options);
  assert.deepEqual(independent, proof);
  assert.equal(proof.gil.id, 30);
  assert.equal(proof.attempt, 2);
  current.evidence.gil.requestId = 'f'.repeat(64);
  await assert.rejects(requireReleasePerformance(retry, current.request, current.options), /Audited GIL archive changed/);
});

test('the final publication entry fails closed before performance when Full or Licenses is pending', async () => {
  const readPerformance = async () => assert.fail('performance must not authorize the release');
  for (const failed of ['readFull', 'readLicenses']) {
    const fixtureOptions = {readFull:async () => full, readLicenses:async () => ({}), readPerformance};
    fixtureOptions[failed] = async () => {throw new Error('pending whitebox proof');};
    await assert.rejects(verifyReleasePublication(repo, branch, head, async () => {}, fixtureOptions), /pending whitebox proof/);
  }
});

function hostedGateFixture(current = v2Performance()) {
  const target = {repo, branch, head};
  const hosted = (id, workflow, attempt = 1) => ({id, run_attempt:attempt, repository, head_repository:repository,
    head_branch:branch, head_sha:head, path:'.github/workflows/' + workflow, event:'workflow_dispatch',
    status:'completed', conclusion:'success'});
  const job = (name, run, id, extra) => ({id, name, run_id:run.id, run_attempt:run.run_attempt, head_sha:head,
    status:'completed', conclusion:'success', ...extra});
  const pass = name => ({name, status:'completed', conclusion:'success'});
  const quality = hosted(full.runId, 'quality.yml', 4);
  const licenses = hosted(11, 'licenses.yml');
  const fast = {...hosted(99, 'quick-feedback.yml'), display_title:'Preflight / ' + head + ' / ' + '1'.repeat(40)};
  const jobs = currentFullQualityJobs.map((name, i) => job(name, quality, i + 100, {
    conclusion:name === 'fast' ? 'skipped' : 'success', run_attempt:1,
  }));
  const failedJob = jobs.find(row => row.name === 'check (ubuntu-24.04)') ?? jobs[1];
  jobs.push({...failedJob, id:401, run_attempt:quality.run_attempt});
  const inventory = job('inventory', licenses, 500, {steps:[
    pass('Run actions/checkout@11d5960a326750d5838078e36cf38b85af677262'), pass('Run node scripts/check-license.mjs'),
  ]});
  const fastJob = job('Complete affected preflight', fast, 501, {steps:[
    pass('Verify exact PR merge and comparison base'), pass('Complete affected JS and Lua preflight'), pass('Record exact tested checkout'),
  ]});
  const tagPrefix = 'v' + branch.split('/v')[1] + '-rc.';
  const tags = new Map();
  const tag = (number, id) => {
    const name = tagPrefix + number;
    const tagSha = String(number).padStart(40, '0');
    const ref = {ref:'refs/tags/' + name, object:{type:'tag', sha:tagSha}};
    const annotated = {sha:tagSha, tag:name, object:{type:'commit', sha:head}, message:'GIL-Artifact-ID: ' + id};
    tags.set(name, {ref, annotated});
    return tags.get(name);
  };
  tag(9, 24);
  tag(10, 30);
  const control = {quality:[quality], licenses:[licenses], inventory:[inventory], fast:[fastJob], tag};
  const posts = [];
  const request = async (url, args) => {
    const path = url.slice(('/repos/' + repo).length);
    if (args) {
      posts.push([path, args]);
      return null;
    }
    if (!path) return repository;
    if (path.startsWith('/tags?')) {
      const page = Number(new URL('https://github.com' + path).searchParams.get('page'));
      return [...tags.values()].map(({annotated}) => ({name:annotated.tag, commit:{sha:head}}))
        .slice((page - 1) * 100, page * 100);
    }
    if (path.startsWith('/git/ref/tags/')) return tags.get(path.split('/').at(-1))?.ref;
    if (path.startsWith('/git/tags/')) return [...tags.values()].find(row => row.annotated.sha === path.split('/').at(-1))?.annotated;
    if (path === current.fullPath) return {workflow_runs:control.quality};
    if (path === '/compare/' + '1'.repeat(40) + '...' + head + '?per_page=1') {
      const base = {sha:'1'.repeat(40)};
      return {base_commit:base, merge_base_commit:base, status:'ahead'};
    }
    if (path.startsWith('/actions/workflows/licenses.yml/runs?')) return {workflow_runs:control.licenses};
    if (path === '/actions/runs/10/jobs?filter=all&per_page=100&page=1') return {jobs};
    if (path === '/actions/runs/11/jobs?filter=all&per_page=100&page=1') return {jobs:control.inventory};
    if (path === '/actions/runs/99/attempts/1/jobs?per_page=100&page=1') return {jobs:control.fast};
    if (path === '/actions/runs/10') return quality;
    if (path === '/actions/runs/11') return licenses;
    if (path === '/actions/runs/99') return fast;
    return current.request(url);
  };
  const readCheckout = () => ({checkout:{schemaVersion:1, attempt:1, runId:quality.id, head, tested:head, event:'workflow_dispatch'},
    checkoutArtifact:{id:full.checkoutArtifactId, name:'quality-10-1-check', expired:false, workflow_run:{id:quality.id, head_sha:head}}});
  const options = {
    readFull:(repo, branch, head, get) => verifyReleaseFull(repo, branch, head, get, readCheckout),
    gilArtifactId:current.evidence.gil.id,
    readPerformance:(proof, get) => requireReleasePerformance(proof, get, current.options),
  };
  return {current, quality, licenses, fast, jobs, control, posts, options, request, readCheckout,
    verify:() => verifyReleasePublication(repo, branch, head, request, options),
    freeze:(options = {}) => freezeReleaseCandidate(repo, branch, head, request, {fastRunId:fast.id, gilArtifactId:30,
      readCheckout, readGil:current.options.readGil, ...options}),
  };
}

test('final publication combines real gate verification with the original v2 GIL and report after a Full retry', async () => {
  const h = hostedGateFixture();
  const proof = await h.verify();
  assert.equal(proof.attempt, 4);
  assert.equal(proof.checkoutArtifactId, full.checkoutArtifactId);
  assert.equal(proof.licenses.inventoryJobId, 500);
  assert.equal(proof.performance.attempt, 2);
  assert.deepEqual(proof.performance.gil, h.current.evidence.gil);

  for (const mutate of [
    h => {h.control.quality.length = 0;}, h => {h.quality.conclusion = 'cancelled';},
    h => {h.jobs.pop(); h.jobs.splice(1, 1);}, h => {h.quality.head_sha = 'f'.repeat(40);},
    h => {h.control.licenses.length = 0;}, h => {h.licenses.head_sha = 'f'.repeat(40);},
    h => {h.licenses.conclusion = 'failure';}, h => {h.licenses.status = 'queued';},
    h => {h.licenses.head_repository = {...repository, id:333};}, h => {h.control.inventory.length = 0;},
    h => {h.control.inventory[0].steps.pop();},
  ]) {
    const rejected = hostedGateFixture();
    mutate(rejected);
    await assert.rejects(rejected.verify(), /Full|Licenses/);
  }
});

test('legacy formal proof stays historical and cannot authorize a newer marked RC on the same source', async () => {
  const h = hostedGateFixture(fixture({...full, attempt:4}));
  h.options.gilArtifactId = undefined;
  h.control.tag(10, 30).annotated.message = 'Historical release candidate';
  assert.equal((await h.verify()).performance.schemaVersion, 1);
  h.control.tag(11, 31);
  await assert.rejects(h.verify(), /Latest RC requires v2 formal evidence/);
  for (const invalid of ['GIL-Artifact-ID: bad', 'gil-artifact-id: 31', 'GIL-Artifact-ID : 31']) {
    h.control.tag(11, 31).annotated.message = invalid;
    await assert.rejects(h.verify(), /GIL-Artifact-ID/);
  }
});

test('v2 final verification requires the requested GIL ID and rejects using a previous package pass', async () => {
  for (const id of [undefined, 31]) {
    const current = hostedGateFixture();
    current.options.gilArtifactId = id;
    await assert.rejects(current.verify(), /exact GIL artifact ID|different GIL artifact/);
  }
  const pr = hostedGateFixture();
  pr.options.gilArtifactId = undefined;
  pr.options.requireExplicitGilArtifactId = false;
  assert.equal((await pr.verify()).performance.gil.id, 30);
  pr.control.tag(11, 31);
  await assert.rejects(pr.verify(), /different GIL artifact/);
});

test('v2 verifies the newest numeric RC across result pages and rejects malformed or moved annotations', async () => {
  const stable = hostedGateFixture();
  for (let i = 11; i <= 107; i++) stable.control.tag(i, 20);
  stable.control.tag(108, 30);
  assert.equal((await stable.verify()).performance.gil.id, 30);
  const interruptedPage = url => {
    if (url.endsWith('/tags?per_page=100&page=2')) return {};
    return stable.request(url);
  };
  await assert.rejects(verifyReleasePublication(repo, branch, head, interruptedPage, stable.options), /Missing Release CI list/);
  for (const mutate of [
    tag => {tag.ref.object.type = 'commit';}, tag => {tag.annotated.sha = 'a'.repeat(40);},
    tag => {tag.annotated.object.sha = 'f'.repeat(40);},
    tag => {tag.annotated.message = 'GIL-Artifact-ID: 30\nGIL-Artifact-ID: 31';},
    tag => {tag.annotated.message = 'GIL-Artifact-ID: 1e5';},
  ]) {
    const current = hostedGateFixture();
    mutate(current.control.tag(10, 30));
    await assert.rejects(current.verify(), /RC tag|GIL-Artifact-ID/);
  }
  const moving = hostedGateFixture();
  const request = async (url, ...args) => {
    if (url.includes('/actions/workflows/licenses.yml/runs?')) {
      if (request.reads++ === 2) moving.control.tag(11, 30);
    }
    return moving.request(url, ...args);
  };
  request.reads = 0;
  await assert.rejects(verifyReleasePublication(repo, branch, head, request, moving.options), /RC tag changed/);
});

test('final publication rejects a newer pending Full or Licenses after the formal evidence read', async () => {
  for (const name of ['quality', 'licenses']) {
    const current = hostedGateFixture();
    const previous = current.options.readPerformance;
    current.options.readPerformance = async (...args) => {
      const proof = await previous(...args);
      const run = current.control[name][0];
      current.control[name].push({...run, id:run.id + 1, status:'in_progress', conclusion:null});
      return proof;
    };
    await assert.rejects(current.verify(), /changed during publication verification/);
  }
});

test('freeze dispatches only with exact Quick feedback and a readable audited v2 GIL, and reuses pending Full', async () => {
  const current = hostedGateFixture();
  current.control.quality.length = 0;
  for (const negative of [
    {fastRunId:0}, {gilArtifactId:0}, {readGil:async () => {throw new Error('GIL smoke failed');}},
    {readGil:async () => ({binding:{id:30}})},
  ]) {
    await assert.rejects(current.freeze(negative), /required before requesting Full|GIL smoke failed|audited immutable v2/);
    assert.equal(current.posts.length, 0);
  }
  current.control.fast[0].steps[1].conclusion = 'failure';
  await assert.rejects(current.freeze(), /did not pass/);
  assert.equal(current.posts.length, 0);
  current.control.fast[0].steps[1].conclusion = 'success';
  assert.equal((await current.freeze()).state, 'requested');
  assert.deepEqual(current.posts, [['/actions/workflows/quality.yml/dispatches', {ref:branch, inputs:{runner_pool:'hosted'}}]]);
  Object.assign(current.quality, {status:'in_progress', conclusion:null});
  current.control.quality.push(current.quality);
  assert.equal((await current.freeze({fastRunId:undefined, gilArtifactId:undefined})).state, 'waiting');
  assert.equal(current.posts.length, 1);
});

test('Hotfix-to-master uses the hosted formal performance and GIL custody check', async () => {
  const branch = 'hotfix/v2.2.1';
  const event = {pull_request:{base:{ref:'master',repo:repository},head:{ref:branch,sha:head,repo:repository}}};
  const target = publicationTarget(event, repo, true);
  assert.deepEqual(target, {branch,head});
  const hotfix = fixture({...full,...target});
  assert.equal((await hotfix.check()).branch, branch);
  hotfix.responses.get(hotfix.fullPath).workflow_runs[0].run_attempt = 4;
  await assert.rejects(hotfix.check(), /Frozen Full changed during performance verification/);
  hotfix.responses.get(hotfix.fullPath).workflow_runs[0].run_attempt = 3;
  hotfix.run.run_attempt = 3;
  await assert.rejects(hotfix.check(), /one sealed artifact/);
  const quality = readFileSync(new URL('../.github/workflows/quality.yml',import.meta.url),'utf8').replaceAll('\r\n','\n');
  assert.equal(quality.split(hotfixPublicationGate).length, 2);
  assert(!beforeHotfixPublicationGate(quality).includes('verify-hotfix-pr'));
  assert.equal(beforeHotfixPublicationGate(quality + hotfixPublicationGate), quality + hotfixPublicationGate);
});

test('rejects a foreign, unversioned, protected or non-Hotfix publication ref', () => {
  const source = {ref:'hotfix/v2.2.1',sha:head,repo:repository};
  const base = {ref:'master',repo:repository};
  for (const ref of ['master','develop','hotfix/v02.2.1','hotfix/v2.2','hotfix/v2.2.1-rc','refs/heads/hotfix/v2.2.1']) {
    assert(!formalPublishBranch(ref));
    assert.throws(() => publicationTarget({pull_request:{base,head:{...source,ref}}}, repo, true), /same-repository Hotfix/);
  }
  for (const head of [{...source,ref:'release/v2.2.1'}, {...source,repo:{...repository,id:999}}, {...source,sha:'develop'}]) {
    assert.throws(() => publicationTarget({pull_request:{base,head}}, repo, true), /same-repository Hotfix/);
  }
  for (const other of [{...base,ref:'develop'}, {...base,repo:{...repository,id:999}}]) {
    assert.throws(() => publicationTarget({pull_request:{base:other,head:source}}, repo, true), /same-repository Hotfix/);
  }
});

async function alphaWithLivePerformance(advance) {
  const source = {...full, attempt:1};
  const latest = fixture(source, 1, 30);
  const originalGil = structuredClone(latest.evidence.gil);
  const profile = refinedReleaseOfficialAssetsProfile;
  const candidate = {
    officialAssetsProfile:profile, refinedReleaseMonsterArt:true,
    artFeatures:artFeatureReceipt(refinedReleaseOfficialAssetFlags), uiProfile:uiProfileReceipt(true),
  };
  const authority = 'e'.repeat(40), develop = 'f'.repeat(40), captureSha256 = '2'.repeat(64);
  const approvalPath = '/repos/' + repo + '/contents/data/release/actor-alpha-release-captures.json?ref=' + authority;
  const capture = {
    sourceCommit:head, branch:source.branch, captureSha256, gilArtifactId:originalGil.id,
    candidateSha256:originalGil.gilSha256, candidateReceiptSha256:originalGil.receiptSha256,
    nativeReadbackSha256:'a'.repeat(64), simulatorSaveSha256:'b'.repeat(64),
    artConfigSha256:candidate.artFeatures.configSha256, uiConfigSha256:candidate.uiProfile.configSha256,
    approvalReference:'independent synthetic fixture',
  };
  const request = async path => {
    if (path === '/repos/' + repo + '/git/ref/heads/develop') {
      return {ref:'refs/heads/develop', object:{type:'commit', sha:develop}};
    }
    if (path === '/repos/' + repo + '/compare/' + authority + '...' + develop) {
      return {base_commit:{sha:authority}, merge_base_commit:{sha:authority}, status:'ahead'};
    }
    if (path === approvalPath) {
      return {type:'file', encoding:'base64', path:'data/release/actor-alpha-release-captures.json',
        content:Buffer.from(JSON.stringify({schemaVersion:1, captures:[capture]})).toString('base64')};
    }
    return latest.request(path);
  };
  let reads = 0;
  const check = finalActorAlphaBinding({sourceCommit:head, version:'2.2.0', profile}, authority, captureSha256, {
    request, readPublication:async (repository, branch, head, get, {readPerformance}) => {
      assert.deepEqual([repository, branch, head], [repo, source.branch, source.head]);
      return {...source, performance:await readPerformance(source, get)};
    },
    readPerformance:(proof, get, options) => requireReleasePerformance(proof, get, {...latest.options, ...options}),
    loadPerformanceArtifact:async (...args) => {
      reads++;
      return latest.options.readArtifact(...args);
    },
    readGil:async (_, requestedId) => {
      assert.equal(requestedId, 30);
      advance?.(latest, source);
      return {receipt:candidate, binding:originalGil};
    },
  });
  return {check, reads:() => reads};
}

test('alpha rechecks live release authorization after the GIL read without downloading the formal report twice', async () => {
  const stable = await alphaWithLivePerformance();
  assert.equal((await stable.check).authority.gilArtifactId, 30);
  assert.equal(stable.reads(), 1);

  const racing = await alphaWithLivePerformance((live, source) => {
    const newer = fixture({...source, attempt:2}, 2, 31, 2);
    for (const [path, response] of newer.responses) live.responses.set(path, response);
    assert.equal(newer.run.run_attempt, 2);
    assert.equal(newer.evidence.gil.id, 31);
    assert.equal(newer.responses.get(newer.fullPath).workflow_runs[0].run_attempt, 2);
    assert.equal(newer.responses.get(newer.refPath).object.sha, head);
  });
  await assert.rejects(racing.check, /Formal archive changed while reading the GIL/);
  assert.equal(racing.reads(), 1);
});

test('alpha rejects a new Full attempt during the GIL read even when the formal archive is unchanged', async () => {
  const racing = await alphaWithLivePerformance(live => {
    live.responses.get(live.fullPath).workflow_runs[0].run_attempt = 2;
  });
  await assert.rejects(racing.check, /Frozen Full changed during performance verification/);
  assert.equal(racing.reads(), 1);
});


test('alpha rejects an audited GIL archive identity change after reading its bytes', async () => {
  const racing = await alphaWithLivePerformance(live => {
    live.responses.get('/actions/artifacts/30').digest = 'sha256:' + '0'.repeat(64);
  });
  await assert.rejects(racing.check, /Audited GIL archive changed/);
  assert.equal(racing.reads(), 1);
});
