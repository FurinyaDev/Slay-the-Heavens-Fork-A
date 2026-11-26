import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { isDeepStrictEqual } from 'node:util';
import { normalizeTaskId } from './task-dependencies.mjs';
import { managedVersion, planPath, readVersionPlan } from './version-governance.mjs';
import { projectRepositoryMatches } from './repository-identity.mjs';
import { readBacklogRecords } from './backlog-closeout.mjs';
import { readTaskHeader } from './backlog-metadata.mjs';
import { requireReleaseCoordinator } from './verify-release-acceptance.mjs';
import { requiresProductScope } from './verify-release-product-scope.mjs';

const sha = /^[a-f0-9]{40}$/;
const git = (...args) => execFileSync('git', ['--no-replace-objects', ...args], { encoding: 'utf8' });
const scope = plan => plan.scope.map(row => row.slice(0, 3));
const evidencePath = path => /^docs\/(?:evidence|reviews)\//.test(path);
const backlogPath = /^backlog\/(?:tasks|completed)\/task-[\d.]+ - .+\.md$/;
const readIfPresent = (ref, path) => git('ls-tree', '-z', ref, '--', path) ? git('show', `${ref}:${path}`) : '';

function assignments(paths, ref, version, readTask) {
  const records = new Map();
  for (const path of paths.filter(file => backlogPath.test(file))) {
    const task = readTaskHeader(readTask(ref, path));
    if (task.labels.includes(version)) records.set(normalizeTaskId(task.id), {
      parent: normalizeTaskId(task.parentTaskId), dependencies: (task.dependencies ?? []).map(normalizeTaskId).sort(),
      roles: task.labels.filter(label => ['release-scope', 'release-gate', 'version-main'].includes(label)).sort(),
    });
  }
  return records;
}

function declaration(body, key, expression) {
  const lines = body.replace(/<!--[\s\S]*?(?:-->|$)/g, '').split(/\r?\n/).filter(line => line.startsWith(`${key}:`));
  return lines.length === 1 ? lines[0].match(expression) : null;
}

export async function auditFrozenProductReview(pr, tree, version, request, repository, fixTask) {
  const scope = declaration(pr.body ?? '', 'Product-Scope',
    /^Product-Scope: (v[\d.]+) \| (TASK-\d+(?:\.\d+)*) \| ([^|\r\n]+) \| (https:\/\/github\.com\/[^|\s]+)$/);
  const signed = declaration(pr.body ?? '', 'Product-Review', /^Product-Review: ([1-9]\d*)$/);
  const id = Number(signed?.[1]);
  const evidence = scope?.[4].slice(`https://github.com/${repository}/`.length);
  const pinned = /^blob\/([a-f0-9]{40})\/((?:backlog\/(?:tasks|completed)\/task-|docs\/(?:versions\/|design\/))[^#?]+)$/.exec(evidence);
  const native = /^pull\/([1-9]\d*)#pullrequestreview-([1-9]\d*)$/.exec(evidence);
  if (scope?.[1] !== version || !scope[4].startsWith(`https://github.com/${repository}/`) ||
      (!pinned && !native) || (fixTask && scope[2] !== fixTask) ||
      !Number.isSafeInteger(id) || !sha.test(tree ?? '')) {
    throw new Error('Frozen product changes require a version, task, actual behavior, fixed approval source and native review');
  }
  const api = `/repos/${repository}`;
  const proof = createHash('sha256').update(scope[0]).digest('hex');
  const review = await request(`${api}/pulls/${pr.number}/reviews/${id}`);
  if (review?.id !== id || review.commit_id !== pr.head.sha || !['APPROVED', 'COMMENTED'].includes(review.state) ||
      !review.body?.split(/\r?\n/).includes(`Release product scope verified: ${version} ${pr.base.sha} ${tree} ${proof}`)) {
    throw new Error('Frozen product changes lack independent native review of their exact behavior, HEAD, BASE and tree');
  }
  await requireReleaseCoordinator(repository, review.user, request);
  if (pinned) {
    const [, ref, source] = pinned;
    const [ancestry, document] = await Promise.all([
      request(`${api}/compare/${ref}...${pr.base.sha}?per_page=1`),
      request(`${api}/contents/${source}?ref=${ref}`),
    ]);
    if (ancestry?.merge_base_commit?.sha !== ref || !['ahead', 'identical'].includes(ancestry.status) ||
        document?.type !== 'file' || document.path !== decodeURIComponent(source)) {
      throw new Error('Product approval source must already exist in protected release history');
    }
  } else {
    const [, pull, approvalId] = native;
    const approval = await request(`${api}/pulls/${pull}/reviews/${approvalId}`);
    if (Number(approvalId) === id || approval?.id !== Number(approvalId) ||
        !['COMMENTED', 'APPROVED'].includes(approval.state) ||
        !approval.body?.split(/\r?\n/).includes(`Product change approved: ${version} ${scope[2]} ${scope[3]}`)) {
      throw new Error('Product scope must have its own approved decision for this version and behavior');
    }
    await requireReleaseCoordinator(repository, approval.user, request);
  }
  return { productReviewId: id };
}

export async function auditReleaseFreeze(pr, repository, request, {
  checkout = () => git('rev-parse', 'HEAD', 'HEAD^1', 'HEAD^2', 'HEAD^{tree}').trimEnd().split('\n'),
  read = (ref, path) => git('show', `${ref}:${path}`),
  readTask = readIfPresent,
  files = (base, target) => git('diff', '--name-only', '--no-renames', '-z', base, target, '--').split('\0').filter(Boolean),
  tasks = () => readBacklogRecords('.').filter(task => task.location !== 'archive'),
  refresh = pull => request(`/repos/${repository}/pulls/${pull.number}`),
} = {}) {
  const version = pr?.base?.ref?.match(/^release\/(v[\d.]+)$/)?.[1];
  if (!managedVersion(version)) return { status: 'release-policy', base: pr?.base?.ref };
  const path = planPath(version), base = pr.base.sha, head = pr.head?.sha;
  if (!projectRepositoryMatches(pr.base.repo, repository) || ![base, head].every(value => sha.test(value ?? '')) ||
      !Number.isSafeInteger(pr.number) || pr.number < 1) throw new Error('Invalid frozen Release PR identity');
  const [candidate, checkoutBase, checkoutHead, tree] = checkout();
  if (!sha.test(candidate ?? '') || base !== checkoutBase || head !== checkoutHead) throw new Error('Frozen Release PR checkout differs from HEAD/BASE');
  const live = await refresh(pr);
  if (live?.number !== pr.number || live.state !== 'open' || live.base?.ref !== pr.base.ref ||
      live.base.sha !== base || live.head?.sha !== head || !projectRepositoryMatches(live.base.repo, repository)) {
    throw new Error('Frozen Release PR HEAD/BASE changed; validate the current checkout');
  }
  const original = readVersionPlan(read(base, path));
  const candidateText = read(candidate, path), proposed = readVersionPlan(candidateText);
  if (!original || !proposed || original.version !== version || proposed.version !== version || original.main !== proposed.main) {
    throw new Error('Frozen Release requires an unchanged official plan identity');
  }
  const body = live.body ?? '';
  const fix = declaration(body, 'Release-Fix', /^Release-Fix: (TASK-\d+(?:\.\d+)*) \| ([^|\r\n]+) \| ([^|\r\n]+)$/);
  const changed = files(base, candidate);
  const verifyProduct = () => requiresProductScope(original) && changed.some(file => /^package(?:-lock)?\.json$/.test(file) || /^(?:src|data|config|scripts|tools|art|experiments|\.github)\//.test(file))
    ? auditFrozenProductReview(live, tree, version, request, repository, fix?.[1]) : {};
  const oldAssignments = assignments(changed, base, version, readTask);
  const newAssignments = assignments(changed, candidate, version, readTask);
  // A necessary defect may get its own task under an existing deliverable.
  // Existing assignments and their hard dependencies remain frozen.
  if (fix && !oldAssignments.has(normalizeTaskId(fix[1]))) newAssignments.delete(normalizeTaskId(fix[1]));
  const unchanged = isDeepStrictEqual(scope(original), scope(proposed)) &&
    isDeepStrictEqual(original.integrations, proposed.integrations) && isDeepStrictEqual(oldAssignments, newAssignments) &&
    original.deferrals.every(row => proposed.deferrals.some(next => isDeepStrictEqual(row, next)));
  const manager = tasks();
  const validFixTask = fix && manager.filter(task => normalizeTaskId(task.id) === normalizeTaskId(fix[1]) &&
    !task.metadataErrors.length && task.labels.includes(version) && task.labels.includes('release-scope')).length === 1;
  if (unchanged && validFixTask && /^fix(?:\([^\n)]+\))?: .+/.test(live.title ?? '')) {
    return { status: 'necessary-fix', version, task: fix[1], ...await verifyProduct() };
  }
  if (unchanged && changed.length && changed.every(file => file === path || evidencePath(file) || backlogPath.test(file)) &&
      /^(?:docs|test)\(release\): .+/.test(live.title ?? '')) {
    return { status: 'evidence-only', version };
  }
  const exception = declaration(body, 'Release-Exception', /^Release-Exception: ([1-9]\d*) \| ([^|\r\n]+)$/);
  const id = Number(exception?.[1]);
  const decision = exception && `<!-- scope-exception: #${pr.number} | ${exception[2]} -->`;
  if (!Number.isSafeInteger(id) || !candidateText.split(/\r?\n/).includes(decision)) {
    throw new Error('Release scope is frozen; register a necessary fix or a reviewed scope decision');
  }
  const prefix = `/repos/${repository}`;
  const review = await request(`${prefix}/pulls/${pr.number}/reviews/${id}`);
  const login = review?.user?.login;
  if (review?.id !== id || review.commit_id !== head || !['APPROVED', 'COMMENTED'].includes(review.state) ||
      !review.body?.split(/\r?\n/).includes(`Release scope approved: ${exception[2]}`)) {
    throw new Error('Release scope decision requires an independent native review of this exact HEAD');
  }
  await requireReleaseCoordinator(repository, review.user, request);
  return { status: 'reviewed-exception', version, reviewId: id, reviewer: login, ...await verifyProduct() };
}
