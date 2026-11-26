import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {chapterBattleSceneReader,beforeCardReadingScope} from '../../tests/helpers/chapter-battle-scene-source.mjs';
import {reviewedSelectionRead} from '../../tests/helpers/reviewed-selection-current-source.mjs';
import {chapterEvidenceCurrentRead} from '../../tests/helpers/fork-preflight-source.mjs';
const [base]=process.argv.slice(2);
const owners=['src/lua/abyss_battle_card_layout.lua','src/lua/abyss_battle_card_view.lua','src/lua/abyss_battle_ui.lua','src/lua/abyss_viewport.lua','tests/lua/selected_hand_safe_area.lua'];
const old=new Map(owners.map(owner=>[owner,execFileSync('git',['show',`${base}:${owner}`],{encoding:'utf8'})]));
const current=owner=>readFileSync(owner,'utf8');
const fixture=record=>owner=>record.get(owner)??current(owner);
const readCurrent=chapterEvidenceCurrentRead(current);
for(const owner of owners){
 const stale=fixture(new Map([[owner,old.get(owner)]]));
 assert.throws(()=>chapterEvidenceCurrentRead(stale), /fresh complete integration source/);
 assert.equal(readCurrent(owner,'utf8'),current(owner));
 assert.equal(beforeCardReadingScope(owner,current(owner)),old.get(owner));
 const raw=chapterEvidenceCurrentRead(path=>current(path).replaceAll('\n','\r\n'));
 assert.equal(raw(owner,'utf8'),current(owner).replaceAll('\n','\r\n'));
 const mixed=current(owner).replace('\n','\r\n');
 assert.throws(()=>chapterEvidenceCurrentRead(path=>path===owner?mixed:current(path)), /fresh complete integration source/);
 assert.throws(()=>chapterBattleSceneReader(owner,stale(owner),stale), /changed during card reading validation/);
 console.log('REJECT single old/mixed current',owner);
}
const [layout,view,ui,viewport]=owners;
const history=chapterBattleSceneReader(layout,old.get(layout),fixture(old));
assert.notEqual(history.source,old.get(layout));
assert.notEqual(history.read(view,'utf8'),old.get(view));
console.log('ACCEPT complete original historical cohort');
for(const [main,related] of [[layout,view],[view,layout],[ui,viewport]]){
 let active=fixture(new Map());
 const linked=chapterBattleSceneReader(main,current(main),path=>active(path));
 assert.notEqual(linked.read(related,'utf8'),current(related));
 active=fixture(new Map([[related,old.get(related)]]));
 assert.throws(()=>linked.read(related,'utf8'),/changed during card reading validation/);
 assert.throws(()=>chapterBattleSceneReader(main,current(main),fixture(new Map([[main,old.get(main)]]))),/changed during card reading validation/);
 console.log('REJECT crossed candidate reads',main,related);
}
assert.equal(typeof reviewedSelectionRead()(viewport,'utf8'),'string');
assert.throws(()=>reviewedSelectionRead(fixture(new Map([[viewport,old.get(viewport)]])))(viewport,'utf8'),/fresh complete integration source/);
console.log('REJECT stale current Selection viewport');
