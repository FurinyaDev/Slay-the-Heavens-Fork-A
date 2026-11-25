import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { test } from 'node:test';
import { api, approvedRequest, digestArtifactDownload, releaseSourceRef, resolveSource, verifyReceipts, verifySource, verifyUploadedArtifact } from '../scripts/gil-candidate.mjs';

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

test('verify the exact uploaded artifact archive and its download link', async () => {
  const now = Date.parse('2026-11-23T00:00:00Z');
  const expected = { id: '11', runId: '10', name: 'versioned-archive', archiveDigest: baseSha256 };
  const artifact = { id: 11, name: expected.name, expired: false, expires_at: '2026-11-24T00:00:00Z',
    size_in_bytes: 42, digest: 'sha256:' + baseSha256, workflow_run: { id: 10 } };
  const request = (changes = {}, downloadable = true) => async (_path, checkDownload) =>
    checkDownload ? downloadable && 'https://blob.example/archive' : { ...artifact, ...changes };
  const download = async location => {
    assert.equal(location, 'https://blob.example/archive');
    return { bytes: 42, sha256: baseSha256 };
  };
  assert.match(await verifyUploadedArtifact(expected, request(), now, download), /runs\/10\/artifacts\/11$/);
  for (const changes of [{ expired: true }, { expires_at: '2026-11-22T00:00:00Z' }, { digest: null },
    { name: 'other' }, { workflow_run: { id: 20 } }]) {
    await assert.rejects(verifyUploadedArtifact(expected, request(changes), now), /metadata or archive digest/);
  }
  await assert.rejects(verifyUploadedArtifact(expected, request({}, false), now), /accessible download link/);
  await assert.rejects(verifyUploadedArtifact(expected, request(), now, async () => ({ bytes: 41, sha256: baseSha256 })), /Downloaded Artifact size or archive SHA-256/);
  await assert.rejects(verifyUploadedArtifact(expected, request(), now, async () => ({ bytes: 42, sha256: '3'.repeat(64) })), /Downloaded Artifact size or archive SHA-256/);
});

test('reject missing protected base URL before downloads', () => {
  const result = spawnSync(process.execPath, ['scripts/gil-candidate.mjs', 'base'], {
    encoding: 'utf8', env: { ...process.env, GIL_BASE_URL: '' },
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Missing protected GIL_BASE_URL/);
});

test('check the download redirect without fetching the archive', async ({ mock }) => {
  const path = 'actions/artifacts/11/zip';
  const fetch = mock.method(globalThis, 'fetch', async () => new Response('{}'));
  await assert.rejects(api(path, true), /download redirect/);
  fetch.mock.mockImplementation(async () => new Response(null, { status: 410 }));
  assert.equal(await api(path, true), null);
  fetch.mock.mockImplementation(async (_url, options) => {
    assert.equal(options.redirect, 'manual');
    return new Response(null, { status: 302, headers: { location: 'https://example.com/archive' } });
  });
  assert.equal(await api(path, true), 'https://example.com/archive');
});

test('stream the signed archive without API credentials and reject additional redirects', async ({ mock }) => {
  const body = 'fixture archive bytes';
  const fetch = mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(String(url), 'https://blob.example/archive');
    assert.equal(options.redirect, 'error');
    assert.equal(options.headers, undefined);
    return new Response(body);
  });
  assert.deepEqual(await digestArtifactDownload('https://blob.example/archive'),
    { bytes: Buffer.byteLength(body), sha256: createHash('sha256').update(body).digest('hex') });
  await assert.rejects(digestArtifactDownload('http://blob.example/archive'), /Invalid GitHub Artifact download URL/);
  fetch.mock.mockImplementation(async () => { throw TypeError('unexpected redirect'); });
  await assert.rejects(digestArtifactDownload('https://blob.example/archive'), /did not finish/);
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

test('classify approved branch and SemVer refs while rejecting arbitrary ref names', () => {
  assert.deepEqual(releaseSourceRef('refs/heads/release/v2.1.1'), {
    ref: 'refs/heads/release/v2.1.1', kind: 'release', version: '2.1.1',
  });
  assert.equal(releaseSourceRef('engine-v2.1.1').kind, 'tag');
  assert.equal(releaseSourceRef('refs/tags/v2.1.1').version, '2.1.1');
  assert.equal(releaseSourceRef('develop').kind, 'develop');
  assert.equal(releaseSourceRef(sourceSha).kind, 'develop');
  for (const ref of ['release/v02.1.1', 'v2.1.1-rc.1', 'refs/pull/1/merge', 'feature/anything', 'master^', 'a b']) {
    assert.throws(() => releaseSourceRef(ref), /Unsupported source ref/);
  }
});

test('release and tag requests bind only an approved immutable commit or explicit source ref', () => {
  const release = releaseSourceRef('release/v2.1.1');
  const approved = approvedRequest(JSON.stringify({ ...approval, sourceSha: undefined, sourceRef: release.ref }), sourceSha, 'policy', release);
  assert.equal(approved.configuration.releaseCandidate, true);
  assert.equal(approved.sourceRef, release.ref);
  assert.throws(() => approvedRequest(JSON.stringify({ ...approval, sourceSha: undefined, sourceRef: 'refs/heads/develop' }), sourceSha, 'policy', release), /Approval must cover/);
  assert.throws(() => approvedRequest(JSON.stringify({ ...approval, sourceSha: '3'.repeat(40), sourceRef: release.ref }), sourceSha, 'policy', release), /Approval must cover/);
});


test('bind a release push to its event commit through fast-forward and peel annotated official tags', async () => {
  const release = releaseSourceRef('release/v2.1.1');
  const branchTip = '3'.repeat(40);
  const mockRelease = async path => {
    if (path === 'git/ref/heads/release/v2.1.1') return { ref: release.ref, object: { type: 'commit', sha: branchTip } };
    assert.equal(path, `compare/${sourceSha}...release%2Fv2.1.1?per_page=1`);
    return { status: 'ahead', merge_base_commit: { sha: sourceSha } };
  };
  assert.equal(await resolveSource(release, 'push', sourceSha, mockRelease), sourceSha);
  assert.equal(await resolveSource(release, 'workflow_dispatch', undefined, mockRelease), branchTip);
  const tag = releaseSourceRef('engine-v2.1.1');
  const tagObjectSha = '4'.repeat(40);
  const mockTag = async path => {
    if (path === 'git/ref/tags/engine-v2.1.1') return { ref: tag.ref, object: { type: 'tag', sha: tagObjectSha } };
    if (path === `git/tags/${tagObjectSha}`) return { object: { type: 'commit', sha: sourceSha } };
    assert.equal(path, `compare/${sourceSha}...master?per_page=1`);
    return { status: 'identical', merge_base_commit: { sha: sourceSha } };
  };
  assert.equal(await resolveSource(tag, 'push', tagObjectSha, mockTag), sourceSha);
  await assert.rejects(resolveSource(tag, 'push', branchTip, mockTag), /Tag changed/);
  await assert.rejects(resolveSource(releaseSourceRef('develop'), 'push', sourceSha, () => assert.fail()), /exact release or tag SHA/);
});
