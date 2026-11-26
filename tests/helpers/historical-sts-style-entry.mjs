import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtempSync,realpathSync,rmSync} from 'node:fs';
import {createRequire} from 'node:module';
import {tmpdir} from 'node:os';
import {isAbsolute,join,relative,resolve} from 'node:path';
import {historicalStsStyleFixtures} from './historical-sts-style-runner.mjs';
import {writeHistoricalRuntimeSnapshot} from './historical-runtime-root.mjs';
import {stsStylePriorRuntime} from './sts-style-prior-runtime.mjs';

const script=process.argv[2],timeout=Number(process.argv[3]),started=Date.now();
assert(historicalStsStyleFixtures.includes(script));
assert(Number.isSafeInteger(timeout)&&timeout>0);
const remaining=()=>{
 const value=timeout-(Date.now()-started);
 assert(value>0,'historical StS fixture exceeded original total deadline');
 return value;
};
const directory=mkdtempSync(join(tmpdir(),'abyss-sts-style-'));
try{
 const inputs=Object.fromEntries(Object.entries(stsStylePriorRuntime.files).map(([path,row])=>[path,row.source]));
 writeHistoricalRuntimeSnapshot(directory,inputs,{dependenciesOnly:true});
 console.log('Historical StS replay: exact complete cb1 source and builders; original 12-slot Lua contract retained; current browser covered separately.');
 for(const builder of ['build-lua-data.mjs','build-ui.mjs','build-ui-theme.mjs']){
  const r=spawnSync(process.execPath,['scripts/'+builder],{cwd:directory,encoding:'utf8',timeout:remaining(),windowsHide:true});
  assert.ifError(r.error);assert.equal(r.status,0,r.stdout+r.stderr);
 }
 const cli=createRequire(import.meta.url).resolve('fengari-node-cli/src/lua-cli.js');
 const luaPath='./build/lua/?.lua;./src/lua/?.lua;;';
 const result=spawnSync(process.execPath,[cli,'-e',`dofile(${JSON.stringify(script)})`],{
  cwd:directory,encoding:'utf8',timeout:remaining(),windowsHide:true,
  env:{...process.env,LUA_PATH:luaPath,LUA_PATH_5_3:luaPath,LUA_INIT:'',LUA_INIT_5_3:''},
 });
 process.stdout.write(result.stdout??'');
 process.stderr.write(result.stderr??'');
 assert.ifError(result.error);
 assert.equal(result.signal,null,'historical StS Lua runner was terminated');
 process.exitCode=result.status;
}finally{
 const actual=realpathSync(directory),within=relative(resolve(tmpdir()),actual);
 assert(within&&!isAbsolute(within)&&!within.startsWith('..')&&within.startsWith('abyss-sts-style-'),'owned historical StS temporary root');
 rmSync(actual,{recursive:true,force:true});
}
