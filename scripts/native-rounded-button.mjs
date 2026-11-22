import {isDeepStrictEqual} from 'node:util';
import {nativeRoundedMaterial} from './official-battle-card-chrome.mjs';

const child=(node,name)=>node?.children?.find(part=>part.name===name);

export function roundedButtonMaterial(name,[w,h],[rim,fill],{stretch=false}={}){
 const radius=Math.round(h/6),inset=2;
 const layer=(role,margin,r,ink)=>{
  const surface=nativeRoundedMaterial(role,w-2*margin,h-2*margin,r,ink,{raycastTarget:false});
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

export function roundedButtonState(state,size,colours,name='roundedButton'){
 const label=child(state,'label');
 const face=roundedButtonMaterial(name,size,colours);
 state.children=state.children.filter(part=>part.name!==name);
 for(const part of state.children){
  if(['officialButtonBacking','border','plate'].includes(part.name))part.visible=false;
 }
 state.children.splice(label?state.children.indexOf(label):0,0,face);
}

export function roundedButtonPalettes(theme){
 const {color:c,officialAssets:art}=theme;
 return {
  neutral:{normal:[c.gold,c.panelRaised],emphasized:[c.goldBright,c.panel],
   hover:[c.goldBright,c.buttonHover],pressed:[c.goldBright,c.buttonPressedFill],disabled:[c.line,c.panelSunken]},
  cancel:{normal:art.flagButton.cancel.slice(0,2),...art.roundedCancelStates},
 };
}

export function roundedPresetButton(button,theme,{tone='neutral',normal}={}){
 const palette=theme.officialAssets.roundedButtonPalettes[tone];
 for(const state of button.children){
  roundedButtonState(state,button.size,state.name==='normal'&&normal?normal:palette[state.name]);
 }
}

// Native preset children cannot host the visible face on this Simulator path.
// Fit the same material to a sibling of the cursor area, with one live caption.
export function roundedCursorButton(name,position,size,label,palette){
 const art={name:'art',kind:'container',size,children:[
  roundedButtonMaterial('roundedButton',size,palette.normal),{...label,raycastTarget:false},
 ]};
 return {name,kind:'container',position,size,children:[art,{name:'hit',kind:'cursorArea',size,focusable:true}]};
}

export function roundedFramedButton(button,theme,{stretch=false}={}){
 const base=button.children.findIndex(part=>part.name==='border');
 for(const part of button.children){
  if(['border','normal','hover','pressed','disabled','selected','officialButtonBacking',
   'v25BaseMaterial','v25StateChrome'].includes(part.name))part.visible=false;
 }
 const palette=theme.officialAssets.roundedButtonPalettes.neutral;
 button.children.splice(base,0,roundedButtonMaterial('roundedButton',button.size,palette.normal,{stretch}));
}

// Lua-driven faces can reuse one material when every state is exactly the
// normal tree with uniform layer colours. Preserve the explicit state trees
// if a future theme changes any other property, including the state pose.
export function projectRoundedStates(states,materialName){
 const normal=states.find(state=>state.name==='normal');
 if(!normal||states.length!==4||new Set(states.map(state=>state.name)).size!==4||
  !['normal','hover','pressed','disabled'].every(name=>states.some(state=>state.name===name)))return null;
 const palette={};
 for(const state of states){
  const expected={...structuredClone(normal),name:state.name,visible:state.visible};
  const material=child(state,materialName),target=child(expected,materialName);
  if(!material||!target)return null;
  palette[state.name]=[];
  for(const name of ['rim','cloth']){
   const layer=child(material,name),reference=child(target,name);
   const colour=layer?.children?.[0]?.colour;
   if(!reference||typeof colour!=='string'||!/^#[0-9a-f]{6}$/i.test(colour)||
    layer.children.some(part=>part.kind!=='image'||part.colour!==colour))return null;
   for(const part of reference.children)part.colour=colour;
   palette[state.name].push(colour);
  }
  if(!isDeepStrictEqual(state,expected))return null;
 }
 const face=structuredClone(normal);
 face.name='roundedButtonState';
 return {face,palette};
}
