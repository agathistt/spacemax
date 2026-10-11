/**
 * A deliberately two-dimensional planning aid. All geometry below is derived
 * from user-entered measurements and manually positioned photo annotations.
 * It is not a fabrication model, a depth check, or an automatic photo measure.
 */
const MIN_BAY_MM = 120;
const DEFAULT_FRAME = { x: 0.12, y: 0.42, width: 0.76, height: 0.48 };
const DEFAULT_OBSTACLE = { enabled: true, x: 0.43, width: 0.14, access: 0.055 };
const finite = (value) => typeof value === 'number' && Number.isFinite(value);
const positive = (value) => finite(value) && value > 0;
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const numberOr = (value, fallback) => finite(value) ? value : fallback;
const escapeText = (value) => String(value).replace(/[&<>"']/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[character]));
const n = (value) => String(Math.round(value * 1000) / 1000);
const mm = (value) => new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(value);
const measurementLabel = (valueMm, requestedUnits) => {
  const units = requestedUnits === 'cm' || requestedUnits === 'in' ? requestedUnits : 'mm';
  const value = valueMm / (units === 'in' ? 25.4 : units === 'cm' ? 10 : 1);
  const formatted = new Intl.NumberFormat('en-US', { maximumFractionDigits: units === 'in' ? 2 : 1 }).format(value);
  return `${formatted} ${units}`;
};

function normalizeFrame(source = {}) {
  const x = clamp(numberOr(source.x, DEFAULT_FRAME.x), 0, 0.98);
  const y = clamp(numberOr(source.y, DEFAULT_FRAME.y), 0, 0.98);
  return {
    x,
    y,
    width: clamp(numberOr(source.width, DEFAULT_FRAME.width), 0.02, 1 - x),
    height: clamp(numberOr(source.height, DEFAULT_FRAME.height), 0.02, 1 - y),
  };
}

function photoRect(rect, frame) {
  return {
    x: frame.x + rect.x * frame.width,
    y: frame.y + rect.y * frame.height,
    width: rect.width * frame.width,
    height: rect.height * frame.height,
  };
}

function svgRect(rect, frame, canvas) {
  const photo = photoRect(rect, frame);
  return {
    x: photo.x * canvas.width,
    y: photo.y * canvas.height,
    width: photo.width * canvas.width,
    height: photo.height * canvas.height,
  };
}

/**
 * @returns geometry in frame-relative fractions. `frame` uses full-photo
 * fractions; `canvas` uses SVG units. Each bay also carries `photo` and `svg`
 * rectangles. `valid` requires measurements and at least one viable bay;
 * `dimensionsValid` distinguishes missing measurements from a blocked layout.
 */
export function buildGeometry(config = {}) {
  config = config && typeof config === 'object' ? config : {};
  const dimensions = config.dimensions || {};
  const frame = normalizeFrame(config.frame || {});
  const photoAspect = positive(config.photoAspect) ? clamp(config.photoAspect, 0.1, 10) : 1;
  const canvas = { width: 1000, height: 1000 / photoAspect };
  const sourceObstacle = config.obstacle || {};
  const obstacleX = clamp(numberOr(sourceObstacle.x, DEFAULT_OBSTACLE.x), 0, 1);
  const obstacle = {
    enabled: sourceObstacle.enabled !== false,
    x: obstacleX,
    y: 0,
    width: clamp(numberOr(sourceObstacle.width, DEFAULT_OBSTACLE.width), 0, 1 - obstacleX),
    height: 1,
    access: clamp(numberOr(sourceObstacle.access, DEFAULT_OBSTACLE.access), 0, 1),
  };
  const bandLeft = Math.max(0, obstacle.x - obstacle.access);
  const bandRight = Math.min(1, obstacle.x + obstacle.width + obstacle.access);
  const accessBand = obstacle.enabled
    ? { x: bandLeft, y: 0, width: bandRight - bandLeft, height: 1 }
    : null;
  const warnings = [
    'This straight-on 2D concept uses your measurements and photo annotations. It does not verify depth, pipe shape, mounting, load capacity, or fabrication fit.',
  ];
  const invalidDimensions = ['width', 'height', 'depth'].filter((key) => !positive(dimensions[key]));
  const dimensionsValid = invalidDimensions.length === 0;
  const geometry = {
    valid: false,
    dimensionsValid,
    dimensions: Object.fromEntries(['width', 'height', 'depth'].map((key) => [key, positive(dimensions[key]) ? dimensions[key] : null])),
    frame,
    canvas,
    photoAspect,
    obstacle,
    accessBand,
    bays: [],
    shelves: [],
    panels: [],
    doors: [],
    shelfHeightMm: null,
    usableWidthMm: 0,
    minimumBayMm: MIN_BAY_MM,
    warnings,
  };
  if (!dimensionsValid) {
    warnings.unshift(`Enter finite, positive ${invalidDimensions.join(', ')} measurements in millimeters to preview shelving.`);
    return geometry;
  }

  const candidateBays = accessBand
    ? [{ side: 'left', x: 0, width: bandLeft }, { side: 'right', x: bandRight, width: 1 - bandRight }]
    : [{ side: 'full', x: 0, width: 1 }];
  for (const candidate of candidateBays) {
    const widthMm = candidate.width * dimensions.width;
    if (widthMm + 1e-8 < MIN_BAY_MM) {
      if (candidate.width > 1e-8) {
        warnings.push(`${candidate.side === 'full' ? 'The' : `The ${candidate.side}`} bay is ${mm(widthMm)} mm wide and is omitted by this prototype's ${MIN_BAY_MM} mm minimum-bay display rule. This is not an engineering limit.`);
      }
      continue;
    }
    const rect = { x: candidate.x, y: 0, width: candidate.width, height: 1 };
    geometry.bays.push({ ...candidate, widthMm, photo: photoRect(rect, frame), svg: svgRect(rect, frame, canvas) });
  }
  if (!geometry.bays.length) {
    warnings.unshift(`No usable bay remains. Adjust the obstacle or its service-access band, or check the entered width. This prototype only draws bays at least ${MIN_BAY_MM} mm wide.`);
    return geometry;
  }

  // Thickness is a visual convention, not a selected material specification.
  const thicknessMm = Math.min(18, dimensions.height * 0.04, dimensions.width * 0.04);
  const thicknessX = thicknessMm / dimensions.width;
  const thicknessY = thicknessMm / dimensions.height;
  const requestedShelfHeight = numberOr(config.shelfHeight, dimensions.height * 0.5);
  const shelfMarginMm = Math.min(25, dimensions.height / 2);
  const shelfHeightMm = clamp(requestedShelfHeight, shelfMarginMm, dimensions.height - shelfMarginMm);
  const shelfY = 1 - shelfHeightMm / dimensions.height;
  if (finite(config.shelfHeight) && shelfHeightMm !== config.shelfHeight) {
    warnings.push(`The shelf marker is constrained to ${mm(shelfHeightMm)} mm above the base so it stays inside this 2D frame. Confirm the final shelf position separately.`);
  }
  geometry.shelfHeightMm = shelfHeightMm;
  geometry.usableWidthMm = geometry.bays.reduce((sum, bay) => sum + bay.widthMm, 0);
  geometry.valid = true;
  for (const bay of geometry.bays) {
    const common = { side: bay.side, x: bay.x, width: bay.width };
    geometry.shelves.push(
      { ...common, kind: 'base', y: 1 - thicknessY, height: thicknessY, elevationMm: 0 },
      { ...common, kind: 'adjustable', y: shelfY, height: thicknessY, elevationMm: shelfHeightMm },
    );
    geometry.panels.push(
      { side: bay.side, kind: 'outer-left', x: bay.x, y: 0, width: thicknessX, height: 1 },
      { side: bay.side, kind: 'outer-right', x: bay.x + bay.width - thicknessX, y: 0, width: thicknessX, height: 1 },
    );
    if (config.layout === 'concealed' || config.layout === 'combination') {
      const doorTop = config.layout === 'combination' ? shelfY + thicknessY : thicknessY;
      geometry.doors.push({
        side: bay.side,
        kind: 'front',
        x: bay.x + thicknessX,
        y: doorTop,
        width: bay.width - thicknessX * 2,
        height: Math.max(0, 1 - thicknessY - doorTop),
      });
    }
  }
  return geometry;
}

function rectAttributes(rect) {
  return `x="${n(rect.x)}" y="${n(rect.y)}" width="${n(rect.width)}" height="${n(rect.height)}"`;
}

/** Render an SVG annotation layer, with no embedded or modified photograph. */
export function renderOverlay(config = {}, { showFrame = false, showObstacle = true, showShelves = true } = {}) {
  config = config && typeof config === 'object' ? config : {};
  const geometry = buildGeometry(config);
  const { frame, canvas, obstacle, accessBand } = geometry;
  const finished = config.view === 'finished';
  const transform = (rect) => svgRect(rect, frame, canvas);
  const frameRect = transform({ x: 0, y: 0, width: 1, height: 1 });
  const pieces = [];
  const label = !showShelves
    ? 'Photo planning annotations. The frame and obstacle are positioned manually; their photo position does not measure the space.'
    : geometry.valid
    ? 'Schematic two-dimensional shelving concept. Blue marks the physical obstacle, amber marks its service-access band. Shelves stay outside that band. Measurements and fit require verification.'
    : 'Photo planning annotations. No shelving is drawn until valid dimensions and a usable bay are available.';
  pieces.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 ${n(canvas.height)}" preserveAspectRatio="none" role="img" aria-label="${escapeText(label)}" class="configuration-overlay">`);
  pieces.push('<g stroke-linejoin="round" stroke-linecap="round">');

  // This protected region is reserved by construction, not merely painted over.
  if (obstacle.enabled && showObstacle) {
    const band = transform(accessBand);
    pieces.push(`<rect ${rectAttributes(band)} fill="#e9af4d" fill-opacity="0.13" stroke="#b77b25" stroke-width="1.8" stroke-dasharray="7 6" vector-effect="non-scaling-stroke" data-geometry="service-band"/>`);
    pieces.push(`<rect ${rectAttributes(transform(obstacle))} fill="#72b8de" fill-opacity="0.22" stroke="#468cae" stroke-width="1.6" vector-effect="non-scaling-stroke" data-geometry="physical-obstacle"/>`);
  }

  const solidOpacity = finished ? 0.92 : 0.35;
  const doorOpacity = finished ? 0.91 : 0.15;
  for (const panel of showShelves ? geometry.panels : []) {
    pieces.push(`<rect ${rectAttributes(transform(panel))} fill="#f5eedb" fill-opacity="${solidOpacity}" stroke="#3f6558" stroke-width="1.4" vector-effect="non-scaling-stroke" data-geometry="panel-${escapeText(panel.side)}-${escapeText(panel.kind)}"/>`);
  }
  for (const shelf of showShelves ? geometry.shelves : []) {
    pieces.push(`<rect ${rectAttributes(transform(shelf))} fill="#f5eedb" fill-opacity="${solidOpacity}" stroke="#3f6558" stroke-width="1.8" vector-effect="non-scaling-stroke" data-geometry="shelf-${escapeText(shelf.side)}-${escapeText(shelf.kind)}"/>`);
  }

  if (showShelves && config.items && geometry.valid) {
    // Schematic additions only: the underlying real photograph is never erased.
    for (const bay of geometry.bays) {
      const inset = Math.min(bay.width * 0.13, 0.025);
      const bottleWidth = Math.min(bay.width * 0.16, 0.052);
      const shelfY = 1 - geometry.shelfHeightMm / geometry.dimensions.height;
      const bottleHeight = Math.min(0.18, shelfY * 0.64);
      for (let index = 0; index < 2; index += 1) {
        const body = transform({ x: bay.x + inset + index * bottleWidth * 1.48, y: shelfY - bottleHeight, width: bottleWidth, height: bottleHeight });
        const neck = { x: body.x + body.width * 0.32, y: body.y - body.height * 0.09, width: body.width * 0.36, height: body.height * 0.11 };
        pieces.push(`<g data-geometry="example-item-${escapeText(bay.side)}-${index}" fill="#688f7b" fill-opacity="0.58" stroke="#375f51" stroke-width="1" vector-effect="non-scaling-stroke"><rect ${rectAttributes(body)} rx="${n(Math.min(body.width * 0.2, 6))}"/><rect ${rectAttributes(neck)}/></g>`);
      }
    }
  }

  for (const door of showShelves ? geometry.doors : []) {
    const rect = transform(door);
    pieces.push(`<rect ${rectAttributes(rect)} fill="#f5eedb" fill-opacity="${doorOpacity}" stroke="#3f6558" stroke-width="1.6" vector-effect="non-scaling-stroke" data-geometry="front-${escapeText(door.side)}"/>`);
    const handleX = rect.x + rect.width * 0.82;
    const handleY = rect.y + Math.min(rect.height * 0.18, 28);
    pieces.push(`<line x1="${n(handleX)}" y1="${n(handleY)}" x2="${n(handleX)}" y2="${n(handleY + Math.min(rect.height * 0.12, 25))}" stroke="#3f6558" stroke-width="3" vector-effect="non-scaling-stroke" data-geometry="front-handle-${escapeText(door.side)}"/>`);
  }

  const labelFont = 'font-family="system-ui, sans-serif" font-size="16" font-weight="600" fill="#244a3e" paint-order="stroke" stroke="#fffdf6" stroke-width="4" stroke-linejoin="round"';
  if (positive(geometry.dimensions.width)) {
    const lineY = clamp(frameRect.y - 19, 19, canvas.height - 19);
    pieces.push(`<path d="M ${n(frameRect.x)} ${n(lineY - 5)} V ${n(lineY + 5)} M ${n(frameRect.x)} ${n(lineY)} H ${n(frameRect.x + frameRect.width)} M ${n(frameRect.x + frameRect.width)} ${n(lineY - 5)} V ${n(lineY + 5)}" fill="none" stroke="#365e50" stroke-width="1.3" vector-effect="non-scaling-stroke"/>`);
    pieces.push(`<text x="${n(frameRect.x + frameRect.width / 2)}" y="${n(Math.max(16, lineY - 9))}" text-anchor="middle" ${labelFont}>${escapeText(measurementLabel(geometry.dimensions.width, config.units))}</text>`);
  }
  if (positive(geometry.dimensions.height)) {
    const lineX = clamp(frameRect.x + frameRect.width + 16, 16, canvas.width - 16);
    const centerY = frameRect.y + frameRect.height / 2;
    pieces.push(`<path d="M ${n(lineX - 5)} ${n(frameRect.y)} H ${n(lineX + 5)} M ${n(lineX)} ${n(frameRect.y)} V ${n(frameRect.y + frameRect.height)} M ${n(lineX - 5)} ${n(frameRect.y + frameRect.height)} H ${n(lineX + 5)}" fill="none" stroke="#365e50" stroke-width="1.3" vector-effect="non-scaling-stroke"/>`);
    const labelX = clamp(lineX - 8, 16, canvas.width - 24);
    pieces.push(`<text x="${n(labelX)}" y="${n(centerY)}" transform="rotate(-90 ${n(labelX)} ${n(centerY)})" text-anchor="middle" ${labelFont}>${escapeText(measurementLabel(geometry.dimensions.height, config.units))}</text>`);
  }

  if (showFrame) {
    pieces.push(`<rect ${rectAttributes(frameRect)} fill="none" stroke="#3f6558" stroke-width="1.8" stroke-dasharray="6 5" vector-effect="non-scaling-stroke"/>`);
    pieces.push(handle('frame-nw', frameRect.x, frameRect.y, '#3f6558'));
    pieces.push(handle('frame-se', frameRect.x + frameRect.width, frameRect.y + frameRect.height, '#3f6558'));
  }
  if (showObstacle && obstacle.enabled) {
    const physical = transform(obstacle);
    pieces.push(handle('obstacle-left', physical.x, physical.y + physical.height / 2, '#468cae'));
    pieces.push(handle('obstacle-right', physical.x + physical.width, physical.y + physical.height / 2, '#468cae'));
  }
  pieces.push('</g></svg>');
  return pieces.join('');
}

function handle(name, x, y, color) {
  return `<circle cx="${n(x)}" cy="${n(y)}" r="9" fill="#fffdf6" stroke="${escapeText(color)}" stroke-width="2.4" vector-effect="non-scaling-stroke" data-handle="${escapeText(name)}" aria-hidden="true" pointer-events="all" style="pointer-events:all;cursor:grab;touch-action:none"/>`;
}
