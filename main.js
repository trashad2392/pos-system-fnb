// main.js
const { app, BrowserWindow, protocol } = require('electron');
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
  // We need to register a custom protocol to securely serve local files.
  protocol.registerFileProtocol('safe-file', (request, callback) => {
    const url = request.url.replace(/^safe-file:\/\//, '');
    try {
      // Decode URI components to handle spaces and other characters
      return callback(decodeURIComponent(url));
    } catch (error) {
      console.error('Failed to decode URL', url, error);
      // Return an error if decoding fails
      return callback({ error: -6 }); // FILE_NOT_FOUND
    }
  });
  
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