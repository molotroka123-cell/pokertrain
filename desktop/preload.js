// Preload script — exposes screen capture API to renderer
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  captureScreen: () => ipcRenderer.invoke('capture-screen'),
  onParserResult: (callback) => ipcRenderer.on('parser-result', (_, data) => callback(data)),
  isElectron: true,
});
