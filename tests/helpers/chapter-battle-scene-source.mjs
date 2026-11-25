// Exact projections for historical build and deck replay only.
// Current build commands continue to read the source on disk.
import assert from 'node:assert/strict';
import {restoreExactFixtureHunks} from './exact-fixture-hunks.mjs';
import {exactSourceMatches} from './source-fingerprint.mjs';

const projections = {
  "scripts/build-ui.mjs": {
    "path": "scripts/build-ui.mjs",
    "beforeSha256": "75521043ed92befd4c67c76256c46babdb9e5da1ead9b1a05f8194d06ce83c69",
    "afterSha256": "fa68d2912f590eb714b3f1024ae630fb7a0ee1bcdb2f87fa9cf04fcf3a204b78",
    "beforeBlob": "de075d868ee0135ca877667cc35f5a9fa11fd6ea",
    "afterBlob": "ec2ba5cf4167218eed1e7e975a04998dc2289595",
    "hunks": [
      {
        "at": 2,
        "before": "import {applyOfficialAssets,officialAssetsTheme} from './official-assets-layout.mjs';\nimport {assertOfficialRunContracts} from './official-run-layout.mjs';",
        "after": "import {applyOfficialAssets,officialAssetsTheme} from './official-assets-layout.mjs';\nimport {chapterBattleScenes} from './v220-chapter-battle-scenes.mjs';\nimport {assertOfficialRunContracts} from './official-run-layout.mjs';"
      },
      {
        "at": 100,
        "before": "    fileURLToPath(new URL('./official-assets-layout.mjs', import.meta.url)),\n    fileURLToPath(new URL('./art/lightweight-2d-assets.mjs', import.meta.url)), ...releaseInputPaths()];",
        "after": "    fileURLToPath(new URL('./official-assets-layout.mjs', import.meta.url)),\n    fileURLToPath(new URL('./v220-chapter-battle-scenes.mjs', import.meta.url)),\n    fileURLToPath(new URL('./v220-battle-scene-geometry.mjs', import.meta.url)),\n    fileURLToPath(new URL('./art/lightweight-2d-assets.mjs', import.meta.url)), ...releaseInputPaths()];"
      },
      {
        "at": 105,
        "before": "    stat: statSync(input, { bigint: true }) }));\n  const outputs = ['abyss_theme.lua', 'map-ui.json', 'abyss_map_layout.lua', 'abyss_map_controls.lua',\n    'abyss_narrative.lua', 'abyss_presentation.lua', 'battle-ui.json', 'game-ui.json', 'abyss_ui_layout.lua',",
        "after": "    stat: statSync(input, { bigint: true }) }));\n  const outputs = ['abyss_theme.lua', 'abyss_chapter_battle_scene_data.lua', 'map-ui.json', 'abyss_map_layout.lua', 'abyss_map_controls.lua',\n    'abyss_narrative.lua', 'abyss_presentation.lua', 'battle-ui.json', 'game-ui.json', 'abyss_ui_layout.lua',"
      },
      {
        "at": 200,
        "before": "  }\n  if(officialAssets){\n    applyOfficialAssets([battle,layout,...templates],theme);\n    templates.push(battlePileCardTemplate(layout,templates[0]));",
        "after": "  }\n  const chapterScenes = refined ? chapterBattleScenes(theme) : undefined;\n  if(officialAssets){\n    applyOfficialAssets([battle,layout,...templates],theme,{chapterScenes});\n    templates.push(battlePileCardTemplate(layout,templates[0]));"
      },
      {
        "at": 232,
        "before": "  writeV25CardBinding(outputDirectory);\n  writeFileSync(join(outputDirectory, deckBrowserBindingModule+'.lua'), deckBrowserBindingSource(0,browserParts));",
        "after": "  writeV25CardBinding(outputDirectory);\n  const {scene: _chapterSceneLayout, ...chapterSceneData} = chapterScenes ?? {};\n  writeFileSync(join(outputDirectory,'abyss_chapter_battle_scene_data.lua'),\n    'return '+toLua(chapterSceneData)+'\\n');\n  writeFileSync(join(outputDirectory, deckBrowserBindingModule+'.lua'), deckBrowserBindingSource(0,browserParts));"
      }
    ]
  },
  "scripts/official-assets-layout.mjs": {
    "path": "scripts/official-assets-layout.mjs",
    "beforeSha256": "f5a6b4187c5dda7f532b675a2cafa9ad9221420be4d9fb9a596df66496fe95f7",
    "afterSha256": "02ddf00631e6ce7264144ebbf4145d8d48a201fb3d91c7b27cf52975758772e7",
    "beforeBlob": "72d0b6b14a1a7866a238b587af4bdea1ea9cd3f4",
    "afterBlob": "dcf6b24f59a22484be44bd0d671abb277c058b07",
    "hunks": [
      {
        "at": 2,
        "before": "import {applyV25BattleScene} from './v25-battle-scene.mjs';\nimport {applyV25BattleChrome} from './v25-battle-chrome.mjs';",
        "after": "import {applyV25BattleScene} from './v25-battle-scene.mjs';\nimport {applyChapterBattleScene} from './v220-chapter-battle-scenes.mjs';\nimport {applyV25BattleChrome} from './v25-battle-chrome.mjs';"
      },
      {
        "at": 245,
        "before": "}\nexport function applyOfficialAssets(trees,theme){\n if(!Array.isArray(trees)||!trees.length)throw Error('Official assets require layout trees');",
        "after": "}\nexport function applyOfficialAssets(trees,theme,{chapterScenes}={}){\n if(!Array.isArray(trees)||!trees.length)throw Error('Official assets require layout trees');"
      },
      {
        "at": 275,
        "before": "    applyV25TurnNoticeLayout(tree,theme);\n    applyV25BattleScene(tree,theme);\n    const battle=child(stage,'battlePanel')??stage;",
        "after": "    applyV25TurnNoticeLayout(tree,theme);\n    if(chapterScenes)applyChapterBattleScene(tree,chapterScenes);\n    else applyV25BattleScene(tree,theme);\n    const battle=child(stage,'battlePanel')??stage;"
      }
    ]
  },
  "scripts/native-candidate-scripts.mjs": {
    "path": "scripts/native-candidate-scripts.mjs",
    "beforeSha256": "a46d9f45900fc8bfc15878fa980a44b2e358f0137dedaf0c6748a6bb7957e1e0",
    "afterSha256": "489ea9aa92ad9a186ef52e7fab0dbd8038107ae88662a053de465eb5d31f2765",
    "beforeBlob": "638bba60319a3710f05b3088c43c3855cf817556",
    "afterBlob": "e010cf1cc68a5952c9495e8fc241ec9b5a72616b",
    "hunks": [
      {
        "at": 5,
        "before": "// Lua into build/lua; discovering every .lua there ships test fixtures.\nexport const generatedModules = [deckBrowserBindingModule, 'abyss_component_binding','abyss_v25_card_assets','abyss_ui_profile','abyss_art_features','abyss_monster_actor_binding','abyss_monster_art_data', 'abyss_data', 'abyss_original_v4_data', 'abyss_map_layout', 'abyss_narrative', 'abyss_presentation', 'abyss_theme', 'abyss_menu_background_asset', 'abyss_ready_card_binding', 'abyss_ready_card_assets', 'abyss_traveler_portrait_assets'];\n// Legacy LCG is superseded by the StS RNG modules. Keep its source/tests;",
        "after": "// Lua into build/lua; discovering every .lua there ships test fixtures.\nexport const generatedModules = [deckBrowserBindingModule, 'abyss_chapter_battle_scene_data', 'abyss_component_binding','abyss_v25_card_assets','abyss_ui_profile','abyss_art_features','abyss_monster_actor_binding','abyss_monster_art_data', 'abyss_data', 'abyss_original_v4_data', 'abyss_map_layout', 'abyss_narrative', 'abyss_presentation', 'abyss_theme', 'abyss_menu_background_asset', 'abyss_ready_card_binding', 'abyss_ready_card_assets', 'abyss_traveler_portrait_assets'];\n// Legacy LCG is superseded by the StS RNG modules. Keep its source/tests;"
      }
    ]
  }
};

export function beforeChapterBattleScene(path, source) {
  if (!Object.hasOwn(projections, path)) return source;
  const change = projections[path];
  if (!exactSourceMatches(source, {sha256: change.afterSha256, gitBlob: change.afterBlob})) return source;
  const before = restoreExactFixtureHunks(change, path, source);
  assert(exactSourceMatches(before, {sha256: change.beforeSha256, gitBlob: change.beforeBlob}),
    'exact chapter scene predecessor: ' + path);
  return source.includes('\r\n') ? before.replaceAll('\n', '\r\n') : before;
}
