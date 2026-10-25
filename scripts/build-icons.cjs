'use strict';
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs');
const path = require('node:path');

app.whenReady().then(async () => {
  const window = new BrowserWindow({ width: 1024, height: 1024, show: false,
    transparent: true, frame: false, webPreferences: { offscreen: true, sandbox: true } });
  await window.loadFile(path.join(__dirname, 'icon.html'));
  await window.webContents.executeJavaScript('Promise.all([...document.images].map(i => i.decode()))');
  await window.webContents.executeJavaScript('new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))');
  const icon = await window.webContents.capturePage();
  fs.writeFileSync(path.join(__dirname, '../build/icon.png'), icon.toPNG());
  window.setSize(36, 36);
  await window.loadFile(path.join(__dirname, 'tray.html'));
  await window.webContents.executeJavaScript('new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))');
  const tray = await window.webContents.capturePage();
  fs.writeFileSync(path.join(__dirname, '../build/trayTemplate.png'), tray.toPNG());
  fs.writeFileSync(path.join(__dirname, '../build/trayTemplate@2x.png'), tray.toPNG());
  window.destroy();
  app.quit();
}).catch((error) => { console.error(error); app.exit(1); });
