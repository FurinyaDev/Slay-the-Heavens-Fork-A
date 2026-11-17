import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {assertPotionPointerCiUnionCurrent,potionPointerCiUnionPacket as packet,withPotionPointerCiUnionValidation} from '../../../..//tests/helpers/potion-pointer-ci-union.mjs';
import {integratedPriorInventory,integratedRead} from '../../../../tests/helpers/integrated-ci-source.mjs';
import {jointCiInventoryAt,preRatchetInventory} from '../../../../tests/helpers/joint-ui-ci-source-inverse.mjs';
import {closeoutInventory} from '../../../../tests/helpers/closeout-ci-source.mjs';
import {runHudPriorInventory} from '../../../../tests/helpers/run-hud-ci-source.mjs';
import {stsStylePriorInventory,assertStsStyleCiCurrent} from '../../../../tests/helpers/sts-style-ci-source.mjs';
import {menuRedPriorLua} from '../../../../tests/helpers/menu-red-ci-source.mjs';
let n=0;const hash=b=>createHash('sha256').update(b).digest('hex');
const before='tests/helpers/potion-pointer-ci-before-readers.json.gz';
assert.equal(hash(readFileSync(before)),hash(execFileSync('git',['show','5aea4918d2e250ea3bc9ff56135a8be0ffce7f76:tests/helpers/potion-pointer-ci-union.json.gz'])));n++;
assert.equal(Object.keys(packet.files).length,192);n++;
const old=JSON.parse(gunzipSync(readFileSync(before)));
const changed=['tests/ci-complete-calibration.test.mjs','tests/integrated-ci-source.cases.mjs','tests/helpers/integrated-ci-source.mjs'];
for(const [p,row]of Object.entries(old.files))if(!changed.includes(p))assert.deepEqual(packet.files[p],row);n++;
const added=Object.keys(packet.files).filter(p=>!Object.hasOwn(old.files,p));assert.equal(added.length,5);
for(const p of added)for(const [view,sha]of Object.entries(packet.viewCommits)){
 const b=execFileSync('git',['show',sha+':'+p]);assert.equal(packet.files[p].views[view].sha256,hash(b));assert.equal(packet.files[p].views[view].source,b.toString());n++;
}
const corrupt=(p,e)=>{const b=readFileSync(p,e);return p===before?(typeof b==='string'?b+'\n':Buffer.concat([b,Buffer.from('\n')])):b;};
const calls=[
 (r,c)=>jointCiInventoryAt([],'officialAssetsFlow',r,'pr620',c),
 (r,c)=>preRatchetInventory([],r,c),
 (r,c)=>closeoutInventory([],'pr620',r,c),
 (r,c)=>runHudPriorInventory([],r,c),
 (r,c)=>stsStylePriorInventory([],r,c),
 (r,c)=>integratedPriorInventory([],'sts','js',r,c),
 (r,c)=>menuRedPriorLua([],r,c),
 (r,c)=>integratedRead('sts',{read:r,...(c?{currentRead:c}:{})})('tests/helpers/integrated-ci-source.mjs','utf8')
];
const exact=e=>{assert.equal(e.message.split('\n')[0],'fresh pre-readers union');return true;};
assert.throws(()=>assertStsStyleCiCurrent([],corrupt),exact);n++;
for(const call of calls){assert.throws(()=>call(corrupt),exact);n++;assert.throws(()=>call(readFileSync,corrupt),exact);n++;}
for(const p of [...added,'tests/ci-complete-calibration.test.mjs','tests/integrated-ci-source.cases.mjs','tests/helpers/integrated-ci-source.mjs']){
 const bad=(q,e)=>{const b=readFileSync(q,e);return q===p?(typeof b==='string'?b+'\n':Buffer.concat([b,Buffer.from('\n')])):b;};
 assert.throws(()=>assertPotionPointerCiUnionCurrent(bad),e=>{assert.equal(e.message.split('\n')[0],'fresh union input '+p);return true;});n++;
}
let escaped;withPotionPointerCiUnionValidation('potion',readFileSync,(_,r)=>{escaped=r;assertPotionPointerCiUnionCurrent(r);});assert.throws(()=>escaped(before),/escaped/);n++;
assertPotionPointerCiUnionCurrent();n++;
console.log(`Author PASS ${n}: exact predecessor/192 inputs/Git parent views, default and explicit current-reader corruption, eight changed source drifts, snapshot expiry and recovery.`);
