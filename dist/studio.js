import {createState,dimensionKeys,displayValue,editDimension,confirmDimension,measurementErrors,validStoredState,statusLabel,makeBrief,factors} from './planner-model.js';
import {buildGeometry,renderOverlay} from './config-renderer.js';
const escapeHTML=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const labels={open:'Open shelving',concealed:'Concealed storage',combination:'Combination'};
const reviewItems=['Verify all dimensions and other fixtures.','Establish service access for valves and equipment.','Review split or removable panels and assembly around connected pipes.','Check supports, materials, loads, door movement, and installation tolerances.','Confirm fabrication pricing and fulfillment.'];
function database(){return new Promise((resolve,reject)=>{const r=indexedDB.open('spacemax-studio',1);r.onupgradeneeded=()=>r.result.createObjectStore('concepts');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})}
async function storage(action,value){const db=await database();return new Promise((resolve,reject)=>{const tx=db.transaction('concepts',action==='get'?'readonly':'readwrite');const store=tx.objectStore('concepts');let request=action==='get'?store.get('latest'):action==='put'?store.put(value,'latest'):store.delete('latest');let result;request.onsuccess=()=>{result=request.result};tx.oncomplete=()=>{db.close();resolve(result)};tx.onerror=()=>{db.close();reject(tx.error)};tx.onabort=()=>{db.close();reject(tx.error||new Error('Save interrupted'))}})}
export function initStudio(){
 const dialog=document.querySelector('#planner');
 dialog.className='configurator';
 dialog.innerHTML=`<div class="cfg-shell">
 <header class="cfg-top"><div><p class="eyebrow">SPACEMAX / THE SPACE STUDIO</p><h2 id="planner-title">Make room for possibility.</h2></div><div class="cfg-top-actions"><label class="cfg-units">Units <select id="cfg-units" aria-label="Measurement units"><option value="cm">cm</option><option value="in">in</option></select></label><button type="button" class="plain-button" id="cfg-reset">Reset draft</button><button type="button" class="icon-button" data-close aria-label="Close planner">✕</button></div></header>
 <ol class="cfg-stepper" aria-label="Design steps">${['Add your space','Review measurements','Preview configuration','Choose your layout'].map((s,i)=>`<li data-stage="${i+1}"><button type="button" data-jump="${i+1}"><span>${i+1}</span>${s}</button></li>`).join('')}</ol>
 <div class="cfg-workspace"><section class="cfg-visual" aria-label="Your space preview"><div class="cfg-visual-toolbar"><span id="cfg-source-badge" class="cfg-badge">YOUR SPACE</span><div class="cfg-view-toggle" id="cfg-view-controls" hidden><button type="button" data-view="see-through" aria-pressed="true">See-through</button><button type="button" data-view="finished" aria-pressed="false">Finished</button></div></div><div class="cfg-stage" id="cfg-stage"><img id="cfg-photo" alt="Your original space; storage concepts are drawn as separate overlays" hidden><div id="cfg-overlay"></div><div class="cfg-empty" id="cfg-empty"><svg width="74" height="74" viewBox="0 0 74 74" aria-hidden="true"><rect x="10" y="10" width="54" height="54" rx="4" fill="none" stroke="currentColor"/><path d="M10 37h54M37 37v27m-11-40h22m-11-11v22" fill="none" stroke="currentColor"/></svg><h3>Start with the space you have.</h3><p>A photo, a few measurements,<br>and a little imagination.</p></div></div><div class="cfg-legend" id="cfg-legend" hidden><span class="shelf-key">Proposed storage</span><span class="obstacle-key">Marked obstacle</span><span class="access-key">Reserved access</span></div><p class="cfg-caption" id="cfg-caption">Your photo stays on this device. No automatic image analysis.</p><div class="cfg-live-message" id="cfg-live-message" role="status" aria-live="polite"></div></section>
 <section class="cfg-controls" aria-label="Design controls">
 <div class="cfg-step" data-cfg-step="1"><div class="cfg-step-heading"><p class="eyebrow">01 / A NEW PERSPECTIVE</p><h3 tabindex="-1">Let’s meet your space.</h3></div><p class="cfg-help">Begin with an exposed bathroom sink. Our first prototype explores storage around one marked plumbing area.</p><label class="cfg-upload"><span aria-hidden="true">↥</span><strong>Add a photo</strong><span>JPEG, PNG, or WebP · up to 8 MB</span><input id="cfg-file" type="file" accept="image/jpeg,image/png,image/webp" aria-label="Upload a photo of your space"></label><p class="cfg-help">Photograph straight on, with the floor, underside of the sink, and plumbing visible. Avoid including people or personal details.</p><div class="cfg-photo-options"><span>Just exploring?</span><button class="inline-link" type="button" id="cfg-example">Try our sink example <span aria-hidden="true">↗</span></button></div><p class="cfg-replace-note" id="cfg-file-status" role="status"></p><fieldset><legend>What would you like to store?</legend><div class="cfg-choice-list">${['Mixed essentials','Tall bottles','Towels','Cleaning supplies'].map((s,i)=>`<label><input type="radio" name="cfg-goal" value="${s}" ${i===0?'checked':''}>${s}</label>`).join('')}</div></fieldset><p class="cfg-help">Replacing a photo clears the old measurements and marked boundaries.</p></div>
 <div class="cfg-step" data-cfg-step="2" hidden><div class="cfg-step-heading"><p class="eyebrow">02 / THE DETAILS MATTER</p><h3 tabindex="-1">Measure. Then make it yours.</h3></div><p class="cfg-help" id="cfg-measure-help"></p>
 ${dimensionKeys.map(k=>`<div class="cfg-dimension-row"><label for="cfg-${k}">${k[0].toUpperCase()+k.slice(1)} <span class="cfg-unit-text">cm</span></label><input id="cfg-${k}" data-dimension="${k}" type="number" inputmode="decimal" step="any" min="5" max="300" placeholder="Enter ${k}"><span class="cfg-status" id="cfg-status-${k}"></span><label class="cfg-confirm"><input type="checkbox" data-confirm="${k}" aria-label="Confirm ${k} checked with a measuring tool">I checked this with a measuring tool</label></div>`).join('')}
 <p class="cfg-help">User confirmation is not professional verification. Depth must be measured manually; the front-view sketch cannot check it.</p><details class="cfg-marker-details"><summary>Position the photo markers</summary><p class="cfg-help">Drag the corner handles or use these fields. These percentages position a visual guide; they do not measure the photo.</p><div class="cfg-boundary-fields">${[['x','Left'],['y','Top'],['width','Frame width'],['height','Frame height']].map(([k,l])=>`<label>${l} (%)<input type="number" data-frame="${k}" min="0" max="100" step="0.1" aria-label="Photo frame ${l.toLowerCase()} percent"></label>`).join('')}</div></details></div>
 <div class="cfg-step" data-cfg-step="3" hidden><div class="cfg-step-heading"><p class="eyebrow">03 / AROUND THE AWKWARD BITS</p><h3 tabindex="-1">Watch the shelves respond.</h3></div><p class="cfg-help">Widen the marked plumbing band. The adjacent shelves shorten to leave it clear.</p><label class="cfg-toggle"><input id="cfg-obstacle-enabled" type="checkbox">Mark a plumbing / equipment band</label><div id="cfg-obstacle-fields"><div class="cfg-boundary-fields"><label>Left edge (% of frame)<input id="cfg-obstacle-x" type="number" min="0" max="95" step="0.1"></label><label>Band width (% of frame)<input id="cfg-obstacle-width" type="number" min="1" max="100" step="0.1"></label></div><label class="cfg-range-row" for="cfg-obstacle-range">Adjust band width <input id="cfg-obstacle-range" type="range" min="1" max="100" step="1"></label><label class="cfg-field">Access space on each side (% of frame)<input id="cfg-access" type="number" min="0" max="50" step="0.1"></label><p class="cfg-help">Blue marks the obstacle. Amber reserves access space. Set this with a reviewer; the sample band is not a recommended service clearance.</p></div><label class="cfg-field">Shelf height from base <span class="cfg-unit-text">cm</span><input id="cfg-shelf" type="number" min="2.5" step="any"></label><label class="cfg-range-row" for="cfg-shelf-range">Move the shelf <input id="cfg-shelf-range" type="range" min="25" max="625" step="1"></label><label class="cfg-toggle"><input id="cfg-items" type="checkbox">Show illustrative stored items</label><p class="cfg-help">Photo content stays unchanged. Storage and item drawings are schematic overlays. Only the marked 2D band is checked.</p></div>
 <div class="cfg-step" data-cfg-step="4" hidden><div class="cfg-step-heading"><p class="eyebrow">04 / YOUR EVERYDAY, CONSIDERED</p><h3 tabindex="-1">Choose how you’ll use it.</h3></div><div class="cfg-layout-cards">${[['open','Open shelving','Everything visible and easy to reach.'],['concealed','Concealed storage','Panels screen the side bays; the central service band stays open.'],['combination','Combination','Open upper shelves with lower storage behind panels.']].map(([v,l,d])=>`<label><input type="radio" name="cfg-layout" value="${v}"><strong>${l}</strong><p>${d}</p></label>`).join('')}</div><p class="cfg-help">One warm-white finish keeps the focus on layout. Panel movement, fixings, and removal still need review.</p><section class="cfg-summary" aria-labelledby="cfg-summary-title"><h4 id="cfg-summary-title">Your concept, at a glance</h4><dl id="cfg-summary"></dl></section><label class="cfg-field">Anything else to consider?<textarea id="cfg-notes" maxlength="1000" rows="2" placeholder="Items to fit, other fixtures, or installation questions"></textarea></label><details><summary>What still needs review</summary><ul class="cfg-review-list">${reviewItems.map(x=>`<li>${x}</li>`).join('')}</ul></details><div class="cfg-save-actions"><button class="button" type="button" id="cfg-save">Choose this design <span aria-hidden="true">↗</span></button><button class="button outline" type="button" id="cfg-download">Download brief <span aria-hidden="true">↓</span></button></div><p class="cfg-help">Saves a concept on this device, including your photo. This does not submit an order or quote.</p><button type="button" class="plain-button" id="cfg-delete" hidden>Delete saved concept</button></div>
 <p class="cfg-error" id="cfg-error" role="alert" hidden></p><p class="cfg-success" id="cfg-success" role="status" aria-live="polite"></p></section></div>
 <footer class="cfg-footer"><button class="plain-button" type="button" id="cfg-back">← Back</button><span class="cfg-progress-note" id="cfg-progress-note">Your photo stays on this device.</span><button class="button" type="button" id="cfg-next">Review measurements <span aria-hidden="true">→</span></button></footer></div>`;
 const $=s=>dialog.querySelector(s),$$=s=>[...dialog.querySelectorAll(s)];
 let state=createState(),maxStep=1,saved=false,drag=null,uploadToken=0,revision=0,saving=false;
 const error=message=>{const el=$('#cfg-error');el.textContent=message;el.hidden=!message;if(message){el.tabIndex=-1;el.focus();el.scrollIntoView({block:'nearest'})}};
 const success=message=>{$('#cfg-success').textContent=message};
 const markDirty=()=>{revision++;success('');$('#cfg-save').disabled=saving;$('#cfg-save').innerHTML='Choose this design <span aria-hidden="true">↗</span>';};
 const percent=n=>Number((n*100).toFixed(1));
 const clamp=(n,min,max)=>Math.min(max,Math.max(min,n));
 function geometry(){return buildGeometry(state)}
 function syncNumbers(){
  $('#cfg-units').value=state.units;
  $$('.cfg-unit-text').forEach(el=>el.textContent=state.units);
  dimensionKeys.forEach(k=>{const input=$('#cfg-'+k);if(document.activeElement!==input)input.value=displayValue(state.dimensions[k],state.units);input.min=displayValue(50,state.units);input.max=displayValue(3000,state.units);const badge=$('#cfg-status-'+k);badge.textContent=statusLabel(state.statuses[k]);badge.dataset.status=state.statuses[k];const check=$(`[data-confirm="${k}"]`);check.checked=state.statuses[k]==='confirmed';check.disabled=!state.dimensions[k]||state.dimensions[k]<50||state.dimensions[k]>3000});
  $$('[data-frame]').forEach(input=>{if(document.activeElement!==input)input.value=percent(state.frame[input.dataset.frame])});
  const fields={'#cfg-obstacle-x':percent(state.obstacle.x),'#cfg-obstacle-width':percent(state.obstacle.width),'#cfg-access':percent(state.obstacle.access),'#cfg-shelf':displayValue(state.shelfHeight,state.units)};
  Object.entries(fields).forEach(([s,v])=>{if(document.activeElement!==$(s))$(s).value=v});
  $('#cfg-obstacle-range').value=percent(state.obstacle.width);$('#cfg-obstacle-range').max=(100-percent(state.obstacle.x)).toFixed(1);
  $('#cfg-obstacle-width').max=(100-percent(state.obstacle.x)).toFixed(1);
  $('#cfg-shelf-range').max=Math.max(25,(state.dimensions.height||650)-25);$('#cfg-shelf-range').value=state.shelfHeight||25;
  $('#cfg-shelf').min=displayValue(25,state.units);$('#cfg-shelf').max=displayValue(Math.max(25,(state.dimensions.height||650)-25),state.units);
 }
 function render(){
  const step=state.step;
  $('#cfg-next').disabled=false;
  $$('[data-cfg-step]').forEach(el=>el.hidden=Number(el.dataset.cfgStep)!==step);
  $$('[data-stage]').forEach(el=>{const n=Number(el.dataset.stage);el.classList.toggle('active',n===step);el.classList.toggle('complete',n<step);const button=el.querySelector('button');button.disabled=n>step;button.setAttribute('aria-current',n===step?'step':'false')});
  $('#cfg-back').hidden=step===1;$('#cfg-next').hidden=step===4;
  $('#cfg-next').innerHTML=[null,'Review measurements <span aria-hidden="true">→</span>','Preview configuration <span aria-hidden="true">→</span>','Choose your layout <span aria-hidden="true">→</span>'][step]||'';
  $('#cfg-progress-note').textContent=step===4?'A saved concept. A considered next step.':`Step ${step} of 4 · ${state.mode==='example'?'Prepared demo data':'Manual setup'}`;
  $('#cfg-reset').textContent=state.mode==='example'?'Reset example':'Reset draft';
  $('#cfg-source-badge').textContent=state.mode==='example'?'DEMO SAMPLE · NOT MEASURED FROM PHOTO':'YOUR PHOTO · MANUAL SETUP';
  $('#cfg-photo').hidden=!state.photo;$('#cfg-empty').hidden=!!state.photo;
  if(state.photo&&$('#cfg-photo').getAttribute('src')!==state.photo)$('#cfg-photo').src=state.photo;
  $('#cfg-measure-help').textContent=state.mode==='example'?'These are prepared sample dimensions, not measurements extracted from the photo. You can continue with sample depth to explore the demo.':'Enter clear width, height, and depth using a measuring tool. No dimensions are inferred from your photo. Confirm the depth before continuing.';
  $('#cfg-caption').textContent=step===1?'The original photo stays unchanged. Photos are processed locally in your browser.':step===2?'Photo markers are visual guides, not a calibrated measurement. Drag handles or use the numeric fields.':'Live 2D concept · Front view is schematic, not a fit verification. Depth and unmarked fixtures are not checked.';
  $('#cfg-view-controls').hidden=step<3;$('#cfg-legend').hidden=step<2;
  $('#cfg-obstacle-enabled').checked=state.obstacle.enabled;$('#cfg-obstacle-fields').hidden=!state.obstacle.enabled;$('#cfg-items').checked=state.items;
  $$('[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===state.view)));
  $$('[name="cfg-layout"]').forEach(i=>i.checked=i.value===state.layout);$$('[name="cfg-goal"]').forEach(i=>i.checked=i.value===state.goal);
  if(document.activeElement!==$('#cfg-notes'))$('#cfg-notes').value=state.notes;
  syncNumbers();renderPreview();renderSummary();
  $('#cfg-delete').hidden=!saved;
 }
 function renderPreview(){
  if(!state.photo||state.step===1){$('#cfg-overlay').innerHTML='';$('#cfg-live-message').textContent='';return}
  $('#cfg-overlay').innerHTML=renderOverlay(state,{showFrame:state.step===2,showObstacle:true,showShelves:state.step>=3});
  if(state.step<3){$('#cfg-live-message').textContent='';return}
  const g=geometry();
  const relevantWarnings=g.warnings.filter(w=>!w.startsWith('This straight-on'));
  const widths=g.bays.map(b=>`${b.side}: ${displayValue(b.widthMm,state.units)} ${state.units}`).join(' · ');
  $('#cfg-live-message').textContent=g.valid?`${widths}. Bays follow the marked band; 120 mm minimum bay width is a demo rule.${relevantWarnings.length?' '+relevantWarnings.join(' '):''}`:g.warnings.join(' ');
  $('#cfg-live-message').classList.toggle('has-warning',!g.valid);
  $('#cfg-next').disabled=!g.valid;
  $('#cfg-save').disabled=saving||!g.valid;
 }
 function renderSummary(){
  const rows=[['Layout',labels[state.layout]],['For',state.goal],...dimensionKeys.map(k=>[k[0].toUpperCase()+k.slice(1),`${displayValue(state.dimensions[k],state.units)} ${state.units} · ${statusLabel(state.statuses[k])}`]),['Shelf height',`${displayValue(state.shelfHeight,state.units)} ${state.units} from base`]];
  $('#cfg-summary').innerHTML=rows.map(([l,v])=>`<div><dt>${escapeHTML(l)}</dt><dd>${escapeHTML(v)}</dd></div>`).join('');
 }
 function stepTo(step){state.step=step;maxStep=Math.max(maxStep,step);error('');success('');$('#cfg-next').disabled=false;render();$('.cfg-controls').scrollTop=0;$('.cfg-workspace').scrollTop=0;$(`[data-cfg-step="${step}"] h3`).focus({preventScroll:true})}
 function loadExample(){uploadToken++;state=createState('example');maxStep=1;$('#cfg-file').value='';$('#cfg-file-status').textContent='Prepared sample dimensions and plumbing band loaded.';markDirty();error('');render()}
 function validateBeforeNext(){
  if(state.step===1&&!state.photo){error('Add a photo or try the sink example to continue.');return false}
  if(state.step===2){const errors=measurementErrors(state);if(errors.length){error(errors.join(' '));return false}}
  if(state.step===3&&!geometry().valid){error(geometry().warnings.join(' '));return false}
  return true;
 }
 $('#cfg-next').addEventListener('click',()=>{if(validateBeforeNext())stepTo(state.step+1)});
 $('#cfg-back').addEventListener('click',()=>stepTo(Math.max(1,state.step-1)));
 $$('[data-jump]').forEach(b=>b.addEventListener('click',()=>{const n=Number(b.dataset.jump);if(n<=state.step)stepTo(n)}));
 $('#cfg-example').addEventListener('click',loadExample);
 $('#cfg-reset').addEventListener('click',()=>{if(state.mode==='example')loadExample();else{uploadToken++;state=createState();maxStep=1;$('#cfg-file').value='';$('#cfg-file-status').textContent='';markDirty();error('');render()}});
 $('#cfg-units').addEventListener('change',()=>{state.units=$('#cfg-units').value;markDirty();render()});
 $$('[data-dimension]').forEach(input=>input.addEventListener('input',()=>{editDimension(state,input.dataset.dimension,input.value);markDirty();error('');render()}));
 $$('[data-confirm]').forEach(input=>input.addEventListener('change',()=>{confirmDimension(state,input.dataset.confirm,input.checked);markDirty();error('');render()}));
 $$('[name="cfg-goal"]').forEach(input=>input.addEventListener('change',()=>{state.goal=input.value;markDirty();render()}));
 $$('[name="cfg-layout"]').forEach(input=>input.addEventListener('change',()=>{state.layout=input.value;markDirty();render()}));
 $$('[data-view]').forEach(button=>button.addEventListener('click',()=>{state.view=button.dataset.view;render()}));
 function updateFrame(key,value){if(value==='')return;let n=Number(value)/100;if(!Number.isFinite(n))return;const f=state.frame;if(key==='x')f.x=clamp(n,0,1-f.width);if(key==='y')f.y=clamp(n,0,1-f.height);if(key==='width')f.width=clamp(n,.05,1-f.x);if(key==='height')f.height=clamp(n,.05,1-f.y);markDirty();render()}
 $$('[data-frame]').forEach(input=>{input.addEventListener('input',()=>updateFrame(input.dataset.frame,input.value));input.addEventListener('blur',()=>input.value=percent(state.frame[input.dataset.frame]))});
 $('#cfg-obstacle-enabled').addEventListener('change',()=>{state.obstacle.enabled=$('#cfg-obstacle-enabled').checked;markDirty();render()});
 function updateObstacle(key,raw){if(raw==='')return;const n=Number(raw)/100;if(!Number.isFinite(n))return;if(key==='x')state.obstacle.x=clamp(n,0,1-state.obstacle.width);if(key==='width')state.obstacle.width=clamp(n,.01,1-state.obstacle.x);if(key==='access')state.obstacle.access=clamp(n,0,.5);markDirty();render()}
 for(const [selector,key] of [['#cfg-obstacle-x','x'],['#cfg-obstacle-width','width'],['#cfg-access','access']]){const input=$(selector);input.addEventListener('input',()=>updateObstacle(key,input.value));input.addEventListener('blur',()=>input.value=percent(state.obstacle[key]))}
 $('#cfg-obstacle-range').addEventListener('input',()=>updateObstacle('width',$('#cfg-obstacle-range').value));
 function setShelf(mm){if(!Number.isFinite(mm))return;state.shelfEdited=true;state.shelfHeight=clamp(mm,25,Math.max(25,(state.dimensions.height||650)-25));markDirty();render()}
 $('#cfg-shelf').addEventListener('input',()=>{if($('#cfg-shelf').value!=='')setShelf(Number($('#cfg-shelf').value)*factors[state.units])});
 $('#cfg-shelf').addEventListener('blur',()=>$('#cfg-shelf').value=displayValue(state.shelfHeight,state.units));
 $('#cfg-shelf-range').addEventListener('input',()=>setShelf(Number($('#cfg-shelf-range').value)));
 $('#cfg-items').addEventListener('change',()=>{state.items=$('#cfg-items').checked;markDirty();render()});
 $('#cfg-notes').addEventListener('input',()=>{state.notes=$('#cfg-notes').value;markDirty()});
 $('#cfg-file').addEventListener('change',async()=>{
  const file=$('#cfg-file').files[0];if(!file)return;const token=++uploadToken;
  if(!['image/jpeg','image/png','image/webp'].includes(file.type)){error('Choose a JPEG, PNG, or WebP image.');$('#cfg-file').value='';return}
  if(file.size>8*1024*1024){error('Choose a photo smaller than 8 MB.');$('#cfg-file').value='';return}
  try{const data=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=()=>reject(r.error);r.readAsDataURL(file)});const picture=new Image();picture.src=data;await picture.decode();if(token!==uploadToken)return;if(picture.naturalWidth<100||picture.naturalHeight<100||picture.naturalWidth/picture.naturalHeight<=.05||picture.naturalWidth/picture.naturalHeight>=20)throw new Error('size');const prior=state;state=createState();if(!prior.photo&&prior.mode==='manual'){state.dimensions={...prior.dimensions};state.statuses={...prior.statuses};state.units=prior.units;state.shelfHeight=prior.shelfHeight;state.shelfEdited=prior.shelfEdited;state.notes=prior.notes;state.goal=prior.goal;}state.photo=data;state.photoAspect=picture.naturalWidth/picture.naturalHeight;state.photoName=file.name;maxStep=1;$('#cfg-file-status').textContent=`${file.name} · added locally. Enter measurements and mark obstacles manually.`;markDirty();error('');render()}catch{if(token===uploadToken)error('This image could not be read. Choose another JPEG, PNG, or WebP photo.')}finally{$('#cfg-file').value=''}
 });
 $('#cfg-stage').addEventListener('pointerdown',event=>{
  const handle=event.target.closest('[data-handle]');if(!handle)return;event.preventDefault();drag={handle:handle.dataset.handle,frame:{...state.frame},obstacle:{...state.obstacle}};$('#cfg-stage').setPointerCapture(event.pointerId)
 });
 $('#cfg-stage').addEventListener('pointermove',event=>{
  if(!drag)return;const rect=$('#cfg-stage').getBoundingClientRect();const x=clamp((event.clientX-rect.left)/rect.width,0,1),y=clamp((event.clientY-rect.top)/rect.height,0,1);const f=drag.frame;
  if(drag.handle==='frame-nw'){const right=f.x+f.width,bottom=f.y+f.height;state.frame={x:Math.min(x,right-.05),y:Math.min(y,bottom-.05),width:right-Math.min(x,right-.05),height:bottom-Math.min(y,bottom-.05)}}
  if(drag.handle==='frame-se'){state.frame={...f,width:clamp(x-f.x,.05,1-f.x),height:clamp(y-f.y,.05,1-f.y)}}
  const relative=clamp((x-state.frame.x)/state.frame.width,0,1);const o=drag.obstacle;
  if(drag.handle==='obstacle-left'){const right=o.x+o.width;state.obstacle.x=clamp(relative,0,right-.01);state.obstacle.width=right-state.obstacle.x}
  if(drag.handle==='obstacle-right')state.obstacle.width=clamp(relative-o.x,.01,1-o.x);
  markDirty();render();
 });
 const endDrag=()=>{drag=null};$('#cfg-stage').addEventListener('pointerup',endDrag);$('#cfg-stage').addEventListener('pointercancel',endDrag);
 $('#cfg-save').addEventListener('click',async()=>{
  if(!validStoredState(state)||measurementErrors(state).length||!geometry().valid){error('Check the measurements and marked band before saving.');return}
  if(saving)return;saving=true;$('#cfg-save').disabled=true;const snapshot=structuredClone(state),savedRevision=revision;
  try{await storage('put',snapshot);saved=true;document.querySelector('#saved-dot').hidden=false;$('#cfg-delete').hidden=false;if(savedRevision===revision){success('Concept saved on this device. Nothing has been ordered or submitted.');$('#cfg-save').textContent='Concept saved ✓'}else{success('The earlier snapshot was saved. Your latest edits are not saved yet.')}saving=false;$('#cfg-save').disabled=savedRevision===revision}catch{saving=false;error('Browser storage is unavailable. Download your brief to keep the configuration.');$('#cfg-save').disabled=false}
 });
 $('#cfg-download').addEventListener('click',()=>{const url=URL.createObjectURL(new Blob([makeBrief(state)],{type:'text/plain;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='spacemax-concept-brief.txt';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);success('Your concept brief is ready to download. Your photo is not included in this text file.')});
 $('#cfg-delete').addEventListener('click',async()=>{try{await storage('delete');try{localStorage.removeItem('spacemax-plan-v1')}catch{}saved=false;document.querySelector('#saved-dot').hidden=true;$('#cfg-delete').hidden=true;markDirty();success('Saved copy deleted. Your current draft is still open.')}catch{error('Could not delete the saved copy. Clear this site’s data in browser settings.')}});
 async function detectSaved(){try{const old=await storage('get');saved=validStoredState(old)}catch{}try{saved=saved||!!localStorage.getItem('spacemax-plan-v1')}catch{}document.querySelector('#saved-dot').hidden=!saved}
 function show(){dialog.showModal();document.body.classList.add('modal-open');render()}
 function open(mode='manual'){if(mode==='example'){loadExample()}else if(state.mode==='example'){revision++;state=createState();maxStep=1;$('#cfg-file-status').textContent='';error('');success('')}state.step=1;show()}
 async function openSaved(){
  uploadToken++;revision++;
  try{const record=await storage('get');if(validStoredState(record)){state=record;state.step=4;maxStep=4;show();success('Your saved concept, ready to revisit.');return}}catch{}
  try{const old=JSON.parse(localStorage.getItem('spacemax-plan-v1'));if(old&&['in','cm'].includes(old.units)){state=createState();state.units=old.units;for(const k of dimensionKeys){if(Number.isFinite(old[k])&&old[k]>0){state.dimensions[k]=old[k]*factors[old.units];state.statuses[k]='entered'}}state.shelfHeight=(state.dimensions.height||650)*.48;state.notes=String(old.notes||'').slice(0,1000);show();success('Your earlier brief is here. Add a photo to continue in the new studio.');return}}catch{}
  open();success('No saved concept yet. Add a photo or try the example.');
 }
 detectSaved();render();return {open,openSaved};
}
