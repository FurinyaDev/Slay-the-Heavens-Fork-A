import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {latestFullRun, formalPublishBranch, pages} from '../release-ci.mjs';
import {resolvePublishedBaseline} from './published-baseline.mjs';
import {productionWorkload, workloadIdentity} from './resource-receipt.mjs';
import {verifyResourceReport} from './verify-release-performance.mjs';
import {assertFullMatches, gilArtifactExpectation, loadArtifact, readRunArtifact, sha256} from './release-performance-artifacts.mjs';

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
} = {}) {
  const {repo, branch, head, runId:qualityRun, attempt:qualityAttempt, checkoutArtifactId} = fullProof;
  assert(repo === repository && formalPublishBranch(branch) && sha.test(head) &&
    [qualityRun, qualityAttempt, checkoutArtifactId].every(validId), 'Frozen release Full proof required');
  const {version, tree, workloadSha256} = readSource(head);
  assert(branch.endsWith('/v' + version) && sha.test(tree) && digest.test(workloadSha256), 'Frozen engineering source identity differs');
  const target = {head, branch, version};
  const checkRef = async () => {
    const ref = await request(prefix + '/git/ref/heads/' + branch);
    assert(ref?.ref === 'refs/heads/' + branch && ref.object?.type === 'commit' && ref.object.sha === head,
      'Release HEAD changed during evidence verification');
  };
  await checkRef();
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
  assert(evidence.schemaVersion === 1 && evidence.kind === 'release-performance' && evidence.runId === locator.runId &&
    evidence.attempt === locator.attempt && evidence.workloadSha256 === workloadSha256 &&
    evidence.reportSha256 === sha256(files['report.json']), 'Sealed formal evidence and downloaded report differ');
  assert.deepEqual(evidence.source, {...target, tree}, 'Formal evidence and frozen source differ');
  const published = await readBaseline(version, request);
  assert.deepEqual(evidence.published, published, 'Formal evidence and published baseline differ');
  const signals = verifyResourceReport(JSON.parse(files['report.json']), head, tree, published, evidence, workloadSha256);
  assert.deepEqual(signals, {}, 'Formal performance regression signals require resolution');

  const gil = evidence.gil;
  const expectedGil = gilArtifactExpectation(target);
  const original = await readRunArtifact(request, gil?.id, expectedGil);
  for (const [key, value] of Object.entries(original)) {
    assert.equal(gil[key], value, 'Audited GIL archive changed: ' + key);
  }
  assertFullMatches(gil, fullProof);
  assert(/^[a-f0-9-]{36}$/.test(gil.buildId) &&
    [gil.gilSha256, gil.payloadDigest, gil.receiptSha256, gil.manifestSha256].every(value => digest.test(value)),
    'Formal evidence is missing the audited GIL identity');
  assert.deepEqual(await readRunArtifact(request, locator.id, formal), locator, 'Formal artifact changed during verification');
  const current = await latest();
  assert(current?.id === run.id && current.run_attempt === run.run_attempt && current.status === 'completed' &&
    current.conclusion === 'success', 'Formal workflow run or attempt changed during verification');
  const currentFull = await latestFullRun(repo, branch, request);
  assert(currentFull?.id === qualityRun && currentFull.run_attempt === qualityAttempt && currentFull.head_sha === head &&
    currentFull.status === 'completed' && currentFull.conclusion === 'success', 'Frozen Full changed during performance verification');
  await checkRef();
  return {schemaVersion:1, kind:'release-performance', branch, head, tree, runId:locator.runId, attempt:locator.attempt,
    artifactId:locator.id, artifactDigest:locator.digest, reportSha256:evidence.reportSha256, gil, published};
}
