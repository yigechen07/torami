'use strict';

const GRAVITY = 1800;
const BOUNCE = 0.38;
const MAX_SPEED = 1600;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

function limits(area, size) {
  return {
    left: area.x,
    top: area.y,
    right: area.x + Math.max(0, area.width - size.width),
    floor: area.y + Math.max(0, area.height - size.height),
  };
}

function clampPosition(position, size, area) {
  const edges = limits(area, size);
  return {
    x: Math.round(clamp(position.x, edges.left, edges.right)),
    y: Math.round(clamp(position.y, edges.top, edges.floor)),
  };
}

// Substeps keep a delayed frame from tunneling through a screen edge.
function stepBody(body, size, area, elapsed) {
  const edges = limits(area, size);
  const dt = clamp(elapsed, 0, 0.1);
  const count = Math.max(1, Math.ceil(dt / (1 / 120)));
  const delta = dt / count;
  let { x, y, vx, vy } = body;
  let landed = false;
  for (let index = 0; index < count; index += 1) {
    vx = clamp(vx, -MAX_SPEED, MAX_SPEED);
    vy = clamp(vy + GRAVITY * delta, -MAX_SPEED, MAX_SPEED);
    x += vx * delta;
    y += vy * delta;
    vx *= Math.pow(0.98, delta * 60);
    if (x < edges.left || x > edges.right) {
      x = clamp(x, edges.left, edges.right);
      vx *= -0.45;
    }
    if (y < edges.top) {
      y = edges.top;
      vy = Math.abs(vy) * BOUNCE;
    }
    if (y >= edges.floor) {
      y = edges.floor;
      landed ||= vy > 100;
      vy = Math.abs(vy) < 180 ? 0 : -vy * BOUNCE;
      vx *= Math.pow(0.7, delta * 60);
    }
  }
  const resting = y >= edges.floor - 0.1 && vy === 0 && Math.abs(vx) < 10;
  if (resting) vx = 0;
  return { x, y, vx, vy, landed, resting };
}

module.exports = { clamp, clampPosition, stepBody, limits };
