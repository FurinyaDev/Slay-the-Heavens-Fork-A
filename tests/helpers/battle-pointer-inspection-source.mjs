// One release-only continuation; the complete predecessor and targets are retained.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {createSourceEpochProjector} from './combined-epoch/source-epoch-runtime.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex');
const freeze=v=>{if(v&&typeof v==='object'&&!Object.isFrozen(v)){Object.values(v).forEach(freeze);Object.freeze(v);}return v;};
const bytes=readFileSync(new URL('./battle-pointer-inspection-source.json.gz',import.meta.url));
assert.equal(hash(bytes),'647685ce68d914a68ea5308308cebe8c0f6ceeefbca2a3698db04e4640dd48f6','complete inspection battle pointer production packet');
export const battlePointerInspectionSourcePacket=freeze(JSON.parse(gunzipSync(bytes)));
export function extendBattlePointerInspectionSource(original,packet=battlePointerInspectionSourcePacket){
 const prior=original.proof,paths=Object.keys(packet.current).sort();
 assert.deepEqual(paths,["src/lua/abyss_battle_input_state.lua", "src/lua/abyss_battle_target_bindings.lua"],'only the approved inspection battle pointer owners advance');
 assert.equal(packet.schemaVersion,1);assert.equal(packet.normalization,'LF');
 assert.equal(packet.baseCommit,'82b1a114ca486140ae913cca6a0834cab52417cb');
 assert.equal(packet.currentTreeCommitted,true);
 assert.equal(packet.captureBase,'5a4ea961c878e688f609528cbc1ee7868e6316f5');
 assert.equal(packet.currentCommit,battlePointerInspectionSourcePacket.currentCommit,'exact committed inspection battle pointer producer');
 assert.deepEqual(packet.current,battlePointerInspectionSourcePacket.current,'complete approved inspection battle pointer after bindings');
 assert.deepEqual(packet.producers,battlePointerInspectionSourcePacket.producers,'exact inspection battle pointer source producers');
 assert.deepEqual(Object.keys(packet.before).sort(),paths,'complete inspection battle pointer before/after slice');
 assert.deepEqual(Object.keys(packet.producers).sort(),paths,'source producer for every changed owner');
 const current={...prior.current};
 for(const path of paths){
  assert.deepEqual(packet.before[path],prior.current[path],'exact complete inspection battle pointer predecessor: '+path);
  assert.notEqual(packet.current[path].sha256,packet.before[path].sha256,'only changed inspection battle pointer owners');
  assert.match(packet.producers[path].commit,/^[a-f0-9]{40}$/);
  for(const parent of packet.producers[path].parents)assert.match(parent,/^[a-f0-9]{40}$/);
  current[path]=packet.current[path];
 }
 const targets={...prior.targets};assert(!Object.hasOwn(targets,'battlePointerInspectionPrior'));
 targets.battlePointerInspectionPrior={commit:packet.baseCommit,files:prior.current};
 const owners=Object.keys(current).sort().filter(path=>Object.values(targets).some(target=>target.files[path]?.sha256!==current[path]?.sha256));
 return createSourceEpochProjector(freeze({...prior,current,targets,owners,currentTreeCommitted:true,
  currentCommit:packet.currentCommit,currentCommitRole:'exact committed inspection battle pointer repair; official candidate and device acceptance remain independent',
  battlePointerInspectionProducers:packet.producers}),{allowConfigLayout:true,reuseFrozenInput:true});
}
