import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { isDeepStrictEqual } from 'node:util';
import { normalizeTaskId } from './task-dependencies.mjs';
import { managedVersion, planPath, readVersionPlan } from './version-governance.mjs';
import { projectRepositoryMatches } from './repository-identity.mjs';
import { readBacklogRecords } from './backlog-closeout.mjs';
import { readTaskHeader } from './backlog-metadata.mjs';
import { independentAiReportErrors, parseIndependentAiReview } from './independent-ai-review.mjs';
import { requireReleaseCoordinator } from './verify-release-acceptance.mjs';
import { requiresProductScope } from './verify-release-product-scope.mjs';

const sha = /^[a-f0-9]{40}$/;
// #994 is the existing protected v2.2.0 scope baseline. Later decisions use native approval.
const v220ApprovalBaseline = 'c36a8049560c05eddde6d9596cf9100fc7184c5d';
// #1022 copied already approved character-selection designs into this version.
const v220SelectionInheritance = 'f9513b58a0d2ef836178001773eabbbc3459777a';
const git = (...args) => execFileSync('git', ['--no-replace-objects', ...args], { encoding: 'utf8' });
const scope = plan => plan.scope.map(row => row.slice(0, 3));
const evidencePath = path => /^docs\/(?:evidence|reviews)\//.test(path);
const backlogPath = /^backlog\/(?:tasks|completed)\/task-[\d.]+ - .+\.md$/;
const productInputs = paths => paths.some(path => /^package(?:-lock)?\.json$/.test(path) ||
  /^(?:src|data|config|scripts|tools|art|experiments|\.github)\//.test(path));
const checkoutIdentity = () => git('rev-parse', 'HEAD', 'HEAD^1', 'HEAD^2', 'HEAD^{tree}').trimEnd().split('\n');
const changedPaths = (base, target) => git('diff', '--name-only', '--no-renames', '-z', base, target, '--').split('\0').filter(Boolean);
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

function matchesApprovedClause(document, path, version, taskId, behavior) {
  if (document?.type !== 'file' || document.path !== path || document.encoding !== 'base64' ||
      typeof document.content !== 'string') return false;
  const text = Buffer.from(document.content, 'base64').toString('utf8');
  if (backlogPath.test(path)) {
    const task = readTaskHeader(text);
    const description = text.match(/<!-- SECTION:DESCRIPTION:BEGIN -->([\s\S]*?)<!-- SECTION:DESCRIPTION:END -->/)?.[1] ?? '';
    const criteria = text.match(/<!-- AC:BEGIN -->([\s\S]*?)<!-- AC:END -->/)?.[1] ?? '';
    const clauses = [description, criteria].flatMap(block => block.split(/\r?\n/).flatMap(line => {
      const match = line.match(/^(?:任务：|\s*- \[[ xX]\] #\d+ )(.+)$/);
      return match ? [match[1].trim()] : [];
    }));
    return task.id === taskId && task.labels.includes(version) && !task.metadataErrors.length && clauses.includes(behavior);
  }
  if (path === planPath(version)) {
    const plan = readVersionPlan(text);
    return plan?.version === version && plan.scope.some(([name, dimension, tasks]) =>
      dimension === 'Scope' && name === behavior && tasks?.match(/\bTASK-\d+(?:\.\d+)*\b/g)?.includes(taskId));
  }
  if (path === 'docs/design/ui-references.json') {
    const rows = JSON.parse(text).references;
    return Array.isArray(rows) && rows.filter(row => row.targetVersion === version && row.backlogTask === taskId &&
      row.status === 'APPROVED' && row.note === behavior).length === 1;
  }
  return false;
}

async function verifyApprovalReview(api, repository, pr, scope, native, request) {
  const [, pull, approvalId] = native;
  if (!Number.isSafeInteger(Number(pull)) || !Number.isSafeInteger(Number(approvalId)) || Number(pull) === pr.number ||
      !Number.isSafeInteger(pr.user?.id) || !Number.isFinite(Date.parse(pr.created_at))) {
    throw new Error('Product approval must come from a separate decision PR');
  }
  const [source, approval] = await Promise.all([
    request(`${api}/pulls/${pull}`), request(`${api}/pulls/${pull}/reviews/${approvalId}`),
  ]);
  if (source?.number !== Number(pull) || source.merged !== true || source.base?.ref !== 'develop' ||
      !projectRepositoryMatches(source.base.repo, repository) || !Number.isSafeInteger(source.user?.id) || !sha.test(source.head?.sha ?? '') ||
      !sha.test(source.merge_commit_sha ?? '') || !(Date.parse(source.merged_at) < Date.parse(pr.created_at)) ||
      approval?.id !== Number(approvalId) || approval.commit_id !== source.head.sha || approval.user?.id === pr.user.id ||
      approval.user?.id === source.user?.id || !['COMMENTED', 'APPROVED'].includes(approval.state) ||
      !(Date.parse(approval.submitted_at) < Date.parse(pr.created_at)) ||
      !approval.body?.split(/\r?\n/).includes(`Product change approved: ${scope[1]} ${scope[2]} ${scope[3]}`)) {
    throw new Error('Product scope must have its own approved decision for this version and behavior before the implementation PR');
  }
  await requireReleaseCoordinator(repository, approval.user, request);
  const path = planPath(scope[1]), merge = source.merge_commit_sha;
  const [ancestry, document] = await Promise.all([
    request(`${api}/compare/${merge}...${pr.base.sha}?per_page=1`),
    request(`${api}/contents/${path}?ref=${merge}`),
  ]);
  const record = `<!-- product-approval: ${scope[1]} | ${scope[2]} | ${scope[3]} -->`;
  if (ancestry?.merge_base_commit?.sha !== merge || !['ahead', 'identical'].includes(ancestry.status) ||
      document?.type !== 'file' || document.path !== path || document.encoding !== 'base64' ||
      typeof document.content !== 'string' ||
      !Buffer.from(document.content, 'base64').toString('utf8').split(/\r?\n/).includes(record)) {
    throw new Error('Product approval must also exist in the already-merged version plan');
  }
}

const productScopeLine = /^Product-Scope: (v[\d.]+) \| (TASK-\d+(?:\.\d+)*) \| ([^|\r\n]+) \| (https:\/\/github\.com\/[^|\s]+)$/;

async function verifyClaim(api, repository, pr, version, scope, request) {
  const prefix = `https://github.com/${repository}/`;
  if (scope?.[1] !== version || !scope[4].startsWith(prefix)) {
    throw new Error('Product scope requires the current version, task, observed behavior and fixed approval source');
  }
  const evidence = scope[4].slice(prefix.length);
  const pinned = /^blob\/([a-f0-9]{40})\/((?:backlog\/(?:tasks|completed)\/task-|docs\/(?:versions\/|design\/))[^#?]+)$/.exec(evidence);
  const native = /^pull\/([1-9]\d*)#pullrequestreview-([1-9]\d*)$/.exec(evidence);
  if (native) return verifyApprovalReview(api, repository, pr, scope, native, request);
  if (!pinned) throw new Error('Product scope requires a fixed protected source or separate native Owner decision');
  const [, ref, path] = pinned;
  const inheritedSelection = ref === v220SelectionInheritance && path === 'docs/design/ui-references.json' && scope[2] === 'TASK-115.10';
  const [ancestry, approvalHistory, document] = await Promise.all([
    request(`${api}/compare/${ref}...${pr.base.sha}?per_page=1`),
    inheritedSelection ? null : request(`${api}/compare/${ref}...${v220ApprovalBaseline}?per_page=1`),
    request(`${api}/contents/${path}?ref=${ref}`),
  ]);
  if (ancestry?.merge_base_commit?.sha !== ref || !['ahead', 'identical'].includes(ancestry.status) ||
      (!inheritedSelection && (approvalHistory?.merge_base_commit?.sha !== ref || !['ahead', 'identical'].includes(approvalHistory.status))) ||
      !matchesApprovedClause(document, decodeURIComponent(path), version, scope[2], scope[3])) {
    throw new Error('Product approval source must cite an exact approved clause in protected release history');
  }
}

function productDeclaration(pr, version, tree, { fixTask, develop } = {}) {
  const body = (pr.body ?? '').replace(/<!--[\s\S]*?(?:-->|$)/g, '');
  const rows = body.split(/\r?\n/).filter(line => line.startsWith('Product-Scope:'));
  const claims = rows.map(line => productScopeLine.exec(line));
  const none = develop && rows.length === 1 && rows[0] === `Product-Scope: ${version} | none`;
  const id = Number(declaration(body, 'Product-Review', /^Product-Review: ([1-9]\d*)$/)?.[1]);
  if (!rows.length || new Set(rows).size !== rows.length || (!none && claims.some(row => row?.[1] !== version)) ||
      (fixTask && !claims.some(row => row?.[2] === fixTask)) || !Number.isSafeInteger(id) || !sha.test(tree ?? '')) {
    throw new Error('Product changes require a version, task, actual behavior, fixed approval source and native review');
  }
  return { id, proof: createHash('sha256').update(rows.join('\n')).digest('hex'), claims: none ? [] : claims };
}

async function productReview(pr, tree, version, request, repository, { fixTask, candidate } = {}) {
  const { id, proof, claims } = productDeclaration(pr, version, tree, { fixTask, develop: Boolean(candidate) });
  const api = `/repos/${repository}`;
  const review = await request(`${api}/pulls/${pr.number}/reviews/${id}`);
  if (review?.id !== id || review.commit_id !== pr.head.sha || !['APPROVED', 'COMMENTED'].includes(review.state)) {
    throw new Error('Product scope lacks a native review of the exact HEAD');
  }
  await requireReleaseCoordinator(repository, review.user, request);
  if (candidate) {
    const report = parseIndependentAiReview(review.body);
    const sourceCommit = await request(`${api}/git/commits/${candidate}`);
    const errors = independentAiReportErrors(report, { repository: pr.base.repo, pr, baseSha: pr.base.sha,
      sourceCommit, coordinator: review.user });
    if (errors.length || report.reviewedTreeSha !== tree || report.productScope?.version !== version ||
        report.productScope?.declarationSha256 !== proof) {
      throw new Error('Develop product scope lacks an exact independent AI review of its actual behavior and declaration');
    }
  } else if (!Number.isSafeInteger(pr.user?.id) || review.user.id === pr.user.id ||
      !review.body?.split(/\r?\n/).includes(`Release product scope verified: ${version} ${pr.base.sha} ${tree} ${proof}`)) {
    throw new Error('Frozen product changes lack independent native review of their exact behavior, HEAD, BASE and tree');
  }
  await Promise.all(claims.map(scope => verifyClaim(api, repository, pr, version, scope, request)));
  return { productReviewId: id };
}

export const auditFrozenProductReview = (pr, tree, version, request, repository, fixTask) =>
  productReview(pr, tree, version, request, repository, { fixTask });

export async function auditDevelopProductScope(pr, repository, request, {
  checkout = checkoutIdentity, read = readIfPresent, files = changedPaths, reviewId,
} = {}) {
  const base = pr?.base?.sha, head = pr?.head?.sha;
  if (pr?.base?.ref !== 'develop' || !projectRepositoryMatches(pr.base.repo, repository) ||
      ![base, head].every(value => sha.test(value ?? ''))) throw new Error('Invalid develop product PR identity');
  // Install from the protected base. A proposed change cannot disable its gate.
  if (!read(base, 'scripts/verify-release-product-scope.mjs')) return null;
  const version = 'v2.2.0';
  const plan = readVersionPlan(read(base, planPath(version)));
  if (!requiresProductScope(plan)) throw new Error('Protected v2.2.0 product scope plan is unavailable');
  if (plan.closed) return null;
  const [candidate, checkoutBase, checkoutHead, tree] = checkout();
  if (!sha.test(candidate ?? '') || checkoutBase !== base || checkoutHead !== head) {
    throw new Error('Develop product PR checkout differs from HEAD/BASE');
  }
  if (!productInputs(await files(base, candidate))) return null;
  const pullPath = `/repos/${repository}/pulls/${pr.number}`;
  const live = await request(pullPath);
  if (live?.number !== pr.number || live.base?.ref !== 'develop' || live.base.sha !== base || live.head?.sha !== head ||
      live.merge_commit_sha !== candidate || !projectRepositoryMatches(live.base.repo, repository)) {
    throw new Error('Develop product PR changed during governance check');
  }
  const result = await productReview(live, tree, version, request, repository, { candidate });
  if (reviewId !== undefined && result.productReviewId !== reviewId) {
    throw new Error('Product scope receipt must be in the currently selected independent review');
  }
  const current = await request(pullPath);
  if (current?.state !== 'open' || current.base?.sha !== base || current.head?.sha !== head ||
      current.merge_commit_sha !== candidate || current.body !== live.body) {
    throw new Error('Develop product PR changed during governance check');
  }
  return result;
}

export async function auditReleaseFreeze(pr, repository, request, {
  checkout = checkoutIdentity,
  read = (ref, path) => git('show', `${ref}:${path}`),
  readTask = readIfPresent,
  files = changedPaths,
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
  const verifyProduct = () => requiresProductScope(original) && productInputs(changed)
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
