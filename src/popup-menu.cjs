'use strict';
const { BaseWindow } = require('electron');

// A pet is only 195–325 points wide. AppKit can constrain cascading submenus
// to that small transparent owner. Use a clear, display-sized native owner so
// the OS has the full screen area for placement and left/right edge flipping.
class PetMenu {
  constructor(world) { this.world = world; this.host = null; this.active = null; }
  open(menu, point = this.world.screen.getCursorScreenPoint()) {
    this.close();
    const area = this.world.screen.getDisplayNearestPoint(point).workArea;
    if (!this.host || this.host.isDestroyed()) {
      this.host = new BaseWindow({ ...area, title: 'Torami menu', transparent: true, frame: false,
        backgroundColor: '#00000000', hasShadow: false, resizable: false, minimizable: false,
        maximizable: false, fullscreenable: false, focusable: true, skipTaskbar: true, show: false });
      if (process.platform === 'darwin') this.host.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
    }
    this.host.setBounds(area, false);
    const session = { menu, finish: null };
    this.active = session;
    for (const pet of this.world.pets.values()) {
      pet.finishDrag();
      pet.window.setAlwaysOnTop(false);
    }
    this.world.menuOpen = true;
    for (const pet of this.world.pets.values()) pet.ignoreMouse();
    this.world.publish();
    const finish = () => {
      if (this.active !== session) return;
      this.active = null; this.world.menuOpen = false;
      if (this.host && !this.host.isDestroyed()) this.host.hide();
      for (const pet of this.world.pets.values()) {
        if (pet.window.isDestroyed()) continue;
        pet.window.setAlwaysOnTop(true, 'floating');
        pet.hovering = false; pet.ignoreMouse();
      }
      this.world.publish();
    };
    session.finish = finish;
    const prepare = (level) => {
      for (const item of level.items) {
        if (item.submenu) { prepare(item.submenu); continue; }
        if (item.type === 'separator' || typeof item.click !== 'function') continue;
        const action = item.click;
        item.click = (...args) => {
          // Finish the native tracking session before an action publishes new
          // state or starts a voice. This also covers keyboard selection.
          this.close();
          action(...args);
        };
      }
    };
    prepare(menu);
    this.host.show();
    try { menu.popup({ window: this.host, callback: finish }); }
    catch (error) { finish(); throw error; }
    return menu;
  }
  close() {
    if (!this.active) return;
    const session = this.active;
    try { session.menu.closePopup(this.host); } finally { session.finish(); }
  }
  destroy() {
    this.close();
    if (this.host && !this.host.isDestroyed()) this.host.destroy();
  }
}
module.exports = { PetMenu };
