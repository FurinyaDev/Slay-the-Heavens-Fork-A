import assert from 'node:assert/strict';
import test from 'node:test';
import {sha256, verifyGilArtifact} from '../scripts/runtime-baseline/release-performance-artifacts.mjs';

const id = 1429751262;
const head = 'a'.repeat(40);
const target = {branch:'release/v2.2.0', head, version:'2.2.0'};
const controllerSha = 'b'.repeat(40);
const requestId = 'c'.repeat(64);
const apiPrefix = '/repos/FurinyaWorks/Slay-the-Heavens';

function fixture() {
  const files = {'candidate.gil': Buffer.from('artifact fixture')};
  const candidate = {path:'candidate.gil', bytes:files['candidate.gil'].length, sha256:sha256(files['candidate.gil'])};
  const buildId = '29f48ea1-fa9d-4f76-b124-2bffc83f7594';
  const payloadDigest = 'd'.repeat(64);
  const workKey = 'release_220';
  const receipt = {receiptSchema:'github-actions-gil-v1', sourceCommit:head, sourceBranch:target.branch, sourceDirty:false,
    candidate, buildId, payloadDigest, liveWriteEnabled:false, release:{version:target.version, workKey, notesSha256:'1'.repeat(64)},
    sha256:candidate.sha256, bgmGraphReadback:{id:123, status:'pass'}, staticCheck:'pass', moduleReadback:'pass', artFeatures:{flags:{}}};
  const manifest = {sourceCommit:head, sourceBranch:target.branch, version:target.version, controllerSha, buildId, payloadDigest, candidate,
    nativeAudit:'pass', platformVersion:null, requestId, baseSha256:'3'.repeat(64), toolCommit:'4'.repeat(40), encoderSha256:'5'.repeat(64),
    receipts:{nativeSha256:'6'.repeat(64), audioSha256:'7'.repeat(64)},
    parameters:{releaseCandidate:true, liveWrite:false, nativePageLifecycle:true, profile:'official-assets-battle-v3', workKey},
    sourceChecks:{qualityRun:10, licensesRun:11}};
  files['candidate.json'] = Buffer.from(JSON.stringify(receipt));
  files['manifest.json'] = Buffer.from(JSON.stringify(manifest));
  files.SHA256SUMS = Buffer.from(Object.entries(files).map(([name, bytes]) => sha256(bytes) + '  ' + name + '\n').join(''));
  const artifact = {id:1, name:'gil-candidate-' + target.version + '-' + head + '-' + requestId, expired:false,
    expires_at:'2099-11-25T00:00:00Z', created_at:'2026-11-25T12:01:00Z', digest:'sha256:' + '2'.repeat(64),
    workflow_run:{id:2, repository_id:id, head_repository_id:id, head_branch:'develop', head_sha:controllerSha}};
  const run = {id:2, run_attempt:3, repository:{id}, head_repository:{id}, path:'.github/workflows/gil-candidate.yml',
    event:'workflow_dispatch', head_branch:'develop', head_sha:controllerSha, status:'completed', conclusion:'success',
    display_title:'GIL candidate / ' + target.branch + ' / ' + head};
  const attempt = {...run, run_started_at:'2026-11-25T12:00:00Z'};
  const jobs = [{head_sha:controllerSha, run_attempt:3, conclusion:'success',
    steps:[{name:'Verify the archived download', conclusion:'success'}]}];
  const responses = new Map([
    ['/actions/artifacts/1', artifact],
    ['/actions/runs/2', run],
    ['/actions/runs/2/attempts/3', attempt],
    ['/actions/runs/2/attempts/3/jobs?per_page=100', {jobs}],
  ]);
  const request = async path => responses.get(path.slice(apiPrefix.length));
  return {request, load:async () => files, files, artifact, run, attempt, jobs};
}

test('uses the actual bytes from the trusted hosted native-audio artifact', async () => {
  const f = fixture();
  const proof = await verifyGilArtifact(f.request, 1, target, f.load);
  assert.equal(proof.binding.attempt, 3);
  assert.equal(proof.binding.qualityRun, 10);
  assert.equal(proof.binding.gilSha256, sha256(f.files['candidate.gil']));
});

test('rejects a reused artifact from an older attempt or an untrusted controller', async () => {
  const stale = fixture();
  stale.attempt.run_started_at = '2026-11-25T12:02:00Z';
  await assert.rejects(verifyGilArtifact(stale.request, 1, target, stale.load), /same successful workflow attempt/);
  const foreign = fixture();
  foreign.run.head_repository.id = 5;
  await assert.rejects(verifyGilArtifact(foreign.request, 1, target, foreign.load), /Trusted successful workflow/);
});

test('rejects a changed GIL or an absent archive readback step', async () => {
  const changed = fixture();
  changed.files['candidate.gil'] = Buffer.from('invalid artifact bytes');
  await assert.rejects(verifyGilArtifact(changed.request, 1, target, changed.load), /GIL checksums differ/);
  const noReadback = fixture();
  noReadback.jobs[0].steps = [];
  await assert.rejects(verifyGilArtifact(noReadback.request, 1, target, noReadback.load), /verified publication step/);
});
