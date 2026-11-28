import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {restoreExactFixtureHunks} from './exact-fixture-hunks.mjs';
import {exactSourceMatches} from './source-fingerprint.mjs';

// The older replay suites receive the exact source at develop 32a15219.
// Authenticating the current bytes still precedes every projection.
const bindings=JSON.parse(readFileSync(new URL('../fixtures/ascension-foundation-source.json',import.meta.url)));

function restoreBoundSource(path,source,current,previous,hunks){
 if(!exactSourceMatches(source,current))return source;
 const prior=restoreExactFixtureHunks({path,beforeSha256:previous.sha256,afterSha256:current.sha256,hunks},path,source);
 assert(exactSourceMatches(prior,previous),'exact ascension predecessor: '+path);
 return prior;
}

export function beforeAscensionFoundationSource(path,source){
 const binding=Object.hasOwn(bindings,path)?bindings[path]:undefined;
 if(!binding||typeof source!=='string')return source;
 const normalized=source.replaceAll('\r\n','\n');
 const crlf=source!==normalized;
 if(crlf&&source!==normalized.replaceAll('\n','\r\n'))return source;
 const registration=binding.combatRegistration;
 const foundation=registration
  ?restoreBoundSource(path,normalized,registration.current,binding.current,registration.hunks):normalized;
 const previous=restoreBoundSource(path,foundation,binding.current,binding.previous,binding.hunks);
 if(previous===foundation)return source;
 return crlf?previous.replaceAll('\n','\r\n'):previous;
}
