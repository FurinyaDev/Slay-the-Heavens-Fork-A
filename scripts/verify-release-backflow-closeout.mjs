import { appendFileSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { auditBackflow, selectBackflowRefs } from './check-release-backflow.mjs';
import { githubRequest, pages } from './release-ci.mjs';
import { checkoutReceipt, qualityWorkflowPath, receiptErrors } from './verify-delivery.mjs';
import { projectRepositoryId, projectRepositoryMatches } from './repository-identity.mjs';

const positiveId = value => Number.isSafeInteger(value) && value > 0;
const licensesWorkflowPath = '.github/workflows/licenses.yml';

function loadReceipt(repo, run, jobs) {
  const dir = mkdtempSync(join(tmpdir(), 'release-backflow-closeout-'));
  try {
    return checkoutReceipt(repo, run, jobs, dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

export async function verifyBackflowPush(repo, head, request, readReceipt = loadReceipt) {
  const prefix = `/repos/${repo}`;
  const latest = async (file) => {
    const endpoint = `${prefix}/actions/workflows/${file.split('/').at(-1)}/runs?event=push&branch=develop&head_sha=${head}`;
    const runs = await pages(request, endpoint, 'workflow_runs');
    if (runs.some(run => !positiveId(run?.id) || !positiveId(run?.run_attempt) ||
        run.event !== 'push' || run.path !== file || run.head_branch !== 'develop' || run.head_sha !== head ||
        !projectRepositoryMatches(run.repository, repo) || !projectRepositoryMatches(run.head_repository, repo))) {
      throw new Error(`Unexpected ${file} run identity.`);
    }
    const run = runs.sort((a, b) => b.id - a.id)[0];
    if (run?.status !== 'completed' || run.conclusion !== 'success') {
      throw new Error(`Develop ${head} requires its latest successful push run of ${file}.`);
    }
    return run;
  };
  const jobs = run => pages(request, `${prefix}/actions/runs/${run.id}/jobs?filter=all`, 'jobs');
  const [quality, licenses, commit] = await Promise.all([
    latest(qualityWorkflowPath), latest(licensesWorkflowPath), request(`${prefix}/git/commits/${head}`),
  ]);
  const [qualityJobs, licenseJobs] = await Promise.all([jobs(quality), jobs(licenses)]);
  const { checkout, checkoutArtifact } = await readReceipt(repo, quality, qualityJobs);
  if (receiptErrors(checkout, checkoutArtifact, qualityJobs, quality, 3).length ||
      checkout.event !== 'push' || checkout.runId !== quality.id || checkout.prNumber != null ||
      checkout.tested !== head || checkout.head !== head || commit?.sha !== head ||
      !Array.isArray(commit.parents) || !commit.parents.length ||
      JSON.stringify(checkout.parents) !== JSON.stringify(commit.parents.map(parent => parent.sha))) {
    throw new Error('Develop push Full checkout receipt differs from the exact commit or attempt.');
  }
  const inventory = licenseJobs.filter(job => job?.name === 'inventory' && job.run_attempt === licenses.run_attempt);
  const job = inventory[0];
  if (inventory.length !== 1 || !positiveId(job.id) || job.run_id !== licenses.id || job.head_sha !== head ||
      job.status !== 'completed' || job.conclusion !== 'success') {
    throw new Error('Develop push Licenses inventory is missing, stale or unsuccessful.');
  }
  const current = await Promise.all([latest(qualityWorkflowPath), latest(licensesWorkflowPath)]);
  for (const [index, previous] of [quality, licenses].entries()) {
    if (current[index].id !== previous.id || current[index].run_attempt !== previous.run_attempt) {
      throw new Error('Develop push CI run/attempt changed during closeout verification.');
    }
  }
  return { qualityRunId: quality.id, qualityAttempt: quality.run_attempt, checkoutArtifactId: checkoutArtifact.id,
    licensesRunId: licenses.id, licensesAttempt: licenses.run_attempt, inventoryJobId: job.id };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const env = process.env;
    const repo = env.GITHUB_REPOSITORY;
    if (env.GITHUB_EVENT_NAME !== 'workflow_dispatch' || env.GITHUB_SERVER_URL !== 'https://github.com' ||
        env.GITHUB_REPOSITORY_ID !== String(projectRepositoryId) ||
        !projectRepositoryMatches(await githubRequest(`/repos/${repo}`), repo)) {
      throw new Error('Closeout requires the protected repository dispatch.');
    }
    const payload = JSON.parse(readFileSync(env.GITHUB_EVENT_PATH, 'utf8'));
    const selection = selectBackflowRefs(env.GITHUB_EVENT_NAME, env.GITHUB_REF, env.GITHUB_SHA, payload);
    const ci = await verifyBackflowPush(repo, selection.expectedDevelop, githubRequest);
    const graph = auditBackflow(`${env.GITHUB_SERVER_URL}/${repo}.git`, selection);
    const runUrl = `${env.GITHUB_SERVER_URL}/${repo}/actions/runs`;
    const summary = [
      `Verified master \`${graph.master}\` is an ancestor of live develop \`${graph.develop}\`.`,
      `- [Develop push Quality Full](${runUrl}/${ci.qualityRunId}/attempts/${ci.qualityAttempt}) and [exact checkout receipt](${runUrl}/${ci.qualityRunId}/artifacts/${ci.checkoutArtifactId})`,
      `- [Develop push Licenses inventory](${runUrl}/${ci.licensesRunId}/job/${ci.inventoryJobId}) (attempt ${ci.licensesAttempt})`,
    ].join('\n');
    console.log(JSON.stringify({ ...graph, ...ci }));
    appendFileSync(env.GITHUB_STEP_SUMMARY, `${summary}\n`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
