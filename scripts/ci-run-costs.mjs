// Offline analysis of unmodified GitHub REST run/job responses. Not billing data.
import {readFileSync,readdirSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {gunzipSync} from 'node:zlib';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

const seconds=(from,to)=>{
  const a=Date.parse(from),b=Date.parse(to);
  return Number.isFinite(a)&&Number.isFinite(b)&&b>=a?(b-a)/1000:null;
};
const actual=job=>Number.isSafeInteger(job.runner_id)&&job.runner_id>0
  && job.steps?.some(step=>step.name==='Set up job');
const latest=values=>values.filter(Boolean).sort().at(-1)??null;
function validateJobs(run,response) {
  if(!Array.isArray(response.jobs)||response.total_count!==response.jobs.length)throw Error('Incomplete jobs response');
  const ids=new Set();
  for(const job of response.jobs) {
    if(!Number.isSafeInteger(job.id)||job.id<=0)throw Error('Invalid job identity');
    if(ids.has(job.id))throw Error('Duplicate job');
    ids.add(job.id);
    if(job.run_id!==run.id||job.run_attempt!==run.run_attempt||job.head_sha!==run.head_sha)throw Error('Job/run identity mismatch');
  }
}
export function runCost(run,response,{inventoryRun,inventoryJobs}={}) {
  validateJobs(run,response);
  const jobs=response.jobs.map(job=>({id:job.id,name:job.name,status:job.status,conclusion:job.conclusion,
    createdAt:job.created_at??null,startedAt:job.started_at??null,completedAt:job.completed_at??null,
    runnerId:job.runner_id,runnerName:job.runner_name,executed:actual(job),
    queueSeconds:actual(job)?seconds(job.created_at,job.started_at):null,
    executionSeconds:actual(job)?seconds(job.started_at,job.completed_at):null,
    steps:(job.steps??[]).map(step=>({name:step.name,conclusion:step.conclusion,
      seconds:step.conclusion==='skipped'?0:seconds(step.started_at,step.completed_at)}))}));
  const fast=jobs.filter(job=>/^fast \([^)]+\)$/.test(job.name)&&job.executed);
  const full=jobs.filter(job=>/^rules \(\d+\/\d+\)$/.test(job.name)&&job.executed);
  const mode=fast.length?'fast':full.length?'full':'unresolved';
  const required=['check','engineering-posix','presentation'];
  const gates=required.map(name=>jobs.find(job=>job.name===name));
  const qualitySuccess=run.conclusion==='success'&&gates.every(job=>job?.conclusion==='success'
    &&seconds(run.created_at,response.jobs.find(raw=>raw.id===job.id)?.completed_at)!==null);
  const qualityEnd=qualitySuccess?latest(required.map(name=>response.jobs.find(job=>job.name===name)?.completed_at)):null;
  const inventory=Array.isArray(inventoryJobs?.jobs)&&inventoryJobs.total_count===inventoryJobs.jobs.length
    ?inventoryJobs.jobs.find(job=>job.name==='inventory'):undefined;
  const inventoryMatches=inventoryRun?.head_sha===run.head_sha&&inventoryRun?.event===run.event
    &&inventoryRun?.head_branch===run.head_branch&&inventory?.run_id===inventoryRun?.id
    &&inventory?.run_attempt===inventoryRun?.run_attempt&&inventory?.head_sha===run.head_sha;
  const requiredEnd=qualityEnd&&inventoryMatches&&inventoryRun.conclusion==='success'&&inventory.conclusion==='success'
    &&seconds(run.created_at,inventory.completed_at)!==null
    ?latest([qualityEnd,inventory.completed_at]):null;
  const completed=jobs.filter(job=>job.executionSeconds!==null);
  const pullRequests=(run.pull_requests??[]).map(pr=>pr.number);
  const platforms=Object.fromEntries(['windows','posix','other'].map(platform=>{
    const group=jobs.filter(job=>job.executed&&(platform==='windows'?/^(rules \(|fast \(windows)/.test(job.name)
      :platform==='posix'?/^(engineering-posix \(|fast \(ubuntu)/.test(job.name)
      :!/^(rules \(|engineering-posix \(|fast \((?:windows|ubuntu))/.test(job.name)));
    return [platform,{jobs:group.length,knownExecutionRunnerMinutes:group.reduce((n,j)=>n+(j.executionSeconds??0),0)/60,
      unknownExecutionJobs:group.filter(j=>j.executionSeconds===null).map(j=>j.id),
      knownQueueSecondsSum:group.reduce((n,j)=>n+(j.queueSeconds??0),0),
      unknownQueueJobs:group.filter(j=>j.queueSeconds===null).map(j=>j.id)}];
  }));
  return {id:run.id,attempt:run.run_attempt,sha:run.head_sha,event:run.event,branch:run.head_branch,pullRequests,platforms,
    status:run.status,conclusion:run.conclusion,createdAt:run.created_at,mode,
    qualitySuccess,qualityWallSeconds:seconds(run.created_at,qualityEnd),
    inventoryRunId:inventoryMatches?inventoryRun.id:null,
    requiredWallSeconds:seconds(run.created_at,requiredEnd),
    runWallSeconds:run.status==='completed'?seconds(run.created_at,run.updated_at):null,
    knownJobQueueSecondsSum:jobs.reduce((n,job)=>n+(job.queueSeconds??0),0),
    completedExecutionRunnerMinutes:completed.reduce((n,job)=>n+job.executionSeconds,0)/60,
    executionStillOpen:jobs.filter(job=>job.executed&&job.executionSeconds===null).map(job=>job.id),
    queueUnknown:jobs.filter(job=>job.executed&&job.queueSeconds===null).map(job=>job.id),
    fastPrEligible:run.event==='pull_request'&&run.run_attempt===1&&pullRequests.length===1&&requiredEnd!==null&&fast.length===2
      &&fast.some(job=>job.name==='fast (windows-2025)')&&fast.some(job=>job.name==='fast (ubuntu-24.04)')
      &&fast.every(job=>job.conclusion==='success')&&full.length===0,
    jobs};
}
export function summarizeCosts(runs) {
  const percentile=(values,p)=>values.length?[...values].sort((a,b)=>a-b)[Math.ceil(values.length*p)-1]:null;
  const fast=runs.filter(run=>run.fastPrEligible),distinct=new Set(fast.map(run=>`${run.pullRequests[0]}:${run.sha}`));
  if(distinct.size!==fast.length)throw Error('Duplicate run sample');
  const values=fast.map(run=>run.requiredWallSeconds);
  return {runs:runs.length,naturalFastPrSamples:fast.length,fastTargetSampleCount:20,
    fastSampleSufficient:fast.length>=20,fastP50Seconds:percentile(values,.5),fastP90Seconds:percentile(values,.9),
    successfulFullRuns:runs.filter(run=>run.mode==='full'&&run.qualitySuccess).length,
    cancelledRuns:runs.filter(run=>run.conclusion==='cancelled').length,
    cancelledCompletedExecutionRunnerMinutes:runs.filter(run=>run.conclusion==='cancelled')
      .reduce((n,run)=>n+run.completedExecutionRunnerMinutes,0),
    limitations:['Required wall remains unknown unless separate inventory run matches SHA, event, branch and attempt job identity',
      'Elapsed runner-minutes are not billed minutes or platform multipliers',
      'Job queue sum overlaps across jobs and must not be added to wall time',
      'No open job time inferred; no cancelled matrix placeholder counted as execution',
      'Compare workflow/selector identities before treating samples as one performance cohort'],runs};
}
export function analyzeDirectory(directory) {
  const pages=readdirSync(directory).filter(name=>/^quality-runs-\d+\.json$/.test(name));
  const runs=pages.flatMap(name=>JSON.parse(readFileSync(join(directory,name))).workflow_runs);
  const seen=new Set(),costs=[];
  const inventoryRuns=readdirSync(directory).filter(name=>/^licenses-runs-\d+\.json$/.test(name))
    .flatMap(name=>JSON.parse(readFileSync(join(directory,name))).workflow_runs);
  for(const run of runs) {
    if(seen.has(run.id))throw Error('Duplicate run in collected pages');seen.add(run.id);
    const file=join(directory,`jobs-${run.id}.json`);
    let source;try{source=readFileSync(file);}catch(error){if(error.code==='ENOENT')continue;throw error;}
    const matches=inventoryRuns.filter(other=>other.head_sha===run.head_sha&&other.event===run.event&&other.head_branch===run.head_branch);
    const inventoryRun=matches.length===1?matches[0]:undefined;
    const inventoryFile=inventoryRun?join(directory,`license-jobs-${inventoryRun.id}.json`):null;
    let inventoryJobs;
    if(inventoryFile)try{inventoryJobs=JSON.parse(readFileSync(inventoryFile));}catch(error){if(error.code!=='ENOENT')throw error;}
    costs.push(runCost(run,JSON.parse(source),{inventoryRun,inventoryJobs}));
  }
  const inventoryCosts=[];
  for(const run of inventoryRuns) {
    const file=join(directory,`license-jobs-${run.id}.json`);
    let source;try{source=readFileSync(file);}catch(error){if(error.code==='ENOENT')continue;throw error;}
    inventoryCosts.push(runCost(run,JSON.parse(source)));
  }
  return {...summarizeCosts(costs),listedRuns:runs.length,uncollectedRuns:runs.length-costs.length,inventoryCosts};
}

const testSteps=new Set(['JavaScript regression shard','POSIX JavaScript regression shard','Lua regression shard']);
const aggregationSteps=new Set(['Require every regression shard','Require every POSIX regression shard']);
const mediaSteps=new Set(['Materialize reviewed PNGs for this shard','Restore exact existing media for the license audit','Restore exact existing media for presentation']);
const archiveSource=/^(?:(?:combined linked owner missing|Colorless catalog linked owner missing): [\w./-]+: )*(?:combined linked owner identity|fresh current production owner|fresh complete StS CI source|fresh StS helper source|fresh complete native fixture source|exact live retirement owner|reviewed compendium owner|reviewed GameUI extraction retirement module|fresh StS deck browser source|potion linked owner identity|delivery linked source identity|unreviewed integrated retirement source drift): ((?:src|scripts|tests|config|docs)\/[\w./-]+)/;

function caseSignal(line) {
  const error=line.trimStart().replace(/^(?:AssertionError \[ERR_ASSERTION\]|Error):\s*/,'');
  const source=archiveSource.exec(error);
  if(source)return ['historical-source-identity',source[1]];
  if(/^(?:.*?\.lua:\d+: )?unknown_encounter$/.test(error))return ['fixture-input','unknown_encounter'];
  const module=/^Missing Lua module ([\w]+); run npm run build:\w+ first\.$/.exec(error);
  if(module)return ['fixture-input',module[1]];
  if(/^(?:Historical .+|Lua runner failed \(.+\))(?:: .*)?\bETIMEDOUT\b/.test(error))return ['fixture-timeout','ETIMEDOUT'];
  return null;
}

function observedFailures(log,{standaloneLua=false}={}) {
  const cases=[];
  let location, current, mediaRestoreFailed=false;
  const luaFailures=new Map(),luaTimings=new Map();
  for(const raw of log.split(/\r?\n/)) {
    const line=raw.replace(/^\d{4}-\d{2}-\d{2}T\S+Z /,'').replace(/\x1b\[[0-9;]*m/g,'');
    if(/^(?:(?:Runtime preview|Reviewed PNG) LFS materialization failed \(exit (?:\d+|timeout\/start-error)\); no verified PNG result|Exact existing media LFS materialization failed; no verified media result)$/.test(line))mediaRestoreFailed=true;
    if(standaloneLua) {
      const luaTiming=/^Lua fixture (tests[/\\]lua[/\\][\w./\\-]+\.lua): (\d+) ms$/.exec(line);
      if(luaTiming)luaTimings.set(luaTiming[1].replaceAll('\\','/'),Number(luaTiming[2]));
      const luaFailure=/^Lua (?:worker failed|runner failed) \((tests[/\\]lua[/\\][\w./\\-]+\.lua), /.exec(line);
      if(luaFailure) {
        const path=luaFailure[1].replaceAll('\\','/');
        const signal=caseSignal(line)??luaFailures.get(path);
        luaFailures.set(path,signal);
      }
    }
    const file=/^test at ((?:tests|scripts)[/\\][^:\r\n]+):(\d+):(\d+)$/.exec(line);
    if(file) {
      location={path:file[1].replaceAll('\\','/'),line:Number(file[2]),column:Number(file[3])};
      current=null;
      continue;
    }
    if(location) {
      const title=/^✖ (.+) \((\d+(?:\.\d+)?)ms\)$/.exec(line);
      if(title) {
        current={...location,name:title[1],durationMs:Number(title[2]),signal:'unclassified',subject:null};
        cases.push(current);
      }
      location=null;
      continue;
    }
    if(!line.trim()||!/^\s/.test(line))current=null;
    if(current?.signal==='unclassified') {
      const signal=caseSignal(line);
      if(signal)[current.signal,current.subject]=signal;
    }
  }
  for(const [path,signal] of luaFailures)cases.push({path,line:null,column:null,name:path,durationMs:luaTimings.get(path)??null,
    signal:signal?.[0]??'unclassified',subject:signal?.[1]??null});
  return {cases,mediaRestoreFailed};
}

function jobFailureKind(job,failedSteps,observation) {
  if(['cancelled','skipped','neutral','stale'].includes(job.conclusion)||job.status!=='completed')return 'unevaluated';
  if(observation.cases.length)return 'test-failure';
  if(failedSteps.some(step=>aggregationSteps.has(step)))return 'aggregation';
  if(failedSteps.some(step=>mediaSteps.has(step))&&observation.mediaRestoreFailed)return 'infrastructure';
  if(failedSteps.some(step=>testSteps.has(step)))return 'test-step-without-case-evidence';
  return 'unclassified';
}

export function triageRun(run,response,{readJobLog=()=>null}={}) {
  if(!Number.isSafeInteger(run.id)||run.id<=0||!Number.isSafeInteger(run.run_attempt)||run.run_attempt<=0
    ||!/^[a-f0-9]{40}$/i.test(run.head_sha))throw Error('Invalid run identity');
  validateJobs(run,response);
  const failures=[],groups=new Map();
  for(const job of response.jobs) {
    if(job.conclusion==='success')continue;
    const failedSteps=(job.steps??[]).filter(step=>step.conclusion==='failure').map(step=>step.name);
    const log=readJobLog(job.id);
    const observation=observedFailures(log??'',{standaloneLua:failedSteps.includes('Lua regression shard')});
    const kind=jobFailureKind(job,failedSteps,observation);
    failures.push({jobId:job.id,name:job.name,status:job.status,conclusion:job.conclusion,kind,failedSteps,
      logAvailable:log!==null,executed:actual(job),queueSeconds:actual(job)?seconds(job.created_at,job.started_at):null,
      executionSeconds:actual(job)?seconds(job.started_at,job.completed_at):null,cases:observation.cases});
    for(const failure of observation.cases) {
      const key=JSON.stringify([failure.signal,failure.subject??failure.path]);
      const group=groups.get(key)??{signal:failure.signal,subject:failure.subject??failure.path,count:0,jobIds:new Set()};
      group.count++;
      group.jobIds.add(job.id);
      groups.set(key,group);
    }
  }
  const countByKind={};
  for(const failure of failures)countByKind[failure.kind]=(countByKind[failure.kind]??0)+1;
  return {schemaVersion:1,runId:run.id,attempt:run.run_attempt,headSha:run.head_sha,status:run.status,conclusion:run.conclusion,
    repositoryId:run.repository?.id??null,workflowId:run.workflow_id??null,event:run.event??null,branch:run.head_branch??null,
    runWallSeconds:run.status==='completed'?seconds(run.created_at,run.updated_at):null,
    successfulJobs:response.jobs.length-failures.length,countByKind,
    caseGroups:[...groups.values()].map(group=>({...group,jobIds:[...group.jobIds]})),failures};
}

function triageCli(args) {
  if(![2,4].includes(args.length)||(args.length===4&&args[2]!=='--logs'))
    throw Error('Usage: ci-run-costs.mjs --triage <run.json> <jobs.json> [--logs <directory>]');
  const [run,jobs]=args.slice(0,2).map(path=>JSON.parse(readFileSync(path,'utf8')));
  const readJobLog=id=>{
    if(args.length===2)return null;
    try{return readFileSync(join(args[3],`${id}.log`),'utf8');}
    catch(error){if(error.code==='ENOENT')return null;throw error;}
  };
  console.log(JSON.stringify(triageRun(run,jobs,{readJobLog}),null,2));
}

const ms = value => Date.parse(value);
const key = r => JSON.stringify([r.repository?.id??r.repository_id??null,r.workflow_id,r.head_sha,r.event,r.head_branch]);
const percentile = (values,p) => values.length ? [...values].sort((a,b)=>a-b)[Math.ceil(values.length*p)-1] : null;
export function summarize({runs,jobs={},prs=[],evidence={}}) {
  // Latest API snapshots may occur on several pages after a concurrent rerun.
  const unique=[...new Map(runs.map(r=>[r.id,r])).values()].sort((a,b)=>ms(a.created_at)-ms(b.created_at)||a.id-b.id);
  const seen=new Set(), first=new Map(), reusable=new Map(), across=new Map(), conclusions={};
  let sameIdentityExtraRuns=0,provenReusableExtraRuns=0,crossRepositoryReusableExtraRuns=0,reuseIdentityMissing=0,runnerSeconds=0,jobCoverageRuns=0,jobsWithoutCompletedTiming=0;
  const countedJobs=new Set();
  for(const r of unique) {
    conclusions[r.conclusion??r.status??'unknown']=(conclusions[r.conclusion??r.status??'unknown']??0)+1;
    const identity=key(r);
    if(seen.has(identity))sameIdentityExtraRuns++;
    seen.add(identity);
    const firstKey=JSON.stringify([r.repository?.id??null,r.workflow_id,r.head_sha,r.event]);
    if(!first.has(firstKey))first.set(firstKey,r);
    const e=evidence[r.id];
    // Missing comparison/config/scope is unknown, never a claimed saving.
    if(e?.tested && e.base && e.configDigest && e.scope && e.platforms?.length) {
      const reuseKey=JSON.stringify([identity,e.tested,e.base,e.configDigest,e.scope,[...e.platforms].sort()]);
      if(r.conclusion==='success'&&reusable.has(reuseKey)&&reusable.get(reuseKey)<=ms(r.created_at))provenReusableExtraRuns++;
      if(r.conclusion==='success'&&r.status!=='in_progress'&&Number.isFinite(ms(r.updated_at)))reusable.set(reuseKey,ms(r.updated_at));
      else reusable.delete(reuseKey);
      if(r.event==='workflow_dispatch') { // diagnostic overlap only; integration remains mandatory
        const crossKey=JSON.stringify([e.tested,e.base,e.configDigest,e.scope,[...e.platforms].sort()]), repo=r.repository?.id??r.repository_id;
        const previous=across.get(crossKey);
        if(repo&&r.conclusion==='success'&&previous?.repo!==repo&&previous?.finished<=ms(r.created_at))crossRepositoryReusableExtraRuns++;
        if(repo&&r.conclusion==='success')across.set(crossKey,{repo,finished:ms(r.updated_at)});
        else across.delete(crossKey);
      }
    } else reuseIdentityMissing++;
    if(Object.hasOwn(jobs,r.id)) {
      jobCoverageRuns++;
      for(const j of jobs[r.id]) {
        if(countedJobs.has(j.id)||j.conclusion==='skipped')continue;
        countedJobs.add(j.id);
        if(Object.hasOwn(j,'runner_id')&&!j.runner_id)continue; // queued/cancelled before allocation
        if(!Object.hasOwn(j,'runner_id')){jobsWithoutCompletedTiming++;continue;}
        const seconds=(ms(j.completed_at)-ms(j.started_at))/1000;
        if(Number.isFinite(seconds)&&seconds>=0)runnerSeconds+=seconds;
        else jobsWithoutCompletedTiming++;
      }
    }
  }
  const eligible=[...first.values()].filter(r=>['success','failure','timed_out','action_required'].includes(r.conclusion)&&r.run_attempt===1);
  const successful=eligible.filter(r=>r.conclusion==='success').length;
  const lead=prs.filter(p=>p.merged_at).map(p=>(ms(p.merged_at)-ms(p.created_at))/60000).filter(n=>Number.isFinite(n)&&n>=0);
  return {runs:unique.length,conclusions,sameIdentityExtraRuns,sameIdentityExtraRate:unique.length?sameIdentityExtraRuns/unique.length:null,
    provenReusableExtraRuns,crossRepositoryReusableExtraRuns,provenReusableExtraRate:unique.length>reuseIdentityMissing?provenReusableExtraRuns/(unique.length-reuseIdentityMissing):null,reuseIdentityMissing,
    runnerMinutes:jobCoverageRuns?runnerSeconds/60:null,jobCoverageRuns,jobsWithoutCompletedTiming,runnerMinutesComplete:jobCoverageRuns===unique.length&&jobsWithoutCompletedTiming===0,
    firstPass:{eligibleCommits:eligible.length,successfulCommits:successful,rate:eligible.length?successful/eligible.length:null,
      excludedFirstRuns:first.size-eligible.length},
    mergeLeadMinutes:{count:lead.length,median:percentile(lead,0.5),p90:percentile(lead,0.9)}};
}

function api(path) {
  return execFileSync('gh',['api','--paginate',path,'--jq','@json'],{encoding:'utf8',maxBuffer:128*1024*1024}).trim().split('\n').filter(Boolean).map(line=>JSON.parse(line));
}
export function collect({repo,since,until,includeJobs=false,includePrs=false}) {
  if(!/^[\w.-]+\/[\w.-]+$/.test(repo)||!/^\d{4}-\d{2}-\d{2}$/.test(since)||!/^\d{4}-\d{2}-\d{2}$/.test(until))throw Error('Expected --repo owner/name --since YYYY-MM-DD --until YYYY-MM-DD');
  const workflows=api(`repos/${repo}/actions/workflows?per_page=100`).flatMap(p=>p.workflows);
  const runs=[];
  for(const w of workflows.filter(w=>['Quality','Quick feedback'].includes(w.name))) {
    const pages=api(`repos/${repo}/actions/workflows/${w.id}/runs?created=${since}T00:00:00Z..${until}T23:59:59Z&per_page=100`);
    const items=pages.flatMap(p=>p.workflow_runs).map(r=>({...r,name:w.name}));
    if(pages[0]?.total_count>items.length)throw Error(`GitHub run search truncated ${w.name}; use a shorter date interval`);
    runs.push(...items);
  }
  const jobs={};
  if(includeJobs)for(const r of runs)jobs[r.id]=api(`repos/${repo}/actions/runs/${r.id}/jobs?filter=all&per_page=100`).flatMap(p=>p.jobs);
  // Closed endpoint includes unmerged PRs; filter by merged date, not update date.
  const prs=includePrs?api(`repos/${repo}/pulls?state=closed&per_page=100`).flat().filter(p=>p.merged_at&&p.merged_at>=`${since}T00:00:00Z`&&p.merged_at<=`${until}T23:59:59Z`):[];
  return {repo,since,until,collectedAt:new Date().toISOString(),runs,jobs,prs};
}
function governanceCli() {
  const args=process.argv.slice(2),value=flag=>args[args.indexOf(flag)+1];
  const input=args.includes('--input')?JSON.parse(value('--input').endsWith('.gz')?gunzipSync(readFileSync(value('--input'))).toString('utf8'):readFileSync(value('--input'),'utf8')):collect({repo:value('--repo'),since:value('--since'),until:value('--until'),includeJobs:args.includes('--jobs'),includePrs:args.includes('--prs')});
  const report={schemaVersion:1,repo:input.repo,since:input.since,until:input.until,collectedAt:input.collectedAt,metrics:summarize(input),
    byWorkflow:Object.fromEntries([...new Set(input.runs.map(r=>r.name))].map(name=>[name,summarize({...input,runs:input.runs.filter(r=>r.name===name)})])),
    byWorkflowEvent:Object.fromEntries([...new Set(input.runs.map(r=>`${r.name}/${r.event}`))].map(name=>[name,summarize({...input,runs:input.runs.filter(r=>`${r.name}/${r.event}`===name)})]))};
  if(args.includes('--raw-output'))writeFileSync(value('--raw-output'),JSON.stringify(input,null,2)+'\n');
  if(args.includes('--output'))writeFileSync(value('--output'),JSON.stringify(report,null,2)+'\n');
  else console.log(JSON.stringify(report,null,2));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href) {
  try {
    if(process.argv[2]==='--triage')triageCli(process.argv.slice(3));
    else if(process.argv[2]?.startsWith('--'))governanceCli();
    else {
      if(process.argv.length!==4)throw Error('Usage: ci-run-costs.mjs <raw-directory> <output.json>');
      writeFileSync(process.argv[3],JSON.stringify(analyzeDirectory(process.argv[2]),null,2)+'\n');
    }
  }catch(error){console.error(error.message);process.exitCode=1;}
}
