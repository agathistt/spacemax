import {initStudio} from './studio.js';
const $=(s,p=document)=>p.querySelector(s),$$=(s,p=document)=>[...p.querySelectorAll(s)];
const studio=initStudio();
function openDialog(dialog){dialog.showModal();document.body.classList.add('modal-open')}
$$('dialog').forEach(dialog=>{
 $$('[data-close]',dialog).forEach(button=>button.addEventListener('click',()=>dialog.close()));
 dialog.addEventListener('close',()=>document.body.classList.remove('modal-open'));
 dialog.addEventListener('click',event=>{if(event.target!==dialog)return;const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close()});
});
$$('[data-planner]').forEach(button=>button.addEventListener('click',()=>studio.open('manual')));
$$('[data-example]').forEach(button=>button.addEventListener('click',()=>studio.open('example')));
$('#saved-plan').addEventListener('click',()=>studio.openSaved());
$('#menu-toggle').addEventListener('click',()=>{const open=$('#mobile-nav').hidden;$('#mobile-nav').hidden=!open;$('#menu-toggle').setAttribute('aria-expanded',String(open));$('#menu-toggle').setAttribute('aria-label',open?'Close navigation':'Open navigation')});
function closeMenu(){$('#mobile-nav').hidden=true;$('#menu-toggle').setAttribute('aria-expanded','false');$('#menu-toggle').setAttribute('aria-label','Open navigation')}
$$('#mobile-nav a').forEach(link=>link.addEventListener('click',closeMenu));
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!$('#mobile-nav').hidden){closeMenu();$('#menu-toggle').focus()}});
$('#privacy-open').addEventListener('click',()=>openDialog($('#privacy')));
const photos={before:{src:'assets/under-sink-before.png',title:'Before — the existing space',alt:'Original before photo: supplies on the floor beneath a wall-mounted sink with exposed pipes',caption:'The original before photo.',width:1254,height:1254},after:{src:'assets/under-sink-after-preview.png',title:'After — the design preview',alt:'Full supplied design preview showing fitted shelving and drawers around existing sink plumbing, alongside configuration controls',caption:'Prepared finish reference. This image does not change with planner edits. Its controls are part of the supplied image.',width:1536,height:1024}};
$$('[data-photo]').forEach(button=>button.addEventListener('click',()=>{const photo=photos[button.dataset.photo];const img=$('#photo-viewer-image');img.src=photo.src;img.alt=photo.alt;img.width=photo.width;img.height=photo.height;$('#photo-viewer-title').textContent=photo.title;$('#photo-viewer-caption').textContent=photo.caption;openDialog($('#photo-viewer'))}));
$$('[data-hero-view]').forEach(button=>button.addEventListener('click',()=>{const showConcept=button.dataset.heroView==='concept';$('#hero-original').hidden=showConcept;$('#hero-concept').hidden=!showConcept;$$('[data-hero-view]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));$('#hero-image-description').textContent=showConcept?'Prepared storage concept · explore your own configuration in the studio.':'Original space · everyday supplies gathered beneath exposed plumbing.'}));
$('#year').textContent=new Date().getFullYear();
