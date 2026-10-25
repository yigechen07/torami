'use strict';

const { contextBridge, ipcRenderer } = require('electron');
const subscribe = (channel, listener) => {
  if (typeof listener !== 'function') return () => {};
  const handler = (_event, value) => listener(value);
  ipcRenderer.on(channel, handler);
  return () => ipcRenderer.removeListener(channel, handler);
};

// Keep the renderer's access limited to pet actions; never expose raw IPC or files.
contextBridge.exposeInMainWorld('torami', Object.freeze({
  getState: () => ipcRenderer.invoke('pet:get-state'),
  interact: (kind) => ipcRenderer.send('pet:interact', kind),
  finishPerformance: (id) => ipcRenderer.send('pet:performance-finished', id),
  beginDrag: (offset) => ipcRenderer.send('pet:begin-drag', offset),
  endDrag: () => ipcRenderer.send('pet:end-drag'),
  setHover: (hovering) => ipcRenderer.send('pet:hover', hovering === true),
  openMenu: () => ipcRenderer.send('pet:menu'),
  onState: (listener) => subscribe('pet:state', listener),
  onEffect: (listener) => subscribe('pet:effect', listener),
}));
