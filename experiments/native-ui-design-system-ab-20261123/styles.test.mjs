import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {test} from 'node:test';
import {child,count,inventory,makeButton,states,theme,variant} from './styles.mjs';

const json=p=>JSON.parse(readFileSync(p,'utf8'));
const layout=json('build/official-ab/game-ui.json');
const artwork=json('build/official-ab/official-assets-theme.json');
const built=json(process.env.UI_DESIGN_BUILD+'/build.json');
const variants=['A','B','C'];
const examples=[...built.representatives];
const colours=artwork.officialAssets.actionButton;
const face=(instance,state)=>child(instance,state);
const chrome=(instance,state)=>child(face(instance,state),'roundedButton');
const part=(instance,state,name)=>child(chrome(instance,state),name);
const rim=(b,s)=>part(b,s,'rim').children[0].colour;
const fill=(b,s)=>part(b,s,'cloth').children[0].colour;
const width=(b,s)=>(part(b,s,'rim').size[0]-part(b,s,'cloth').size[0])/2;
const pressed=b=>face(b,'pressed').scale;
for(const {button,path} of inventory(layout)){
    const normal=face(button,'normal');
    const outer=normal.children.find(c=>['roundedButton','v25Flag'].includes(c.name));
    const key=['Primary','Secondary','Danger'].find(role=>
        child(outer,'rim').children[0].colour===colours[theme.roles[role].palette].normal[0]);
    assert(key,path);
    const {text}=child(normal,'label');
    examples.push({name:button.name,role:key,label:text.content??'',fontSize:text.fontSize,size:button.size,path});
}
const originals=examples.map(d=>makeButton(d,artwork));
const counts={};
function inputContract(button){
    return {name:button.name,kind:button.kind,size:button.size,position:button.position,
        focusable:button.focusable,states:button.states,labels:states.map(s=>child(face(button,s),'label')),
        icons:states.map(s=>face(button,s).children.find(n=>n.name==='icon'))};
}
function simulation(edit) {
    const dir=mkdtempSync(join(tmpdir(),'native-ui-style-'));
    try{
        const cfg=structuredClone(theme);
        edit(cfg);
        const file=join(dir,'theme.json');
        writeFileSync(file,JSON.stringify(cfg));
        return examples.map(d=>makeButton(d,artwork,json(file)));
    }finally{rmSync(dir,{recursive:true,force:true});}
}
function confirm(after,assertStyle){
    assert.equal(after.length,originals.length);
    for(const [i,d] of examples.entries()){
        assert.deepEqual(inputContract(after[i]),inputContract(originals[i]),JSON.stringify(d.path));
        assertStyle(d,after[i],originals[i]);
    }
}

test('one Secondary edit updates rim and width on every state',()=>{
    const after=simulation(c=>Object.assign(c.roles.Secondary,{rim:'#506E92',rimWidth:3}));
    const expected=(d,b,a)=>{
        if(d.role!=='Secondary')return assert.deepEqual(b,a);
        for(const s of states){
            assert.equal(rim(b,s),'#506E92');
            assert.equal(width(b,s),3);
            assert.equal(fill(b,s),fill(a,s));
        }
    };
    confirm(after,expected);
    const missed=examples.findIndex(d=>d.role==='Secondary');
    assert.throws(()=>confirm(after.map((b,i)=>i===missed?originals[i]:b),expected));
    counts.secondary=examples.filter(d=>d.role==='Secondary').length;
});

test('one Primary edit affects hover only',()=>{
    const after=simulation(c=>c.roles.Primary.fill={hover:'#E0CF9A'});
    confirm(after,(d,b,a)=>{
        if(d.role!=='Primary')return assert.deepEqual(b,a);
        for(const s of states){
            if(s!=='hover')assert.deepEqual(face(b,s),face(a,s));
            else {assert.equal(fill(b,s),'#E0CF9A');assert.equal(rim(b,s),rim(a,s));}
        }
    });
    counts.primary=examples.filter(d=>d.role==='Primary').length;
});

test('one common press-scale edit preserves Danger inks and click geometry',()=>{
    const after=simulation(c=>c.pressedScale=.92);
    confirm(after,(_d,b,a)=>{
        assert.deepEqual(pressed(b),[.92,.92]);
        for(const s of states)assert.deepEqual({...face(b,s),scale:face(a,s).scale},face(a,s));
    });
    counts.pressed=after.length;
});

test('Stretch exposes geometry and tint but rejects independent radius',()=>{
    const d=examples.find(x=>x.icon);
    const plain={...d,icon:undefined};
    const sample=makeButton(d,artwork,theme,'C');
    assert.equal(count(sample),21);
    assert.equal(count(makeButton(plain,artwork,theme,'C')),17);
    const other=makeButton({...plain,size:[96,60]},artwork,theme,'C');
    assert.deepEqual(other.size,[96,60]);
    assert.equal(child(face(other,'normal'),'rim').imageType,'stretch');
    const altered={...theme,radiusRatio:.22};
    assert.throws(()=>makeButton(d,artwork,altered,'C'),/radius belongs to the atlas/);
    for(const state of states){
        const s=face(sample,state);
        assert.equal(child(s,'rim').image,child(s,'cloth').image);
        assert(child(s,'label').size[0]<d.size[0]);
    }
});

test('all three GIL banks have paired schema, script and record counts',()=>{
    const width=n=>Math.ceil((Math.floor(Math.log2(n))+1)/7);
    for(const n of [1,20,100]){
        const [a,b,c]=variants.map(key=>built.variants[key+n]);
        for(const entry of [b,c]){
            assert.equal(entry.scriptSha,a.scriptSha);
            assert.equal(entry.scriptBytes,a.scriptBytes);
            assert.equal(entry.bytes-a.bytes,entry.uiBytes-a.uiBytes+width(entry.uiBytes)-width(a.uiBytes));
        }
        assert.deepEqual([a,b,c].map(e=>new Set(e.buttonRecords).size),[1,1,1]);
        assert.deepEqual([a,b,c].map(e=>e.buttonRecords[0]),[77,69,17]);
    }
    const a=built.variants.inventoryA,b=built.variants.inventoryB,c=built.variants.inventoryC;
    assert.equal(a.controlRecords-b.controlRecords,8*28);
    assert.equal(a.controlRecords-c.controlRecords,60*28);
    const standard=inventory(layout)[0].button;
    assert.deepEqual(variants.map(v=>count(variant(standard,v))),[77,69,17]);
    console.log('CONTRACT_MUTATIONS',JSON.stringify(counts));
});
