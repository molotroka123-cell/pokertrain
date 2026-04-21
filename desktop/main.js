// Electron main process — IceCrown Desktop with Screen Parser
const { app, BrowserWindow, ipcMain, desktopCapturer, screen, globalShortcut } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;
let overlayWindow;

// Read API endpoint from config.local.json (personal override) → config.json → env → default
function getApiBase() {
  const candidates = [
    path.join(__dirname, 'config.local.json'),
    path.join(__dirname, 'config.json'),
  ];
  for (const cfgPath of candidates) {
    try {
      if (fs.existsSync(cfgPath)) {
        const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
        if (cfg.apiBase) return cfg.apiBase;
      }
    } catch (e) {}
  }
  return process.env.ICECROWN_API_BASE || 'https://pokertrain.vercel.app';
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 420,
    height: 800,
    minWidth: 380,
    minHeight: 700,
    title: 'IceCrown Poker Club',
    backgroundColor: '#050b18',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    titleBarStyle: 'hiddenInset',
    icon: path.join(__dirname, '..', 'public', 'icon.svg'),
  });

  const isDev = process.argv.includes('--dev');
  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }
}

function createOverlayWindow() {
  const { width } = screen.getPrimaryDisplay().workAreaSize;
  overlayWindow = new BrowserWindow({
    width: 340,
    height: 240,
    x: width - 360,
    y: 20,
    alwaysOnTop: true,
    transparent: true,
    frame: false,
    resizable: true,
    skipTaskbar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
    },
  });
  overlayWindow.loadFile(path.join(__dirname, 'overlay.html'));
  overlayWindow.setIgnoreMouseEvents(false);
  overlayWindow.on('closed', () => { overlayWindow = null; });
}

app.whenReady().then(() => {
  createMainWindow();

  // Ctrl+Shift+P — toggle screen parser overlay
  globalShortcut.register('CommandOrControl+Shift+P', () => {
    if (overlayWindow && !overlayWindow.isDestroyed()) {
      overlayWindow.isVisible() ? overlayWindow.hide() : overlayWindow.show();
    } else {
      createOverlayWindow();
    }
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

// Screen capture for parser
ipcMain.handle('capture-screen', async () => {
  const sources = await desktopCapturer.getSources({
    types: ['screen'],
    thumbnailSize: { width: 1920, height: 1080 },
  });
  if (sources.length > 0) {
    return sources[0].thumbnail.toDataURL();
  }
  return null;
});

// Proxy Claude API call through main process (avoids CORS/file:// issues in overlay)
ipcMain.handle('claude-proxy', async (_event, payload) => {
  const base = getApiBase();
  try {
    const res = await fetch(`${base}/api/claude`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      return { error: `HTTP ${res.status}`, status: res.status };
    }
    return await res.json();
  } catch (err) {
    return { error: err.message || 'network error' };
  }
});

// Expose endpoint to renderer for settings UI
ipcMain.handle('get-api-base', () => getApiBase());

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('will-quit', () => { globalShortcut.unregisterAll(); });
