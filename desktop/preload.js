// Preload — exposes screen capture + Claude proxy API to renderer
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  captureScreen: () => ipcRenderer.invoke('capture-screen'),
  callClaude: (payload) => ipcRenderer.invoke('claude-proxy', payload),
  getApiBase: () => ipcRenderer.invoke('get-api-base'),
  isElectron: true,
});
