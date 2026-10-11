(() => {
  'use strict';

  // Coordinates are image pixels. Both measurements must share one flat plane.
  function calculateEstimate({reference, target, referenceLength}) {
    const validPoint = point => point && Number.isFinite(point.x) && Number.isFinite(point.y);
    if (!Array.isArray(reference) || !Array.isArray(target) || reference.length !== 2 || target.length !== 2 || !reference.every(validPoint) || !target.every(validPoint)) {
      throw new Error('Mark both reference endpoints and both target corners.');
    }
    if (!Number.isFinite(referenceLength) || referenceLength <= 0) throw new Error('Enter a known reference length greater than zero.');
    const referencePixels = Math.hypot(reference[1].x - reference[0].x, reference[1].y - reference[0].y);
    if (referencePixels === 0) throw new Error('The reference endpoints must be in different positions.');
    if (referencePixels < 10) throw new Error('The reference is too short in this image. Use a longer visible reference and mark endpoints at least 10 image pixels apart.');
    const widthPixels = Math.abs(target[1].x - target[0].x);
    const heightPixels = Math.abs(target[1].y - target[0].y);
    if (!widthPixels || !heightPixels) throw new Error('Mark opposite target corners with some width and height between them.');
    const scale = referenceLength / referencePixels;
    const width = widthPixels * scale;
    const height = heightPixels * scale;
    if (![width, height].every(value => Number.isFinite(value) && value > 0)) throw new Error('These marks cannot produce a valid estimate. Check the reference length and points.');
    return {width, height, referenceLength};
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = {calculateEstimate};
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  const pointKeys = ['referenceStart', 'referenceEnd', 'targetStart', 'targetEnd'];
  const pointLabels = ['Reference start', 'Reference end', 'Target first corner', 'Target opposite corner'];
  let elements;
  let state;
  let loadToken = 0;
  let returnFocus;
  let originalOverflow = '';
  let referenceOrigin = null;
  const $ = id => document.getElementById(id);
  const clamp = number => Math.max(0, Math.min(1, number));
  const displayNumber = number => new Intl.NumberFormat(undefined, {maximumFractionDigits: 2}).format(number);
  const precise = number => Number(number.toPrecision(12));

  function freshState(unit = 'in', onApply = null) {
    return {unit, onApply, url: null, imageWidth: 0, imageHeight: 0, points: {}, selected: 'referenceStart', cursor: {x: 0.5, y: 0.5}, estimate: null};
  }
  function message(text) { elements.message.textContent = text; }
  function releasePhoto() {
    loadToken += 1;
    if (state?.url) URL.revokeObjectURL(state.url);
    if (state) { state.url = null; state.imageWidth = 0; state.imageHeight = 0; }
    elements.image.removeAttribute('src');
    elements.file.value = '';
    elements.camera.value = '';
  }
  function clearPoints() {
    state.points = {};
    state.selected = 'referenceStart';
    state.cursor = {x: 0.5, y: 0.5};
    renderMode();
    renderOverlay();
    renderEstimate();
  }
  function resetPhoto() {
    releasePhoto();
    elements.referenceLength.value = '';
    referenceOrigin = null;
    clearPoints();
    elements.workspace.hidden = true;
    elements.filename.textContent = '';
    message('Choose a JPEG, PNG, or WebP photo to begin.');
  }
  function selectPhoto(file) {
    if (!file) return;
    const unsupportedHEIC = /\.(heic|heif)$/i.test(file.name) || /hei[cf]/i.test(file.type);
    const allowedType = ['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || (!file.type && /\.(jpe?g|png|webp)$/i.test(file.name));
    if (unsupportedHEIC || !allowedType) {
      message(unsupportedHEIC ? 'HEIC/HEIF photos are not supported here. Export the photo as JPEG or PNG, then choose it again.' : 'Choose a JPEG, PNG, or WebP image. This file format is not supported.');
      return;
    }
    if (file.size > 15 * 1024 * 1024) { message('This photo is larger than 15 MB. Choose a smaller JPEG, PNG, or WebP copy.'); return; }
    resetPhoto();
    message('Opening your photo in this browser…');
    const token = ++loadToken;
    const url = URL.createObjectURL(file);
    state.url = url;
    const image = new Image();
    image.onload = () => {
      if (token !== loadToken || !elements.dialog.open) return;
      if (!image.naturalWidth || !image.naturalHeight) { resetPhoto(); message('This image could not be opened. Choose another photo.'); return; }
      state.imageWidth = image.naturalWidth;
      state.imageHeight = image.naturalHeight;
      elements.image.src = url;
      elements.filename.textContent = file.name;
      elements.workspace.hidden = false;
      elements.overlay.setAttribute('viewBox', `0 0 ${state.imageWidth} ${state.imageHeight}`);
      renderMode();
      renderOverlay();
      renderEstimate();
      message('Photo ready. Enter a length you know, then mark its two endpoints.');
      elements.referenceLength.focus();
    };
    image.onerror = () => {
      if (token !== loadToken) return;
      resetPhoto();
      message('This file could not be read as an image. Try exporting a new JPEG or PNG copy.');
    };
    image.src = url;
  }
  function pointInPixels(point) { return {x: point.x * state.imageWidth, y: point.y * state.imageHeight}; }
  function renderEstimate() {
    state.estimate = null;
    elements.apply.disabled = true;
    elements.width.textContent = '—';
    elements.height.textContent = '—';
    const referenceLength = Number(elements.referenceLength.value);
    if (!elements.referenceLength.value || !Number.isFinite(referenceLength) || referenceLength <= 0) {
      elements.resultMessage.textContent = 'Enter a known reference length greater than zero.';
      return;
    }
    const reference = [state.points.referenceStart, state.points.referenceEnd];
    if (reference.every(Boolean) && reference[0].x === reference[1].x && reference[0].y === reference[1].y) {
      elements.resultMessage.textContent = 'The reference endpoints overlap. Move one endpoint before estimating.';
      return;
    }
    if (!pointKeys.every(key => state.points[key])) {
      elements.resultMessage.textContent = 'Mark the two reference endpoints and the two opposite target corners to see an estimate.';
      return;
    }
    try {
      const estimate = calculateEstimate({reference: reference.map(pointInPixels), target: [state.points.targetStart, state.points.targetEnd].map(pointInPixels), referenceLength});
      const width = Number(estimate.width.toFixed(2));
      const height = Number(estimate.height.toFixed(2));
      if (!width || !height) throw new Error('The marked area is too small to produce a useful estimate in these units. Check the reference length and target corners.');
      state.estimate = {...estimate, width, height, unit: state.unit};
      elements.width.textContent = `${displayNumber(width)} ${state.unit}`;
      elements.height.textContent = `${displayNumber(height)} ${state.unit}`;
      elements.resultMessage.textContent = 'Review the marked rectangle and these estimates. Confirm both dimensions with a tape measure before a final design.';
      elements.apply.disabled = false;
    } catch (error) { elements.resultMessage.textContent = error.message; }
  }
  function svgElement(tag, attributes = {}) {
    const element = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, value);
    return element;
  }
  function renderOverlay() {
    elements.overlay.replaceChildren();
    if (!state.imageWidth) return;
    const scale = Math.max(state.imageWidth, state.imageHeight) / 800;
    const pixels = Object.fromEntries(Object.entries(state.points).map(([key, point]) => [key, pointInPixels(point)]));
    if (pixels.referenceStart && pixels.referenceEnd) {
      elements.overlay.append(svgElement('line', {x1: pixels.referenceStart.x, y1: pixels.referenceStart.y, x2: pixels.referenceEnd.x, y2: pixels.referenceEnd.y, stroke: '#ffbd45', 'stroke-width': 4 * scale}));
    }
    if (pixels.targetStart && pixels.targetEnd) {
      elements.overlay.append(svgElement('rect', {x: Math.min(pixels.targetStart.x, pixels.targetEnd.x), y: Math.min(pixels.targetStart.y, pixels.targetEnd.y), width: Math.abs(pixels.targetStart.x - pixels.targetEnd.x), height: Math.abs(pixels.targetStart.y - pixels.targetEnd.y), fill: '#a74b2d33', stroke: '#ffffff', 'stroke-width': 3 * scale, 'stroke-dasharray': `${8 * scale} ${5 * scale}`}));
    }
    for (const [index, key] of pointKeys.entries()) {
      if (!pixels[key]) continue;
      const point = pixels[key];
      const group = svgElement('g');
      group.append(svgElement('circle', {cx: point.x, cy: point.y, r: 12 * scale, fill: index < 2 ? '#ffbd45' : '#a74b2d', stroke: '#30362d', 'stroke-width': 2 * scale}));
      const label = svgElement('text', {x: point.x, y: point.y + 4 * scale, 'text-anchor': 'middle', fill: index < 2 ? '#30362d' : '#ffffff', 'font-size': 12 * scale, 'font-family': 'Arial, sans-serif', 'font-weight': 700});
      label.textContent = String(index + 1);
      group.append(label);
      elements.overlay.append(group);
    }
    const cursor = pointInPixels(state.cursor);
    elements.overlay.append(svgElement('path', {d: `M${cursor.x - 14 * scale},${cursor.y}h${28 * scale}M${cursor.x},${cursor.y - 14 * scale}v${28 * scale}`, stroke: '#ffffff', 'stroke-width': 3 * scale, fill: 'none'}));
    elements.overlay.append(svgElement('circle', {cx: cursor.x, cy: cursor.y, r: 5 * scale, fill: 'none', stroke: '#30362d', 'stroke-width': 2 * scale}));
  }
  function renderMode() {
    const index = pointKeys.indexOf(state.selected);
    elements.modes.forEach(input => { input.checked = input.value === state.selected; });
    elements.modeLabel.textContent = `Mark ${index + 1}: ${pointLabels[index].toLowerCase()}`;
    elements.surface.setAttribute('aria-label', `Place ${pointLabels[index].toLowerCase()} on the photo`);
    elements.x.value = String(precise(state.cursor.x * 100));
    elements.y.value = String(precise(state.cursor.y * 100));
  }
  function placePoint(point) {
    if (!state.imageWidth) return;
    const index = pointKeys.indexOf(state.selected);
    state.points[state.selected] = {x: clamp(point.x), y: clamp(point.y)};
    const next = Math.min(index + 1, pointKeys.length - 1);
    state.selected = pointKeys[next];
    state.cursor = state.points[state.selected] || {x: 0.5, y: 0.5};
    renderMode();
    renderOverlay();
    renderEstimate();
    message(`${pointLabels[index]} marked.${index < 3 ? ` Next: ${pointLabels[next].toLowerCase()}.` : ' Review the estimate, or select any point to adjust it.'}`);
  }
  function setCoordinatesFromInputs(place = false) {
    const x = Number(elements.x.value);
    const y = Number(elements.y.value);
    if (elements.x.value === '' || elements.y.value === '' || !Number.isFinite(x) || !Number.isFinite(y) || x < 0 || x > 100 || y < 0 || y > 100) {
      message('Point coordinates must be between 0 and 100 percent.');
      return;
    }
    state.cursor = {x: x / 100, y: y / 100};
    renderOverlay();
    if (place) placePoint(state.cursor);
  }
  function initialize() {
    if (elements) return;
    const dialog = $('photo-measure-dialog');
    if (!dialog) throw new Error('The photo measurement dialog is missing.');
    elements = {
      dialog, file: $('pm-file'), camera: $('pm-camera'), image: $('pm-image'), overlay: $('pm-overlay'), surface: $('pm-surface'),
      workspace: $('pm-workspace'), filename: $('pm-filename'), message: $('pm-message'), referenceLength: $('pm-reference-length'), unit: $('pm-unit'),
      modes: [...dialog.querySelectorAll('[name="pm-point"]')], modeLabel: $('pm-mode-label'), x: $('pm-x'), y: $('pm-y'),
      resultMessage: $('pm-result-message'), width: $('pm-width'), height: $('pm-height'), apply: $('pm-apply'), replacement: $('pm-replacement')
    };
    state = freshState();
    [elements.file, elements.camera].forEach(input => input.addEventListener('change', () => { const file = input.files[0]; input.value = ''; selectPhoto(file); }));
    dialog.querySelector('[data-pm-close]').addEventListener('click', () => dialog.close());
    $('pm-cancel').addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', event => {
      if (event.target !== dialog) return;
      const bounds = dialog.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
    });
    dialog.addEventListener('close', () => {
      releasePhoto();
      state = freshState();
      referenceOrigin = null;
      elements.referenceLength.value = '';
      elements.workspace.hidden = true;
      document.body.style.overflow = originalOverflow;
      if (returnFocus?.isConnected) returnFocus.focus();
    });
    $('pm-replace-photo').addEventListener('click', () => { resetPhoto(); elements.file.focus(); });
    $('pm-reset-marks').addEventListener('click', () => { clearPoints(); message('Marks cleared. Start again with the known reference.'); elements.surface.focus(); });
    elements.referenceLength.addEventListener('input', () => { referenceOrigin = {value: elements.referenceLength.value, unit: state.unit}; renderEstimate(); });
    elements.unit.addEventListener('change', () => {
      const next = elements.unit.value;
      const value = Number(elements.referenceLength.value);
      if (elements.referenceLength.value && Number.isFinite(value) && value > 0) {
        const origin = referenceOrigin || {value: elements.referenceLength.value, unit: state.unit};
        referenceOrigin = origin;
        elements.referenceLength.value = next === origin.unit ? origin.value : String(precise(Number(origin.value) * (next === 'cm' ? 2.54 : 1 / 2.54)));
      }
      state.unit = next;
      renderEstimate();
    });
    elements.modes.forEach(input => input.addEventListener('change', () => {
      state.selected = input.value;
      state.cursor = state.points[state.selected] || {x: 0.5, y: 0.5};
      renderMode();
      renderOverlay();
    }));
    elements.surface.addEventListener('click', event => {
      if (event.detail === 0) { placePoint(state.cursor); return; }
      const bounds = elements.image.getBoundingClientRect();
      if (!bounds.width || !bounds.height) return;
      placePoint({x: (event.clientX - bounds.left) / bounds.width, y: (event.clientY - bounds.top) / bounds.height});
    });
    elements.surface.addEventListener('keydown', event => {
      const direction = {ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1]}[event.key];
      if (direction) {
        event.preventDefault();
        const increment = event.shiftKey ? 0.001 : 0.01;
        state.cursor = {x: clamp(state.cursor.x + direction[0] * increment), y: clamp(state.cursor.y + direction[1] * increment)};
        renderMode(); renderOverlay();
      } else if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); placePoint(state.cursor); }
    });
    elements.x.addEventListener('input', () => setCoordinatesFromInputs());
    elements.y.addEventListener('input', () => setCoordinatesFromInputs());
    $('pm-place-point').addEventListener('click', () => setCoordinatesFromInputs(true));
    elements.apply.addEventListener('click', () => {
      renderEstimate();
      if (!state.estimate) return;
      const result = {...state.estimate, width: precise(state.estimate.width), height: precise(state.estimate.height)};
      if (typeof state.onApply === 'function') state.onApply(result);
      dialog.close();
    });
  }
  function open({unit = 'in', onApply, hasMeasurements = false} = {}) {
    initialize();
    if (elements.dialog.open) return;
    releasePhoto();
    state = freshState(unit === 'cm' ? 'cm' : 'in', onApply);
    referenceOrigin = null;
    elements.unit.value = state.unit;
    elements.referenceLength.value = '';
    elements.replacement.hidden = !hasMeasurements;
    resetPhoto();
    returnFocus = document.activeElement;
    originalOverflow = document.body.style.overflow;
    elements.dialog.showModal();
    document.body.style.overflow = 'hidden';
    elements.file.focus();
  }
  window.SpaceMaxPhotoMeasure = {open, calculateEstimate};
})();
