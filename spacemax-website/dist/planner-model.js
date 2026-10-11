export const EXAMPLE_PHOTO = 'assets/under-sink-before.png';
export const dimensionKeys = ['width','height','depth'];
export const factors = {cm:10,in:25.4};
export function createState(mode='manual') {
  const example=mode==='example';
  return {version:3,mode,step:1,photo:example?EXAMPLE_PHOTO:null,photoAspect:1,photoName:example?'SpaceMax sink example':'',goal:'Mixed essentials',units:'cm',dimensions:example?{width:900,height:650,depth:400}:{width:null,height:null,depth:null},statuses:{width:example?'demo':'empty',height:example?'demo':'empty',depth:example?'demo':'empty'},frame:example?{x:.20,y:.49,width:.46,height:.34}:{x:.1,y:.2,width:.8,height:.65},obstacle:example?{enabled:true,x:.51,width:.20,access:.04}:{enabled:false,x:.4,width:.2,access:0},shelfHeight:example?300:null,shelfEdited:false,layout:'open',view:'see-through',items:false,notes:''};
}
export function displayValue(mm,units) { return Number.isFinite(mm)?String(Number((mm/factors[units]).toFixed(4))):''; }
export function editDimension(state,key,displayed) {
  const raw=String(displayed).trim();const n=raw===''?null:Number(raw)*factors[state.units];
  state.dimensions[key]=Number.isFinite(n)&&n>0?n:null;
  state.statuses[key]=state.dimensions[key]===null?'empty':'entered';
  if(key==='height'&&state.dimensions.height){
    // Older saved concepts have no shelfEdited flag; retain their chosen value.
    const shelf=state.shelfEdited===false?state.dimensions.height*.48:(state.shelfHeight||state.dimensions.height*.48);
    state.shelfHeight=Math.min(Math.max(25,shelf),Math.max(25,state.dimensions.height-25));
  }
}
export function confirmDimension(state,key,checked) { state.statuses[key]=checked&&Number.isFinite(state.dimensions[key])?'confirmed':(state.dimensions[key]===null?'empty':'entered'); }
export function measurementErrors(state) {
  const errors=[];
  for(const key of dimensionKeys){const n=state.dimensions[key];if(!Number.isFinite(n)||n<50||n>3000)errors.push(`Enter a ${key} between ${displayValue(50,state.units)} and ${displayValue(3000,state.units)} ${state.units}.`);}
  if(!errors.length&&state.statuses.depth!=='confirmed'&&!(state.mode==='example'&&state.statuses.depth==='demo'))errors.push('Check the depth with a measuring tool, then confirm it below.');
  return errors;
}
export function validStoredState(s){
  return s?.version===3&&['example','manual'].includes(s.mode)&&['cm','in'].includes(s.units)&&['open','concealed','combination'].includes(s.layout)&&['see-through','finished'].includes(s.view)&&typeof s.notes==='string'&&s.notes.length<=1000&&typeof s.goal==='string'&&s.goal.length<100&&typeof s.photo==='string'&&(s.photo===EXAMPLE_PHOTO||/^data:image\/(png|jpeg|webp);base64,/.test(s.photo))&&s.photo.length<16000000&&Number.isFinite(s.photoAspect)&&s.photoAspect>.05&&s.photoAspect<20&&dimensionKeys.every(k=>Number.isFinite(s.dimensions?.[k])&&s.dimensions[k]>=50&&s.dimensions[k]<=3000&&['demo','entered','confirmed'].includes(s.statuses?.[k]))&&['x','y','width','height'].every(k=>Number.isFinite(s.frame?.[k])&&s.frame[k]>=0&&s.frame[k]<=1)&&s.frame.width>=.05&&s.frame.height>=.05&&s.frame.x+s.frame.width<=1.001&&s.frame.y+s.frame.height<=1.001&&['x','width','access'].every(k=>Number.isFinite(s.obstacle?.[k])&&s.obstacle[k]>=0&&s.obstacle[k]<=1)&&s.obstacle.x+s.obstacle.width<=1.001&&Number.isFinite(s.shelfHeight)&&s.shelfHeight>=25&&s.shelfHeight<=s.dimensions.height;
}
export function statusLabel(status){return {demo:'Demo sample',empty:'Not entered',entered:'Entered by you',confirmed:'Confirmed by you'}[status]||'Not entered';}
export function makeBrief(s){
  const labels={open:'Open shelving',concealed:'Concealed storage',combination:'Combination'};
  return `SPACEMAX — CONCEPT BRIEF\n\nSaved concept, not an order or fabrication drawing.\n\nSpace: ${s.mode==='example'?'Prepared bathroom sink example':'Your uploaded space'}\nLayout: ${labels[s.layout]}\nStorage goal: ${s.goal}\nFinish direction: Warm white\n\nMEASUREMENTS\n${dimensionKeys.map(k=>`${k[0].toUpperCase()+k.slice(1)}: ${displayValue(s.dimensions[k],s.units)} ${s.units} — ${statusLabel(s.statuses[k])}`).join('\n')}\nShelf height from base: ${displayValue(s.shelfHeight,s.units)} ${s.units}\n\nPHOTO ANNOTATIONS (NOT CALIBRATED MEASUREMENTS)\nStorage frame: x ${(s.frame.x*100).toFixed(1)}%, y ${(s.frame.y*100).toFixed(1)}%, width ${(s.frame.width*100).toFixed(1)}%, height ${(s.frame.height*100).toFixed(1)}% of photo\n${s.obstacle.enabled?`Marked obstacle: left ${(s.obstacle.x*100).toFixed(1)}%, width ${(s.obstacle.width*100).toFixed(1)}% of storage frame; reserved access each side ${(s.obstacle.access*100).toFixed(1)}%`:'No obstacle marked'}\n\nNOTES\n${s.notes||'No additional notes.'}\n\nREVIEW STILL REQUIRED\n${dimensionKeys.filter(k=>s.statuses[k]!=='confirmed').map(k=>`- Manually check ${k}.`).join('\n')}\n- Verify all dimensions and all obstacles with an appropriate reviewer.\n- Establish service access for valves, pipes, and equipment.\n- Confirm split/removable panels, assembly sequence, door movement, materials, supports, load capacity and installation tolerances.\n- Obtain fabrication pricing and fulfillment details.\n\nWHAT THIS PROTOTYPE CHECKS\nThe 2D sketch keeps side bays outside one marked full-height obstacle/access band. A bay needs 120 mm of nominal width under a demonstration rule; this is not an engineering threshold. Depth is entered manually and is not validated by the front-view sketch. User confirmation is not professional fit verification. No automatic photo measurement, fabrication export, quote, or order is generated.\n`;
}
