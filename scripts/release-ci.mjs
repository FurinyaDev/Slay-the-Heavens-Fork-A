import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {currentFullQualityJobs,checkoutReceipt,receiptErrors} from './verify-delivery.mjs';
import {readFileSync,mkdtempSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {isDeepStrictEqual} from 'node:util';
import {projectRepositoryMatches} from './repository-identity.mjs';

const validId=value=>Number.isSafeInteger(value)&&value>0;
const passed=run=>run?.status==='completed'&&run.conclusion==='success';
const passedStep=(job,name)=>job.steps?.some(step=>step.name===name&&passed(step));
const validSha=value=>/^[a-f0-9]{40}$/.test(value??'');
export const releaseBranch=value=>/^release\/[\w][\w.-]*$/.test(value??'');
export const formalPublishBranch=value=>/^(?:release|hotfix)\/v(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)$/.test(value??'');
const hotfixBranch=value=>typeof value==='string'&&value.startsWith('hotfix/')&&formalPublishBranch(value);
const frozenBranch=value=>releaseBranch(value)||hotfixBranch(value);

export function publicationTarget(event,repo,hotfix=false) {
 const pr=event?.pull_request,head=pr?.head;
 const matches=hotfix?hotfixBranch(head?.ref)&&projectRepositoryMatches(head.repo,repo)&&projectRepositoryMatches(pr.base?.repo,repo)
  :releaseBranch(head?.ref)&&head.repo?.full_name===repo;
 if(pr?.base?.ref!=='master'||!matches||!validSha(head.sha))
  throw Error(hotfix?'Expected same-repository Hotfix publication PR':'Expected same-repository Release publication PR');
 return {branch:head.ref,head:head.sha};
}
function candidateArtifactId(message,required) {
 const pins=message.split(/\r?\n/).filter(line=>/^\s*GIL-Artifact-ID\b/i.test(line));
 if(!pins.length&&!required)return;
 const id=Number(/^GIL-Artifact-ID: ([1-9]\d*)$/.exec(pins[0])?.[1]);
 if(pins.length!==1||!validId(id))throw Error('Expected one GIL-Artifact-ID: <positive artifact ID> line');
 return id;
}
export async function pages(request,path,key) {
 const rows=[];
 for(let page=1;page<=100;page++) {
  const result=await request(`${path}${path.includes('?')?'&':'?'}per_page=100&page=${page}`);
  const batch=key?result?.[key]:result;
  if(!Array.isArray(batch))throw Error('Missing Release CI '+(key??'list'));
  rows.push(...batch);
  if(batch.length<100)return rows;
 }
 throw Error('Release CI pagination incomplete');
}
export async function assertReleaseHead(repo,branch,head,request) {
 const ref=await request(`/repos/${repo}/git/ref/heads/${branch}`);
 if(ref?.ref!==`refs/heads/${branch}`||ref.object?.type!=='commit'||ref.object.sha!==head)
  throw Error('Release HEAD changed during evidence verification');
}
function trustedDispatch(run,repo,file,branch,head) {
 return validId(run?.id)&&validId(run.run_attempt)&&run.event==='workflow_dispatch'&&
  run.path===`.github/workflows/${file}`&&run.head_branch===branch&&run.head_sha===head&&
  projectRepositoryMatches(run.repository,repo)&&projectRepositoryMatches(run.head_repository,repo);
}
async function latestLicenseRun(repo,branch,request) {
 const path=`/repos/${repo}/actions/workflows/licenses.yml/runs?event=workflow_dispatch&branch=${encodeURIComponent(branch)}`;
 return (await pages(request,path,'workflow_runs')).sort((a,b)=>b.id-a.id)[0];
}
function requireCurrentRun(run,proof,workflow) {
 if(!trustedDispatch(run,proof.repo,workflow,proof.branch,proof.head)||!passed(run)||
  run.id!==proof.runId||run.run_attempt!==proof.attempt)
  throw Error(`Frozen ${workflow} run or attempt changed during publication verification`);
}
export async function verifyReleaseLicenses(repo,branch,head,request) {
 if(!formalPublishBranch(branch)||!validSha(head))throw Error('Expected an exact formal release candidate for Licenses');
 const prefix=`/repos/${repo}`;
 const run=await latestLicenseRun(repo,branch,request);
 if(!trustedDispatch(run,repo,'licenses.yml',branch,head)||!passed(run))
  throw Error('Frozen release requires its latest successful hosted Licenses run');
 const jobs=await pages(request,`${prefix}/actions/runs/${run.id}/jobs?filter=all`,'jobs');
 const inventory=jobs.filter(job=>job.name==='inventory').sort((a,b)=>b.run_attempt-a.run_attempt);
 const active=inventory[0];
 if(!active||!jobs.some(job=>validId(job.id)&&job.run_attempt===run.run_attempt&&job.run_id===run.id&&job.head_sha===head)||
  inventory.some(job=>!validId(job.id)||!validId(job.run_attempt)||job.run_attempt>run.run_attempt||
   job.run_id!==run.id||job.head_sha!==head)||
  new Set(inventory.map(job=>job.run_attempt)).size!==inventory.length||
  new Set(inventory.map(job=>job.id)).size!==inventory.length||!passed(active)||
  !passedStep(active,'Run actions/checkout@11d5960a326750d5838078e36cf38b85af677262')||
  !passedStep(active,'Run node scripts/check-license.mjs'))
  throw Error('Frozen release requires its exact successful Licenses inventory');
 const proof={repo,branch,head,runId:run.id,attempt:run.run_attempt,inventoryJobId:active.id,inventoryAttempt:active.run_attempt};
 requireCurrentRun(await request(`${prefix}/actions/runs/${run.id}`),proof,'licenses.yml');
 requireCurrentRun(await latestLicenseRun(repo,branch,request),proof,'licenses.yml');
 return proof;
}
async function requireQuickPreflight(repo,branch,head,request,runId) {
 if(!validId(runId))throw Error('A successful exact Quick feedback preflight run ID is required before requesting Full');
 const path=`/repos/${repo}/actions/runs/${runId}`;
 const run=await request(path);
 const title=new RegExp(`^Preflight / ${head} / ([a-f0-9]{40})$`);
 const base=title.exec(run?.display_title)?.[1];
 const preflight=candidate=>trustedDispatch(candidate,repo,'quick-feedback.yml',branch,head)&&
  candidate.id===runId&&passed(candidate)&&candidate.display_title===run.display_title;
 if(!base||base===head||!preflight(run))
  throw Error('Exact branch HEAD requires its successful hosted Quick feedback preflight');
 const range=await request(`/repos/${repo}/compare/${base}...${head}?per_page=1`);
 if(range?.base_commit?.sha!==base||range.merge_base_commit?.sha!==base||range.status!=='ahead')
  throw Error('Quick feedback requires a distinct ancestor as its comparison base');
 const jobs=await pages(request,`${path}/attempts/${run.run_attempt}/jobs`,'jobs');
 const active=jobs.filter(job=>job.name==='Complete affected preflight');
 if(active.length!==1||!validId(active[0].id)||active[0].run_id!==runId||
  active[0].run_attempt!==run.run_attempt||active[0].head_sha!==head||!passed(active[0])||
  !['Verify exact PR merge and comparison base','Complete affected JS and Lua preflight','Record exact tested checkout'].every(name=>passedStep(active[0],name)))
  throw Error('Quick feedback preflight did not pass its exact checkout and affected checks');
 const current=await request(path);
 if(!preflight(current)||current.run_attempt!==run.run_attempt)throw Error('Quick feedback attempt changed before requesting Full');
}

export async function latestFullRun(repo,branch,request) {
 const path=`/repos/${repo}/actions/workflows/quality.yml/runs?event=workflow_dispatch&branch=${encodeURIComponent(branch)}`;
 return (await pages(request,path,'workflow_runs')).sort((a,b)=>b.id-a.id)[0];
}
// Reuse the real hosted Full matrix. Fast, PR merge tests and local diagnostics
// cannot attest a frozen Release HEAD. Never select an older successful run.
function loadCheckout(repo,run,jobs) {
 const dir=mkdtempSync(join(tmpdir(),'release-full-'));
 try{return checkoutReceipt(repo,run,jobs,dir);}finally{rmSync(dir,{recursive:true,force:true});}
}
export async function verifyReleaseFull(repo,branch,head,request,readCheckout=loadCheckout) {
 if(!frozenBranch(branch)||!validSha(head))throw Error('Expected release/<name> or hotfix/vX.Y.Z and frozen 40-character HEAD');
 const prefix=`/repos/${repo}`,refPath=`${prefix}/git/ref/heads/${branch}`;
 const checkRef=async()=>{
  const ref=await request(refPath);
  if(ref?.ref!==`refs/heads/${branch}`||ref.object?.type!=='commit'||ref.object.sha!==head)
   throw Error('Release HEAD changed; freeze and run Full again');
 };
 await checkRef();
 const latest=()=>latestFullRun(repo,branch,request);
 const run=await latest();
 if(!Number.isSafeInteger(run?.id)||run.id<1||run.head_sha!==head||run.head_branch!==branch||
  run.event!=='workflow_dispatch'||run.path!=='.github/workflows/quality.yml'||
  !projectRepositoryMatches(run.repository,repo)||run.status!=='completed'||run.conclusion!=='success')
  throw Error('Frozen Release HEAD requires its latest successful hosted Full run');
 const jobs=await pages(request,`${prefix}/actions/runs/${run.id}/jobs?filter=all`,'jobs');
 const ids=new Set(),executions=new Set();
 for(const job of jobs) {
  const key=`${job.name}:${job.run_attempt}`;
  if(!currentFullQualityJobs.includes(job.name)||!Number.isSafeInteger(job.id)||job.id<1||ids.has(job.id)||
   executions.has(key)||job.run_id!==run.id||job.head_sha!==head||!Number.isSafeInteger(job.run_attempt)||
   job.run_attempt<1||job.run_attempt>run.run_attempt)throw Error('Unexpected or mismatched Full job');
  ids.add(job.id);executions.add(key);
 }
 if(!Number.isSafeInteger(run.run_attempt)||run.run_attempt<1||!jobs.some(j=>j.run_attempt===run.run_attempt))throw Error('Missing latest Full attempt');
 for(const name of currentFullQualityJobs) {
  const job=jobs.filter(j=>j.name===name).sort((a,b)=>b.run_attempt-a.run_attempt)[0];
  if(job?.status!=='completed'||job.conclusion!==(name==='fast'?'skipped':'success'))throw Error('Incomplete or unsuccessful Full job: '+name);
 }
 const proof=await readCheckout(repo,run,jobs),checkout=proof?.checkout;
 if(receiptErrors(checkout,proof?.checkoutArtifact,jobs,run,3).length||
  checkout?.tested!==head||checkout.head!==head||checkout.runId!==run.id||
  checkout.event!=='workflow_dispatch'||checkout.prNumber!=null)
  throw Error('Frozen Release Full requires its immutable exact checkout receipt');
 const current=await request(`${prefix}/actions/runs/${run.id}`),last=await latest();
 if(current?.id!==run.id||current.run_attempt!==run.run_attempt||current.status!=='completed'||
  current.conclusion!=='success'||current.head_sha!==head||last?.id!==run.id||last.run_attempt!==run.run_attempt)
  throw Error('Release Full run/attempt changed during verification');
 await checkRef();
 return {schemaVersion:1,kind:'release-full',repo,branch,head,runId:run.id,attempt:run.run_attempt,
  checkoutArtifactId:proof.checkoutArtifact.id,url:run.html_url};
}

export async function freezeReleaseFull(repo,branch,head,request,readCheckout=loadCheckout,beforeDispatch=async()=>{}) {
 if(!frozenBranch(branch)||!validSha(head))throw Error('Expected release/<name> or hotfix/vX.Y.Z and frozen 40-character HEAD');
 const prefix=`/repos/${repo}`,refPath=`${prefix}/git/ref/heads/${branch}`;
 if(!projectRepositoryMatches(await request(prefix),repo))throw Error('Unexpected Release repository identity');
 const checkRef=async()=>{
  const ref=await request(refPath);
  if(ref?.ref!==`refs/heads/${branch}`||ref.object?.type!=='commit'||ref.object.sha!==head)
   throw Error('Freeze HEAD differs from current Release');
 };
 const matching=async()=>{
  const runs=await pages(request,`${prefix}/actions/workflows/quality.yml/runs?event=workflow_dispatch&branch=${encodeURIComponent(branch)}`,'workflow_runs');
  if(runs.some(run=>!Number.isSafeInteger(run?.id)||run.id<1||!validSha(run.head_sha)))
   throw Error('Missing or invalid Release run identity');
  return runs.filter(run=>run.head_sha===head).sort((a,b)=>b.id-a.id)[0];
 };
 const validRun=run=>{
  if(!Number.isSafeInteger(run?.id)||run.id<1||!Number.isSafeInteger(run.run_attempt)||run.run_attempt<1||
   run.head_sha!==head||run.head_branch!==branch||run.event!=='workflow_dispatch'||
   run.path!=='.github/workflows/quality.yml'||!projectRepositoryMatches(run.repository,repo))
   throw Error('Existing frozen Release run identity is invalid');
 };
 const reuse=async selected=>{
  validRun(selected);await checkRef();
  const run=await request(`${prefix}/actions/runs/${selected.id}`);
  validRun(run);
  const latest=await matching();
  if(run.id!==selected.id||run.run_attempt!==selected.run_attempt||latest?.id!==run.id||latest.run_attempt!==run.run_attempt)
   throw Error('Release Full run/attempt changed; inspect the latest run before retrying');
  if(run.status!=='completed') {
   if(!['queued','pending','waiting','requested','in_progress'].includes(run.status)||run.conclusion!=null)
    throw Error('Existing frozen Release run is not a pending Full candidate');
   await checkRef();
   return {state:'waiting',branch,head,runId:run.id,attempt:run.run_attempt,url:`https://github.com/${repo}/actions/runs/${run.id}`};
  }
  if(run.conclusion!=='success')throw Error('Existing frozen Release Full failed or was cancelled; inspect it before requesting another run');
  const proof=await verifyReleaseFull(repo,branch,head,request,readCheckout);
  if(proof.runId!==run.id||proof.attempt!==run.run_attempt)throw Error('Verified Release Full differs from the selected run');
  return {state:'verified',...proof};
 };
 await checkRef();
 const existing=await matching();if(existing)return reuse(existing);
 await beforeDispatch();
 // A second read catches a dispatch registered by another caller. GitHub's
 // existing workflow/ref concurrency handles the remaining cross-client race.
 await checkRef();
 const registered=await matching();if(registered)return reuse(registered);
 await checkRef();
 await request(`${prefix}/actions/workflows/quality.yml/dispatches`,{ref:branch,inputs:{runner_pool:'hosted'}});
 await checkRef();
 return {state:'requested',branch,head};
}

export async function freezeReleaseCandidate(repo,branch,head,request,{
 fastRunId,gilArtifactId,readCheckout,readGil,
}={}) {
 return freezeReleaseFull(repo,branch,head,request,readCheckout,async()=>{
  if(!formalPublishBranch(branch)||!validId(gilArtifactId))
   throw Error('An exact audited GIL artifact ID is required before requesting Full');
  const verifyGil=readGil??(await import('./runtime-baseline/release-performance-artifacts.mjs')).verifyGilArtifact;
  const target={head,branch,version:branch.split('/v')[1]};
  const {binding}=await verifyGil(request,gilArtifactId,target);
  if(binding.schemaVersion!==2||binding.custody!=='gil-build-v2'||binding.id!==gilArtifactId)
   throw Error('Full dispatch requires an audited immutable v2 GIL artifact');
  await requireQuickPreflight(repo,branch,head,request,fastRunId);
 });
}
async function readCandidateTag(repo,branch,head,request,required) {
 const prefix=`/repos/${repo}`;
 if(!projectRepositoryMatches(await request(prefix),repo))throw Error('Unexpected RC tag repository identity');
 const tagPrefix=branch.split('/')[1]+'-rc.';
 const tags=(await pages(request,prefix+'/tags')).filter(tag=>typeof tag?.name==='string'&&
  tag.name.startsWith(tagPrefix)&&/^[1-9]\d*$/.test(tag.name.slice(tagPrefix.length)));
 const rcNumber=tag=>tag.name.slice(tagPrefix.length);
 tags.sort((a,b)=>rcNumber(b).length-rcNumber(a).length||rcNumber(b).localeCompare(rcNumber(a)));
 const latest=tags[0],name=latest?.name;
 if(!name&&!required)return null;
 if(!name||tags[1]?.name===name)throw Error('Expected one latest RC tag');
 const ref=await request(`${prefix}/git/ref/tags/${name}`);
 const objectSha=ref?.object?.sha;
 if(ref?.ref!==`refs/tags/${name}`||ref.object?.type!=='tag'||!validSha(objectSha))
  throw Error('Latest RC tag must be an annotated tag');
 const annotated=await request(`${prefix}/git/tags/${objectSha}`);
 if(annotated?.tag!==name||annotated.sha!==objectSha||annotated.object?.type!=='commit'||typeof annotated.message!=='string')
  throw Error('Annotated RC tag identity differs');
 const gilArtifactId=candidateArtifactId(annotated.message,required);
 if(gilArtifactId===undefined)return null;
 if(latest.commit?.sha!==head||annotated.object.sha!==head)
  throw Error('Latest RC tag does not point at the frozen source');
 return {name,objectSha,gilArtifactId};
}
export async function verifyReleasePublication(repo,branch,head,request,{
 gilArtifactId,requireExplicitGilArtifactId=true,readFull=verifyReleaseFull,readLicenses=verifyReleaseLicenses,readPerformance,
}={}) {
 const full=await readFull(repo,branch,head,request);
 const licenses=await readLicenses(repo,branch,head,request);
 const verifyPerformance=readPerformance??(await import('./runtime-baseline/require-release-performance.mjs')).requireReleasePerformance;
 const performance=await verifyPerformance(full,request);
 const isCurrentFormat=performance.schemaVersion===2;
 if(isCurrentFormat&&requireExplicitGilArtifactId&&!validId(gilArtifactId))
  throw Error('New release evidence requires its exact GIL artifact ID');
 const candidate=await readCandidateTag(repo,branch,head,request,isCurrentFormat);
 if(candidate&&!isCurrentFormat)throw Error('Latest RC requires v2 formal evidence');
 if((gilArtifactId!==undefined&&performance.gil?.id!==gilArtifactId)||
  (candidate&&performance.gil?.id!==candidate.gilArtifactId))
  throw Error('Formal release performance belongs to a different GIL artifact');
 const [currentFull,currentLicenses]=await Promise.all([
  latestFullRun(repo,branch,request),latestLicenseRun(repo,branch,request),
 ]);
 requireCurrentRun(currentFull,full,'quality.yml');
 requireCurrentRun(currentLicenses,licenses,'licenses.yml');
 const latest=await readCandidateTag(repo,branch,head,request,isCurrentFormat);
 if(!isDeepStrictEqual(latest,candidate))throw Error('Latest RC tag changed during verification');
 await assertReleaseHead(repo,branch,head,request);
 return {...full,licenses,performance,...(candidate?{candidate}: {})};
}

export async function githubRequest(path,body) {
 const response=await fetch(`https://api.github.com${path}`,{
  method:body?'POST':'GET',headers:{Accept:'application/vnd.github+json',
   Authorization:`Bearer ${process.env.GH_TOKEN||process.env.GITHUB_TOKEN}`},
  ...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(20000)});
 if(!response.ok)throw Error(`Release CI API failed: HTTP ${response.status}`);
 return response.status===204?null:response.json();
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href) {
 try {
  let [command,branch,head,firstId,secondId,...extra]=process.argv.slice(2);
  const repo='FurinyaWorks/Slay-the-Heavens';
  const validCliId=id=>id===undefined||/^[1-9][0-9]*$/.test(id)&&validId(Number(id));
  const pullRequest=command==='verify-pr'||command==='verify-hotfix-pr';
  if(pullRequest) {
   if(branch!==undefined)throw Error('Publication PR verifies its event source and the latest annotated RC tag');
   const event=JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH,'utf8'));
   ({branch,head}=publicationTarget(event,repo,command==='verify-hotfix-pr'));
   command='verify';
  }
  if(!['freeze','verify'].includes(command)||!frozenBranch(branch)||!validSha(head)||extra.length||
   (command==='verify'&&secondId!==undefined)||(command==='freeze'&&((firstId===undefined)!==(secondId===undefined)))||
   ![firstId,secondId].every(validCliId))
   throw Error('Usage: release-ci.mjs freeze <branch> <HEAD> [<fast-run-id> <gil-artifact-id>] or verify <branch> <HEAD> [<gil-artifact-id>]');
  if(command==='freeze') {
   console.log(JSON.stringify(await freezeReleaseCandidate(repo,branch,head,githubRequest,
    {fastRunId:Number(firstId),gilArtifactId:Number(secondId)})));
  } else {
   const gilArtifactId=firstId===undefined?undefined:Number(firstId);
   const proof=await verifyReleasePublication(repo,branch,head,githubRequest,{gilArtifactId,requireExplicitGilArtifactId:!pullRequest});
   console.log(JSON.stringify(proof,null,2));
  }
 } catch(error) {console.error(error.message);process.exitCode=1;}
}
