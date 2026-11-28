import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {beforeAscensionFoundationSource} from './helpers/ascension-foundation-source.mjs';
import {exactSourceMatches} from './helpers/source-fingerprint.mjs';

const proofs=JSON.parse(readFileSync(new URL('./fixtures/ascension-foundation-source.json',import.meta.url)));
// Exercise the exact historical input while normal production owners keep evolving.
const {sourceCommit,files}=JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/ascension-foundation-after.json.gz',import.meta.url))));
assert.equal(sourceCommit,'c146228299be6953efa0a933a3bff0294eb19bca');
assert.deepEqual(Object.keys(files).sort(),['config/architecture.json','src/lua/abyss_game_ui_run.lua']);

for(const [path,source] of Object.entries(files))test('ascension fixture authenticates exact predecessor for '+path,()=>{
 const {previous,current}=proofs[path];
 assert(!source.includes('\r'), 'archive must retain original LF bytes');
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

test('combat architecture continues the exact ascension foundation projection',()=>{
 const path='config/architecture.json';
 const rules='    "abyss_ascension_rules": "core",\n';
 const enemy='    "abyss_ascension_enemies": "core",\n';
 const source=files[path].replace(rules,rules+enemy);
 // Original combat slice 22061c49, before the test-only continuation.
 assert(exactSourceMatches(source,{sha256:'84f7e824ca7f7f12c004c5b0aae8219b0bcd2cf13336cbec7cb4179cd3907c8c',
  gitBlob:'ebbc24cdc69a33f23242ef73a3f82e8c2ee65977'}));
 const expected=beforeAscensionFoundationSource(path,files[path]);
 assert(exactSourceMatches(expected,proofs[path].previous));
 assert.equal(beforeAscensionFoundationSource(path,source),expected);
 const crlf=text=>text.replaceAll('\n','\r\n');
 assert.equal(beforeAscensionFoundationSource(path,crlf(source)),crlf(expected));
 const foreignRegistration=source.replace('abyss_ascension_enemies','abyss_ascension_unknown');
 for(const unknown of [foreignRegistration,source.replace('\n','\r\n'),source+'\n']){
  assert.equal(beforeAscensionFoundationSource(path,unknown),unknown);
 }
 assert.equal(beforeAscensionFoundationSource('foreign/'+path,source),source);
});
