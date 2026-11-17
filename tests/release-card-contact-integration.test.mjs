import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync as jointRawReadFileSync,readdirSync} from 'node:fs';
import {pointerB9Read,assertPointerB9Current,pointerB9Packet} from './helpers/pointer-b9-integration.mjs';
const readFileSync=pointerB9Read('cardContact',jointRawReadFileSync,{production:true,authenticate:false});
import {createHash} from 'node:crypto';
import {discoverJs} from '../scripts/ci-shards.mjs';
import {sourceEpoch as jointSourceEpoch,pointerSourceEpoch,cardContactSourceEpoch as sourceEpoch,preReleasePc22BasicFeedbackSourceEpoch,releasePc22BasicFeedbackSourceEpoch,releaseSelectionMapSourceEpoch} from './helpers/closeout-source-epoch.mjs';
import {integrationPacket,integrationCiSource,integrationRead,integrationInventory,integrationPriorInventory,assertIntegrationRawInventory,assertReleaseIntegrationCurrent} from './helpers/release-card-contact-integration.mjs';
import {releasePc22BasicFeedbackCiPacket,assertReleasePc22BasicFeedbackExecutionGuards} from './helpers/release-pc22-basic-feedback-ci-source.mjs';
import {releaseSelectionMapCiPacket,assertReleaseSelectionMapExecutionGuards} from './helpers/release-selection-map-ci-source.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex'),norm=s=>s.replaceAll('\r\n','\n');

test('joint Release authenticates the full live production corpus and retains both immutable standalone corpora',()=>{
 const p=sourceEpoch.proof,prior=preReleasePc22BasicFeedbackSourceEpoch.proof;
 const files=['config/architecture.json',...readdirSync('src/lua').filter(p=>p.endsWith('.lua')).map(p=>'src/lua/'+p)].sort();
 assert.equal(files.length,352);assert.deepEqual(files,Object.keys(p.current).filter(path=>p.current[path]!==null).sort());
 for(const path of files)assert.equal(norm(readFileSync(path,'utf8')),p.current[path].source,path+' fresh joint source');
 for(const [name,target]of Object.entries(prior.targets))assert.deepEqual(p.targets[name],target,name+' complete immutable original target');
 assert.equal(Object.keys(prior.targets).length,64);assert.equal(Object.keys(p.targets).length,68);
 assert.equal(prior.owners.length,116);assert.equal(p.owners.length,117);
 assert.deepEqual(p.targets.releasePc22BasicFeedbackReviewed.files,releasePc22BasicFeedbackSourceEpoch.proof.current);
 assert.deepEqual(p.targets.releaseSelectionMapReviewed.files,releaseSelectionMapSourceEpoch.proof.current);
 for(const side of [releasePc22BasicFeedbackSourceEpoch,releaseSelectionMapSourceEpoch])for(const [name,target]of Object.entries(side.proof.targets))assert.deepEqual(p.targets[name],target);
 const changed=files.filter(path=>p.current[path].sha256!==prior.current[path].sha256);
 assert.deepEqual(changed,['src/lua/abyss_card_flow.lua','src/lua/abyss_game_ui_input.lua','src/lua/abyss_game_ui_view.lua']);
 const card=p.current['src/lua/abyss_card_flow.lua'].source;
 assert.equal(createHash('sha1').update(`blob ${Buffer.byteLength(card)}\0`).update(card).digest('hex'),'486b63e804f138ee7a1ba1dc8241bdf9d3b99731');
 assert(card.includes('position={flight.tx,flight.ty-(flight.stop or 0)}'));
 assert.equal(p.currentTreeCommitted,false,'historical producer commits are not relabelled as a committed joint corpus');
});

test('joint owner authorization freshly rejects every missing changed or mistyped owner and leaves foreign inputs visible',()=>{
 const p=sourceEpoch.proof,anchor='src/lua/abyss_card_flow.lua',raw=path=>readFileSync(path,'utf8'),source=norm(raw(anchor));
 for(const target of ['releasePc22BasicFeedbackPrior','releaseSelectionMapReviewed']){
  const seen=[];
  assert.equal(sourceEpoch.preCombinedSource(anchor,source,{target,readSource:path=>{seen.push(path);return raw(path);}}),p.targets[target].files[anchor].source);
  assert.deepEqual(seen,p.owners);
  for(const owner of p.owners)for(const replacement of [null,raw(owner)+'\n',Buffer.from(raw(owner))])
   assert.throws(()=>sourceEpoch.preCombinedSource(anchor,source,{target,readSource:path=>path===owner?replacement:raw(path)}),/linked owner/);
 }
 for(const input of [source+'\n',source.slice(1),null,17,Buffer.from(source),source.replaceAll('\n','\r\r\n')]){
  let calls=0;assert.equal(sourceEpoch.preCombinedSource(anchor,input,{target:'releasePc22BasicFeedbackPrior',readSource:()=>{calls++;throw Error('foreign');}}),input);assert.equal(calls,0);
 }
});

test('joint CI binds every current input, preserves both packets and never masks production or foreign drift',()=>{
 assertReleaseIntegrationCurrent();
 for(const [path,sha]of Object.entries(integrationPacket.files)){
  const source=norm(readFileSync(path,'utf8'));assert.equal(hash(source),sha,path);
  for(const side of ['pc22','selection']){
   for(const foreign of [source+'\n',source.slice(1),null,{},17])assert.equal(integrationCiSource(path,foreign,side),foreign,path);
   for(const foreignPath of ['__proto__','constructor','foreign/'+path])assert.equal(integrationCiSource(foreignPath,source,side),source);
   if(path.startsWith('src/')||path==='config/architecture.json'){
    assert.equal(integrationCiSource(path,source,side),source,'CI cannot authorize production');
    assert.equal(norm(integrationRead(side)(path,'utf8')),source,'CI reader leaves raw production authorization to the production projector');
   }
  }
  for(const mode of ['changed','missing'])assert.throws(()=>assertReleaseIntegrationCurrent((p,e)=>{
   if(p!==path)return jointRawReadFileSync(p,e);if(mode==='missing')throw Error('missing '+p);const actual=jointRawReadFileSync(p,e);return e?actual+'\n':Buffer.concat([actual,Buffer.from('\n')]);
  }),mode==='missing'?/missing/:/fresh complete integration source/);
 }
 for(const [side,packet]of [['pc22',releasePc22BasicFeedbackCiPacket],['selection',releaseSelectionMapCiPacket]]){
  const read=integrationRead(side);
  for(const [path,row]of Object.entries(packet.files))assert.equal(hash(norm(read(path,'utf8'))),row.current.sha256,path+' exact '+side+' current view');
 }
 for(const path of Object.keys(integrationPacket.archives))assert.throws(()=>assertReleaseIntegrationCurrent((p,e)=>p===path?Buffer.concat([jointRawReadFileSync(p),Buffer.from('\n')]):jointRawReadFileSync(p,e)),/immutable Release join predecessor/);
});

test('joint raw inventories retain both additions and reject missing duplicate foreign and changed inputs',()=>{
 const raw={js:discoverJs(),lua:readdirSync('tests/lua').filter(p=>p.endsWith('.lua')).map(p=>'tests/lua/'+p).sort()};
 for(const [kind,paths]of Object.entries(raw)){
  assert.deepEqual(paths,integrationInventory(kind));assertIntegrationRawInventory(paths,kind);
  for(const [side,packet]of [['pc22',releasePc22BasicFeedbackCiPacket],['selection',releaseSelectionMapCiPacket]]){
   assert.deepEqual(integrationPriorInventory(paths,side,kind),packet.currentInventory[kind]);
   const added=paths.filter(p=>!packet.currentInventory[kind].includes(p));
   if(kind==='js'||side==='selection')assert(added.length>0);
   if(added.length)assert.throws(()=>assertIntegrationRawInventory(paths.filter(p=>!added.includes(p)),kind),/raw discovery inventory/);
   for(const path of added)assert.throws(()=>integrationPriorInventory(paths,side,kind,(p,e)=>jointRawReadFileSync(p,e)+(p===path?'\n':'')),/fresh Release integration added inventory source/);
  }
  for(const bad of [[],paths.slice(1),[...paths,paths[0]],[...paths,'tests/foreign.test.mjs']])assert.throws(()=>assertIntegrationRawInventory(bad,kind),/raw discovery inventory/);
 }
 const workflow=readFileSync('.github/workflows/quality.yml','utf8');
 assertReleasePc22BasicFeedbackExecutionGuards(workflow);assertReleaseSelectionMapExecutionGuards(workflow);
});


test('actual pointer B9 joins complete exact parents without changing the four P0 owners or B9 contact flow',()=>{
 const current=jointSourceEpoch.proof;
 assert.equal(Object.keys(current.current).length,352);assert.equal(current.owners.length,122);assert.equal(Object.keys(current.targets).length,74);
 for(const prior of [pointerSourceEpoch.proof,sourceEpoch.proof])for(const [name,target]of Object.entries(prior.targets))assert.deepEqual(current.targets[name],target,name);
 assert.deepEqual(current.targets.battlePointerB9Prior.files,pointerSourceEpoch.proof.current);
 assert.deepEqual(current.targets.releaseCardContactReviewed.files,sourceEpoch.proof.current);
 for(const [path,row]of Object.entries(current.current))assert.equal(norm(jointRawReadFileSync(path,'utf8')),row.source,path);
 for(const path of ['src/lua/abyss_battle_actions.lua','src/lua/abyss_battle_action_bindings.lua','src/lua/abyss_battle_render_state.lua','src/lua/abyss_battle_target_bindings.lua'])assert.deepEqual(current.current[path],pointerSourceEpoch.proof.current[path]);
 const card=current.current['src/lua/abyss_card_flow.lua'].source;
 assert.equal(createHash('sha1').update(`blob ${Buffer.byteLength(card)}\0`).update(card).digest('hex'),'486b63e804f138ee7a1ba1dc8241bdf9d3b99731');
 assertPointerB9Current();
 for(const row of [pointerB9Packet,pointerB9Packet.parents,pointerB9Packet.files,...Object.values(pointerB9Packet.files)])assert(Object.isFrozen(row));
 const first=Object.keys(pointerB9Packet.files)[0];
 assert(Object.isFrozen(pointerB9Packet.files[first].current));assert(Object.isFrozen(pointerB9Packet.files[first].before));
 assert.throws(()=>delete pointerB9Packet.files[first],TypeError);
 assert.throws(()=>pointerB9Packet.files[first].current.sha256='f'.repeat(64),TypeError);
 assertPointerB9Current();
});

test('actual pointer B9 authenticates raw sources before either exact parent projection and fails closed on drift',()=>{
 const path='tests/helpers/closeout-source-epoch.mjs';let bad=null,missing=false;
 const read=(p,e)=>{if(p===bad){if(missing)throw Error('missing '+p);const raw=jointRawReadFileSync(p,e);return typeof raw==='string'?raw+'\n':Buffer.concat([raw,Buffer.from('\n')]);}return jointRawReadFileSync(p,e);};
 for(const side of ['pointer','cardContact']){
  const reader=pointerB9Read(side,read,{production:true});
  assert.equal(reader(path,'utf8'),pointerB9Packet.files[path].before[side].source);
  for(const owner of [...jointSourceEpoch.proof.owners,...Object.keys(pointerB9Packet.files)])for(const mode of [false,true]){
   bad=owner;missing=mode;
   const anchor=owner===path?'tests/helpers/copy-integration-source-closure.mjs':path;
   assert.throws(()=>reader(anchor,'utf8'),error=>{assert(error.message.includes(owner));return true;});bad=null;
  }
  assert.equal(reader(path,'utf8'),pointerB9Packet.files[path].before[side].source,'same reader freshly recovers');
 }
 assert.deepEqual(discoverJs(),integrationInventory('js'));
 assert.equal(discoverJs().length,881);
});


test('both public B9 side readers freshly authenticate unchanged delta paths before old historical projections',()=>{
 const paths=['scripts/noncombat-v25-layout.mjs','scripts/official-run-layout.mjs','tests/session-menu-navigation.test.mjs'];
 let changed=null;const read=(p,e)=>{const raw=jointRawReadFileSync(p,e);return p===changed?typeof raw==='string'?raw+'\n':Buffer.concat([raw,Buffer.from('\n')]):raw;};
 for(const side of ['pc22','selection'])for(const path of paths){
  const source=norm(jointRawReadFileSync(path,'utf8')),expected=integrationCiSource(path,source,side);
  if(expected===source)continue;
  let calls=0;assert.throws(()=>integrationCiSource(path,source,side,()=>{calls++;throw Error('raw unavailable');}),/raw unavailable/);assert(calls>0);
  const reader=integrationRead(side,read);assert.equal(reader(path,'utf8'),expected);
  changed='src/lua/abyss_battle_input_state.lua';assert.throws(()=>reader(path,'utf8'),/linked owner/);changed=null;
  assert.equal(reader(path,'utf8'),expected);
  calls=0;const foreign=source+'# foreign';assert.equal(integrationCiSource(path,foreign,side,()=>{calls++;throw Error('foreign read');}),foreign);assert.equal(calls,0);
 }
});
