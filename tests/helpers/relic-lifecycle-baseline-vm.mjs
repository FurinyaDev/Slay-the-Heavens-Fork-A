import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,appendFileSync} from 'node:fs';
import {installLuaGraphObserver} from './lua-graph-observer.mjs';
import {exactSourceMatches} from './source-fingerprint.mjs';
import {relicLifecycleRevision,relicLifecycleArchiveSha256,relicLifecycleGroups,lifecycleHash,relicLifecycleFrozenPrelude,purgeA27FrozenPrelude,relicPurgeA27Revision,relicPurgeA27ArchiveSha256,relicLifecycleGeneratedBindings} from './relic-lifecycle-baseline.mjs';
const require=createRequire(import.meta.url),{lua,lauxlib,lualib,to_luastring,to_jsstring}=require('fengari');
const [group,variant,directory,mode]=process.argv.slice(2);
if(!relicLifecycleGroups.includes(group)||!['frozen391','frozena27','current'].includes(variant)||!['raw','trace','isolation'].includes(mode))throw Error('registered independent lifecycle VM');
const L=lauxlib.luaL_newstate();lualib.luaL_openlibs(L);
const loadedFrozen=[],frozen=variant!=='current',trace=mode==='trace';let snapshots=0;
const tracePath=`${directory}/trace.jsonl`;writeFileSync(tracePath,'');
if(trace)installLuaGraphObserver(L,'RELIC_LIFECYCLE_GRAPH',(label,graph)=>{
 // The observer already emits canonical JSON; preserve every graph byte rather
 // than parsing and re-encoding its full definitions at each checkpoint.
 appendFileSync(tracePath,`{"label":${JSON.stringify(label)},"graph":${graph}}\n`);snapshots++;
});
if(frozen){
 if(mode==='isolation')lauxlib.luaL_dostring(L,to_luastring(`RELIC_TRAP_CALLS=0;for _,name in ipairs({'abyss_relic_queries','abyss_purge_candidates','abyss_relic_combat_hooks','abyss_relic_family_combat'})do package.preload[name]=function()RELIC_TRAP_CALLS=RELIC_TRAP_CALLS+1;return {}end end`));
 const prelude=variant==='frozena27'?purgeA27FrozenPrelude():relicLifecycleFrozenPrelude();
 if(lauxlib.luaL_dostring(L,to_luastring(prelude))!==lua.LUA_OK)throw Error(to_jsstring(lua.lua_tostring(L,-1)));
 // Restore only the exact fixture versions immediately before #951, so the
 // frozen owner exercises its real old public methods and alias inventory.
 const tests={
  rare:['tests/lua/rare_relics_hooks.lua',
   {sha256:'9108fbfb6ca60e4afd1a6d06f6bb6e68be48501d3e15965521f89a7bbfbfbfca',gitBlob:'2a30db91ffa56b9e81e71c059bab34d44a34929d'},
   {sha256:'0b71080d40a7439bd7faf5b44be534c35b85a26c0c5563c99fdeb6d95c77497c',gitBlob:'9668d9db4f51b378c243813032b1616fba4c5d0c'},
   [['chooseTacticalExchange','chooseGambling'],['tactical_badge','gambling_chip'],["'raven_adept'","'cultist'"]]],
  dynamic:['tests/lua/relic_query_contract.lua',
   {sha256:'0887f1eedd611e6bc211018f0927c649ad84cd82dc73a8bf8326d49aba7dd33b',gitBlob:'6ee632da3cbdb8ba86d2050fbd64f86496e1751b'},
   {sha256:'3b962f5e8b9cf7a9a08c3f80b6afd34ae5bcd58cc67ba719eef029d81488c085',gitBlob:'08274585f01e62329bb7c854dfaf8f01428feb29'},
   [['AugmentationCore','MutagenicStrength'],['RavenMask','CultistMask'],['Tactical Badge','Gambling Chip']]],
 };
 if(Object.hasOwn(tests,group)&&mode!=='isolation'){
  const [path,after,before,renames]=tests[group];
  const raw=readFileSync(path,'utf8'),current=raw.replaceAll('\r\n','\n');
  assert(raw===current||raw===current.replaceAll('\n','\r\n'),'uniform #951 fixture line endings: '+path);
  assert(exactSourceMatches(current,after),'exact #951 successor fixture: '+path);
  const original=renames.reduce((text,[modern,legacy])=>text.replaceAll(modern,legacy),current);
  assert(exactSourceMatches(original,before),'exact #951 predecessor fixture: '+path);
  const source=original.replaceAll("'cultist'","'raven_adept'");
  const driver=`local run=dofile;dofile=function(path)if path==${JSON.stringify(path)} then return assert(load(${JSON.stringify(source)},'@'..path,'t'))()end return run(path)end`;
  if(lauxlib.luaL_dostring(L,to_luastring(driver))!==lua.LUA_OK)throw Error(to_jsstring(lua.lua_tostring(L,-1)));
 }
}
lua.lua_pushboolean(L,trace);lua.lua_setglobal(L,to_luastring('RELIC_LIFECYCLE_TRACE'));
const probe=`for _,name in ipairs({'abyss_relic_queries','abyss_purge_candidates','abyss_relic_combat_hooks','abyss_relic_family_combat'})do local ok,why=pcall(require,name);if ${variant==='frozena27'?'true':'false'} and name=='abyss_relic_queries'then assert(ok and type(why)=='table','original a27 query source allowed')else assert(not ok and tostring(why):find('[RELIC_FROZEN_SOURCE]',1,true),'explicit frozen guard must reject existing live preload: '..name)end end;assert(RELIC_TRAP_CALLS==0,'live new source trap ran');print('RELIC_FROZEN_ISOLATION_PASS '..tostring(RELIC_TRAP_CALLS))`;
const source=to_luastring(`package.path='src/lua/?.lua;build/lua/?.lua;'..package.path;`+(mode==='isolation'?probe:`dofile('tests/lua/relic_lifecycle_${group}.lua')`));
const status=lauxlib.luaL_dostring(L,source);
if(status!==lua.LUA_OK){console.error(to_jsstring(lua.lua_tostring(L,-1))??'nonstring lifecycle fixture failure');process.exitCode=1;lua.lua_pop(L,1);}
if(frozen&&status===lua.LUA_OK&&lauxlib.luaL_dostring(L,to_luastring('assert(RELIC_LIFECYCLE_FROZEN.audit())'))!==lua.LUA_OK){console.error(to_jsstring(lua.lua_tostring(L,-1)));process.exitCode=1;lua.lua_pop(L,1);}
const coverage={};lua.lua_getglobal(L,to_luastring('RELIC_LIFECYCLE_COVERAGE'));
if(lua.lua_istable(L,-1)){lua.lua_pushnil(L);while(lua.lua_next(L,-2)){coverage[to_jsstring(lua.lua_tostring(L,-2))]=lua.lua_tonumber(L,-1);lua.lua_pop(L,1);}}
lua.lua_pop(L,1);
const array=name=>{const values=[];lua.lua_getglobal(L,to_luastring(name));if(lua.lua_istable(L,-1))for(let i=1;;i++){lua.lua_rawgeti(L,-1,i);if(lua.lua_isnil(L,-1)){lua.lua_pop(L,1);break;}values.push(to_jsstring(lua.lua_tostring(L,-1)));lua.lua_pop(L,1);}lua.lua_pop(L,1);return values;};
const registeredCases=array('RELIC_LIFECYCLE_REGISTERED'),executedCases=array('RELIC_LIFECYCLE_EXECUTED');
const loadedOrigins={};if(frozen){lua.lua_getglobal(L,to_luastring('RELIC_LIFECYCLE_FROZEN'));lua.lua_getfield(L,-1,to_luastring('loaded'));lua.lua_pushnil(L);while(lua.lua_next(L,-2)){const name=to_jsstring(lua.lua_tostring(L,-2)),origin=to_jsstring(lua.lua_tostring(L,-1));loadedOrigins[name]=origin;if(origin==='handwritten')loadedFrozen.push(name);lua.lua_pop(L,1);}lua.lua_pop(L,2);}
const generatedBindings=Object.fromEntries(Object.entries(relicLifecycleGeneratedBindings()).map(([name,{path,sha256}])=>[name,{path,sha256}]));
const graph=trace?require('node:fs').readFileSync(tracePath):Buffer.alloc(0);
writeFileSync(`${directory}/manifest.json`,JSON.stringify({schemaVersion:1,group,variant,trace,
 frozenRevision:frozen?(variant==='frozena27'?relicPurgeA27Revision:relicLifecycleRevision):null,frozenArchiveSha256:frozen?(variant==='frozena27'?relicPurgeA27ArchiveSha256:relicLifecycleArchiveSha256):null,
 preloadedSources:frozen?(variant==='frozena27'?330:329):0,loadedFrozen,loadedOrigins,generatedBindings,registeredCases,executedCases,checkpoints:snapshots,traceBytes:graph.length,traceSha256:lifecycleHash(graph),coverage},null,2)+'\n');
