import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {entrancePredecessor,entranceReader} from './helpers/ui-entrance-source.mjs';

const path='src/lua/abyss_game_ui_menu_view.lua';
const current=readFileSync(path,'utf8').replaceAll('\r\n','\n');
const identity=source=>createHash('sha256').update(source.replaceAll('\r\n','\n')).digest('hex');
const predecessor='a8a0e37eaa4e17f3e504cf5ec21a4f8a342a127b03dde4541ab8539d2deb86bf';

test('the reviewed Act 3 menu source restores its complete predecessor in either line-ending format',()=>{
 for(const source of [current,current.replaceAll('\n','\r\n')]){
  let live=source;
  const result=entrancePredecessor(path,source,owner=>{assert.equal(owner,path);return live;});
  assert.equal(identity(result.source),predecessor);
  assert.equal(result.source.includes('\r\n'),source.includes('\r\n'));
  assert.equal(result.read(path),result.source);
  for(const drift of [source+'\n',result.source,null]){
   live=drift;
   assert.throws(()=>result.read(path),/linked owner identity: .*Act 3 ending validation/);
  }
 }
});

test('partial or unrelated Act 3 source is never projected and a warm reader rejects an older owner',()=>{
 const partial=current.replace("    if normalCampaignVictory(run) then return '三幕冒险完成' end\n",'');
 const old=entrancePredecessor(path,current,()=>current).source;
 for(const source of [partial,old,null]){
  assert.equal(entrancePredecessor(path,source,()=>assert.fail('foreign source read')).source,source);
  assert.throws(()=>entrancePredecessor(path,current,()=>source),/linked owner identity: .*Act 3 ending validation/);
 }
 const wrongPath='src/lua/abyss_game_ui_run.lua';
 assert.equal(entrancePredecessor(wrongPath,current,()=>assert.fail('unrelated source read')).source,current);
 let live=current;
 const read=entranceReader(()=>live);
 assert.equal(read(path),old);
 live=old;
 assert.throws(()=>read(path),/linked owner identity: .*Act 3 ending validation/);
});
