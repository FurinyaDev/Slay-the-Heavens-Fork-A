import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { auditBackflow, selectBackflowRefs } from '../scripts/check-release-backflow.mjs';
import { verifyBackflowPush } from '../scripts/verify-release-backflow-closeout.mjs';
import { projectRepositoryId } from '../scripts/repository-identity.mjs';

const masterRef = 'refs/heads/master';
const developRef = 'refs/heads/develop';

function divergedRepository(t) {
  const repo = mkdtempSync(join(tmpdir(), 'release-backflow-test-'));
  t.after(() => rmSync(repo, { recursive: true, force: true }));
  const git = (...args) => execFileSync('git', ['-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.test',
    '-c', 'commit.gpgsign=false', ...args], { cwd: repo, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  const commit = name => {
    writeFileSync(join(repo, `${name}.txt`), `${name}\n`);
    git('add', '--all');
    git('commit', '-m', name);
    return git('rev-parse', 'HEAD');
  };
  git('init', '-b', 'develop');
  const common = commit('common');
  git('branch', 'master');
  const develop = commit('development');
  git('switch', 'master');
  const master = commit('production');
  git('switch', 'develop');
  return { common, develop, master, repo, git, commit };
}

test('release closeout requires production ancestry even when trees match', t => {
  const { repo, git, develop, master } = divergedRepository(t);
  assert.throws(() => auditBackflow(repo, { expectedMaster: master }), /Release backflow pending/);

  git('merge', '--squash', 'master');
  git('commit', '-m', 'squash production');
  const squashTree = git('rev-parse', 'HEAD^{tree}');
  assert.throws(() => auditBackflow(repo, { expectedMaster: master }), /Release backflow pending/);

  git('reset', '--hard', develop);
  git('merge', '--no-ff', '--no-edit', 'master');
  const merged = git('rev-parse', 'HEAD');
  assert.equal(git('rev-parse', 'HEAD^{tree}'), squashTree);
  assert.equal(git('rev-list', '--parents', '-1', 'HEAD'), `${merged} ${develop} ${master}`);
  assert.deepEqual(auditBackflow(repo, { expectedMaster: master, expectedDevelop: merged }), {
    master, develop: merged, checkedCommit: merged,
  });
  assert.throws(() => auditBackflow(repo, { expectedMaster: master, expectedDevelop: develop }), /Protected branch moved/);
});

test('an unmerged develop candidate must include both protected tips', t => {
  const { repo, git, develop, master, commit } = divergedRepository(t);
  git('switch', '-c', 'candidate');
  git('merge', '--no-ff', '--no-edit', 'master');
  const candidate = git('rev-parse', 'HEAD');
  assert.deepEqual(auditBackflow(repo, { expectedDevelop: develop, candidate }), {
    master, develop, checkedCommit: candidate,
  });
  assert.throws(() => auditBackflow(repo), /Release backflow pending/);
  assert.throws(() => auditBackflow(repo, { candidate: master }), /does not include live develop/);
  assert.throws(() => auditBackflow(repo, { candidate: develop }), /Release backflow pending/);

  git('switch', 'master');
  const hotfix = commit('new-hotfix');
  assert.throws(() => auditBackflow(repo, { candidate, expectedMaster: master }), /Protected branch moved/);
  assert.throws(() => auditBackflow(repo, { candidate, candidateBase: hotfix }), /does not include its recorded base/);
  assert.throws(() => auditBackflow(repo, { candidate }), /Release backflow pending/);
});

test('workflow release and candidate events use their exact commit identities', () => {
  const master = 'a'.repeat(40), develop = 'b'.repeat(40), candidate = 'c'.repeat(40);
  assert.deepEqual(selectBackflowRefs('push', masterRef, master, {}), { expectedMaster: master });
  assert.deepEqual(selectBackflowRefs('push', developRef, develop, {}), { expectedDevelop: develop });
  assert.deepEqual(selectBackflowRefs('schedule', developRef, develop, {}), { expectedDevelop: develop });
  assert.deepEqual(selectBackflowRefs('workflow_dispatch', developRef, develop, { inputs: { master_sha: master } }), {
    expectedMaster: master, expectedDevelop: develop,
  });
  assert.deepEqual(selectBackflowRefs('pull_request', 'refs/pull/1/merge', candidate, {
    pull_request: { base: { ref: 'master', sha: master } },
  }), { expectedMaster: master });
  assert.deepEqual(selectBackflowRefs('pull_request', 'refs/pull/1/merge', candidate, {
    pull_request: { base: { ref: 'develop', sha: develop } },
  }), { expectedDevelop: develop, candidate });
  assert.deepEqual(selectBackflowRefs('merge_group', 'refs/heads/gh-readonly-queue/develop/candidate', candidate, {
    merge_group: { base_ref: developRef, head_sha: candidate, base_sha: develop },
  }), { candidate, candidateBase: develop });
  assert.throws(() => selectBackflowRefs('workflow_dispatch', developRef, develop, { inputs: { master_sha: 'master' } }), /full Git commit SHA/);
  assert.throws(() => selectBackflowRefs('push', developRef, '0'.repeat(40), {}), /full Git commit SHA/);
  assert.throws(() => selectBackflowRefs('workflow_dispatch', masterRef, master, { inputs: { master_sha: master } }), /protected branch/);
  assert.throws(() => selectBackflowRefs('merge_group', '', candidate, {
    merge_group: { base_ref: developRef, head_sha: develop },
  }), /protected branch/);
});

test('manual closeout consumes exact push receipts and rejects stale or failed CI', async () => {
  const repo = 'FurinyaWorks/Slay-the-Heavens';
  const repository = { id: projectRepositoryId, full_name: repo };
  const head = 'a'.repeat(40), master = 'b'.repeat(40), base = 'c'.repeat(40);
  const run = { repository, head_repository: repository, event: 'push', status: 'completed', conclusion: 'success',
    head_branch: 'develop', head_sha: head, run_attempt: 1 };
  const quality = { ...run, id: 42, path: '.github/workflows/quality.yml' };
  const licenses = { ...run, id: 51, path: '.github/workflows/licenses.yml' };
  let qualityRuns = [quality];
  let qualityReadback = qualityRuns;
  let qualityRequests = 0;
  const inventory = { name: 'inventory', id: 11, run_id: 51, run_attempt: 1, head_sha: head,
    status: 'completed', conclusion: 'success' };
  const checkout = { schemaVersion: 1, event: 'push', runId: 42, attempt: 1, tested: head,
    head, base, parents: [base, master] };
  const artifact = { id: 12, name: 'quality-42-1-check', expired: false, workflow_run: { id: 42, head_sha: head } };
  const request = async path => {
    if (path.includes('workflows/quality.yml/')) {
      assert.match(path, new RegExp(`event=push&branch=develop&head_sha=${head}`));
      return { workflow_runs: qualityRequests++ === 0 ? qualityRuns : qualityReadback };
    }
    if (path.includes('workflows/licenses.yml/')) return { workflow_runs: [licenses] };
    if (path.endsWith(`/git/commits/${head}`)) return { sha: head, parents: [{ sha: base }, { sha: master }] };
    if (path.includes('/runs/42/jobs?')) return { jobs: [{ name: 'rules (1/18)', run_attempt: 1 }] };
    if (path.includes('/runs/51/jobs?')) return { jobs: [inventory] };
    assert.fail(`unexpected endpoint ${path}`);
  };
  const receipt = async () => ({ checkout, checkoutArtifact: artifact });
  const verify = () => {
    qualityRequests = 0;
    return verifyBackflowPush(repo, head, request, receipt);
  };
  assert.deepEqual(await verify(), { qualityRunId: 42, qualityAttempt: 1, checkoutArtifactId: 12,
    licensesRunId: 51, licensesAttempt: 1, inventoryJobId: 11 });
  inventory.conclusion = 'failure';
  await assert.rejects(verify, /Licenses inventory is missing, stale or unsuccessful/);
  inventory.conclusion = 'success';
  checkout.parents = [base];
  await assert.rejects(verify, /receipt differs from the exact commit or attempt/);
  checkout.parents = [base, master];
  qualityReadback = [{ ...quality, run_attempt: 2 }];
  await assert.rejects(verify, /CI run\/attempt changed/);
  qualityRuns = [quality, { ...quality, id: 43, conclusion: 'failure' }];
  await assert.rejects(verify, /requires its latest successful push run/);
});
