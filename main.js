// main.js
const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const serve = require('electron-serve');
const { prisma, Prisma } = require('./src/lib/db');

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

// in main.js
  function setupIpcHandlers() {
    // --- All existing handlers for Products, Sales, Categories, Modifiers ---
    ipcMain.handle('get-products', () => prisma.product.findMany({ where: { isArchived: false }, orderBy: { id: 'asc' }, include: { category: true, modifierGroups: true } }));
    ipcMain.handle('add-product', async (e, d) => { /* ... existing code ... */ });
    ipcMain.handle('update-product', (e, { id, data }) => { /* ... existing code ... */ });
    ipcMain.handle('delete-product', (e, id) => prisma.product.update({ where: { id: parseInt(id) }, data: { isArchived: true } }));
    ipcMain.handle('get-sales', async () => prisma.order.findMany({ orderBy: { createdAt: 'desc' }, include: { items: { include: { product: true, selectedModifiers: true } } } }));
    ipcMain.handle('create-sale', (e, items) => { /* We will update this logic later */ });
    ipcMain.handle('get-categories', () => prisma.category.findMany({ orderBy: { name: 'asc' } }));
    ipcMain.handle('add-category', (e, name) => prisma.category.create({ data: { name } }));
    ipcMain.handle('update-category', (e, { id, name }) => prisma.category.update({ where: { id }, data: { name } }));
    ipcMain.handle('delete-category', async (e, id) => { /* ... existing code ... */ });
    ipcMain.handle('get-modifier-groups', () => prisma.modifierGroup.findMany({ orderBy: { name: 'asc' }, include: { options: { orderBy: { name: 'asc' } } } }));
    ipcMain.handle('add-modifier-group', (e, data) => prisma.modifierGroup.create({ data }));
    ipcMain.handle('update-modifier-group', (e, { id, data }) => prisma.modifierGroup.update({ where: { id }, data }));
    ipcMain.handle('delete-modifier-group', async (e, id) => { /* ... existing code ... */ });
    ipcMain.handle('add-modifier-option', (e, data) => prisma.modifierOption.create({ data }));
    ipcMain.handle('update-modifier-option', (e, { id, data }) => prisma.modifierOption.update({ where: { id }, data }));
    ipcMain.handle('delete-modifier-option', (e, id) => prisma.modifierOption.delete({ where: { id } }));
    ipcMain.handle('open-file-dialog', async () => { /* ... existing code ... */ });
    ipcMain.handle('import-menu-from-json', async (e, jsonContent) => { /* ... existing code ... */ });

    // --- TABLE HANDLERS (NEW) ---
    ipcMain.handle('get-tables', () => prisma.table.findMany({ orderBy: { name: 'asc' } }));
    ipcMain.handle('add-table', (e, name) => prisma.table.create({ data: { name } }));
    ipcMain.handle('update-table', (e, { id, name }) => prisma.table.update({ where: { id }, data: { name } }));
    ipcMain.handle('delete-table', async (e, id) => {
      // Safety Check: Prevent deleting a table with an open order
      const openOrderCount = await prisma.order.count({
        where: {
          tableId: id,
          status: 'OPEN',
        },
      });
      if (openOrderCount > 0) {
        throw new Error('Cannot delete this table as it has an open order. Please close or cancel the order first.');
      }
      return prisma.table.delete({ where: { id } });
    });
  }
  
// App lifecycle
app.whenReady().then(() => {
  setupDatabase();
  setupIpcHandlers();
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