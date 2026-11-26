import { spawnSync } from 'node:child_process';
import { appendFileSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { projectRepositoryId, projectRepositoryMatches } from './repository-identity.mjs';

const master = 'refs/heads/master';
const develop = 'refs/heads/develop';

function requireSha(value) {
  if (typeof value !== 'string' || !/^[a-f0-9]{40}$/.test(value) || /^0+$/.test(value)) {
    throw new Error('Expected a full Git commit SHA.');
  }
  return value;
}

export function selectBackflowRefs(event, ref, sha, payload) {
  if (event === 'push' && ref === master) return { expectedMaster: requireSha(sha) };
  if (event === 'push' && ref === develop) return { expectedDevelop: requireSha(sha) };
  if (event === 'schedule' && ref === develop) return { expectedDevelop: requireSha(sha) };
  if (event === 'workflow_dispatch' && ref === develop) {
    return { expectedMaster: requireSha(payload.inputs?.master_sha), expectedDevelop: requireSha(sha) };
  }
  if (event === 'pull_request') {
    const base = payload.pull_request?.base;
    if (base?.ref === 'master') return { expectedMaster: requireSha(base.sha) };
    if (base?.ref === 'develop') return { expectedDevelop: requireSha(base.sha), candidate: requireSha(sha) };
  }
  if (event === 'merge_group' && payload.merge_group?.base_ref === develop && payload.merge_group.head_sha === sha) {
    return { candidate: requireSha(sha), candidateBase: requireSha(payload.merge_group.base_sha) };
  }
  throw new Error('The release backflow check requires a protected branch or its merge candidate.');
}

function git(cwd, args, { allowNotAncestor = false } = {}) {
  const result = spawnSync('git', [
    '--no-replace-objects', '-c', 'http.lowSpeedLimit=1024', '-c', 'http.lowSpeedTime=30', ...args,
  ], { cwd, encoding: 'utf8', timeout: 60000 });
  if (result.error) throw result.error;
  if (allowNotAncestor && result.status === 1) return false;
  if (result.status !== 0) throw new Error(`Git ${args[0]} failed with exit ${result.status}.`);
  return allowNotAncestor ? true : result.stdout.trim();
}

function readRemoteRefs(cwd) {
  const lines = git(cwd, ['ls-remote', '--refs', '--exit-code', 'origin', master, develop]).split('\n');
  const refs = new Map(lines.map(line => line.trim().split('\t').reverse()));
  if (lines.length !== 2 || refs.size !== 2) throw new Error('Could not read both protected branch refs.');
  return { master: requireSha(refs.get(master)), develop: requireSha(refs.get(develop)) };
}

export function auditBackflow(remote, { expectedMaster, expectedDevelop, candidate, candidateBase } = {}) {
  const cwd = mkdtempSync(join(tmpdir(), 'release-backflow-'));
  try {
    git(cwd, ['init', '--bare']);
    git(cwd, ['remote', 'add', 'origin', remote]);
    git(cwd, ['fetch', '--no-tags', '--filter=tree:0', 'origin', `+${master}:${master}`, `+${develop}:${develop}`]);
    if (git(cwd, ['rev-parse', '--is-shallow-repository']) !== 'false') throw new Error('Incomplete Git history.');
    const masterSha = requireSha(git(cwd, ['rev-parse', master]));
    const developSha = requireSha(git(cwd, ['rev-parse', develop]));
    if ((expectedMaster && requireSha(expectedMaster) !== masterSha) ||
        (expectedDevelop && requireSha(expectedDevelop) !== developSha)) {
      throw new Error(`Protected branch moved. Live master ${masterSha}, develop ${developSha}.`);
    }

    const target = candidate ? requireSha(candidate) : developSha;
    const isAncestor = (ancestor, descendant) => git(cwd, ['merge-base', '--is-ancestor', ancestor, descendant], { allowNotAncestor: true });
    if (candidate) {
      git(cwd, ['fetch', '--no-tags', '--filter=tree:0', 'origin', target]);
      if (git(cwd, ['rev-parse', 'FETCH_HEAD^{commit}']) !== target || !isAncestor(developSha, target)) {
        throw new Error(`Merge candidate ${target} does not include live develop ${developSha}.`);
      }
      if (candidateBase && !isAncestor(requireSha(candidateBase), target)) {
        throw new Error(`Merge candidate ${target} does not include its recorded base ${candidateBase}.`);
      }
    }
    const passed = isAncestor(masterSha, target);
    const current = readRemoteRefs(cwd);
    if (current.master !== masterSha || current.develop !== developSha) {
      throw new Error('Protected branch moved while checking ancestry. Re-run on the current refs.');
    }
    if (!passed) throw new Error(`Release backflow pending. Master ${masterSha} is missing from ${target} ancestry.`);
    return { master: masterSha, develop: developSha, checkedCommit: target };
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const env = process.env;
    const payload = JSON.parse(readFileSync(env.GITHUB_EVENT_PATH, 'utf8'));
    const contextRepository = { id: Number(env.GITHUB_REPOSITORY_ID), full_name: env.GITHUB_REPOSITORY };
    if (env.GITHUB_SERVER_URL !== 'https://github.com' || env.GITHUB_REPOSITORY_ID !== String(projectRepositoryId) ||
        !projectRepositoryMatches(contextRepository, env.GITHUB_REPOSITORY) ||
        (payload.repository && !projectRepositoryMatches(payload.repository, env.GITHUB_REPOSITORY))) {
      throw new Error('Repository identity does not match the protected release repository.');
    }
    const selection = selectBackflowRefs(env.GITHUB_EVENT_NAME, env.GITHUB_REF, env.GITHUB_SHA, payload);
    if (git(process.cwd(), ['rev-parse', 'HEAD']) !== requireSha(env.GITHUB_SHA)) {
      throw new Error('Actions checkout does not match the event SHA.');
    }
    const result = auditBackflow(`${env.GITHUB_SERVER_URL}/${env.GITHUB_REPOSITORY}.git`, selection);
    const summary = `Verified master \`${result.master}\` is an ancestor of \`${result.checkedCommit}\` (live develop \`${result.develop}\`).\n`;
    console.log(summary);
    appendFileSync(env.GITHUB_STEP_SUMMARY, summary);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
