import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {assertReleaseHead, latestFullRun, formalPublishBranch, pages} from '../release-ci.mjs';
import {resolvePublishedBaseline} from './published-baseline.mjs';
import {productionWorkload, workloadIdentity} from './resource-receipt.mjs';
import {gilModuleInventoryHash} from './gil-inputs.mjs';
import {verifyResourceReport} from './verify-release-performance.mjs';
import {assertFullMatches, gilArtifactExpectation, loadArtifact, readRunArtifact, sha256, verifyGilArtifact} from './release-performance-artifacts.mjs';

const repository = 'FurinyaWorks/Slay-the-Heavens';
const prefix = '/repos/' + repository;
const sha = /^[a-f0-9]{40}$/;
const digest = /^[a-f0-9]{64}$/;
const validId = value => Number.isSafeInteger(value) && value > 0;

function frozenSource(head) {
  const git = (...args) => execFileSync('git', args, {maxBuffer:4 * 1024 * 1024});
  const read = path => git('show', head + ':' + path);
  return {
    tree:git('rev-parse', head + '^{tree}').toString().trim(),
    version:JSON.parse(read('package.json')).version,
    workloadSha256:workloadIdentity(productionWorkload, read),
  };
}

export async function requireReleasePerformance(fullProof, request, {
  readSource = frozenSource, readArtifact = loadArtifact, readBaseline = resolvePublishedBaseline,
  readGil = verifyGilArtifact,
} = {}) {
  const {repo, branch, head, runId:qualityRun, attempt:qualityAttempt, checkoutArtifactId} = fullProof;
  assert(repo === repository && formalPublishBranch(branch) && sha.test(head), 'Frozen release source proof required');
  const {version, tree, workloadSha256} = readSource(head);
  assert(branch.endsWith('/v' + version) && sha.test(tree) && digest.test(workloadSha256), 'Frozen engineering source identity differs');
  const target = {head, branch, version};
  await assertReleaseHead(repo, branch, head, request);
  const title = 'Formal resource release / ' + branch + ' / ' + head;
  const runsPath = prefix + '/actions/workflows/performance-regression.yml/runs?event=workflow_dispatch&branch=' +
    encodeURIComponent(branch) + '&head_sha=' + head;
  const latest = async () => {
    const runs = await pages(request, runsPath, 'workflow_runs');
    return runs.filter(run => run.display_title === title).sort((a, b) => b.id - a.id)[0];
  };
  const run = await latest();
  assert(run?.head_sha === head && run.head_branch === branch && validId(run.id) && validId(run.run_attempt) &&
    run.status === 'completed' && run.conclusion === 'success', 'Latest formal release performance run must pass on the frozen HEAD');
  const name = `release-performance-${run.id}-${run.run_attempt}`;
  const rows = await pages(request, prefix + '/actions/runs/' + run.id + '/artifacts', 'artifacts');
  const matching = rows.filter(row => row.name === name);
  assert(matching.length === 1, 'Current successful formal attempt must have one sealed artifact');
  const formal = {name:new RegExp('^' + name + '$'), path:'.github/workflows/performance-regression.yml',
    branch, head, title, step:'Bind formal resource report to audited GIL'};
  const locator = await readRunArtifact(request, matching[0].id, formal);
  assert(locator.runId === run.id && locator.attempt === run.run_attempt, 'Formal artifact belongs to another attempt');
  const files = await readArtifact(locator, ['report.json', 'evidence.json']);
  const evidence = JSON.parse(files['evidence.json']);
  assert([1, 2].includes(evidence.schemaVersion) && evidence.kind === 'release-performance' && evidence.runId === locator.runId &&
    evidence.attempt === locator.attempt && evidence.workloadSha256 === workloadSha256 &&
    evidence.reportSha256 === sha256(files['report.json']), 'Sealed formal evidence and downloaded report differ');
  assert.deepEqual(evidence.source, {...target, tree}, 'Formal evidence and frozen source differ');
  const published = await readBaseline(version, request);
  assert.deepEqual(evidence.published, published, 'Formal evidence and published baseline differ');
  const gil = evidence.gil;
  assert(validId(gil?.id), 'Formal evidence is missing the audited GIL identity');
  let measured = evidence;
  if (evidence.schemaVersion === 2) {
    const {binding, receipt} = await readGil(request, gil.id, target);
    assert(binding.schemaVersion === 2 && binding.custody === 'gil-build-v2', 'Formal evidence requires a v2 audited GIL');
    assert.deepEqual(gil, binding, 'Audited GIL archive changed');
    assert.deepEqual(evidence.artFeatures, receipt.artFeatures, 'Sealed GIL art configuration differs');
    assert.equal(evidence.moduleDigestsSha256, gilModuleInventoryHash(receipt.moduleDigests),
      'Sealed GIL module inventory differs');
    measured = receipt;
  } else {
    assert([qualityRun, qualityAttempt, checkoutArtifactId].every(validId), 'Frozen release Full proof required');
    const original = await readRunArtifact(request, gil.id, gilArtifactExpectation(target));
    assert(gil.schemaVersion === undefined && original.custody !== 'gil-build-v2',
      'Legacy formal evidence requires its original GIL proof format');
    for (const [key, value] of Object.entries(original)) {
      assert.equal(gil[key], value, 'Audited GIL archive changed: ' + key);
    }
    assertFullMatches(gil, fullProof);
  }
  assert(/^[a-f0-9-]{36}$/.test(gil.buildId) &&
    [gil.gilSha256, gil.payloadDigest, gil.receiptSha256, gil.manifestSha256].every(value => digest.test(value)),
    'Formal evidence is missing the audited GIL identity');
  const signals = verifyResourceReport(JSON.parse(files['report.json']), head, tree, published, measured, workloadSha256);
  assert.deepEqual(signals, {}, 'Formal performance regression signals require resolution');

  assert.deepEqual(await readRunArtifact(request, locator.id, formal), locator, 'Formal artifact changed during verification');
  const current = await latest();
  assert(current?.id === run.id && current.run_attempt === run.run_attempt && current.status === 'completed' &&
    current.conclusion === 'success', 'Formal workflow run or attempt changed during verification');
  if (evidence.schemaVersion === 1) {
    const currentFull = await latestFullRun(repo, branch, request);
    assert(currentFull?.id === qualityRun && currentFull.run_attempt === qualityAttempt && currentFull.head_sha === head &&
      currentFull.status === 'completed' && currentFull.conclusion === 'success', 'Frozen Full changed during performance verification');
  }
  await assertReleaseHead(repo, branch, head, request);
  return {schemaVersion:evidence.schemaVersion, kind:'release-performance', branch, head, tree, runId:locator.runId, attempt:locator.attempt,
    artifactId:locator.id, artifactDigest:locator.digest, reportSha256:evidence.reportSha256, gil, published};
}
