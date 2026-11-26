import {projectRoundedStates,roundedActionStates} from './native-rounded-button.mjs';

const child=(node,name)=>node.children.find(part=>part.name===name);
export function applyOfficialMapReturnControls(map,rewards,theme){
 const {inset,size,fontSize}=theme.officialAssets.actionButton.mapReturn;
 const [left,bottom]=inset,[width,height]=size;
 const [canvasWidth,canvasHeight]=theme.canvas.base;
 const position=[left+(width-canvasWidth)/2,bottom+(height-canvasHeight)/2];
 const preview=child(map,'previewBack');
 child(preview,'label').text.content='返回';
 for(const button of [preview,rewards]){
  const label=child(button,'label'),hit=child(button,'hit');
  button.position=[...position];button.size=[...size];hit.size=[...size];
  label.position=[0,0];label.size=[width-theme.space.l,height];
  Object.assign(label.text,{fontSize,minFontSize:theme.font.minimum,colour:theme.officialAssets.buttonInk,outline:false});
  const legacy=button.children.filter(part=>part!==label&&part!==hit&&part.name!=='v25ReturnFlag');
  for(const part of legacy)part.visible=false;
  const variants=roundedActionStates(size,theme,'secondary');
  if(button===preview){
   const projection=projectRoundedStates(variants.children,'roundedButton');
   if(projection){
    child(projection.face,'roundedButton').name='v25Flag';
    variants.children=[projection.face];
    theme.officialAssets.mapReturnPalette=projection.palette;
    theme.officialAssets.mapReturnScales=projection.scales;
   }
  }
  button.children=[...legacy,variants,label,hit];
 }
}
