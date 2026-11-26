import assert from 'node:assert/strict';
import {exactSourceMatches} from './source-fingerprint.mjs';

// These are exact successor edits from the deck wording backflow and #989.
// Only the historical Run HUD reader uses their predecessors.
const runHudSuccessors={
 'scripts/deck-ui-layout.mjs':{
  after:{sha256:'fb8ca6270444a5eaed5fff5ce797b469b01ff53e882a40c13c85374890921b06',gitBlob:'22359b12e6164a4fde5ae9302eef823b5df257dd'},
  before:{sha256:'fac26c8413f7aa98e7d20f44077fb2f05c984ce9bb5b2f82408795e7c8533325',gitBlob:'9a7f5a8d21fa581fa82d9bfa2c164f81eade02cd'},
  from:"button('upgradePreview', l.deckView.upgradePreview, '查看升级')",
  to:"button('upgradePreview', l.deckView.upgradePreview, '升级预览')",
 },
 'scripts/official-battle-hud.mjs':{
  after:{sha256:'af6ffdb50e11d77cf9c2046931f3e455d3bc780fcde9b265fd003d33b1c07a9b',gitBlob:'9956f4ded7b99023522ffc3f59b49b11b1916e85'},
  before:{sha256:'0f1bffb971994975b2444b1eaddaa72cbdde0c322c7efb2d0676c91edca961f6',gitBlob:'2f5aca62e1b0ffb0e81029812fc913a332d58166'},
  from:"   {name:'icon',kind:'image',position:[0,0],size:[28,28],image:theme.icon.map,colour:'#D6CBA5'},",
  to:"  text('label',[0,0],hud.route.slice(2),'地图',18,'#D6CBA5'),",
 },
 'tests/official-run-chrome.test.mjs':{
  after:{sha256:'87fc525fbd0690029b8c32ec37f48c26ca80241bfce13dbe11a39c3659fafb74',gitBlob:'fcdd143c84f896d09c680704d1e136d9f1da5788'},
  before:{sha256:'103c3636971c6ae45db27f50c856519f5b112f39090d47af1fd5520d6f00c1d4',gitBlob:'7e971288467c5075bd2eaedafa9b03cd6e583412'},
  from:[
   " const battleRoute=child(child(child(layout,'battlePanel'),'topBar'),'battleRoute');",
   " const icon=child(battleRoute,'icon');",
   " assert.equal(icon.kind,'image');",
   ' assert.equal(icon.image,theme.icon.map);',
   " assert.deepEqual(child(route,'icon'),icon);",
   " assert(![route,battleRoute].some(shortcut=>shortcut.children.some(part=>part.kind==='text')));",
  ].join('\n'),
  to:" assert.equal(child(route,'label').text.content,'地图');",
 },
};
function beforeRunHudSuccessor(path,source){
 if(!Object.hasOwn(runHudSuccessors,path))return source;
 const {before,after,from,to}=runHudSuccessors[path];
 if(typeof source!=='string')return source;
 const lf=source.replaceAll('\r\n','\n');
 if((source!==lf&&source!==lf.replaceAll('\n','\r\n'))||!exactSourceMatches(lf,after))return source;
 assert.equal(lf.split(from).length,2,'exact Run HUD successor edit: '+path);
 const prior=lf.replace(from,()=>to);
 assert(exactSourceMatches(prior,before),'exact Run HUD predecessor: '+path);
 return source===lf?prior:prior.replaceAll('\n','\r\n');
}

export function beforeRunHudMapIcon(path,source){
 return path==='scripts/deck-ui-layout.mjs'?source:beforeRunHudSuccessor(path,source);
}

export function beforeRunHudDeckLabel(source){
 return beforeRunHudSuccessor('scripts/deck-ui-layout.mjs',source);
}
