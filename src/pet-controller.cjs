'use strict';
const { BrowserWindow } = require('electron');
const path = require('node:path');
const { clamp, clampPosition, limits, stepBody } = require('./physics.cjs');
const { footInset, feetY, exposedSurfaces, contains, nearSurface, crossedSurface, walkStep, windowWalkStep } = require('./surfaces.cjs');
const { angry } = require('./pet/performance.js');

class Pet {
  constructor(world, id) {
    this.world = world; this.id = id;
    this.mode = 'idle'; this.behaviour = 'auto'; this.direction = -1;
    this.hidden = false; this.autoHidden = false; this.clickThrough = false; this.hovering = false;
    this.sleeping = false; this.loaded = false;
    this.body = null; this.drag = null; this.support = null;
    this.reaction = null; this.nextAt = world.time + 6000;
    this.performanceId = 0; this.activePerformance = null;
    this.stats = { touches: 0, drags: 0, distance: 0, born: world.time };
  }
  size() { return { width: Math.round(260 * this.world.settings.scale), height: Math.round(320 * this.world.settings.scale) }; }
  area() { return this.world.screen.getDisplayMatching(this.window.getBounds()).workArea; }
  bounds() { return this.window.getBounds(); }
  surfaces() {
    return this.world.settings.windowInteractions
      ? exposedSurfaces(this.world.monitor?.windows || [], this.size(), this.area()) : [];
  }
  state() {
    return { id: this.id, mode: this.mode, behaviour: this.behaviour, scale: this.world.settings.scale,
      language: this.world.settings.language,
      sleeping: this.sleeping, soundEnabled: this.world.settings.soundEnabled,
      hidden: this.hidden || this.autoHidden, clickThrough: this.clickThrough, paused: this.world.paused || this.world.menuOpen,
      direction: this.direction, airborne: Boolean(this.body || this.drag),
      showStats: this.showStats === true, stats: { ...this.stats, age: Math.floor((this.world.time - this.stats.born) / 1000),
        count: this.world.pets.size, x: this.bounds().x, y: this.bounds().y, surface: this.support ? 'window' : 'desktop' } };
  }
  publish() { if (this.loaded && !this.window.isDestroyed()) this.window.webContents.send('pet:state', this.state()); }
  effect(value) { if (this.loaded && !this.window.isDestroyed()) this.window.webContents.send('pet:effect', value); }
  say(textKey, duration, params) { this.effect({ textKey, params, duration }); }
  setMode(mode) {
    if (mode !== 'angry') this.activePerformance = null;
    const changed = this.mode !== mode;
    this.mode = mode;
    if (changed) this.publish();
  }
  after(ms, callback) { this.reaction = { at: this.world.time + ms, callback }; }
  resume() {
    this.reaction = null;
    this.setMode(this.body ? 'falling' : this.sleeping ? 'sleeping'
      : this.behaviour === 'sit' || this.behaviour === 'face' ? 'sitting'
        : this.behaviour === 'sway' ? 'swaying' : this.support ? 'walking' : 'idle');
    this.nextAt = this.world.time + 4500 + Math.random() * 4500;
  }
  put(point, area = this.area()) {
    const next = clampPosition(point, this.size(), area);
    const old = this.bounds();
    this.window.setPosition(next.x, next.y, false);
    this.stats.distance += Math.hypot(next.x - old.x, next.y - old.y);
    return next;
  }
  ignoreMouse() {
    if (this.window && !this.window.isDestroyed()) this.window.setIgnoreMouseEvents(!this.world.menuOpen && (this.clickThrough || (!this.hovering && !this.drag)), { forward: true });
  }
  setHover(value) { if (value === this.hovering) return; this.hovering = value; this.ignoreMouse(); }
  syncVisibility() {
    if (this.hidden || this.autoHidden) this.window.hide(); else this.window.showInactive();
    this.ignoreMouse(); this.publish();
  }
  setAutoHidden(value) {
    if (this.autoHidden === value) return;
    if (value) this.finishDrag();
    this.autoHidden = value; this.syncVisibility();
  }
  setFullscreenPolicy(hide) {
    if (process.platform !== 'darwin' || this.fullscreenPolicy === hide) return;
    this.fullscreenPolicy = hide;
    // Also let macOS keep the pet out of native fullscreen Spaces, so a
    // transition cannot briefly reveal it while the window monitor catches up.
    this.window.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: !hide, skipTransformProcessType: true });
  }
  show() { this.hidden = false; this.clickThrough = false; this.syncVisibility(); }
  toggleVisibility() {
    if (this.hidden) { this.show(); return; }
    this.finishDrag(); this.hidden = true; this.syncVisibility();
  }
  fall(vx = 0, vy = 0, ignoreWindow = null) {
    const { x, y } = this.bounds();
    this.support = null; this.ignoreWindow = ignoreWindow;
    this.body = { x, y, vx, vy };
  }
  attach(surface) {
    this.body = null; this.support = { ...surface };
    this.put({ x: this.bounds().x, y: surface.y - this.size().height + footInset(this.size()) });
    this.setMode('landing'); this.after(430, () => this.resume());
    this.world.scheduleSave();
  }
  leaveWindow() {
    if (!this.support) return;
    const id = this.support.id;
    this.reaction = null;
    this.fall(this.direction * 180, -160, id);
    this.setMode('falling');
  }
  returnDesktop() {
    this.finishDrag(); this.sleeping = false; this.behaviour = 'auto';
    if (this.support) this.leaveWindow();
    else { this.fall(0, 0, this.ignoreWindow); this.setMode('falling'); }
    this.say('desktopBubble');
  }
  beginDrag(offset) {
    if (this.world.paused || this.autoHidden || this.drag || this.clickThrough || !offset || !Number.isFinite(offset.x) || !Number.isFinite(offset.y)) return;
    const size = this.size();
    if (offset.x < 0 || offset.x > size.width || offset.y < 0 || offset.y > size.height) return;
    this.body = null; this.support = null; this.reaction = null;
    this.sleeping = false; this.behaviour = 'auto';
    const now = performance.now();
    this.drag = { offset, vx: 0, vy: 0, lastMove: now, last: { ...this.world.screen.getCursorScreenPoint(), time: now } };
    this.stats.drags += 1;
    this.setMode('dragging'); this.ignoreMouse();
  }
  finishDrag() {
    if (!this.drag) return;
    const velocity = this.drag; this.drag = null; this.ignoreMouse();
    const fresh = performance.now() - velocity.lastMove < 120;
    const surface = nearSurface(this.bounds(), this.size(), this.surfaces(), 36 * this.world.settings.scale);
    if (surface && (!fresh || Math.abs(velocity.vy) < 450)) this.attach(surface);
    else { this.fall(fresh ? velocity.vx : 0, fresh ? velocity.vy : 0); this.setMode('falling'); }
  }
  setSleeping(value) {
    this.finishDrag(); this.reaction = null; this.sleeping = value; this.behaviour = 'auto';
    this.setMode(value ? 'sleeping' : this.body ? 'falling' : this.support ? 'walking' : 'idle');
    this.nextAt = this.world.time + 7000;
    this.say(value ? 'sleepBubble' : 'wakeBubble'); this.world.scheduleSave();
  }
  selectBehaviour(behaviour) {
    if (!['auto', 'follow', 'face', 'sit', 'sway'].includes(behaviour)) return;
    this.finishDrag(); this.sleeping = false; this.behaviour = behaviour; this.reaction = null;
    this.resume(); this.publish();
    if (behaviour === 'follow') this.say('followBubble');
  }
  interact(kind) {
    if (this.world.paused || this.drag || this.autoHidden) return;
    if (kind === 'angry') { this.performAngry(); return; }
    if (kind === 'shy') { this.performShy(); return; }
    if (!['single', 'double'].includes(kind)) return;
    this.stats.touches += 1;
    if (this.sleeping) { this.setSleeping(false); return; }
    this.reaction = null; this.setMode('happy');
    const double = kind === 'double';
    this.effect({ kind: 'love', count: double ? 9 : 5, textKey: double ? 'hopBubble' : 'loveBubble' });
    if (double) this.fall(0, -300, this.support?.id);
    this.after(double ? 1800 : 1300, () => this.resume());
  }
  performAngry() {
    if (this.drag || this.mode === 'angry' || this.world.paused || this.autoHidden) return;
    if (this.hidden) this.show();
    this.reaction = null; this.sleeping = false;
    this.activePerformance = ++this.performanceId;
    this.setMode('angry');
    this.effect({ kind: 'angry', id: this.activePerformance, soundEnabled: this.world.settings.soundEnabled });
    const id = this.activePerformance;
    this.after((angry.duration + 5) * 1000, () => this.finishPerformance(id));
  }
  finishPerformance(id) {
    if (id !== this.activePerformance || this.mode !== 'angry') return;
    this.resume();
  }
  performShy(quiet = false) {
    if (this.drag || this.mode === 'shy' || this.world.paused || this.autoHidden) return;
    if (this.hidden) this.show();
    this.sleeping = false; this.reaction = null; this.setMode('shy');
    if (!quiet) this.say('shyBubble', 3000);
    this.after(3500, () => this.resume());
  }
  setScale() {
    this.finishDrag();
    const old = this.bounds();
    const next = this.size();
    const oldFeet = old.y + old.height - old.height * 0.06675;
    const point = clampPosition({ x: old.x + (old.width - next.width) / 2,
      y: this.support ? oldFeet - next.height + footInset(next) : old.y + old.height - next.height }, next, this.area());
    this.window.setBounds({ ...point, ...next }, false);
    this.body = null; this.resume();
    if (!this.support && this.bounds().y < limits(this.area(), next).floor - 1) { this.fall(); this.setMode('falling'); }
    this.publish();
  }
  reset() {
    this.drag = null; this.body = null; this.support = null; this.ignoreWindow = null;
    this.reaction = null; this.behaviour = 'auto';
    const area = this.world.screen.getDisplayNearestPoint(this.world.screen.getCursorScreenPoint()).workArea;
    const size = this.size();
    this.put({ x: area.x + area.width - size.width - 34 - (this.id - 1) * 70,
      y: area.y + area.height - size.height }, area);
    this.show(); this.resume(); this.world.scheduleSave();
  }
  recoverDisplay() {
    this.finishDrag(); this.support = null;
    this.put(this.bounds()); this.fall(); this.resume();
  }
  walk(dt, target) {
    const size = this.size(), area = this.area(), edges = limits(area, size);
    let { x } = this.bounds();
    if (target !== undefined) {
      const delta = target - (x + size.width / 2);
      if (Math.abs(delta) < 35 * this.world.settings.scale) { this.setMode('sitting'); return; }
      this.direction = Math.sign(delta);
    }
    this.setMode('walking');
    const speed = (target === undefined ? 60 : 105) * this.world.settings.scale;
    if (this.support) {
      const step = windowWalkStep(x, this.direction, speed, dt, this.support, size, area);
      this.put({ x: step.x, y: this.bounds().y });
      if (step.atEdge) this.leaveWindow();
      return;
    }
    const step = walkStep(x, this.direction, speed, dt, edges.left, edges.right);
    if (this.direction !== step.direction) { this.direction = step.direction; this.publish(); }
    this.put({ x: step.x, y: this.bounds().y });
  }
  update(dt) {
    if (this.hidden || this.autoHidden) return;
    if (this.drag) {
      const cursor = this.world.screen.getCursorScreenPoint(), now = performance.now();
      this.put({ x: cursor.x - this.drag.offset.x, y: cursor.y - this.drag.offset.y }, this.world.screen.getDisplayNearestPoint(cursor).workArea);
      const sampleDt = Math.max(0.008, (now - this.drag.last.time) / 1000);
      if (cursor.x !== this.drag.last.x || cursor.y !== this.drag.last.y) {
        this.drag.vx = clamp((cursor.x - this.drag.last.x) / sampleDt, -1200, 1200);
        this.drag.vy = clamp((cursor.y - this.drag.last.y) / sampleDt, -1200, 1200);
        this.drag.lastMove = now;
      } else if (now - this.drag.lastMove > 90) { this.drag.vx = 0; this.drag.vy = 0; }
      this.drag.last = { ...cursor, time: now }; return;
    }
    if (this.support) {
      const previous = this.support;
      const candidates = this.surfaces().filter((item) => item.id === previous.id);
      const shift = candidates.length ? candidates[0].windowX - previous.windowX : 0;
      const shiftedPoint = { ...this.bounds(), x: this.bounds().x + shift };
      const surface = candidates.find((item) => contains(item, shiftedPoint, this.size()));
      if (!surface) { this.fall(); this.setMode('falling'); }
      else {
        this.support = surface;
        this.put({ x: shiftedPoint.x, y: surface.y - this.size().height + footInset(this.size()) });
      }
    }
    if (this.body) {
      const previous = this.body;
      this.body = stepBody(previous, this.size(), this.area(), dt);
      const surface = crossedSurface(previous, this.body, this.size(), this.surfaces(), this.ignoreWindow);
      if (surface) this.attach(surface);
      else {
        this.put(this.body);
        if (this.body.resting) {
          this.body = null; this.ignoreWindow = null;
          if (this.mode === 'falling') { this.setMode('landing'); this.after(430, () => this.resume()); }
          this.world.scheduleSave();
        }
      }
    }
    if (this.reaction && this.world.time >= this.reaction.at) {
      const callback = this.reaction.callback; this.reaction = null; callback();
    }
    if (this.body || this.reaction || this.sleeping) return;
    const cursor = this.world.screen.getCursorScreenPoint();
    if (this.behaviour === 'face' || this.behaviour === 'follow') {
      const direction = cursor.x < this.bounds().x + this.size().width / 2 ? -1 : 1;
      if (direction !== this.direction) { this.direction = direction; this.publish(); }
    }
    if (this.behaviour === 'follow') { this.walk(dt, cursor.x); return; }
    // A deliberate window placement always starts the stroll, even when random
    // desktop roaming is disabled. Reactions and sleeping pause it above.
    if (this.support && this.behaviour === 'auto') { this.walk(dt); return; }
    if (this.behaviour !== 'auto' || !this.world.settings.roaming) return;
    if (this.world.time >= this.nextAt) {
      const choice = Math.random();
      if (choice < 0.47) {
        this.direction = Math.random() < 0.5 ? -1 : 1; this.setMode('walking');
        this.nextAt = this.world.time + 3500 + Math.random() * 5500;
      } else if (choice < 0.68) { this.performShy(true); }
      else {
        this.setMode(choice < 0.84 ? 'sitting' : 'swaying');
        this.nextAt = this.world.time + 4000 + Math.random() * 4500;
      }
    }
    if (this.mode === 'walking') this.walk(dt);
  }
  async create(point, sleeping = false) {
    this.sleeping = sleeping; this.mode = sleeping ? 'sleeping' : 'idle';
    const display = point ? this.world.screen.getDisplayNearestPoint(point) : this.world.screen.getPrimaryDisplay();
    const area = display.workArea, size = this.size();
    const initial = clampPosition(point || { x: area.x + area.width - size.width - 34, y: area.y + area.height - size.height }, size, area);
    this.window = new BrowserWindow({ ...size, ...initial, title: `兔岚咪 ${this.id}`,
      transparent: true, frame: false, hasShadow: false, alwaysOnTop: true,
      resizable: false, maximizable: false, fullscreenable: false, focusable: true, acceptFirstMouse: true,
      skipTaskbar: true, show: false, backgroundColor: '#00000000',
      webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false,
        sandbox: true, backgroundThrottling: false, spellcheck: false, devTools: !this.world.app.isPackaged,
        autoplayPolicy: 'no-user-gesture-required' } });
    this.window.setAlwaysOnTop(true, 'floating');
    this.setFullscreenPolicy(this.world.settings.hideOnFullscreen === true);
    this.window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    this.window.webContents.on('will-navigate', (event) => event.preventDefault());
    this.window.webContents.session.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
    this.window.webContents.on('render-process-gone', (_event, details) => {
      if (!this.world.quitting && details.reason !== 'clean-exit') { this.loaded = false; this.window.reload(); }
    });
    this.window.webContents.on('did-finish-load', () => { this.loaded = true; this.resume(); this.publish(); });
    await this.window.loadFile(path.join(__dirname, 'pet/index.html'));
    this.world.syncFullscreenVisibility?.(); this.syncVisibility();
    if (initial.y < limits(area, size).floor - 1) { this.fall(); this.setMode('falling'); }
    this.window.on('close', (event) => { if (!this.world.quitting && !this.removing) { event.preventDefault(); this.toggleVisibility(); } });
    this.window.on('closed', () => { this.world.pets.delete(this.id); this.world.publish(); });
    return this;
  }
  remove() {
    this.removing = true; this.drag = null; this.body = null; this.reaction = null;
    this.window.destroy();
  }
}
module.exports = { Pet };
