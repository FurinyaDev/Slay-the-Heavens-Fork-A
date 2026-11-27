import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {beforeUiEntranceWitness} from './ui-entrance-source.mjs';
import {beforeReleaseClosureFixture} from './release-closure-fixture-source.mjs';

const sha256=source=>createHash('sha256').update(source).digest('hex');
const blob=source=>createHash('sha1').update(`blob ${Buffer.byteLength(source)}\0`).update(source).digest('hex');
const archive=readFileSync(new URL('./native-fixture-replay-source.json.gz',import.meta.url));
assert.equal(sha256(archive),'d1cbf62cf27c0458efec5a303852cfbf38acad680e77a15fdb902b34a758c1c5','exact native fixture replay archive');
const {schemaVersion,base,inputRetirementHead,files}=JSON.parse(gunzipSync(archive));
assert.equal(schemaVersion,1);
assert.equal(base,'67fc8750dd6ef9a13067c6a43137f910b6a44228');
assert.equal(inputRetirementHead,'392fae8d8dee2bd57829dda0e8da836f45107398');
assert.deepEqual(Object.keys(files),[
 'tests/build-ui-input-protection.test.mjs',
 'tests/helpers/game-ui-host-live-contract.mjs',
 'tests/lua/game_ui.lua',
 'tests/lua/game_ui_deck.lua',
 'tests/lua/game_ui_timer_safety.lua',
 'tests/lua/geo_public_entry.lua',
 'tests/lua/map_ui_chapters.lua',
 'tests/lua/support/native_card_art_contexts.lua',
 'tests/lua/support/native_card_art_fallback_ownership.lua',
 'tests/lua/support/native_card_art_runtime_contexts.lua',
 'tests/lua/support/official_portrait_game_lifecycle.lua',
 'tests/native-candidate-rebuild.test.mjs',
 'tests/native-monster-power-template.test.mjs',
 'tests/native-ui-theme.test.mjs',
 'tests/v25-portrait-profile.test.mjs',
]);
assert.equal(files['tests/lua/game_ui_deck.lua'].beforeCommit,'0461bcd30dac18818318cbafa77ad72fad069e0a');
assert.deepEqual(Object.keys(files).filter(path=>files[path].inputRetirement),[
 'tests/helpers/game-ui-host-live-contract.mjs','tests/lua/game_ui_timer_safety.lua','tests/native-ui-theme.test.mjs',
]);
for(const [path,{before,after,inputRetirement}] of Object.entries(files)){
 for(const row of [before,after,inputRetirement].filter(Boolean)){
  assert.equal(row.source,row.source.replaceAll('\r\n','\n'),path+' exact LF source');
  assert.equal(sha256(row.source),row.sha256,path+' exact source SHA256');
  assert.equal(blob(row.source),row.gitBlob,path+' exact source Git blob');
 }
 assert.notEqual(before.gitBlob,after.gitBlob,path+' distinct source epochs');
 if(inputRetirement){
  assert.notEqual(inputRetirement.gitBlob,before.gitBlob,path+' distinct upstream source epoch');
  assert.notEqual(inputRetirement.gitBlob,after.gitBlob,path+' distinct composed source epoch');
 }
}

// Reviewed #940 and #951 fixture changes leave the earlier archive intact.
const releaseFixtures=Object.freeze({
 'tests/lua/game_ui.lua':['ef7677b1aee7ab9491227bca8afac4d01b3130a4d79c6ac9c7526f29fb4091ae','41482970b54d7c8adcb566d2cb1d8ac8fa7542da'],
 'tests/lua/game_ui_deck.lua':['6c1b6d9dfc03f71711478823a6e8ed0173bc63ae0959f6b6380938b5801a3882','dd48a60e8a010256a196170cebb00e922c590ff7'],
 'tests/lua/support/native_card_art_contexts.lua':['1ab1d06f6d1bb1d33ad39cdd76c5facb3ea10560166ed306148cbdb21c4aacfb','c34f8910afde3065d8d15117d42637c2944d407f'],
 'tests/lua/support/native_card_art_runtime_contexts.lua':['13ebcfbb1bd0a649e43dbd3d8af29ab9fbf34ab19c014881abe57f4ebe846cf3','46d96aa83422b9eb682be4a26218bf817db8035b'],
 'tests/lua/support/official_portrait_game_lifecycle.lua':['4f11f300a65de86b91959d20a363f89886963e3cbdbb6a9d3ed83e2c9cfaf361','f3cbdec00e1d27c160f42e74d3cda0017d505899'],
 'tests/native-candidate-rebuild.test.mjs':['70c84225ac44eeb4d4fb891b071a5b7691e955528a78fff3ffaaa578e49a565c','bcc20ef97fa83430d7dd804603f3cc3991514c75'],
});

function fixtureMatches(path,source,after,{allowArchived=true}={}){
 source=beforeReleaseClosureFixture(path,source);
 if(typeof source!=='string'||source.includes('\r\r\n'))return false;
 const normalized=source.replaceAll('\r\n','\n'),archived=normalized===after.source;
 if(allowArchived&&archived)return true;
 const release=releaseFixtures[path];
 return release?sha256(normalized)===release[0]&&blob(normalized)===release[1]:archived;
}

export function assertNativeFixturesCurrent(read){
 for(const [path,{after}] of Object.entries(files)){
  const source=read(path,'utf8');
  assert(fixtureMatches(path,source,after,{allowArchived:false}),'fresh complete native fixture source: '+path);
 }
}

export function beforeNativeFixtureReplay(path,source){
 if(!Object.hasOwn(files,path))return source;
 source=beforeUiEntranceWitness(path,source);
 const {before,after}=files[path];
 if(!fixtureMatches(path,source,after))return source;
 return source.includes('\r\n')?before.source.replaceAll('\n','\r\n'):before.source;
}

// Restore #899's complete post-retirement fixture before its own historical inverse.
export function beforeNativeFixtureInputRetirement(path,source,{requireCurrent=false}={}){
 if(!Object.hasOwn(files,path)||!files[path].inputRetirement)return source;
 const {after,inputRetirement}=files[path],current=fixtureMatches(path,source,after);
 if(requireCurrent)assert(current,'fresh composed input retirement fixture: '+path);
 if(!current)return source;
 return source.includes('\r\n')?inputRetirement.source.replaceAll('\n','\r\n'):inputRetirement.source;
}
