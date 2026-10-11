(() => {
  'use strict';
  const $ = (selector, parent = document) => parent.querySelector(selector);
  const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];
  const planner = $('#planner');
  const form = $('#planner-form');
  const key = 'spacemax-plan-v1';
  let currentStep = 1;
  let previousUnits = 'in';
  const dimensionSources = {};
  let draft = null;
  let toastTimer;
  const allowedSpaces = ['Under the sink', 'An awkward nook', 'Inside a cabinet'];
  const allowedFinishes = ['Warm white', 'Natural oak', 'Soft sage'];
  function validPlan(plan) {
    return plan && allowedSpaces.includes(plan.space) && allowedFinishes.includes(plan.finish) && ['in', 'cm'].includes(plan.units) && ['width','depth','height'].every(k => typeof plan[k] === 'number' && Number.isFinite(plan[k]) && plan[k] >= (plan.units === 'in' ? 0.1 : 0.254) && plan[k] <= (plan.units === 'in' ? 200 : 508)) && typeof plan.notes === 'string' && plan.notes.length <= 1000;
  }
  function readPlan() {
    try { const plan = JSON.parse(localStorage.getItem(key)); return validPlan(plan) ? plan : null; } catch { return null; }
  }
  function syncSavedState() {
    const hasPlan = !!readPlan();
    $('#saved-dot').hidden = !hasPlan;
    $('#delete-plan').hidden = !hasPlan;
  }
  function showToast(message) {
    $('#toast').textContent = message;
    $('#toast').hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { $('#toast').hidden = true; }, 4500);
  }
  function openDialog(dialog) { dialog.showModal(); document.body.classList.add('modal-open'); }
  $$('dialog').forEach(dialog => {
    $$('[data-close]',dialog).forEach(button => button.addEventListener('click', () => dialog.close()));
    dialog.addEventListener('close', () => document.body.classList.remove('modal-open'));
    dialog.addEventListener('click', event => {
      if (event.target !== dialog) return;
      const r = dialog.getBoundingClientRect();
      if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close();
    });
  });
  function setStep(step, focus = true) {
    currentStep = step;
    $$('[data-step]').forEach(el => { el.hidden = Number(el.dataset.step) !== step; });
    $$('[data-step-marker]').forEach(el => { const active = Number(el.dataset.stepMarker) === step; el.classList.toggle('active', active); if(active) el.setAttribute('aria-current','step'); else el.removeAttribute('aria-current'); });
    planner.scrollTop = 0;
    if (focus && planner.open) { const target = step === 3 ? $('#result-space') : $(`[data-step="${step}"] input, [data-step="${step}"] button`); target?.focus({preventScroll:true}); }
  }
  function openPlanner(space) {
    if (space && allowedSpaces.includes(space)) form.elements.space.value = space;
    setStep(1, false);
    openDialog(planner);
  }
  $$('[data-planner]').forEach(button => button.addEventListener('click', () => openPlanner(button.dataset.space)));
  $('#next-step').addEventListener('click', () => setStep(2));
  $$('[data-back]').forEach(button => button.addEventListener('click', () => setStep(Number(button.dataset.back))));
  function updateUnits(convert) {
    const units = form.elements.units.value;
    $$('[name="width"], [name="depth"], [name="height"]').forEach((input,index) => {
      if (convert && input.value && previousUnits !== units) {
        const source = dimensionSources[input.name] || {value:Number(input.value), units:previousUnits};
        dimensionSources[input.name] = source;
        input.value = String(Number((source.value * (source.units === units ? 1 : units === 'cm' ? 2.54 : 1 / 2.54)).toFixed(6)));
      } else if (!convert) dimensionSources[input.name] = {value:Number(input.value), units};
      input.min = units === 'in' ? '0.1' : '0.254';
      input.max = units === 'in' ? '200' : '508';
      input.placeholder = units === 'in' ? ['e.g. 30','e.g. 20','e.g. 24'][index] : ['e.g. 76','e.g. 51','e.g. 61'][index];
    });
    $$('.unit-text').forEach(el => { el.textContent = `(${units})`; });
    previousUnits = units;
  }
  $('#units').addEventListener('change', () => updateUnits(true));
  $$('[name="width"], [name="depth"], [name="height"]').forEach(input => input.addEventListener('input', () => {
    dimensionSources[input.name] = {value:Number(input.value), units:form.elements.units.value};
  }));
  function formPlan() {
    return {space:form.elements.space.value,units:form.elements.units.value,width:Number(form.elements.width.value),depth:Number(form.elements.depth.value),height:Number(form.elements.height.value),finish:form.elements.finish.value,notes:form.elements.notes.value.trim()};
  }
  function renderResult(plan) {
    draft = plan;
    $('#result-space').textContent = plan.space;
    $('#result-dimensions').textContent = `${plan.width} W × ${plan.depth} D × ${plan.height} H ${plan.units}`;
    $('#diagram-width').textContent = `${plan.width} ${plan.units}`;
    $('#result-finish').textContent = plan.finish;
    $('#result-notes').textContent = plan.notes;
    $('#result-notes-wrap').hidden = !plan.notes;
    $('#plan-pipe').style.display = plan.space === 'Under the sink' ? '' : 'none';
    $('.preview-shelf').style.fill = {'Warm white':'#f2ede4','Natural oak':'#c8ab82','Soft sage':'#a9b398'}[plan.finish];
    $('#save-status').textContent = '';
    $('#save-plan').disabled = false;
    $('#save-plan').innerHTML = 'Save my plan <span aria-hidden="true">↗</span>';
    syncSavedState();
    setStep(3);
  }
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (currentStep !== 2) return;
    if (!form.reportValidity()) return;
    const plan = formPlan();
    if (!validPlan(plan)) { showToast('Please check your measurements and try again.'); return; }
    renderResult(plan);
  });
  form.addEventListener('keydown', event => { if (event.key === 'Enter' && event.target.tagName !== 'TEXTAREA' && currentStep === 1) {event.preventDefault(); setStep(2);} });
  $('#save-plan').addEventListener('click', () => {
    if (!validPlan(draft)) return;
    try {
      localStorage.setItem(key, JSON.stringify(draft));
      $('#save-status').textContent = 'Saved on this device. Come back using the bookmark in the header.';
      $('#save-plan').innerHTML = 'Plan saved <span aria-hidden="true">✓</span>';
      $('#save-plan').disabled = true;
      syncSavedState();
    } catch { $('#save-status').textContent = 'Browser storage is unavailable. Download your brief to keep a copy.'; }
  });
  $('#saved-plan').addEventListener('click', () => {
    const plan = readPlan();
    if (!plan) { openPlanner(); showToast('No saved plan yet. Start with the space you want to rethink.'); return; }
    Object.entries(plan).forEach(([name,value]) => { if (form.elements[name]) form.elements[name].value = value; });
    updateUnits(false);
    openDialog(planner);
    renderResult(plan);
    $('#save-status').textContent = 'Your saved plan, ready to revisit.';
  });
  $('#delete-plan').addEventListener('click', () => {
    try { localStorage.removeItem(key); syncSavedState(); $('#save-status').textContent = 'Saved copy deleted from this browser. Your current draft is still open.'; $('#save-plan').disabled = false; $('#save-plan').innerHTML = 'Save my plan <span aria-hidden="true">↗</span>'; } catch { $('#save-status').textContent = 'Could not delete the saved copy. Clear this site’s data in your browser settings.'; }
  });
  $('#download-plan').addEventListener('click', () => {
    if (!validPlan(draft)) return;
    const p = draft;
    const content = `SPACEMAX — YOUR SPACE BRIEF\n\nSpace: ${p.space}\nInside width: ${p.width} ${p.units}\nInside depth: ${p.depth} ${p.units}\nInside height: ${p.height} ${p.units}\nFinish direction: ${p.finish}\n\nNOTES & OBSTACLES\n${p.notes || 'No notes added.'}\n\nBEFORE A FINAL DESIGN\nMeasure the clear interior and door opening. Note pipe, valve and hinge positions. Preserve access to plumbing and leave room to check for leaks. Confirm intended loads, materials, installation and final dimensions with the supplier.\n\nThis brief is a starting point, not a verified design, quote or order. Product details, materials, pricing and availability have not been confirmed. No information has been submitted to SpaceMax.\n`;
    const url = URL.createObjectURL(new Blob([content], {type:'text/plain;charset=utf-8'}));
    const link = document.createElement('a');link.href = url;link.download = 'spacemax-space-brief.txt';document.body.append(link);link.click();link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    $('#save-status').textContent = 'Your brief is ready to download.';
  });
  $('#menu-toggle').addEventListener('click', () => { const open = $('#mobile-nav').hidden; $('#mobile-nav').hidden = !open; $('#menu-toggle').setAttribute('aria-expanded', String(open)); $('#menu-toggle').setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation'); });
  $$('#mobile-nav a').forEach(link => link.addEventListener('click', () => { $('#mobile-nav').hidden = true; $('#menu-toggle').setAttribute('aria-expanded', 'false'); $('#menu-toggle').setAttribute('aria-label','Open navigation'); }));
  $('#privacy-open').addEventListener('click', () => openDialog($('#privacy')));
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && !$('#mobile-nav').hidden) { $('#mobile-nav').hidden = true; $('#menu-toggle').setAttribute('aria-expanded','false'); $('#menu-toggle').setAttribute('aria-label','Open navigation'); $('#menu-toggle').focus(); } });
  $('#year').textContent = new Date().getFullYear();
  syncSavedState();
})();
