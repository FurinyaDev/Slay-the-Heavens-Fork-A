import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {restoreExactFixtureHunks} from './exact-fixture-hunks.mjs';
import {exactSourceMatches} from './source-fingerprint.mjs';

// Approved #951 catalog successors. The parent 7348ab85 and reviewed #934
// (02dcb246) contain identical catalog and viewport bytes for the older official-assets theme.
// The live viewport comes from #984.
const inputs={
 "data/enemies.json": {
  "path": "data/enemies.json",
  "beforeSha256": "a11cf7011f2e1ce356d3afa4812d0c1ffb58f6dfeab18660438616f431ab2c7e",
  "afterSha256": "6ecb9447f64e62784fd7411422ebb43d2c737fe45ba5233dfc0a7ed32a2911fe",
  "beforeBlob": "3176ee0c8595b5357ca5ad7a76ab93d463671cc2",
  "afterBlob": "572361f7f9425e9147b384d4823fd3fba16358c7",
  "hunks": [
   {
    "at": 4,
    "before": "      \"id\": \"cultist\",",
    "after": "      \"id\": \"raven_adept\","
   },
   {
    "at": 9,
    "before": "      \"ai\": { \"kind\": \"ritual_then_attack\", \"ritualIntent\": \"cultist_2\", \"attackIntent\": \"cultist_1\", \"rollRange\": 100 },",
    "after": "      \"ai\": { \"kind\": \"ritual_then_attack\", \"ritualIntent\": \"raven_adept_2\", \"attackIntent\": \"raven_adept_1\", \"rollRange\": 100 },"
   },
   {
    "at": 12,
    "before": "          \"id\": \"cultist_1\",",
    "after": "          \"id\": \"raven_adept_1\","
   },
   {
    "at": 22,
    "before": "          \"id\": \"cultist_2\",",
    "after": "          \"id\": \"raven_adept_2\","
   },
   {
    "at": 456,
    "before": "      \"id\": \"blue_slaver\",",
    "after": "      \"id\": \"blue_guard\","
   },
   {
    "at": 462,
    "before": "        \"kind\": \"blue_slaver\",\n        \"stabIntent\": \"blue_slaver_1\",\n        \"rakeIntent\": \"blue_slaver_2\",",
    "after": "        \"kind\": \"blue_guard\",\n        \"stabIntent\": \"blue_guard_1\",\n        \"rakeIntent\": \"blue_guard_2\","
   },
   {
    "at": 470,
    "before": "          \"id\": \"blue_slaver_1\",",
    "after": "          \"id\": \"blue_guard_1\","
   },
   {
    "at": 480,
    "before": "          \"id\": \"blue_slaver_2\",",
    "after": "          \"id\": \"blue_guard_2\","
   },
   {
    "at": 497,
    "before": "      \"id\": \"red_slaver\",",
    "after": "      \"id\": \"red_guard\","
   },
   {
    "at": 503,
    "before": "        \"kind\": \"red_slaver\",\n        \"stabIntent\": \"red_slaver_1\",\n        \"entangleIntent\": \"red_slaver_2\",\n        \"scrapeIntent\": \"red_slaver_3\",",
    "after": "        \"kind\": \"red_guard\",\n        \"stabIntent\": \"red_guard_1\",\n        \"entangleIntent\": \"red_guard_2\",\n        \"scrapeIntent\": \"red_guard_3\","
   },
   {
    "at": 513,
    "before": "          \"id\": \"red_slaver_1\",",
    "after": "          \"id\": \"red_guard_1\","
   },
   {
    "at": 523,
    "before": "          \"id\": \"red_slaver_2\",",
    "after": "          \"id\": \"red_guard_2\","
   },
   {
    "at": 530,
    "before": "          \"id\": \"red_slaver_3\",",
    "after": "          \"id\": \"red_guard_3\","
   },
   {
    "at": 979,
    "before": "      \"id\": \"cultist_solo\",",
    "after": "      \"id\": \"raven_adept_solo\","
   },
   {
    "at": 982,
    "before": "        \"cultist\"",
    "after": "        \"raven_adept\""
   },
   {
    "at": 1070,
    "before": "      \"id\": \"blue_slaver_solo\",",
    "after": "      \"id\": \"blue_guard_solo\","
   },
   {
    "at": 1073,
    "before": "        \"blue_slaver\"",
    "after": "        \"blue_guard\""
   },
   {
    "at": 1079,
    "before": "      \"id\": \"red_slaver_solo\",",
    "after": "      \"id\": \"red_guard_solo\","
   },
   {
    "at": 1082,
    "before": "        \"red_slaver\"",
    "after": "        \"red_guard\""
   }
  ]
 },
 "data/potions.json": {
  "path": "data/potions.json",
  "beforeSha256": "8fd57583c8ab9e5221e24acf6dceec71c79ab7cbec1c45354eb2b319775d41f5",
  "afterSha256": "e490906262d187888a7524d74df05feb99a3bc83089ebd86c304e22c4f2cc1d1",
  "beforeBlob": "2bd434533a97ae6d0df8b2b8770e0616fabab6cc",
  "afterBlob": "ac62e747019affb5f750fa5b9854f24b2ee76afb",
  "hunks": [
   {
    "at": 24,
    "before": "    { \"id\":\"gamblers_brew\",\"targetPolicy\":\"self\",\"name\":\"赌徒佳酿\",\"rarity\":\"uncommon\",",
    "after": "    { \"id\":\"swap_brew\",\"targetPolicy\":\"self\",\"name\":\"换牌秘酿\",\"rarity\":\"uncommon\","
   },
   {
    "at": 28,
    "before": "    { \"id\": \"blood_potion\", \"targetPolicy\": \"self\", \"name\": \"鲜血药水\", \"rarity\": \"common\",",
    "after": "    { \"id\": \"blood_potion\", \"targetPolicy\": \"self\", \"name\": \"回生药水\", \"rarity\": \"common\","
   },
   {
    "at": 40,
    "before": "    { \"id\": \"cultist_potion\", \"targetPolicy\": \"self\", \"name\": \"邪教徒药水\", \"rarity\": \"rare\",",
    "after": "    { \"id\": \"raven_potion\", \"targetPolicy\": \"self\", \"name\": \"鸦羽药剂\", \"rarity\": \"rare\","
   }
  ]
 },
 "data/relics.json": {
  "path": "data/relics.json",
  "beforeSha256": "7d24c341aa4737cace076144a02f52e054fbe191b06c6eaebb30500e728486ef",
  "afterSha256": "6fd947fc54c4a765906dd70d34527979c6b28f8d48922091697d46e93ae990d3",
  "beforeBlob": "1334c9e2db1aa89da3b142121b7f01139733e2e7",
  "afterBlob": "61b2d796978952d2017f258039581ce844526113",
  "hunks": [
   {
    "at": 41,
    "before": "{\"id\":\"gambling_chip\",\"sourceId\":\"Gambling Chip\",\"name\":\"赌博筹码\",\"description\":\"每场战斗开始时，你可以弃掉任意张手牌，然后抽取等量的牌。\",\"rarity\":\"rare\",\"trigger\":\"hooks\",\"effects\":[]},",
    "after": "{\"id\":\"tactical_badge\",\"sourceId\":\"Tactical Badge\",\"name\":\"战术徽记\",\"description\":\"每场战斗开始时，你可以弃掉任意张手牌，然后抽取等量的牌。\",\"rarity\":\"rare\",\"trigger\":\"hooks\",\"effects\":[]},"
   },
   {
    "at": 311,
    "before": "      \"id\": \"slavers_collar\",",
    "after": "      \"id\": \"arena_collar\","
   },
   {
    "at": 389,
    "before": "      \"name\": \"血瓶\",",
    "after": "      \"name\": \"回春瓶\","
   },
   {
    "at": 721,
    "before": "    {\"id\": \"cultist_mask\", \"sourceId\": \"CultistMask\", \"name\": \"邪教徒头饰\", \"description\": \"战斗开始时发出邪教徒的叫声；没有额外属性。\", \"rarity\": \"special\", \"trigger\": \"hooks\", \"effects\": []},",
    "after": "    {\"id\": \"raven_mask\", \"sourceId\": \"RavenMask\", \"name\": \"鸦羽面具\", \"description\": \"战斗开始时发出一声鸦鸣；没有额外属性。\", \"rarity\": \"special\", \"trigger\": \"hooks\", \"effects\": []},"
   },
   {
    "at": 727,
    "before": "    {\"id\": \"bloody_idol\", \"sourceId\": \"Bloody Idol\", \"name\": \"血色神像\", \"description\": \"每当你获得金币时，回复5点生命。\", \"rarity\": \"special\", \"trigger\": \"hooks\", \"effects\": [], \"replaces\": \"golden_idol\"},\n    {\"id\": \"mutagenic_strength\", \"sourceId\": \"MutagenicStrength\", \"name\": \"突变力量\", \"description\": \"每场战斗开始时获得3点力量，在第一回合结束时失去3点力量。\", \"rarity\": \"special\", \"trigger\": \"hooks\", \"effects\": []},",
    "after": "    {\"id\": \"bloody_idol\", \"sourceId\": \"Bloody Idol\", \"name\": \"赤晶神像\", \"description\": \"每当你获得金币时，回复5点生命。\", \"rarity\": \"special\", \"trigger\": \"hooks\", \"effects\": [], \"replaces\": \"golden_idol\"},\n    {\"id\": \"augmentation_core\", \"sourceId\": \"AugmentationCore\", \"name\": \"增幅晶核\", \"description\": \"每场战斗开始时获得3点力量，在第一回合结束时失去3点力量。\", \"rarity\": \"special\", \"trigger\": \"hooks\", \"effects\": []},"
   }
  ]
 },
 "scripts/viewport-layout.mjs": {
  "path": "scripts/viewport-layout.mjs",
  "beforeSha256": "f59ce8fb74fa4dd91c0deef4e0bdb0abea159c89d2bbf80e0b5e23ca7d0c14c5",
  "afterSha256": "3057525b8864f6af75393a1a124238136766350fa064729b4c35495e7bf038d4",
  "beforeBlob": "13a6f2304d444f16b41edc482bf083a0dfa1d79e",
  "afterBlob": "8f6ab7c549eb1db1ee79f365e6004e8a1b0a71f2",
  "hunks": [
   {
    "at": 4,
    "before": "    { name: 'canvasBackdrop', kind: 'image', anchor: { min: [0, 0], max: [1, 1] }, size: [400, 0],",
    "after": "    { name: 'canvasBackdrop', kind: 'image', anchor: { min: [0, 0], max: [1, 1] }, size: [theme.canvas.mobileBleedX, 0],"
   }
  ]
 }
};

// The live visual viewport retains the #984 backdrop input before its periphery.
const visualViewport={
 "path": "scripts/viewport-layout.mjs",
 "beforeSha256": "3057525b8864f6af75393a1a124238136766350fa064729b4c35495e7bf038d4",
 "afterSha256": "c20bdd3432d7ce5831359d53efcc3dae049249004350d3f7d2ed320ad966197e",
 "beforeBlob": "8f6ab7c549eb1db1ee79f365e6004e8a1b0a71f2",
 "afterBlob": "4f93e1b6697fdf303c2f8f6ebb392e3ed536c44c",
 "hunks": [
  {
   "at": 9,
   "before": "",
   "after": "\nconst leftBattleControls = [\n  'energyRing', 'energyDisc', 'energyIcon', 'energy',\n  'drawIcon', 'drawBadgeRing', 'drawBadge', 'draw', 'drawLabel',\n];\nconst rightBattleControls = [\n  'endTurn', 'discardIcon', 'discardBadgeRing', 'discardBadge', 'discard', 'discardLabel',\n];\n\nfunction stretchWidth(control, baseWidth) {\n  control.anchor = { min: [0, .5], max: [1, .5] };\n  control.size = [control.size[0] - baseWidth, control.size[1]];\n}\n\n// Attach after design profiles supply the final 16:9 positions. Translating\n// both the face and its counter preserves their authored margins and hitboxes.\nexport function anchorBattlePeriphery(stage, baseWidth, officialAssets) {\n  const panel = stage.children.find(control => control.name === 'battlePanel');\n  const parts = new Map(panel.children.map(control => [control.name, control]));\n  stretchWidth(panel, baseWidth);\n  const right = officialAssets ? [...rightBattleControls, 'exhaustIcon', 'exhaust'] : rightBattleControls;\n  for (const [anchor, names] of [[0, leftBattleControls], [1, right]]) {\n    for (const name of names) {\n      const control = parts.get(name);\n      control.anchor = { min: [anchor, .5], max: [anchor, .5] };\n      control.position = [control.position[0] + (.5 - anchor) * baseWidth, control.position[1]];\n    }\n  }\n  stretchWidth(parts.get('statusDismiss'), baseWidth);\n  const status = parts.get('statusInfo');\n  stretchWidth(status, baseWidth);\n  stretchWidth(status.children.find(control => control.name === 'hit'), baseWidth);\n}\n"
  }
 ]
};

// Retain the exact #1002 driver expected by the frozen calibration archive.
const replayDriver={
 "path": "tests/helpers/replay-reviewed-selection.mjs",
 "beforeSha256": "1e87ca4e008b3f0e8041bcab227f22b01c76aed77f8ab8b7d4a66a8eeeb38601",
 "afterSha256": "f39d920bd284ab1e069eb15e3433334ad9a6e1a8c516e326033b34eaaa4cc4a2",
 "beforeBlob": "16584dc4ccd71c43dc142cacc85b03175984500d",
 "afterBlob": "0492c4b56af211ed50ab40377e957d363d8d9bac",
 "hunks": [
  {
   "at": 13,
   "before": "import {beforeDeckPagesSuiteSource,readRetiredController,retiredControllerPath} from './input-retirement-source.mjs';\nconst hash=s=>createHash('sha256').update(s).digest('hex'),norm=s=>s.replaceAll('\\r\\n','\\n');\nconst reviewedContracts=Object.freeze({",
   "after": "import {beforeDeckPagesSuiteSource,readRetiredController,retiredControllerPath} from './input-retirement-source.mjs';\nimport {readReviewedOfficialAssetInput,reviewedOfficialAssetInputPaths} from './reviewed-official-asset-inputs.mjs';\nconst hash=s=>createHash('sha256').update(s).digest('hex'),norm=s=>s.replaceAll('\\r\\n','\\n');\nconst archivedOfficialAssets='tests/official-assets.test.mjs';\nconst reviewedContracts=Object.freeze({"
  },
  {
   "at": 20,
   "before": " 'tests/sts-card-reference.test.mjs':13,\n 'tests/official-assets.test.mjs':6,\n});",
   "after": " 'tests/sts-card-reference.test.mjs':13,\n [archivedOfficialAssets]:6,\n});"
  },
  {
   "at": 38,
   "before": " const started=Date.now(),remaining=()=>{const ms=60000-(Date.now()-started);assert(ms>0,'original selection replay deadline');return ms;};\n try{",
   "after": " const started=Date.now(),remaining=()=>{const ms=60000-(Date.now()-started);assert(ms>0,'original selection replay deadline');return ms;};\n const useArchivedOfficialInputs=script===archivedOfficialAssets;\n try{"
  },
  {
   "at": 43,
   "before": "   assert(!isAbsolute(path)&&!path.split('/').includes('..'));const target=join(directory,path);mkdirSync(dirname(target),{recursive:true});\n   const predecessor=exactReviewedBuildInput(path,readOwner,{beforeReviewedInput:beforeReviewedBuildInput});\n   if(predecessor===undefined)copyFileSync(path,target);",
   "after": "   assert(!isAbsolute(path)&&!path.split('/').includes('..'));const target=join(directory,path);mkdirSync(dirname(target),{recursive:true});\n   const input=useArchivedOfficialInputs?readReviewedOfficialAssetInput(path):undefined;\n   const predecessor=input??exactReviewedBuildInput(path,readOwner,{beforeReviewedInput:beforeReviewedBuildInput});\n   if(predecessor===undefined)copyFileSync(path,target);"
  },
  {
   "at": 83,
   "before": "  assert.equal(hash(readFileSync(target)),original.sha256,'unaltered complete historical assertions');\n  const env={...process.env};delete env.NODE_TEST_CONTEXT;",
   "after": "  assert.equal(hash(readFileSync(target)),original.sha256,'unaltered complete historical assertions');\n  if(useArchivedOfficialInputs){\n   for(const path of reviewedOfficialAssetInputPaths){\n    const expected=readReviewedOfficialAssetInput(path);\n    assert.equal(norm(readFileSync(join(directory,path),'utf8')),norm(expected),'exact staged official-assets input: '+path);\n   }\n  }\n  const env={...process.env};delete env.NODE_TEST_CONTEXT;"
  }
 ]
};

function predecessor(binding,path,source){
 if(path!==binding.path||typeof source!=='string')return source;
 const lf=source.replaceAll('\r\n','\n');
 const crlf=source!==lf;
 if(crlf&&source!==lf.replaceAll('\n','\r\n'))return source;
 if(!exactSourceMatches(lf,{sha256:binding.afterSha256,gitBlob:binding.afterBlob}))return source;
 const prior=restoreExactFixtureHunks(binding,path,lf);
 assert(exactSourceMatches(prior,{sha256:binding.beforeSha256,gitBlob:binding.beforeBlob}),'exact reviewed official-assets predecessor: '+path);
 return crlf?prior.replaceAll('\n','\r\n'):prior;
}

export const reviewedOfficialAssetInputPaths=Object.freeze(Object.keys(inputs));

export function readReviewedOfficialAssetInput(path,read=readFileSync){
 if(!Object.hasOwn(inputs,path))return undefined;
 const source=read(path,'utf8');
 let current=source;
 if(path===visualViewport.path){
  current=predecessor(visualViewport,path,source);
  assert.notEqual(current,source,'fresh current official-assets input: '+path);
 }
 const prior=predecessor(inputs[path],path,current);
 assert.notEqual(prior,current,'fresh current official-assets input: '+path);
 return prior;
}

export function beforeReviewedOfficialAssetReplay(path,source){
 return predecessor(replayDriver,path,source);
}
