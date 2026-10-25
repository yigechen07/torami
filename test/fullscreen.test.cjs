'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { fullscreenDisplays } = require('../src/fullscreen.cjs');
const displays = [
  { id: 1, bounds: { x: 0, y: 0, width: 1710, height: 1112 } },
  { id: 2, bounds: { x: -1920, y: -200, width: 1920, height: 1080 } },
];
const fullscreen = { pid: 100, ...displays[0].bounds };
test('visible fullscreen windows are detected on either display without a focus dependency', () => {
  assert.deepEqual(fullscreenDisplays([fullscreen], displays), [1]);
  assert.deepEqual(fullscreenDisplays([{ pid: 200, ...displays[1].bounds }], displays), [2]);
  assert.deepEqual(fullscreenDisplays([fullscreen, { pid: 200, ...displays[1].bounds }], displays), [1, 2]);
  assert.deepEqual(fullscreenDisplays([{ ...displays[0].bounds }], displays), [1]);
});
test('maximized work-area windows and an empty visible window list do not hide pets', () => {
  assert.deepEqual(fullscreenDisplays([{ ...fullscreen, y: 34, height: 1030 }], displays), []);
  assert.deepEqual(fullscreenDisplays([], displays), []);
});
test('small native rounding differences are accepted without treating a partial window as fullscreen', () => {
  assert.deepEqual(fullscreenDisplays([{ ...fullscreen, x: 1, width: 1708, height: 1110 }], displays), [1]);
  assert.deepEqual(fullscreenDisplays([{ ...fullscreen, width: 1600 }], displays), []);
  assert.deepEqual(fullscreenDisplays([{ ...fullscreen, height: NaN }], displays), []);
});
test('native AppKit fullscreen below a Mac camera housing hides pets', () => {
  const mac = [{ id: 1, bounds: { x: 0, y: 0, width: 1710, height: 1107 } }];
  const native = [{ id: 1, safeAreaTop: 33 }];
  const appkit = { pid: 300, x: 0, y: 34, width: 1710, height: 1073 };
  assert.deepEqual(fullscreenDisplays([appkit], mac, native), [1]);
  assert.deepEqual(fullscreenDisplays([appkit], mac), [], 'the old full-bounds-only check missed this real frame');
  assert.deepEqual(fullscreenDisplays([{ ...appkit, height: 1009 }], mac, native), [], 'a maximized window still leaves room for the Dock');
  assert.deepEqual(fullscreenDisplays([{ ...appkit, x: 200, width: 1510 }], mac, native), []);
});
test('safe areas use each display origin and ignore invalid or unrelated display metadata', () => {
  const native = [{ id: 2, safeAreaTop: 30 }];
  const window = { pid: 400, x: -1920, y: -170, width: 1920, height: 1050 };
  assert.deepEqual(fullscreenDisplays([window], displays, native), [2]);
  assert.deepEqual(fullscreenDisplays([window], displays, [{ id: 1, safeAreaTop: 30 }]), []);
  for (const top of [NaN, -30, 1080]) assert.deepEqual(fullscreenDisplays([window], displays, [{ id: 2, safeAreaTop: top }]), []);
});
