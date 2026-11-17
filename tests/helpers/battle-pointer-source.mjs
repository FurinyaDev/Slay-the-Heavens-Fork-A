// One release-only continuation; the complete predecessor and targets are retained.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {createSourceEpochProjector} from './combined-epoch/source-epoch-runtime.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex');
const freeze=v=>{if(v&&typeof v==='object'&&!Object.isFrozen(v)){Object.values(v).forEach(freeze);Object.freeze(v);}return v;};
const bytes=readFileSync(new URL('./battle-pointer-source.json.gz',import.meta.url));
assert.equal(hash(bytes),'c6ed821e15ab4e79de278db32122712c07716360166c995a6bf0f7a70c11639a','complete battle pointer production packet');
export const battlePointerSourcePacket=freeze(JSON.parse(gunzipSync(bytes)));
export function extendBattlePointerSource(original,packet=battlePointerSourcePacket){
 const prior=original.proof,paths=Object.keys(packet.current).sort();
 assert.deepEqual(paths,["src/lua/abyss_battle_action_bindings.lua","src/lua/abyss_battle_card_bindings.lua","src/lua/abyss_battle_card_gestures.lua","src/lua/abyss_battle_details.lua","src/lua/abyss_battle_input_state.lua","src/lua/abyss_battle_potion_bindings.lua","src/lua/abyss_battle_target_bindings.lua","src/lua/abyss_battle_ui.lua"],'only the approved battle pointer owners advance');
 assert.equal(packet.schemaVersion,1);assert.equal(packet.normalization,'LF');
 assert.equal(packet.baseCommit,'33d71575c5f186a1b54f7bf3e4f1826c145aa1d9');
 assert.equal(packet.currentTreeCommitted,true);
 assert.equal(packet.currentCommit,battlePointerSourcePacket.currentCommit,'exact committed battle pointer producer');
 assert.deepEqual(packet.current,battlePointerSourcePacket.current,'complete approved battle pointer after bindings');
 assert.deepEqual(packet.producers,battlePointerSourcePacket.producers,'exact battle pointer source producers');
 assert.deepEqual(Object.keys(packet.before).sort(),paths,'complete battle pointer before/after slice');
 assert.deepEqual(Object.keys(packet.producers).sort(),paths,'source producer for every changed owner');
 const current={...prior.current};
 for(const path of paths){
  assert.deepEqual(packet.before[path],prior.current[path],'exact complete battle pointer predecessor: '+path);
  assert.notEqual(packet.current[path].sha256,packet.before[path].sha256,'only changed battle pointer owners');
  assert.match(packet.producers[path].commit,/^[a-f0-9]{40}$/);
  for(const parent of packet.producers[path].parents)assert.match(parent,/^[a-f0-9]{40}$/);
  current[path]=packet.current[path];
 }
 const targets={...prior.targets};assert(!Object.hasOwn(targets,'battlePointerPrior'));
 targets.battlePointerPrior={commit:packet.baseCommit,files:prior.current};
 const owners=Object.keys(current).sort().filter(path=>Object.values(targets).some(target=>target.files[path]?.sha256!==current[path]?.sha256));
 return createSourceEpochProjector(freeze({...prior,current,targets,owners,currentTreeCommitted:true,
  currentCommit:packet.currentCommit,currentCommitRole:'exact committed battle pointer repair; official candidate and device acceptance remain independent',
  battlePointerProducers:packet.producers}),{allowConfigLayout:true,reuseFrozenInput:true});
}
