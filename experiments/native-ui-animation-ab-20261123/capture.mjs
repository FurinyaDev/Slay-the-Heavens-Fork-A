import {bridge} from '../art-tech-lab/rpc.mjs';
import {mkdirSync,writeFileSync} from 'node:fs';
const dir = process.argv[2];
const shots = dir+'/shots';
mkdirSync(shots);
const b=bridge();
const calls = [];
try {
 await b.request('initialize',{protocolVersion:'2024-11-05',capabilities:{},clientInfo:{name:'native-ui-ab',version:'1'}});
 for(const variant of ['lua','tween','sequence']){
   const open=await b.call('qxqy_project_open',{path:dir+'/'+variant+'/candidate.save.json'});
   const data=open.structuredContent??JSON.parse(open.content.find(x=>x.type==='text').text);
   const {handle}=data;
   const play=(action,args={})=>b.call('qxqy_studio_play',{handle,action,args});
   const key=i=>play('key',{key:'KeyboardCraftspersonKey'+i+'Down'});
   const tick=async frames=>{for(let i=0;i<frames;i++)await play('step',{dt:1/60,light:true});};
   const shot=async name=>{
     try {
      const result=await b.call('qxqy_studio_play_screenshot',{handle});
      const pic=result.content.find(x=>x.type==='image');
      if(!pic)throw new Error('No PNG in simulator response');
      const file=variant+'-'+name+'.png';
      writeFileSync(shots+'/'+file,Buffer.from(pic.data,'base64'));
      const details=result.content.filter(x=>x.type==='text').map(x=>{try{return JSON.parse(x.text)}catch{return x.text}});
      calls.push({file,details});
      console.log(file);
     } catch(error){calls.push({variant,name,error:error.message});console.log(variant,name,error.message.slice(0,200))}
   };
   await play('start',{canvasId:'pc-16-9',clockMode:'manual',muteAudio:true});
   if(variant==='lua'){
     await shot('buttons-normal');
     await play('pointer',{type:'move',x:440,y:450});await shot('buttons-hover');
     await play('pointer',{type:'down',x:440,y:450});await shot('buttons-pressed');
     await play('pointer',{type:'up',x:440,y:450});
     await key(10);await play('pointer',{type:'move',x:441,y:450});await shot('buttons-disabled');
   }
   await key(2);await tick(6);await shot('shop-100ms');
   await tick(14);await shot('shop-final');
   await key(3);await tick(6);await shot('character-100ms');
   await tick(40);await shot('character-final');
   await key(4);await tick(27);await shot('treasure-450ms');
   await tick(45);await shot('treasure-final');
   await key(7);await tick(27);await key(6);await tick(30);await key(8);await tick(6);await shot('map-reveal');
   await play('stop');
 }
} finally {b.close();writeFileSync(shots+'/manifest.json',JSON.stringify(calls,null,2));}
