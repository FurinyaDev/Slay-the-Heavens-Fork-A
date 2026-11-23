import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {copyFileSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {join, resolve, sep} from 'node:path';
import {loadNativeUiEncoder} from '../../scripts/native-ui-encoder.mjs';
import {pathToFileURL} from 'node:url';
import {previewImageMaskFields} from '../../scripts/native-candidate-preview.mjs';

const here = new URL('./', import.meta.url);
const read = path => readFileSync(path, 'utf8');
const json = path => JSON.parse(read(path));
const hash = path => createHash('sha256').update(readFileSync(path)).digest('hex');
const variants = ['lua', 'tween', 'sequence'];
const child = (node, name) => {
    const result = (node.children ?? node.controls).find(c => c.name === name);
    assert(result, 'Missing generated control ' + name);
    return structuredClone(result);
};
const count = node => 1 + (node.children ?? []).reduce((sum, part) => sum + count(part), 0);
const layout = json('build/official-ab/game-ui.json');
const stage = child(layout, 'stage');
const nodePanel = child(stage, 'nodePanel');
const select = child(stage, 'characterPanel');
const button = child(child(child(stage, 'exitPanel'), 'confirm'), 'hit');
const rect = {min:[0,0],max:[1,1]};
const image = (name, colour) => ({name,kind:'image',image:100001,size:[0,0],anchor:rect,colour});

function buttons() {
    const current = {...button,name:'buttonCurrent',position:[-360,0]};
    const compact = structuredClone(button);
    for (const state of compact.children) {
        state.children = state.children.filter(c => c.visible !== false);
    }
    const sliced = (name, x, id) => {
        const root = {...structuredClone(compact),name,position:[x,0]};
        for (const state of root.children) {
            const face = child(state, 'roundedButton');
            state.children = [child(state, 'label')];
            for (const surface of face.children) {
                const colour = surface.children[0].colour;
                state.children.splice(-1, 0, {
                    name:surface.name,kind:'image',size:surface.size,anchor:surface.anchor,
                    image:id,imageType:'stretch',colour,
                });
            }
        }
        return root;
    };
    return [current,{...compact,name:'buttonPreset',position:[0,0]},
        sliced('buttonStretch',360,106030)];
}

function controls(variant) {
    const shop = child(nodePanel, 'shopView');
    shop.children = shop.children.filter(c => ['v25ShopCloth','card1','price1'].includes(c.name));
    const treasure = child(nodePanel, 'treasureView');
    treasure.children = treasure.children.filter(c => /^(glow|closed|open|burst|page|bossDescription|rewardItem[1-4])$/.test(c.name));
    if (variant !== 'lua') {
        const burst = child(treasure, 'burst');
        treasure.children[treasure.children.findIndex(c=>c.name==='burst')] = {
            name:'burst',kind:'animation',size:burst.size,position:burst.position,visible:false,below:true,effect:10001077,
        };
    }
    treasure.children.push({name:'fullscreenProbe',kind:'fullscreenAnimation',visible:false,below:true});
    const details = child(select, 'details');
    details.children = details.children.filter(c => ['name','stats','v25Story'].includes(c.name));
    const room = (name, children, visible=false) => ({name,kind:'container',anchor:rect,size:[0,0],visible,children});
    const map = child(stage, 'mapPanel');
    map.children = map.children.filter(c=>['v25MapPaper'].includes(c.name));
    return [image('background','#292A36'),
        room('buttons',buttons(),true),
        {...map,visible:false},
        room('shop',[{...shop,visible:true}, {...child(nodePanel,'back'),name:'shopBack',visible:true}]),
        room('character',[{...details,visible:true}, {...child(select,'confirm'),visible:true}, {...child(select,'cancel'),visible:true}]),
        room('treasure',[{...treasure,visible:true}, {name:'roomEffect',kind:'container',visible:false,children:
            ['title','description','icon'].map(name => ({name,kind:name==='icon'?'image':'text',size:[100,32]}))}]),
        {...child(stage,'pageReveal'),visible:false}];
}

const kinds = {container:'container',image:'image',text:'textbox',cursorArea:'cursor',presetButton:'button',animation:'animation',fullscreenAnimation:'fullscreen'};
const devices = {KEYBOARD:null,TOUCHSCREEN:'mobile',CONTROLLER_CONSOLE:'console',CONTROLLER_MOBILE:'mobileGamepad'};
const pair = ([x,y]) => ({x,y});
const ink = (c='#FFFFFF',a=1) => ((Math.round(a*255)<<24)|(parseInt(c.slice(1),16)&0xffffff))>>>0;
const align = {left:'Left',centre:'Middle',center:'Middle',right:'Right',middle:'Middle',top:'Top',bottom:'Bottom'};
export function project(readback, scripts) {
    const save = json('experiments/art-tech-lab/seed.save.json');
    const {interface:ui, ids, rootId} = readback;
    function convert(spec, path) {
        const kind = kinds[spec.kind];
        assert(kind, spec.kind + ' at ' + path);
        const guid = path ? ids[path] : rootId;
        assert(Number.isSafeInteger(guid), path);
        const transformByPlatform = Object.fromEntries(Object.entries(devices).map(([platform, device])=>{
            const {position=[0,0],size=[0,0],rotation=0,scale=[1,1],anchor={min:[.5,.5],max:[.5,.5]},pivot=[.5,.5]} = {...spec,...spec.devices?.[device]};
            const [x,y,z] = Array.isArray(rotation) ? rotation : [0,0,rotation];
            return [platform,{scale:{...pair(scale),z:1},rotation:{x,y,z},anchorMin:pair(anchor.min),anchorMax:pair(anchor.max),offset:pair(position),size:pair(size),pivot:pair(pivot)}];
        }));
        const n = {id:'n'+guid,guid,name:spec.name,kind,active:spec.active!==false,visible:spec.visible!==false,
            canControllerFocus:spec.focusable===true,showCursor:spec.showCursor===true,disableCursorEventPassthrough:spec.blockCursor===true,
            syncAllDevices:!spec.devices,transformByPlatform,scriptMappingIds:[],
            children:[...(spec.children??[])].reverse().map(c=>convert(c,path ? path+'/'+c.name : c.name))};
        if (kind==='image') Object.assign(n,{imageSource:'StaticReference',imageId:spec.image,imageType:spec.imageType==='stretch'?'Stretch':'Basic',
            imageColor:ink(spec.colour,spec.opacity),...previewImageMaskFields(spec)});
        if (kind==='textbox') {
            const t = spec.text ?? {};
            Object.assign(n,{text:t.content??'',fontSize:t.fontSize??20,adaptiveFontSize:t.autoSize===true,minimumFontSize:t.minFontSize??20,
                horizontalAlignment:align[t.align]??'Left',verticalAlignment:align[t.valign]??'Top',fontColor:ink(t.colour,t.opacity),
                bgColor:ink(t.background,t.backgroundOpacity??0),enableOutline:t.outline!==false,outlineColor:ink(t.outlineColour??'#333333',t.outlineOpacity??.2)});
        }
        if (kind==='cursor') n.raycastTarget=true;
        if (kind==='button') {
            const stateId = name => n.children.find(c=>c.name===spec.states?.[name])?.id ?? null;
            // BeyondSimulator 0.5.2 has no normalChildId. The normal face remains visible below the other faces.
            Object.assign(n,{raycastTarget:true,interactable:spec.enabled!==false,hoverChildId:stateId('hover'),
                pressedChildId:stateId('pressed'),unavailableChildId:stateId('disabled'),clickAudioId:spec.sound});
        }
        if (kind==='animation'||kind==='fullscreen') Object.assign(n,{animationId:spec.effect,playSoundEffect:false,layer:spec.kind==='fullscreenAnimation'||spec.below?'BelowAllControls':'AboveAllControls'});
        return n;
    }
    const root = convert({name:'root',kind:'container',showCursor:true,anchor:rect,children:ui.controls},'');
    const script = scripts.find(s=>s.name==='ab_probe');
    assert(script && ui.scripts.includes(script.name));
    root.scriptMappingIds=[script.scriptId];
    save.assets.server.root.children=[root];
    save.assets.client.root.children=[];
    save.assets.scripts=scripts.map(s=>({id:'s'+s.scriptId,guid:s.scriptId,path:s.file,source:s.source,
        controlId:s===script?root.id:null,controlAsset:s===script?'server-control-template':null}));
    return save;
}

function replaceOnce(source, before, after) {
    assert.equal(source.split(before).length, 2, 'Changed experiment intervention anchor: '+before);
    return source.replace(before, after);
}
function modules(variant) {
    const gate = read('src/lua/abyss_page_reveal.lua');
    const motion = read('src/lua/abyss_node_ui_motion.lua');
    const shop = read('src/lua/abyss_node_ui_shop.lua');
    const duration = shop.match(/local duration = (\.\d+)/)?.[1];
    const curve = shop.match(/local remaining = ([^\n]+)/)?.[1];
    assert.equal(curve,'(1-p)^3');
    assert(duration);
    let room = motion;
    if (variant!=='lua') {
        room = replaceOnce(room,"panel:GetChild('burst'):SetVisible(false)",
            "panel:GetChild('burst'):StopAnimation();panel:GetChild('burst'):SetVisible(false)");
        room = replaceOnce(room,"  flash:SetAnchoredPosition(x,y);flash:SetVisible(t>=T.shakeDuration and burst<1)\n  flash:SetLocalScale(.6+burst*1.4,.6+burst*1.4,1)\n  tint(flash,Theme.color.goldBright,1-burst)",
            "  if t>=T.shakeDuration and not a.effect then\n   a.effect=true;flash:SetAnchoredPosition(base[1],base[2])\n   flash:SetVisible(true);flash:PlayAnimation()\n  elseif burst>=1 and flash.visible then flash:StopAnimation();flash:SetVisible(false) end");
        if (variant==='sequence') {
            room = replaceOnce(room, "  panel:GetChild('glow'):SetLocalScale(1+math.sin(burst*math.pi),1+math.sin(burst*math.pi),1)",
                "  if t>=T.shakeDuration and not a.glow then\n   local glow=panel:GetChild('glow')\n   a.glow=game.TweenSequence():Append(game.Tween(glow,{localScaleX=2,localScaleY=2},T.burstDuration/2):SetEase(Enum.EaseType.OutSine))\n   a.glow:Append(game.Tween(glow,{localScaleX=1,localScaleY=1},T.burstDuration/2):SetEase(Enum.EaseType.InSine)):Play()\n  end");
            room = replaceOnce(room,"  self.active=nil;owner.presentationBusy=nil;",
                "  if self.active and self.active.glow then self.active.glow:Kill(false) end\n  self.active=nil;owner.presentationBusy=nil;");
        }
    }
    return {
        ab_probe:`local VARIANT = '${variant}'\nlocal SHOP_SECONDS = ${duration}\n` + read(new URL('probe.lua',here)),
        abyss_theme:read('build/official-ab/abyss_theme.lua'),
        abyss_numbers:read('src/lua/abyss_numbers.lua'),
        abyss_node_ui_motion:room,
        abyss_page_reveal:variant==='lua'?gate:replaceOnce(gate,'gate.alpha=value;veil.imageColor=ink',
            "gate.alpha=value;motion.paintAlpha(veil,ink,value,gate.state,gate.epoch)"),
    };
}

async function main() {
    assert.equal(process.env.MILIASTRA_ALLOW_LIVE_WRITE,'0');
    const [mcpRoot, input, outPath] = process.argv.slice(2);
    assert(mcpRoot && input && outPath, 'Usage: node build.mjs <MCP repo> <its clientkinds test fixture> <new .artifacts subdirectory>');
    const out = resolve(outPath);
    const seed = resolve(input);
    assert(out.startsWith(resolve('.artifacts')+sep));
    assert.equal(seed, resolve(mcpRoot,'tests/fixtures/editor-2026-10-13-clientkinds.gil'));
    assert.equal(hash(seed),'3dbe6df5896af2c243cb6b6fe224c738840b2268beff64edbb15912c3ccc6563');
    mkdirSync(out);
    const seedCopy = join(out,'training-seed.gil');
    copyFileSync(seed,seedCopy);
    const {native,identity} = await loadNativeUiEncoder(mcpRoot);
    const receipt = {seed:hash(seedCopy),layout:hash('build/official-ab/game-ui.json'),encoder:identity.transformedSha256,variants:{}};
    for (const variant of variants) {
        const dir = join(out,variant);
        mkdirSync(dir);
        const sources = modules(variant);
        let {mapPath} = native.removeClient({mapPath:seedCopy,ui:'CG_ui',outputName:'base-ui'},dir);
        ({mapPath}=native.removeClient({mapPath,script:'CG_game',outputName:'base'},dir));
        for (const [name,source] of Object.entries(sources)) {
            ({mapPath}=native.setClientScript({mapPath,name,source,outputName:name},dir));
        }
        const uiName = 'NativeUiAnimationAB';
        const {mapPath:gil} = native.addClientUi({mapPath,name:uiName,script:'ab_probe',showCursor:true,controls:controls(variant),outputName:'candidate'},dir);
        const ui = native.getClientUi({mapPath:gil,ui:uiName});
        const scripts = native.listClientScripts({mapPath:gil,includeSource:true}).scripts.filter(s=>Object.hasOwn(sources,s.name));
        assert.equal(scripts.length,Object.keys(sources).length);
        for (const s of scripts) assert.equal(s.source,sources[s.name],s.name);
        const save = join(dir,'candidate.save.json');
        writeFileSync(save,JSON.stringify(project(ui,scripts)));
        const result = native.checkClientScripts({mapPath:gil,scripts:Object.keys(sources)});
        writeFileSync(join(dir,'native-check.json'),JSON.stringify(result,null,2));
        assert.equal(result.errors,0,'Inspect '+join(dir,'native-check.json'));
        const faces = ui.interface.controls.find(c=>c.name==='buttons').children;
        for (const face of faces) assert.deepEqual(Object.keys(face.states).sort(),['disabled','hover','normal','pressed']);
        const chest = ui.interface.controls.find(c=>c.name==='treasure').children.find(c=>c.name==='treasureView');
        assert.equal(chest.children.find(c=>c.name==='burst').effect,variant==='lua'?undefined:10001077);
        const full = chest.children.find(c=>c.name==='fullscreenProbe');
        assert(full.visible===false && full.effect===undefined);
        receipt.variants[variant] = {gil:hash(gil),save:hash(save),allControls:ui.interface.controls.reduce((sum,c)=>sum+count(c),2),
            nativeWarnings:result.warnings,
            buttonCounts:Object.fromEntries(faces.map(c=>[c.name,count(c)])),
            modules:Object.fromEntries(scripts.map(s=>[s.name,{id:s.scriptId,lines:s.source.split('\n').length-1,
                sha256:createHash('sha256').update(s.source).digest('hex')}]))};
    }
    assert.equal(hash(seed),receipt.seed);
    writeFileSync(join(out,'build.json'),JSON.stringify(receipt,null,2)+'\n');
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) await main();
