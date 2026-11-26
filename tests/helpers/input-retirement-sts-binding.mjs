// Fixed StS runner trust leaf, outside the archive and its copy closure.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {beforeMergedInputRetirement} from './input-retirement-source.mjs';
import {restoreExactFixtureHunks} from './exact-fixture-hunks.mjs';
import {exactSourceMatches} from './source-fingerprint.mjs';
import {beforeNativeFlowFixture} from './native-flow-fixture-source.mjs';
import {beforeCurrentOfficialRuntimeFixture} from './sts-fade-ci-source.mjs';

const archive=readFileSync(new URL('./input-retirement-merged-sts-source.json.gz',import.meta.url));
assert.equal(createHash('sha256').update(archive).digest('hex'),'0c8455ee5877bbb5c4c2fa9e8c2dfb5bfba9cb7e6c388bf1c67f149ac53ca960');
const integration=JSON.parse(gunzipSync(archive));
assert.equal(integration.base,'392fae8d8dee2bd57829dda0e8da836f45107398');
assert.equal(integration.path,'tests/integration-source-epoch.test.mjs');
assert(exactSourceMatches(integration.before.source,integration.before),'exact protected StS integration source');

function beforeArchiveStorageLedger(source){
 let current=source;
 // #857 and #869 add provenance that was absent in the archived StS view.
 if(exactSourceMatches(current,{
  sha256:'5ec27c5274a512ccdf2dfb183f65bd15321c87883e3e4e633e6502f726429353',gitBlob:'dcd99bd13cf06653847b5ca8eb76748c229f17a4',
 })){
  current=current.replaceAll('\r\n','\n');
  for(const [first,after] of [
   ['native-event-illustrations','deck-browser-host-evidence'],
   ['data/presentation/event-native-controls.json','docs/evidence/deck-pages-20261122/visual/develop-first-open.png'],
  ]){
   const start=current.indexOf(`    "${first}": {\n`),end=current.indexOf(`    "${after}": {\n`);
   assert(start>=0&&end>start,'exact current asset ledger continuation: '+first);
   current=current.slice(0,start)+current.slice(end);
  }
 }
 assert(exactSourceMatches(current,{
  sha256:'1d33f53a8ae76990456e0829980be613201a8bde6502593013bb928768a9627c',gitBlob:'23e19be19acbca290bdad08d71f2e111b1143f1e',
 }),'fresh composed input-retirement asset ledger');
 const text=current.replaceAll('\r\n','\n');
 const start=text.indexOf('    "tests/fixtures/integration-ci-epochs.json.gz": {\n');
 const end=text.indexOf('    "docs/evidence/sts-selection-fade-20261121/after-selection.png": {\n');
 assert(start>=0&&end>start,'exact replay-storage ledger records');
 const prior=text.slice(0,start)+text.slice(end);
 assert(exactSourceMatches(prior,{
  sha256:'7f45838670611c4c526d35cb0bb556a7f2ef0cd1e18677ba917906409a5979cb',gitBlob:'b0cca00488f9054dc880841eed6b87ac9a48560c',
 }),'exact protected input-retirement asset ledger');
 return source.includes('\r\n')?prior.replaceAll('\n','\r\n'):prior;
}

// Bridge only the reviewed Windows map test to the existing retirement receipt.
export function beforeMapNodeVisualsLineEndings(path,source){
 if(path!=='tests/map-node-visuals.test.mjs'||!exactSourceMatches(source,{
  sha256:'17005e15d5036d841de485e62cf942f38d157329216d4c5e1c1ddb0661f3464a',gitBlob:'872cbc85761229b50769311d04e3a6a43aacbdf0',
 }))return source;
 const current=source.replaceAll('\r\n','\n');
 const target="  const toCrlf = value => value.replace(/\\r?\\n/g, '\\r\\n');\n  const expected = source.includes('\\r\\n') ? toCrlf(previous) : previous;\n  assert.equal(authenticateDevelopBackflow(path, source, readOwner), expected);\n  assert.equal(authenticateDevelopBackflow(path, toCrlf(source), readOwner), toCrlf(previous));\n";
 const original="  assert.equal(authenticateDevelopBackflow(path, source, readOwner), previous);\n  assert.equal(authenticateDevelopBackflow(path, source.replaceAll('\\n', '\\r\\n'), readOwner), previous.replaceAll('\\n', '\\r\\n'));\n";
 assert.equal(current.split(target).length,2,'unique reviewed map line-ending hunk');
 const prior=current.replace(target,()=>original);
 assert(exactSourceMatches(prior,{
  sha256:'f373b9803c6b7afe2a0c79298d4ebd711e0110fe0574cb480bfb690532fef65d',gitBlob:'4012d6c8045290d7613dcad794e06a45f8454423',
 }),'exact input-retirement map fixture predecessor');
 return source.includes('\r\n')?prior.replaceAll('\n','\r\n'):prior;
}

// Runtime tests keep the updated live contracts. Only the StS archive reader
// projects the exact reviewed test successors back to their original bytes.
const runtimeFixtureSuccessors = [
 {
  "path": "tests/art-feature-flags-runtime.test.mjs",
  "afterSha256": "829838455b61faf4edd163a3db71a6816ef61c75c55489d32bd42fcccb4e4614",
  "beforeSha256": "5fd7d8a4a86cc2e1129f1d11bbf4fffbb2adb71943009cd849d4f68f4f29bc1b",
  "hunks": [
   {
    "at": 19,
    "before": " modules={abyss_ui_profile={schemaVersion=1,nativePageLifecycle=false},abyss_monster_actor_binding={templateIndex=31,containerTemplateIndex=32,powerTemplateIndex=33,enabled=true},abyss_art_features=config,abyss_data={},abyss_presentation={},abyss_theme={sound={}},\n  -- This fixture substitutes GameUI itself; provide its page-intent boundary too.",
    "after": " modules={abyss_ui_profile={schemaVersion=1,nativePageLifecycle=false},abyss_monster_actor_binding={templateIndex=31,containerTemplateIndex=32,powerTemplateIndex=33,enabled=true},abyss_art_features=config,abyss_data={},abyss_presentation={},abyss_theme={sound={}},\n  -- The standard UI build emits this binding even when no browser template is installed.\n  abyss_deck_browser_binding={templateIndex=0,parts={}},\n  -- This fixture substitutes GameUI itself; provide its page-intent boundary too."
   },
   {
    "at": 50,
    "before": " assert(load(ENTRY))();OnStart();assert(updates and views==1,'art availability must not disable GameUI')\n assert(componentParams==1,'comparison switch must be read once with its registered default off')",
    "after": " assert(load(ENTRY))();OnStart();assert(updates and views==1,'art availability must not disable GameUI')\n assert(requested.abyss_deck_browser_binding==1 and options.deckBrowser==nil,\n  'the generated default binding must be loaded once without activating the native deck browser')\n assert(componentParams==1,'comparison switch must be read once with its registered default off')"
   },
   {
    "at": 98,
    "before": "end\n`));",
    "after": "end\n`));\ntest('missing mandatory deck browser binding fails closed before GameUI attaches',()=>vm(setup+`\nlocal messages={}\nprint=function(message)messages[#messages+1]=message end\nlocal ok=pcall(start,snapshot(),function(m)m.abyss_deck_browser_binding=nil end)\nassert(not ok and updates==false and views==0,'missing browser binding must not start GameUI')\nassert(requested.abyss_deck_browser_binding==1,'the missing binding must be consulted exactly once')\nassert(table.concat(messages,'|'):find('missing abyss_deck_browser_binding',1,true),'startup must report the missing module')\n`));"
   }
  ]
 },
 {
  "path": "tests/event-option-rim-clipping.test.mjs",
  "afterSha256": "a354c46d56ac029cdb54ccb499ded7b2fc491f883c41842cd4636ecf15d25890",
  "beforeSha256": "cc7b1ad3322f7bc7516e6ec168b1b75ae312f849d916ed91984913986bbfc726",
  "hunks": [
   {
    "at": 48,
    "before": "  assert.equal(child(row,'border').visible,false);\n  assert(parts.indexOf(material)<parts.indexOf(child(row,'title')));\n  assert.deepEqual(material.anchor,{min:[0,0],max:[1,1]});\n  assert.deepEqual(child(material,'cloth').size,[-4,-4]);\n  for(const layer of material.children){\n   assert.equal(layer.children.length,6);\n   assert.equal(layer.children.filter(part=>part.image===100002).length,4);\n   assert(layer.children.every(part=>part.raycastTarget===false));\n  }",
    "after": "  assert.equal(child(row,'border').visible,false);\n  for(const name of ['title','description','hit'])assert(parts.indexOf(material)<parts.indexOf(child(row,name)),'material stays behind live '+name);\n  assert.deepEqual(material.anchor,{min:[0,0],max:[1,1]});\n  assert.deepEqual(child(material,'cloth').size,[-4,-4]);\n  assert.deepEqual(children(material).map(layer=>layer.name),['rim','cloth']);\n  for(const layer of children(material)){\n   const layerParts=children(layer);\n   assert.deepEqual(layerParts.map(part=>part.name).sort(),\n    ['corner-1_-1','corner-1_1','corner1_-1','corner1_1','horizontal','vertical']);\n   for(const part of layerParts){\n    assert.equal(part.image,part.name.startsWith('corner')?theme.image.disc:theme.image.rect,layer.name+'/'+part.name);\n    assert.equal(part.raycastTarget,false);\n   }\n  }"
   }
  ]
 }
];

// #820, #877 and the recovered enemy reader each changed this live test.
// The original StS inventory still authenticates the fixture from #661.
const enemyStatusFixture='tests/enemy-status-hand-clearance.test.mjs';
const enemyStatusContinuations=[
 {
  "after": {
   "sha256": "1bedfb69d287476ba4bef9e5bb040fa6f2e0c977427fa91ee70aa05dfebfd232",
   "gitBlob": "e162e4a75211b80296b7e6111bc00dfdb0ecb25a"
  },
  "before": {
   "sha256": "913b331159bf9c97f73246977e521a70658c2b28d445fa58965710c0675eeb7b",
   "gitBlob": "3b03dedbc3bba278046a29a093404be7e9ce97a9"
  },
  "hunks": [
   {
    "at": 23,
    "before": "local host,root=F.fixture(nil,nil,nil,nil,nil,nil,{position=function()return px,py end,touchScreen=function()return touch end})",
    "after": "local cursor={CursorEnter='enter',CursorExit='exit',CursorDown='down',CursorUp='up'}\nlocal host,root=F.fixture(nil,nil,nil,cursor,nil,nil,{position=function()return px,py end,touchScreen=function()return touch end})"
   },
   {
    "at": 48,
    "before": "end",
    "after": "end\nlocal function openReader(hit,actor)\n if touch then\n  local event={touchId=90}\n  hit.listeners.down(event);hit.listeners.up(event);hit.listeners.click(event)\n else\n  hit.listeners.click()\n  assert(not host.battleUI.info,'a bare desktop click must not open a reader')\n  hit.listeners.enter()\n end\n local info=assert(host.battleUI.info,'native reader did not open')\n assert(info.source==hit and info.actor==actor and info.transient==not touch,'native reader lost its input owner')\n return info\nend\nlocal function closeReader(hit)\n if touch then panel:GetChild('statusDismiss').click({touchId=91}) else hit.listeners.exit() end\n assert(not host.battleUI.info and not panel:GetChild('statusInfo').visible,'native reader stayed open after dismissal')\nend\nlocal function readerText(info)\n local text={}\n local status=panel:GetChild('statusInfo')\n local tips=status:GetChild('powerTips')\n for page=1,info.pages do\n  if page>1 then info.page=page;host.battleUI:renderDetailsOnly()end\n  assert(status.visible and tips.visible,'status content is not visible')\n  for i=1,Theme.layout.powerTips.rows do\n   local tip=tips:GetChild('tip'..i)\n   if tip.visible then text[#text+1]=tip:GetChild('copy').text end\n  end\n end\n return table.concat(text,'\\\\n')\nend"
   },
   {
    "at": 117,
    "before": "   if entry.id=='strength' then hit.click();assert(host.battleUI.info and host.battleUI.info.statusId=='strength','power detail lost native identity');host.battleUI.info=nil end",
    "after": "   if entry.id=='strength' then\n    assert(openReader(hit,actor).statusId=='strength','power detail lost native identity')\n    closeReader(hit)\n   end"
   },
   {
    "at": 123,
    "before": "    assert(count.text=='+'..(#entries-layout.columns*layout.rows+1),'more count omitted a real status')\n    hit.click();assert(host.battleUI.info and not host.battleUI.info.statusId,'more must open the existing complete status view')\n    local text={}\n    local function collect(control)\n     if not control.visible then return end\n     text[#text+1]=control.text or'';for _,child in pairs(control.children)do collect(child)end",
    "after": "    local firstHidden=layout.columns*layout.rows\n    assert(count.text=='+'..(#entries-firstHidden+1),'more count omitted a real status')\n    local info=openReader(hit,actor)\n    assert(not info.statusId and info.offset==firstHidden,'more must start at the first overflowed status')\n    local more=readerText(info)\n    for i,status in ipairs(entries)do\n     assert(pool:find(status.id),'overflow removed native source membership')\n     if i>=firstHidden then assert(more:find(status.name,1,true),'overflow detail lost '..status.id)end"
   },
   {
    "at": 132,
    "before": "    for page=1,host.battleUI.info.pages do\n     host.battleUI.info.page=page;host.battleUI:render();collect(panel:GetChild('statusInfo'))\n    end\n    local all=table.concat(text,'\\\\n')\n    for _,status in ipairs(entries)do assert(pool:find(status.id),'overflow removed native source membership');assert(all:find(status.name,1,true),'complete status detail lost '..status.id)end\n    host.battleUI.info=nil",
    "after": "    closeReader(hit)\n    local overview=box:GetChild('hpHit')\n    info=openReader(overview,actor)\n    assert(not info.statusId and not info.offset,'HP must open the complete status overview')\n    local all=readerText(info)\n    for _,status in ipairs(entries)do assert(all:find(status.name,1,true),'complete status detail lost '..status.id)end\n    closeReader(overview)"
   }
  ]
 },
 {
  "after": {
   "sha256": "913b331159bf9c97f73246977e521a70658c2b28d445fa58965710c0675eeb7b",
   "gitBlob": "3b03dedbc3bba278046a29a093404be7e9ce97a9"
  },
  "before": {
   "sha256": "8ea1f7b59d006682590f350c88814d4a37335044cb137ee468472c246acf335d",
   "gitBlob": "b57c1e09001ac4d13f11e57e7e357cd3f8dd6694"
  },
  "hunks": [
   {
    "at": 48,
    "before": "local function check(state,twoRows)",
    "after": "local function check(state,expectedRows)"
   },
   {
    "at": 54,
    "before": "  local intent=box:GetChild('intent')",
    "after": "  local portrait,hpBorder=box:GetChild('portrait'),box:GetChild('hpBorder')\n  local feet=portrait.y-portrait.sizeDeltaY/2\n  assert(hpBorder.y+hpBorder.sizeDeltaY/2<feet,'HP bar overlaps portrait: '..actor.definitionId)\n  assert(hp.y+Theme.font.small/2<feet,'HP digits overlap portrait: '..actor.definitionId)\n  if actor.block>0 then\n   local fill,block=box:GetChild('hpFill'),box:GetChild('blockIcon')\n   assert(block.visible and block.x<fill.x-fill.sizeDeltaX/2,'block must stay left of HP')\n   assert(math.abs(block.y-fill.y-4*g.sourceScale)<.00001,'block must move with HP')\n  end\n  local intent=box:GetChild('intent')"
   },
   {
    "at": 88,
    "before": "    assert(count.text=='+'..(#entries-layout.columns*Theme.layout.statusIcon.rows+1),'more count omitted a real status')",
    "after": "    assert(count.text=='+'..(#entries-layout.columns*layout.rows+1),'more count omitted a real status')"
   },
   {
    "at": 104,
    "before": "  if twoRows then assert(n==2,'long power list must use two bounded rows')end",
    "after": "  if expectedRows==2 then\n   assert(n==2,'long power list must use two bounded rows: '..actor.definitionId..' at '..(g.y+g.healthY))\n  end\n  if expectedRows==1 then\n   assert(n==1 and pool:find('@more').visible,'low enemy must keep its overflow above the hand')\n  end"
   },
   {
    "at": 119,
    "before": " check(fresh({'acid_slime_s'},10,{'weak','vulnerable','poison'}),true)\n check(fresh({'acid_slime_s'},10,powers),true)\n check(fresh(nil,10,{'weak','vulnerable','poison','strength','artifact'},'Lots of Slimes'),true)\n check(fresh({'acid_slime_l'},10,powers),true)\n check(fresh({'spike_slime_l'},10,powers),true)",
    "after": " check(fresh({'acid_slime_s'},10,{'weak','vulnerable','poison'}),2)\n check(fresh({'acid_slime_s'},10,powers),2)\n check(fresh(nil,10,{'weak','vulnerable','poison','strength','artifact'},'Lots of Slimes'),2)\n check(fresh({'acid_slime_l'},10,powers),2)\n check(fresh({'spike_slime_l'},10,powers),2)"
   },
   {
    "at": 125,
    "before": " local multi=fresh({'sentry','sentry','sentry'},10,{'strength','weak','vulnerable','artifact'})",
    "after": " local guardian=fresh({'guardian'},10,powers)\n guardian.enemies[1].aiPhase='defense';guardian.enemies[1].block=20\n host:refresh();check(guardian,1)\n local multi=fresh({'sentry','sentry','sentry'},10,{'strength','weak','vulnerable','artifact'})"
   },
   {
    "at": 130,
    "before": " host:refresh();check(multi,true)",
    "after": " host:refresh();check(multi,2)"
   }
  ]
 },
 {
  "after": {
   "sha256": "8ea1f7b59d006682590f350c88814d4a37335044cb137ee468472c246acf335d",
   "gitBlob": "b57c1e09001ac4d13f11e57e7e357cd3f8dd6694"
  },
  "before": {
   "sha256": "a3faec70280ea71143e460672b158c96a49dce8e840712ef14ae34ecb8e1696f",
   "gitBlob": "5dc8a7cccd26921402a897cf3e0ce8b4ee9ed520"
  },
  "hunks": [
   {
    "at": 6,
    "before": "import {buildUI} from '../scripts/build-ui.mjs';",
    "after": "import './helpers/mobile-composite-intent.cases.mjs';\nimport {buildUI} from '../scripts/build-ui.mjs';"
   }
  ]
 }
];

function beforeEnemyStatusFixture(path,source){
 if(typeof source!=='string')return source;
 const lf=source.replaceAll('\r\n','\n');
 if(source!==lf&&source!==lf.replaceAll('\n','\r\n'))return source;
 let prior=source;
 for(const {before,after,hunks} of enemyStatusContinuations){
  if(!exactSourceMatches(prior,after))continue;
  prior=restoreExactFixtureHunks({path,beforeSha256:before.sha256,afterSha256:after.sha256,hunks},path,prior);
  assert(exactSourceMatches(prior,before),'exact StS enemy-status fixture predecessor');
 }
 return prior===source||source===lf?prior:prior.replaceAll('\n','\r\n');
}

export function beforeStsRuntimeFixtureSuccessor(path,source){
 if(path===enemyStatusFixture)return beforeEnemyStatusFixture(path,source);
 const proof=runtimeFixtureSuccessors.find(row=>row.path===path);
 const original=proof?restoreExactFixtureHunks(proof,path,source):source;
 return original!==source&&source.includes('\r\n')?original.replaceAll('\n','\r\n'):original;
}

export function inputRetirementStsFixtureSource(path,raw){
 const buffered=Buffer.isBuffer(raw),source=buffered?raw.toString('utf8'):raw;
 const projected=beforeStsRuntimeFixtureSuccessor(path,source);
 const fixture=beforeNativeFlowFixture(path,beforeMapNodeVisualsLineEndings(path,projected),{requireCurrent:true});
 const native=beforeMergedInputRetirement(path,fixture,{requireCurrent:true});
 // The exact native-flow chain already returns the composed StS runtime predecessor.
 // Accept it only after a current native-flow fixture actually projected.
 const runtimeAlreadyProjected=path==='tests/official-assets-runtime.test.mjs'&&fixture!==source&&exactSourceMatches(native,{
  sha256:'1ba0126359c0dbf655585c7248c5963b7d6d89572fb47c84403df7adf7c090ef',gitBlob:'65d01cdbd3b32ff56ee99e113d47e6ff8854034d',
 });
 let prior=runtimeAlreadyProjected?native:beforeCurrentOfficialRuntimeFixture(path,native);
 if(path==='docs/legal/assets.json')prior=beforeArchiveStorageLedger(native);
 if(path===integration.path){
  // #859's merged test adds live replay checks; keep the same archived StS view.
  const merged=exactSourceMatches(native,{
   sha256:'58159c0c30a0bbd658c1d47543c2350d8534198c43c4ba59b03318f14195178d',gitBlob:'d9fa7f66445a406502ae7966d9d3da0b4ec936b4',
  });
  assert(merged||exactSourceMatches(native,integration.after),'fresh composed StS integration source');
  prior=native.includes('\r\n')?integration.before.source.replaceAll('\n','\r\n'):integration.before.source;
 }
 return buffered?(prior===source?raw:Buffer.from(prior)):prior;
}

export const inputRetirementStsWitness=Object.freeze({
 'tests/helpers/copy-integration-source-closure.mjs':'848e21017bfe022dd0a5e8215ffa94aee50b328ac9d7055ef1fade4f3a170677',
 'tests/helpers/historical-sts-style-entry.mjs':'96c580efcf1c7ed4e1be8b1bc3a27d15212c8b485e5a345d5ec450ad364017ae',
});
