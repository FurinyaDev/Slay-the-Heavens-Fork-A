import assert from'node:assert/strict';import{readFileSync}from'node:fs';import{pathToFileURL}from'node:url';import{resolve}from'node:path';
const m=await import(pathToFileURL(resolve('tests/helpers/potion-pointer-ci-union.mjs')));const path='tests/helpers/closeout-source-epoch.mjs';let n=0,escaped,prior;
m.withPotionPointerCiUnionValidation('potion',readFileSync,(r,s)=>{escaped=s;prior=r;assert.equal(s(path,'utf8'),readFileSync(path,'utf8'));n++;const b=s(path);b.fill(0);assert.equal(s(path,'utf8'),readFileSync(path,'utf8'));n++;m.assertPotionPointerCiUnionCurrent(s);n++;});
assert.throws(()=>escaped(path),/escaped/);n++;assert.throws(()=>m.assertPotionPointerCiUnionCurrent(escaped),/escaped/);n++;assert.throws(()=>prior(path),/escaped/);n++;
assert.throws(()=>m.withPotionPointerCiUnionValidation('potion',readFileSync,(r,s)=>{escaped=s;throw Error('test');}),/test/);n++;assert.throws(()=>m.assertPotionPointerCiUnionCurrent(escaped),/escaped/);n++;
assert.throws(()=>m.withPotionPointerCiUnionValidation('potion',readFileSync,(r,s)=>{escaped=s;return Promise.resolve();}),/synchronous/);n++;assert.throws(()=>escaped(path),/escaped/);n++;
let delayed;m.withPotionPointerCiUnionValidation('potion',readFileSync,(r,s)=>{queueMicrotask(()=>{delayed=s;});});await Promise.resolve();assert.throws(()=>delayed(path),/escaped/);n++;
const bad=(p,e)=>{const b=readFileSync(p,e);return p===path?typeof b==='string'?b+'\n':Buffer.concat([b,Buffer.from('\n')]):b;};assert.throws(()=>m.withPotionPointerCiUnionValidation('potion',bad,()=>assert.fail('must not reach callback')));n++;m.assertPotionPointerCiUnionCurrent();n++;
console.log('Independent scoped-snapshot PASS',n,'checks; no escaped reader, Buffer alias, async capability or custom-reader bypass.');
