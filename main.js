// main.js
const { app, BrowserWindow, protocol } = require('electron');
const path = require('path');
const serve = require('electron-serve');
const { setupAllIpcHandlers } = require('./src/main/handlers');

const serveURL = serve({ directory: path.join(__dirname, 'out') });
const isDev = !app.isPackaged;

function createWindow() {
  const win = new BrowserWindow({
    width: 1200, height: 800,
    webPreferences: { preload: path.join(__dirname, 'preload.js') },
  });

  if (isDev) {
    win.loadURL('http://localhost:3000');
    win.webContents.openDevTools();
  } else {
    serveURL(win);
  }
}

app.whenReady().then(() => {
  protocol.registerFileProtocol('safe-file', (request, callback) => {
    const url = request.url.replace(/^safe-file:\/\//, '');
    try {
      return callback(decodeURIComponent(url));
    } catch (error) {
      console.error('Failed to decode URL', url, error);
      return callback({ error: -6 });
    }
  });

  setupAllIpcHandlers();
  createWindow();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});