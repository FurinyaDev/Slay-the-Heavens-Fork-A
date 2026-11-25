import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {formalPublishBranch, githubRequest, verifyReleaseFull} from '../release-ci.mjs';
import {productionWorkload, workloadIdentity} from './resource-receipt.mjs';
import {frozenReleaseVersion, verifyResourceReport} from './verify-release-performance.mjs';
import {resolvePublishedBaseline} from './published-baseline.mjs';
import {assertFullMatches, sha256, verifyGilArtifact} from './release-performance-artifacts.mjs';

try {
  const env = process.env;
  const branch = env.GITHUB_REF_NAME;
  const head = env.GITHUB_SHA;
  const runId = Number(env.GITHUB_RUN_ID);
  const attempt = Number(env.GITHUB_RUN_ATTEMPT);
  assert(env.GITHUB_ACTIONS === 'true' && env.GITHUB_EVENT_NAME === 'workflow_dispatch' &&
    env.GITHUB_REPOSITORY === 'FurinyaWorks/Slay-the-Heavens' && env.GITHUB_REPOSITORY_ID === '1429751262' &&
    formalPublishBranch(branch) && /^[a-f0-9]{40}$/.test(head) && runId > 0 && attempt > 0,
    'This evidence requires a trusted hosted formal release dispatch');
  const git = (...args) => execFileSync('git', args, {maxBuffer:4 * 1024 * 1024});
  assert.equal(git('rev-parse', 'HEAD').toString().trim(), head, 'Formal resource action checkout changed');
  const tree = git('rev-parse', 'HEAD^{tree}').toString().trim();
  const fromHead = path => git('show', head + ':' + path);
  const checkoutPackage = fromHead('package.json');
  const version = JSON.parse(checkoutPackage).version;
  const target = {head, branch, version};
  const {receipt, binding:gil} = await verifyGilArtifact(githubRequest, Number(env.GIL_ARTIFACT_ID), target);
  assertFullMatches(gil, await verifyReleaseFull(env.GITHUB_REPOSITORY, branch, head, githubRequest));
  frozenReleaseVersion(receipt, checkoutPackage, readFileSync('package.json'));
  const published = await resolvePublishedBaseline(version);
  const raw = readFileSync('build/performance-regression/report.json');
  const report = JSON.parse(raw);
  const workloadSha256 = workloadIdentity(productionWorkload, fromHead);
  const signals = verifyResourceReport(report, head, tree, published, receipt, workloadSha256);
  assert.deepEqual(signals, {}, 'Formal performance regression signals require resolution');
  const output = 'build/release-performance';
  mkdirSync(output, {recursive:true});
  writeFileSync(output + '/report.json', raw, {flag:'wx'});
  writeFileSync(output + '/evidence.json', JSON.stringify({
    schemaVersion:1, kind:'release-performance', source:{...target, tree}, runId, attempt, gil, published,
    workloadSha256, reportSha256:sha256(raw), artFeatures:receipt.artFeatures,
  }, null, 2) + '\n', {flag:'wx'});
  console.log('Release performance evidence sealed for ' + head + ' / ' + gil.gilSha256);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
