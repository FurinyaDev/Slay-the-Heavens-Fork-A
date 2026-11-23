// Exact checkout identities for replaying the previous development profile.
import assert from 'node:assert/strict';
import {exactSourceMatches} from './source-fingerprint.mjs';

const owners = new Map(Object.entries({
  "src/lua/abyss_acts.lua": {
    "current": {
      "sha256": "f6edd5a15275c8a04d8d3338d096aa8dab68af08aa54b875ba4ac2da1e7e031b",
      "gitBlob": "93505b0962ec81eb4fb2275da934e0470fbe177a"
    },
    "prior": {
      "sha256": "06307170ce3ee1627c9ea5ebe45f9042a4857ad153f7f92e625f2e9856cc8150",
      "gitBlob": "9d45b715a8c55321ab409d7b4e9a41d6555643ec"
    },
    "hunks": [
      {
        "at": 2,
        "after": "local Seed = require('abyss_run_seed')\nlocal Admission = require('abyss_run_admission')\nlocal M = {}\n",
        "before": "local Seed = require('abyss_run_seed')\nlocal M = {}\n"
      },
      {
        "at": 10,
        "after": "}\n-- Both bounded profiles use the same two-act progression.\nfunction M.isCompetition(run)return Admission.isTwoAct(run.campaignProfile)end\nfunction M.get(act)\n",
        "before": "}\n-- Explicit competition boundary; omitted/full-source retains future chapter fixtures.\nfunction M.isCompetition(run)return run.campaignProfile=='competition-two-act'end\nfunction M.get(act)\n"
      }
    ]
  },
  "src/lua/abyss_character_select.lua": {
    "current": {
      "sha256": "33f1b685d9f5cbff5dbbed69f848cbc136a85cf5723c83433b82a4ef77d1836d",
      "gitBlob": "399f11fbea32f6fb73e6acc856f8c364145b0a67"
    },
    "prior": {
      "sha256": "53f84adc19b77af6157aa10ee9ac96b61fbd7809e588e845523779d333c9e2c1",
      "gitBlob": "b74dde6740aa2f4bf009fc5eee1b7d97c4ebeb76"
    },
    "hunks": [
      {
        "at": 8,
        "after": "local profiles={dev='full-source',alpha='competition-two-act',['competition-candidate']='competition-two-act',\n    production='competition-two-act',['competition-two-act']='competition-two-act',['full-source']='full-source',\n    ['sts1-develop']='sts1-develop'}\nlocal function admissionProfile(profile)\n",
        "before": "local profiles={dev='full-source',alpha='competition-two-act',['competition-candidate']='competition-two-act',\n    production='competition-two-act',['competition-two-act']='competition-two-act',['full-source']='full-source'}\nlocal function admissionProfile(profile)\n"
      }
    ]
  },
  "src/lua/abyss_ending_history.lua": {
    "current": {
      "sha256": "3f06ed8a93fa475fd1f7db352ed9d50a95a3cf95f8045d6cc03aaa2963a1066c",
      "gitBlob": "b404890b677d785f97ce46866586721cbf5e3eb8"
    },
    "prior": {
      "sha256": "63b94ebe69ab457b5237a908071d0647c3be9cb64e0831cfd6cf2f800158b66e",
      "gitBlob": "a696b01492489493c54b56c6d08462af3c9060fe"
    },
    "hunks": [
      {
        "at": 1,
        "after": "local M={}\nlocal Admission=require('abyss_run_admission')\nlocal roles={ironclad=true,silent=true,defect=true}\n",
        "before": "local M={}\nlocal roles={ironclad=true,silent=true,defect=true}\n"
      },
      {
        "at": 67,
        "after": " if not plain(run)then return nil,'invalid_ending_run'end\n if Admission.isTwoAct(run.campaignProfile) then\n  return {known=false,unlocked=false,wins={},source='competition-disabled',\n",
        "before": " if not plain(run)then return nil,'invalid_ending_run'end\n if run.campaignProfile=='competition-two-act'then\n  return {known=false,unlocked=false,wins={},source='competition-disabled',\n"
      }
    ]
  },
  "src/lua/abyss_run_admission.lua": {
    "current": {
      "sha256": "93aea53c2724c7cbc1067fba49549c614b592a469d4acf51746d94948baf7794",
      "gitBlob": "babf5d448a4e6b19816a4eefa6336c47ae4c7c50"
    },
    "prior": {
      "sha256": "7a57fd9c9c11770f51f642df85180a4caddf5999901b7467c44eb8c52bd79992",
      "gitBlob": "14e590b069773072f146deb1e4f21c31023a9cf8"
    },
    "hunks": [
      {
        "at": 0,
        "after": "-- Public competition and editor-only STS1 both use the two-act campaign.\n-- Explicit full-source hosts retain the original development fixtures.\nlocal M={}\nlocal editorProfile='sts1-develop'\nlocal restricted={\n    ['competition-two-act']={ironclad=true},\n    [editorProfile]={ironclad=true,silent=true,defect=true,watcher=true},\n}\n\nfunction M.editorProfile(build,testPlay)\n    if testPlay==true and type(build)=='table' and build.workKey==editorProfile then return editorProfile end\nend\n\nfunction M.isTwoAct(profile)\n    return restricted[profile]~=nil\nend\n\nfunction M.supportsCampaign(profile)\n    return profile=='full-source' or M.isTwoAct(profile)\nend\n\nfunction M.allows(profile,id)\n    local roles=restricted[profile]\n    return not roles or id==nil or roles[id]==true\nend\n\nfunction M.accepts(data,options)\n    local roles=options and restricted[options.campaignProfile]\n    if not roles then return true end\n    if data.originalV4Rules~=nil then return false end\n    local identity\n    -- runCardCharacter identifies the catalogue, not an active prepared role.\n    for _,field in ipairs({{options,'character'},{data,'experimentalCharacter'},{data,'characterId'},\n",
        "before": "-- The public competition profile admits only Geo Traveler.\n-- Explicit full-source hosts retain every development/future role and content pool.\nlocal M={}\nlocal competition={ironclad='ironclad'}\nfunction M.allows(profile,id)\n    return profile~='competition-two-act' or id==nil or competition[id]~=nil\nend\nfunction M.accepts(data,options)\n    if not options or options.campaignProfile~='competition-two-act' then return true end\n    local identity\n    -- runCardCharacter describes the assembled source catalogue, not an active\n    -- prepared role. A raw shared catalogue remains a legal Geo input.\n    for _,field in ipairs({{options,'character'},{data,'experimentalCharacter'},{data,'characterId'},\n"
      },
      {
        "at": 35,
        "after": "        if id~=nil then\n            if not roles[id] or identity and identity~=id then return false end\n            identity=id\n        end\n    end\n    return true\nend\n",
        "before": "        if id~=nil then\n            local canonical=competition[id]\n            if not canonical or identity and identity~=canonical then return false end\n            identity=canonical\n        end\n    end\n    return true -- no identity markers means the unchanged production Geo loadout\nend\n"
      }
    ]
  },
  "src/lua/abyss_run_initialization.lua": {
    "current": {
      "sha256": "210b705bec9ad64460b6f6d933e3ceaa14b26c1772bf03f4cbab165131c036bd",
      "gitBlob": "90096da9d3c46ecfc3eff9efcfe1ff497a8c6059"
    },
    "prior": {
      "sha256": "1b6779a80523c03c14bafdd399215190cadf04437d76a6db6e86a3f768fc73f9",
      "gitBlob": "7a934b8dc311d127aaa8f6169052d2b9ab188ef3"
    },
    "hunks": [
      {
        "at": 19,
        "after": "            assert(options.campaign==nil or type(options.campaign)=='boolean','invalid campaign option')\n            local admission=require('abyss_run_admission')\n            assert(options.campaignProfile==nil or options.campaign==true\n                and admission.supportsCampaign(options.campaignProfile),\n                'invalid campaign profile')\n",
        "before": "            assert(options.campaign==nil or type(options.campaign)=='boolean','invalid campaign option')\n            assert(options.campaignProfile==nil or options.campaign==true\n                and (options.campaignProfile=='competition-two-act' or options.campaignProfile=='full-source'),\n                'invalid campaign profile')\n"
      },
      {
        "at": 25,
        "after": "                'campaign requires explicit experimental mode')\n            assert(admission.accepts(data,options),'competition_character_unavailable')\n            if require('abyss_original_v4_profiles').is(options.character) then\n",
        "before": "                'campaign requires explicit experimental mode')\n            assert(require('abyss_run_admission').accepts(data,options),'competition_character_unavailable')\n            if require('abyss_original_v4_profiles').is(options.character) then\n"
      }
    ]
  },
  "src/lua/abyss_ui.lua": {
    "current": {
      "sha256": "45cd7a0d216e1537119022baefdacbbc4bdf792c2321a797a77f8888e8d6652f",
      "gitBlob": "473e41d0470a48a95fbb97c1e40a72a699d7f85d"
    },
    "prior": {
      "sha256": "84fc9d11d047f3218bddf0bc0d09e4096623b0c0638c29f7c674d4810cdef722",
      "gitBlob": "b5781256cbd2afc204214ccdc7d1c9e0f79fc284"
    },
    "hunks": [
      {
        "at": 238,
        "after": "        local alpha = type(build)=='table' and build.workKey=='alpha-test'\n        local editorProfile = require('abyss_run_admission').editorProfile(build,isTest and testPlay)\n        local deckBinding=require('abyss_deck_browser_binding')\n",
        "before": "        local alpha = type(build)=='table' and build.workKey=='alpha-test'\n        local deckBinding=require('abyss_deck_browser_binding')\n"
      },
      {
        "at": 261,
        "after": "        view = GameUI.new(stage, Data, Presentation, Enum.CursorEventType.CursorClick,\n            { background = background, portraits = portraits, cardArt = cardArt, music = music, prologue = true, campaign = true, campaignProfile = editorProfile or \"competition-two-act\",\n              nativePageLifecycle = nativePageLifecycle,presentationReady=presentationReady,presentationPage=presentationPage,\n",
        "before": "        view = GameUI.new(stage, Data, Presentation, Enum.CursorEventType.CursorClick,\n            { background = background, portraits = portraits, cardArt = cardArt, music = music, prologue = true, campaign = true, campaignProfile = \"competition-two-act\",\n              nativePageLifecycle = nativePageLifecycle,presentationReady=presentationReady,presentationPage=presentationPage,\n"
      },
      {
        "at": 269,
        "after": "              createEasterEggArt=createEasterEggArt,\n              characterProfile = editorProfile or ((alpha or isTest and testPlay == true) and \"competition-candidate\" or \"production\"),\n              deckBrowser=deckTemplateIndex>0 and {\n",
        "before": "              createEasterEggArt=createEasterEggArt,\n              characterProfile = (alpha or isTest and testPlay == true) and \"competition-candidate\" or \"production\",\n              deckBrowser=deckTemplateIndex>0 and {\n"
      }
    ]
  }
}));

export function beforeSts1Develop(path, source) {
  const binding = owners.get(path);
  if (!binding || !exactSourceMatches(source, binding.current)) return source;
  const lines = source.replaceAll('\r\n', '\n').split(/(?<=\n)/u);
  for (const {at, after, before} of binding.hunks.toReversed()) {
    const count = after.split(/(?<=\n)/u).length;
    assert.equal(lines.slice(at, at + count).join(''), after, 'STS1 development source hunk: ' + path);
    lines.splice(at, count, before);
  }
  const prior = lines.join('');
  assert(exactSourceMatches(prior, binding.prior), 'STS1 development source predecessor: ' + path);
  return source.includes('\r\n') ? prior.replaceAll('\n', '\r\n') : prior;
}
