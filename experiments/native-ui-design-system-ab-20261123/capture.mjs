import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {bridge} from '../art-tech-lab/rpc.mjs';

const out=process.argv[2];
assert(out,'Usage: capture.mjs <build output directory>');
const shots=join(out,'shots');
mkdirSync(shots);
const b=bridge(),receipt=[];
try {
    await b.request('initialize',{protocolVersion:'2024-11-05',capabilities:{},clientInfo:{name:'design-system-ab',version:'2'}});
    for(const name of ['A1','B1','C1','themesB','skipA','skipB','rewardPanelA','rewardPanelB','shopPanelA','shopPanelB','panelEffect','fx-hover']){
        const open=await b.call('qxqy_project_open',{path:join(out,name,'candidate.save.json')});
        const data=open.structuredContent??JSON.parse(open.content.find(x=>x.type==='text').text);
        const {handle}=data;
        const play=(action,args={})=>b.call('qxqy_studio_play',{handle,action,args});
        await play('start',{canvasId:'pc-16-9',clockMode:'manual',muteAudio:true});
        if(name==='panelEffect'){
            await play('key',{key:'KeyboardCraftspersonKey5Down'});
            for(let i=0;i<7;i++)await play('step',{dt:1/60,light:true});
        }
        if(name==='fx-hover')await play('pointer',{type:'move',x:565,y:562});
        const snap=await b.call('qxqy_studio_play_screenshot',{handle});
        const image=snap.content.find(x=>x.type==='image');
        assert(image,name);
        const file=name+'.png';
        writeFileSync(join(shots,file),Buffer.from(image.data,'base64'));
        const metadata=snap.content.filter(x=>x.type==='text').map(x=>JSON.parse(x.text));
        receipt.push({file,metadata});
        await play('stop');
    }
} finally {
    b.close();
    writeFileSync(join(shots,'manifest.json'),JSON.stringify(receipt,null,2)+'\n');
}
