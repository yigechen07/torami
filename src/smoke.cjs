'use strict';
module.exports = async ({ world, pet, summon, keepOne, pause, setScale, menu, save, configPath, setLanguage, syncFullscreenVisibility, popup, openMenu }) => {
  const assert = require('node:assert/strict');
  const { BrowserWindow } = require('electron');
  const fs = require('node:fs');
  const path = require('node:path');
  const { execFileSync } = require('node:child_process');
  const { footInset, feetY } = require('./surfaces.cjs');
  const { readSettings } = require('./settings.cjs');
  const wait = (time) => new Promise((resolve) => setTimeout(resolve, time));
  const until = async (check, message, timeout = 5000) => {
    const start = performance.now();
    while (!(await check())) { if (performance.now() - start > timeout) assert.fail(message); await wait(30); }
  };
  const inspect = (code) => pet.window.webContents.executeJavaScript(code);
  const mode = () => inspect("document.querySelector('#pet').dataset.mode");
  const output = path.join(world.app.getPath('userData'), 'screenshots');
  fs.mkdirSync(output, { recursive: true });
  const capture = async (name) => { await wait(50); fs.writeFileSync(path.join(output, `${name}.png`), (await pet.window.webContents.capturePage()).toPNG()); };
  const media = () => inspect(`(() => { const a = document.querySelector('#hmph-audio'); const p = document.querySelector('#pet');
    return { duration: a.duration, time: a.currentTime, paused: a.paused, phase: p.dataset.phase, audio: p.dataset.audio }; })()`);
  const checked = [];
  const armGeometry = () => inspect(`(() => {
    const arms = [...document.querySelectorAll('.gesture-arms path')];
    return { front: Boolean(document.querySelector('.head').compareDocumentPosition(document.querySelector('.gesture-arms')) & Node.DOCUMENT_POSITION_FOLLOWING),
      solid: arms.every(arm => getComputedStyle(arm).fill !== 'none'),
      clearFace: arms.every(arm => [[93,174], [164,174], [129,192]].every(([x,y]) => !arm.isPointInFill(new DOMPoint(x,y)))),
      shapes: arms.map(arm => getComputedStyle(arm).d),
    };
  })()`);
  await wait(250);
  assert.equal(await inspect('typeof window.require'), 'undefined');
  assert.equal(await inspect("document.querySelectorAll('#sprite svg').length"), 1);
  assert.equal(await mode(), 'idle');
  checked.push('renderer isolation and vector load');
  await capture('idle');
  await inspect("window.torami.interact('single')"); await wait(120);
  assert.equal(await mode(), 'happy'); await capture('happy');
  pet.setSleeping(true); await wait(80); assert.equal(await mode(), 'sleeping'); await capture('sleeping');
  await inspect("window.torami.interact('single')"); await wait(50); assert.equal(await mode(), 'idle');
  checked.push('touch hearts and sleep/wake');
  pet.window.webContents.setAudioMuted(true);
  assert.equal((await media()).paused, true);
  assert.ok(Math.abs((await media()).duration - 2.35) < 0.05);
  pet.performAngry(); await wait(180);
  const actId = pet.activePerformance;
  assert.equal((await media()).paused, false); await capture('angry-ears');
  const raisedArms = await armGeometry();
  assert.equal(raisedArms.front, true); assert.equal(raisedArms.solid, true); assert.equal(raisedArms.clearFace, true);
  pause(true); await wait(50);
  const frozenAudio = await media(), frozenBounds = pet.bounds();
  await wait(350);
  assert.equal((await media()).paused, true);
  assert.ok(Math.abs((await media()).time - frozenAudio.time) < 0.01);
  assert.equal((await media()).phase, frozenAudio.phase);
  assert.deepEqual(pet.bounds(), frozenBounds);
  assert.equal(await inspect("getComputedStyle(document.querySelector('#sprite')).animationPlayState"), 'paused');
  pause(false);
  await until(async () => (await media()).phase === 'hmph', 'hmph must follow the actual voice');
  await wait(270);
  const cheekArms = await armGeometry();
  assert.equal(cheekArms.clearFace, true); assert.notDeepEqual(cheekArms.shapes, raisedArms.shapes, 'filled arms must bend down to the cheeks');
  await capture('angry-hmph');
  checked.push('complete filled foreground arms, bending transition and clear eyes/mouth');
  pet.performAngry(); assert.equal(pet.activePerformance, actId);
  await until(async () => await mode() === 'idle', 'voice should finish');
  assert.equal((await media()).paused, true);
  checked.push('original voice decode, synchronized gestures, no overlap, complete pause/resume');
  world.settings.soundEnabled = false; world.publish(); pet.performAngry(); await wait(120);
  assert.equal((await media()).audio, 'muted'); assert.equal((await media()).paused, true);
  pet.finishPerformance(actId); assert.equal(pet.mode, 'angry');
  pause(true); await wait(100); const mutedPhase = (await media()).phase; await wait(300);
  assert.equal((await media()).phase, mutedPhase); pause(false);
  pet.setSleeping(true); await wait(50); assert.equal((await media()).phase, undefined);
  pet.setSleeping(false); world.settings.soundEnabled = true; world.publish();
  pet.performAngry(); await wait(120); assert.equal((await media()).paused, false);
  pet.setSleeping(true); await wait(50); assert.equal((await media()).paused, true);
  pet.setSleeping(false);
  checked.push('mute, stale completion rejected, action interruption');
  pet.performShy(); await wait(500); assert.equal(await mode(), 'shy');
  const shy = await inspect(`({ folded: getComputedStyle(document.querySelector('.folded-ears')).opacity,
    upright: getComputedStyle(document.querySelector('.ear-left')).opacity,
    audioPaused: document.querySelector('#hmph-audio').paused })`);
  assert.deepEqual(shy, { folded: '1', upright: '0', audioPaused: true });
  await capture('shy'); pet.interact('single'); await wait(50); assert.equal(await mode(), 'happy');
  checked.push('ears cover eyes and touch interrupts shyness');
  pet.selectBehaviour('sit'); await wait(50); assert.equal(await mode(), 'sitting'); await capture('sitting');
  pet.selectBehaviour('sway'); await wait(250); assert.equal(await mode(), 'swaying'); await capture('swaying');
  const nativeScreen = world.screen;
  let cursor = { x: pet.bounds().x - 300, y: pet.bounds().y };
  world.screen = { getCursorScreenPoint: () => cursor,
    getAllDisplays: () => nativeScreen.getAllDisplays(),
    getDisplayMatching: (...args) => nativeScreen.getDisplayMatching(...args),
    getDisplayNearestPoint: (...args) => nativeScreen.getDisplayNearestPoint(...args) };
  pet.selectBehaviour('face'); await wait(60); assert.equal(pet.direction, -1);
  cursor = { x: pet.bounds().x + pet.size().width + 300, y: cursor.y };
  await wait(60); assert.equal(pet.direction, 1);
  const area = pet.area(); pet.put({ x: area.x + 300, y: area.y + area.height - pet.size().height });
  pet.selectBehaviour('follow'); cursor = { x: pet.bounds().x + 500, y: 0 };
  const beforeFollow = pet.bounds().x; await wait(300); assert.ok(pet.bounds().x > beforeFollow + 10);
  pause(true); const still = pet.bounds(); await wait(300); assert.deepEqual(pet.bounds(), still); pause(false);
  pet.selectBehaviour('auto'); world.settings.roaming = true; pet.nextAt = world.time + 100000; pet.setMode('walking');
  const beforeWalk = pet.bounds().x; await wait(300); assert.ok(pet.bounds().x !== beforeWalk); await capture('walking');
  world.settings.roaming = false; pet.resume();
  checked.push('sit, sway, face cursor, follow cursor, autonomous walk');
  pet.showStats = true; pet.publish(); await wait(60);
  assert.equal(await inspect("document.querySelector('#statistics').hidden"), false);
  assert.match(await inspect("document.querySelector('#statistics').textContent"), /摸摸 3 次/);
  await capture('statistics'); pet.showStats = false; pet.publish();
  const second = await summon({ x: area.x + 100, y: area.y + area.height - pet.size().height });
  assert.equal(world.pets.size, 2); second.setSleeping(true); assert.equal(pet.sleeping, false);
  second.performShy(); assert.equal(second.mode, 'shy'); assert.notEqual(pet.mode, 'shy');
  keepOne(pet); assert.equal(world.pets.size, 1);
  checked.push('live statistics, multiple independent pets and keep one');
  const rootItems = menu(pet).items.filter((item) => item.type !== 'separator');
  assert.deepEqual(rootItems.map((item) => item.id), ['play', 'companion', 'pause', 'sound', 'settings', 'language', 'quit']);
  const clickItem = (id) => { const item = menu(pet).getMenuItemById(id); assert.ok(item, id); item.click(); };
  clickItem('language-ko'); await wait(80);
  assert.equal(await inspect('document.documentElement.lang'), 'ko');
  assert.match(await inspect('document.title'), /토라뮈/);
  assert.equal(menu(pet).getMenuItemById('play').label, '놀아 주기');
  clickItem('statistics'); await wait(50);
  assert.match(await inspect("document.querySelector('#statistics').textContent"), /쓰담 3번/);
  assert.doesNotMatch(await inspect("document.querySelector('#statistics').textContent"), /\p{Script=Han}/u);
  await capture('korean-statistics'); clickItem('statistics');
  clickItem('shy'); await wait(450);
  assert.match(await inspect("document.querySelector('#bubble-text').textContent"), /부끄러워/);
  await capture('korean-shy');
  clickItem('language-zh'); await wait(50);
  assert.equal(await mode(), 'shy', 'switching languages must not interrupt the current action');
  assert.match(await inspect("document.querySelector('#bubble-text').textContent"), /害羞/);
  pet.selectBehaviour('sit'); pet.performAngry(); await wait(100);
  const audioBeforeLanguage = (await media()).time;
  setLanguage('ko'); await wait(100);
  assert.equal((await media()).paused, false);
  assert.ok((await media()).time > audioBeforeLanguage, 'language switching must not restart the voice');
  save(); assert.equal(readSettings(configPath()).language, 'ko');
  setLanguage('zh-CN'); pet.selectBehaviour('auto');
  checked.push('seven-item menu, live Chinese/Korean menus, bubbles, stats, saved language, uninterrupted voice');
  pet.body = null; pet.support = null; pet.reaction = null;
  pet.setMode('walking');
  const heldBounds = pet.bounds(), heldTime = world.time;
  openMenu(pet); await wait(200);
  assert.equal(world.menuOpen, true);
  assert.deepEqual(popup.host.getBounds(), world.screen.getDisplayNearestPoint(world.screen.getCursorScreenPoint()).workArea);
  assert.equal(pet.window.isAlwaysOnTop(), false, 'the pet must not cover native submenus');
  assert.deepEqual(pet.bounds(), heldBounds); assert.equal(world.time, heldTime);
  assert.equal(await inspect("getComputedStyle(document.querySelector('#sprite')).animationPlayState"), 'paused');
  popup.close(); await wait(80);
  assert.equal(world.menuOpen, false); assert.equal(popup.host.isVisible(), false);
  assert.equal(pet.window.isAlwaysOnTop(), true);
  assert.ok(world.time > heldTime);
  const actionMenu = openMenu(pet); await wait(50);
  actionMenu.getMenuItemById('angry').click(); await wait(100);
  assert.equal(world.menuOpen, false, 'selecting an item must close the entire menu session');
  assert.equal(popup.host.isVisible(), false);
  assert.equal((await media()).paused, false, 'a menu action must start after the temporary menu pause ends');
  pet.selectBehaviour('auto');
  pause(true); openMenu(pet); await wait(50); popup.close(); await wait(50);
  assert.equal(world.paused, true, 'closing a menu must preserve the manual pause choice');
  pause(false); pet.resume();
  checked.push('display-sized menu owner, pet below menus, frozen position, popup cleanup and pause restored');
  const oldBounds = pet.bounds(); setScale(0.75);
  assert.equal(pet.bounds().width, 195);
  assert.equal(pet.bounds().y + pet.bounds().height, oldBounds.y + oldBounds.height); setScale(1);
  world.settings.windowInteractions = false;
  pet.put({ x: area.x + 200, y: area.y + 50 }); pet.fall(180, 0); pet.setMode('falling');
  await until(() => !pet.body && pet.mode === 'idle', 'gravity must settle');
  assert.equal(pet.bounds().y + pet.size().height, area.y + area.height);
  checked.push('scale anchor and gravity');
  world.settings.windowInteractions = true;
  const fixtureBounds = { x: area.x + 100, y: Math.round(area.y + Math.max(400, area.height * 0.6)), width: 700, height: 150 };
  const fixture = new BrowserWindow({ ...fixtureBounds, title: 'Torami smoke window', show: false,
    webPreferences: { sandbox: true, partition: 'torami-smoke-fixture' } });
  // The pet's session denies all renderer permissions. A disposable browser
  // fixture needs its own session and the video fullscreen permission only.
  fixture.webContents.session.setPermissionRequestHandler((_contents, permission, callback) =>
    callback(['fullscreen', 'automatic-fullscreen'].includes(permission)));
  await fixture.loadURL('data:text/html,<title>Torami smoke window</title><body style="background:%23ffeaf2">Window edge test</body>');
  fixture.show(); await wait(100);
  const binary = world.app.isPackaged ? path.join(process.resourcesPath, 'window-surfaces') : path.join(__dirname, '../build/window-surfaces');
  let nativeList, fixtureRecord;
  await until(() => {
    nativeList = JSON.parse(execFileSync(binary, ['0', '--once'], { encoding: 'utf8' }));
    const actual = fixture.getBounds();
    fixtureRecord = nativeList.windows.find((item) => Math.abs(item.x - actual.x) < 2 && Math.abs(item.y - actual.y) < 2 && Math.abs(item.width - actual.width) < 2);
    return Boolean(fixtureRecord);
  }, `native helper must read the real macOS window: ${JSON.stringify({ requested: fixtureBounds, actual: fixture.getBounds(), visible: fixture.isVisible(), mediaId: fixture.getMediaSourceId() })}`, 2500);
  const { WindowMonitor } = require('./window-monitor.cjs');
  const fixtureMonitor = new WindowMonitor(world.app, null, 0);
  await until(() => fixtureMonitor.available, 'helper protocol must start');
  const moved = await fixtureMonitor.request({ command: 'move', id: fixtureRecord.id, x: fixtureRecord.x + 80, y: fixtureRecord.y });
  if (nativeList.accessibility) {
    assert.equal(moved.ok, true, 'permitted fixture window should move');
    assert.ok(moved.windows.some((item) => item.id === fixtureRecord.id && Math.abs(item.x - fixtureRecord.x - 80) < 2));
    const restored = await fixtureMonitor.request({ command: 'restore' });
    assert.equal(restored.restored, 1);
    assert.ok(restored.windows.some((item) => item.id === fixtureRecord.id && Math.abs(item.x - fixtureRecord.x) < 2));
    checked.push('explicit window push and restore on a disposable window');
  } else {
    assert.equal(moved.error, 'accessibility', 'moving a window must require permission');
    checked.push('window movement blocked without Accessibility permission');
  }
  const originalMonitor = world.monitor;
  world.monitor = fixtureMonitor;
  fixture.setFullScreen(true);
  const { fullscreenDisplays } = require('./fullscreen.cjs');
  await until(() => fullscreenDisplays(fixtureMonitor.fullscreenWindows, nativeScreen.getAllDisplays(), fixtureMonitor.displays).length > 0,
    'native full screen must be detected', 10000);
  syncFullscreenVisibility();
  await until(() => pet.autoHidden && !pet.window.isVisible(), 'pet must automatically hide in real native full screen');
  pet.show(); assert.equal(pet.window.isVisible(), false, 'manual show cannot cover a fullscreen app');
  fixture.setFullScreen(false);
  await until(() => fullscreenDisplays(fixtureMonitor.fullscreenWindows, nativeScreen.getAllDisplays(), fixtureMonitor.displays).length === 0,
    'native full screen must end', 10000);
  syncFullscreenVisibility();
  await until(() => !pet.autoHidden && pet.window.isVisible(), 'pet must return after leaving native full screen');
  await until(() => !fixture.isFullScreen(), 'native fullscreen transition must finish before video fullscreen');
  fixture.focus();
  await fixture.webContents.executeJavaScript(`(async () => {
    const canvas = document.createElement('canvas'); canvas.width = 320; canvas.height = 180;
    const context = canvas.getContext('2d');
    const video = document.createElement('video'); video.muted = true; video.controls = true;
    video.srcObject = canvas.captureStream(1); document.body.replaceChildren(video);
    const playing = video.play();
    context.fillStyle = '#ffeaf2'; context.fillRect(0, 0, 320, 180);
    video.srcObject.getVideoTracks()[0].requestFrame?.();
    await Promise.race([playing, new Promise((_, reject) => setTimeout(() => reject(new Error('test video did not start')), 5000))]);
  })()`, true);
  await fixture.webContents.executeJavaScript(`Promise.race([
    document.querySelector('video').requestFullscreen(),
    new Promise((_, reject) => setTimeout(() => reject(new Error('test video did not enter fullscreen')), 5000))
  ])`, true);
  await until(() => fullscreenDisplays(fixtureMonitor.fullscreenWindows, nativeScreen.getAllDisplays(), fixtureMonitor.displays).length > 0,
    'video element fullscreen must be detected', 10000);
  syncFullscreenVisibility();
  await until(() => pet.autoHidden && !pet.window.isVisible(), 'video fullscreen must hide the pet');
  assert.equal(await fixture.webContents.executeJavaScript('document.fullscreenElement?.tagName'), 'VIDEO');
  await fixture.webContents.executeJavaScript(`(async () => {
    await document.exitFullscreen(); document.querySelector('video').srcObject.getTracks().forEach(track => track.stop());
  })()`);
  await until(() => fullscreenDisplays(fixtureMonitor.fullscreenWindows, nativeScreen.getAllDisplays(), fixtureMonitor.displays).length === 0,
    'video fullscreen must end', 10000);
  syncFullscreenVisibility();
  await until(() => !pet.autoHidden && pet.window.isVisible(), 'pet must return after video fullscreen');
  world.monitor = originalMonitor;
  fixtureMonitor.close();
  checked.push('real macOS fullscreen and Chromium video element fullscreen: auto hide and restore after both');
  world.monitor.close();
  await wait(100);
  const windowId = 999999;
  world.monitor = { windows: [{ id: windowId, pid: process.pid, ...fixtureBounds }], available: true,
    request: async () => ({ ok: true, restored: 0 }), close() {} };
  pet.direction = 1;
  pet.put({ x: fixtureBounds.x + 200, y: fixtureBounds.y - pet.size().height + footInset(pet.size()) + 10 });
  pet.beginDrag({ x: 130, y: 180 }); pet.drag.lastMove = 0; pet.finishDrag();
  assert.equal(pet.support?.id, windowId); assert.ok(Math.abs(feetY(pet.bounds(), pet.size()) - fixtureBounds.y) < 1);
  await capture('window-perch');
  const perchedX = pet.bounds().x;
  world.monitor.windows[0].x += 80; world.monitor.windows[0].y += 15;
  await wait(60);
  assert.equal(pet.bounds().x, perchedX + 80);
  assert.ok(Math.abs(feetY(pet.bounds(), pet.size()) - fixtureBounds.y - 15) < 1);
  await until(() => pet.mode === 'walking', 'pet must start walking after landing, with desktop roaming disabled');
  const walkingX = pet.bounds().x;
  await wait(3100);
  assert.equal(pet.support?.id, windowId, 'pet must keep walking instead of jumping after a fixed three seconds');
  assert.ok(pet.bounds().x > walkingX + 100, 'pet must visibly travel along the top');
  assert.ok(Math.abs(feetY(pet.bounds(), pet.size()) - fixtureBounds.y - 15) < 1);
  await capture('window-walking');
  let launch;
  const originalLeaveWindow = pet.leaveWindow;
  pet.leaveWindow = function () { launch = { ...this.bounds(), support: this.support, direction: this.direction }; return originalLeaveWindow.call(this); };
  await until(() => pet.body !== null, 'pet must jump only upon reaching the window edge', 6000);
  pet.leaveWindow = originalLeaveWindow;
  const expectedEdge = Math.min(area.x + area.width - pet.size().width,
    Math.floor(launch.support.right - pet.size().width * 0.6));
  assert.equal(launch.x, expectedEdge, 'takeoff must be at the window or screen edge');
  assert.equal(launch.direction, 1);
  assert.equal(pet.ignoreWindow, windowId);
  await until(() => !pet.body && !pet.support, 'jump-off must land on the desktop', 5000);
  world.monitor.windows[0].x = fixtureBounds.x; world.monitor.windows[0].y = fixtureBounds.y;
  pet.put({ x: fixtureBounds.x + 200, y: fixtureBounds.y - pet.size().height + footInset(pet.size()) - 35 });
  pet.fall(0, 100); pet.setMode('falling');
  await until(() => Boolean(pet.support), 'fall must land on a window');
  world.monitor.windows = []; await wait(50); assert.equal(pet.support, null); assert.ok(pet.body);
  fixture.destroy(); world.screen = nativeScreen;
  checked.push('native macOS window geometry, drag snap, window movement, walking beyond three seconds, edge takeoff, falling support, closed-window recovery');
  const display = nativeScreen.getDisplayMatching(pet.bounds());
  pet.body = null; pet.support = null; pet.resume();
  pet.performAngry(); await wait(100); assert.equal((await media()).paused, false);
  world.monitor.windows = [{ id: 999998, pid: 222222, ...display.bounds }]; syncFullscreenVisibility(); await wait(80);
  assert.equal(pet.autoHidden, true); assert.equal((await media()).paused, true, 'auto hide must stop the voice');
  assert.equal(pet.fullscreenPolicy, true, 'native fullscreen Spaces must also exclude the pet');
  // The actual AppKit frame reproduced on this notched Mac was y=34/h=1073,
  // while the full display was y=0/h=1107. The camera inset was 33 points.
  world.monitor.displays = [{ id: display.id, safeAreaTop: 33 }];
  world.monitor.windows = [{ id: 999996, pid: 444444, ...display.bounds,
    y: display.bounds.y + 34, height: display.bounds.height - 34 }];
  syncFullscreenVisibility(); assert.equal(pet.autoHidden, true);
  // A fullscreen window on another monitor must hide every pet too.
  world.monitor.windows = [{ id: 999997, pid: 333333, x: -2400, y: -200, width: 2400, height: 1500 }];
  world.screen = { ...nativeScreen, getAllDisplays: () => [...nativeScreen.getAllDisplays(),
    { id: -99, bounds: { x: -2400, y: -200, width: 2400, height: 1500 } }] };
  syncFullscreenVisibility(); assert.equal(pet.autoHidden, true); assert.equal(pet.window.isVisible(), false);
  world.screen = nativeScreen;
  pet.toggleVisibility(); assert.equal(pet.hidden, true);
  world.monitor.windows = []; syncFullscreenVisibility();
  assert.equal(pet.autoHidden, false); assert.equal(pet.window.isVisible(), false, 'leaving fullscreen must preserve manual hiding');
  pet.show(); assert.equal(pet.window.isVisible(), true);
  world.monitor.windows = [{ id: 999998, pid: 222222, ...display.bounds }];
  world.settings.hideOnFullscreen = false; syncFullscreenVisibility(); assert.equal(pet.window.isVisible(), true);
  assert.equal(pet.fullscreenPolicy, false, 'turning the rule off must allow native fullscreen Spaces again');
  world.settings.hideOnFullscreen = true; world.monitor.windows = []; syncFullscreenVisibility();
  checked.push('notched Mac AppKit fullscreen geometry, native Spaces policy, any visible fullscreen window hides all pets regardless of focus or monitor, stops voice, preserves manual hide, optional fullscreen rule');
  for (const id of ['follow', 'restoreWindows', 'statistics', 'pause', 'remove', 'keepOne', 'quit', 'fullscreenHide']) assert.ok(menu(pet).getMenuItemById(id));
  pet.setSleeping(true); save();
  assert.equal(readSettings(configPath()).sleeping, true); assert.equal(readSettings(configPath()).scale, 1);
  const replacement = await summon(); pet.remove(); assert.equal(world.pets.size, 1);
  replacement.remove(); assert.equal(world.pets.size, 0);
  const returned = await summon(); assert.ok(returned.loaded);
  checked.push('reference menu coverage, preferences, remove last pet and summon again');
  console.log(JSON.stringify({ ok: true, checked, screenshots: output }));
  world.app.quit();
};
