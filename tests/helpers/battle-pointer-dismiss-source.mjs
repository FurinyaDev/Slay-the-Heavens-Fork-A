// One release-only continuation; the complete predecessor and targets are retained.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {createSourceEpochProjector} from './combined-epoch/source-epoch-runtime.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex');
const freeze=v=>{if(v&&typeof v==='object'&&!Object.isFrozen(v)){Object.values(v).forEach(freeze);Object.freeze(v);}return v;};
const bytes=readFileSync(new URL('./battle-pointer-dismiss-source.json.gz',import.meta.url));
assert.equal(hash(bytes),'6f96a2ad90170ab7571bc900109537d3097d027c4a39310894176e5b641ea13c','complete dismiss battle pointer production packet');
export const battlePointerDismissSourcePacket=freeze(JSON.parse(gunzipSync(bytes)));
export function extendBattlePointerDismissSource(original,packet=battlePointerDismissSourcePacket){
 const prior=original.proof,paths=Object.keys(packet.current).sort();
 assert.deepEqual(paths,["src/lua/abyss_battle_action_bindings.lua", "src/lua/abyss_battle_actions.lua", "src/lua/abyss_battle_render_state.lua", "src/lua/abyss_battle_target_bindings.lua"],'only the approved dismiss battle pointer owners advance');
 assert.equal(packet.schemaVersion,1);assert.equal(packet.normalization,'LF');
 assert.equal(packet.baseCommit,'ad6fe84dbcc11e28e8a82258f889a6841b46c8c6');
 assert.equal(packet.currentTreeCommitted,true);
 assert.equal(packet.currentCommit,battlePointerDismissSourcePacket.currentCommit,'exact committed dismiss battle pointer producer');
 assert.deepEqual(packet.current,battlePointerDismissSourcePacket.current,'complete approved dismiss battle pointer after bindings');
 assert.deepEqual(packet.producers,battlePointerDismissSourcePacket.producers,'exact dismiss battle pointer source producers');
 assert.deepEqual(Object.keys(packet.before).sort(),paths,'complete dismiss battle pointer before/after slice');
 assert.deepEqual(Object.keys(packet.producers).sort(),paths,'source producer for every changed owner');
 const current={...prior.current};
 for(const path of paths){
  assert.deepEqual(packet.before[path],prior.current[path],'exact complete dismiss battle pointer predecessor: '+path);
  assert.notEqual(packet.current[path].sha256,packet.before[path].sha256,'only changed dismiss battle pointer owners');
  assert.match(packet.producers[path].commit,/^[a-f0-9]{40}$/);
  for(const parent of packet.producers[path].parents)assert.match(parent,/^[a-f0-9]{40}$/);
  current[path]=packet.current[path];
 }
 const targets={...prior.targets};assert(!Object.hasOwn(targets,'battlePointerDismissPrior'));
 targets.battlePointerDismissPrior={commit:packet.baseCommit,files:prior.current};
 const owners=Object.keys(current).sort().filter(path=>Object.values(targets).some(target=>target.files[path]?.sha256!==current[path]?.sha256));
 return createSourceEpochProjector(freeze({...prior,current,targets,owners,currentTreeCommitted:true,
  currentCommit:packet.currentCommit,currentCommitRole:'exact committed dismiss battle pointer repair; official candidate and device acceptance remain independent',
  battlePointerDismissProducers:packet.producers}),{allowConfigLayout:true,reuseFrozenInput:true});
}
