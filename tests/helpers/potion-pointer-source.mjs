// Exact product union. CI identity and official device acceptance remain separate.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createSourceEpochProjector} from './combined-epoch/source-epoch-runtime.mjs';
const bytes=readFileSync(new URL('./potion-pointer-product-bindings.json',import.meta.url));
const hash=s=>createHash('sha256').update(s).digest('hex');
assert.equal(hash(bytes),'016c3f5095a8556c00b940e72c2f44472dbf481ab0f9dd32511342781c29390e','immutable combined product bindings');
const merged=JSON.parse(bytes);
const freeze=v=>{if(v&&typeof v==='object'&&!Object.isFrozen(v)){Object.values(v).forEach(freeze);Object.freeze(v);}return v;};
export function extendPotionPointerUnion(potion,pointer,base){
 const p=potion.proof,t=pointer.proof,b=base.proof,current={};
 const paths=Object.keys(p.current).sort();
 assert.deepEqual(paths,Object.keys(t.current).sort(),'complete equal production domains');
 assert.deepEqual(paths,Object.keys(b.current).sort(),'complete common production domain');
 for(const path of paths){
  const left=p.current[path],right=t.current[path],before=b.current[path];
  if(left?.sha256===right?.sha256)current[path]=left;
  else if(left?.sha256===before?.sha256)current[path]=right;
  else if(right?.sha256===before?.sha256)current[path]=left;
  else {assert(Object.hasOwn(merged,path),'only declared three-way product conflicts');current[path]=merged[path];}
 }
 const targets={...p.targets};
 for(const [name,target]of Object.entries(t.targets)){
  if(Object.hasOwn(targets,name))assert.deepEqual(targets[name],target,'shared historical domain: '+name);
  else targets[name]=target;
 }
 targets.potionBeforePointerUnion={commit:'eabff9b0bf2cce17ae05913c0e5d47366d0ff173',files:p.current};
 targets.pointerBeforePotionUnion={commit:'ad6fe84dbcc11e28e8a82258f889a6841b46c8c6',files:t.current};
 const owners=paths.filter(path=>Object.values(targets).some(target=>target.files[path]?.sha256!==current[path]?.sha256));
 return createSourceEpochProjector(freeze({...p,current,targets,owners,currentCommit:'9b9e0a2eab4c3fa0783eb7e0f6b69389146bd8b3',currentTreeCommitted:true,currentCommitRole:'committed product-only potion/pointer union; CI and device acceptance not claimed',pointerUnionPredecessor:t.currentCommit}),{allowConfigLayout:true,reuseFrozenInput:true});
}
