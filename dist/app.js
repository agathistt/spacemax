(() => {
  'use strict';
  const $ = (query, root = document) => root.querySelector(query);
  const $$ = (query, root = document) => [...root.querySelectorAll(query)];
  const planner = $('#planner');
  const privacy = $('#privacy-dialog');
  const form = $('#space-form');
  const storageKey = 'spacemax-space-brief-v1';
  let unit = 'in';
  let currentBrief = null;
  let previouslyFocused = null;
  const measurementOrigins = new Map();
  const measurementNames = ['width', 'depth', 'height'];
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
      checkMeasurement(input);
    });
  });

  function readSaved() {
    try {
      const value = JSON.parse(localStorage.getItem(storageKey));
      if (!value || !['in', 'cm'].includes(value.unit)) return null;
      const spaces = [...form.elements.space.options].map(option => option.value);
      if (!spaces.includes(value.space) || !['Warm oak', 'Soft white', 'Still exploring'].includes(value.finish)) return null;
      const result = {space:value.space, unit:value.unit, finish:value.finish, notes:typeof value.notes === 'string' ? value.notes.slice(0, 2000) : ''};
      for (const name of ['width', 'depth', 'height']) {
        const number = Number(value[name]);
        result[name] = value[name] !== '' && Number.isFinite(number) && number > 0 ? String(number) : '';
      }
      return result;
    } catch { return null; }
  }

  function setUnit(next, convert = false) {
    if (convert && unit !== next) {
      for (const name of ['width', 'depth', 'height']) {
        const input = form.elements[name];
        if (input.value && Number(input.value) > 0) {
          const origin = measurementOrigins.get(name) || {value: input.value, unit};
          measurementOrigins.set(name, origin);
          input.value = next === origin.unit ? origin.value : String(Number((Number(origin.value) * (next === 'cm' ? 2.54 : 1 / 2.54)).toPrecision(6)));
          checkMeasurement(input);
        }
      }
    }
    unit = next;
    $$('.input-unit').forEach(label => label.textContent = unit);
    $$('[data-unit]').forEach(button => {
      const active = button.dataset.unit === unit;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    ['width', 'depth', 'height'].forEach((name, index) => form.elements[name].placeholder = `e.g. ${unit === 'in' ? [30, 20, 24][index] : [76, 51, 61][index]}`);
  }

  function populate(brief) {
    if (!brief) return;
    measurementOrigins.clear();
    ['space', 'width', 'depth', 'height', 'notes', 'finish'].forEach(name => { form.elements[name].value = brief[name] || ''; });
    measurementNames.forEach(name => checkMeasurement(form.elements[name]));
    setUnit(brief.unit);
  }

  function openDialog(dialog, returnTarget = document.activeElement) {
    previouslyFocused = returnTarget;
    dialog.showModal();
    document.body.classList.add('modal-open');
  }

  function showInput() {
    $('#planner-input').hidden = false;
    $('#planner-result').hidden = true;
  }

  const menuButton = $('.menu-toggle');
  const menu = $('#mobile-nav');
  function closeMenu() { menu.hidden = true; menuButton.setAttribute('aria-expanded', 'false'); menuButton.setAttribute('aria-label', 'Open navigation'); }
  menuButton.addEventListener('click', () => {
    const open = menu.hidden;
    menu.hidden = !open;
    menuButton.setAttribute('aria-expanded', String(open));
    menuButton.setAttribute('aria-label', `${open ? 'Close' : 'Open'} navigation`);
  });
  $$('a', menu).forEach(link => link.addEventListener('click', closeMenu));
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && !menu.hidden) { closeMenu(); menuButton.focus(); } });

  $$('[data-planner]').forEach(button => button.addEventListener('click', () => {
    closeMenu();
    if (!currentBrief) populate(readSaved());
    showInput();
    if (button.dataset.space) form.elements.space.value = button.dataset.space;
    openDialog(planner, menu.contains(button) ? menuButton : button);
  }));
  $$('dialog').forEach(dialog => {
    $('.dialog-close', dialog).addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', event => {
      if (event.target !== dialog) return;
      const rect = dialog.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
    });
    dialog.addEventListener('close', () => {
      document.body.classList.remove('modal-open');
      if (previouslyFocused?.isConnected) previouslyFocused.focus();
    });
  });
  $$('[data-unit]').forEach(button => button.addEventListener('click', () => setUnit(button.dataset.unit, true)));

  function dimensions(brief) {
    return ['width', 'depth', 'height'].map(name => `${name[0].toUpperCase() + name.slice(1)}: ${brief[name] ? brief[name] + ' ' + brief.unit : 'To measure'}`).join(' · ');
  }
  form.addEventListener('submit', event => {
    event.preventDefault();
    measurementNames.forEach(name => checkMeasurement(form.elements[name]));
    if (!form.reportValidity()) return;
    const data = new FormData(form);
    currentBrief = {space:data.get('space'), width:data.get('width'), depth:data.get('depth'), height:data.get('height'), finish:data.get('finish'), notes:data.get('notes').trim(), unit};
    let stored = false;
    try { localStorage.setItem(storageKey, JSON.stringify(currentBrief)); stored = true; } catch { /* Downloads still work without browser storage. */ }
    const list = document.createElement('dl');
    for (const [label, value] of [['The space', currentBrief.space], ['Inside dimensions', dimensions(currentBrief)], ['Style inspiration', currentBrief.finish], ['Things to consider', currentBrief.notes || 'Details to add: plumbing, hinges, access, and what you want to store.']]) {
      const term = document.createElement('dt'); term.textContent = label;
      const description = document.createElement('dd'); description.textContent = value;
      list.append(term, description);
    }
    $('#brief-summary').replaceChildren(list);
    $('#save-status').textContent = stored ? 'Saved in this browser. Download a copy to keep.' : 'Browser storage is unavailable. Download your brief to keep a copy.';
    $('#planner-input').hidden = true;
    $('#planner-result').hidden = false;
    planner.scrollTop = 0;
    $('#result-title').focus();
  });
  $('#edit-brief').addEventListener('click', () => { showInput(); planner.scrollTop = 0; form.elements.space.focus(); });
  $('#download-brief').addEventListener('click', () => {
    if (!currentBrief) return;
    const brief = currentBrief;
    const text = `SPACEMAX — MY SPACE BRIEF\nMore room. Less on your mind.\n\nSPACE\n${brief.space}\n\nINSIDE DIMENSIONS\n${dimensions(brief)}\n\nSTYLE INSPIRATION\n${brief.finish}\n\nTHINGS TO CONSIDER\n${brief.notes || 'To add'}\n\nBEFORE A FINAL DESIGN\n• Confirm all measurements and note whether these are approximate.\n• Measure pipes, shutoff valves, door hinges, and other obstacles.\n• Keep plumbing and maintenance access clear.\n• List what you want to store, including the tallest items.\n• Photograph the space before discussing a design.\n\nThis is a planning brief, not a final design, quote, or order. Materials, pricing, installation requirements, and fit need review. Nothing has been submitted to SpaceMax.\n`;
    const url = URL.createObjectURL(new Blob([text], {type:'text/plain;charset=utf-8'}));
    const link = document.createElement('a'); link.href = url; link.download = 'spacemax-my-space-brief.txt'; document.body.append(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  $('#privacy-button').addEventListener('click', () => { $('#clear-status').textContent = ''; openDialog(privacy); });
  $('#clear-brief').addEventListener('click', () => {
    try { localStorage.removeItem(storageKey); $('#clear-status').textContent = 'Your saved brief has been removed from this browser.'; }
    catch { $('#clear-status').textContent = 'Browser storage could not be accessed. You can also clear saved data in your browser settings.'; }
    currentBrief = null; form.reset(); measurementOrigins.clear(); measurementNames.forEach(name => checkMeasurement(form.elements[name])); setUnit('in'); $('#brief-summary').replaceChildren(); showInput();
  });
  $('#year').textContent = new Date().getFullYear();
})();
