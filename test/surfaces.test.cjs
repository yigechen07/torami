'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { exposedSurfaces, contains, nearSurface, crossedSurface, feetY, footInset, walkStep, windowWalkStep } = require('../src/surfaces.cjs');
const size = { width: 260, height: 320 };
const area = { x: 0, y: 25, width: 1440, height: 850 };
const window = { id: 1, pid: 100, x: 100, y: 450, width: 800, height: 300 };
const point = { x: 400, y: 450 - size.height + footInset(size) };

test('only exposed parts of a background window top can catch a pet', () => {
  const foreground = { id: 2, pid: 101, x: 300, y: 350, width: 250, height: 200 };
  const surfaces = exposedSurfaces([foreground, window], size, area);
  assert.deepEqual(surfaces.filter((item) => item.id === 1).map(({ left, right }) => [left, right]), [[100, 300], [550, 900]]);
  assert.equal(nearSurface({ ...point, x: 300 }, size, surfaces), null, 'occluded top edge is not solid');
  assert.equal(nearSurface({ ...point, x: 550 }, size, surfaces).id, 1);
});
test('drag release snaps by visible feet rather than the transparent window margin', () => {
  const surfaces = exposedSurfaces([window], size, area);
  assert.equal(feetY(point, size), 450);
  assert.equal(nearSurface({ ...point, y: point.y + 20 }, size, surfaces).id, 1);
  assert.equal(nearSurface({ ...point, y: point.y + 60 }, size, surfaces), null);
});
test('falling catches a window, jumping upward and deliberately jumping off do not', () => {
  const surfaces = exposedSurfaces([window], size, area);
  const before = { ...point, y: point.y - 8, vy: 200 }, after = { ...point, y: point.y + 8, vy: 300 };
  assert.equal(crossedSurface(before, after, size, surfaces).id, 1);
  assert.equal(crossedSurface(before, { ...after, vy: -100 }, size, surfaces), null);
  assert.equal(crossedSurface(before, after, size, surfaces, 1), null);
});
test('surfaces on monitors with negative coordinates retain native positions', () => {
  const otherArea = { x: -1920, y: -400, width: 1920, height: 1080 };
  const surface = exposedSurfaces([{ ...window, x: -1500, y: -50 }], size, otherArea)[0];
  assert.equal(surface.y, -50);
  assert.equal(surface.left, -1500);
  assert.equal(nearSurface({ x: -1400, y: -50 - 320 + footInset(size) }, size, [surface]).id, 1);
});
test('fullscreen window tops are skipped and patrol turns at either screen edge', () => {
  assert.deepEqual(exposedSurfaces([{ ...window, y: 25 }], size, area), []);
  assert.deepEqual(walkStep(1179, 1, 80, 0.1, 0, 1180), { x: 1180, direction: -1 });
  assert.deepEqual(walkStep(1, -1, 80, 0.1, 0, 1180), { x: 0, direction: 1 });
});
test('window walking reaches either foot-supported edge before jumping', () => {
  const surface = exposedSurfaces([window], size, area)[0];
  assert.deepEqual(windowWalkStep(400, 1, 60, 0.1, surface, size, area), { x: 406, atEdge: false });
  assert.deepEqual(windowWalkStep(740, 1, 60, 0.1, surface, size, area), { x: 744, atEdge: true });
  assert.deepEqual(windowWalkStep(1, -1, 60, 0.1, surface, size, area), { x: 0, atEdge: true });
  // Three seconds on a long edge is still walking, not a timed jump.
  let step = { x: 400 };
  for (let i = 0; i < 30; i++) step = windowWalkStep(step.x, 1, 60, 0.1, surface, size, area);
  assert.equal(step.x, 580); assert.equal(step.atEdge, false);
});
test('window edges flush with a monitor boundary trigger a jump instead of a patrol reversal', () => {
  const surface = { left: area.x, right: area.x + area.width };
  assert.deepEqual(windowWalkStep(1178, 1, 60, 0.1, surface, size, area), { x: 1180, atEdge: true });
  assert.deepEqual(windowWalkStep(2, -1, 60, 0.1, surface, size, area), { x: 0, atEdge: true });
});
test('fractional edges and scaled pets keep their feet supported through native rounding', () => {
  const small = { width: 195, height: 240 }, other = { x: -1920, y: -400, width: 1920, height: 1080 };
  const surface = { left: -1500.4, right: -1100.2 };
  for (const direction of [-1, 1]) {
    const step = windowWalkStep(-1400, direction, 45, 10, surface, small, other);
    assert.equal(step.atEdge, true);
    assert.equal(Number.isInteger(step.x), true);
    assert.equal(contains(surface, { x: step.x }, small), true);
  }
});
