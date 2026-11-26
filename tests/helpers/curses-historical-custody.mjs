import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {closeoutCiProof} from './closeout-ci-source.mjs';
import {closeoutPriorEpoch} from './closeout-source-epoch.mjs';
import {cursesPlanningFloors} from './curses-ci-planning.mjs';
import {exactSourceMatches} from './source-fingerprint.mjs';
import {integratedCiProof} from './integrated-ci-source.mjs';

const hash=source=>createHash('sha256').update(source).digest('hex');
const normalize=source=>source.replaceAll('\r\n','\n');
const historicalCloseout='pr620';
const combinedRuntime='tests/helpers/combined-epoch/source-epoch-runtime.mjs';
const preDefect='tests/helpers/combined-epoch/pre-defect-source-epoch.mjs';

// These nine #997 modules made the same two projector edits after the recorded
// runs. Each current source and original Git blob are authenticated separately.
const projectorSuccessors=Object.freeze({
 'tests/helpers/defect-final-source-epoch.mjs':['d6dabee023a3a9f8a2620c3edd1dee0b8b359aa62aff8a17b63175e170ab8b04','476369da12767a3fa49616849de2f7bfdfdd813a','38add45fd417cfc933f9a895cd3e8d89d56f591f'],
 'tests/helpers/effects-target-group-source-epoch.mjs':['c73c6b050ece8efd96775188c146e1d736561d068f61cd3e7081c74d937fc0af','83b8c00a2e777542d1d85f7cb2ec73738ee7dbbf','2ed5c82c001cacfa10400b94325e2268d2af2a56'],
 'tests/helpers/encounter-formation-source-epoch.mjs':['a044c0830309415ea3858a6368f6d794440db1f2d68b6cf3742111b03cd047c5','01594f13881717e69efafe5fd630b6684bba46b7','24a9498e6cd40bb6a420aca7fd22a93ea3504d14'],
 'tests/helpers/relic-equip-source-epoch.mjs':['b768a3e8023f0286f4aa577d1300f932567b9d731b836038dac5959e9d67ce02','9a1bbef46b8192e72a23ee6d46225d3bbc3d5822','446e1ea00dceefcd684e226c1ca3784149322a13'],
 'tests/helpers/room-ui-source-epoch.mjs':['ce50bd58037ea74976dae9e94515dfd16f91432c715ee880c00ae8080a73202e','e453983a29fa9d43aa126f69f42daf0c5c605bec','85d8c9d3f996c7996f11f5bcd0db3ec82fcb0e25'],
 'tests/helpers/seven-refactor-source-epoch.mjs':['5944f7c74d61e93fa5870281b5cc45993535c2e96c4d0014a1d5fe24baa46341','37c472bc7946cb35656cdaae7c0869a700c2b0f8','c046eb0e094a246bda6b3385c6f21e44719af9eb'],
 'tests/helpers/silent-final-source-epoch.mjs':['d31330033fd9e188d93001a55213e1c471546f6e57b3b6ec68f726c23468e35e','f1a808082b47d0d465066600a5b06fab51eeb6cb','814efdb3c3d32fc877df0bce84e3f04be4113d15'],
 'tests/helpers/silent-tactics-source-epoch.mjs':['decd2795a2b2a02ae717787dd5ae822f69191b1660464da905a641f8116930d1','4b684056f1098a93cfbaa43ee450be3c26bd5c91','a610c4ba8547602ebe4e9302e002f0dbf4c515c5'],
 'tests/helpers/watcher-flow-source-epoch.mjs':['def224824eedc945a1cb402dd0429861593f0ff08a822f1961a954bf467f3378','81e73dfc1cda2a1019daf23cd24b8cec1e167ce7','96bd259b48888b6c6bd047d3690de3d5f3a95252'],
});

function historicalProjector(path,source,digest){
 const [sha256,gitBlob,oldBlob]=projectorSuccessors[path];
 const text=strictLf(source,path);
 assert(exactSourceMatches(text,{sha256,gitBlob}),'current Curses receipt projector changed: '+path);
 const edits=[
  ['{createComposedSourceEpochProjector,createSourceEpochProjector}','{createSourceEpochProjector}'],
  ['createComposedSourceEpochProjector(proof)','createSourceEpochProjector(proof,{allowConfigLayout:true})'],
 ];
 let prior=text;
 for(const [current,older] of edits){
  assert.equal(prior.split(current).length,2,'exact #997 projector edit: '+path);
  prior=prior.replace(current,older);
 }
 assert(exactSourceMatches(prior,{sha256:digest,gitBlob:oldBlob}),'historical Curses receipt projector changed: '+path);
 return prior;
}

function strictLf(raw,path){
 assert(typeof raw==='string','missing historical Curses receipt source: '+path);
 const lf=normalize(raw);
 assert(raw===lf||raw===lf.replaceAll('\n','\r\n'),'mixed Curses receipt source line endings: '+path);
 return lf;
}

function archivedText(path,digest,read){
 const production=closeoutPriorEpoch.proof.targets[historicalCloseout].files[path];
 if(production?.sha256===digest)return production.source;
 const ciTarget=path==='scripts/lua-quality-metrics.mjs'?'pr612':historicalCloseout;
 if(closeoutCiProof.targets[ciTarget].files[path]===digest)return closeoutCiProof.records[digest];
 if(path==='package-lock.json')return integratedCiProof.files[path].current.source;
 if(path===combinedRuntime)return integratedCiProof.files[path].views.closeout.source;
 if(path===preDefect){
  // The predecessor facade retained the original combined module unchanged.
  const archive=read(new URL('./defect-final-ci-source-epoch.json.gz',import.meta.url));
  assert.equal(hash(archive),'88894fcfdcc23ba6383ea5decd456c920dc296aadde209fc58ee8406480d7f75','exact Curses prerequisite archive');
  const packed=JSON.parse(gunzipSync(archive));
  return packed.files['tests/helpers/combined-epoch/source-epoch.mjs'].beforeSource;
 }
}

// This reader authenticates only the two complete 20261111 measurement input
// sets. Historical bytes never become current product or scheduler sources.
export function historicalCursesReceiptReader(file,bytes,read=readFileSync){
 assert(Object.hasOwn(cursesPlanningFloors,file),'unknown historical Curses receipt file');
 assert.equal(hash(bytes),cursesPlanningFloors[file].sourceReceiptSha256,'exact historical Curses measurement receipt');
 const receipt=JSON.parse(bytes),expected=receipt.inputHashes;
 return (path,digest)=>{
  assert(Object.hasOwn(expected,path)&&expected[path]===digest,'unbound historical Curses receipt input: '+path);
  if(Object.hasOwn(projectorSuccessors,path))return historicalProjector(path,read(path,'utf8'),digest);
  const source=archivedText(path,digest,read)??(path.endsWith('.gz')?read(path):strictLf(read(path,'utf8'),path));
  assert.equal(hash(source),digest,'historical Curses receipt input changed: '+path);
  return source;
 };
}
