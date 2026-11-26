import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { auditDevelopProductScope, auditFrozenProductReview, auditReleaseFreeze } from '../scripts/check-release-freeze.mjs';
import { auditVersionGovernance, planPath, readVersionPlan } from '../scripts/version-governance.mjs';
import { INDEPENDENT_AI_REVIEW_MARKER } from '../scripts/independent-ai-review.mjs';
import { auditRoadmap } from '../scripts/verify-backlog-roadmap.mjs';
import { verifyReleaseAdmission } from '../scripts/verify-release-admission.mjs';
import { productScopePass } from '../scripts/verify-release-product-scope.mjs';
import { acceptanceRecord, verifyReleaseAcceptance, verifyTrustedPublicationSource } from '../scripts/verify-release-acceptance.mjs';

const version = 'v2.2.0';
const path = planPath(version);
const original = `# Release

<!-- release-plan: ${version} TASK-10 -->

## 正式范围

| 核心交付 | 维度 | Backlog | 交付证据入口 |
| --- | --- | --- | --- |
| 修复 | Scope | TASK-10.1 | Regression |
| 展示 | Scope | TASK-10.2 | Simulator |
| 验收 | Release Gate | TASK-10.3 | CI |

## 独立工程轨道

| Backlog | 接续成果 | 本版直接验收的成果 |
| --- | --- | --- |
| TASK-10.4 | Hosted CD | 正式同源构建回执 |

## PR 对账与延期

| 本版 PR | 处置要求 | 准入处置 |
| --- | --- | --- |
| #138 | 独审与 CI | 必须合入 |

| 延期项 | 固定来源 | 接续 Task | 目标版本 |
| --- | --- | --- | --- |
| 插画 | [#55](https://github.com/FurinyaWorks/Slay-the-Heavens/pull/55) \`abcdef0123456789abcdef0123456789abcdef01\` | TASK-11 | v2.3.0 |
`;

const task = (id, labels = [], extra = {}) => ({ id, labels, metadataErrors: [], ...extra });
const child = (id, track) => task(id, [version, track], { parentTaskId: 'TASK-10' });
const backlog = () => [
  task('TASK-10', [version, 'version-main'], { documentation: [path] }),
  child('TASK-10.1', 'release-scope'), child('TASK-10.2', 'release-scope'),
  child('TASK-10.3', 'release-gate'), task('TASK-10.4', ['engineering'], { parentTaskId: 'TASK-10' }),
  task('TASK-10.5', ['release-deferral'], { parentTaskId: 'TASK-10' }), task('TASK-11'),
];
const audit = (tasks, source = original, planFile = path) =>
  auditVersionGovernance(tasks, '.', [{ path: planFile, plan: readVersionPlan(source) }]);

test('one version main and single plan use Backlog assignments without making the engineering task a gate', () => {
  assert.deepEqual(audit(backlog()), []);
  assert.deepEqual(audit(backlog(), original.replaceAll('\n', '\r\n')), []);
  const tasks = backlog();
  tasks[3].dependencies = ['TASK-10.1'];
  tasks[1].dependencies = ['TASK-10.4'];
  assert.match(audit(tasks).join('\n'), /TASK-10\.3.*engineering outcome/);
});

test('duplicate and missing authoritative release records fail', () => {
  const tasks = backlog();
  tasks.push(task('TASK-12', [version, 'version-main'], { documentation: [path] }));
  assert.match(audit(tasks).join('\n'), /unique root/);
  assert.match(audit(backlog(), original, 'docs/versions/COPY.md').join('\n'), /invalid or duplicate/);
  assert.match(audit(backlog(), original.replace('release-plan:', 'other:')).join('\n'), /invalid or duplicate/);
});

test('wrong version, engineering dimension and omitted direct task fail', () => {
  const tasks = backlog();
  tasks[2].labels = ['v2.3.0', 'release-scope'];
  tasks[4].labels.push(version);
  tasks.push(child('TASK-10.6', 'release-scope'));
  const errors = audit(tasks).join('\n');
  assert.match(errors, /TASK-10\.2.*official plan/);
  assert.match(errors, /TASK-10\.4.*must not carry/);
  assert.match(errors, /TASK-10\.6 missing/);
  assert.match(audit([task('TASK-15', ['v2.3.0'])]).join('\n'), /TASK-15.*governance role/);
});

test('closing the version main requires release and actual backflow evidence', () => {
  const tasks = backlog();
  tasks[0].status = 'Done';
  assert.match(audit(tasks).join('\n'), /completion requires publication and production backflow/);
  const proof = '\n<!-- release-closeout: ' + 'b'.repeat(40) + ' ' + 'a'.repeat(40) +
    ' https://github.com/FurinyaWorks/Slay-the-Heavens/releases/tag/engine-v2.2.0 ' +
    'https://github.com/FurinyaWorks/Slay-the-Heavens/actions/runs/40 -->\n';
  assert.deepEqual(audit(tasks, original + proof), []);
});

test('actual direct child count prompts review without a mechanical upper limit', () => {
  const tasks = backlog();
  for (let id = 20; id < 25; id++) tasks.push(task(`TASK-${id}`, ['release-deferral'], { parentTaskId: 'TASK-10' }));
  assert.match(audit(tasks).join('\n'), /scope review required for 3 goals and 10 direct tasks/);
  assert.deepEqual(audit(tasks, original + '\n<!-- scope-review: 2026-11-26 | Owner | preserve reviewed tasks -->\n'), []);
});

test('deferral requires fixed ancestry, an existing successor outside this release and a target', () => {
  for (const text of [original.replace('abcdef01', 'HEAD'), original.replace('TASK-11 |', 'TASK-99 |'),
    original.replace('TASK-11 |', 'TASK-10.1 |'), original.replace('v2.3.0 |', 'v2.2.0 |')]) {
    assert.match(audit(backlog(), text).join('\n'), /requires fixed source, Backlog successor and target version/);
  }
});

test('version engineering task may leave M8 without affecting legacy or ordinary product tasks', () => {
  const main = task('TASK-10', ['version-main'], { status: 'In Progress', milestone: 'm-8', assignees: ['@Furinya'] });
  const makeChild = labels => task('TASK-10.1', labels, { status: 'In Progress', parentTaskId: main.id, assignees: ['@Furinya'] });
  const roadmap = '### M8\n- TASK-10: version';
  assert.deepEqual(auditRoadmap([main, makeChild(['engineering'])], roadmap, { 'm-8': 'M8' }), []);
  assert.match(auditRoadmap([main, makeChild(['release-scope'])], roadmap, { 'm-8': 'M8' }).join('\n'), /缺少有效首发里程碑/);
  assert.match(auditRoadmap([{ ...main, labels: [] }, makeChild(['engineering'])], roadmap, { 'm-8': 'M8' }).join('\n'), /缺少有效首发里程碑/);
});

const repo = 'FurinyaWorks/Slay-the-Heavens';
const [base, head, candidate] = ['a', 'b', 'c'].map(x => x.repeat(40));
const pr = { number: 40, state: 'open', base: { ref: 'release/v2.2.0', sha: base, repo: { id: 1429751262, full_name: repo } },
  head: { sha: head }, user: { login: 'developer' }, title: 'fix(ui): 修复暂停',
  body: 'Release-Fix: TASK-10.1 | failure after pause | link to replay' };
const inputs = (after = original, changed = ['src/lua/game.lua']) => ({
  checkout: () => [candidate, base, head], read: ref => ref === base ? original : after,
  tasks: backlog, files: () => changed, refresh: async pull => pull,
});
const unexpectedRequest = async () => { throw new Error('Unexpected API request'); };

test('frozen PR admits a traced defect fix and evidence-only documentation', async () => {
  assert.equal((await auditReleaseFreeze(pr, repo, unexpectedRequest, inputs())).status, 'necessary-fix');
  assert.equal((await auditReleaseFreeze({ ...pr, title: 'docs(release): archive replay', body: '' }, repo,
    unexpectedRequest, inputs(original, [path, 'docs/evidence/replay.md']))).status, 'evidence-only');
  assert.equal((await auditReleaseFreeze({ ...pr, base: { ref: 'release/v2.0.0' } }, repo, unexpectedRequest, inputs())).status, 'release-policy');
});

test('frozen PR rejects undocumented additions, removed scope and old checkout', async () => {
  await assert.rejects(auditReleaseFreeze({ ...pr, title: 'feat: add a level' }, repo,
    unexpectedRequest, inputs()), /scope is frozen/);
  await assert.rejects(auditReleaseFreeze(pr, repo, unexpectedRequest,
    inputs(original.replace('| 展示 |', '| 新增 |'))), /scope is frozen/);
  await assert.rejects(auditReleaseFreeze(pr, repo, unexpectedRequest,
    inputs(original.replace('| 插画 |', '| 删除原延期记录 |'))), /scope is frozen/);
  await assert.rejects(auditReleaseFreeze(pr, repo, unexpectedRequest,
    { ...inputs(), checkout: () => [candidate, head, base] }), /differs from HEAD\/BASE/);
  await assert.rejects(auditReleaseFreeze(pr, repo, unexpectedRequest,
    { ...inputs(), refresh: async () => ({ ...pr, head: { sha: base } }) }), /PR HEAD\/BASE changed/);
});

test('exception requires plan decision, exact independent GitHub review and release permissions', async () => {
  const reason = 'Owner approved the added scenario';
  const declared = { ...pr, title: 'feat: add scenario', body: `Release-Exception: 71 | ${reason}` };
  const decision = inputs(original + `\n<!-- scope-exception: #40 | ${reason} -->\n`);
  const record = { id: 71, commit_id: head, user: { login: 'owner', id: 111138384 }, state: 'COMMENTED',
    body: `Release scope approved: ${reason}` };
  const request = (review = record, permission = 'admin') => async endpoint => endpoint.endsWith('/reviews/71') ? review : { permission, user: record.user };
  assert.equal((await auditReleaseFreeze(declared, repo, request(), decision)).status, 'reviewed-exception');
  assert.equal((await auditReleaseFreeze({ ...declared, body: '' }, repo, request(),
    { ...decision, refresh: async () => declared })).status, 'reviewed-exception');
  await assert.rejects(auditReleaseFreeze(declared, repo, request({ ...record, commit_id: base }), decision), /exact HEAD/);
  await assert.rejects(auditReleaseFreeze(declared, repo, request(record, 'write'), decision), /lacks approval/);
  await assert.rejects(auditReleaseFreeze(declared, repo, request(), inputs()), /scope is frozen/);
});

const repository = { id: 1429751262, full_name: repo };
const ref = (branch, sha) => ({ ref: `refs/heads/${branch}`, object: { type: 'commit', sha } });
const comparison = sha => ({ status: 'ahead', merge_base_commit: { sha } });

test('admission checks registered implementation PR, live refs, full push proof and backflow', async () => {
  const pull = { number: 138, merged: true, merge_commit_sha: candidate, base: { ref: 'develop', repo: repository } };
  const request = (pr = pull, develop = head) => async path => {
    if (path.endsWith('/heads/develop')) return ref('develop', develop);
    if (path.endsWith('/heads/master')) return ref('master', base);
    if (path.endsWith('/pulls/138')) return pr;
    if (path.includes(`/compare/${candidate}...${head}?`)) return comparison(candidate);
    return unexpectedRequest();
  };
  const checks = { readLocal: () => ({ checked: head, version, plan: readVersionPlan(original) }),
    verifyCi: async () => ({ qualityRunId: 50 }),
    verifyGraph: async master => { assert.equal(master, base); return { master: base, develop: head }; } };
  assert.deepEqual(await verifyReleaseAdmission(version, head, request(), checks), {
    version, task: 'TASK-10', phase: 'admission-checks-passed', master: base, develop: head,
    pullRequests: [{ number: 138, merge: candidate }], manualChecks: [], ci: { qualityRunId: 50 },
  });
  await assert.rejects(verifyReleaseAdmission(version, head, request({ ...pull, merged: false }), checks), /not integrated/);
  await assert.rejects(verifyReleaseAdmission(version, head, request(pull, candidate), checks), /develop moved/);
  await assert.rejects(verifyReleaseAdmission(version, head, request(),
    { ...checks, verifyCi: async () => { throw new Error('Full is not green'); } }), /Full is not green/);
  await assert.rejects(verifyReleaseAdmission(version, head, request(),
    { ...checks, verifyGraph: async () => { throw new Error('Backflow pending'); } }), /Backflow pending/);
});

const gilSha256 = 'f'.repeat(64), branch = `release/${version}`;
const names = ['Simulator', 'PC', '实体手机', '官方平台', '美术质量', '稳定性'];
const acceptance = original + `
<!-- release-acceptance: ${head} ${gilSha256} #138 -->

## 同候选人工验收证据

| 项目 | 原始证据 | 签署协调者 |
| --- | --- | --- |
` + names.map(name => `| ${name} | [原始证据](https://github.com/${repo}/actions/runs/11/artifacts/12) | @owner |`).join('\n');

test('acceptance requires the same exact GIL and every independent manual evidence row', () => {
  const result = acceptanceRecord(acceptance, head, gilSha256);
  assert.deepEqual(Object.keys(result.evidence), names);
  assert.throws(() => acceptanceRecord(acceptance, base, gilSha256), /missing acceptance/);
  assert.throws(() => acceptanceRecord(acceptance.replace('| 实体手机 |', '| 模拟手机 |'), head, gilSha256), /physical phone/);
});

test('publication rechecks protected plan, exact native review and frozen refs', async () => {
  const review = { id: 125, commit_id: candidate, state: 'COMMENTED', user: { login: 'owner', id: 111138384 },
    body: `Release acceptance approved: ${head} ${gilSha256}` };
  const source = { path, encoding: 'base64', type: 'file', sha: 'f'.repeat(40), content: Buffer.from(acceptance).toString('base64') };
  const request = ({ reviewRow = review, frozen = head, changed = false } = {}) => async path => {
    if (path.endsWith('/heads/develop')) return ref('develop', base);
    if (path.endsWith('/heads/' + branch)) return ref(branch, frozen);
    if (path.endsWith('?ref=' + base)) return source;
    if (path.endsWith('?ref=' + candidate)) return changed ? { ...source, sha: base } : source;
    if (path.endsWith('/pulls/138')) return { number: 138, merged: true, merge_commit_sha: candidate,
      base: { ref: 'develop', repo: repository }, head: { sha: candidate } };
    if (path.includes(`/compare/${candidate}...${base}?`)) return comparison(candidate);
    if (path.endsWith('/pulls/138/reviews?per_page=100&page=1')) return [reviewRow];
    if (path.endsWith('/collaborators/owner/permission')) return { permission: 'admin', user: review.user };
    return unexpectedRequest();
  };
  const full = { repo, head, branch }, performance = { head, branch, gil: { gilSha256 } };
  assert.equal((await verifyReleaseAcceptance(full, performance, request())).verificationCommit, base);
  await assert.rejects(verifyReleaseAcceptance(full, performance, request({ reviewRow: { ...review, state: 'DISMISSED' } })), /independent native/);
  await assert.rejects(verifyReleaseAcceptance(full, performance, request({ changed: true })), /differs from/);
  await assert.rejects(verifyReleaseAcceptance(full, performance, request({ frozen: candidate })), /changed during/);
});

test('known scope expansion cannot use a Backlog ID or claimed green tests as product approval', async () => {
  const live = { ...pr, number: 1007, title: 'fix(ui): wider hand',
    body: 'Backlog: TASK-115.6\nTests: pass\nRelease-Fix: TASK-115.6 | wide viewport | 34/34' };
  await assert.rejects(auditFrozenProductReview(live, candidate, version, unexpectedRequest, repo, 'TASK-115.6'),
    /require a version, task, actual behavior, fixed approval source and native review/);
});

test('native product review admits approved width adaptation and necessary detail fix with exact scope', async () => {
  const approvalRef = '20b7b4f6128c26b1e221e17cc64a66a59985f917';
  const taskPath = 'backlog/tasks/task-115.6 - 实现全屏响应式布局与统一触控坐标.md';
  const taskUrl = `https://github.com/${repo}/blob/${approvalRef}/${encodeURI(taskPath)}`;
  const user = { login: 'owner', id: 111138384 };
  const cases = [
    { number: 984, task: 'TASK-115.6', behavior: 'wide viewport touch coordinate adaptation', url: taskUrl },
    { number: 981, task: 'TASK-115.10', behavior: 'correct detail writes without altering targeting',
      url: `https://github.com/${repo}/pull/81#pullrequestreview-81` },
  ];
  for (const { number, task, behavior, url } of cases) {
    const scope = `Product-Scope: ${version} | ${task} | ${behavior} | ${url}`;
    const live = { ...pr, number, created_at: '2026-11-27T00:00:00Z', user: { id: 8 }, body: `${scope}\nProduct-Review: 71` };
    const proof = createHash('sha256').update(scope).digest('hex');
    const review = { id: 71, commit_id: head, state: 'COMMENTED', user,
      body: `Release product scope verified: ${version} ${base} ${candidate} ${proof}` };
    const approval = { id: 81, state: 'COMMENTED', user, commit_id: base, submitted_at: '2026-11-25T00:00:00Z',
      body: `Product change approved: ${version} ${task} ${behavior}` };
    const source = { number: 81, merged: true, merged_at: '2026-11-26T00:00:00Z', merge_commit_sha: approvalRef,
      base: { ref: 'develop', repo: repository }, head: { sha: base }, user: { id: 9 } };
    const taskDocument = `---\nid: ${task}\ntitle: Width\nstatus: In Progress\nlabels: [${version}]\ndependencies: []\n---\n` +
      `<!-- SECTION:DESCRIPTION:BEGIN -->\n任务：${behavior}\n<!-- SECTION:DESCRIPTION:END -->`;
    const sourceDocument = original + `\n<!-- product-approval: ${version} | ${task} | ${behavior} -->\n`;
    const request = ({ decision = approval, decisionSource = source, ancestor = approvalRef, approvalThrough = approvalRef, permission = 'admin', text } = {}) => async endpoint => {
      if (endpoint.endsWith('/reviews/71')) return review;
      if (endpoint.endsWith('/reviews/81')) return decision;
      if (endpoint.endsWith('/pulls/81')) return decisionSource;
      if (endpoint.includes('...c36a8049560c05eddde6d9596cf9100fc7184c5d?')) return comparison(approvalThrough);
      if (endpoint.includes('/compare/')) return comparison(ancestor);
      if (endpoint.includes('/contents/')) return { type: 'file', encoding: 'base64', path: number === 984 ? taskPath : path,
        content: Buffer.from(text ?? (number === 984 ? taskDocument : sourceDocument)).toString('base64') };
      if (endpoint.endsWith('/permission')) return { permission, user };
      return unexpectedRequest();
    };
    assert.deepEqual(await auditFrozenProductReview(live, candidate, version, request(), repo, task), { productReviewId: 71 });
    await assert.rejects(auditFrozenProductReview(live, candidate, 'v2.3.0', request(), repo, task), /require a version/);
    await assert.rejects(auditFrozenProductReview(live, base, version, request(), repo, task), /exact behavior/);
    await assert.rejects(auditFrozenProductReview(live, candidate, version, request({ permission: 'write' }), repo, task), /lacks approval/);
    await assert.rejects(auditFrozenProductReview({ ...live, user }, candidate, version, request(), repo, task), /exact behavior/);
    if (number === 984) {
      await assert.rejects(auditFrozenProductReview(live, candidate, version, request({ ancestor: head }), repo, task), /protected release history/);
      await assert.rejects(auditFrozenProductReview(live, candidate, version, request({ approvalThrough: head }), repo, task), /protected release history/);
      const postHoc = taskDocument.replace(`任务：${behavior}`, '任务：wide layout only') +
        `\n<!-- SECTION:NOTES:BEGIN -->\n${behavior}\n<!-- SECTION:NOTES:END -->`;
      await assert.rejects(auditFrozenProductReview(live, candidate, version, request({ text: postHoc }), repo, task), /exact approved clause/);
      await assert.rejects(auditFrozenProductReview(live, candidate, version,
        request({ text: taskDocument.replace(task, 'TASK-15') }), repo, task), /exact approved clause/);
    } else {
      for (const decision of [
        { ...approval, body: approval.body.replace(version, 'v2.3.0') },
        { ...approval, user: live.user },
        { ...approval, user: source.user },
        { ...approval, commit_id: head },
        { ...approval, submitted_at: live.created_at },
      ]) {
        await assert.rejects(auditFrozenProductReview(live, candidate, version,
          request({ decision }), repo, task), /own approved decision/);
      }
      await assert.rejects(auditFrozenProductReview(live, candidate, version,
        request({ text: original }), repo, task), /already-merged version plan/);
    }
  }
});

test('candidate configuration mismatch cannot yield an admission receipt', async () => {
  const actual = original.replace('TASK-10 -->', 'TASK-115 -->');
  const pull = { number: 138, merged: true, merge_commit_sha: candidate, base: { ref: 'develop', repo: repository } };
  const request = async endpoint => {
    if (endpoint.endsWith('/heads/develop')) return ref('develop', head);
    if (endpoint.endsWith('/heads/master')) return ref('master', base);
    if (endpoint.endsWith('/pulls/138')) return pull;
    if (endpoint.includes('/compare/')) return comparison(candidate);
    return unexpectedRequest();
  };
  const checks = { readLocal: () => ({ checked: head, version, plan: readVersionPlan(actual) }),
    verifyProduct: async () => ({ head: base }), verifyCi: unexpectedRequest, verifyGraph: unexpectedRequest };
  await assert.rejects(verifyReleaseAdmission(version, head, request, checks), /did not run on the admission source/);
  await assert.rejects(verifyReleaseAdmission(version, head, request, { ...checks, verifyProduct: async () => {
    throw new Error('formal profile rejected');
  } }), /formal profile rejected/);
});

test('develop product changes require the existing native independent report and immutable semantic scope', async () => {
  const actor = { id: 111138384, login: 'owner' };
  const scope = `Product-Scope: ${version} | none`;
  const tree = 'd'.repeat(40);
  const live = { ...pr, state: 'open', draft: false, merged: false, mergeable: true,
    head: { sha: head, repo: repository }, base: { sha: base, ref: 'develop', repo: repository },
    merge_commit_sha: candidate, body: `${scope}\nProduct-Review: 71` };
  const report = { schemaVersion: 1, kind: 'independent-ai-review', repositoryId: repository.id, repositoryFullName: repo,
    prNumber: live.number, reviewedHeadSha: head, reviewedBaseSha: base, reviewedTreeSha: tree,
    conclusion: 'pass', unresolved: [], reviewerAgent: '/root/review', implementationAgents: ['/root/impl'],
    coordinator: { ...actor, verifiedActualSessions: true },
    provenance: { kind: 'coordinator-verified-agent-session', reviewId: 'review', sessionId: 'session' },
    productScope: { version, declarationSha256: createHash('sha256').update(scope).digest('hex') } };
  const options = {
    checkout: () => [candidate, base, head, tree],
    read: (ref, file) => { assert.equal(ref, base); return file === path ? original.replace('TASK-10 -->', 'TASK-115 -->') : 'installed'; },
    files: () => ['config/formal-build.json'],
  };
  const request = ({ current = live, receipt = report, signer = actor } = {}) => async endpoint => {
    if (endpoint.endsWith(`/pulls/${live.number}`)) return current;
    if (endpoint.endsWith('/reviews/71')) return { id: 71, commit_id: head, state: 'COMMENTED', user: signer,
      body: INDEPENDENT_AI_REVIEW_MARKER + '\n' + JSON.stringify(receipt) };
    if (endpoint.endsWith('/permission')) return { permission: 'admin', user: signer };
    if (endpoint.endsWith(`/git/commits/${candidate}`)) return { sha: candidate, tree: { sha: tree }, parents: [{ sha: base }, { sha: head }] };
    return unexpectedRequest();
  };
  assert.deepEqual(await auditDevelopProductScope(live, repo, request(), options), { productReviewId: 71 });
  await assert.rejects(auditDevelopProductScope(live, repo, request({ current: { ...live, body: 'Backlog: TASK-115.6\nTests: 34/34' } }), options), /require a version/);
  for (const receipt of [
    { ...report, reviewerAgent: '/root/impl' },
    { ...report, reviewedBaseSha: head },
    { ...report, productScope: { ...report.productScope, version: 'v2.3.0' } },
    { ...report, productScope: { ...report.productScope, declarationSha256: 'a'.repeat(64) } },
  ]) await assert.rejects(auditDevelopProductScope(live, repo, request({ receipt }), options), /exact independent AI review/);
  await assert.rejects(auditDevelopProductScope(live, repo, request({ signer: { id: 7, login: 'implementer' } }), options), /trusted coordinator identity/);
  assert.equal(await auditDevelopProductScope(live, repo, unexpectedRequest, { ...options, files: () => ['tests/lua/battle.lua'] }), null);
});


test('formal product acceptance cannot be signed by the acceptance PR author', async () => {
  const tree = 'd'.repeat(40), payload = '2'.repeat(64);
  const author = { id: 111138384, login: 'owner' };
  const signer = { id: 337201427, login: 'reviewer' };
  const sourceText = acceptance.replace('TASK-10 -->', 'TASK-115 -->').replaceAll('@owner', '@reviewer');
  const source = { path, encoding: 'base64', type: 'file', sha: 'f'.repeat(40), content: Buffer.from(sourceText).toString('base64') };
  const review = { id: 125, commit_id: candidate, state: 'COMMENTED', user: signer,
    body: `Release acceptance approved: ${head} ${gilSha256}\nRelease product scope verified: ${version} ${head} ${tree} ${gilSha256} ${payload}` };
  const request = (prAuthor = author) => async endpoint => {
    if (endpoint.endsWith('/heads/develop')) return ref('develop', base);
    if (endpoint.endsWith('/heads/' + branch)) return ref(branch, head);
    if (endpoint.endsWith('?ref=' + base) || endpoint.endsWith('?ref=' + candidate)) return source;
    if (endpoint.endsWith('/pulls/138')) return { number: 138, merged: true, merge_commit_sha: candidate,
      base: { ref: 'develop', repo: repository }, head: { sha: candidate }, user: prAuthor };
    if (endpoint.includes(`/compare/${candidate}...${base}?`)) return comparison(candidate);
    if (endpoint.endsWith('/pulls/138/reviews?per_page=100&page=1')) return [review];
    if (endpoint.endsWith('/collaborators/reviewer/permission')) return { permission: 'admin', user: signer };
    return unexpectedRequest();
  };
  const full = { repo, head, branch }, performance = { head, branch, tree, productScope: productScopePass,
    gil: { gilSha256, payloadDigest: payload } };
  assert.equal((await verifyReleaseAcceptance(full, performance, request())).productReviewer, review.id);
  await assert.rejects(verifyReleaseAcceptance(full, performance, request(signer)), /native release product-scope verification is missing/);
  await assert.rejects(verifyReleaseAcceptance(full, { ...performance, productScope: undefined }, request()), /formal product-scope readback/);
});


test('v2.2.0 manual publication requires clean protected controller source', async () => {
  const request = async () => ref('develop', base);
  const git = (head, dirty = '') => (...args) => args[0] === 'rev-parse' ? head : dirty;
  assert.equal(await verifyTrustedPublicationSource(repo, request, { git: git(base) }), base);
  await assert.rejects(verifyTrustedPublicationSource(repo, request, { git: git(head) }), /clean protected develop/);
  await assert.rejects(verifyTrustedPublicationSource(repo, request, { git: git(base, ' M scripts/check-release-freeze.mjs') }), /clean protected develop/);
});
