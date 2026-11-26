import test from 'node:test';
import assert from 'node:assert/strict';
import {runCost,summarizeCosts,triageRun} from '../scripts/ci-run-costs.mjs';
const run={id:1,run_attempt:1,head_sha:'a'.repeat(40),pull_requests:[{number:42}],event:'pull_request',status:'completed',conclusion:'success',created_at:'2026-11-03T00:00:00Z',updated_at:'2026-11-03T00:10:00Z'};
const job=(id,name,extra={})=>({id,name,run_id:1,run_attempt:1,head_sha:run.head_sha,runner_id:id,runner_name:'GitHub Actions',status:'completed',conclusion:'success',created_at:'2026-11-03T00:00:00Z',started_at:'2026-11-03T00:01:00Z',completed_at:'2026-11-03T00:02:00Z',steps:[{name:'Set up job',conclusion:'success'}],...extra});
const jobs=()=>[job(1,'check'),job(2,'engineering-posix'),job(3,'presentation'),job(4,'fast (ubuntu-24.04)'),job(5,'fast (windows-2025)')];
const response=list=>({total_count:list.length,jobs:list});
const inventory={inventoryRun:run,inventoryJobs:response([job(7,'inventory')])};
test('natural Fast requires actual two-platform Quality execution, not cancelled placeholders or advisory',()=>{
  assert.equal(runCost(run,response(jobs()),inventory).fastPrEligible,true);
  assert.equal(runCost(run,response(jobs())).fastPrEligible,false);
  assert.equal(runCost(run,response(jobs()),{inventoryRun:{...run,head_sha:'b'.repeat(40)},inventoryJobs:inventory.inventoryJobs}).requiredWallSeconds,null);
  assert.equal(runCost(run,response(jobs()),{inventoryRun:run,inventoryJobs:response([job(7,'inventory',{completed_at:null})])}).requiredWallSeconds,null);
  const duplicatePlatform=jobs();duplicatePlatform[4].name='fast (ubuntu-24.04)';assert.equal(runCost(run,response(duplicatePlatform),inventory).fastPrEligible,false);
  assert.equal(runCost(run,response(jobs()),{inventoryRun:run,inventoryJobs:{...inventory.inventoryJobs,total_count:2}}).requiredWallSeconds,null);
  for(const name of ['fast','Quick feedback (windows-2025)','advisory']) {
    const r=runCost({...run,conclusion:'cancelled'},response([job(1,name,{runner_id:0,conclusion:'cancelled',steps:[]})]));
    assert.equal(r.fastPrEligible,false);assert.equal(r.mode,'unresolved');assert.equal(r.completedExecutionRunnerMinutes,0);
  }
  assert.equal(runCost({...run,event:'workflow_dispatch'},response(jobs())).fastPrEligible,false);
  assert.equal(runCost({...run,pull_requests:[]},response(jobs())).fastPrEligible,false);
});
test('queue, wall, actual execution and unfinished/cancelled costs stay separate',()=>{
  const r=runCost(run,response(jobs()));assert.equal(r.qualityWallSeconds,120);
  assert.equal(r.knownJobQueueSecondsSum,300);assert.equal(r.completedExecutionRunnerMinutes,5);
  const open=runCost({...run,status:'in_progress',conclusion:null},response([job(1,'rules (1/13)',{completed_at:null,status:'in_progress',conclusion:null})]));
  assert.deepEqual(open.executionStillOpen,[1]);assert.equal(open.completedExecutionRunnerMinutes,0);assert.equal(open.runWallSeconds,null);
  assert.deepEqual(open.platforms.windows.unknownExecutionJobs,[1]);assert.equal(open.platforms.windows.knownExecutionRunnerMinutes,0);
});
test('missing, failed, skipped or cancelled gates never become successful Fast measurements',()=>{
  for(const conclusion of ['failure','skipped','cancelled',null]) {
    const list=jobs();list[0].conclusion=conclusion;assert.equal(runCost(run,response(list)).fastPrEligible,false);
  }
  assert.equal(runCost(run,response(jobs().slice(1))).qualityWallSeconds,null);
  const list=jobs();list[0].completed_at=null;assert.equal(runCost(run,response(list)).qualityWallSeconds,null);
});
test('incomplete pages and wrong attempt/SHA/job identities reject rather than manufacture samples',()=>{
  assert.throws(()=>runCost(run,{total_count:6,jobs:jobs()}),/Incomplete/);
  for(const extra of [{run_id:2},{run_attempt:2},{head_sha:'b'.repeat(40)}])assert.throws(()=>runCost(run,response([job(1,'check',extra)])),/identity/);
  assert.throws(()=>runCost(run,response([job(1,'check'),job(1,'presentation')])),/Duplicate/);
});
test('insufficient natural samples remain insufficient; nearest rank is reported only from eligible runs',()=>{
  const r=runCost(run,response(jobs()),inventory),s=summarizeCosts([r]);assert.equal(s.naturalFastPrSamples,1);assert.equal(s.fastSampleSufficient,false);assert.equal(s.fastP90Seconds,120);
  assert.equal(summarizeCosts([]).fastP50Seconds,null);assert.throws(()=>summarizeCosts([r,r]),/Duplicate/);
  const cancelled={...r,id:2,conclusion:'cancelled',fastPrEligible:false};assert.equal(summarizeCosts([cancelled]).cancelledCompletedExecutionRunnerMinutes,5);
  const synthetic=Array.from({length:20},(_,i)=>({...r,id:i+1,sha:i.toString(16).padStart(40,'0'),requiredWallSeconds:(i+1)*10}));
  const ranked=summarizeCosts(synthetic);assert.equal(ranked.fastSampleSufficient,true);assert.equal(ranked.fastP50Seconds,100);assert.equal(ranked.fastP90Seconds,180);
});

test('offline triage retains unexecuted jobs and separates setup, aggregation and test evidence',()=>{
  const failed=(id,name,...steps)=>job(id,name,{conclusion:'failure',steps:[{name:'Set up job',conclusion:'success'},
    ...steps.map(name=>({name,conclusion:'failure'}))]});
  const list=[failed(1,'engineering-posix (1/15)','Materialize reviewed PNGs for this shard'),
    failed(2,'check','Require every regression shard'),
    failed(3,'rules (2/18)','JavaScript regression shard'),
    failed(4,'rules (3/18)','JavaScript regression shard'),
    failed(5,'rules (4/18)','Check hosted checkout Git pack payload'),
    job(6,'fast',{runner_id:0,conclusion:'skipped',steps:[]}),job(7,'presentation'),
    job(8,'rules (5/18)',{runner_id:0,conclusion:'cancelled',steps:[]})];
  const stamp='2026-11-03T00:01:00.1234567Z ';
  const logs={1:'Runtime preview LFS materialization failed (exit 2); no verified PNG result',3:[
    '✖ common case omitted from the detailed failure section (5ms)',
    '✖ failing tests:',
    'test at tests\\existing.test.mjs:35:2',
    '✖ points to frozen source (10.25ms)',
    '  AssertionError [ERR_ASSERTION]: combined linked owner identity: config/architecture.json during entrance validation',
    '',
    'test at tests/existing.test.mjs:35:2',
    '✖ a separate unknown failure (21ms)',
    '  AssertionError [ERR_ASSERTION]: expected 10, got 9',
    '',
    'test at tests/fixed-replay.test.mjs:22:1',
    '✖ runtime fixture timed out (31000ms)',
    '  Error: Historical StS replay failed within the original total deadline: spawnSync /usr/bin/node ETIMEDOUT',
    '',
    'test at tests/native-ui-preview.test.mjs:9:1',
    '✖ missing generated dependency (123.35ms)',
    '  Error: Missing Lua module abyss_monster_art_data; run npm run build:data first.',
    '',
    'test at tests/native-ui-preview.test.mjs:10:1',
    '✖ production fixture initialization (100ms)',
    '  experiments/native-ui-preview/battle/semantic.lua:26: unknown_encounter',
    '',
    'test at tests/game-ui.test.mjs:10:1',
    '✖ generic timeout still needs diagnosis (60000ms)',
    '  Error: ETIMEDOUT',
  ].map(line=>stamp+line).join('\r\n')};
  const r=triageRun({...run,conclusion:'failure'},response(list),{readJobLog:id=>logs[id]??null});
  assert.deepEqual(r.countByKind,{infrastructure:1,aggregation:1,'test-failure':1,'test-step-without-case-evidence':1,unclassified:1,unevaluated:2});
  assert.equal(r.successfulJobs,1);
  assert.equal(r.runWallSeconds,600);
  assert.equal(r.failures[2].cases.length,6);
  assert.deepEqual(r.failures[2].cases[0],{path:'tests/existing.test.mjs',line:35,column:2,name:'points to frozen source',durationMs:10.25,
    signal:'historical-source-identity',subject:'config/architecture.json'});
  assert.deepEqual(r.failures[2].cases.map(c=>c.signal),['historical-source-identity','unclassified','fixture-timeout','fixture-input','fixture-input','unclassified']);
  assert.equal(r.failures[2].executionSeconds,60);
  assert.equal(r.failures[5].executionSeconds,null);
  assert.equal(r.failures[6].executed,false);
  assert.equal(r.failures[3].logAvailable,false);
  assert.deepEqual(r.caseGroups[0],{signal:'historical-source-identity',subject:'config/architecture.json',count:1,jobIds:[3]});
});

test('offline triage refuses incomplete or mixed-attempt inputs before reading any logs',()=>{
  const readJobLog=()=>assert.fail('mixed identities must not read logs');
  assert.throws(()=>triageRun(run,{total_count:2,jobs:[job(1,'check')]},{readJobLog}),/Incomplete/);
  assert.throws(()=>triageRun(run,response([job(1,'check',{run_attempt:2})]),{readJobLog}),/identity/);
  assert.throws(()=>triageRun(run,response([job('../1','check')]),{readJobLog}),/Invalid job identity/);
  assert.throws(()=>triageRun({...run,head_sha:null},response([]),{readJobLog}),/Invalid run identity/);
});

test('offline triage recognizes and deduplicates a standalone Lua failure with reported timing',()=>{
  const steps=[{name:'Set up job',conclusion:'success'},{name:'Lua regression shard',conclusion:'failure'}];
  const log=['Lua runner failed (tests/lua/deck_browse_filters.lua, 90000 ms): spawnSync /usr/bin/node ETIMEDOUT',
    'Lua fixture tests/lua/deck_browse_filters.lua: 90012 ms',
    'Lua worker failed (tests/lua/deck_browse_filters.lua, exit 1)'].join('\n');
  const {failures}=triageRun(run,response([job(1,'rules (1/18)',{conclusion:'failure',steps})]),{readJobLog:()=>log});
  assert.deepEqual(failures[0].cases,[{path:'tests/lua/deck_browse_filters.lua',line:null,column:null,
    name:'tests/lua/deck_browse_filters.lua',durationMs:90012,signal:'fixture-timeout',subject:'ETIMEDOUT'}]);
});

import {describe} from 'node:test';
import {summarize} from '../scripts/ci-run-costs.mjs';
describe('on-demand CI governance',()=>{
const at = s => `2026-11-01T00:${s}:00Z`;
const run = (id, extra = {}) => ({id, name:'Quality', workflow_id:1, head_sha:'a'.repeat(40), event:'pull_request', head_branch:'feat/x', created_at:at('00'), run_started_at:at('01'), updated_at:at('09'), conclusion:'success', run_attempt:1, ...extra});
test('new commits and integration contexts are not duplicate execution', () => {
  const r=summarize({runs:[run(1),run(2,{head_sha:'b'.repeat(40)}),run(3,{event:'merge_group'})]});
  assert.equal(r.sameIdentityExtraRuns,0);
  assert.equal(r.provenReusableExtraRuns,0);
});
test('same SHA alone cannot prove reusable configuration or base', () => {
  const r=summarize({runs:[run(1),run(2,{created_at:at('10')})]});
  assert.equal(r.sameIdentityExtraRuns,1);
  assert.equal(r.provenReusableExtraRuns,0);
  assert.equal(r.reuseIdentityMissing,2);
});
test('only prior successful completed evidence in same config and base is reusable', () => {
  const identity={tested:'a'.repeat(40),base:'c'.repeat(40),configDigest:'config1',scope:'full',platforms:['linux','windows']};
  const runs=[run(1),run(2,{created_at:at('10')}),run(3,{created_at:at('20')}),run(4,{created_at:at('30'),event:'merge_group'})];
  const evidence={1:identity,2:identity,3:{...identity,base:'d'.repeat(40)},4:identity};
  const r=summarize({runs,evidence});
  assert.equal(r.provenReusableExtraRuns,1);
});
test('runner consumption sums actual jobs, retaining canceled work; missing jobs stay unknown', () => {
  const r=summarize({runs:[run(1),run(2,{conclusion:'cancelled'})], jobs:{1:[{id:1,runner_id:1,status:'completed',conclusion:'success',started_at:at('01'),completed_at:at('03')},{id:2,runner_id:2,status:'completed',conclusion:'skipped',started_at:at('01'),completed_at:at('09')}],2:[{id:3,runner_id:3,status:'completed',conclusion:'cancelled',started_at:at('02'),completed_at:at('03')}]}});
  assert.equal(r.runnerMinutes,3);
  assert.equal(r.jobCoverageRuns,2);
  assert.equal(summarize({runs:[run(1)]}).runnerMinutes,null);
});
test('a newer failure invalidates older reusable success', () => {
  const e={tested:'a',base:'b',configDigest:'config',scope:'full',platforms:['linux']};
  const r=summarize({runs:[run(1),run(2,{conclusion:'failure',created_at:at('10'),updated_at:at('19')}),run(3,{created_at:at('20')})],evidence:{1:e,2:e,3:e}});
  assert.equal(r.provenReusableExtraRuns,0);
});
test('in-flight runner consumption is explicitly incomplete', () => {
  const r=summarize({runs:[run(1)],jobs:{1:[{id:10,runner_id:10,status:'in_progress',started_at:at('01'),completed_at:null}]}});
  assert.equal(r.runnerMinutesComplete,false);
  assert.equal(r.jobsWithoutCompletedTiming,1);
});
test('completed jobs with missing timing cannot be reported as complete consumption', () => {
  const r=summarize({runs:[run(1)],jobs:{1:[{id:10,runner_id:10,status:'completed',conclusion:'cancelled',started_at:at('01'),completed_at:null}]}});
  assert.equal(r.runnerMinutesComplete,false);
  assert.equal(r.jobsWithoutCompletedTiming,1);
});
test('first pass uses first run per commit and workflow and merge lead uses actual merged PRs', () => {
  const r=summarize({runs:[run(1,{conclusion:'failure'}),run(2,{created_at:at('10')}),run(3,{head_sha:'b'.repeat(40)})],prs:[{created_at:at('00'),merged_at:at('20')},{created_at:at('00'),merged_at:null}]});
  assert.equal(r.firstPass.eligibleCommits,2);
  assert.equal(r.firstPass.successfulCommits,1);
  assert.equal(r.firstPass.rate,0.5);
  assert.deepEqual(r.mergeLeadMinutes,{count:1,median:20,p90:20});
});
test('cross-Fork proven reuse needs same tested tree, base, configuration and platforms', () => {
  const e={tested:'t',base:'b',configDigest:'c',scope:'full',platforms:['linux','windows']};
  const runs=[run(1,{repository:{id:1},event:'workflow_dispatch'}),run(2,{repository:{id:2},event:'workflow_dispatch',workflow_id:2,head_branch:'fork',created_at:at('10')}),run(3,{repository:{id:3},event:'workflow_dispatch',created_at:at('20')})];
  assert.equal(summarize({runs,evidence:{1:e,2:e,3:{...e,base:'new'}}}).crossRepositoryReusableExtraRuns,1);
  assert.equal(summarize({runs:runs.slice(0,2),evidence:{1:e,2:{...e,configDigest:'new'}}}).crossRepositoryReusableExtraRuns,0);
});
for(const event of ['push','merge_group'])test(`Fork dispatch cannot replace mandatory ${event} integration`, () => {
  const e={tested:'t',base:'b',configDigest:'c',scope:'full',platforms:['linux','windows']};
  const runs=[run(1,{repository:{id:1},event:'workflow_dispatch'}),run(2,{repository:{id:2},event,created_at:at('10')})];
  assert.equal(summarize({runs,evidence:{1:e,2:e}}).crossRepositoryReusableExtraRuns,0);
});
test('cancelled before runner assignment has no runner consumption despite API timestamps', () => {
  const r=summarize({runs:[run(1)],jobs:{1:[{id:100,runner_id:0,status:'completed',conclusion:'cancelled',started_at:at('00'),completed_at:at('59')}]}});
  assert.equal(r.runnerMinutes,0);
});

});
