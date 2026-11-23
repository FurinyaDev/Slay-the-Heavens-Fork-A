import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {loadSdk} from '../native-ui-animation-ab-20261123/replay.mjs';

const [directory,worker]=process.argv.slice(2);
assert(directory&&worker,'Usage: replay.mjs <build directory> <pinned SDK worker.js>');
const sdk=await loadSdk(worker);
const read=file=>JSON.parse(readFileSync(file,'utf8'));
const digest=file=>createHash('sha256').update(readFileSync(file)).digest('hex');
const build=read(join(directory,'build.json'));
const permutations=['ABC','ACB','BAC','BCA','CAB','CBA'];
const scopes=['controlsById','mountedScripts','tweens','sequences','animations','luaFunctions','luaStates','uiAnimations','roots'];
const args={observe:false};
const tick=play=>play.playStep(1/60,args);
const key=(play,n)=>play.playKey('KeyboardCraftspersonKey'+n+'Down',args);
const pointer=(play,type,x,y)=>play.playPointer(type,x,y,args);
const log=(snapshot,tag)=>snapshot.logs.filter(l=>l.text.startsWith(tag));
const flatten=nodes=>nodes.flatMap(n=>[n,...flatten(n.children??[])]);
const lookup=(snapshot,path)=>path.split('/').reduce((n,k)=>{
    const got=n.children.find(c=>c.name===k);assert(got,path);return got;
},{children:snapshot.tree});
const inspect=play=>{
    const q=play.playGet({inspect:true});
    assert(!q.mountError,JSON.stringify(q.mountError));
    assert(!q.logs.some(l=>/error/i.test(l.level)),JSON.stringify(q.logs.filter(l=>/error/i.test(l.level))));
    return q;
};
function project(name) {
    const file=join(directory,name,'candidate.save.json');
    assert.equal(digest(file),build.variants[name].save);
    return sdk.Na(read(file),{});
}
function wrap(proto,name,fn) {
    const original=proto[name];
    assert.equal(typeof original,'function',name);
    proto[name]=fn(original);
    return ()=>{proto[name]=original;};
}
function timed(fn){
    const cpu=process.cpuUsage(),time=performance.now();
    const value=fn();
    const wall=performance.now()-time,delta=process.cpuUsage(cpu);
    return {wall,cpu:(delta.user+delta.system)/1000,value};
}
function pair({wall,cpu}){return [wall,cpu];}
const median=rows=>percentile(rows,.5);
function percentile(rows,p) {
    return rows.toSorted((a,b)=>a-b)[Math.ceil(rows.length*p)-1];
}
const stat=rows=>({n:rows.length,p50:median(rows),p95:percentile(rows,.95),max:Math.max(...rows),long:rows.filter(n=>n>16.7).length});
const summarize=rows=>({wall:stat(rows.map(r=>r[0])),cpu:stat(rows.map(r=>r[1]))});

let counts,tweenDepth=0,callbacks,teardown, runtime;
const add=(key,name)=>{if(counts)counts[key][name]=(counts[key][name]??0)+1;};
function collectHooks(){
    return [
        wrap(sdk.Qi.prototype,'destroy',fn=>function(...a){
            const value=fn.apply(this,a);
            teardown=Object.fromEntries(scopes.map(k=>{
                const store=this[k];
                if(k==='uiAnimations'&&store===undefined)return [k,0];
                const size=store?.size??store?.length;
                assert(Number.isInteger(size),k);
                return [k,size];
            }));
            return value;
        }),
        wrap(sdk.ot.prototype,'markPlayDirty',fn=>function(...a){
            add(tweenDepth?'tweenDirty':'otherDirty',this.name);
            return fn.apply(this,a);
        }),
        ...['SetAnchoredPosition','PlayAnimation','StopAnimation'].map(method=>wrap(sdk.ot.prototype,method,fn=>function(...a){
            add('methods',method+' '+this.name);
            if(method==='SetAnchoredPosition'&&this.name==='shelf')runtime=this.runtime;
            return fn.apply(this,a);
        })),
        wrap(sdk.fi.prototype,'apply',fn=>function(...a){
            add('tweenApply',this.object.name);
            tweenDepth++;
            try{return fn.apply(this,a);}finally{tweenDepth--;}
        }),
        ...[sdk.fi,sdk.Ht].map((type,i)=>wrap(type.prototype,'SetOnComplete',fn=>function(callback){
            callbacks?.push({callback,runtime:this.runtime,type:i?'sequence':'tween'});
            runtime=this.runtime;
            return fn.call(this,callback);
        })),
        ...[sdk.fi,sdk.Ht].flatMap((type,i)=>['Play','Kill'].map(method=>wrap(type.prototype,method,fn=>function(...a){
            add('handles',(i?'sequence':'tween')+' '+method);
            return fn.apply(this,a);
        }))),
    ];
}
const counters=()=>({otherDirty:{},tweenDirty:{},tweenApply:{},methods:{},handles:{}});
function cleanEnd(play){
    teardown=null;
    play.playStop();
    assert.deepEqual(teardown,Object.fromEntries(scopes.map(k=>[k,0])));
    assert.equal(play.playGet({inspect:true}).tree.length,0);
    return teardown;
}
function buttonCheck(name,canvas) {
    const play=project(name);
    const start=play.playStart({canvasId:canvas});
    const initial=lookup(inspect(play),'root/buttons/row0/button0');
    const x=start.canvasWidth/2+initial.anchoredPositionX,y=start.canvasHeight/2+initial.anchoredPositionY;
    const nodes=flatten(inspect(play).tree).length;
    assert.equal(nodes,build.variants[name].controlRecords-1);
    const button=()=>lookup(inspect(play),'root/buttons/row0/button0');
    const outsideY=y<start.canvasHeight/2?y+300:y-300;
    const faces=()=>button().children.filter(c=>c.visible).map(c=>c.name);
    counts=counters();
    const normal=faces();
    pointer(play,'move',x,y);
    const hover=faces();
    pointer(play,'down',x,y);
    const pressed=faces();
    pointer(play,'up',x,y);
    assert.equal(log(inspect(play),'BANK_CLICK').length,1);
    pointer(play,'down',x,y);pointer(play,'move',x,outsideY);pointer(play,'up',x,outsideY);
    assert.equal(log(inspect(play),'BANK_CLICK').length,1);
    pointer(play,'move',x,y);key(play,10);pointer(play,'move',x+1,y);
    const disabled=faces();
    pointer(play,'down',x,y);pointer(play,'up',x,y);
    assert.equal(log(inspect(play),'BANK_CLICK').length,1);
    assert(hover.includes('hover')&&pressed.includes('pressed')&&disabled.includes('disabled'));
    key(play,10);tick(play);
    assert.equal(flatten(inspect(play).tree).length,nodes);
    const measured=counts;counts=null;
    return {nodes,faces:{normal,hover,pressed,disabled},counts:measured,cleanup:cleanEnd(play)};
}
function themes(name){
    const play=project(name);
    const start=play.playStart({}),result=[];
    for(const [i,d] of build.representatives.entries()){
        const p='root/buttons/row0/button'+i;
        const b=lookup(inspect(play),p);
        const x=start.canvasWidth/2+d.position[0],y=start.canvasHeight/2+d.position[1];
        const before=log(inspect(play),'BANK_CLICK').length;
        pointer(play,'move',x,y);pointer(play,'down',x,y);pointer(play,'up',x,y);
        const after=log(inspect(play),'BANK_CLICK');
        assert.equal(after.length,before+1,d.path.join('/'));
        assert(after.at(-1).text.endsWith('button'+i));
        assert.deepEqual([b.sizeDeltaX,b.sizeDeltaY],d.size);
        result.push({path:d.path,role:d.role,size:d.size,clicked:true});
    }
    return {result,cleanup:cleanEnd(play)};
}
function shop(mode) {
    const play=project('shop-'+mode);
    play.playStart({});
    callbacks=[];runtime=null;
    let retired=[];
    const state=()=>[lookup(inspect(play),'root/shop/shelf').anchoredPositionY,lookup(inspect(play),'root/shop/leave').anchoredPositionX];
    const completed=()=>log(inspect(play),'SHOP_FINISH').length;
    const frames=n=>{for(let i=0;i<n;i++)tick(play);};
    const config={lua:0,tween:2,sequence:1};
    counts=counters();
    key(play,2);frames(20);
    assert.equal(completed(),1);
    assert.deepEqual(state(),[0,-510]);
    const success=counts;
    counts=counters();
    callbacks=[];
    key(play,2);frames(2);
    retired=callbacks.slice();
    assert.equal(retired.length,config[mode]);
    key(play,9);
    assert.deepEqual(state(),[0,-510]);
    key(play,2);frames(1);
    for(const c of retired)c.runtime.safeCall(c.callback);
    assert.equal(completed(),1,'Late retired callback reached replacement');
    let duplicatedCurrent=0;
    if(mode==='tween'){
        const c=callbacks[retired.length];
        c.runtime.safeCall(c.callback);c.runtime.safeCall(c.callback);
        duplicatedCurrent=2;
        assert.equal(completed(),1,'Duplicate child completed before sibling');
    }
    frames(20);
    assert.equal(completed(),2);
    assert.deepEqual(state(),[0,-510]);
    for(let i=0;i<20;i++){
        key(play,2);frames(1);key(play,9);
        assert.deepEqual(state(),[0,-510]);
    }
    assert.equal(completed(),2);
    if(runtime)assert.equal(runtime.animations.size,0);
    key(play,2);frames(2);key(play,8);frames(20);
    if(runtime)assert.equal(runtime.animations.size,0,'Deactivation leaked animation');
    assert.equal(completed(),2);
    const boundary=counts;counts=null;
    const disabled=cleanEnd(play);
    const loss=project('shop-'+mode);
    loss.playStart({});key(loss,2);tick(loss);
    const target=[...runtime.controlsById.values()].find(c=>c.name==='shelf');
    assert(target);runtime.destroyControl(target);
    for(let i=0;i<20;i++)tick(loss);
    assert.equal(runtime.animations.size,0);
    key(loss,2);tick(loss);
    assert.equal(log(inspect(loss),'SHOP_FINISH').length,0);
    const targetLoss=cleanEnd(loss);
    const destructive=project('shop-'+mode);
    destructive.playStart({});key(destructive,2);tick(destructive);
    const activeDestroy=cleanEnd(destructive);
    callbacks=null;
    return {success,boundary,retiredCallbacks:retired.length,duplicatedCurrent,completions:2,repeatedCancel:20,disabled,targetLoss,activeDestroy};
}
function effects(mode,canvas,shutdown=8) {
    const play=project('fx-'+mode);
    const start=play.playStart({canvasId:canvas});
    const cx=start.canvasWidth/2,cy=start.canvasHeight/2, desktop=canvas==='pc-16-9';
    const sample=()=>inspect(play).effects.map(e=>({id:e.animationId,generation:e.generation,
        x:e.matrix.tx,y:e.matrix.ty,layer:e.layer}));
    const snapshots=[];
    const move=(x,y)=>pointer(play,'move',x,y);
    const ticks=n=>{for(let i=0;i<n;i++)tick(play);};
    const moveTo=i=>{const [x,y]=build.representatives[i].position;move(cx+x,cy+y);};
    counts=counters();
    moveTo(0);ticks(9);snapshots.push(sample());
    if(mode==='hover'&&desktop){
        assert.equal(snapshots.at(-1).length,1);
        const [x,y]=build.representatives[0].position,fx=snapshots.at(-1)[0];
        assert.equal(fx.x,cx+x);assert.equal(fx.y,cy+y);
    }
    moveTo(1);ticks(9);snapshots.push(sample());
    if(mode==='hover')assert.equal(snapshots.at(-1).length,0);
    moveTo(5);ticks(9);snapshots.push(sample());
    const [x,y]=build.representatives[5].position;
    pointer(play,'down',cx+x,cy+y);pointer(play,'up',cx+x,cy+y);
    assert.equal(log(inspect(play),'FX_CLICK').length,1);
    move(cx,cy);ticks(9);snapshots.push(sample());
    ticks(24);snapshots.push(sample());
    assert.equal(snapshots.at(-1).length,0);
    if(mode==='trail'&&desktop)assert(snapshots.some(s=>s.length===1));
    moveTo(0);ticks(9);key(play,shutdown);moveTo(5);ticks(24);snapshots.push(sample());
    assert.equal(snapshots.at(-1).length,0,'Hidden scene emitted effects');
    assert(snapshots.every(s=>s.length<2&&s.every(e=>e.id===10001077)));
    if(mode==='off'||!desktop)assert(snapshots.every(x=>x.length===0));
    const measured=counts;counts=null;
    return {shutdown,snapshots,measured,cleanup:cleanEnd(play)};
}

function panelEffect() {
    const play=project('panelEffect');
    const start=play.playStart({});
    const alpha=()=>lookup(inspect(play),'root/panelTint').imageColor>>>24;
    const trace=[alpha()];
    key(play,5);
    for(let i=0;i<19;i++){tick(play);trace.push(alpha());}
    assert.equal(trace[0],0);
    assert.equal(Math.max(...trace),31);
    // 0.12 s falls between 60 Hz samples. At the exact segment boundary alpha is 32.
    key(play,5);
    play.playStep(.12,args);
    const boundaryAlpha=alpha();
    assert.equal(boundaryAlpha,32);
    play.playStep(.12,args);
    assert.equal(alpha(),0);
    assert.equal(trace.at(-1),0);
    key(play,5);tick(play);key(play,9);
    for(let i=0;i<20;i++)tick(play);
    assert.equal(alpha(),0);
    key(play,5);tick(play);
    const x=start.canvasWidth/2,y=start.canvasHeight/2-270;
    pointer(play,'down',x,y);pointer(play,'up',x,y);
    assert.equal(log(inspect(play),'BANK_CLICK').length,1);
    return {trace,boundaryAlpha,input:true,cleanup:cleanEnd(play)};
}

const report={node:process.version,platform:process.platform,worker:digest(worker),
    orders:[],correctness:{},sdkTiming:{},effectsTiming:{},panelTiming:{}};
const restore=collectHooks();
try {
    for(const kind of 'ABC')for(const n of [1,20,100]){
        const name=kind+n;
        report.correctness[name]=buttonCheck(name,'pc-16-9');
    }
    for(const kind of 'ABC')report.correctness[kind+'Mobile']=buttonCheck(kind+'1','mobile-16-9');
    for(const v of ['B','C'])report.correctness['themes'+v]=themes('themes'+v);
    for(const name of ['skipA','skipB','rewardPanelA','rewardPanelB','shopPanelA','shopPanelB'])
        report.correctness[name]=buttonCheck(name,'pc-16-9');
    report.correctness.panelEffect=panelEffect();
    for(const mode of ['lua','tween','sequence'])report.correctness['shop-'+mode]=shop(mode);
    for(const mode of ['off','hover','trail'])for(const canvas of ['pc-16-9','mobile-16-9'])
        report.correctness['fx-'+mode+'-'+canvas]=effects(mode,canvas);
    for(const mode of ['hover','trail'])report.correctness['fx-'+mode+'-toggleOff']=effects(mode,'pc-16-9',9);
} finally {
    for(const restoreHook of restore)restoreHook();
}
function timing(name, effects=false) {
    const play=project(name);
    const mount=timed(()=>play.playStart({}));
    const {canvasWidth:w,canvasHeight:h}=mount.value;
    const initial=!effects&&lookup(inspect(play),'root/buttons/row0/button0');
    const inStep=[],paint=[],items=[];
    for(let i=0;i<24;i++){
        const p=effects?build.representatives[i%2?5:0].position:[initial.anchoredPositionX,initial.anchoredPositionY];
        inStep.push(pair(timed(()=>{
            pointer(play,'move',w/2+p[0]+(i%2?60:0),h/2+p[1]);
            if(i%6===0)pointer(play,'down',w/2+p[0],h/2+p[1]);
            if(i%6===1)pointer(play,'up',w/2+p[0],h/2+p[1]);
            tick(play);
        })));
        if(i%6===5){
            const measured=timed(()=>play.playGet({paint:true,compact:true}));
            paint.push(pair(measured));
            items.push(measured.value.paint?.length??0);
        }
    }
    inspect(play);play.playStop();
    return {mount:pair(mount),inStep,paint,items};
}
for(const n of [1,20,100])for(const mode of 'ABC')timing(mode+n);
for(const fixture of ['skip','rewardPanel','shopPanel'])for(const mode of 'AB')timing(fixture+mode);
for(const mode of ['off','hover','trail'])timing('fx-'+mode,true);
for(let round=0;round<12;round++){
    const order=permutations[round%permutations.length];
    report.orders.push(order);
    for(const n of [1,20,100])for(const [position,variant] of [...order].entries()){
        (report.sdkTiming[variant+n]??=[]).push({round,position,...timing(variant+n)});
    }
    for(const fixture of ['skip','rewardPanel','shopPanel']){
        const pair=round%2?['B','A']:['A','B'];
        for(const [position,key] of pair.entries())(report.panelTiming[fixture+key]??=[]).push({round,position,...timing(fixture+key)});
    }
    for(const [position,kind] of [...order].entries()){
        const mode={A:'off',B:'hover',C:'trail'}[kind];
        (report.effectsTiming[mode]??=[]).push({round,position,...timing('fx-'+mode,true)});
    }
}
const summarizeRuns=groups=>Object.fromEntries(Object.entries(groups).map(([name,runs])=>[
    name,{mount:summarize(runs.map(r=>r.mount)),inputStep:summarize(runs.flatMap(r=>r.inStep)),
        paint:summarize(runs.flatMap(r=>r.paint)),paintItems:runs.flatMap(r=>r.items)},
]));
report.summary=summarizeRuns(report.sdkTiming);
report.effectsSummary=summarizeRuns(report.effectsTiming);
report.panelSummary=summarizeRuns(report.panelTiming);
writeFileSync(join(directory,'replay.json'),JSON.stringify(report,null,2)+'\n');
console.log('Design A/B replay complete');
