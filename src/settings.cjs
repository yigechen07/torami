'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { normalizeLanguage } = require('./pet/i18n.js');
const SCALES = [0.75, 1, 1.25];

function normalizeSettings(value) {
  const source = value && typeof value === 'object' ? value : {};
  const point = source.position;
  return {
    version: 1,
    language: normalizeLanguage(source.language),
    scale: SCALES.includes(source.scale) ? source.scale : 1,
    sleeping: source.sleeping === true,
    soundEnabled: source.soundEnabled !== false,
    roaming: source.roaming !== false,
    windowInteractions: source.windowInteractions !== false,
    hideOnFullscreen: source.hideOnFullscreen !== false,
    welcomeSeen: source.welcomeSeen === true,
    position: point && Number.isFinite(point.x) && Number.isFinite(point.y)
      ? { x: Math.round(point.x), y: Math.round(point.y) } : null,
  };
}

function readSettings(file) {
  try { return normalizeSettings(JSON.parse(fs.readFileSync(file, 'utf8'))); }
  catch { return normalizeSettings(null); }
}

function writeSettings(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temporary = `${file}.tmp`;
  fs.writeFileSync(temporary, JSON.stringify(normalizeSettings(value), null, 2) + '\n');
  fs.renameSync(temporary, file);
}

module.exports = { SCALES, normalizeSettings, readSettings, writeSettings };
