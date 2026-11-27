import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {join, resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {assertReleaseHead, formalPublishBranch, githubRequest, verifyReleaseFull} from '../release-ci.mjs';
import {resolvePublishedBaseline, downloadPublishedBaselineGil} from './published-baseline.mjs';
import {assertFullMatches, verifyGilArtifact} from './release-performance-artifacts.mjs';
import {frozenReleaseVersion} from './verify-release-performance.mjs';

export async function frozenPerformanceInputs(env = process.env, {
  request = githubRequest, readGil = verifyGilArtifact, readFull = verifyReleaseFull,
  readBaseline = resolvePublishedBaseline,
} = {}) {
  const branch = env.GITHUB_REF_NAME;
  const head = env.GITHUB_SHA;
  const runId = Number(env.GITHUB_RUN_ID);
  const attempt = Number(env.GITHUB_RUN_ATTEMPT);
  assert(env.GITHUB_ACTIONS === 'true' && env.GITHUB_EVENT_NAME === 'workflow_dispatch' &&
    env.GITHUB_REPOSITORY === 'FurinyaWorks/Slay-the-Heavens' && env.GITHUB_REPOSITORY_ID === '1429751262' &&
    formalPublishBranch(branch) && /^[a-f0-9]{40}$/.test(head) &&
    [runId, attempt].every(id => Number.isSafeInteger(id) && id > 0),
    'This evidence requires a trusted hosted formal release dispatch');
  const git = (...args) => execFileSync('git', args, {maxBuffer:4 * 1024 * 1024});
  assert.equal(git('rev-parse', 'HEAD').toString().trim(), head, 'Formal resource action checkout changed');
  const tree = git('rev-parse', 'HEAD^{tree}').toString().trim();
  const fromHead = path => git('show', head + ':' + path);
  const checkoutPackage = fromHead('package.json');
  const version = JSON.parse(checkoutPackage).version;
  const target = {head, branch, version};
  await assertReleaseHead(env.GITHUB_REPOSITORY, branch, head, request);
  const {receipt, binding:gil, gilBytes} = await readGil(request, Number(env.GIL_ARTIFACT_ID), target);
  if (gil.schemaVersion !== 2) assertFullMatches(gil, await readFull(env.GITHUB_REPOSITORY, branch, head, request));
  frozenReleaseVersion(receipt, checkoutPackage, readFileSync('package.json'));
  const published = await readBaseline(version, request);
  await assertReleaseHead(env.GITHUB_REPOSITORY, branch, head, request);
  return {target, tree, runId, attempt, fromHead, receipt, gil, gilBytes, published};
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  assert.equal(process.argv.length, 3, 'Provide a new directory for the two verified release GILs');
  const output = resolve(process.argv[2]);
  const {gilBytes, published} = await frozenPerformanceInputs();
  mkdirSync(output);
  writeFileSync(join(output, 'candidate.gil'), gilBytes, {flag:'wx'});
  await downloadPublishedBaselineGil(published, join(output, 'baseline.gil'));
  console.log(JSON.stringify(published));
}
