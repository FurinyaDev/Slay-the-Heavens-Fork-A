import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {copyFileSync,mkdirSync,readFileSync,realpathSync,writeFileSync} from 'node:fs';
import {dirname,join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {loadNativeUiEncoder} from '../../scripts/native-ui-encoder.mjs';
import {supplemental} from './panels.mjs';
import {project} from '../native-ui-animation-ab-20261123/build.mjs';
import {child,count,walk,theme,examples,makeButton,variant,inventory} from './styles.mjs';

const here=new URL('./',import.meta.url);
const read=path=>readFileSync(path,'utf8');
const json=path=>JSON.parse(read(path));
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const fileSha=path=>sha(readFileSync(path));
const keys=['A','B','C'];
const pin='1763ca8087e9ec6fcd1ed74b9a2a44c0d7dcafd867a33009816b9aad8376e779';
const mcpPin='59c576e41632a6bf6781bbca83a676d0da0374ec';
const seedPin='3dbe6df5896af2c243cb6b6fe224c738840b2268beff64edbb15912c3ccc6563';
const [mcpRoot,input,output]=process.argv.slice(2);
assert.equal(process.env.MILIASTRA_ALLOW_LIVE_WRITE,'0');
assert(mcpRoot&&input&&output,'Usage: build.mjs <MCP repo> <its clientkinds fixture> <new .artifacts directory>');
const seed=resolve(input),out=resolve(output);
const workspace=resolve('.artifacts');
mkdirSync(workspace,{recursive:true});
assert.equal(workspace,realpathSync(workspace));
assert.equal(dirname(out),workspace);
assert.equal(execFileSync('git',['-C',mcpRoot,'rev-parse','HEAD'],{encoding:'utf8'}).trim(),mcpPin);
execFileSync('git',['-C',mcpRoot,'diff','--quiet','HEAD','--','src']);
assert.equal(seed,resolve(mcpRoot,'tests/fixtures/editor-2026-10-13-clientkinds.gil'));
assert.equal(realpathSync(seed),join(realpathSync(mcpRoot),'tests/fixtures/editor-2026-10-13-clientkinds.gil'));
assert.equal(fileSha(seed),seedPin);
assert.equal(fileSha('build/official-ab/game-ui.json'),pin);
const layout=json('build/official-ab/game-ui.json');
const stage=child(layout,'stage');
const artwork=json('build/official-ab/official-assets-theme.json');
const standard=child(child(child(stage,'exitPanel'),'confirm'),'hit');
assert.deepEqual(keys.map(v=>count(variant(standard,v))),[77,69,17]);

const stableIds={};
let nextId=1200000000;
function idMap(controls){
    const result={'/':stableIds['/']??=nextId++};
    for(const root of controls)for(const [,p] of walk(root)) {
        const name=p.join('/');
        result[name]=stableIds[name]??=nextId++;
    }
    return result;
}
const box=(name,children=[],position=[0,0])=>({name,kind:'container',position,size:[0,0],children});
const series=(i,delta)=>i===0?0:(i%2?1:-1)*Math.ceil(i/2)*delta;
function rows(buttons,grid) {
    return Array.from({length:Math.ceil(buttons.length/10)},(_,r)=>box('row'+r,
        buttons.slice(r*10,r*10+10).map((b,c)=>({...b,name:'button'+(r*10+c),
            position:grid?[series(c,106),0]:[0,0],...(grid&&{scale:[.30,.55]})})),[0,series(r,42)]));
}

function declaration(name,value){
    if(typeof value==='number'||typeof value==='boolean')return `local ${name} = ${value}\n`;
    return `local ${name} = '${value}'\n`;
}
const code=name=>read(new URL(name,here));
const assets=(id,kind='image')=>kind==='image'
    ?{name:'background',kind:'image',image:id,size:[1400,750],colour:'#282936'}
    :{name:kind,kind:'animation',size:[126,118],visible:false,effect:id,below:false};
const bank=code('bank.lua');
const shopLua=read('src/lua/abyss_node_ui_shop.lua');
const shopDuration=Number(shopLua.match(/local duration = (\.\d+)/)?.[1]);
assert.equal(shopDuration,theme.feedback.motionSeconds);
assert.equal(shopLua.match(/local remaining = ([^\n]+)/)?.[1],'(1-p)^3');
const effects=Object.entries(theme.feedback).map(([k,v])=>declaration(k,v)).join('')+code('feedback.lua');
const int=inventory(layout);
const extra=supplemental(layout,artwork);
const rep=examples.map((item,i)=>{
    const src=item.path.reduce(child,stage);
    const label=src.kind==='presetButton'?child(child(src,'normal'),'label'):child(src,'label');
    const back=src.children.find(c=>c.name==='backIcon');
    return {...item,sourceKind:src.kind,sourceLabel:label.text.content,label:label.text.content||item.label,size:[...src.size],
        fontSize:label.text.fontSize,icon:back?.image,name:'button'+i,position:[(i%2?1:-1)*235,112-Math.floor(i/2)*112]};
});

mkdirSync(out);
const seedCopy=join(out,'training-seed.gil');
copyFileSync(seed,seedCopy);
const {native,identity}=await loadNativeUiEncoder(mcpRoot);
const wire=await import(pathToFileURL(join(mcpRoot,'src/scene/wire.mjs')));
const {container,one,fields}=wire;
function bytes(path) {
    const file=readFileSync(path),p=container(file),ui=one(p,9),scripts=one(p,50);
    return {bytes:file.length,sha:sha(file),uiBytes:ui.length,uiSha:sha(ui),scriptSectionBytes:scripts.length,
        scriptSha:sha(scripts),uiRecords:fields(ui).filter(f=>f.id===502&&f.wire===2).length,
        other:fields(p).filter(f=>f.id!==9).map(f=>[f.id,sha(f.raw)])};
}
const prepare=join(out,'base');
mkdirSync(prepare);
let {mapPath:bare}=native.removeClient({mapPath:seedCopy,ui:'CG_ui',outputName:'clearUi'},prepare);
({mapPath:bare}=native.removeClient({mapPath:bare,script:'CG_game',outputName:'clear'},prepare));
function withSource(dir,source){
    return native.setClientScript({mapPath:bare,name:'ab_probe',source,outputName:'script'},dir).mapPath;
}
const sharedScript=withSource(prepare,bank);
const bankSections=bytes(sharedScript).other;
const receipt={source:'fb865f273bda0ff8941a6f5f8c272e13006232ff',mcp:mcpPin,
    seed:seedPin,layout:pin,theme:fileSha(new URL('theme.json',here)),encoder:identity.sourceSha256,
    variants:{},representatives:rep,probeMotion:{shopDuration},
    inventory:{totalControls:[...walk(layout)].length-1,presetButtons:[...walk(layout)].filter(([n])=>n.kind==='presetButton').length,
        exact:int.map(({path,counts})=>({path,counts}))}};
function build(name,controls,source=bank,expectedSections) {
    const dir=join(out,name);
    mkdirSync(dir);
    const base=source===bank?sharedScript:withSource(dir,source);
    const args={mapPath:base,name:'NativeUiDesignAB',script:'ab_probe',showCursor:true,
        controls,outputName:'candidate',ids:idMap(controls)};
    const {mapPath:gil}=native.addClientUi(args,dir);
    const ui=native.getClientUi({mapPath:gil,ui:args.name});
    const scripts=native.listClientScripts({mapPath:gil,includeSource:true}).scripts;
    assert.equal(scripts.length,1);
    assert.equal(scripts[0].source,source);
    assert.equal(count({children:ui.interface.controls}),count({children:controls}));
    const ids=walk({name:'root',children:ui.interface.controls});
    const nodes=[...ids].slice(1).map(([n])=>n);
    const buttons=nodes.filter(n=>n.kind==='presetButton');
    assert.equal(buttons.length,[...walk({name:'root',children:controls})].filter(([x])=>x.kind==='presetButton').length);
    for(const b of buttons)assert.deepEqual(b.states,Object.fromEntries(['normal','hover','pressed','disabled'].map(s=>[s,s])));
    const check=native.checkClientScripts({mapPath:gil,scripts:['ab_probe']});
    assert.equal(check.errors,0,JSON.stringify(check.problems));
    const imageIds=nodes.filter(n=>n.kind==='image'&&n.image).map(n=>n.image);
    const save=join(dir,'candidate.save.json');
    writeFileSync(save,JSON.stringify(project(ui,scripts)));
    const identity=bytes(gil);
    if(expectedSections)assert.deepEqual(identity.other,expectedSections,'Only section 9 can differ in capacity pairs');
    const {other,...gilReceipt}=identity;
    receipt.variants[name]={...gilReceipt,save:fileSha(save),readbackTree:sha(JSON.stringify(ui.interface.controls)),
        controlRecords:nodes.length+2,buttonRecords:buttons.map(count),scriptBytes:Buffer.byteLength(source),
        imageRefs:imageIds.length,imageIds:[...new Set(imageIds)].sort((a,b)=>a-b),warnings:check.warnings};
    writeFileSync(join(dir,'readback.json'),JSON.stringify(ui));
}
for(const n of [1,20,100])for(const key of keys) {
    const copies=Array.from({length:n},()=>variant(standard,key));
    build(key+n,[assets(100001),box('buttons',rows(copies,n>1))],bank,bankSections);
}
for(const key of keys) {
    const copies=int.map(({button})=>variant(button,key));
    build('inventory'+key,[assets(100001),box('buttons',rows(copies,true))],bank,bankSections);
}
for(const [name,controls] of Object.entries(extra.cases))build(name,controls,bank,bankSections);
const templates=json('build/official-ab/game-ui-templates.json');
extra.report.templateCensus={manifestSha:fileSha('build/official-ab/game-ui-templates.json'),roots:templates.length,
    columns:['path','kind','decision'],nodes:templates.flatMap(root=>[...walk(root)].map(([n,p])=>[p.join('/'),n.kind,'KEEP']))};
assert.equal(new Set(extra.report.templateCensus.nodes.map(n=>n[0])).size,extra.report.templateCensus.nodes.length);
writeFileSync(join(out,'census.json'),JSON.stringify(extra.report)+'\n');
const tint={name:'panelTint',kind:'image',size:[240,100],position:[0,0],image:100001,colour:'#F5D79A',opacity:0};
build('panelEffect',[...extra.cases.rewardPanelA,tint],bank+'\n'+code('panel-effect.lua'));
build('themesB',[assets(100001),box('buttons',[box('row0',rep.map(d=>makeButton(d,artwork,theme)))])]);
build('themesC',[assets(100001),box('buttons',[box('row0',rep.map(d=>makeButton(d,artwork,theme,'C')))])]);
for(const mode of ['lua','tween','sequence']) {
    const scene=box('shop',[{...assets(100001),name:'shelf',size:[360,250]}, {...variant(standard,'B'),name:'leave'}]);
    build('shop-'+mode,[scene],declaration('MODE',mode)+declaration('SECONDS',shopDuration)+code('shop.lua'));
}
for(const mode of ['off','hover','trail','theme']) {
    const choices=rep.map(d=>makeButton(d,artwork,theme));
    build('fx-'+mode,[assets(100001),box('buttons',[box('row0',choices)]),
        assets(theme.feedback.asset,'hoverFx'),assets(theme.feedback.asset,'trailFx')],
        declaration('MODE',mode)+effects);
}
assert.equal(fileSha(seed),seedPin);
writeFileSync(join(out,'build.json'),JSON.stringify({...receipt,bankSections},null,2)+'\n');
