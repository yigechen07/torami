'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { stepBody, clampPosition } = require('../src/physics.cjs');
const size = { width: 260, height: 320 };
const area = { x: 0, y: 25, width: 1440, height: 850 };

test('a dropped pet lands, rebounds and settles without leaving the work area', () => {
  let body = { x: 500, y: 80, vx: 650, vy: -300 };
  let rebounded = false;
  for (let frame = 0; frame < 1200 && !body.resting; frame += 1) {
    body = stepBody(body, size, area, 1 / 60);
    rebounded ||= body.landed;
    assert.ok(body.x >= 0 && body.x <= 1180);
    assert.ok(body.y >= 25 && body.y <= 555);
  }
  assert.ok(rebounded);
  assert.ok(body.resting);
  assert.equal(body.y, 555);
  assert.equal(body.vy, 0);
});

test('physics respects a monitor to the left and above the primary display', () => {
  const secondary = { x: -1920, y: -400, width: 1920, height: 1080 };
  let body = { x: -1900, y: -350, vx: -1600, vy: -900 };
  for (let frame = 0; frame < 1000 && !body.resting; frame += 1) {
    body = stepBody(body, size, secondary, 1 / 60);
    assert.ok(body.x >= -1920 && body.x <= -260);
    assert.ok(body.y >= -400 && body.y <= 360);
  }
  assert.ok(body.resting);
  assert.equal(body.y, 360);
});

test('a long delayed frame cannot move the pet past a boundary', () => {
  const body = stepBody({ x: 1175, y: 550, vx: 1500, vy: 1500 }, size, area, 3);
  assert.ok(body.x <= 1180);
  assert.ok(body.y <= 555);
  assert.ok(Number.isFinite(body.vy));
});

test('position recovery clamps to actual monitor coordinates after unplugging a display', () => {
  assert.deepEqual(clampPosition({ x: -3000, y: -1000 }, size, area), { x: 0, y: 25 });
  assert.deepEqual(clampPosition({ x: 9999, y: 9999 }, size, area), { x: 1180, y: 555 });
});
