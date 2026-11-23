// Exact predecessors for the current replay and test repairs. Current
// discovery and test execution continue to use the files on disk.
import {restoreExactFixtureHunks} from './exact-fixture-hunks.mjs';

const bindings = new Map([
 {
  "path": "tests/competition-roster-config-composition.test.mjs",
  "beforeSha256": "049459f6f6f652d83cc78230145279290fe3766782c7a316056e05f7539f33fd",
  "afterSha256": "6c0f04822d7b8b7950429c426c8be7085e1bc0594ca3926848e688f988a7db57",
  "hunks": [
   {
    "at": 0,
    "before": "import {currentProductionRereads} from './helpers/current-production-source-reads.mjs';\nimport nativeTest,{after} from 'node:test';",
    "after": "import {currentProductionRereads} from './helpers/current-production-source-reads.mjs';\nimport {beforeInputRetirementReader,retiredControllerPath} from './helpers/input-retirement-source.mjs';\nimport nativeTest,{after} from 'node:test';"
   },
   {
    "at": 194,
    "before": " const raw=readFileSync(path,'utf8').replaceAll('\\r\\n','\\n'),layers=JSON.parse(raw).layers,owners=sourceEpoch.proof.owners;\n const admittedReads=[...owners,...currentProductionRereads];\n for(const file of readdirSync('src/lua',{recursive:true}).filter(file=>file.endsWith('.lua')))",
    "after": " const raw=readFileSync(path,'utf8').replaceAll('\\r\\n','\\n'),layers=JSON.parse(raw).layers,owners=sourceEpoch.proof.owners;\n const priorReadOrder=[...owners,...currentProductionRereads];\n for(const file of readdirSync('src/lua',{recursive:true}).filter(file=>file.endsWith('.lua')))"
   },
   {
    "at": 205,
    "before": " const project=input=>sourceEpoch.preCombinedSource(path,input,{target:'develop',readSource:reader});\n const accepted=project(raw);assert.equal(hash(accepted),expected);assert.notEqual(accepted,raw);assert.deepEqual(reads,admittedReads,'complete raw owner admission in original order');\n reads=[];assert.equal(project(raw.replaceAll('\\n','\\r\\n')),accepted);assert.deepEqual(reads,admittedReads,'CRLF is not cached authorization');",
    "after": " const project=input=>sourceEpoch.preCombinedSource(path,input,{target:'develop',readSource:reader});\n const accepted=project(raw);assert.equal(hash(accepted),expected);assert.notEqual(accepted,raw);\n const admittedReads=[...reads];\n assert.equal(admittedReads.length,460,'complete raw owner admission');\n assert.equal(hash(JSON.stringify(admittedReads)),'6b72ef490e6f79b870b0a21d5b63ddb122f065aff81f837e8f6fa3bafbd40d51','complete raw owner admission in order');\n let position=-1;\n for(const owner of priorReadOrder){\n  position=admittedReads.indexOf(owner,position+1);\n  assert.notEqual(position,-1,'retained original Roster admission read: '+owner);\n }\n reads=[];assert.equal(project(raw.replaceAll('\\n','\\r\\n')),accepted);assert.deepEqual(reads,admittedReads,'CRLF is not cached authorization');"
   },
   {
    "at": 217,
    "before": "  changed=owner;\n  for(replacement of [readFileSync(owner,'utf8')+'\\n',null,new Error('missing current owner')]){\n   reads=[];assert.throws(()=>project(raw),/linked owner (identity|missing)/);\n   assert.deepEqual(reads,owners.slice(0,owners.indexOf(owner)+1),'stop at the first untrusted raw owner');\n  }",
    "after": "  changed=owner;\n  const missing=new Error('missing current owner');\n  const invalid=owner===retiredControllerPath?[beforeInputRetirementReader(p=>readFileSync(p,'utf8'))(owner),missing]:[readFileSync(owner,'utf8')+'\\n',null,missing];\n  for(replacement of invalid){\n   reads=[];assert.throws(()=>project(raw),/linked owner (identity|missing)/);\n   assert.deepEqual(reads,admittedReads.slice(0,admittedReads.indexOf(owner)+1),'stop at the first untrusted raw owner');\n  }"
   }
  ]
 },
 {
  "path": "tests/defect-actor-boundary.test.mjs",
  "beforeSha256": "8a0596438f603331d4e961f1887c68e5303ba8e920463bfde4973b22df17da0d",
  "afterSha256": "c2f7eca4ef113eaa612aefd7740581e97b95b366d46eb758516bec773e076fcd",
  "hunks": [
   {
    "at": 11,
    "before": "import {beforeCurrentProductionSource} from './helpers/character-preparation-source.mjs';\nimport {actorFocusAdded,assertActorFocusInventory,stasisUpgradeAddedPaths} from './helpers/develop-release-backflow-source.mjs';\nconst require=createRequire(import.meta.url),luaparse=require('luaparse');",
    "after": "import {beforeCurrentProductionSource} from './helpers/character-preparation-source.mjs';\nimport {actorFocusAdded,assertActorFocusInventory,deckPagesAdded,stasisUpgradeAddedPaths} from './helpers/develop-release-backflow-source.mjs';\nimport {beforeCombatEvents,beforeInputRetirementReader,pointerInputPath,retiredControllerPath} from './helpers/input-retirement-source.mjs';\nconst require=createRequire(import.meta.url),luaparse=require('luaparse');"
   },
   {
    "at": 24,
    "before": " const readLive=path=>Object.hasOwn(live,path)?live[path]:read(path);\n assert.deepEqual(Object.keys(live).sort(),[...Object.keys(proof.current),...actorFocusAdded,...stasisUpgradeAddedPaths].sort(),'complete live source inventory before preStyle');\n assertActorFocusInventory(Object.keys(raw),readLive);\n for(const [path,binding]of Object.entries(proof.current))\n  assert.equal(beforeCurrentProductionSource(path,live[path],readLive).replaceAll('\\r\\n','\\n'),binding.source,'live preStyle input identity: '+path);\n const admitted=sourceEpoch.preCombinedSource(config,live[config],{target:'stsStylePrior',readSource:readLive});",
    "after": " const readLive=path=>Object.hasOwn(live,path)?live[path]:read(path);\n const expected=[...Object.keys(proof.current),...actorFocusAdded,...stasisUpgradeAddedPaths,...deckPagesAdded];\n assert(expected.includes(retiredControllerPath),'preStyle inventory includes the historical controller');\n assert.deepEqual(Object.keys(live).sort(),[...expected.filter(path=>path!==retiredControllerPath),pointerInputPath].sort(),'complete live source inventory before preStyle');\n assertActorFocusInventory(Object.keys(raw),readLive);\n const historicalRead=beforeInputRetirementReader(readLive);\n for(const [path,binding]of Object.entries(proof.current)){\n  const source=path===retiredControllerPath?historicalRead(path):live[path];\n  assert.equal(beforeCurrentProductionSource(path,source,readLive).replaceAll('\\r\\n','\\n'),binding.source,'live preStyle input identity: '+path);\n }\n const admitted=sourceEpoch.preCombinedSource(config,live[config],{target:'stsStylePrior',readSource:readLive});"
   },
   {
    "at": 98,
    "before": "  .replaceAll('        local Actors=actorHost()\\n',''),original[utility]);\n assert.equal(read(queued).replace(\"local function utilityActorHost()return require('abyss_actor')end\\n\",'')\n  .replace('utility.prepareEffect(state,e,target,utilityActorHost)','utility.prepareEffect(state,e,target)'),original[queued]);",
    "after": "  .replaceAll('        local Actors=actorHost()\\n',''),original[utility]);\n assert.equal(beforeCombatEvents(queued,read(queued)).replace(\"local function utilityActorHost()return require('abyss_actor')end\\n\",'')\n  .replace('utility.prepareEffect(state,e,target,utilityActorHost)','utility.prepareEffect(state,e,target)'),original[queued]);"
   },
   {
    "at": 134,
    "before": " assert.equal(hosts.length,3,'original eager Actor, untouched Watcher host and new Utility host');\n for(const name of ['utilityActorHost','watcherActorHost'])assert(hosts.some(e=>read(queued).split('\\n')[e.line-1].includes(`local function ${name}()`)));\n // Parse the complete changed module for each mutant, then replace its edges",
    "after": " assert.equal(hosts.length,3,'original eager Actor, untouched Watcher host and new Utility host');\n const queuedLines=raw[queued].split('\\n');\n for(const name of ['utilityActorHost','watcherActorHost'])assert(hosts.some(e=>queuedLines[e.line-1].includes(`local function ${name}()`)));\n // Parse the complete changed module for each mutant, then replace its edges"
   }
  ]
 },
 {
  "path": "tests/helpers/fork-preflight-source.mjs",
  "beforeSha256": "f1611ba371126867ce69926daa71fbb211bafb32ece60362d992cd9d3efc49c0",
  "afterSha256": "15bb8150756d3e23db809dbbfa1e7680b0800638523aa9c06cf1974313ba8ae9",
  "hunks": [
   {
    "at": 11,
    "before": "import {beforeStsFadeCi} from './sts-fade-ci-source.mjs';\nimport {beforeIntegratedStsInventory} from './sts-selection-fade-source.mjs';",
    "after": "import {beforeStsFadeCi} from './sts-fade-ci-source.mjs';\nimport {beforeCurrentReplayFixes} from './current-replay-fix-sources.mjs';\nimport {beforeIntegratedStsInventory} from './sts-selection-fade-source.mjs';"
   },
   {
    "at": 815,
    "before": "export function beforePreflightSource(path,source,view='prior'){\n source=beforeNativeFlowFixture(path,source);",
    "after": "export function beforePreflightSource(path,source,view='prior'){\n source=beforeCurrentReplayFixes(path,source);\n source=beforeNativeFlowFixture(path,source);"
   }
  ]
 },
 {
  "path": "tests/helpers/input-retirement-source.mjs",
  "beforeSha256": "7d849cfad2c62efc07b65bb4c845dfe6b54b2f3bf2d3bca560457a1eed631488",
  "afterSha256": "2644fcd5f1abf80737bb341c3bf4764b1ae3eaf8dcb786a2154b548dbf87f42c",
  "hunks": [
   {
    "at": 78,
    "before": "}\nexport function beforePotionBackflow(path,source){\n const row=Object.hasOwn(potionBackflow.files,path)&&potionBackflow.files[path];\n if(!row||!matches(source,row.after))return source;",
    "after": "}\nconst rewardsBackView='src/lua/abyss_game_ui_view.lua';\nconst rewardsBackViewSuccessor=Object.freeze({\n sha256:'9b4968a3fd23e0956ef565ef4da1d4dbc2a0c5b666308c59c963d02c8f15f0fb',\n gitBlob:'96f9fadefeabc3d3540e2797943c3b415605140d',\n});\nfunction beforeRewardsBackExtraction(path,source){\n if(path!==rewardsBackView||!matches(source,rewardsBackViewSuccessor))return source;\n const helper=`local function refreshRewardsBack(button,available)\n    button:SetVisible(available)\n    if button:GetChild('v25Face') then\n        require('abyss_v25_menu_view').button(button,available)\n    end\n    -- Route preview raises the map. Raise this sibling when navigation returns.\n    if available then button:SetAsLastSibling() end\nend\n\n`;\n const inline=`local rewardsBack=child(\"combatRewards\")\n            rewardsBack:SetVisible(returnAvailable)\n            if rewardsBack:GetChild('v25Face') then\n                require('abyss_v25_menu_view').button(rewardsBack,returnAvailable)\n            end\n            -- Route preview raises the full-page map. Restore this sibling above it\n            -- when returning to navigation; visibility alone leaves it occluded.\n            if returnAvailable then rewardsBack:SetAsLastSibling() end`;\n const text=normalize(source),call='refreshRewardsBack(child(\"combatRewards\"),returnAvailable)';\n assert.equal(text.split(helper).length,2,'exact rewards back helper extraction');\n assert.equal(text.split(call).length,2,'exact rewards back helper call');\n const prior=text.replace(helper,'').replace(call,inline);\n assert(matches(prior,potionBackflow.files[path].after),'exact rewards back predecessor');\n return source.includes('\\r\\n')?prior.replaceAll('\\n','\\r\\n'):prior;\n}\nexport function beforePotionBackflow(path,source){\n const row=Object.hasOwn(potionBackflow.files,path)&&potionBackflow.files[path];\n source=beforeRewardsBackExtraction(path,source);\n if(!row||!matches(source,row.after))return source;"
   },
   {
    "at": 120,
    "before": " if(!row)return;\n assert(matches(source,row.after),'fresh current production owner: '+path);\n let live;\n try{live=read(path);}catch(error){assert.fail('combined linked owner missing: '+path+': '+String(error?.message??error));}\n assert(matches(live,row.after),'combined linked owner identity: '+path+' during deck/potion backflow validation');\n}",
    "after": " if(!row)return;\n const expected=path===rewardsBackView?rewardsBackViewSuccessor:row.after;\n assert(matches(source,expected),'fresh current production owner: '+path);\n let live;\n try{live=read(path);}catch(error){assert.fail('combined linked owner missing: '+path+': '+String(error?.message??error));}\n assert(matches(live,expected),'combined linked owner identity: '+path+' during deck/potion backflow validation');\n}"
   }
  ]
 },
 {
  "path": "tests/helpers/input-retirement-sts-binding.mjs",
  "beforeSha256": "21146df5c544deee55f2a2553c039727508b3c827d93ed4728bd960f0af0afd1",
  "afterSha256": "f6395a7c5e299738db3caf30f29d7d29724e7ac091af012a585c76b785697219",
  "hunks": [
   {
    "at": 102,
    "before": "\nexport function inputRetirementStsFixtureSource(path,raw){\n const buffered=Buffer.isBuffer(raw),source=buffered?raw.toString('utf8'):raw;\n const proof=runtimeFixtureSuccessors.find(row=>row.path===path);\n const original=proof?restoreExactFixtureHunks(proof,path,source):source;\n const projected=original!==source&&source.includes('\\r\\n')?original.replaceAll('\\n','\\r\\n'):original;\n const fixture=beforeNativeFlowFixture(path,beforeMapNodeVisualsLineEndings(path,projected),{requireCurrent:true});",
    "after": "\nexport function beforeStsRuntimeFixtureSuccessor(path,source){\n const proof=runtimeFixtureSuccessors.find(row=>row.path===path);\n const original=proof?restoreExactFixtureHunks(proof,path,source):source;\n return original!==source&&source.includes('\\r\\n')?original.replaceAll('\\n','\\r\\n'):original;\n}\n\nexport function inputRetirementStsFixtureSource(path,raw){\n const buffered=Buffer.isBuffer(raw),source=buffered?raw.toString('utf8'):raw;\n const projected=beforeStsRuntimeFixtureSuccessor(path,source);\n const fixture=beforeNativeFlowFixture(path,beforeMapNodeVisualsLineEndings(path,projected),{requireCurrent:true});"
   }
  ]
 },
 {
  "path": "tests/helpers/m7-core-final-source-inverse.mjs",
  "beforeSha256": "96eae58fe74ee798a8c87be865a3640508e983e43e98b55e0ccd8756516ba768",
  "afterSha256": "e54e91f55205207fd832ddad079b3fcf03102c4ca1ebcb045d6507b52feaab6b",
  "hunks": [
   {
    "at": 9,
    "before": "import assert from 'node:assert/strict';\nconst live=p=>readFileSync(new URL('../../'+p,import.meta.url),'utf8');",
    "after": "import assert from 'node:assert/strict';\nimport {isCurrentInputRetirementSource} from './input-retirement-source.mjs';\nconst live=p=>readFileSync(new URL('../../'+p,import.meta.url),'utf8');"
   },
   {
    "at": 29,
    "before": "}\n// Explicit compatibility readers share this same full-current admission gate.\nexport {actorReader as currentDefectActorReader};\nexport function preM7FinalSource(path,source,{readSource=live}={}){",
    "after": "}\n// Explicit live compatibility readers start with the exact current architecture\n// before authenticating the complete current graph and exposing an earlier view.\nexport function currentDefectActorReader(raw){\n if(typeof raw!=='function')return raw;\n return path=>{\n  const source=raw(actorAnchor);\n  assert(isCurrentInputRetirementSource(actorAnchor,source),'combined linked owner identity: '+actorAnchor);\n  assert.equal(sourceEpoch.preCombinedSource(actorAnchor,source,{target:'pr618',readSource:raw}),\n   actorTarget.files[actorAnchor].source,'exact current Actor admission target');\n  assert(Object.hasOwn(defectActorEpoch.proof.current,path),'known Actor owner');\n  return actorTarget.files[path].source;\n };\n}\nexport function preM7FinalSource(path,source,{readSource=live}={}){"
   }
  ]
 },
 {
  "path": "tests/helpers/release-ui-restore-source.mjs",
  "beforeSha256": "75da223110ac6a108face448920b3c07f61c427544cc8953a043721f99499c03",
  "afterSha256": "de6835c2a44271c50a20ea39cb18c68f3d5c84b04ce8959171c013b34efc4664",
  "hunks": [
   {
    "at": 3,
    "before": "import {authorizeRefinedReleaseProduction,beforeRefinedReleaseProduction} from './refined-release-source.mjs';\nimport assert from 'node:assert/strict';",
    "after": "import {authorizeRefinedReleaseProduction,beforeRefinedReleaseProduction} from './refined-release-source.mjs';\nimport {inputRetirementStsFixtureSource} from './input-retirement-sts-binding.mjs';\nimport {beforeStsFadeCi} from './sts-fade-ci-source.mjs';\nimport {beforeCurrentReplayFixes} from './current-replay-fix-sources.mjs';\nimport assert from 'node:assert/strict';"
   },
   {
    "at": 60,
    "before": "export const beforeRecordingUi=(path,source)=>beforeReleaseDetailSource(path,recording.project(path,beforeCombatVisualSource(path,source)));\nexport function beforeAuthenticatedRecordingStage(path,source,read){\n const released=beforeRebasedRelease(path,source);\n if(released!==source)authorizeRebasedRelease([[path,source]],owner=>read(owner,'utf8'));\n const readReleased=owner=>beforeRebasedRelease(owner,read(owner,'utf8'));\n const current=beforeCombatVisualSource(path,released,readReleased);\n const prior=recording.project(path,current);\n if(prior!==current){\n  const live=combatVisualPriorRead(readReleased)(path,'utf8');\n  assert(matches(live,recording.files[path].after),'recording UI linked owner changed: '+path);",
    "after": "export const beforeRecordingUi=(path,source)=>beforeReleaseDetailSource(path,recording.project(path,beforeCombatVisualSource(path,source)));\nconst officialRuntimePath='tests/official-assets-runtime.test.mjs';\nconst currentOfficialRuntime={\n sha256:'a3341b88551a035189ccc811fa7aa2b7f2eb9c1b6377baa22df6ff3b1fc8c828',\n gitBlob:'82bdb7dda43d8772e1d1d5ffac3a9690509d9dd4',\n};\nconst deckLayoutPath='scripts/deck-ui-layout.mjs';\nconst pileReturnLayout={\n sha256:'0f57f26a4fb520c8feb1df92d48417a6b445900a9ae453c160f500e5a9ee2272',\n gitBlob:'6c9ce59b446f0dd9b8d5f9ffb3c2303e0320195d',\n};\nfunction recordingRuntimeInput(path,source){\n source=beforeCurrentReplayFixes(path,source);\n if(path!==officialRuntimePath||!matches(source,currentOfficialRuntime))return source;\n return beforeStsFadeCi(path,inputRetirementStsFixtureSource(path,source));\n}\nfunction recordingLayoutInput(path,source){\n if(path!==deckLayoutPath||!matches(source,pileReturnLayout))return source;\n const successor=\"battlePileReturn(button('pileReturn',[-550,-237,180,54],'返回'),theme.officialAssets.buttonInk)\";\n const predecessor=\"battlePileReturn(button('pileReturn',[-550,-237,180,54],'返回'),true,undefined,theme.officialAssets.buttonInk)\";\n assert.equal(source.split(successor).length,2,'exact pile return layout change');\n const prior=source.replace(successor,predecessor);\n assert(matches(prior,recording.files[path].after),'exact recording layout predecessor');\n return prior;\n}\nexport function beforeAuthenticatedRecordingStage(path,source,read){\n const input=recordingRuntimeInput(path,source);\n if(input!==source){\n  const live=read(path,'utf8');\n  assert(typeof live==='string'&&live.replaceAll('\\r\\n','\\n')===source.replaceAll('\\r\\n','\\n'),\n   'recording UI linked owner changed: '+path);\n }\n const readInput=owner=>recordingRuntimeInput(owner,read(owner,'utf8'));\n const released=beforeRebasedRelease(path,input);\n if(released!==input)authorizeRebasedRelease([[path,input]],readInput);\n const readReleased=owner=>beforeRebasedRelease(owner,readInput(owner));\n const current=recordingLayoutInput(path,beforeCombatVisualSource(path,released,readReleased));\n const prior=recording.project(path,current);\n if(prior!==current){\n  const live=recordingLayoutInput(path,combatVisualPriorRead(readReleased)(path,'utf8'));\n  assert(matches(live,recording.files[path].after),'recording UI linked owner changed: '+path);"
   }
  ]
 },
 {
  "path": "tests/helpers/sts-style-ci-source.mjs",
  "beforeSha256": "054113396d3db48407c2aee4f5c9563e6c4f2e8a80d37c979c79b6b3afac423a",
  "afterSha256": "fa19097c79ce5c8395e27569188dc99ec7b10d7589e0b30d621ddf607f54f0ab",
  "hunks": [
   {
    "at": 7,
    "before": "import {extendFeedbackCiProof} from './sts-feedback-source-runtime.mjs';\nconst hash=s=>createHash('sha256').update(s).digest('hex'),norm=s=>s.replaceAll('\\r\\n','\\n');",
    "after": "import {extendFeedbackCiProof} from './sts-feedback-source-runtime.mjs';\nimport {beforeStsRuntimeFixtureSuccessor} from './input-retirement-sts-binding.mjs';\nconst hash=s=>createHash('sha256').update(s).digest('hex'),norm=s=>s.replaceAll('\\r\\n','\\n');"
   },
   {
    "at": 25,
    "before": "export function preStsStyleCiSource(path,source){\n source=integratedSource(path,source,'sts');\n const row=Object.hasOwn(stsStyleCiProof.files,path)?stsStyleCiProof.files[path]:null;",
    "after": "export function preStsStyleCiSource(path,source){\n source=integratedSource(path,beforeStsRuntimeFixtureSuccessor(path,source),'sts');\n const row=Object.hasOwn(stsStyleCiProof.files,path)?stsStyleCiProof.files[path]:null;"
   },
   {
    "at": 35,
    "before": " paths=integratedPriorInventory(paths,'sts','js',read);\n read=integratedRead('sts',{read});\n const proof=stsStyleCiProof;if(!proof.addedTests.some(path=>paths.includes(path)))return [...paths];\n assert.deepEqual([...paths].sort(),proof.afterInventory,'complete StS Full inventory');\n for(const p of proof.addedTests)assert.equal(hash(norm(read(p,'utf8'))),proof.files[p].after.sha256,'StS added inventory source: '+p);\n return [...proof.beforeInventory];\n}",
    "after": " paths=integratedPriorInventory(paths,'sts','js',read);\n const readCurrent=integratedRead('sts',{read:withStsRuntimePredecessors(read)});\n const proof=stsStyleCiProof;if(!proof.addedTests.some(path=>paths.includes(path)))return [...paths];\n assert.deepEqual([...paths].sort(),proof.afterInventory,'complete StS Full inventory');\n for(const p of proof.addedTests)assert.equal(hash(norm(readCurrent(p,'utf8'))),proof.files[p].after.sha256,'StS added inventory source: '+p);\n return [...proof.beforeInventory];\n}\nfunction withStsRuntimePredecessors(read){\n return (path,encoding)=>beforeStsRuntimeFixtureSuccessor(path,read(path,encoding));\n}"
   },
   {
    "at": 46,
    "before": " paths=integratedPriorInventory(paths,'sts','js',read);\n read=integratedRead('sts',{read});\n assert.deepEqual([...paths].sort(),stsStyleCiProof.afterInventory,'complete StS current Full inventory');",
    "after": " paths=integratedPriorInventory(paths,'sts','js',read);\n read=integratedRead('sts',{read:withStsRuntimePredecessors(read)});\n assert.deepEqual([...paths].sort(),stsStyleCiProof.afterInventory,'complete StS current Full inventory');"
   }
  ]
 },
 {
  "path": "tests/golden-idol-source-epoch.test.mjs",
  "beforeSha256": "390dd6acb1c9d822b77002bebb06c40d4c45e29f27d4cd74c93e3113d7dda7b8",
  "afterSha256": "0597f48fb68fd5b98e1170e4f78f4ba50a25ccec6a163b1d3d056bc4409a6c52",
  "hunks": [
   {
    "at": 0,
    "before": "import {sourceSlice} from './helpers/closeout-source-epoch.mjs';\nimport test from 'node:test';",
    "after": "import {beforeCharacterPreparationSource,beforeCurrentProductionSource} from './helpers/character-preparation-source.mjs';\nimport {pointerInputPath,readRetiredController,retiredControllerPath} from './helpers/input-retirement-source.mjs';\nimport {sourceSlice} from './helpers/closeout-source-epoch.mjs';\nimport {beforePc13ThenV2UiHudSource} from './helpers/pc13-reward-cover-source.mjs';\nimport test from 'node:test';"
   },
   {
    "at": 13,
    "before": "\nconst readFileSync=(file,encoding)=>{\n const value=nativeReadFileSync(file,encoding);\n if(file!=='config/architecture.json'&&!file.startsWith('src/lua/'))return value;\n const source=typeof value==='string'?value:value.toString('utf8'),prior=sourceSlice(file,source,'pr614');\n return typeof value==='string'?prior:prior===source?value:Buffer.from(prior);\n};",
    "after": "\nconst currentRaw=file=>nativeReadFileSync(file,'utf8');\nfunction goldenReader(read){\n const admitted=file=>{\n  if(file===retiredControllerPath){\n   const {source,restored}=readRetiredController(read);\n   assert(restored,'current Controller must be retired');\n   return beforeCharacterPreparationSource(file,source,read);\n  }\n  return beforeCurrentProductionSource(file,read(file),read);\n };\n return file=>beforePc13ThenV2UiHudSource(file,sourceSlice(file,admitted(file),'pr614',admitted),read);\n}\nconst liveGolden=goldenReader(currentRaw);\nconst readFileSync=(file,encoding)=>{\n if(file!=='config/architecture.json'&&!file.startsWith('src/lua/'))return nativeReadFileSync(file,encoding);\n const source=liveGolden(file);\n return encoding?source:Buffer.from(source);\n};"
   },
   {
    "at": 119,
    "before": "test('live LF and CRLF raw owner reads authenticate 80 current owners on every call',()=>{\n const config='config/architecture.json',input=readFileSync(config,'utf8'),expected=proof.targets.actor.files[config].source;\n for(const crlf of [false,true]){\n  const seen=[];let corrupt=null,missing=null;\n  const live=file=>{seen.push(file);if(file===missing)return null;const bytes=readFileSync(file,'utf8').replaceAll('\\r\\n','\\n');return file===corrupt?bytes+'\\n':crlf?bytes.replaceAll('\\n','\\r\\n'):bytes;};\n  for(let repeat=0;repeat<2;repeat++){seen.length=0;assert.equal(sourceEpoch.preCombinedSource(config,input,{target:'actor',readSource:live}),expected);assert.deepEqual(seen,proof.owners);}\n  for(const owner of proof.owners){\n   corrupt=owner;assert.throws(()=>sourceEpoch.preCombinedSource(config,input,{target:'actor',readSource:live}),/linked owner identity/,owner);corrupt=null;\n   missing=owner;assert.throws(()=>sourceEpoch.preCombinedSource(path,readFileSync(path,'utf8'),{target:'goldenIdolPrior',readSource:live}),/linked owner identity/,owner);missing=null;\n  }",
    "after": "test('live LF and CRLF raw owner reads authenticate 80 current owners on every call',()=>{\n const config='config/architecture.json',expected=proof.targets.actor.files[config].source;\n const stamped=new Map();\n const observe=file=>{\n  let raw;try{raw=currentRaw(file);}catch(error){if(file!==retiredControllerPath||error.code!=='ENOENT')throw error;raw=null;}\n  if(stamped.has(file))assert(raw===stamped.get(file),'fresh Golden Idol raw owner: '+file);\n  else stamped.set(file,raw);\n  return raw;\n };\n const readView=goldenReader(observe);\n const prior=new Map([...new Set([...proof.owners,path,config,pointerInputPath])].map(file=>[file,readView(file).replaceAll('\\r\\n','\\n')]));\n const confirm=()=>{for(const file of stamped.keys())observe(file);};\n for(const crlf of [false,true]){\n  const seen=[];let corrupt=null,missing=null;\n  const live=file=>{\n   seen.push(file);if(file===missing)return null;\n   assert(prior.has(file),'known Golden Idol historical owner: '+file);\n   observe(file);\n   const source=prior.get(file);\n   return file===corrupt?source+'\\n':crlf?source.replaceAll('\\n','\\r\\n'):source;\n  };\n  const project=(file,target)=>{\n   // Historical values are derived once for a fixed cohort. The physical\n   // inputs are checked again around every invocation and requested owner.\n   confirm();\n   try{return sourceEpoch.preCombinedSource(file,prior.get(file),{target,readSource:live});}\n   finally{confirm();}\n  };\n  for(let repeat=0;repeat<2;repeat++){seen.length=0;assert.equal(project(config,'actor'),expected);assert.deepEqual(seen,proof.owners);}\n  for(const owner of proof.owners){\n   corrupt=owner;assert.throws(()=>project(config,'actor'),/linked owner identity/,owner);corrupt=null;\n   missing=owner;assert.throws(()=>project(path,'goldenIdolPrior'),/linked owner identity/,owner);missing=null;\n  }"
   }
  ]
 },
 {
  "path": "tests/v25-map-layout.test.mjs",
  "beforeSha256": "5040690e1a91ed327826662e953b0ff7ecdc4ecb47d00eeb5e5c6dbb4984c292",
  "afterSha256": "1e672671a07a86720fe9ade094038e0f01efc7619fadee32275009c35222d428",
  "hunks": [
   {
    "at": 129,
    "before": "  const live=readFileSync(path,'utf8');\n  assert.equal(beforeAuthenticatedRecordingStage(path,live,readFileSync),row.before.source,path);\n  const drift=live+'\\n-- unreviewed drift\\n';",
    "after": "  const live=readFileSync(path,'utf8');\n  assert.equal(beforeAuthenticatedRecordingStage(path,live,readFileSync).replaceAll('\\r\\n','\\n'),row.before.source,path);\n  const drift=live+'\\n-- unreviewed drift\\n';"
   }
  ]
 }
].map(row=>[row.path,row]));

export function beforeCurrentReplayFixes(path, source){
 const binding=bindings.get(path);
 if(!binding)return source;
 const prior=restoreExactFixtureHunks(binding,path,source);
 return prior!==source&&source.includes('\r\n')?prior.replaceAll('\n','\r\n'):prior;
}
