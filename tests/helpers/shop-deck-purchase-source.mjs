import assert from 'node:assert/strict';
import { exactSourceMatches } from './source-fingerprint.mjs';
import { restoreExactFixtureHunks } from './exact-fixture-hunks.mjs';

// #964 changed the live purchase behavior. Historical owners still read the
// exact parent of 547127993c1515b96484b31c617508f3cdcea2f2.
export const shopPurchaseOwner='src/lua/abyss_shop_selection.lua';
const purchase={
 path:shopPurchaseOwner,
 beforeSha256:'f4ae6326c2381802bd799e89b3d0de20419d2e66b73cce587d0c289a228c3446',
 afterSha256:'04d443a3cef79ac082bb006dc207f8379378f687da58ed2bb1297ac32a95024a',
 beforeBlob:'01374c99cf0f68a9ff962b7d2503d431ddf2c806',
 afterBlob:'9377813b2e083b5126c7fe3aa7ee562fe2a2d5ce',
 hunks:[{
  at:105,
  before:"        return mobile() and category~='cards' and not offer.sold and not offer.unavailable",
  after:"        return mobile() and category=='relics' and not offer.sold and not offer.unavailable",
 },{
  at:117,
  before:'            if self.selected and self.selected.key == key then self.selected = nil else self.selected = q end',
  after:[
   "            if category=='potions' and not mobile() then",
   '                self.selected = nil',
   '                return q.handler()',
   '            end',
   "            if category~='potions' and self.selected and self.selected.key==key then",
   '                self.selected = nil',
   '            else',
   '                self.selected = q',
   '            end',
  ].join('\n'),
 }],
};

export function beforeShopPurchaseOwner(path,source){
 if(path!==shopPurchaseOwner)return source;
 const lf=typeof source==='string'&&source.replaceAll('\r\n','\n');
 assert(lf&&(source===lf||source===lf.replaceAll('\n','\r\n'))&&
  exactSourceMatches(lf,{sha256:purchase.afterSha256,gitBlob:purchase.afterBlob}),
  'fresh reviewed #964 purchase owner: '+path);
 const prior=restoreExactFixtureHunks(purchase,path,lf);
 assert(exactSourceMatches(prior,{sha256:purchase.beforeSha256,gitBlob:purchase.beforeBlob}),
  'exact #964 purchase predecessor: '+path);
 return source===lf?prior:prior.replaceAll('\n','\r\n');
}
