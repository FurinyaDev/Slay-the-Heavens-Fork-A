import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync, writeFileSync} from 'node:fs';
import {registerHooks} from 'node:module';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';

const sha = bytes=>createHash('sha256').update(bytes).digest('hex');
const sdkHash = 'de72d4f80b230cfac330ab0ac6fa9d05e51bb8f51d352f08dd1ee6bcba0fe09d';
export async function loadSdk(worker) {
    const sdkUrl = pathToFileURL(resolve(worker));
    sdkUrl.hash='native-ui-ab';
    const workerEnd = 'var Of=setInterval(f0,l0);';
    const hooks = registerHooks({load(url,context,next) {
        const result=next(url,context);
        if (url!==sdkUrl.href) return result;
        assert.equal(sha(result.source),sdkHash);
        const source=Buffer.from(result.source).toString('utf8');
        assert.equal(source.split(workerEnd).length,2);
        // Expose the package's studio constructor and remove its outer worker timer/IPC.
        return {...result,source:source.split(workerEnd)[0]+'\nexport {Na, ot, fi, Ht, Qi};\n'};
    }});
    let sdk;
    try { sdk=await import(sdkUrl); } finally { hooks.deregister(); }
    return sdk;
}

async function main() {
const [outDir, worker] = process.argv.slice(2);
assert(outDir && worker,'Usage: node replay.mjs <build output directory> <BeyondSimulator 0.5.2 dist/worker.js>');
const sdk = await loadSdk(worker);

const variants=['lua','tween','sequence'];
const input = variant => {
    const bytes=readFileSync(join(outDir,variant,'candidate.save.json'));
    assert.equal(sha(bytes),build.variants[variant].save);
    return JSON.parse(bytes);
};
const build=JSON.parse(readFileSync(join(outDir,'build.json'),'utf8'));
const all = tree => tree.flatMap(node=>[node,...all(node.children??[])]);
const find = (snapshot,path) => path.split('/').reduce((node,key)=>{
    const child=node.children.find(c=>c.name===key);
    assert(child,path);
    return child;
},{children:snapshot.tree});
const alpha = node => (node.imageColor>>>24)&255;
const percentile = (a,p) => a.toSorted((x,y)=>x-y)[Math.ceil(a.length*p)-1];
const statistics = a => ({n:a.length,p50:percentile(a,.5),p95:percentile(a,.95),max:Math.max(...a),over16_7:a.filter(n=>n>16.7).length});

let counts, tweenDepth=0;
const instrument = (type,key,wrap) => {
    const method=sdk[type].prototype[key];
    assert.equal(typeof method,'function',key);
    sdk[type].prototype[key]=wrap(method);
    return ()=>{sdk[type].prototype[key]=method;};
};
const counted = (c,name)=>{if (counts) counts[c][name]=(counts[c][name]??0)+1;};
const unpatch=[
    instrument('ot','markPlayDirty',fn=>function(...args) {
        counted(tweenDepth?'tweenDirty':'otherDirty',this.name);
        return fn.apply(this,args);
    }),
    instrument('fi','apply',fn=>function(...args){
        if (this.object?.alive) counted('tweenApplies',this.object.name);
        tweenDepth++;
        try { return fn.apply(this,args); } finally { tweenDepth--; }
    }),
    ...['PlayAnimation','StopAnimation'].map(key=>instrument('ot',key,fn=>function(...args) {
        counted('effectCalls',this.name+' '+key);
        return fn.apply(this,args);
    })),
    ...['fi','Ht'].flatMap(type=>['Play','Kill'].map(key=>instrument(type,key,fn=>function(...args){
        counted('tweenLifecycle',(type==='fi'?'Tween':'Sequence')+' '+key);
        return fn.apply(this,args);
    }))),
];
const newCounts=()=>({tweenDirty:{},otherDirty:{},tweenApplies:{},effectCalls:{},tweenLifecycle:{}});
const starts = {shop:2,character:3,treasure:4};
const read = play => {
    const q=play.playGet({inspect:true});
    assert(!q.mountError,JSON.stringify(q.mountError));
    assert(!q.logs.some(l=>l.level==='error'),JSON.stringify(q.logs.filter(l=>l.level==='error')));
    return q;
};
const key = (play,n)=>play.playKey('KeyboardCraftspersonKey'+n+'Down',{observe:false});
const step = (play,hz)=>play.playStep(1/hz,{observe:false});
const pointer = (play,kind,x,y)=>play.playPointer(kind,x,y,{observe:false});
const logs = (q,match)=>q.logs.filter(x=>x.text.includes(match));
function sceneFrame(q,scene) {
    const at = sub=>find(q,'root/'+scene+'/'+sub);
    if (scene==='shop') return [at('shopView').anchoredPositionY,at('shopBack').anchoredPositionX];
    if (scene==='character') return ['cancel','details','confirm'].map(n=>at(n).anchoredPositionX);
    const path=n=>at('treasureView/'+n);
    const glow=path('glow'),burst=path('burst'),open=path('open'),reward=path('rewardItem1');
    return [open.anchoredPositionX,open.anchoredPositionY,open.visible,glow.localScaleX,burst.visible,
        reward.anchoredPositionY,reward.visible];
}

function runTrack(variant,scene,hz,canvasId) {
    const play=sdk.Na(input(variant),{});
    play.playStart({canvasId});
    const snapshot=read(play), staticControls=all(snapshot.tree).length;
    counts=newCounts();
    key(play,starts[scene]);
    const trajectory=[sceneFrame(read(play),scene)];
    const effectFrames=[];
    for (let i=0;i<Math.ceil(hz*1.2);i++) {
        step(play,hz);
        const q=read(play);
        trajectory.push(sceneFrame(q,scene));
        if (scene==='treasure' && q.effects.length) effectFrames.push({frame:i+1,effects:q.effects});
    }
    const complete=read(play);
    if (scene==='treasure') {
        assert.equal(complete.effects.length,0);
        if(variant==='lua') assert.equal(effectFrames.length,0);
        else {
            assert(effectFrames.length>0,'No local effect frames observed');
            assert(effectFrames.every(f=>f.effects.every(e=>e.animationId===10001077 && e.kind==='animation')));
        }
    }
    const normalRun=counts;counts=newCounts();
    const pattern=scene==='treasure'?'chest-presentation-complete':'motion-complete';
    assert.equal(logs(complete,pattern).length,1);
    // Open, interrupt, and reopen while the old animation would still be running.
    key(play,starts[scene]);for(let i=0;i<4;i++)step(play,hz);
    key(play,9);key(play,starts[scene]);
    for(let i=0;i<Math.ceil(hz*1.2);i++)step(play,hz);
    assert.equal(logs(read(play),pattern).length,2);
    const steadyControls=all(read(play).tree).length;
    assert.equal(steadyControls,staticControls);
    key(play,starts[scene]);step(play,hz);
    play.playStop();assert.equal(all(play.playGet({inspect:true}).tree).length,0);
    const counters=counts;counts=null;
    return {staticControls,steadyControls,rootStopControls:0,normalRun,boundaryRun:counters,trajectory,effectFrames,
        completeAt:logs(complete,pattern)[0].time,log:complete.logs};
}

function buttons(variant,canvasId) {
    const play=sdk.Na(input(variant),{});
    const q=play.playStart({canvasId});
    const y=q.canvasHeight/2;
    const results={};
    for (const name of ['buttonCurrent','buttonPreset','buttonStretch']) {
        const initial=read(play);
        const model=find(initial,'root/buttons/'+name);
        const x=q.canvasWidth/2+model.anchoredPositionX;
        const readFaces=()=>find(read(play),'root/buttons/'+name).children.filter(n=>n.visible).map(n=>n.name);
        const faces={normal:readFaces()};
        pointer(play,'move',x,y);faces.hover=readFaces();
        pointer(play,'down',x,y);faces.pressed=readFaces();
        pointer(play,'up',x,y);
        const clicked=()=>logs(read(play),'click\t'+name).length;
        assert.equal(clicked(),1);
        pointer(play,'down',x,y);pointer(play,'move',x,y+100);pointer(play,'up',x,y+100);
        assert.equal(clicked(),1,'Drag off accepted');
        pointer(play,'move',x,y);key(play,10);pointer(play,'move',x+1,y);faces.disabled=readFaces();
        assert(faces.disabled.includes('disabled'),'Disabled state did not render after hover exit');
        pointer(play,'down',x,y);pointer(play,'up',x,y);
        assert.equal(clicked(),1,'Disabled input accepted');
        key(play,10);pointer(play,'move',x,y+100);
        results[name]={faces,clicks:clicked(),dragOff:false,disabledClick:false,size:[model.sizeDeltaX,model.sizeDeltaY],focusable:model.canControllerFocus};
    }
    play.playStop();return results;
}

function route(variant,scene,cycles) {
    const play=sdk.Na(input(variant),{});
    play.playStart({});
    const n=scene==='shop'?5:7,hz=60;
    const tick=frames=>{for(let j=0;j<frames;j++)step(play,hz);};
    const sample=()=>{const q=read(play);return [alpha(find(q,'root/pageReveal/veil')),
        find(q,'root/pageReveal').visible,find(q,'root/mapPanel').visible];};
    let first;
    for(let i=0;i<cycles;i++){
        if(i===0)counts=newCounts();
        key(play,n);tick(27);assert.equal(sample()[1],false);
        // Cancel before the opaque handoff; then issue a duplicate departure.
        key(play,6);tick(4);key(play,9);
        assert.deepEqual(sample(),[0,false,false]);
        key(play,6);key(play,6);
        const frames=[sample()];
        if(i===0){for(let j=0;j<26;j++){tick(1);frames.push(sample());}}
        else {tick(26);frames.push(sample());}
        assert.deepEqual(frames.at(-1),[255,true,true]);
        for(const [opacity,,map] of frames) if(map)assert.equal(opacity,255,'Map was painted before opacity');
        tick(6);assert.deepEqual(sample(),[255,true,true]);
        // The production cover's native cursor-area handler is still active.
        pointer(play,'down',800,450);pointer(play,'up',800,450);
        key(play,8);
        const reveal=[sample()];
        if(i===0){for(let j=0;j<26;j++){tick(1);reveal.push(sample());}}
        else {tick(26);reveal.push(sample());}
        assert.deepEqual(reveal.at(-1),[0,false,true]);
        assert(logs(read(play),'cover-hit').length>0);
        assert.equal(logs(read(play),'destination-projection').at(-1)?.text,'UI_AB\tdestination-projection\t'+scene);
        first??={departure:frames,reveal,unblockFrame:reveal.findIndex(row=>!row[1]),firstCycleCounts:counts,logs:read(play).logs};
        counts=null;
    }
    key(play,n);tick(27);key(play,6);tick(4);
    key(play,2);tick(25);
    assert.equal(find(read(play),'root/pageReveal').visible,false);
    play.playStop();assert.equal(play.playGet({inspect:true}).tree.length,0);
    return {cycles,...first};
}

const report={sdkHash,node:process.version,platform:process.platform,build,buttons:{},tracks:{},routes:{},timing:{}};
for (const variant of variants){
    report.buttons[variant]={};
    for(const device of ['pc-16-9','mobile-16-9']){
        report.buttons[variant][device]=buttons(variant,device);
    }
    report.tracks[variant]={};
    for(const scene of Object.keys(starts)){
        report.tracks[variant][scene]={};
        for(const rate of [30,60,120])report.tracks[variant][scene][rate]=runTrack(variant,scene,rate,'pc-16-9');
        report.tracks[variant][scene].mobile60=runTrack(variant,scene,60,'mobile-16-9');
    }
    report.routes[variant]={shop:route(variant,'shop',20),treasure:route(variant,'treasure',20)};
}
for(const undo of unpatch)undo();

const buttonNames=['buttonCurrent','buttonPreset','buttonStretch'];
const mounts=Object.fromEntries(buttonNames.map(name=>[name,{wall:[],cpu:[]}]));
for(let round=0;round<12;round++){
    for(const name of [...buttonNames.slice(round%3),...buttonNames.slice(0,round%3)]){
        const save=input('lua');
        const root=save.assets.server.root.children[0];
        const holder=root.children.find(n=>n.name==='buttons');
        root.children=[holder];
        holder.children=holder.children.filter(n=>n.name===name);
        root.scriptMappingIds=[];
        save.assets.scripts=[];
        const play=sdk.Na(save,{});
        const cpu=process.cpuUsage(),start=performance.now();
        play.playStart({});
        const elapsed=performance.now()-start,delta=process.cpuUsage(cpu);
        mounts[name].wall.push(elapsed);mounts[name].cpu.push((delta.user+delta.system)/1000);
        assert.equal(all(read(play).tree).length,build.variants.lua.buttonCounts[name]+2);
        play.playStop();
    }
}
report.buttonMount=Object.fromEntries(Object.entries(mounts).map(([name,values])=>[
    name,{wallMs:statistics(values.wall),cpuMs:statistics(values.cpu)}]));

const buffers=Object.fromEntries(variants.map(v=>[v,{}]));
for(let round=0;round<6;round++){
    for(const variant of [...variants.slice(round%3),...variants.slice(0,round%3)]){
        const play=sdk.Na(input(variant),{});
        const mountCPU=process.cpuUsage(),mountStart=performance.now();
        play.playStart({});
        const wall=performance.now()-mountStart,cpu=process.cpuUsage(mountCPU);
        const mount=buffers[variant].mount??={wall:[],cpu:[]};
        mount.wall.push(wall);mount.cpu.push((cpu.user+cpu.system)/1000);
        for (const scene of [...Object.keys(starts),'shop-return','treasure-return']){
            const times=buffers[variant][scene]??={wall:[],cpu:[]};
            if (scene.endsWith('-return')){
                key(play,scene==='shop-return'?5:7);
                for(let i=0;i<27;i++)step(play,60);
                key(play,6);
            } else key(play,starts[scene]);
            for(let i=0;i<(scene.endsWith('-return')?56:scene==='shop'?18:scene==='character'?44:70);i++){
                if (scene.endsWith('-return')&&i===30)key(play,8);
                const cpuStart=process.cpuUsage(),start=performance.now();
                step(play,60);
                const elapsed=performance.now()-start,du=process.cpuUsage(cpuStart);
                times.wall.push(elapsed);times.cpu.push((du.user+du.system)/1000);
            }
        }
        read(play);play.playStop();
    }
}
for(const [variant,scenes]of Object.entries(buffers)){
    report.timing[variant]=Object.fromEntries(Object.entries(scenes).map(([scene,times])=>[scene,{
        wallMs:statistics(times.wall),cpuMs:statistics(times.cpu),
    }]));
}
writeFileSync(join(outDir,'replay.json'),JSON.stringify(report,null,2)+'\n');
console.log('Paired offline SDK cases finished');
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) await main();
