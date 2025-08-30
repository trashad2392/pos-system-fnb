// main.js
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
// We will import 'serve' dynamically inside the async function
const { prisma, Prisma } = require('./src/lib/db');

function setupDatabase() {
  const userDataPath = app.getPath('userData');
  const dbPath = path.join(userDataPath, 'pos.db');
  
  const packagedDbPath = path.join(process.resourcesPath, 'dev.db');

  if (fs.existsSync(packagedDbPath) && !fs.existsSync(dbPath)) {
    fs.copyFileSync(packagedDbPath, dbPath);
  }
}

async function initialize() {
  // --- THIS IS THE KEY CHANGE ---
  // We dynamically import electron-serve here
  const serve = (await import('electron-serve')).default;
  // And create the handler right after
  const serveURL = serve({ directory: path.join(__dirname, 'out') });
  // --- END OF CHANGE ---

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

  function setupIpcHandlers() {
    ipcMain.handle('get-products', () => prisma.product.findMany({ where: { is_archived: false }, orderBy: { id: 'asc' } }));
    ipcMain.handle('add-product', async (e, d) => {
      try { return await prisma.product.create({ data: d }); } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
          throw new Error('A product with this SKU already exists. Please use a different SKU.');
        }
        throw error;
      }
    });
    ipcMain.handle('update-product', (e, id, d) => prisma.product.update({ where: { id: parseInt(id) }, data: d }));
    ipcMain.handle('delete-product', (e, id) => prisma.product.update({ where: { id: parseInt(id) }, data: { is_archived: true } }));
    ipcMain.handle('get-sales', async () => prisma.sale.findMany({ orderBy: { created_at: 'desc' }, include: { items: { include: { product: true } } } }));
    ipcMain.handle('create-sale', (e, items) => prisma.$transaction(async (tx) => {
      for (const i of items) {
        const product = await tx.product.findUnique({ where: { id: i.id } });
        if (!product || product.stock_quantity < i.quantity) {
          throw new Error(`Not enough stock for ${i.name || 'product'}. Available: ${product.stock_quantity}, Requested: ${i.quantity}`);
        }
        await tx.product.update({ where: { id: i.id }, data: { stock_quantity: { decrement: i.quantity } } });
      }
      const total = items.reduce((t, i) => t + (parseFloat(i.price) * i.quantity), 0);
      return tx.sale.create({ data: { total_amount: total, items: { create: items.map(i => ({ product_id: i.id, quantity: i.quantity, price_at_sale: i.price })) } } });
    }));
  }

  app.whenReady().then(() => {
    setupDatabase();
    setupIpcHandlers();
    createWindow();
  });
  
  app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
}

initialize();