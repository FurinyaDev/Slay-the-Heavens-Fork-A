import {isDeepStrictEqual} from 'node:util';
import {nativeRoundedMaterial} from './official-battle-card-chrome.mjs';

const child=(node,name)=>node.children.find(part=>part.name===name);
const states=['normal','hover','pressed','disabled'];
const legacyFaces=['border','plate','normal','hover','pressed','disabled','selected',
 'officialButtonBacking','v25BaseMaterial','v25StateChrome'];
const defaultMaterial={radiusRatio:1/6,rimWidth:2};

export function roundedButtonRadius(height,material=defaultMaterial){
 return Math.round(height*material.radiusRatio);
}

function actionColours(theme,role,state){
 const token=theme.officialAssets.actionButton;
 return state==='disabled'?token.disabled:token[role][state];
}

export function roundedButtonMaterial(name,[w,h],[rim,fill],{stretch=false,material=defaultMaterial,images}={}){
 const radius=roundedButtonRadius(h,material),inset=material.rimWidth;
 const layer=(role,margin,r,ink)=>{
  const surface=nativeRoundedMaterial(role,w-2*margin,h-2*margin,r,ink,{raycastTarget:false});
  if(images)for(const part of surface.children)part.image=part.name.startsWith('corner')?images.disc:images.rect;
  if(stretch){
   surface.anchor={min:[0,0],max:[1,1]};surface.size=[-2*margin,-2*margin];
   for(const part of surface.children){
    if(part.name==='vertical'||part.name==='horizontal'){
     part.anchor={min:[0,0],max:[1,1]};
     part.size=part.name==='vertical'?[-2*r,0]:[0,-2*r];
    }else{
     const [x,y]=part.position.map(Math.sign),corner=[(x+1)/2,(y+1)/2];
     part.anchor={min:corner,max:corner};part.position=[-x*r,-y*r];
    }
   }
  }
  return surface;
 };
 return {name,kind:'container',size:stretch?[0,0]:[w,h],
  ...(stretch&&{anchor:{min:[0,0],max:[1,1]}}),
  children:[layer('rim',0,radius,rim),layer('cloth',inset,radius-inset,fill)]};
}

export function roundedButtonState(state,size,colours,name='roundedButton',options){
 const label=child(state,'label');
 const face=roundedButtonMaterial(name,size,colours,options);
 state.children=state.children.filter(part=>part.name!==name);
 for(const part of state.children)if(legacyFaces.includes(part.name))part.visible=false;
 state.children.splice(label?state.children.indexOf(label):0,0,face);
}

export function roundedPresetButton(button,theme,role,{name='roundedButton',size=button.size,fontSize}={}){
 const material=theme.officialAssets.actionButton;
 button.size=[...size];
 for(const state of button.children){
  const label=child(state,'label');
  state.size=[...size];
  if(state.name==='pressed')state.scale=[material.pressedScale,material.pressedScale];
  roundedButtonState(state,size,actionColours(theme,role,state.name),name,{material,images:theme.image});
  if(fontSize)Object.assign(label.text,{fontSize,minFontSize:theme.font.minimum});
  label.text.colour=state.name==='disabled'?theme.color.textMuted:theme.officialAssets.buttonInk;
 }
}

export function roundedActionStates(size,theme,role){
 const material=theme.officialAssets.actionButton;
 return {name:'v25Face',kind:'container',size:[...size],children:states.map(state=>({
  name:state,kind:'container',size:[...size],visible:state==='normal',
  scale:state==='pressed'?[material.pressedScale,material.pressedScale]:[1,1],
  children:[roundedButtonMaterial('roundedButton',size,actionColours(theme,role,state),{material,images:theme.image})],
 }))};
}

export function roundedFramedButton(button,theme,{stretch=false}={}){
 for(const part of button.children)if(legacyFaces.includes(part.name))part.visible=false;
 const material=theme.officialAssets.actionButton;
 button.children.unshift(roundedButtonMaterial('roundedButton',button.size,material.secondary.normal,{stretch,material,images:theme.image}));
}

// Lua-driven faces can reuse one material when every state is exactly the
// normal tree with uniform layer colours. Preserve the explicit state trees
// if a future theme changes any property beyond the layer colours and its separately published scale.
export function projectRoundedStates(states,materialName){
 const normal=states.find(state=>state.name==='normal');
 if(!normal||states.length!==4||new Set(states.map(state=>state.name)).size!==4||
  !['normal','hover','pressed','disabled'].every(name=>states.some(state=>state.name===name)))return null;
 const palette={},scales={};
 for(const state of states){
  const expected={...structuredClone(normal),name:state.name,visible:state.visible,scale:state.scale};
  if(!Array.isArray(state.scale)||state.scale.length!==2||state.scale.some(value=>!Number.isFinite(value)))return null;
  scales[state.name]=[...state.scale];
  const material=child(state,materialName),target=child(expected,materialName);
  if(!material||!target)return null;
  palette[state.name]=[];
  for(const name of ['rim','cloth']){
   const layer=child(material,name),reference=child(target,name);
   const colour=layer?.children?.[0]?.colour;
   if(!Array.isArray(reference?.children)||typeof colour!=='string'||!/^#[0-9a-f]{6}$/i.test(colour)||
    layer.children.some(part=>part.kind!=='image'||part.colour!==colour))return null;
   for(const part of reference.children)part.colour=colour;
   palette[state.name].push(colour);
  }
  if(!isDeepStrictEqual(state,expected))return null;
 }
 const face=structuredClone(normal);
 face.name='roundedButtonState';
 return {face,palette,scales};
}
