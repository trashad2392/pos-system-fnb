// main.js
const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');
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

function setupDatabase() {
  const userDataPath = app.getPath('userData');
  const dbPath = path.join(userDataPath, 'pos.db');
  const packagedDbPath = path.join(process.resourcesPath, 'dev.db');
  if (fs.existsSync(packagedDbPath) && !fs.existsSync(dbPath)) {
    fs.copyFileSync(packagedDbPath, dbPath);
  }
}
  
// App lifecycle
app.whenReady().then(() => {
  setupDatabase();
  // This one function now sets up all our backend API handlers
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