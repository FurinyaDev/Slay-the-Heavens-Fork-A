// Reproducible bounded, offline normal-rule runs; never rewrites game state.
import {runLua} from './test-lua.mjs';
import {writeFileSync,readFileSync,mkdirSync,unlinkSync} from 'node:fs';
import {gzipSync,gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {parseArgs} from 'node:util';
import {gitSourceIdentity} from './release-notes.mjs';
import {toLua} from './build-lua-data.mjs';
const {values,positionals}=parseArgs({allowPositionals:true,options:{
 profile:{type:'string'},output:{type:'string'},compact:{type:'boolean',default:false},replay:{type:'string'},
}});
const replayBytes=values.replay?readFileSync(values.replay):null;
const replay=replayBytes?JSON.parse(values.replay.endsWith('.gz')?gunzipSync(replayBytes):replayBytes):null;
const profile=values.profile??(replay?'full-source':'competition-two-act');
if(!['competition-two-act','full-source'].includes(profile))throw Error('Unsupported campaign profile');
if(replay&&(positionals.length||profile!=='full-source'||replay.campaignProfile!==profile||replay.schemaVersion!==1
 ||!Array.isArray(replay.commands)||!replay.commands.length||replay.commands.length>3000
 ||replay.expected?.phase!=='victory'||replay.expected?.terminalResult!=='normal_victory'
 ||replay.expected?.act!==3||replay.expected?.floor!==51))throw Error('Invalid three-act campaign replay');
const seeds=replay?[replay.seed]:positionals.length?positionals.map(Number):[2,3,42,75,505];
if(seeds.some(x=>!Number.isSafeInteger(x)||x<0)||seeds.length>20)throw Error('1–20 integer seeds required');
const directory=values.output??(profile==='full-source'?'build/m3-normal-campaign-full-source':'docs/evidence/m3-normal-campaign-20261031');
mkdirSync(directory,{recursive:true});
const hash=p=>createHash('sha256').update(readFileSync(p)).digest('hex');
const source=gitSourceIdentity();
if(!source.sourceCommit||source.sourceDirty)throw Error('Normal-rule evidence requires an exact clean source commit');
const compact=values.compact||Boolean(replay);
const report={kind:'offline-normal-rule-campaign',campaignProfile:profile,compact,platformVerified:false,dataModified:false,
 ...source,startedAt:new Date().toISOString(),
 policy:replay?'recorded-commands':'warrior75-engine-state-v1',
 policySha256:replay?hash(values.replay):hash('scripts/warrior75-autoplay-policy.lua'),
 replayDriverSha256:replay?hash('scripts/m3-campaign-replay.lua'):undefined,
 driverSha256:hash('scripts/m3-normal-campaign.lua'),eventCardPolicySha256:hash('scripts/m3-event-card-policy.lua'),relicChoicePolicySha256:hash('scripts/m3-relic-choice-policy.lua'),resetVerificationKind:'fresh-Run-construction-only; not Host restart',runs:[]};
for(const seed of seeds){
 const temporary=`build/m3-normal-${seed}.lua`;
 const replayInput=replay?`M3_REPLAY=${toLua(replay.commands)}\n`:'';
 writeFileSync(temporary,`M3_SEED=${seed}\nM3_PROFILE=${JSON.stringify(profile)}\nM3_COMPACT=${compact}\n${replayInput}dofile('scripts/m3-normal-campaign.lua')\n`);
 let result;try{result=runLua(temporary,{timeout:300000,maxBuffer:50000000});}finally{unlinkSync(temporary);}
 if(result.status!==0)throw Error(result.stderr||result.stdout);
 const line=result.stdout.split('\n').find(x=>x.startsWith('M3_EVIDENCE_JSON '));if(!line)throw Error('missing evidence');
 const evidence={...JSON.parse(line.slice(17)),...source,driverSha256:report.driverSha256,
  policySha256:report.policySha256,eventCardPolicySha256:report.eventCardPolicySha256,
  relicChoicePolicySha256:report.relicChoicePolicySha256,replayDriverSha256:report.replayDriverSha256};
 const artifact=`seed-${seed}.json.gz`;writeFileSync(`${directory}/${artifact}`,gzipSync(JSON.stringify(evidence)));
 const row={seed,status:evidence.status,reason:evidence.reason,floor:evidence.final.floor,hp:evidence.final.hp,
 ending:evidence.final.ending,terminalResult:evidence.final.terminalResult,actions:evidence.actions.length,
 newRunConstructionResetVerified:evidence.newRunConstructionResetVerified,artifact};
 report.runs.push(row);console.log(JSON.stringify(row));
 writeFileSync(`${directory}/summary.json`,JSON.stringify(report,null,2)+'\n');
 if(replay&&(evidence.status!=='victory'||evidence.actions.length!==replay.commands.length
   ||Object.entries(replay.expected).some(([field,value])=>evidence.final[field]!==value)))
  throw Error('Recorded campaign did not match its expected final state');
}
