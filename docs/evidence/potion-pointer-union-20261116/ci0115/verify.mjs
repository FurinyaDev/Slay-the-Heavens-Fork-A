import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {sourceEpoch} from '../../../../tests/helpers/closeout-source-epoch.mjs';
import {assertIntegratedCurrent,integratedSource,integratedRead} from '../../../../tests/helpers/integrated-ci-source.mjs';
import {potionPointerCiUnionPacket as packet,assertPotionPointerCiUnionCurrent as verify,potionPointerCiUnionSource as project,potionPointerCiUnionRead as reader,withPotionPointerCiUnionValidation as scoped} from '../../../../tests/helpers/potion-pointer-ci-union.mjs';
let count=0;const check=(label,fn)=>{fn();count++;console.log('ok',count,label);};
const hash=b=>createHash('sha256').update(b).digest('hex');
const path='tests/helpers/closeout-source-epoch.mjs',raw=readFileSync(path,'utf8');
check('complete raw current union',()=>verify());
check('unchanged original integrated current chain passes',()=>assertIntegratedCurrent());
for(const target of ['potion','pointer']){
 const sha=packet.viewCommits[target],expected=execFileSync('git',['show',sha+':'+path],{encoding:'utf8'});
 check(target+' exact committed predecessor',()=>assert.equal(project(path,raw,target),expected));
 check(target+' Buffer preserving reader',()=>{const b=reader(target)(path);assert(Buffer.isBuffer(b));assert.equal(b.toString(),expected);});
 check(target+' CRLF current accepted',()=>assert.equal(project(path,raw.replaceAll('\n','\r\n'),target),expected));
 check(target+' opaque foreign input preserved',()=>{for(const value of [raw+'\n',raw.slice(1),raw.replaceAll('\n','\r\r\n'),null,{},17,Buffer.from(raw)]){let reads=0;assert.equal(project(path,value,target,()=>{reads++;throw Error('unexpected read');}),value);assert.equal(reads,0);}});
 check(target+' public production stays raw',()=>{const p='src/lua/abyss_battle_ui.lua',s=readFileSync(p,'utf8');assert.equal(project(p,s,target),s);});
}
// A warmed reader must not keep prior authorization, even when the caller input is unchanged.
let changed=null,mode='drift';const custom=(p,e)=>{const raw=readFileSync(p,e);if(p!==changed)return raw;if(mode==='missing')throw Error('missing '+p);if(mode==='empty')return e?'':Buffer.alloc(0);return typeof raw==='string'?raw+'\n':Buffer.concat([raw,Buffer.from('\n')]);};
const reused=reader('potion',custom);check('warm public reader',()=>assert.equal(hash(reused(path)),packet.files[path].views.potion.sha256));
for(const p of new Set([...Object.keys(sourceEpoch.proof.current).filter(p=>sourceEpoch.proof.current[p]),...Object.keys(packet.files),'tests/helpers/potion-pointer-ci-union.json.gz'])){
 check('fresh drift rejected '+p,()=>{changed=p;mode='drift';assert.throws(()=>project(path,raw,'potion',custom));if(p!==path)assert.throws(()=>reused(path));changed=null;});
}
for(const p of [path,'src/lua/abyss_battle_ui.lua','tests/helpers/release-source-epoch.json.gz'])for(const m of ['missing','empty'])check(m+' rejected '+p,()=>{changed=p;mode=m;assert.throws(()=>project(path,raw,'potion',custom));if(p!==path)assert.throws(()=>reused(path));changed=null;});
check('reader recovers after mutations',()=>assert.equal(hash(reused(path)),packet.files[path].views.potion.sha256));
check('all-current rollback cannot certify union',()=>assert.throws(()=>verify((p,e)=>{
 const row=packet.files[p]?.views.potion;if(!row?.source)return readFileSync(p,e);
 const b=Buffer.from(row.source,packet.files[p].current.encoding==='base64'?'base64':'utf8');return e?b.toString(e):b;
})));
check('public integration retains production',()=>{const p='src/lua/abyss_battle_ui.lua',s=readFileSync(p,'utf8');assert.equal(integratedSource(p,s,'release'),s);});
check('validation reader cannot escape normal return',()=>{let escaped;scoped('potion',readFileSync,r=>{escaped=r;assert.equal(hash(r(path)),packet.files[path].views.potion.sha256);});assert.throws(()=>escaped(path),/escaped synchronous scope/);});
check('validation reader cannot escape thrown callback',()=>{let escaped;assert.throws(()=>scoped('potion',readFileSync,r=>{escaped=r;throw Error('callback failure');}),/callback failure/);assert.throws(()=>escaped(path),/escaped synchronous scope/);});
check('validation rejects Promise callback and expires reader',()=>{let escaped;assert.throws(()=>scoped('potion',readFileSync,r=>{escaped=r;return Promise.resolve();}),/must be synchronous/);assert.throws(()=>escaped(path),/escaped synchronous scope/);});
let delayed;await new Promise(resolve=>{scoped('potion',readFileSync,r=>{queueMicrotask(()=>{delayed=()=>r(path);resolve();});});});check('async continuation cannot use captured reader',()=>assert.throws(delayed,/escaped synchronous scope/));
console.log('PASS',count,'checks; partial entry stage, no pointer CI test integration / Full / device acceptance');
