// main.js
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { setupAllIpcHandlers } = require('./src/main/handlers');
const serve = require('electron-serve');

const isDev = !app.isPackaged;
const loadURL = serve({ directory: 'out' });

let mainWindow;

function createMainWindow() {
  mainWindow = new BrowserWindow({
    // Keep defaults, but rely on maximize: true
    width: 1200, 
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: isDev ? false : true // Disable web security in dev to allow http://localhost
    },
    // --- START OF FIX (Refined) ---
    show: false, // Don't show until ready
    maximize: true, // Start maximized
    autoHideMenuBar: true, // Cleaner maximized view
    // --- END OF FIX (Refined) ---
  });
  
  // Show the window only after it's ready to prevent flicker
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Open DevTools in dev mode
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  // Load the Next.js app
  if (isDev) {
    // --- CRITICAL FIX: Changed port from 3000 to 3001 to match package.json ---
    mainWindow.loadURL('http://localhost:3001');
  } else {
    loadURL(mainWindow);
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.on('ready', () => {
  createMainWindow();
  // We pass __dirname (the project root) to the handlers
  setupAllIpcHandlers(__dirname);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createMainWindow();
  }
});