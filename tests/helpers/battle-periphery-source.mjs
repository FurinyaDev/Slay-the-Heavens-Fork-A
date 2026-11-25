// Historical proof only. Production builders and Lua load the current files.
// Source revisions 8b4172d59779ad9fa21b4ba91ef750ab22fcdaf1 and 4f6733cbb5a23f181dcf2b3b0838872d3a63779d.
import assert from 'node:assert/strict';
import {restoreExactFixtureHunks} from './exact-fixture-hunks.mjs';
import {exactSourceMatches} from './source-fingerprint.mjs';

const projections = {
  "scripts/build-ui.mjs": {
    "path": "scripts/build-ui.mjs",
    "beforeSha256": "75521043ed92befd4c67c76256c46babdb9e5da1ead9b1a05f8194d06ce83c69",
    "afterSha256": "54a06a5d5587d4be37050a8c0ef87cc71cef02b0ec205c27e1c5b0a8ed149aeb",
    "beforeBlob": "de075d868ee0135ca877667cc35f5a9fa11fd6ea",
    "afterBlob": "6f75e050dcae41c30002fe60ca0e3994bdbb4037",
    "hunks": [
      {
        "at": 16,
        "before": "import { attachEntranceLayers } from './ui-entrance-layout.mjs';\nimport { gameLayout } from './game-ui-layout.mjs';\nimport { withViewport } from './viewport-layout.mjs';\nimport { buildUiTheme } from './build-ui-theme.mjs';\nimport { buildMapUI } from './map-ui-layout.mjs';",
        "after": "import { attachEntranceLayers } from './ui-entrance-layout.mjs';\nimport { gameLayout } from './game-ui-layout.mjs';\nimport { withViewport, anchorBattlePeriphery } from './viewport-layout.mjs';\nimport { buildUiTheme } from './build-ui-theme.mjs';\nimport { buildMapUI } from './map-ui-layout.mjs';"
      },
      {
        "at": 214,
        "before": "  templates.push(forgeCard);\n  if (officialAssets) assertOfficialRunContracts([battle, layout, ...templates]);\n  const browserParts=officialAssets&&nativePageLifecycle?deckBrowserParts:[];\n  if(browserParts.length)templates.push(...splitDeckBrowserCard(templates.find(t=>t.name==='AbyssBattlePileCard')));",
        "after": "  templates.push(forgeCard);\n  if (officialAssets) assertOfficialRunContracts([battle, layout, ...templates]);\n  anchorBattlePeriphery(stage, theme.canvas.base[0], officialAssets);\n  const browserParts=officialAssets&&nativePageLifecycle?deckBrowserParts:[];\n  if(browserParts.length)templates.push(...splitDeckBrowserCard(templates.find(t=>t.name==='AbyssBattlePileCard')));"
      }
    ]
  },
  "src/lua/abyss_card_flow.lua": {
    "path": "src/lua/abyss_card_flow.lua",
    "beforeSha256": "abeb85aab55a9d4cf1c8c8b9f434aaf8ffff1e77e0b027160099a4e939e21c13",
    "afterSha256": "ba98442cefc690b9704ad2b157368e800e1683d0087e890b77ea11065f0ccc12",
    "beforeBlob": "486b63e804f138ee7a1ba1dc8241bdf9d3b99731",
    "afterBlob": "d8f8157f18ab2d3aff30ecd46bdad16ca52ff30c",
    "hunks": [
      {
        "at": 1,
        "before": "-- Ten reusable native mini-cards match the hand limit; overflow waits in Lua.\nlocal Theme=require('abyss_theme')\nlocal M={}\n-- Exhaust burn timing (seconds / px); total is the exhaust trail lifetime.",
        "after": "-- Ten reusable native mini-cards match the hand limit; overflow waits in Lua.\nlocal Theme=require('abyss_theme')\nlocal Viewport=require('abyss_viewport')\nlocal M={}\n-- Exhaust burn timing (seconds / px); total is the exhaust trail lifetime."
      },
      {
        "at": 25,
        "before": "    return {distance*spacing,math.max(floor,L.hand.y-math.abs(distance)*L.hand.arcDrop)}\nend\nlocal function point(place)\n    if place.pile=='hand'or place.pile=='retain'then return handPoint(place.index,place.count)end\n    if place.pile=='draw'then return L.drawPile.position end\n    if place.pile=='discard'then return L.discardPile.position end\n    if place.pile=='exhaust'then\n        local b=L.topBar\n        return {b.exhaustIcon[1],b.y}\n    end\n    return L.player.position\nend\nfunction M.new(stage,platform)\n    local self={active={},waiting={},inPlay={},moving={}}\n    local overlay=stage:GetChild('feedback')\n    local function colour(c,alpha)return platform.color(c.r,c.g,c.b,math.floor((c.a or 255)*alpha))end\n    local function box(slot)return overlay:GetChild('cardTrail'..slot)end\n    function self.reset()\n        for slot=1,10 do box(slot):SetVisible(false)end",
        "after": "    return {distance*spacing,math.max(floor,L.hand.y-math.abs(distance)*L.hand.arcDrop)}\nend\nfunction M.new(stage,platform,pileLayout)\n    pileLayout=pileLayout or Viewport.pileLayout(stage)\n    local self={active={},waiting={},inPlay={},moving={}}\n    local extra\n    local overlay=stage:GetChild('feedback')\n    local function colour(c,alpha)return platform.color(c.r,c.g,c.b,math.floor((c.a or 255)*alpha))end\n    local function box(slot)return overlay:GetChild('cardTrail'..slot)end\n    local function point(place)\n        if place.pile=='hand'or place.pile=='retain'then return handPoint(place.index,place.count)end\n        local x,y=pileLayout.point(place.pile,extra)\n        return x and {x,y} or L.player.position\n    end\n    local function retarget(entry)\n        local sx=pileLayout.point(entry.from,extra)\n        local tx=pileLayout.point(entry.to,extra)\n        if sx then entry.start[1]=sx end\n        if tx then entry.finish[1]=tx end\n    end\n    local function syncViewport()\n        local width=pileLayout.extraWidth()\n        if extra==width then return end\n        extra=width\n        for _,entry in pairs(self.active)do retarget(entry)end\n        for _,entry in ipairs(self.waiting)do retarget(entry)end\n    end\n    function self.reset()\n        for slot=1,10 do box(slot):SetVisible(false)end"
      },
      {
        "at": 64,
        "before": "            order=to.pile=='discard'and #self.waiting or 0}\n    end\n    function self.sync(_owner,before,after,kind,complete)\n        local old,new=locations(before),locations(after)\n        for _,pile in ipairs(piles)do for index,card in ipairs(after[pile]or{})do",
        "after": "            order=to.pile=='discard'and #self.waiting or 0}\n    end\n    local function settleInPlay(after)\n        for uid,entry in pairs(self.inPlay)do\n            local using=after.cardInUse and after.cardInUse.uid==uid\n            if not using then\n                local definition=after.catalog.cards[entry.card.cardId]\n                if definition.type=='power'then enqueue(entry.card,entry,{pile='power'},'能力生效')end\n                -- Purged/autoplay and terminal battle cleanup are not exhaust.\n                self.inPlay[uid]=nil\n            end\n        end\n    end\n    function self.sync(_owner,before,after,kind,complete)\n        syncViewport()\n        local old,new=locations(before),locations(after)\n        for _,pile in ipairs(piles)do for index,card in ipairs(after[pile]or{})do"
      },
      {
        "at": 88,
        "before": "            end\n        end end\n        if complete then for uid,entry in pairs(self.inPlay)do\n            local using=after.cardInUse and after.cardInUse.uid==uid\n            local definition=after.catalog.cards[entry.card.cardId]\n            if not using and definition.type=='power'then\n                enqueue(entry.card,entry,{pile='power'},'能力生效')\n                self.inPlay[uid]=nil\n            elseif not using then\n                -- Purged/autoplay and terminal battle cleanup are not exhaust.\n                self.inPlay[uid]=nil\n            end\n        end end\n    end\n    -- Exhaust burn: behaviour port of Slay the Spire ExhaustCardEffect (lift + pow2Out",
        "after": "            end\n        end end\n        if complete then settleInPlay(after)end\n    end\n    -- Exhaust burn: behaviour port of Slay the Spire ExhaustCardEffect (lift + pow2Out"
      },
      {
        "at": 171,
        "before": "        end\n    end\n    function self.update(_owner,dt,catalog,presentation,fast)\n        for slot=1,10 do\n            local entry=self.active[slot]",
        "after": "        end\n    end\n    local function animate(card,entry)\n        if entry.to=='exhaust'then return burn(card,entry)end\n        if entry.to=='discard'then return discard(card,entry)end\n        local p=math.min(1,entry.age/T.slow)\n        local q=p*p*(3-2*p)\n        local lift=entry.to=='retain'and Theme.space.s or Theme.space.xxl\n        card:SetAnchoredPosition(entry.start[1]+(entry.finish[1]-entry.start[1])*q,\n            entry.start[2]+(entry.finish[2]-entry.start[2])*q+math.sin(p*math.pi)*lift)\n        local scale=entry.to=='retain'and 0.5 or 0.5-(0.5-0.12/0.75)*q\n        card:SetLocalScale(scale,scale,1)\n        return p>=1\n    end\n    function self.update(_owner,dt,catalog,presentation,fast)\n        if next(self.active)==nil and #self.waiting==0 then return end\n        syncViewport()\n        for slot=1,10 do\n            local entry=self.active[slot]"
      },
      {
        "at": 194,
        "before": "            if entry then\n                entry.age=entry.age+dt*(fast and 2 or 1)\n                local p=math.min(1,entry.age/T.slow)\n                local q=p*p*(3-2*p)\n                local card=box(slot)\n                local done\n                if entry.to=='exhaust'then done=burn(card,entry)\n                elseif entry.to=='discard'then done=discard(card,entry)else\n                local lift=entry.to=='retain'and Theme.space.s or Theme.space.xxl\n                card:SetAnchoredPosition(entry.start[1]+(entry.finish[1]-entry.start[1])*q,\n                    entry.start[2]+(entry.finish[2]-entry.start[2])*q+math.sin(p*math.pi)*lift)\n                local scale=entry.to=='retain'and 0.5 or 0.5-(0.5-0.12/0.75)*q\n                card:SetLocalScale(scale,scale,1)\n                done=p>=1 end\n                -- Keep the card visible at its real endpoint for one update before recycling.\n                if entry.arrived and dt>0 then",
        "after": "            if entry then\n                entry.age=entry.age+dt*(fast and 2 or 1)\n                local card=box(slot)\n                local done=animate(card,entry)\n                -- Keep the card visible at its real endpoint for one update before recycling.\n                if entry.arrived and dt>0 then"
      }
    ]
  },
  "src/lua/abyss_feedback.lua": {
    "path": "src/lua/abyss_feedback.lua",
    "beforeSha256": "fd97bf7d457f33e55fa733195065749d1d30489e8bf82dadab8602c157dd5b19",
    "afterSha256": "775ba2b066a1aeae9e23863d5283f0482253110deae770dc73944ec126cac4aa",
    "beforeBlob": "7d9f139d4571ae4de084e67226f31f1e401a08d5",
    "afterBlob": "4c66dde58f821bdfda70b95ebdb7eb8f9f1b0fdf",
    "hunks": [
      {
        "at": 167,
        "before": "end\n\nfunction M.new(stage, platform, present, complete)\n    local self = { busy = false, fastMode = false, effects = {}, deaths = {}, dying = {}, poses = {}, escaping = {}, escaped = {}, slotOwners = {}, tints = {} }\n    local overlay = stage:GetChild(\"feedback\")",
        "after": "end\n\nfunction M.new(stage, platform, present, complete, pileLayout)\n    local self = { busy = false, fastMode = false, effects = {}, deaths = {}, dying = {}, poses = {}, escaping = {}, escaped = {}, slotOwners = {}, tints = {} }\n    local overlay = stage:GetChild(\"feedback\")"
      },
      {
        "at": 180,
        "before": "        if battle and not self.busy then self.shadow = battle end\n    end\n    self.cardFlow=CardFlow.new(stage,platform)\n    local function colour(c, alpha) return platform.color(c.r, c.g, c.b, math.floor((c.a or 255) * (alpha or 1))) end\n    local function tint(box, c, alpha) box.imageColor = colour(c, alpha) end",
        "after": "        if battle and not self.busy then self.shadow = battle end\n    end\n    self.cardFlow=CardFlow.new(stage,platform,pileLayout)\n    local function colour(c, alpha) return platform.color(c.r, c.g, c.b, math.floor((c.a or 255) * (alpha or 1))) end\n    local function tint(box, c, alpha) box.imageColor = colour(c, alpha) end"
      }
    ]
  }
};

function matches(source, sha256, gitBlob) {
  if (typeof source !== 'string') return false;
  if (source.includes('\r') && source.replaceAll('\r\n', '\n').replaceAll('\n', '\r\n') !== source) return false;
  return exactSourceMatches(source, {sha256, gitBlob});
}

export function beforeBattlePeriphery(path, source, read) {
  if (!Object.hasOwn(projections, path)) return source;
  const proof = projections[path];
  const current = matches(source, proof.afterSha256, proof.afterBlob);
  const prior = matches(source, proof.beforeSha256, proof.beforeBlob);
  if (!current && !prior) return source;
  if (read) {
    const sha = current ? proof.afterSha256 : proof.beforeSha256;
    const blob = current ? proof.afterBlob : proof.beforeBlob;
    assert(matches(read(path, 'utf8'), sha, blob), 'combined linked owner identity: '+path+' changed during owner validation');
  }
  if (!current) return source;
  const before = restoreExactFixtureHunks(proof, path, source);
  assert(matches(before, proof.beforeSha256, proof.beforeBlob), 'exact battle periphery predecessor: '+path);
  return source.includes('\r\n') ? before.replaceAll('\n', '\r\n') : before;
}

export function battlePeripheryPredecessor(path, source, read) {
  return {
    source: beforeBattlePeriphery(path, source, read),
    read: (owner, encoding) => beforeBattlePeriphery(owner, read(owner, encoding)),
  };
}
