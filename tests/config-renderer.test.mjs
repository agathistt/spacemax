import test from 'node:test';
import assert from 'node:assert/strict';
import { buildGeometry, renderOverlay } from '../dist/config-renderer.js';

const config = {
  dimensions: { width: 1000, height: 800, depth: 450 },
  frame: { x: 0.1, y: 0.35, width: 0.8, height: 0.55 },
  obstacle: { enabled: true, x: 0.43, width: 0.14, access: 0.05 },
  shelfHeight: 400,
  layout: 'combination',
  view: 'see-through',
  photoAspect: 1.5,
  items: true,
};

test('every supported part stays outside the physical obstacle and service-access band', () => {
  const result = buildGeometry(config);
  assert.equal(result.valid, true);
  assert.equal(result.bays.length, 2);
  assert.equal(result.shelves.length, 4);
  const bandEnd = result.accessBand.x + result.accessBand.width;
  for (const part of [...result.shelves, ...result.panels, ...result.doors]) {
    assert.ok(part.x + part.width <= result.accessBand.x + 1e-10 || part.x >= bandEnd - 1e-10,
      `${part.side} ${part.kind} crosses reserved access space`);
    for (const property of ['x', 'y', 'width', 'height']) assert.ok(Number.isFinite(part[property]));
  }
  assert.deepEqual(result.shelves.map((shelf) => shelf.elevationMm), [0, 400, 0, 400]);
});

test('moving or widening the obstacle recomputes independent usable bay widths', () => {
  const initial = buildGeometry(config);
  const moved = buildGeometry({ ...config, obstacle: { ...config.obstacle, x: 0.53 } });
  assert.ok(Math.abs(moved.bays[0].widthMm - initial.bays[0].widthMm - 100) < 1e-9);
  assert.ok(Math.abs(initial.bays[1].widthMm - moved.bays[1].widthMm - 100) < 1e-9);
  const padded = buildGeometry({ ...config, obstacle: { ...config.obstacle, access: 0.1 } });
  assert.ok(padded.bays[0].widthMm < initial.bays[0].widthMm);
  assert.ok(padded.bays[1].widthMm < initial.bays[1].widthMm);
});

test('narrow bays are omitted and a fully blocked frame has no supported geometry', () => {
  const oneBay = buildGeometry({ ...config, obstacle: { enabled: true, x: 0.09, width: 0.2, access: 0 } });
  assert.equal(oneBay.valid, true);
  assert.deepEqual(oneBay.bays.map((bay) => bay.side), ['right']);
  assert.match(oneBay.warnings.join(' '), /90 mm.*120 mm.*not an engineering limit/);
  const blocked = buildGeometry({ ...config, obstacle: { enabled: true, x: 0.2, width: 0.6, access: 0.2 } });
  assert.equal(blocked.valid, false);
  assert.equal(blocked.dimensionsValid, true);
  assert.deepEqual(blocked.bays, []);
  assert.deepEqual(blocked.shelves, []);
  assert.deepEqual(blocked.panels, []);
  assert.deepEqual(blocked.doors, []);
  assert.match(blocked.warnings[0], /No usable bay remains/);
});

test('120 mm prototype boundary is inclusive and disabling the obstacle frees the full width', () => {
  const exact = buildGeometry({ ...config, obstacle: { enabled: true, x: 0.12, width: 0.88, access: 0 } });
  assert.equal(exact.bays.length, 1);
  assert.equal(exact.bays[0].widthMm, 120);
  const cleared = buildGeometry({ ...config, obstacle: { enabled: false } });
  assert.equal(cleared.accessBand, null);
  assert.equal(cleared.bays.length, 1);
  assert.equal(cleared.bays[0].side, 'full');
  assert.equal(cleared.bays[0].widthMm, 1000);
});

test('missing, nonnumeric, zero, negative and nonfinite dimensions never produce shelving', () => {
  for (const key of ['width', 'height', 'depth']) {
    for (const bad of [null, undefined, '800', 0, -1, NaN, Infinity, -Infinity]) {
      const input = { ...config, dimensions: { ...config.dimensions, [key]: bad } };
      const result = buildGeometry(input);
      assert.equal(result.valid, false, `${key}: ${String(bad)}`);
      assert.equal(result.dimensionsValid, false);
      assert.deepEqual(result.shelves, []);
      assert.deepEqual(result.panels, []);
      assert.deepEqual(result.doors, []);
      const svg = renderOverlay(input);
      assert.doesNotMatch(svg, /NaN|Infinity|data-geometry="shelf-/);
      assert.match(result.warnings[0], new RegExp(key));
    }
  }
});

test('see-through and finished views share exactly the same geometry and only change alpha', () => {
  const transparent = { ...config, view: 'see-through' };
  const finished = { ...config, view: 'finished' };
  assert.deepEqual(buildGeometry(transparent), buildGeometry(finished));
  const stripOpacity = (svg) => svg.replace(/fill-opacity="[^"]+"/g, 'fill-opacity="STYLE"');
  assert.equal(stripOpacity(renderOverlay(transparent)), stripOpacity(renderOverlay(finished)));
  assert.notEqual(renderOverlay(transparent), renderOverlay(finished));
});

test('moving the photo frame changes annotations, never entered measurements or usable widths', () => {
  const first = buildGeometry(config);
  const second = buildGeometry({ ...config, frame: { x: 0.2, y: 0.2, width: 0.6, height: 0.6 } });
  assert.deepEqual(first.dimensions, second.dimensions);
  assert.deepEqual(first.bays.map(({ widthMm }) => widthMm), second.bays.map(({ widthMm }) => widthMm));
  assert.notDeepEqual(first.bays[0].photo, second.bays[0].photo);
  assert.ok(Math.abs(first.bays[0].svg.x - first.bays[0].photo.x * 1000) < 1e-9);
});

test('renderer produces only an SVG overlay and requested pointer handles', () => {
  const svg = renderOverlay(config, { showFrame: true, showObstacle: true });
  assert.match(svg, /viewBox="0 0 1000 666\.667" preserveAspectRatio="none"/);
  assert.match(svg, /role="img" aria-label=/);
  assert.doesNotMatch(svg, /<image|<foreignObject|<script/);
  for (const name of ['frame-nw', 'frame-se', 'obstacle-left', 'obstacle-right']) {
    assert.match(svg, new RegExp(`data-handle="${name}" aria-hidden="true"`));
  }
  const hidden = renderOverlay(config, { showFrame: false, showObstacle: false });
  assert.doesNotMatch(hidden, /data-handle=|data-geometry="physical-obstacle"/);
  assert.match(hidden, /data-geometry="shelf-/);
});

test('hostile or nonfinite inputs cannot introduce markup or nonfinite SVG coordinates', () => {
  const svg = renderOverlay({
    ...config,
    view: '<script>alert(1)</script>',
    layout: '"><img src=x onerror=alert(1)>',
    photoAspect: NaN,
    frame: { x: -20, y: Infinity, width: 200, height: NaN },
    obstacle: { x: Infinity, width: -20, access: NaN },
    shelfHeight: Infinity,
  }, { showFrame: true });
  assert.doesNotMatch(svg, /<script|<img|onerror|NaN|Infinity/);
  assert.match(svg, /viewBox="0 0 1000 1000"/);
});

test('annotation-only mode keeps dimensions and handles but removes all shelving and example items', () => {
  const svg = renderOverlay(config, { showFrame: true, showObstacle: true, showShelves: false });
  assert.match(svg, /data-handle="frame-nw"/);
  assert.match(svg, /data-geometry="service-band"/);
  assert.match(svg, /1,000 mm/);
  assert.doesNotMatch(svg, /data-geometry="(?:shelf|panel|front|example-item)-/);
});

test('dimension labels follow selected display units without changing millimeter geometry', () => {
  const centimeters = { ...config, units: 'cm' };
  const inches = { ...config, units: 'in' };
  assert.deepEqual(buildGeometry(centimeters), buildGeometry(config));
  assert.deepEqual(buildGeometry(inches), buildGeometry(config));
  assert.match(renderOverlay(centimeters), />100 cm<\/text>/);
  assert.match(renderOverlay(centimeters), />80 cm<\/text>/);
  assert.match(renderOverlay(inches), />39\.37 in<\/text>/);
  assert.match(renderOverlay(inches), />31\.5 in<\/text>/);
  assert.match(renderOverlay({ ...config, units: 'invalid' }), />1,000 mm<\/text>/);
});

test('shelf endpoints agree with planner controls at 25 mm and height minus 25 mm', () => {
  const input = { ...config, dimensions: { ...config.dimensions, height: 650 } };
  const low = buildGeometry({ ...input, shelfHeight: 25 });
  const high = buildGeometry({ ...input, shelfHeight: 625 });
  assert.equal(low.shelfHeightMm, 25);
  assert.equal(high.shelfHeightMm, 625);
  assert.ok(low.shelves.filter((shelf) => shelf.kind === 'adjustable').every((shelf) => shelf.elevationMm === 25));
  assert.doesNotMatch(low.warnings.join(' '), /shelf marker is constrained/);
  assert.equal(buildGeometry({ ...input, shelfHeight: 0 }).shelfHeightMm, 25);
  assert.equal(buildGeometry({ ...input, shelfHeight: 900 }).shelfHeightMm, 625);
  const tiny = buildGeometry({ ...input, dimensions: { ...input.dimensions, height: 20 }, shelfHeight: 25 });
  assert.equal(tiny.shelfHeightMm, 10);
  assert.ok(tiny.shelves.every((shelf) => Number.isFinite(shelf.y) && shelf.y >= 0 && shelf.y + shelf.height <= 1));
});

test('annotation handles explicitly receive pointer events despite an inert overlay parent', () => {
  const svg = renderOverlay(config, { showFrame: true });
  const handles = svg.match(/<circle[^>]+data-handle=[^>]+>/g);
  assert.equal(handles.length, 4);
  for (const handle of handles) {
    assert.match(handle, /pointer-events="all"/);
    assert.match(handle, /style="[^"]*pointer-events:all;[^"]*touch-action:none/);
  }
});
