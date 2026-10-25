'use strict';
// Native AppKit fullscreen windows on notched Macs start below the camera
// housing. Compare both full bounds and the system-reported safe area, never
// the work area (which also subtracts the Dock).
function fullscreenDisplays(windows, displays, nativeDisplays = []) {
  // The native list already contains only visible external windows. Focus may
  // move to our menu or another app while a fullscreen window stays visible.
  return displays.filter(({ id, bounds }) => {
    const top = nativeDisplays.find((display) => display.id === id)?.safeAreaTop;
    const regions = [bounds];
    if (Number.isFinite(top) && top > 0 && top < bounds.height) {
      regions.push({ ...bounds, y: bounds.y + top, height: bounds.height - top });
    }
    return windows.some((window) => [window.x, window.y, window.width, window.height].every(Number.isFinite)
      && regions.some((region) => Math.abs(window.x - region.x) <= 2 && Math.abs(window.y - region.y) <= 2
        && Math.abs(window.width - region.width) <= 4 && Math.abs(window.height - region.height) <= 4));
  })
    .map((display) => display.id);
}
module.exports = { fullscreenDisplays };
