import assert from 'node:assert/strict';
import test from 'node:test';
import {requireReleasePerformance} from '../scripts/runtime-baseline/require-release-performance.mjs';
import {sha256} from '../scripts/runtime-baseline/release-performance-artifacts.mjs';
import {head, tree, published, sha256 as workloadSha256, reportFixture, receipt} from './helpers/release-performance-fixture.mjs';

const repo = 'FurinyaWorks/Slay-the-Heavens';
const repository = {id:1429751262};
const branch = 'release/v2.2.0';
const version = '2.2.0';
const formalName = 'release-performance-40-2';
const refPath = '/git/ref/heads/' + branch;
const workflowPath = '/actions/workflows/performance-regression.yml/runs?event=workflow_dispatch&branch=' +
  encodeURIComponent(branch) + '&head_sha=' + head + '&per_page=100&page=1';
const fullPath = '/actions/workflows/quality.yml/runs?event=workflow_dispatch&branch=' +
  encodeURIComponent(branch) + '&per_page=100&page=1';
const full = {repo, branch, head, runId:10, attempt:3, checkoutArtifactId:60};

function fixture() {
  const controller = '1'.repeat(40);
  const gil = {name:'gil-candidate-v' + version + '-' + head + '-' + '2'.repeat(64), id:30, runId:20, attempt:1, controllerSha:controller,
    digest:'sha256:' + '3'.repeat(64), gilSha256:'4'.repeat(64), payloadDigest:'5'.repeat(64), buildId:'f960b8ee-5310-47d9-b21b-3bea1ef578c1',
    receiptSha256:'6'.repeat(64), manifestSha256:'7'.repeat(64), qualityRun:full.runId, qualityAttempt:full.attempt,
    qualityCheckoutArtifact:full.checkoutArtifactId};
  const formal = {name:formalName, id:50, runId:40, attempt:2, controllerSha:head, digest:'sha256:' + '8'.repeat(64)};
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
  responses.set(fullPath, {workflow_runs:[{id:full.runId, run_attempt:full.attempt, head_sha:head, status:'completed', conclusion:'success'}]});
  responses.set('/actions/runs/40/artifacts?per_page=100&page=1', {artifacts:[artifact]});
  const report = Buffer.from(JSON.stringify(reportFixture()));
  const evidence = {schemaVersion:1, kind:'release-performance', source:{head, branch, version, tree}, runId:40, attempt:2,
    gil, published, workloadSha256, reportSha256:sha256(report), artFeatures:receipt.artFeatures};
  const options = {
    readSource:() => ({version, tree, workloadSha256}), readBaseline:async () => published,
    readArtifact:async locator => {
      assert.equal(locator.id, 50);
      return {'report.json':report, 'evidence.json':Buffer.from(JSON.stringify(evidence))};
    },
  };
  const request = async path => responses.get(path.slice(('/repos/' + repo).length));
  return {options, request, check:() => requireReleasePerformance(full, request, options), responses, evidence, run};
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
  missing.responses.set(workflowPath, {workflow_runs:[]});
  await assert.rejects(missing.check(), /Latest formal release performance run must pass/);
  const failing = fixture();
  failing.responses.get(workflowPath).workflow_runs.push({...failing.run, id:41, conclusion:'failure'});
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
    moving.responses.get(refPath).object.sha = 'f'.repeat(40);
    return original(locator);
  };
  await assert.rejects(moving.check(), /Release HEAD changed/);
});

test('a new Full attempt or checkout receipt on the same run and source invalidates the GIL and formal result', async () => {
  const current = fixture();
  await assert.rejects(requireReleasePerformance({...full, attempt:4}, current.request, current.options), /current frozen Full run, attempt/);
  await assert.rejects(requireReleasePerformance({...full, checkoutArtifactId:61}, current.request, current.options), /checkout artifact differ/);
  current.responses.get(fullPath).workflow_runs[0].run_attempt = 4;
  await assert.rejects(current.check(), /Frozen Full changed during performance verification/);
});
