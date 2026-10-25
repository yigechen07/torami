'use strict';

const { clamp } = require('./physics.cjs');
const footInset = (size) => size.height * 0.06675;
const feetY = (point, size) => point.y + size.height - footInset(size);

// Window records arrive from front to back. Only exposed pieces of a top edge
// can support a pet; a window behind another window must not catch a falling pet.
function exposedSurfaces(windows, size, area) {
  const surfaces = [];
  windows.forEach((window, index) => {
    if (![window.id, window.x, window.y, window.width, window.height].every(Number.isFinite)) return;
    if (window.y < area.y + size.height - footInset(size) || window.y > area.y + area.height - footInset(size)) return;
    let segments = [[Math.max(area.x, window.x), Math.min(area.x + area.width, window.x + window.width)]];
    for (const front of windows.slice(0, index)) {
      if (front.y > window.y + 2 || front.y + front.height < window.y - 2) continue;
      segments = segments.flatMap(([left, right]) => {
        const start = Math.max(left, front.x), end = Math.min(right, front.x + front.width);
        return start >= end ? [[left, right]] : [[left, start], [end, right]];
      });
    }
    for (const [left, right] of segments) {
      if (right - left >= size.width * 0.23) surfaces.push({ id: window.id, pid: window.pid, windowX: window.x, y: window.y, left, right });
    }
  });
  return surfaces;
}

function contains(surface, point, size) {
  const center = point.x + size.width / 2;
  const margin = size.width * 0.1;
  return center >= surface.left + margin && center <= surface.right - margin;
}

function nearSurface(point, size, surfaces, tolerance = 34) {
  const foot = feetY(point, size);
  return surfaces.filter((surface) => contains(surface, point, size) && Math.abs(foot - surface.y) <= tolerance)
    .sort((a, b) => Math.abs(foot - a.y) - Math.abs(foot - b.y))[0] || null;
}

function crossedSurface(before, after, size, surfaces, ignoredId) {
  if (after.vy < 0) return null;
  return surfaces.filter((surface) => surface.id !== ignoredId && contains(surface, after, size)
      && feetY(before, size) <= surface.y + 2 && feetY(after, size) >= surface.y)
    .sort((a, b) => a.y - b.y)[0] || null;
}

function walkStep(x, direction, speed, dt, left, right) {
  const next = x + direction * speed * dt;
  return { x: clamp(next, left, right), direction: next <= left ? 1 : next >= right ? -1 : direction };
}

function windowWalkStep(x, direction, speed, dt, surface, size, area) {
  const half = size.width / 2, margin = size.width * 0.1;
  // Keep the feet supported until takeoff, including after native pixel rounding.
  // At a screen edge, jump instead of turning around as desktop patrol does.
  const left = Math.max(area.x, Math.ceil(surface.left + margin - half));
  const right = Math.min(area.x + area.width - size.width, Math.floor(surface.right - margin - half));
  const edge = direction < 0 ? left : right;
  const next = x + direction * speed * dt;
  const atEdge = direction < 0 ? next <= edge : next >= edge;
  return { x: clamp(next, left, right), atEdge };
}

module.exports = { footInset, feetY, exposedSurfaces, contains, nearSurface, crossedSurface, walkStep, windowWalkStep };
