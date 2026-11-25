import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { createWriteStream, readFileSync, writeFileSync, appendFileSync, mkdirSync, copyFileSync, renameSync, rmSync, readdirSync, existsSync } from 'node:fs';
import { basename, join, relative, resolve } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repository = 'FurinyaWorks/Slay-the-Heavens';
const repositoryId = 1429751262;
const toolCommit = '70470757d6fcb319c5afec13b178c87f2d8d54b3';
const encoderSha256 = 'eed054eea9285d1945ec826299e1e9546e36475d708007b2df1952ebca52f805';
const profile = 'official-assets-battle-v3';
const sha = /^[a-f0-9]{40}$/;
const semver = '(?:0|[1-9]\\d*)\\.(?:0|[1-9]\\d*)\\.(?:0|[1-9]\\d*)';
const versionPattern = new RegExp(`^${semver}$`);
const releaseRef = new RegExp(`^(?:refs/heads/)?(release/v(${semver}))$`);
const tagRef = new RegExp(`^(?:refs/tags/)?((?:engine-)?v(${semver}))$`);
const digest = /^[a-f0-9]{64}$/;
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
const basePath = () => join(process.env.RUNNER_TEMP, 'gil-base.gil');
const hash = data => createHash('sha256').update(data).digest('hex');
const json = path => JSON.parse(readFileSync(path, 'utf8'));
const moduleAt = (root, path) => import(pathToFileURL(resolve(root, path)).href);

class GateError extends Error {}
function requireGate(condition, message) {
  if (!condition) throw new GateError(message);
}

export function releaseSourceRef(value) {
  const release = releaseRef.exec(value);
  if (release) return { ref: `refs/heads/${release[1]}`, kind: 'release', version: release[2] };
  const tag = tagRef.exec(value);
  if (tag) return { ref: `refs/tags/${tag[1]}`, kind: 'tag', version: tag[2] };
  if (value === 'develop' || value === 'refs/heads/develop' || sha.test(value)) {
    return { ref: 'refs/heads/develop', kind: 'develop', ...(sha.test(value) ? { sha: value } : {}) };
  }
  throw new GateError('Unsupported source ref. Use develop, a verified develop SHA, a release branch or a SemVer tag.');
}

async function assertAncestor(source, branch, api) {
  const comparison = await api(`compare/${source}...${encodeURIComponent(branch)}?per_page=1`);
  requireGate(['ahead', 'identical'].includes(comparison.status) && comparison.merge_base_commit?.sha === source,
    `Source is not an ancestor of main-repository ${branch}.`);
}

export async function resolveSource(request, event, eventSha, api) {
  if (event === 'push') {
    requireGate(request.kind !== 'develop' && sha.test(eventSha), 'Automatic GIL builds require an exact release or tag SHA.');
  } else {
    requireGate(event === 'workflow_dispatch', 'Unsupported GIL candidate event.');
  }
  if (request.sha) return request.sha;
  const ref = await api(`git/ref/${request.ref.slice(5)}`);
  requireGate(ref.ref === request.ref, 'Requested source ref differs from the repository ref.');
  requireGate(request.kind !== 'tag' || ref.object?.type === 'tag', 'Formal GIL delivery requires an annotated SemVer tag.');
  let object = ref.object;
  for (let depth = 0; depth < 5 && object?.type === 'tag' && sha.test(object.sha); depth++) {
    object = (await api(`git/tags/${object.sha}`)).object;
  }
  requireGate(object?.type === 'commit' && sha.test(object.sha), 'Source ref does not identify a commit.');
  if (request.kind === 'tag') {
    if (event === 'push') requireGate(eventSha === object.sha || eventSha === ref.object.sha, 'Tag changed after the push event.');
    await assertAncestor(object.sha, 'master', api);
    return object.sha;
  }
  if (event === 'push' && eventSha !== object.sha) await assertAncestor(eventSha, request.ref.slice(11), api);
  return event === 'push' ? eventSha : object.sha;
}

export async function verifySource(source, api) {
  requireGate(sha.test(source), 'source_sha must be a 40-character lowercase Git SHA.');
  await assertAncestor(source, 'develop', api);
  const checks = [['quality', ['impact', 'check', 'presentation', 'engineering-posix']], ['licenses', ['inventory']]];
  return Object.fromEntries(await Promise.all(checks.map(async ([name, required]) => {
    const { workflow_runs: [run] } = await api(`actions/workflows/${name}.yml/runs?branch=develop&event=push&head_sha=${source}&per_page=1`);
    requireGate(run?.repository?.id === repositoryId && run.head_repository?.id === repositoryId &&
      run.path === `.github/workflows/${name}.yml` && run.head_sha === source && run.head_branch === 'develop' &&
      run.event === 'push' && run.status === 'completed' && run.conclusion === 'success',
    `Latest ${name}.yml develop push run for source_sha must be successful.`);
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
  })));
}

export function approvedRequest(raw, sourceSha, policy, source = releaseSourceRef('develop')) {
  let approval;
  try { approval = JSON.parse(raw); } catch {
    throw new GateError('Set GIL_CANDIDATE_APPROVAL with the authorized base, work-key and public Artifact decision.');
  }
  const { baseSha256, workKey } = approval ?? {};
  const coversSource = approval?.sourceSha === undefined ? approval?.sourceRef === source.ref
    : approval.sourceSha === sourceSha && (approval.sourceRef === undefined || approval.sourceRef === source.ref);
  requireGate(coversSource && approval.baseProcessingApproved === true &&
    approval.publicArtifactApproved === true && /^[A-Za-z0-9._/-]{1,120}$/.test(approval.reference ?? '') &&
    digest.test(baseSha256) && workKey !== 'alpha-test' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(workKey ?? ''),
  'Approval must cover this source SHA, base SHA-256, processing, public distribution and the confirmed production work-key.');
  const configuration = { profile, nativePageLifecycle: true, releaseCandidate: source.kind !== 'develop', workKey, node: '24.18.0', python: '3.12.10' };
  const identity = { sourceSha, sourceRef: source.ref, baseSha256, toolCommit, encoderSha256, configuration, policy };
  return { ...identity, id: hash(JSON.stringify(identity)) };
}

export async function api(path, checkDownload = false) {
  const response = await fetch(`https://api.github.com/repos/${repository}/${path}`, {
    headers: { Authorization: `Bearer ${process.env.GH_TOKEN}`, Accept: 'application/vnd.github+json' },
    signal: AbortSignal.timeout(20000), redirect: checkDownload ? 'manual' : 'error',
  });
  if (checkDownload && [404, 410].includes(response.status)) return null;
  if (checkDownload) {
    const location = response.headers.get('location');
    requireGate(response.status === 302 && location, 'GitHub did not return a candidate download redirect.');
    return location;
  }
  requireGate(response.ok, path.startsWith('compare/') && response.status === 404
    ? 'source_sha is unknown in the main repository.' : `GitHub API verification failed (HTTP ${response.status}).`);
  return response.json();
}

export async function digestArtifactDownload(location) {
  requireGate(URL.canParse(location), 'Invalid GitHub Artifact download URL.');
  const url = new URL(location);
  requireGate(url.protocol === 'https:' && !url.username && !url.password, 'Invalid GitHub Artifact download URL.');
  try {
    // The second hop uses the signed URL. GitHub API credentials stay on api.github.com.
    const response = await fetch(url, { redirect: 'error', signal: AbortSignal.timeout(180000) });
    requireGate(response.ok && response.body, `GitHub Artifact download failed (HTTP ${response.status}).`);
    const sha256 = createHash('sha256');
    let bytes = 0;
    for await (const chunk of response.body) {
      sha256.update(chunk);
      bytes += chunk.length;
    }
    return { bytes, sha256: sha256.digest('hex') };
  } catch (error) {
    if (error instanceof GateError) throw error;
    throw new GateError('GitHub Artifact download did not finish.');
  }
}

export async function verifyUploadedArtifact({ id, runId, name, archiveDigest }, request, now = Date.now(), download = digestArtifactDownload) {
  requireGate(/^[1-9]\d*$/.test(id) && /^[1-9]\d*$/.test(runId) && digest.test(archiveDigest), 'Missing Artifact upload identity.');
  const path = `actions/artifacts/${id}`;
  const artifact = await request(path);
  requireGate(String(artifact.id) === id && String(artifact.workflow_run?.id) === runId && artifact.name === name &&
    artifact.expired === false && Date.parse(artifact.expires_at) > now && artifact.size_in_bytes > 0 &&
    artifact.digest === `sha256:${archiveDigest}`, 'Uploaded Artifact metadata or archive digest does not match.');
  const location = await request(`${path}/zip`, true);
  requireGate(location, 'Uploaded Artifact does not have an accessible download link.');
  const archive = await download(location);
  requireGate(archive.bytes === artifact.size_in_bytes && archive.sha256 === archiveDigest,
    'Downloaded Artifact size or archive SHA-256 does not match.');
  return `https://github.com/${repository}/actions/runs/${runId}/artifacts/${id}`;
}

async function verifyArtifact() {
  const { ARTIFACT_ID: id, GITHUB_RUN_ID: runId, ARTIFACT_NAME: name, ARTIFACT_DIGEST: archiveDigest } = process.env;
  const url = await verifyUploadedArtifact({ id, runId, name, archiveDigest }, api);
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, `\n[Download the verified GIL archive](${url})\n`);
}

async function preflight() {
  const event = process.env.GITHUB_EVENT_NAME;
  const source = releaseSourceRef(event === 'push' ? process.env.GITHUB_REF : (process.env.SOURCE_REF || 'develop'));
  const sourceSha = await resolveSource(source, event, process.env.GITHUB_SHA, api);
  const checks = source.kind === 'develop' ? await verifySource(sourceSha, api) : undefined;
  const policy = [import.meta.url, new URL('../.github/workflows/gil-candidate.yml', import.meta.url)].map(url => hash(readFileSync(new URL(url))));
  const request = approvedRequest(process.env.GIL_CANDIDATE_APPROVAL, sourceSha, policy, source);
  const ciSummary = checks ? Object.entries(checks).map(([name, id]) => `[${name}](https://github.com/${repository}/actions/runs/${id})`).join(' · ')
    : 'Release admission must be verified through the existing frozen Full and publication flow.';
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, `Source \`${source.ref}\` @ \`${sourceSha}\`. ${ciSummary}\n`);
  appendFileSync(process.env.GITHUB_OUTPUT, `source_sha=${sourceSha}\nsource_ref=${source.ref}\nexpected_version=${source.version ?? ''}\nrelease_candidate=${request.configuration.releaseCandidate}\nbase_sha256=${request.baseSha256}\nwork_key=${request.configuration.workKey}\ntool_commit=${toolCommit}\nrequest_id=${request.id}\nquality_run=${checks?.quality ?? ''}\nlicenses_run=${checks?.licenses ?? ''}\n`);
}

async function downloadBase() {
  requireGate(process.env.GIL_BASE_URL, 'Missing protected GIL_BASE_URL for the approved base GIL.');
  const partial = basePath() + '.part';
  try {
    const url = new URL(process.env.GIL_BASE_URL);
    requireGate(url.protocol === 'https:' && !url.username && !url.password, 'Base GIL URL must use HTTPS without userinfo.');
    const response = await fetch(url, { redirect: 'error', signal: AbortSignal.timeout(300000) });
    requireGate(response.ok && response.body, `Base GIL download failed (HTTP ${response.status}).`);
    await pipeline(response.body, createWriteStream(partial, { flags: 'wx' }));
    requireGate(hash(readFileSync(partial)) === process.env.BASE_SHA256, 'Base GIL SHA-256 differs from the approved SHA-256.');
    renameSync(partial, basePath());
  } finally {
    rmSync(partial, { force: true });
  }
}

function git(root, args, env = process.env) {
  return execFileSync('git', args, { cwd: root, env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}
function cleanHead(root, expected, label) {
  requireGate(sha.test(expected) && git(root, ['rev-parse', 'HEAD']) === expected &&
    !git(root, ['status', '--porcelain', '--untracked-files=all']), `${label} checkout is dirty or has the wrong commit.`);
}
function toolchain(root = 'miliastra-mcp') {
  requireGate(hash(readFileSync(join(root, 'src/scene-save.mjs'))) === encoderSha256, 'Pinned MCP encoder SHA-256 mismatch.');
  cleanHead(root, toolCommit, 'MCP');
}

async function assets() {
  const root = resolve('source');
  sourceVersion(root, process.env.EXPECTED_VERSION);
  const { lfsEnvironment, lfsArguments } = await moduleAt(root, 'scripts/ci-reviewed-lfs.mjs');
  const { mediaByPath, mediaPointer } = await moduleAt(root, 'scripts/ci-media-lfs.mjs');
  const { sourceInputs } = await moduleAt(root, 'scripts/build-native-candidate.mjs');
  const { nativeAudioBuildArgs } = await moduleAt(root, 'scripts/build-native-audio-game.mjs');
  git(root, ['lfs', 'install', '--local', '--skip-smudge']);
  cleanHead(root, process.env.SOURCE_SHA, 'Source');
  const { options } = nativeAudioBuildArgs([]);
  requireGate(options.officialAssets && options.refinedReleaseMonsterArt && options.nativePageLifecycle,
    'This source does not have the approved default production preset.');
  const files = sourceInputs(root, options).map(row => relative(root, resolve(root, row.path)).replaceAll('\\', '/'))
    .map(path => mediaByPath.get(path)).filter(Boolean);
  for (const row of files) {
    const file = join(root, row.path);
    const data = readFileSync(file);
    if (data.length === row.bytes && hash(data) === row.sha256) continue;
    requireGate(data.equals(mediaPointer(row)), 'Production LFS pointer differs from the reviewed manifest.');
    let bytes;
    try {
      bytes = execFileSync('git', [...lfsArguments.slice(0, -6), 'lfs', 'smudge', '--', row.path], {
        cwd: root, env: { ...lfsEnvironment(), GIT_LFS_SKIP_SMUDGE: '0' }, input: data,
        maxBuffer: row.bytes + 4096, timeout: 90000, stdio: ['pipe', 'pipe', 'pipe'],
      });
    } catch { throw new GateError('Could not download a reviewed production LFS object.'); }
    requireGate(bytes.length === row.bytes && hash(bytes) === row.sha256, 'Production LFS asset size or SHA-256 mismatch.');
    writeFileSync(file, bytes);
    // Refresh the sparse index through the clean filter. The following clean-head check rejects any staged delta.
    git(root, ['add', '--', row.path]);
  }
  cleanHead(root, process.env.SOURCE_SHA, 'Source');
  console.log(`Verified production LFS assets: ${files.length} files, ${files.reduce((sum, row) => sum + row.bytes, 0)} bytes.`);
}

function sourceVersion(root, expectedVersion) {
  const { version } = json(join(root, 'package.json'));
  requireGate(versionPattern.test(version) && (!expectedVersion || version === expectedVersion),
    'Source package version does not match the release ref.');
  return version;
}

export function verifyReceipts({ full, audio, fullReceipt, fullGil, finalGil, sourceSha, baseSha256, workKey, version, releaseCandidate = false }) {
  requireGate(uuid.test(full.buildId) && audio.buildId === full.buildId && digest.test(full.payloadDigest) &&
    audio.payloadDigest === full.payloadDigest && [full, audio].every(row => row.sourceCommit === sourceSha &&
      row.sourceDirty === false && row.liveWriteEnabled === false && row.release?.workKey === workKey &&
      (version === undefined || row.release?.version === `v${version}`) &&
      (releaseCandidate ? digest.test(row.release?.notesSha256) : !row.release?.notesSha256) &&
      row.release?.notesSha256 === full.release?.notesSha256 &&
      row.officialAssetsProfile === profile && row.uiProfile?.nativePageLifecycle === true &&
      row.nativeMonsterArt?.assetCount === 42 && row.nativeMonsterArt?.bindingCount === 42 &&
      row.toolchainIdentity?.sourceSha256 === encoderSha256), 'Candidate source, production preset or toolchain receipt mismatch.');
  requireGate(full.baseMap?.sha256 === baseSha256 && full.statuses?.staticCheck === 'pass' &&
    audio.sourceReceipt?.sha256 === hash(fullReceipt) && audio.sourceReceipt?.bytes === fullReceipt.length &&
    full.candidate?.sha256 === fullGil.sha256 && full.candidate?.bytes === fullGil.bytes &&
    audio.baseSha256 === fullGil.sha256 && audio.baseAfter === fullGil.sha256 &&
    finalGil.bytes > 0 && finalGil.sha256 !== fullGil.sha256 && audio.candidate?.bytes === finalGil.bytes &&
    audio.sha256 === finalGil.sha256 && audio.candidate?.sha256 === finalGil.sha256,
  'Base, intermediate or final audio GIL size or SHA-256 mismatch.');
  requireGate(audio.checked?.ok === true && audio.checked.errors === 0 && audio.compiled?.written?.length === 1 &&
    Number.isSafeInteger(audio.compiled.written[0].graphId) && audio.moduleDigests?.abyss_bgm &&
    JSON.stringify(audio.moduleDigests) === JSON.stringify(full.moduleDigests), 'Missing successful BGM assembly, static check or module readback.');
}

function diagnose() {
  const prefix = 'build/hosted-gil';
  const workspaces = existsSync(join(prefix, 'full')) ? readdirSync(join(prefix, 'full')).filter(id => uuid.test(id)) : [];
  const files = dir => existsSync(dir) ? readdirSync(dir) : [];
  const full = workspaces.length === 1 ? files(join(prefix, 'full', workspaces[0])) : [];
  const audio = files(join(prefix, 'audio'));
  const lastFull = full.map(name => /^(\d+)-(\w+)\.json$/.exec(name)).filter(Boolean).sort((a, b) => Number(b[1]) - Number(a[1]))[0];
  console.error(`Native build failed. Full receipt present: ${full.includes('candidate.json')}. Last full step: ${lastFull?.[2] ?? 'none'}. BGM graph write attempted: ${audio.includes('write_graphs-result.json')}.`);
}

async function deliver() {
  const { SOURCE_SHA: sourceSha, SOURCE_REF: sourceRef, BASE_SHA256: baseSha256, WORK_KEY: workKey, REQUEST_ID: requestId,
    EXPECTED_VERSION: expectedVersion, MILIASTRA_MCP_ROOT: toolRoot, GIL_BUILD_SECONDS, GIL_RECEIVED_BYTES,
    GITHUB_RUN_ID: runId, GITHUB_RUN_ATTEMPT: runAttempt, QUALITY_RUN: qualityRun, LICENSES_RUN: licensesRun } = process.env;
  const releaseCandidate = process.env.RELEASE_CANDIDATE === 'true';
  const version = sourceVersion('.', expectedVersion);
  cleanHead('.', sourceSha, 'Source');
  toolchain(toolRoot);
  requireGate(hash(readFileSync(basePath())) === baseSha256, 'Approved base GIL changed during the build.');
  const out = 'build/hosted-gil';
  const audio = json(join(out, 'audio/candidate.json'));
  requireGate(uuid.test(audio.buildId), 'Invalid audio build ID.');
  const fullRoot = join(out, 'full', audio.buildId);
  const fullReceipt = readFileSync(join(fullRoot, 'candidate.json'));
  const full = JSON.parse(fullReceipt);
  const { fileRecord } = await moduleAt('.', 'scripts/evidence-files.mjs');
  const mapPath = resolve(out, 'audio/candidate.gil');
  const finalGil = fileRecord(mapPath, out);
  const fullGil = fileRecord(join(fullRoot, basename(full.mapPath)), fullRoot);
  verifyReceipts({ full, audio, fullReceipt, fullGil, finalGil, sourceSha, baseSha256, workKey, version, releaseCandidate });
  const { inspectFile } = await moduleAt(toolRoot, 'src/adapter.mjs');
  const { nativeBgmSignals } = await moduleAt('.', 'scripts/native-bgm-graph.mjs');
  const inspection = inspectFile(mapPath);
  const graphId = audio.compiled.written[0].graphId;
  requireGate(inspection.sha256 === finalGil.sha256 && inspection.graphs.some(graph => graph.id === graphId &&
    graph.name === '_GSTS_ABYSS_BGM' && graph.nodeCount > 0) &&
    Object.values(nativeBgmSignals).every(signal => inspection.signals.some(ref => ref.name === signal)),
  'Final GIL readback has no compiled BGM graph with the expected cue signals.');
  const artifact = 'build/gil-artifact';
  mkdirSync(artifact);
  const stem = `slay-the-heavens-v${version}-${sourceSha.slice(0, 12)}`;
  const candidate = { path: `${stem}.gil`, bytes: finalGil.bytes, sha256: finalGil.sha256 };
  copyFileSync(mapPath, join(artifact, candidate.path));
  requireGate(fileRecord(join(artifact, candidate.path)).sha256 === candidate.sha256, 'Artifact copy hash mismatch.');
  const { helperPath, sourcePath, ...encoderIdentity } = full.toolchainIdentity;
  requireGate(encoderIdentity.payloadPathFormat === 'portable-v1', 'Hosted candidate requires portable encoder provenance.');
  const officialPortraits = { ...full.officialPortraits, inputs: full.officialPortraits.inputs.map(row => ({
    ...row, path: relative(process.cwd(), row.path).replaceAll('\\', '/'),
  })) };
  requireGate(officialPortraits.inputs.every(row => row.path.startsWith('art/') || row.path.startsWith('experiments/')),
    'Portable receipt contains an out-of-tree portrait input.');
  const receipt = { sourceCommit: sourceSha, sourceDirty: false, buildId: full.buildId, payloadDigest: full.payloadDigest,
    candidate, startedAt: full.startedAt, release: full.release, officialAssetsProfile: full.officialAssetsProfile,
    refinedReleaseMonsterArt: true, nativeMonsterArt: full.nativeMonsterArt, officialPortraits,
    artFeatures: full.artFeatures, uiProfile: full.uiProfile, toolchainIdentity: encoderIdentity,
    staticCheck: 'PASS', moduleReadback: 'PASS', bgmGraphReadback: { id: graphId, status: 'PASS' } };
  writeFileSync(join(artifact, 'candidate.json'), JSON.stringify(receipt, null, 2) + '\n');
  writeFileSync(join(artifact, 'manifest.json'), JSON.stringify({ schemaVersion: 1, ...receipt,
    engineeringVersion: version, platformVersion: null, platformMappingStatus: 'PENDING_PLATFORM_PUBLICATION',
    sourceRef, builtAt: new Date().toISOString(), requestId, baseSha256,
    github: { runId, runAttempt, runUrl: `https://github.com/${repository}/actions/runs/${runId}`,
      ...(qualityRun && licensesRun ? { qualityRun, licensesRun } : {}) },
    toolchain: { toolCommit, encoderSha256, node: process.version, python: '3.12.10', runner: 'windows-2025' },
    parameters: { workKey, profile, nativePageLifecycle: true, releaseCandidate, liveWrite: false },
    gates: { build: 'PASS', readback: 'PASS', officialImport: 'UNVERIFIED', officialCapacity: 'UNVERIFIED',
      releaseAdmission: 'UNVERIFIED', publishable: false },
    buildSeconds: Number(GIL_BUILD_SECONDS), runnerReceivedBytesBeforeUpload: Number(GIL_RECEIVED_BYTES) }, null, 2) + '\n');
  const files = [candidate.path, 'candidate.json', 'manifest.json'];
  writeFileSync(join(artifact, 'SHA256SUMS'), files.map(name => `${fileRecord(join(artifact, name)).sha256}  ${name}\n`).join(''));
  appendFileSync(process.env.GITHUB_OUTPUT, `artifact_name=${stem}-attempt-${runAttempt}\n`);
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, `\nGIL: \`${finalGil.sha256}\` · ${finalGil.bytes} file bytes · native build ${GIL_BUILD_SECONDS} s. Official import, capacity and release admission are pending.\n`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const phase = process.argv[2];
  try {
    await ({ preflight, base: downloadBase, toolchain, assets, diagnose, deliver, 'verify-upload': verifyArtifact })[phase]();
  } catch (error) {
    console.error(error instanceof GateError ? error.message : `GIL candidate ${phase} failed. Raw tool output may contain private input data.`);
    process.exitCode = 1;
  }
}
