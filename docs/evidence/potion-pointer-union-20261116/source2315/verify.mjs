import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {sourceEpoch} from '../../../../tests/helpers/closeout-source-epoch.mjs';
const p=sourceEpoch.proof;let count=0;
for(const [path,row] of Object.entries(p.current)){
 let actual=null;try{actual=execFileSync('git',['show',`${p.currentCommit}:${path}`],{encoding:'utf8',stdio:['ignore','pipe','ignore']}).replaceAll('\r\n','\n');}catch{}
 assert.equal(actual,row?.source??null,path);count++;
}
const raw=path=>p.current[path]?.source??null;let cases=0;
for(const target of ['potionBeforePointerUnion','pointerBeforePotionUnion']){
 const owner=p.owners.find(x=>p.current[x]&&p.targets[target].files[x]&&p.current[x].sha256!==p.targets[target].files[x].sha256);
 assert.equal(sourceEpoch.preCombinedSource(owner,raw(owner),{target,readSource:raw}),p.targets[target].files[owner].source);cases++;
 for(const bad of p.owners){
  for(const replacement of [null,'',String(raw(bad))+' drift']){
   if(p.current[bad]===null&&replacement===null)continue;
   assert.throws(()=>sourceEpoch.preCombinedSource(owner,raw(owner),{target,readSource:x=>x===bad?replacement:raw(x)}));cases++;
  }
 }
 assert.equal(sourceEpoch.preCombinedSource(owner,raw(owner).replaceAll('\n','\r\n'),{target,readSource:x=>raw(x)?.replaceAll('\n','\r\n')??null}),p.targets[target].files[owner].source);cases++;
}
console.log(JSON.stringify({currentGitFiles:count,targets:Object.keys(p.targets).length,ownerNegativeAndPositiveCases:cases,status:'PASS',scope:'product sourceEpoch only; CI union incomplete'}));
