import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {exactSourceMatches} from './source-fingerprint.mjs';
import {restoreExactFixtureHunks} from './exact-fixture-hunks.mjs';

// Invert only the approved changes on develop since the selection PR's base.
// The older entrance archive still authenticates the reconstructed owners.
const archive=readFileSync(new URL('./ui-entrance-approved-sources.json',import.meta.url),'utf8').replaceAll('\r\n','\n');
assert.equal(createHash('sha256').update(archive).digest('hex'),
 '58ea26de5268bc427bce73ecfb1ff43930f54b987c97777f9843e74d3467fe6d','approved entrance owner transformations');
const {owners}=JSON.parse(archive);
const bindings=new Map(owners.map(row=>[row.path,row]));

// The opening button repair succeeds the already approved native input owner.
const openingButtonInput=Object.freeze({
 "path": "src/lua/abyss_node_ui_input.lua",
 "previous": {
  "sha256": "57595d1bca4fb33eed373d36b51219cb6f5ca42f9dbfce2910e93f73323ae1f5",
  "gitBlob": "208140d36c0dd1ce990d25f691f9e63d3c8e28f5"
 },
 "current": {
  "sha256": "c2dd463393b5287f6ecfcb21203d12c1e9de55fbbeff63bd20e27ea3a3111d43",
  "gitBlob": "87809b902ae8a3fc6619c4ba15bf2f405e213db0"
 },
 "hunks": [
  {
   "at": 168,
   "before": "                        local entry, look = visibleAction(), ctx.buttonLooks[box]",
   "after": "                        local entry, look = visibleAction(), ctx.buttonLook(box)"
  }
 ]
});

export function beforeApprovedUiEntrance(path,source){
 if(path===openingButtonInput.path&&exactSourceMatches(source,openingButtonInput.current)){
  const crlf=source.includes('\r\n');
  if(crlf&&source.replaceAll('\r\n','').includes('\n'))return source;
  const {current,previous,hunks}=openingButtonInput;
  const prior=restoreExactFixtureHunks({path,beforeSha256:previous.sha256,afterSha256:current.sha256,hunks},path,source);
  assert(exactSourceMatches(prior,previous),'exact opening input predecessor');
  source=crlf?prior.replaceAll('\n','\r\n'):prior;
 }
 const row=bindings.get(path);
 if(!row)return source;
 const prior=restoreExactFixtureHunks(row,path,source);
 return prior!==source&&source.includes('\r\n')?prior.replaceAll('\n','\r\n'):prior;
}

export function matchesApprovedUiEntranceOwner(path,source){
 return !bindings.has(path)||beforeApprovedUiEntrance(path,source)!==source;
}
