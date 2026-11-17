import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
const h=x=>createHash('sha256').update(x).digest('hex');
const path='tests/release-selection-map-source.test.mjs';
const old=execFileSync('git',['show','7d02a6ae3be107730b7c1c128720e22c8431cbbe:'+path],{encoding:'utf8'});
const now=readFileSync(path,'utf8');
assert.equal(now.slice(now.indexOf("test('actual merged" )).replace("nodeTest('legacy landed697 release selection map isolated", "test('legacy landed697 release selection map isolated"),old.slice(old.indexOf("test('actual merged")));
const m=await import(process.cwd()+'/tests/helpers/potion-pointer-ci-union.mjs');
let n=1;
const before='tests/helpers/potion-pointer-ci-before-selection.json.gz';
assert.equal(h(readFileSync(before)),h(execFileSync('git',['show','7d02a6ae3be107730b7c1c128720e22c8431cbbe:tests/helpers/potion-pointer-ci-union.json.gz'])));n++;
for(const p of [path,before,'tests/helpers/potion-pointer-ci-union.json.gz','src/lua/abyss_battle_card_gestures.lua'])for(const mode of ['change','missing','empty']){
 const read=(q,e)=>{let b=readFileSync(q,e);if(q!==p)return b;if(mode==='missing')throw Error('missing test input');if(mode==='empty')return e?'':Buffer.alloc(0);return typeof b==='string'?b+'\n':Buffer.concat([b,Buffer.from('\n')]);};
 assert.throws(()=>m.assertPotionPointerCiUnionCurrent(read));n++;
}
const oldConsumer=(q,e)=>q===path?(e?old:Buffer.from(old)):readFileSync(q,e);
assert.throws(()=>m.assertPotionPointerCiUnionCurrent(oldConsumer));n++;
let escaped; m.withPotionPointerCiUnionValidation('potion',readFileSync,r=>{escaped=r;assert.equal(typeof r(path,'utf8'),'string');});
assert.throws(()=>escaped(path,'utf8'),/escaped/);n++;
assert.throws(()=>m.withPotionPointerCiUnionValidation('potion',readFileSync,r=>{escaped=r;throw Error('scope fail');}),/scope fail/);
assert.throws(()=>escaped(path,'utf8'),/escaped/);n++;
assert.throws(()=>m.withPotionPointerCiUnionValidation('potion',readFileSync,()=>Promise.resolve()),/synchronous/);n++;
const crlf=(p,e)=>{const b=readFileSync(p,e);return typeof b==='string'?b.replaceAll('\n','\r\n'):b;};m.assertPotionPointerCiUnionCurrent(crlf);n++;
m.assertPotionPointerCiUnionCurrent();n++;
console.log(`Independent PASS ${n} checks: complete original test bodies, exact prior packet, 12 cold corruptions, rollback, scope exit/throw/async, CRLF and recovery.`);
