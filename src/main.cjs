'use strict';
const { app, Menu, Tray, nativeImage, ipcMain, screen, globalShortcut, powerMonitor, systemPreferences } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const { SCALES, readSettings, writeSettings } = require('./settings.cjs');
const { clamp } = require('./physics.cjs');
const { Pet } = require('./pet-controller.cjs');
const { WindowMonitor } = require('./window-monitor.cjs');
const { fullscreenDisplays } = require('./fullscreen.cjs');
const { t, languages } = require('./pet/i18n.js');
const { PetMenu } = require('./popup-menu.cjs');
const smoke = process.argv.includes('--smoke-test');
if (smoke) app.setPath('userData', fs.mkdtempSync(path.join(os.tmpdir(), 'torami-smoke-')));
app.setName('兔岚咪');
const configPath = () => path.join(app.getPath('userData'), 'settings.json');
let tray, timer, saveTimer, sequence = 0, lastTime = performance.now(), statsAt = 0;
const world = {
  app, screen, pets: new Map(), time: 0, paused: false, suspended: false, quitting: false,
  settings: null, monitor: null, menuOpen: false,
  scheduleSave() { clearTimeout(saveTimer); saveTimer = setTimeout(save, 400); },
  publish() { for (const pet of world.pets.values()) pet.publish(); },
  syncFullscreenVisibility,
};
const popup = new PetMenu(world);
function openMenu(pet = primary(), point) { return popup.open(menu(pet), point); }
function primary() { return world.pets.values().next().value; }
function save() {
  clearTimeout(saveTimer);
  if (!world.settings) return;
  const pet = primary();
  if (pet && !pet.window.isDestroyed()) {
    const { x, y } = pet.bounds(); world.settings.position = { x, y }; world.settings.sleeping = pet.sleeping;
  }
  try { writeSettings(configPath(), world.settings); }
  catch (error) { console.error('Could not save preferences:', error.message); }
}
async function summon(point, sleeping = false) {
  if (world.pets.size >= 5) { primary()?.say('maxPets'); return null; }
  const pet = new Pet(world, ++sequence);
  world.pets.set(pet.id, pet);
  try { await pet.create(point, sleeping); }
  catch (error) { world.pets.delete(pet.id); throw error; }
  world.publish(); return pet;
}
function keepOne(pet) {
  for (const other of [...world.pets.values()]) if (other !== pet) other.remove();
  pet.show(); world.publish(); world.scheduleSave();
}
function pause(value = !world.paused) {
  for (const pet of world.pets.values()) pet.finishDrag();
  world.paused = value; world.publish();
}
function setScale(scale) {
  if (!SCALES.includes(scale)) return;
  world.settings.scale = scale;
  for (const pet of world.pets.values()) pet.setScale();
  world.scheduleSave();
}
async function restoreWindows(pet) {
  const result = await world.monitor.request({ command: 'restore' });
  pet?.say(result.restored ? 'restored' : result.ok ? 'nothingToRestore' : 'restoreFailed', 3500, { count: result.restored });
}
async function pushWindow(pet) {
  const window = world.monitor.windows.find((item) => item.id === pet.support?.id);
  if (!window) { pet.say('needWindow'); return; }
  const area = pet.area();
  const x = Math.round(clamp(window.x + pet.direction * 120, area.x, Math.max(area.x, area.x + area.width - window.width)));
  const result = await world.monitor.request({ command: 'move', id: window.id, x, y: window.y });
  if (result.ok) pet.say('pushed', 3500);
  else if (result.error === 'accessibility') {
    systemPreferences.isTrustedAccessibilityClient(true);
    pet.say('accessibility', 6500);
  } else pet.say('cannotPush');
}
function syncFullscreenVisibility() {
  if (world.quitting) return;
  const ids = world.settings?.hideOnFullscreen
    ? fullscreenDisplays(world.monitor?.fullscreenWindows || world.monitor?.windows || [], world.screen.getAllDisplays(), world.monitor?.displays || []) : [];
  for (const pet of world.pets.values()) {
    if (pet.window && !pet.window.isDestroyed()) {
      pet.setFullscreenPolicy(world.settings?.hideOnFullscreen === true);
      pet.setAutoHidden(ids.length > 0);
    }
  }
}
function setLanguage(language) {
  if (!languages.includes(language)) return;
  world.settings.language = language;
  world.publish(); tray?.setToolTip(t(language, 'title')); updateApplicationMenu(); world.scheduleSave();
}
function updateApplicationMenu() {
  const label = (key) => t(world.settings.language, key);
  Menu.setApplicationMenu(Menu.buildFromTemplate([{ label: label('name'), submenu: [
    { label: label('help'), click: () => { primary()?.show(); primary()?.say('helpBubble', 6500); } },
    { type: 'separator' }, { label: label('quit'), role: 'quit', accelerator: 'CommandOrControl+Q' },
  ] }]));
}
function menu(pet = primary()) {
  const label = (key) => t(world.settings.language, key);
  const item = (id, options) => ({ id, label: label(id), ...options });
  const summonItem = item('summon', { enabled: world.pets.size < 5, click: () => {
    const bounds = pet?.bounds();
    summon(bounds ? { x: bounds.x - 90, y: bounds.y } : undefined).catch(console.error);
  } });
  const windowOptions = [
    item('windowEnabled', { type: 'checkbox', checked: world.settings.windowInteractions, click: () => {
      world.settings.windowInteractions = !world.settings.windowInteractions;
      if (!world.settings.windowInteractions) for (const other of world.pets.values()) other.leaveWindow();
      world.scheduleSave();
    } }),
    ...(pet ? [
      item('returnDesktop', { enabled: !world.paused && !pet.autoHidden, click: () => pet.returnDesktop() }),
      item('pushWindow', { enabled: Boolean(pet.support && world.monitor.available && !world.paused && !pet.autoHidden), click: () => pushWindow(pet) }),
    ] : []),
    item('restoreWindows', { click: () => restoreWindows(pet) }),
  ];
  const settingsItems = [
    item('size', { submenu: SCALES.map((scale, index) => item(['small', 'medium', 'large'][index], {
      type: 'radio', checked: world.settings.scale === scale, click: () => setScale(scale),
    })) }),
    item('roaming', { type: 'checkbox', checked: world.settings.roaming, click: () => {
      world.settings.roaming = !world.settings.roaming;
      for (const other of world.pets.values()) if (other.behaviour === 'auto') other.resume();
      world.publish(); world.scheduleSave();
    } }),
    item('fullscreenHide', { type: 'checkbox', checked: world.settings.hideOnFullscreen, click: () => {
      world.settings.hideOnFullscreen = !world.settings.hideOnFullscreen; syncFullscreenVisibility(); world.scheduleSave();
    } }),
    item('windowMenu', { submenu: windowOptions }),
    ...(pet ? [
      item('clickThrough', { type: 'checkbox', checked: pet.clickThrough, click: () => {
        pet.finishDrag(); pet.clickThrough = !pet.clickThrough; pet.ignoreMouse(); pet.publish();
        if (pet.clickThrough) pet.say('clickThroughHint', 4000);
      } }),
      item('statistics', { type: 'checkbox', checked: pet.showStats === true, click: () => { pet.showStats = !pet.showStats; pet.publish(); } }),
    ] : []),
    item('manage', { submenu: [summonItem, ...(pet ? [
      item('keepOne', { enabled: world.pets.size > 1, click: () => keepOne(pet) }),
      item('remove', { click: () => pet.remove() }),
    ] : [])] }),
    ...(pet ? [
      { id: 'visibility', label: label(pet.hidden ? 'show' : 'hide'), click: () => pet.toggleVisibility() },
      item('reset', { click: () => pet.reset() }),
      item('help', { click: () => { pet.show(); pet.say('helpBubble', 6500); } }),
    ] : []),
  ];
  const items = pet ? [
    item('play', { enabled: !world.paused && !pet.autoHidden, submenu: [
      item('touch', { click: () => pet.interact('single') }),
      item('shy', { click: () => pet.performShy() }),
      item('angry', { click: () => pet.performAngry() }),
      item('hop', { click: () => pet.interact('double') }),
    ] }),
    item('companion', { enabled: !world.paused && !pet.autoHidden, submenu: [
      ...['auto', 'follow', 'face', 'sit', 'sway'].map((behaviour) => item(behaviour, {
        type: 'radio', checked: pet.behaviour === behaviour && !pet.sleeping, click: () => {
          if (behaviour === 'auto') { world.settings.roaming = true; world.scheduleSave(); }
          pet.selectBehaviour(behaviour);
        },
      })),
      { type: 'separator' },
      { id: 'sleep', label: label(pet.sleeping ? 'wake' : 'sleep'), type: 'checkbox', checked: pet.sleeping, click: () => pet.setSleeping(!pet.sleeping) },
    ] }),
    { id: 'pause', label: label(world.paused ? 'resume' : 'pause'), type: 'checkbox', checked: world.paused, click: () => pause() },
  ] : [summonItem];
  items.push(
    item('sound', { type: 'checkbox', checked: world.settings.soundEnabled, click: () => {
      world.settings.soundEnabled = !world.settings.soundEnabled; world.publish(); world.scheduleSave();
    } }),
    { type: 'separator' }, item('settings', { submenu: settingsItems }),
    item('language', { submenu: [
      { id: 'language-zh', label: '中文', type: 'radio', checked: world.settings.language === 'zh-CN', click: () => setLanguage('zh-CN') },
      { id: 'language-ko', label: '한국어', type: 'radio', checked: world.settings.language === 'ko', click: () => setLanguage('ko') },
    ] }),
    { type: 'separator' }, item('quit', { accelerator: 'CommandOrControl+Q', click: () => app.quit() }),
  );
  return Menu.buildFromTemplate(items);
}
function wireIpc() {
  const sender = (event) => [...world.pets.values()].find((pet) => pet.window.webContents === event.sender);
  ipcMain.handle('pet:get-state', (event) => sender(event)?.state() || null);
  ipcMain.on('pet:hover', (event, value) => { if (typeof value === 'boolean') sender(event)?.setHover(value); });
  ipcMain.on('pet:interact', (event, kind) => sender(event)?.interact(kind));
  ipcMain.on('pet:performance-finished', (event, id) => { if (Number.isSafeInteger(id)) sender(event)?.finishPerformance(id); });
  ipcMain.on('pet:begin-drag', (event, offset) => sender(event)?.beginDrag(offset));
  ipcMain.on('pet:end-drag', (event) => sender(event)?.finishDrag());
  ipcMain.on('pet:menu', (event) => {
    const pet = sender(event); if (!pet) return;
    openMenu(pet);
  });
}
function tick() {
  const now = performance.now(), dt = clamp((now - lastTime) / 1000, 0, 0.1); lastTime = now;
  if (!world.paused && !world.suspended && !world.menuOpen) {
    world.time += dt * 1000;
    for (const pet of world.pets.values()) pet.update(dt);
  }
  if (now - statsAt > 300) { statsAt = now; syncFullscreenVisibility(); world.publish(); }
}
async function start() {
  world.settings = readSettings(configPath());
  if (smoke) world.settings.roaming = false;
  world.monitor = new WindowMonitor(app, syncFullscreenVisibility);
  wireIpc();
  const pet = await summon(world.settings.position, world.settings.sleeping);
  const image = nativeImage.createFromPath(path.join(__dirname, '../build/trayTemplate.png')).resize({ width: 18, height: 18 });
  image.setTemplateImage(true); tray = new Tray(image); tray.setToolTip(t(world.settings.language, 'title')); updateApplicationMenu();
  tray.on('click', () => openMenu()); tray.on('right-click', () => openMenu());
  if (!smoke) {
    globalShortcut.register('CommandOrControl+Shift+T', () => {
      if (!primary()) { summon().catch(console.error); return; }
      const reveal = [...world.pets.values()].some((item) => item.hidden || item.autoHidden || item.clickThrough);
      for (const item of world.pets.values()) { if (reveal) item.show(); else item.toggleVisibility(); }
    });
    if (!world.settings.welcomeSeen) {
      pet.say('welcome', 6500);
      world.settings.welcomeSeen = true; world.scheduleSave();
    }
  }
  const recover = () => { popup.close(); for (const item of world.pets.values()) item.recoverDisplay(); world.scheduleSave(); };
  screen.on('display-removed', recover); screen.on('display-metrics-changed', recover);
  powerMonitor.on('suspend', () => { for (const item of world.pets.values()) item.finishDrag(); world.suspended = true; save(); });
  powerMonitor.on('resume', () => { world.suspended = false; lastTime = performance.now(); recover(); });
  timer = setInterval(tick, 16);
  if (smoke) await require('./smoke.cjs')({ world, pet, summon, keepOne, pause, setScale, menu, save, configPath, setLanguage, syncFullscreenVisibility, popup, openMenu });
}
if (!smoke && !app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', () => { if (primary()) primary().show(); else summon().catch(console.error); });
  app.whenReady().then(async () => { app.dock?.hide(); await start(); })
    .catch((error) => { console.error(error); app.exit(1); });
}
app.on('before-quit', (event) => {
  if (world.quitting) return;
  event.preventDefault(); world.quitting = true; popup.destroy();
  save(); clearTimeout(saveTimer); clearInterval(timer); globalShortcut.unregisterAll();
  Promise.resolve(world.monitor?.request({ command: 'restore' })).finally(() => { world.monitor?.close(); app.quit(); });
});
// Removing the final pet leaves the menu-bar rabbit available to summon another.
app.on('window-all-closed', () => {});
