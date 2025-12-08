// main.js
const { app, BrowserWindow, ipcMain, protocol } = require('electron');
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
    // CRITICAL FIX: Changed port from 3000 to 3001 to match package.json
    mainWindow.loadURL('http://localhost:3001');
  } else {
    loadURL(mainWindow);
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.on('ready', () => {
  // 🔥 CRITICAL FIX: Register the custom protocol to serve local files securely
  // The custom protocol 'local-media://' is registered here to access saved icons.
  protocol.registerFileProtocol('local-media', (request, callback) => {
    // 1. Extract the absolute file path by removing 'local-media://' (13 characters)
    const url = request.url.substr(13); 
    
    // 2. Decode the URI and normalize the path (important for paths with spaces)
    const filePath = path.normalize(decodeURI(url));
    
    // 3. Serve the file directly using the callback
    callback({ path: filePath }); 
  });
  
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