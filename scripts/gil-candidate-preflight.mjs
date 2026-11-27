import { createHash } from 'node:crypto';
import { githubRequest, verifyReleaseFull } from './release-ci.mjs';
import { legacyGilArchive } from './runtime-baseline/published-baseline.mjs';

export const repository = 'FurinyaWorks/Slay-the-Heavens';
export const repositoryId = 1429751262;
export const toolCommit = '70470757d6fcb319c5afec13b178c87f2d8d54b3';
export const encoderSha256 = 'eed054eea9285d1945ec826299e1e9546e36475d708007b2df1952ebca52f805';
export const profile = 'official-assets-battle-v3';
export const sha = /^[a-f0-9]{40}$/;
export const digest = /^[a-f0-9]{64}$/;
export const frozenBuildCustody = 'gil-build-v2';
export const legacyBuildCustody = 'gil-build-v1';
export const legacyReleaseBranch = 'release/v2.2.0';
// Exact checkedFiles vector shared by the original develop controller (32a15219)
// and the active v2.2.0 release workflow, in their original request order.
const legacyBuildPolicy = Object.freeze([
  '03808ddb78683f4749a496350339f5c2622891475e543867766c470f24a5b3e7',
  '18480ebbad596343e5342c75935d24e165610406220f2e5264e54ad397434a26',
  'd02481b885efb0aa4e86951dab8c86fdc28864c4e463bae9b6dc6d0fcb86f7f2',
  '842f2def14a7d793ee0b714201f096679d1dc5a8ae31c8d5e72bf735979d9588',
  '2ea667ebedb6202c899f0a86ed4a8794a2101f013157a046658038f4a8f6bfd1',
  'e430edffb90f3798e8583c70bffd40370870811fa4ef084fca59106fcaa07b58',
]);
const offlineWorkKey = 'offline-candidate';
const validReleaseWorkKey = value => typeof value === 'string' &&
  /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) && !['alpha-test', 'offline-performance'].includes(value);
const hash = data => createHash('sha256').update(data).digest('hex');

export class GateError extends Error {}
export function requireGate(condition, message) {
  if (!condition) throw new GateError(message);
}

export function candidateTarget(branch, source) {
  requireGate(sha.test(source), 'source_sha must be a 40-character lowercase Git SHA.');
  if (branch === 'develop') return { branch };
  const version = /^(?:release|hotfix)\/(v(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*))$/.exec(branch)?.[1];
  requireGate(version, 'Select develop, release/vX.Y.Z or hotfix/vX.Y.Z.');
  return { branch, version };
}

export function validationTarget(repository, ref, source) {
  requireGate(sha.test(source), 'Validation requires an exact source SHA.');
  const primary = repository === String(repositoryId) &&
    /^refs\/heads\/(?:develop|master|test\/gil-build\/.+)$/.test(ref);
  const fork = repository === '1460133275' && /^refs\/heads\/ci\/full\/gil-build\/[a-z0-9][a-z0-9._-]*$/.test(ref);
  requireGate(primary || fork, 'Validation requires an enabled primary ref or the assigned Fork B validation branch.');
  return { branch: ref.slice('refs/heads/'.length) };
}

export function releaseBuildTarget({ repoId, ref, controllerSha, source, branch, event, inputs, upstream }) {
  const primaryDevelop = repoId === String(repositoryId) && ref === 'refs/heads/develop' && sha.test(controllerSha);
  if (event === 'workflow_run') {
    requireGate(primaryDevelop && branch === legacyReleaseBranch &&
      upstream?.repository?.id === repositoryId && upstream.head_repository?.id === repositoryId &&
      upstream.event === 'workflow_dispatch' && upstream.status === 'completed' && upstream.conclusion === 'success' &&
      ['.github/workflows/quality.yml', '.github/workflows/licenses.yml'].includes(upstream.path) &&
      upstream.head_branch === branch && upstream.head_sha === source,
    'Automatic GIL requires a trusted legacy v2.2.0 release gate dispatch.');
    return { ...candidateTarget(branch, source), legacy: true };
  }
  const { source_branch, source_sha } = inputs ?? {};
  const frozen = /^(?:release|hotfix)\//.test(branch ?? '');
  if (!frozen && !source_branch && !source_sha && ref === `refs/heads/${branch}` && source === controllerSha) return;
  requireGate(primaryDevelop && event === 'workflow_dispatch', 'A formal GIL requires explicit dispatch on primary develop.');
  requireGate(branch !== legacyReleaseBranch, 'The existing v2.2.0 release uses its original GIL entry points.');
  requireGate(source_branch === branch && source_sha === source, 'A formal GIL requires explicit source_branch and source_sha inputs.');
  const target = candidateTarget(branch, source);
  requireGate(target.version, 'A formal GIL requires a frozen release or hotfix branch.');
  return target;
}

export async function verifyFrozenHead(api, branch, source) {
  const ref = await api(`git/ref/heads/${branch}`);
  requireGate(ref.ref === `refs/heads/${branch}` && ref.object?.type === 'commit' && ref.object.sha === source,
    'Frozen branch HEAD changed. Freeze and validate the new SHA.');
}

export async function verifyFrozenQuality(branch, source,
    verifyFull = (ref, head) => verifyReleaseFull(repository, ref, head, githubRequest)) {
  try {
    const { runId, attempt, checkoutArtifactId } = await verifyFull(branch, source);
    requireGate([runId, attempt, checkoutArtifactId].every(id => Number.isSafeInteger(id) && id > 0), 'Incomplete Full identity.');
    return { quality: runId, qualityAttempt: attempt, qualityCheckoutArtifact: checkoutArtifactId };
  } catch {
    throw new GateError('Frozen branch HEAD requires a successful hosted Quality Full and exact checkout receipt.');
  }
}

export async function verifySource(source, api, { branch = 'develop', version } = { branch: 'develop' }, verifyFull) {
  requireGate(sha.test(source), 'source_sha must be a 40-character lowercase Git SHA.');
  const checks = [['licenses', ['inventory']]];
  let quality;
  if (version) {
    quality = await verifyFrozenQuality(branch, source, verifyFull);
  } else {
    const comparison = await api(`compare/${source}...develop?per_page=1`);
    requireGate(['ahead', 'identical'].includes(comparison.status) && comparison.merge_base_commit?.sha === source,
      'source_sha is not an ancestor of main-repository develop.');
    checks.unshift(['quality', ['impact', 'check', 'presentation', 'engineering-posix']]);
  }
  const event = version ? 'workflow_dispatch' : 'push';
  const results = await Promise.all(checks.map(async ([name, required]) => {
    const { workflow_runs: [run] } = await api(`actions/workflows/${name}.yml/runs?branch=${encodeURIComponent(branch)}&event=${event}&head_sha=${source}&per_page=1`);
    requireGate(run?.repository?.id === repositoryId && run.head_repository?.id === repositoryId &&
      run.path === `.github/workflows/${name}.yml` && run.head_sha === source && run.head_branch === branch &&
      run.event === event && run.status === 'completed' && run.conclusion === 'success',
    `Latest ${name}.yml ${event} run on ${branch} for source_sha must be successful.`);
    const { jobs, total_count: count } = await api(`actions/runs/${run.id}/jobs?per_page=100`);
    requireGate(count === jobs.length && required.every(jobName => {
      const matching = jobs.filter(job => job.name === jobName);
      return matching.length === 1 && matching[0].head_sha === source && matching[0].run_id === run.id &&
        matching[0].status === 'completed' && matching[0].conclusion === 'success';
    }), `Required ${name}.yml jobs must succeed on source_sha.`);
    const current = await api(`actions/runs/${run.id}`);
    requireGate(current.id === run.id && current.run_attempt === run.run_attempt && current.conclusion === 'success',
      `${name}.yml run changed during verification.`);
    return [name, run.id];
  }));
  if (version) {
    await verifyFrozenHead(api, branch, source);
  }
  return { ...Object.fromEntries(results), ...quality };
}

export function approvedRequest(raw, sourceSha, policy, { branch = 'develop', version } = { branch: 'develop' }) {
  let approval;
  try { approval = JSON.parse(raw); } catch {
    throw new GateError('Set GIL_CANDIDATE_APPROVAL with the authorized base, work-key and public Artifact decision.');
  }
  const { baseSha256, workKey } = approval ?? {};
  requireGate(approval?.sourceSha === sourceSha && approval.sourceBranch === branch && approval.baseProcessingApproved === true &&
    approval.publicArtifactApproved === true && /^[A-Za-z0-9._/-]{1,120}$/.test(approval.reference ?? '') &&
    (version ? approval.version === version : approval.version == null) &&
    digest.test(baseSha256) && workKey !== 'alpha-test' && workKey !== offlineWorkKey && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(workKey ?? ''),
  'Approval must cover this source SHA, release branch and version if applicable, base SHA-256, processing, public distribution and the confirmed production work-key.');
  const configuration = { profile, nativePageLifecycle: true, releaseCandidate: Boolean(version), workKey, node: '24.18.0', python: '3.12.10' };
  const identity = { sourceSha, baseSha256, toolCommit, encoderSha256, branch, version, configuration, policy };
  return { ...identity, id: hash(JSON.stringify(identity)) };
}

export function buildOnlyRequest(sourceSha, policy, { branch, version }) {
  const configuration = { profile, nativePageLifecycle: true, releaseCandidate: Boolean(version),
    workKey: offlineWorkKey, node: '24.18.0', python: '3.12.10' };
  const identity = { sourceSha, baseSha256: legacyGilArchive.sha256, toolCommit, encoderSha256, branch, version,
    configuration, policy, archive: false };
  return { ...identity, id: hash(JSON.stringify(identity)) };
}

function releaseBuildIdentity(configuredWorkKey, sourceSha, { branch, version }) {
  requireGate(version && candidateTarget(branch, sourceSha).version === version,
    'A release Artifact requires a frozen engineering version.');
  const workKey = (configuredWorkKey ?? '') === '' ? offlineWorkKey : configuredWorkKey;
  requireGate(validReleaseWorkKey(workKey), 'GIL_PRODUCTION_WORK_KEY must be a valid non-Alpha release work key when set.');
  const configuration = { profile, nativePageLifecycle: true, releaseCandidate: true, workKey, node: '24.18.0', python: '3.12.10' };
  return { sourceSha, baseSha256: legacyGilArchive.sha256, toolCommit, encoderSha256, branch, version, configuration };
}

export function releaseBuildRequest(configuredWorkKey, sourceSha, target, checkedFiles) {
  requireGate(Array.isArray(checkedFiles) && checkedFiles.length > 0 && checkedFiles.every(value => digest.test(value)),
    'A release Artifact requires exact build policy identities.');
  const identity = { ...releaseBuildIdentity(configuredWorkKey, sourceSha, target), custody: frozenBuildCustody, checkedFiles };
  return { ...identity, id: hash(JSON.stringify(identity)) };
}

export function legacyReleaseBuildRequest(configuredWorkKey, sourceSha, target, checks) {
  requireGate(target.branch === legacyReleaseBranch, 'Legacy GIL requests require the existing v2.2.0 release.');
  requireGate(checks && [checks.quality, checks.qualityAttempt, checks.qualityCheckoutArtifact, checks.licenses]
    .every(value => Number.isSafeInteger(value) && value > 0), 'A legacy GIL build requires exact Full, checkout and Licenses identities.');
  const identity = { ...releaseBuildIdentity(configuredWorkKey, sourceSha, target),
    custody: legacyBuildCustody, checks, checkedFiles: legacyBuildPolicy };
  return { ...identity, id: hash(JSON.stringify(identity)) };
}

export const artifactName = request => request.version
  ? `gil-candidate-${request.version}-${request.sourceSha}-${request.id}`
  : `gil-candidate-${request.id}`;

export async function findArtifact(api, request, runId, now = Date.now()) {
  for (let page = 1; page <= 10; page++) {
    const { workflow_runs: runs } = await api(`actions/workflows/gil-candidate.yml/runs?branch=develop&event=workflow_dispatch&status=success&per_page=100&page=${page}`);
    for (const run of runs) {
      if (String(run.id) === runId || run.repository?.id !== repositoryId || run.head_repository?.id !== repositoryId ||
        run.head_branch !== 'develop' || run.head_sha !== request.policy.controllerSha ||
        run.event !== 'workflow_dispatch' || run.status !== 'completed' || run.conclusion !== 'success' ||
        run.path !== '.github/workflows/gil-candidate.yml' ||
        run.display_title?.toLowerCase() !== `gil candidate / ${request.branch} / ${request.sourceSha}`) continue;
      const name = artifactName(request);
      const { artifacts } = await api(`actions/runs/${run.id}/artifacts?name=${name}`);
      const artifact = artifacts.find(item => item.name === name && item.expired === false && Date.parse(item.expires_at) > now &&
        item.size_in_bytes > 0 && /^sha256:[a-f0-9]{64}$/.test(item.digest ?? '') && item.workflow_run?.id === run.id);
      if (artifact && await api(`actions/artifacts/${artifact.id}/zip`, true))
        return `https://github.com/${repository}/actions/runs/${run.id}/artifacts/${artifact.id}`;
    }
    if (runs.length < 100) return;
  }
}

export async function api(path, checkDownload = false) {
  const response = await fetch(`https://api.github.com/repos/${repository}/${path}`, {
    headers: { Authorization: `Bearer ${process.env.GH_TOKEN}`, Accept: 'application/vnd.github+json' },
    signal: AbortSignal.timeout(20000), redirect: checkDownload ? 'manual' : 'error',
  });
  if (checkDownload && [404, 410].includes(response.status)) return false;
  if (checkDownload) {
    requireGate(response.status === 302 && response.headers.get('location'), 'GitHub did not return a candidate download redirect.');
    return true;
  }
  requireGate(response.ok, path.startsWith('compare/') && response.status === 404
    ? 'source_sha is unknown in the main repository.' : `GitHub API verification failed (HTTP ${response.status}).`);
  return response.json();
}
