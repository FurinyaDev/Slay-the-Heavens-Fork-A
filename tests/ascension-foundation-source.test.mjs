import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {beforeAscensionFoundationSource} from './helpers/ascension-foundation-source.mjs';
import {exactSourceMatches} from './helpers/source-fingerprint.mjs';

const proofs=JSON.parse(readFileSync(new URL('./fixtures/ascension-foundation-source.json',import.meta.url)));

for(const [path,{previous,current}] of Object.entries(proofs))test('ascension fixture authenticates exact predecessor for '+path,()=>{
 const source=readFileSync(path,'utf8').replaceAll('\r\n','\n');
 assert(exactSourceMatches(source,current));
 const prior=beforeAscensionFoundationSource(path,source);
 assert.notEqual(prior,source);
 assert(exactSourceMatches(prior,previous));
 const crlf=text=>text.replaceAll('\n','\r\n');
 assert.equal(beforeAscensionFoundationSource(path,crlf(source)),crlf(prior));
 const mixed=source.replace('\n','\r\n');
 const sameLength=source.slice(0,-1)+'!';
 for(const unknown of [mixed,sameLength,source+'\n'])assert.equal(beforeAscensionFoundationSource(path,unknown),unknown);
 assert.equal(beforeAscensionFoundationSource('foreign/'+path,source),source);
});
