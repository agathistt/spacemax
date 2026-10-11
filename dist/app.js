(() => {
  'use strict';
  const $ = (query, root = document) => root.querySelector(query);
  const $$ = (query, root = document) => [...root.querySelectorAll(query)];
  const planner = $('#planner');
  const privacy = $('#privacy-dialog');
  const form = $('#space-form');
  const storageKey = 'spacemax-space-details-v2';
  const legacyKey = 'spacemax-space-brief-v1';
  const configurations = {
    'Cable organization': {
      dimensionLabel: 'Available organizer space',
      help: 'Measure the area where cables will be organized. Note cable routes, outlets, plugs, and room to reach connections.',
      placeholder: 'Desk setup, devices, outlet positions, bulky plugs, cable lengths, and where cords get in the way…',
      checklist: ['Measure the available organizer space and cable routes.', 'List devices, plugs, outlets, and cable lengths.', 'Keep connections and equipment ventilation accessible.']
    },
    'Under the sink': {
      dimensionLabel: 'Usable cabinet interior',
      help: 'Measure the inside width, depth, and height. Note pipes, valves, hinges, and the door opening.',
      placeholder: 'Pipes in the middle, shutoff valves, tall cleaning bottles, towels, and door hinges…',
      checklist: ['Confirm inside cabinet dimensions and the door opening.', 'Measure pipes, valves, hinges, and the items to store.', 'Keep plumbing and maintenance access clear.']
    },
    'Drawers & cabinets': {
      dimensionLabel: 'Usable interior dimensions',
      help: 'Measure the drawer or cabinet interior. Include hinges, runners, shelf positions, and clearance when opening.',
      placeholder: 'Drawer or cabinet, utensils or supplies to separate, tall items, shelf positions, and hinges…',
      checklist: ['Measure the usable drawer or cabinet interior.', 'Note hinges, runners, shelf positions, and opening clearance.', 'List the items to organize and their dimensions.']
    },
    'Custom toilet stools': {
      dimensionLabel: 'Available stool space',
      help: 'Note the space in front of and around the toilet base. Add the preferred stool height and fixture shape in your notes.',
      placeholder: 'Toilet base shape, available floor space, preferred stool height, and door or walking clearance…',
      checklist: ['Measure available floor space around the toilet base.', 'Record the toilet base shape and preferred stool height.', 'Note door movement and the clear space needed around the stool.']
    },
    'Around the toilet': {
      dimensionLabel: 'Available storage space',
      help: 'Measure the gap beside or around the toilet. Note tank access, valves, doors, and room to move and clean.',
      placeholder: 'Gap beside the toilet, paper rolls or bathroom essentials, tank access, valves, and door clearance…',
      checklist: ['Measure the available gap and storage height.', 'Note tank access, valves, doors, and room to clean.', 'List bathroom essentials and the space they need.']
    }
  };
  const generic = {dimensionLabel:'Available space', help:'Choose a solution for measuring tips that match your space.', placeholder:'What gets in the way? What would you like to organize?', checklist:[]};
  const measurementNames = ['width', 'depth', 'height'];
  const measurementOrigins = new Map();
  const drafts = new Map();
  let unit = 'in';
  let currentCategory = '';
  let currentBrief = null;
  let previouslyFocused = null;

  function validateBrief(value, allowUnassigned = false) {
    if (!value || !(Object.hasOwn(configurations, value.space) || (allowUnassigned && value.space === '')) || !['in','cm'].includes(value.unit)) return null;
    const result = {space:value.space, unit:value.unit, finish:['Warm oak','Soft white','Still exploring'].includes(value.finish) ? value.finish : 'Still exploring', notes:typeof value.notes === 'string' ? value.notes.slice(0,2000) : ''};
    for (const name of measurementNames) {
      const number = Number(value[name]);
      result[name] = value[name] !== '' && Number.isFinite(number) && number > 0 ? String(number) : '';
    }
    return result;
  }
  function readStorage() {
    const result = {latestSpace:'', briefs:{}, unassigned:null, legacyImported:false};
    try {
      const stored = JSON.parse(localStorage.getItem(storageKey));
      result.unassigned = validateBrief(stored?.unassigned, true);
      result.legacyImported = stored?.legacyImported === true;
      for (const space of Object.keys(configurations)) {
        const brief = validateBrief(stored?.briefs?.[space]);
        if (brief && brief.space === space) result.briefs[space] = brief;
      }
      if (result.briefs[stored?.latestSpace]) result.latestSpace = stored.latestSpace;
      const legacy = JSON.parse(localStorage.getItem(legacyKey));
      if (legacy && !result.legacyImported) {
        const aliases = {'Bathroom sink cabinet':'Under the sink','Kitchen sink cabinet':'Under the sink'};
        const brief = validateBrief({...legacy,space:aliases[legacy.space] || legacy.space});
        if (brief && !result.briefs[brief.space]) result.briefs[brief.space] = brief;
        if (!result.latestSpace && brief) result.latestSpace = brief.space;
        if (!brief && ['An awkward nook','Open shelving','Another space'].includes(legacy.space)) {
          result.unassigned = validateBrief({...legacy,space:'',notes:`Previously saved for: ${legacy.space}.\n${legacy.notes || ''}`},true);
        }
        result.legacyImported = true;
      }
    } catch { /* The form and downloads remain available without storage. */ }
    return result;
  }
  let saved = readStorage();
  function checkMeasurement(input) {
    input.setCustomValidity(input.value !== '' && !(Number(input.value) > 0) ? 'Enter a measurement greater than zero, or leave it blank.' : '');
  }
  measurementNames.forEach(name => {
    const input = form.elements[name];
    input.step = 'any'; input.min = '0'; input.removeAttribute('max');
    input.addEventListener('input', () => {measurementOrigins.set(name,{value:input.value,unit}); checkMeasurement(input);});
  });
  function setUnit(next, convert = false) {
    if (convert && unit !== next) {
      for (const name of measurementNames) {
        const input = form.elements[name];
        if (input.value && Number(input.value) > 0) {
          const origin = measurementOrigins.get(name) || {value:input.value,unit};
          measurementOrigins.set(name,origin);
          input.value = next === origin.unit ? origin.value : String(Number((Number(origin.value) * (next === 'cm' ? 2.54 : 1 / 2.54)).toPrecision(6)));
          checkMeasurement(input);
        }
      }
    }
    unit = next;
    $$('.input-unit').forEach(label => label.textContent = unit);
    $$('[data-unit]').forEach(button => {const active = button.dataset.unit === unit;button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));});
    measurementNames.forEach(name => form.elements[name].placeholder = 'Optional');
  }
  function captureBrief(space = currentCategory) {
    return {space, unit, width:form.elements.width.value, depth:form.elements.depth.value, height:form.elements.height.value, finish:form.elements.finish.value, notes:form.elements.notes.value.trim()};
  }
  function updatePrompts() {
    const config = configurations[currentCategory] || generic;
    $('#dimension-label').textContent = config.dimensionLabel;
    $('#measurement-help').textContent = config.help;
    form.elements.notes.placeholder = config.placeholder;
  }
  function switchCategory(next) {
    const previous = captureBrief();
    const hasUnassignedDetails = previous.notes || measurementNames.some(name => previous[name]) || previous.finish !== 'Still exploring';
    const unassigned = !currentCategory ? (hasUnassignedDetails ? previous : saved.unassigned) : null;
    if (currentCategory) drafts.set(currentCategory,captureBrief());
    currentCategory = Object.hasOwn(configurations,next) ? next : '';
    const brief = drafts.get(currentCategory) || saved.briefs[currentCategory] || unassigned || {space:currentCategory, unit, width:'',depth:'',height:'',finish:'Still exploring',notes:''};
    if (currentCategory && brief === unassigned) saved.unassigned = null;
    form.elements.space.value = currentCategory;
    for (const name of ['width','depth','height','finish','notes']) form.elements[name].value = brief[name];
    measurementOrigins.clear(); measurementNames.forEach(name => checkMeasurement(form.elements[name]));
    setUnit(brief.unit);updatePrompts();
  }
  form.elements.space.addEventListener('change', () => switchCategory(form.elements.space.value));
  function showInput() {$('#planner-input').hidden=false;$('#planner-result').hidden=true;}
  function openDialog(dialog,returnTarget=document.activeElement) {previouslyFocused=returnTarget;dialog.showModal();document.body.classList.add('modal-open');}
  const menuButton = $('.menu-toggle');
  const menu = $('#mobile-nav');
  function closeMenu(){menu.hidden=true;menuButton.setAttribute('aria-expanded','false');menuButton.setAttribute('aria-label','Open navigation');}
  menuButton.addEventListener('click',()=>{const open=menu.hidden;menu.hidden=!open;menuButton.setAttribute('aria-expanded',String(open));menuButton.setAttribute('aria-label',`${open?'Close':'Open'} navigation`);});
  $$('a',menu).forEach(link=>link.addEventListener('click',closeMenu));
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!menu.hidden){closeMenu();menuButton.focus();}});
  $$('[data-planner]').forEach(button=>button.addEventListener('click',()=>{
    closeMenu();showInput();switchCategory(button.dataset.space || currentCategory || (saved.unassigned ? '' : saved.latestSpace) || '');
    openDialog(planner,menu.contains(button)?menuButton:button);
  }));
  $$('dialog').forEach(dialog=>{
    $('.dialog-close',dialog).addEventListener('click',()=>dialog.close());
    dialog.addEventListener('click',event=>{if(event.target!==dialog)return;const rect=dialog.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)dialog.close();});
    dialog.addEventListener('close',()=>{document.body.classList.remove('modal-open');if(previouslyFocused?.isConnected)previouslyFocused.focus();});
  });
  $$('[data-unit]').forEach(button=>button.addEventListener('click',()=>setUnit(button.dataset.unit,true)));
  function dimensions(brief){return measurementNames.map(name=>`${name[0].toUpperCase()+name.slice(1)}: ${brief[name]?brief[name]+' '+brief.unit:'To measure'}`).join(' · ');}
  form.addEventListener('submit',event=>{
    event.preventDefault();measurementNames.forEach(name=>checkMeasurement(form.elements[name]));
    if(!form.reportValidity()||!currentCategory)return;
    currentBrief=captureBrief();drafts.set(currentCategory,currentBrief);
    saved={...saved,latestSpace:currentCategory,briefs:{...saved.briefs,[currentCategory]:currentBrief}};
    let stored=false;try{localStorage.setItem(storageKey,JSON.stringify(saved));stored=true;}catch{/* Download remains available. */}
    const config=configurations[currentCategory];
    const list=document.createElement('dl');
    for(const [label,value] of [['The solution',currentBrief.space],[config.dimensionLabel,dimensions(currentBrief)],['Style inspiration',currentBrief.finish],['Things to consider',currentBrief.notes||config.help]]){
      const term=document.createElement('dt');term.textContent=label;const detail=document.createElement('dd');detail.textContent=value;list.append(term,detail);
    }
    $('#brief-summary').replaceChildren(list);
    $('#save-status').textContent=stored?'Saved for this solution in this browser. Download a copy to keep.':'Browser storage is unavailable. Download your details to keep a copy.';
    $('#planner-input').hidden=true;$('#planner-result').hidden=false;planner.scrollTop=0;$('#result-title').focus();
  });
  $('#edit-brief').addEventListener('click',()=>{showInput();planner.scrollTop=0;form.elements.space.focus();});
  $('#download-brief').addEventListener('click',()=>{
    if(!currentBrief)return;
    const brief=currentBrief;const config=configurations[brief.space];
    const text=`SPACEMAX — MY SPACE DETAILS\nCustom-fit organization for the home I have.\n\nSOLUTION\n${brief.space}\n\n${config.dimensionLabel.toUpperCase()}\n${dimensions(brief)}\n\nSTYLE INSPIRATION\n${brief.finish}\n\nTHINGS TO CONSIDER\n${brief.notes||'To add'}\n\nBEFORE A FINAL DESIGN\n${config.checklist.map(item=>'• '+item).join('\n')}\n• Mark approximate measurements and confirm them before a final design.\n• Take photos of the space for a later design discussion.\n\nThese are measurements and notes, not a final design, quote, or order. Materials, pricing, installation requirements, and fit need review. Nothing has been submitted to SpaceMax.\n`;
    const url=URL.createObjectURL(new Blob([text],{type:'text/plain;charset=utf-8'}));const link=document.createElement('a');link.href=url;link.download=`spacemax-${brief.space.toLowerCase().replace(/[^a-z0-9]+/g,'-')}-details.txt`;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
  });
  $('#privacy-button').addEventListener('click',()=>{$('#clear-status').textContent='';openDialog(privacy);});
  $('#clear-brief').addEventListener('click',()=>{
    try{localStorage.removeItem(storageKey);localStorage.removeItem(legacyKey);$('#clear-status').textContent='All your saved space details have been removed from this browser.';}catch{$('#clear-status').textContent='Browser storage could not be accessed. You can also clear saved data in your browser settings.';}
    saved={latestSpace:'',briefs:{}};drafts.clear();currentBrief=null;currentCategory='';form.reset();measurementOrigins.clear();measurementNames.forEach(name=>checkMeasurement(form.elements[name]));setUnit('in');updatePrompts();$('#brief-summary').replaceChildren();showInput();
  });
  const comparisonStates={
    before:{src:'assets/under-sink-before.jpg',alt:'Illustrative cabinet without fitted shelves: pipes occupy the middle, essentials cluster on the floor, and the upper space is unused',title:'Space above. Clutter below.',detail:'One cabinet floor has to hold everything.'},
    after:{src:'assets/under-sink-concept.jpg',alt:'The same cabinet illustrated with custom-fit shelves around the plumbing and essentials on separate levels',title:'Same cabinet. A more useful layout.',detail:'Shelves create places for essentials around the pipes.'}
  };
  $$('[data-compare]').forEach(button=>button.addEventListener('click',()=>{const state=comparisonStates[button.dataset.compare];const image=$('#comparison-image');image.src=state.src;image.alt=state.alt;$('#comparison-caption strong').textContent=state.title;$('#comparison-caption span').textContent=state.detail;$$('[data-compare]').forEach(option=>{const selected=option===button;option.classList.toggle('active',selected);option.setAttribute('aria-pressed',String(selected));});}));
  // Keep links from the earlier single-product preview useful.
  if(location.hash==='#product')location.replace('#solutions');
  $('#year').textContent=new Date().getFullYear();form.elements.finish.value='Still exploring';setUnit('in');updatePrompts();
})();
