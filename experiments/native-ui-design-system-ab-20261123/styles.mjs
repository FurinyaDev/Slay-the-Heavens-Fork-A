import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {roundedButtonMaterial} from '../../scripts/native-rounded-button.mjs';

const json = path => JSON.parse(readFileSync(path, 'utf8'));
export const theme = json(new URL('theme.json', import.meta.url));
export const states = ['normal', 'hover', 'pressed', 'disabled'];
export const child = (parent, name) => {
    const node = (parent.children ?? parent.controls).find(c => c.name === name);
    assert(node, parent.name + '/' + name);
    return node;
};
export const count = control => 1 + (control.children ?? []).reduce((n,c) => n + count(c),0);
export const walk = function*(node, path=[]) {
    const trail=[...path,node.name];
    yield [node,trail];
    for (const c of node.children ?? node.controls ?? []) yield* walk(c,trail);
};

const legacy = new Set(['border','plate']);
export function compact(button) {
    const result = structuredClone(button);
    for(const face of result.children) {
        face.children = face.children.filter(c => !legacy.has(c.name) || c.visible !== false || c.kind !== 'image');
    }
    return result;
}
function convertStretch(button, imageId) {
    const result = compact(button);
    for(const face of result.children) {
        const index=face.children.findIndex(c=>['roundedButton','v25Flag'].includes(c.name));
        assert(index>=0);
        const group=face.children[index];
        face.children.splice(index,1,...group.children.map(layer=>({
            name:layer.name,kind:'image',position:layer.position,size:layer.size,anchor:layer.anchor,
            image:imageId,imageType:'stretch',colour:layer.children[0].colour,
        })));
    }
    return result;
}
export function variant(button, key, cfg=theme) {
    assert(['A','B','C'].includes(key));
    if(key==='A') return structuredClone(button);
    return key==='B' ? compact(button) : convertStretch(button,cfg.stretchImage);
}

const choice = (path, role, label, priority=false) => ({path,role,label,priority});
export const examples = [
    choice(['menuPanel','start'],'Primary','开始游戏',true),
    choice(['nodePanel','back'],'Secondary','返回'),
    choice(['mapPanel','previewBack'],'Secondary','返回地图'),
    choice(['nodePanel','treasureView','take'],'Primary','领取'),
    choice(['combatRewards'],'Secondary','返回'),
    choice(['exitPanel','confirm','hit'],'Danger','退出并结算',true),
];

export function makeButton(descriptor, artwork, cfg=theme, kind='B') {
    const {role,name,size,label,icon} = descriptor;
    assert(Math.min(...size)>2*cfg.rimWidth);
    const palette=artwork.officialAssets.actionButton;
    const entry=cfg.roles[role];
    const material={radiusRatio:cfg.radiusRatio,rimWidth:entry.rimWidth??cfg.rimWidth};
    assert(Math.round(size[1]*material.radiusRatio)>material.rimWidth);
    assert(kind!=='C'||cfg.radiusRatio===theme.radiusRatio,'Stretch radius belongs to the atlas');
    const action=palette[entry.palette];
    const hit={name,kind:'presetButton',position:descriptor.position,size:[...size],focusable:true,
        states:Object.fromEntries(states.map(s=>[s,s])),children:states.map(state=>{
            const inks=state==='disabled'?palette.disabled:action[state];
            const override=(token, fallback)=>typeof token==='string'?token:token?.[state]??fallback;
            const colors=[override(entry.rim,inks[0]),override(entry.fill,inks[1])];
            const textWidth=size[0]-2*cfg.labelInset-(icon?cfg.iconSize+cfg.iconGap:0);
            const text={name:'label',kind:'text',size:[textWidth,size[1]],position:[(size[0]-2*cfg.labelInset-textWidth)/2,0],
                text:{content:label,fontSize:descriptor.fontSize??20,align:'centre',valign:'middle',
                    colour:state==='disabled'?artwork.color.textMuted:artwork.officialAssets.buttonInk}};
            const iconControl=icon?[{name:'icon',kind:'image',image:icon,size:[cfg.iconSize,cfg.iconSize],
                position:[-size[0]/2+cfg.labelInset+cfg.iconSize/2,0],colour:text.text.colour}]:[];
            return {name:state,kind:'container',size:[...size],visible:state==='normal',
                scale:state==='pressed'?[cfg.pressedScale,cfg.pressedScale]:[1,1],
                children:[roundedButtonMaterial('roundedButton',size,colors,{material,images:artwork.image}),...iconControl,text]};
        })};
    return variant(hit,kind,cfg);
}

export function inventory(layout) {
    const results=[];
    for(const [button,path] of walk(layout)) {
        if(button.kind!=='presetButton'||count(button)!==77||button.children.length!==4)continue;
        if(!states.every(s=>button.states?.[s]===s))continue;
        if(!button.children.every(s=>{
            const face=s.children.find(c=>['roundedButton','v25Flag'].includes(c.name));
            return face?.kind==='container' && count(face)===15 &&
                s.children.filter(c=>c.visible===false && legacy.has(c.name) && c.kind==='image').length===2 &&
                s.children.some(c=>c.name==='label' && c.kind==='text');
        }))continue;
        const counts=['A','B','C'].map(v=>count(variant(button,v)));
        assert.deepEqual(counts,[77,69,17]);
        results.push({path:path.join('/'),counts,button});
    }
    return results;
}
