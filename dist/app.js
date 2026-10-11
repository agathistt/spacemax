(() => {
  'use strict';
  const $ = (query, root = document) => root.querySelector(query);
  const $$ = (query, root = document) => [...root.querySelectorAll(query)];
  const planner = $('#planner');
  const privacy = $('#privacy-dialog');
  const form = $('#space-form');
  const storageKey = 'spacemax-space-details-v3';
  const previousStorageKey = 'spacemax-space-details-v2';
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
  const generic = {
    dimensionLabel: 'Available space',
    help: 'Choose a solution for measuring tips that match your space.',
    placeholder: 'What gets in the way? What would you like to organize?',
    checklist: []
  };
  const audiences = {
    Residential: {
      rooms: {
        Bathroom: ['sink', 'drawers', 'toilet'],
        Kitchen: ['sink', 'drawers'],
        'Living room': ['cable', 'drawers'],
        Bedroom: ['cable', 'drawers']
      },
      allLabel: 'All rooms',
      eyebrow: 'For the home you have',
      title: 'Make room for everyday life.',
      description: 'Explore custom-fit organization for bathrooms, kitchens, living rooms, and bedrooms.'
    },
    Commercial: {
      rooms: {
        'Offices & workstations': ['cable', 'drawers'],
        'Staff kitchens': ['sink', 'drawers'],
        Restrooms: ['sink', 'drawers', 'toilet'],
        'Guest rooms': ['cable', 'drawers']
      },
      allLabel: 'All areas',
      eyebrow: 'For the spaces where people work and stay',
      title: 'Make shared spaces work better.',
      description: 'Explore organization for workstations, staff kitchens, restrooms, and guest rooms—planned around the space and the people using it.'
    }
  };
  const measurementNames = ['width', 'depth', 'height'];
  const measurementOrigins = new Map();
  const draftOrigins = new Map();
  const drafts = new Map();
  const browse = {audience: 'Residential', room: ''};
  let currentProject = {audience: 'Residential', room: '', space: ''};
  let plannerInitialized = false;
  let currentBrief = null;
  let photoEstimate = null;
  let unit = 'in';
  let previouslyFocused = null;

  // A room may be unspecified, but it always belongs to one audience.
  function validAudience(value) {
    return Object.hasOwn(audiences, value);
  }
  function validRoom(audience, room) {
    return room === '' || Object.hasOwn(audiences[audience].rooms, room);
  }
  function validSolution(audience, space) {
    return Object.hasOwn(configurations, space) && !(audience === 'Commercial' && space === 'Custom toilet stools');
  }
  function projectKey(project) {
    return JSON.stringify([project.audience, project.room]);
  }
  function briefKey(brief) {
    return JSON.stringify([brief.audience, brief.room, brief.space]);
  }
  function emptySaved() {
    return {version: 3, briefs: {}, latestByProject: {}, v2Imported: false, legacyImported: false};
  }
  function emptyBrief(project) {
    return {...project, unit, width: '', depth: '', height: '', finish: 'Still exploring', notes: ''};
  }
  function hasDetails(brief) {
    return brief && (brief.notes || measurementNames.some(name => brief[name]) || brief.finish !== 'Still exploring');
  }
  function validateBrief(value, allowUnassigned = false) {
    if (!value || !validAudience(value.audience) || !validRoom(value.audience, value.room)) return null;
    if (!(validSolution(value.audience, value.space) || (allowUnassigned && value.space === '')) || !['in', 'cm'].includes(value.unit)) return null;
    const result = {
      audience: value.audience,
      room: value.room,
      space: value.space,
      unit: value.unit,
      finish: ['Warm oak', 'Soft white', 'Still exploring'].includes(value.finish) ? value.finish : 'Still exploring',
      notes: typeof value.notes === 'string' ? value.notes.slice(0, 2000) : ''
    };
    for (const name of measurementNames) {
      const number = Number(value[name]);
      result[name] = value[name] !== '' && Number.isFinite(number) && number > 0 ? String(number) : '';
    }
    const source = value.photoEstimate;
    if (source && ['in', 'cm'].includes(source.referenceUnit) && Number.isFinite(Number(source.referenceLength)) && Number(source.referenceLength) > 0) {
      const width = source.width === true && result.width !== '';
      const height = source.height === true && result.height !== '';
      if (width || height) result.photoEstimate = {width, height, referenceLength: Number(source.referenceLength), referenceUnit: source.referenceUnit};
    }
    return result;
  }
  function readJSON(key) {
    try { return JSON.parse(localStorage.getItem(key)); }
    catch { return null; }
  }
  function readStorage() {
    const result = emptySaved();
    const stored = readJSON(storageKey);
    for (const value of Object.values(stored?.briefs || {})) {
      const brief = validateBrief(value, true);
      if (brief) result.briefs[briefKey(brief)] = brief;
    }
    for (const [key, space] of Object.entries(stored?.latestByProject || {})) {
      const match = Object.values(result.briefs).find(brief => projectKey(brief) === key && brief.space === space);
      if (match) result.latestByProject[key] = space;
    }
    result.v2Imported = stored?.v2Imported === true;
    result.legacyImported = stored?.legacyImported === true;

    const residential = {audience: 'Residential', room: ''};
    function importBrief(value, allowUnassigned = false) {
      const brief = validateBrief({...value, ...residential}, allowUnassigned);
      if (brief && !result.briefs[briefKey(brief)]) result.briefs[briefKey(brief)] = brief;
      return brief;
    }
    if (!result.v2Imported) {
      const previous = readJSON(previousStorageKey);
      for (const value of Object.values(previous?.briefs || {})) importBrief(value);
      if (previous?.unassigned) importBrief(previous.unassigned, true);
      const latest = { ...residential, space: previous?.latestSpace };
      if (result.briefs[briefKey(latest)] && !result.latestByProject[projectKey(latest)]) {
        result.latestByProject[projectKey(latest)] = latest.space;
      }
      result.legacyImported ||= previous?.legacyImported === true;
      result.v2Imported = true;
    }
    if (!result.legacyImported) {
      const legacy = readJSON(legacyKey);
      if (legacy) {
        const aliases = {'Bathroom sink cabinet': 'Under the sink', 'Kitchen sink cabinet': 'Under the sink'};
        const space = aliases[legacy.space] || legacy.space;
        const brief = importBrief({...legacy, space});
        if (brief && !result.latestByProject[projectKey(brief)]) result.latestByProject[projectKey(brief)] = brief.space;
        if (!brief && ['An awkward nook', 'Open shelving', 'Another space'].includes(legacy.space)) {
          importBrief({...legacy, space: '', notes: `Previously saved for: ${legacy.space}.\n${legacy.notes || ''}`}, true);
        }
      }
      result.legacyImported = true;
    }
    return result;
  }
  let saved = readStorage();

  function renderBrowse() {
    const config = audiences[browse.audience];
    const products = browse.room ? config.rooms[browse.room] : ['cable', 'sink', 'drawers', 'toilet'];
    $$('[data-audience]').forEach(button => {
      const selected = button.dataset.audience === browse.audience;
      button.classList.toggle('active', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
    $$('[data-room]', $('#room-filters')).forEach(button => {
      const selected = button.dataset.room === browse.room;
      button.classList.toggle('active', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
    $$('.range-product').forEach(product => { product.hidden = !products.includes(product.dataset.product); });
    $$('[data-residential-only]').forEach(element => { element.hidden = browse.audience !== 'Residential'; });
    $$('[data-commercial-only]').forEach(element => { element.hidden = browse.audience !== 'Commercial'; });
    $('#browse-eyebrow').textContent = config.eyebrow;
    $('#browse-title').textContent = config.title;
    $('#browse-description').textContent = config.description;
    $('#browse-results-title').textContent = browse.room ? (browse.audience === 'Residential' ? `${browse.room} solutions` : `Solutions for ${browse.room.toLowerCase()}`) : `All ${browse.audience.toLowerCase()} solutions`;
    $('#browse-count').textContent = `${products.length} solution groups · ${browse.room || config.allLabel}`;
    $('#show-all-solutions').hidden = !browse.room;
  }
  function buildRoomFilters() {
    const group = $('#room-filters');
    const config = audiences[browse.audience];
    const buttons = ['', ...Object.keys(config.rooms)].map(room => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'room-filter';
      button.dataset.room = room;
      button.textContent = room || config.allLabel;
      button.addEventListener('click', () => { browse.room = room; renderBrowse(); });
      return button;
    });
    group.replaceChildren(...buttons);
    group.setAttribute('aria-label', browse.audience === 'Residential' ? 'Filter by room' : 'Filter by commercial area');
  }
  function chooseAudience(audience) {
    if (!validAudience(audience)) return;
    if (audience !== browse.audience) {
      browse.audience = audience;
      browse.room = '';
      buildRoomFilters();
    }
    renderBrowse();
  }
  $$('[data-audience]').forEach(button => button.addEventListener('click', () => chooseAudience(button.dataset.audience)));
  $$('[data-audience-link]').forEach(link => link.addEventListener('click', () => chooseAudience(link.dataset.audienceLink)));
  $$('[data-product-link]').forEach(link => link.addEventListener('click', () => {
    const visible = !browse.room || audiences[browse.audience].rooms[browse.room].includes(link.dataset.productLink);
    if (!visible) { browse.room = ''; renderBrowse(); }
  }));
  $('#show-all-solutions').addEventListener('click', () => {
    browse.room = '';
    renderBrowse();
    $('#room-filters button').focus();
  });

  function checkMeasurement(input) {
    input.setCustomValidity(input.value !== '' && !(Number(input.value) > 0) ? 'Enter a measurement greater than zero, or leave it blank.' : '');
  }
  measurementNames.forEach(name => {
    const input = form.elements[name];
    input.step = 'any';
    input.min = '0';
    input.removeAttribute('max');
    input.addEventListener('input', () => {
      measurementOrigins.set(name, {value: input.value, unit});
      if (photoEstimate && ['width', 'height'].includes(name)) {
        photoEstimate = {...photoEstimate, [name]: false};
        if (!photoEstimate.width && !photoEstimate.height) photoEstimate = null;
        renderPhotoEstimate();
      }
      checkMeasurement(input);
    });
  });
  function setUnit(next, convert = false) {
    if (convert && unit !== next) {
      for (const name of measurementNames) {
        const input = form.elements[name];
        if (input.value && Number(input.value) > 0) {
          const origin = measurementOrigins.get(name) || {value: input.value, unit};
          measurementOrigins.set(name, origin);
          const converted = Number(origin.value) * (next === 'cm' ? 2.54 : 1 / 2.54);
          input.value = next === origin.unit ? origin.value : String(Number(converted.toPrecision(12)));
          checkMeasurement(input);
        }
      }
    }
    unit = next;
    $$('.input-unit').forEach(label => { label.textContent = unit; });
    $$('[data-unit]').forEach(button => {
      const active = button.dataset.unit === unit;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    measurementNames.forEach(name => { form.elements[name].placeholder = 'Optional'; });
  }
  function captureBrief() {
    return {
      ...currentProject,
      unit,
      width: form.elements.width.value,
      depth: form.elements.depth.value,
      height: form.elements.height.value,
      finish: form.elements.finish.value,
      notes: form.elements.notes.value.trim(),
      ...(photoEstimate ? {photoEstimate: {...photoEstimate}} : {})
    };
  }
  function updatePrompts() {
    const config = configurations[currentProject.space] || generic;
    $('#dimension-label').textContent = config.dimensionLabel;
    $('#measurement-help').textContent = config.help;
    form.elements.notes.placeholder = config.placeholder;
  }
  function updateProjectFields() {
    const {audience, room} = currentProject;
    form.elements.audience.value = audience;
    const options = ['', ...Object.keys(audiences[audience].rooms)].map(value => {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = value || (audience === 'Residential' ? 'Room not specified' : 'Area not specified');
      return option;
    });
    form.elements.room.replaceChildren(...options);
    form.elements.room.value = room;
    $('#project-room-label').textContent = audience === 'Residential' ? 'Which room? (optional)' : 'Which area? (optional)';
    for (const option of form.elements.space.options) {
      if (option.value === 'Custom toilet stools') option.disabled = audience === 'Commercial';
    }
    form.elements.space.value = currentProject.space;
  }
  function switchProject(next) {
    const previous = plannerInitialized ? captureBrief() : null;
    if (previous) {
      drafts.set(briefKey(previous), previous);
      draftOrigins.set(briefKey(previous), new Map(measurementOrigins));
    }
    const audience = validAudience(next.audience) ? next.audience : 'Residential';
    const room = validRoom(audience, next.room) ? next.room : '';
    const space = validSolution(audience, next.space) ? next.space : '';
    const project = {audience, room, space};
    const key = briefKey(project);
    const unassignedKey = briefKey({...project, space: ''});
    // First assigning a product keeps notes entered in the unassigned form.
    const unassigned = drafts.get(unassignedKey) || saved.briefs[unassignedKey];
    const matching = drafts.get(key) || saved.briefs[key];
    const carried = space && !matching && hasDetails(unassigned) ? unassigned : null;
    const brief = matching || carried || emptyBrief(project);
    currentProject = project;
    currentBrief = null;
    photoEstimate = brief.photoEstimate ? {...brief.photoEstimate} : null;
    renderPhotoEstimate();
    updateProjectFields();
    for (const name of ['width', 'depth', 'height', 'finish', 'notes']) form.elements[name].value = brief[name];
    measurementOrigins.clear();
    const origins = draftOrigins.get(carried ? unassignedKey : key);
    if (origins) origins.forEach((value, name) => measurementOrigins.set(name, value));
    if (carried) {
      drafts.delete(unassignedKey);
      draftOrigins.delete(unassignedKey);
      delete saved.briefs[unassignedKey];
    }
    measurementNames.forEach(name => checkMeasurement(form.elements[name]));
    setUnit(brief.unit);
    updatePrompts();
    plannerInitialized = true;
  }
  function photoSourceText(source) {
    if (!source) return 'Entered manually';
    const names = [source.width && 'Width', source.height && 'Height'].filter(Boolean).join(' and ');
    return `${names} estimated from a photo using a ${source.referenceLength} ${source.referenceUnit} reference. Verify with a tape measure; depth is entered manually.`;
  }
  function renderPhotoEstimate() {
    const note = $('#photo-estimate-note');
    note.hidden = !photoEstimate;
    note.textContent = photoEstimate ? photoSourceText(photoEstimate) : '';
  }
  $('#photo-measure-button').addEventListener('click', () => {
    window.SpaceMaxPhotoMeasure.open({
      unit,
      hasMeasurements: Boolean(form.elements.width.value || form.elements.height.value),
      onApply(estimate) {
        // Unit changes preserve the physical depth already entered by the visitor.
        setUnit(estimate.unit, true);
        for (const name of ['width', 'height']) {
          form.elements[name].value = String(estimate[name]);
          measurementOrigins.set(name, {value: String(estimate[name]), unit});
          checkMeasurement(form.elements[name]);
        }
        photoEstimate = {width: true, height: true, referenceLength: estimate.referenceLength, referenceUnit: estimate.unit};
        renderPhotoEstimate();
      }
    });
  });
  form.elements.space.addEventListener('change', () => switchProject({...currentProject, space: form.elements.space.value}));
  form.elements.audience.addEventListener('change', () => {
    const audience = form.elements.audience.value;
    switchProject({...currentProject, audience, room: ''});
  });
  form.elements.room.addEventListener('change', () => switchProject({...currentProject, room: form.elements.room.value}));
  function showInput() {
    $('#planner-input').hidden = false;
    $('#planner-result').hidden = true;
  }
  function openDialog(dialog, returnTarget = document.activeElement) {
    previouslyFocused = returnTarget;
    dialog.showModal();
    document.body.classList.add('modal-open');
  }
  const menuButton = $('.menu-toggle');
  const menu = $('#mobile-nav');
  function closeMenu() {
    menu.hidden = true;
    menuButton.setAttribute('aria-expanded', 'false');
    menuButton.setAttribute('aria-label', 'Open navigation');
  }
  menuButton.addEventListener('click', () => {
    const open = menu.hidden;
    menu.hidden = !open;
    menuButton.setAttribute('aria-expanded', String(open));
    menuButton.setAttribute('aria-label', `${open ? 'Close' : 'Open'} navigation`);
  });
  $$('a', menu).forEach(link => link.addEventListener('click', closeMenu));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !menu.hidden) { closeMenu(); menuButton.focus(); }
  });
  $$('[data-planner]').forEach(button => button.addEventListener('click', () => {
    closeMenu();
    showInput();
    const unassignedKey = briefKey({...browse, space: ''});
    const unassigned = drafts.get(unassignedKey) || saved.briefs[unassignedKey];
    const sameProject = projectKey(currentProject) === projectKey(browse);
    const previousSpace = (sameProject && plannerInitialized && currentProject.space) || saved.latestByProject[projectKey(browse)];
    const space = button.dataset.space || (hasDetails(unassigned) ? '' : previousSpace) || '';
    switchProject({...browse, space});
    openDialog(planner, menu.contains(button) ? menuButton : button);
  }));
  $$('dialog:not(#photo-measure-dialog)').forEach(dialog => {
    $('.dialog-close', dialog).addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', event => {
      if (event.target !== dialog) return;
      const rect = dialog.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
    });
    dialog.addEventListener('close', () => {
      document.body.classList.toggle('modal-open', Boolean($('dialog[open]')));
      if (previouslyFocused?.isConnected) previouslyFocused.focus();
    });
  });
  $$('[data-unit]').forEach(button => button.addEventListener('click', () => setUnit(button.dataset.unit, true)));
  function dimensions(brief) {
    return measurementNames.map(name => `${name[0].toUpperCase() + name.slice(1)}: ${brief[name] ? brief[name] + ' ' + brief.unit : 'To measure'}`).join(' · ');
  }
  function roomDescription(brief) {
    return brief.room || (brief.audience === 'Residential' ? 'Room not specified' : 'Area not specified');
  }
  form.addEventListener('submit', event => {
    event.preventDefault();
    measurementNames.forEach(name => checkMeasurement(form.elements[name]));
    if (!form.reportValidity() || !validSolution(currentProject.audience, currentProject.space)) return;
    currentBrief = captureBrief();
    drafts.set(briefKey(currentBrief), currentBrief);
    saved.briefs[briefKey(currentBrief)] = currentBrief;
    saved.latestByProject[projectKey(currentBrief)] = currentBrief.space;
    let stored = false;
    try { localStorage.setItem(storageKey, JSON.stringify(saved)); stored = true; }
    catch { /* Download remains available. */ }
    const config = configurations[currentBrief.space];
    const list = document.createElement('dl');
    const entries = [
      ['Project', currentBrief.audience],
      [currentBrief.audience === 'Residential' ? 'Room' : 'Area', roomDescription(currentBrief)],
      ['The solution', currentBrief.space],
      [config.dimensionLabel, dimensions(currentBrief)],
      ['Measurement source', photoSourceText(currentBrief.photoEstimate)],
      ['Style inspiration', currentBrief.finish],
      ['Things to consider', currentBrief.notes || config.help]
    ];
    for (const [label, value] of entries) {
      const term = document.createElement('dt');
      term.textContent = label;
      const detail = document.createElement('dd');
      detail.textContent = value;
      list.append(term, detail);
    }
    $('#brief-summary').replaceChildren(list);
    $('#save-status').textContent = stored ? 'Saved for this project, room, and solution in this browser. Download a copy to keep.' : 'Browser storage is unavailable. Download your details to keep a copy.';
    $('#planner-input').hidden = true;
    $('#planner-result').hidden = false;
    planner.scrollTop = 0;
    $('#result-title').focus();
  });
  $('#edit-brief').addEventListener('click', () => {
    showInput();
    planner.scrollTop = 0;
    form.elements.audience.focus();
  });
  $('#download-brief').addEventListener('click', () => {
    if (!currentBrief) return;
    const brief = currentBrief;
    const config = configurations[brief.space];
    const text = `SPACEMAX — MY SPACE DETAILS\nCustom-fit organization for my space.\n\nPROJECT\n${brief.audience}\n\n${brief.audience === 'Residential' ? 'ROOM' : 'AREA'}\n${roomDescription(brief)}\n\nSOLUTION\n${brief.space}\n\n${config.dimensionLabel.toUpperCase()}\n${dimensions(brief)}\n\nMEASUREMENT SOURCE\n${photoSourceText(brief.photoEstimate)}\n\nSTYLE INSPIRATION\n${brief.finish}\n\nTHINGS TO CONSIDER\n${brief.notes || 'To add'}\n\nBEFORE A FINAL DESIGN\n${config.checklist.map(item => '• ' + item).join('\n')}\n• Mark approximate measurements and confirm them before a final design.\n• Take photos of the space for a later design discussion.\n\nThese are measurements and notes, not a final design, quote, or order. Materials, pricing, installation requirements, and fit need review. Nothing has been submitted to SpaceMax.\n`;
    const url = URL.createObjectURL(new Blob([text], {type: 'text/plain;charset=utf-8'}));
    const slug = [brief.audience, brief.room || 'unspecified', brief.space].join('-').toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const link = document.createElement('a');
    link.href = url;
    link.download = `spacemax-${slug}-details.txt`;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  $('#privacy-button').addEventListener('click', () => {
    $('#clear-status').textContent = '';
    openDialog(privacy);
  });
  $('#clear-brief').addEventListener('click', () => {
    try {
      [storageKey, previousStorageKey, legacyKey].forEach(key => localStorage.removeItem(key));
      $('#clear-status').textContent = 'All your saved space details have been removed from this browser.';
    } catch {
      $('#clear-status').textContent = 'Browser storage could not be accessed. You can also clear saved data in your browser settings.';
    }
    saved = emptySaved();
    drafts.clear();
    draftOrigins.clear();
    currentBrief = null;
    photoEstimate = null;
    renderPhotoEstimate();
    plannerInitialized = false;
    form.reset();
    measurementOrigins.clear();
    unit = 'in';
    switchProject({...browse, space: ''});
    $('#brief-summary').replaceChildren();
    showInput();
  });
  const walkthroughSteps = [
    {
      src: 'assets/bathroom-step-1-original.png',
      alt: 'Starting bathroom space with plumbing, supplies, and unused space for storage',
      width: 1254, height: 1254,
      title: 'Start with your space.',
      copy: 'Pipes, supplies, and unused space make it hard to keep everyday essentials in order.',
      tag: 'Starting space'
    },
    {
      src: 'assets/bathroom-step-2-measurements.png',
      alt: 'Measurement concept showing estimated width, height, and storage gaps; depth still needs measuring',
      width: 1536, height: 1024,
      title: 'Check the measurements.',
      copy: 'Check the width, height, and storage gaps. The dimensions shown here are estimates; depth still needs measuring.',
      tag: 'Measurement concept'
    },
    {
      src: 'assets/bathroom-step-3-configuration.png',
      alt: 'Configuration concept with fitted dividers, drawers, and a service cover around the plumbing',
      width: 1536, height: 1024,
      title: 'Preview the fit.',
      copy: 'Explore a layout that fits around the plumbing, with dividers, drawers, and a service cover.',
      tag: 'Configuration concept'
    },
    {
      src: 'assets/bathroom-step-4-cabinet-only.png',
      alt: 'Styled bathroom storage concept with fitted compartments and a coordinated cabinet interior',
      width: 1254, height: 1254,
      title: 'Put everything in its place.',
      copy: 'Give each essential a place with fitted compartments and a calm, coordinated cabinet interior.',
      tag: 'Styled outcome concept'
    }
  ];
  const walkthroughButtons = $$('[data-walkthrough-step]');
  const walkthroughImages = [$('#walkthrough-image'), $('#walkthrough-large-image')];
  let walkthroughIndex = 0;
  function showWalkthroughStep(index) {
    if (!Number.isInteger(index) || index < 0 || index >= walkthroughSteps.length) return;
    walkthroughIndex = index;
    const step = walkthroughSteps[index];
    walkthroughImages.forEach(image => {
      image.width = step.width;
      image.height = step.height;
      image.src = step.src;
      image.alt = step.alt;
    });
    $('#walkthrough-status').textContent = `Step ${index + 1} of ${walkthroughSteps.length}`;
    $('#walkthrough-title').textContent = step.title;
    $('#walkthrough-copy').textContent = step.copy;
    $('#walkthrough-tag').textContent = step.tag;
    $('#walkthrough-large-caption').textContent = `Step ${index + 1} · ${step.title} · ${step.tag}`;
    $('#walkthrough-prev').disabled = index === 0;
    $('#walkthrough-next').disabled = index === walkthroughSteps.length - 1;
    walkthroughButtons.forEach(button => {
      const selected = Number(button.dataset.walkthroughStep) === index;
      button.classList.toggle('active', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
  }
  walkthroughImages.forEach(image => image.addEventListener('load', () => {
    if (image.naturalWidth && image.naturalHeight) {
      image.width = image.naturalWidth;
      image.height = image.naturalHeight;
    }
  }));
  walkthroughButtons.forEach(button => button.addEventListener('click', () => showWalkthroughStep(Number(button.dataset.walkthroughStep))));
  $('#walkthrough-prev').addEventListener('click', () => showWalkthroughStep(walkthroughIndex - 1));
  $('#walkthrough-next').addEventListener('click', () => showWalkthroughStep(walkthroughIndex + 1));
  const enlargeWalkthrough = $('#walkthrough-enlarge');
  enlargeWalkthrough.addEventListener('click', () => openDialog($('#walkthrough-viewer'), enlargeWalkthrough));
  // Keep links from the earlier single-product preview useful.
  if (location.hash === '#product') location.replace('#solutions');
  $('#year').textContent = new Date().getFullYear();
  buildRoomFilters();
  renderBrowse();
  switchProject({...browse, space: ''});
  showWalkthroughStep(0);
  function openPlannerFromLink() {
    if (location.hash === '#planner' && !planner.open) {
      $('[data-planner]').click();
      history.replaceState(null, '', location.pathname + location.search);
    }
  }
  window.addEventListener('hashchange', openPlannerFromLink);
  openPlannerFromLink();
})();
