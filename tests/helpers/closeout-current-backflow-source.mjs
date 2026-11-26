import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {restoreExactFixtureHunks} from './exact-fixture-hunks.mjs';
import {exactSourceMatches} from './source-fingerprint.mjs';

const bytes=readFileSync(new URL('../fixtures/closeout-current-backflow-source.json.gz',import.meta.url));
assert.equal(createHash('sha256').update(bytes).digest('hex'),
 '56607531977412c0b23f436c866be331a58aa7496412bf3339b2d5e17c82bcec','exact current closeout backflow packet');
const {schemaVersion,base,head,files,owners,continuation,sessionRoute,anchorRefactor}=JSON.parse(gunzipSync(bytes));
assert.equal(schemaVersion,1);
assert.equal(base,'903bf2a31e91f10fb24763ab4cea23d586d0bb83');
assert.equal(head,'7228aaa83b0995e1dc6e36955cfd6e773c199f07');
assert.equal(continuation.commit,'3c9837614568f0cd37d926167153727a3f25218e');
const sessionNavigation='src/lua/abyss_game_ui_navigation.lua';
const routePreviewView='src/lua/abyss_game_ui_view.lua';
assert.equal(sessionRoute[sessionNavigation].commit,'d6714eaa617005b3780938a10a9f7a36f22f6565');
assert.equal(sessionRoute[routePreviewView].commit,'4d5928646e0356c893f80e0883160db77f7edad7');
const battleDetailView='src/lua/abyss_battle_info_view.lua';
assert.equal(anchorRefactor.commit,'c7ea71bd084f27a8c5ace07ee8747e40f7e2ad35');
assert.deepEqual(anchorRefactor.before,owners[battleDetailView]);

function readExactOwner(path,binding,read){
 if(binding===null){
  assert.throws(()=>read(path,'utf8'),{code:'ENOENT'},'retired closeout owner reappeared: '+path);
  return;
 }
 const source=read(path,'utf8');
 assert(exactSourceMatches(source,binding),'fresh current closeout owner: '+path);
 const lf=source.replaceAll('\r\n','\n');
 assert(source===lf||source===lf.replaceAll('\n','\r\n'),'mixed closeout source line endings: '+path);
 return source;
}

// The immutable pr612 tooling view reads the exact predecessor of the
// current test fixture. Live Joust still executes the current test bytes.
export function beforeCloseoutJoustCiFixture(path,source){
 if(path!=='tests/joust-event.test.mjs')return source;
 const row=files[path];
 if(!exactSourceMatches(source,{sha256:row.afterSha256,gitBlob:row.afterBlob}))return source;
 const lf=source.replaceAll('\r\n','\n');
 if(source!==lf&&source!==lf.replaceAll('\n','\r\n'))return source;
 const prior=restoreExactFixtureHunks({...row,path},path,source);
 assert(exactSourceMatches(prior,{sha256:row.beforeSha256,gitBlob:row.beforeBlob}),'exact pr612 Joust fixture predecessor');
 return source===lf?prior:prior.replaceAll('\n','\r\n');
}

// These are reads of the original frozen Closeout hashes. Verify the live
// Joust projection's linked production cohort before reconstructing old bytes.
export function readCloseoutCurrentBackflowReceipt(path,digest,read){
 if(!Object.hasOwn(files,path)||files[path].beforeSha256!==digest)return;
 const row=files[path];
 const source=readExactOwner(path,{sha256:row.afterSha256,gitBlob:row.afterBlob},read);
 // The Guardian subtitle advances five linked sources as one reviewed unit.
 // Its follow-up navigation and route owners advance together. Fresh owner
 // reads select one complete revision and reject mixed revisions.
 const successor=continuation.owners;
 const [markerPath,markerBinding]=Object.entries(successor)[0];
 const marker=read(markerPath,'utf8');
 const guardian=exactSourceMatches(marker,markerBinding);
 const navigation=guardian?read(sessionNavigation,'utf8'):null;
 const session=exactSourceMatches(navigation,sessionRoute[sessionNavigation]);
 const detail=session?read(battleDetailView,'utf8'):null;
 const current=session?{...successor,...sessionRoute}:guardian?successor:{};
 if(exactSourceMatches(detail,anchorRefactor.after))current[battleDetailView]=anchorRefactor.after;
 for(const [owner,binding] of Object.entries(owners)){
  const live=readExactOwner(owner,current[owner]??binding,read);
  if(owner===path)assert.equal(live,source,'closeout owner changed during the receipt read: '+path);
  if(owner===markerPath)assert.equal(live,marker,'closeout owner changed during the receipt read: '+owner);
  if(owner===sessionNavigation&&guardian)assert.equal(live,navigation,'closeout owner changed during the receipt read: '+owner);
  if(owner===battleDetailView&&session)assert.equal(live,detail,'closeout owner changed during the receipt read: '+owner);
 }
 const prior=restoreExactFixtureHunks({...row,path},path,source);
 assert(exactSourceMatches(prior,{sha256:row.beforeSha256,gitBlob:row.beforeBlob}),'exact current closeout predecessor: '+path);
 return prior;
}
