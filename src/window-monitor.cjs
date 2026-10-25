'use strict';
const { spawn } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');
const { createInterface } = require('node:readline');

class WindowMonitor {
  constructor(app, onUpdate, excludedPID = process.pid) {
    this.windows = [];
    this.fullscreenWindows = [];
    this.displays = [];
    this.available = false;
    this.onUpdate = onUpdate;
    this.pending = new Map();
    this.sequence = 0;
    const binary = app.isPackaged ? path.join(process.resourcesPath, 'window-surfaces')
      : path.join(__dirname, '../build/window-surfaces');
    if (process.platform !== 'darwin' || !fs.existsSync(binary)) return;
    this.process = spawn(binary, [String(excludedPID)], { stdio: ['pipe', 'pipe', 'ignore'] });
    createInterface({ input: this.process.stdout }).on('line', (line) => {
      try {
        const result = JSON.parse(line);
        if (Array.isArray(result.windows)) {
          this.windows = result.windows;
          this.fullscreenWindows = Array.isArray(result.fullscreenWindows) ? result.fullscreenWindows : result.windows;
          this.displays = Array.isArray(result.displays) ? result.displays : [];
          this.available = true;
          this.accessibility = result.accessibility === true;
          this.movedCount = result.movedCount || 0;
          this.onUpdate?.();
        }
        const request = this.pending.get(result.request);
        if (request) { clearTimeout(request.timer); this.pending.delete(result.request); request.resolve(result); }
      } catch { /* Ignore malformed helper output, never evaluate it. */ }
    });
    this.process.stdin.on('error', () => {});
    this.process.on('error', () => this.offline());
    this.process.on('exit', () => this.offline());
    this.timer = setInterval(() => { if (!this.polling) this.poll(); }, 500);
    this.poll();
  }
  offline() {
    clearInterval(this.timer);
    this.available = false;
    this.windows = [];
    this.fullscreenWindows = [];
    this.displays = [];
    for (const request of this.pending.values()) { clearTimeout(request.timer); request.resolve({ ok: false }); }
    this.pending.clear();
    this.onUpdate?.();
  }
  async poll() {
    this.polling = true;
    await this.request({ command: 'list' });
    this.polling = false;
  }
  request(command) {
    if (!this.process || this.process.killed || !this.process.stdin.writable) return Promise.resolve({ ok: false });
    const request = ++this.sequence;
    return new Promise((resolve) => {
      const timer = setTimeout(() => { this.pending.delete(request); resolve({ ok: false, error: 'timeout' }); }, 2000);
      this.pending.set(request, { resolve, timer });
      this.process.stdin.write(JSON.stringify({ ...command, request }) + '\n');
    });
  }
  close() {
    const child = this.process;
    if (child?.stdin.writable) child.stdin.end(JSON.stringify({ command: 'quit' }) + '\n');
    const force = setTimeout(() => { if (child && child.exitCode === null) child.kill(); }, 1500);
    force.unref();
    this.offline();
  }
}
module.exports = { WindowMonitor };
