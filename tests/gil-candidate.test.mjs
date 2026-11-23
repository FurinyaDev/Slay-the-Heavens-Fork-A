import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { test } from 'node:test';
import { approvedRequest, findArtifact, verifyReceipts, verifySource } from '../scripts/gil-candidate.mjs';

const sourceSha = '1'.repeat(40);
const baseSha256 = '2'.repeat(64);
const workKey = 'production-work';
const repo = { id: 1429751262 };
const approval = { sourceSha, baseSha256, workKey, reference: 'owner/42', baseProcessingApproved: true, publicArtifactApproved: true };
const request = changes => approvedRequest(JSON.stringify({ ...approval, ...changes }), sourceSha, 'policy');

function formalApi({ comparison = { status: 'ahead', merge_base_commit: { sha: sourceSha } },
  conclusion = 'success', absentJob = '', runAttempt = 1 } = {}) {
  return async path => {
    if (path.startsWith('compare/')) return comparison;
    const name = path.includes('/quality.yml/') ? 'quality' : 'licenses';
    const id = name === 'quality' ? 1 : 2;
    if (path.startsWith('actions/workflows/')) return { workflow_runs: [{
      id, status: 'completed', conclusion, repository: repo, head_repository: repo, run_attempt: 1,
      head_branch: 'develop', head_sha: sourceSha, event: 'push', path: `.github/workflows/${name}.yml`,
    }] };
    if (path.includes('/jobs?')) {
      const runId = Number(path.split('/')[2]);
      const names = runId === 1 ? ['impact', 'check', 'presentation', 'engineering-posix'] : ['inventory'];
      const jobs = names.filter(job => job !== absentJob).map(name => ({
        name, status: 'completed', conclusion: 'success', run_id: runId, head_sha: sourceSha,
      }));
      return { jobs, total_count: jobs.length };
    }
    return { id: Number(path.split('/').at(-1)), run_attempt: runAttempt, conclusion: 'success' };
  };
}

test('admit only exact merged source with successful current Quality and inventory jobs', async () => {
  assert.deepEqual(await verifySource(sourceSha, formalApi()), { quality: 1, licenses: 2 });
  await assert.rejects(verifySource('develop; bad', () => assert.fail('queried invalid SHA')), /40-character/);
  await assert.rejects(verifySource(sourceSha, formalApi({ comparison: { status: 'diverged' } })), /not an ancestor/);
  await assert.rejects(verifySource(sourceSha, formalApi({ conclusion: 'failure' })), /must be successful/);
  await assert.rejects(verifySource(sourceSha, formalApi({ absentJob: 'inventory' })), /jobs must succeed/);
  await assert.rejects(verifySource(sourceSha, formalApi({ runAttempt: 2 })), /changed during verification/);
});

test('require bound base, work-key and public distribution authorization', () => {
  const candidate = request();
  assert.equal(candidate.configuration.releaseCandidate, false);
  assert.throws(() => approvedRequest('', sourceSha), /Set GIL_CANDIDATE_APPROVAL/);
  for (const changes of [{ sourceSha: '9'.repeat(40) }, { publicArtifactApproved: false }, { baseProcessingApproved: false },
    { workKey: 'alpha-test' }, { baseSha256: 'unknown' }]) {
    assert.throws(() => request(changes), /Approval must cover/);
  }
  assert.notEqual(candidate.id, request({ baseSha256: '3'.repeat(64) }).id);
  assert.notEqual(candidate.id, request({ workKey: 'other-work' }).id);
  assert.notEqual(candidate.id, approvedRequest(JSON.stringify(approval), sourceSha, 'new policy').id);
});

test('reuse only a matching unexpired Artifact on a successful main develop dispatch', async () => {
  const candidate = request();
  const now = Date.parse('2026-11-23T00:00:00Z');
  const run = { id: 10, repository: repo, head_repository: repo, event: 'workflow_dispatch', conclusion: 'success',
    head_branch: 'develop', display_title: `GIL candidate / ${sourceSha}`, path: '.github/workflows/gil-candidate.yml' };
  const artifact = { id: 11, name: `gil-candidate-${candidate.id}`, expired: false,
    expires_at: '2026-11-24T00:00:00Z', size_in_bytes: 42, digest: 'sha256:' + baseSha256, workflow_run: { id: run.id } };
  const api = (runChanges = {}, artifactChanges = {}) => async path => path.includes('/artifacts?')
    ? { artifacts: [{ ...artifact, ...artifactChanges }] } : { workflow_runs: [{ ...run, ...runChanges }] };
  assert.match(await findArtifact(api(), candidate, '20', now), /runs\/10\/artifacts\/11$/);
  assert.equal(await findArtifact(api(), candidate, '10', now), undefined);
  assert.equal(await findArtifact(api({ head_repository: { id: 3 } }), candidate, '20', now), undefined);
  for (const changes of [{ expired: true }, { expires_at: '2026-11-22T00:00:00Z' }, { digest: null }, { name: 'other' }]) {
    assert.equal(await findArtifact(api({}, changes), candidate, '20', now), undefined);
  }
});

test('reject missing protected base URL before downloads', () => {
  const result = spawnSync(process.execPath, ['scripts/gil-candidate.mjs', 'base'], {
    encoding: 'utf8', env: { ...process.env, GIL_BASE_URL: '' },
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Missing protected GIL_BASE_URL/);
});

test('bind the exact full and final audio receipts, final bytes and production profile', () => {
  const fullGil = { bytes: 6, sha256: '4'.repeat(64) };
  const finalGil = { bytes: 9, sha256: '5'.repeat(64) };
  const full = { sourceCommit: sourceSha, sourceDirty: false, liveWriteEnabled: false,
    buildId: '11111111-1111-4111-a111-111111111111', payloadDigest: '6'.repeat(64),
    moduleDigests: { abyss_bgm: '7'.repeat(64) }, release: { workKey }, candidate: fullGil,
    baseMap: { sha256: baseSha256 }, statuses: { staticCheck: 'pass' },
    officialAssetsProfile: 'official-assets-battle-v3', uiProfile: { nativePageLifecycle: true },
    nativeMonsterArt: { assetCount: 42, bindingCount: 42 },
    toolchainIdentity: { sourceSha256: request().encoderSha256 },
  };
  const fullReceipt = Buffer.from(JSON.stringify(full));
  const audio = { ...full, candidate: finalGil, sha256: finalGil.sha256,
    baseSha256: fullGil.sha256, baseAfter: fullGil.sha256, checked: { ok: true, errors: 0 },
    compiled: { written: [{ graphId: 1 }] },
    sourceReceipt: { bytes: fullReceipt.length, sha256: createHash('sha256').update(fullReceipt).digest('hex') },
  };
  const claimed = { full, audio, fullReceipt, fullGil, finalGil, baseSha256, sourceSha, workKey };
  assert.doesNotThrow(() => verifyReceipts(claimed));
  for (const change of [{ sourceDirty: true }, { sourceCommit: '8'.repeat(40) }, { toolchainIdentity: { sourceSha256: '0'.repeat(64) } },
    { sha256: fullGil.sha256 }, { baseAfter: finalGil.sha256 }, { compiled: { written: [] } }, { checked: { ok: false, errors: 1 } },
    { moduleDigests: {} }, { sourceReceipt: { ...audio.sourceReceipt, bytes: 0 } }]) {
    assert.throws(() => verifyReceipts({ ...claimed, audio: { ...audio, ...change } }));
  }
  assert.throws(() => verifyReceipts({ ...claimed, finalGil: { ...finalGil, bytes: 10 } }), /size or SHA-256/);
});
