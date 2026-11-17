// One release-only continuation; the complete predecessor and targets are retained.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {createSourceEpochProjector} from './combined-epoch/source-epoch-runtime.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex');
const freeze=v=>{if(v&&typeof v==='object'&&!Object.isFrozen(v)){Object.values(v).forEach(freeze);Object.freeze(v);}return v;};
const bytes=readFileSync(new URL('./battle-pointer-sparse-source.json.gz',import.meta.url));
assert.equal(hash(bytes),'789e74619b3ce005e0e9ebe75885fb2d8a71799dae5b98acc70a31ba87284518','complete sparse battle pointer production packet');
export const battlePointerSparseSourcePacket=freeze(JSON.parse(gunzipSync(bytes)));
export function extendBattlePointerSparseSource(original,packet=battlePointerSparseSourcePacket){
 const prior=original.proof,paths=Object.keys(packet.current).sort();
 assert.deepEqual(paths,["src/lua/abyss_battle_card_bindings.lua"],'only the approved sparse battle pointer owners advance');
 assert.equal(packet.schemaVersion,1);assert.equal(packet.normalization,'LF');
 assert.equal(packet.baseCommit,'2bc0d126e74d518664b6719274448624a1c67121');
 assert.equal(packet.currentTreeCommitted,true);
 assert.equal(packet.currentCommit,battlePointerSparseSourcePacket.currentCommit,'exact committed sparse battle pointer producer');
 assert.deepEqual(packet.current,battlePointerSparseSourcePacket.current,'complete approved sparse battle pointer after bindings');
 assert.deepEqual(packet.producers,battlePointerSparseSourcePacket.producers,'exact sparse battle pointer source producers');
 assert.deepEqual(Object.keys(packet.before).sort(),paths,'complete sparse battle pointer before/after slice');
 assert.deepEqual(Object.keys(packet.producers).sort(),paths,'source producer for every changed owner');
 const current={...prior.current};
 for(const path of paths){
  assert.deepEqual(packet.before[path],prior.current[path],'exact complete sparse battle pointer predecessor: '+path);
  assert.notEqual(packet.current[path].sha256,packet.before[path].sha256,'only changed sparse battle pointer owners');
  assert.match(packet.producers[path].commit,/^[a-f0-9]{40}$/);
  for(const parent of packet.producers[path].parents)assert.match(parent,/^[a-f0-9]{40}$/);
  current[path]=packet.current[path];
 }
 const targets={...prior.targets};assert(!Object.hasOwn(targets,'battlePointerSparsePrior'));
 targets.battlePointerSparsePrior={commit:packet.baseCommit,files:prior.current};
 const owners=Object.keys(current).sort().filter(path=>Object.values(targets).some(target=>target.files[path]?.sha256!==current[path]?.sha256));
 return createSourceEpochProjector(freeze({...prior,current,targets,owners,currentTreeCommitted:true,
  currentCommit:packet.currentCommit,currentCommitRole:'exact committed sparse battle pointer repair; official candidate and device acceptance remain independent',
  battlePointerSparseProducers:packet.producers}),{allowConfigLayout:true,reuseFrozenInput:true});
}
