'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { normalizeSettings, readSettings, writeSettings } = require('../src/settings.cjs');

test('missing and corrupted preferences fall back to a usable pet', (context) => {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'torami-settings-'));
  context.after(() => fs.rmSync(folder, { recursive: true, force: true }));
  const file = path.join(folder, 'settings.json');
  assert.equal(readSettings(file).scale, 1);
  fs.writeFileSync(file, '{bad json');
  assert.equal(readSettings(file).sleeping, false);
  assert.equal(readSettings(file).position, null);
});

test('invalid size and coordinates never reach native window APIs', () => {
  assert.deepEqual(normalizeSettings({ scale: 30, sleeping: 'true', position: { x: NaN, y: 2 } }), {
    version: 1, language: 'zh-CN', scale: 1, sleeping: false, soundEnabled: true, roaming: true, windowInteractions: true, hideOnFullscreen: true, welcomeSeen: false, position: null,
  });
});

test('preferences survive an atomic save and reload', (context) => {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'torami-settings-'));
  context.after(() => fs.rmSync(folder, { recursive: true, force: true }));
  const file = path.join(folder, 'nested/settings.json');
  writeSettings(file, { language: 'ko', hideOnFullscreen: false, scale: 1.25, sleeping: true, soundEnabled: false, welcomeSeen: true, position: { x: -123.6, y: 56.2 } });
  assert.deepEqual(readSettings(file), { version: 1, language: 'ko', scale: 1.25, sleeping: true, soundEnabled: false, roaming: true, windowInteractions: true, hideOnFullscreen: false, welcomeSeen: true,
    position: { x: -124, y: 56 } });
  assert.ok(!fs.existsSync(`${file}.tmp`));
});
