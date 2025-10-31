// src/main/handlers/printingHandlers.js
const { ipcMain, BrowserWindow, app } = require('electron');
const { prisma } = require('../../lib/db');
const path = require('path');

const isDev = !app.isPackaged;

// This will temporarily hold the order data for the print window to fetch
let tempOrderData = null;

// This helper function creates the URL for the print window
function getPrintURL() {
  if (isDev) {
    return 'http://localhost:3000/print/receipt/';
  } else {
    return 'app://./print/receipt/index.html';
  }
}

let printWindow = null;

// This function fetches all data needed for a receipt
async function getOrderForReceipt(orderId) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      table: true,
      user: true, // Get cashier name
      discount: true,
      payments: true, // Get payment methods
      items: {
        orderBy: { id: 'asc' },
        include: {
          product: true,
          selectedModifiers: {
            orderBy: { displayOrder: 'asc' },
            include: { modifierOption: true },
          },
          discount: true,
        },
      },
    },
  });
  
  if (!order) return null;
  
  // We need to calculate the subtotal manually for the receipt
  let subtotal = 0;
  for (const item of order.items) {
    if (item.status === 'ACTIVE') {
       let itemBasePrice = item.priceAtTimeOfOrder;
       const modifiersTotal = (item.selectedModifiers || []).reduce((modSum, mod) => {
         const priceAdjustment = mod.modifierOption ? mod.modifierOption.priceAdjustment : 0;
         return modSum + (priceAdjustment * mod.quantity);
       }, 0);
       let itemTotalBeforeDiscount = (itemBasePrice + modifiersTotal) * item.quantity;
       
       if (item.discount) {
         if (item.discount.type === 'PERCENT') {
           itemTotalBeforeDiscount *= (1 - item.discount.value / 100);
         } else { // FIXED
           itemTotalBeforeDiscount -= (item.discount.value * item.quantity);
         }
       }
       subtotal += itemTotalBeforeDiscount;
    }
  }
  
  return { ...order, subtotal };
}

// Accept 'rootDir' argument
function setupPrintingHandlers(rootDir) {
  ipcMain.handle('print-receipt', async (e, orderId) => {
    try {
      // 1. Fetch data and store it in the temporary variable
      tempOrderData = await getOrderForReceipt(orderId);
      if (!tempOrderData) {
        throw new Error('Order not found.');
      }

      if (printWindow) {
        printWindow.close();
      }
      
      printWindow = new BrowserWindow({
        width: 400, 
        height: 800,
        show: true, 
        webPreferences: {
          // Use the 'rootDir' passed from main.js to get the correct absolute path
          preload: path.join(rootDir, 'preload.js'),
          nodeIntegration: false,
          contextIsolation: true,
        },
      });

      const printURL = getPrintURL();
      console.log(`[PrintingHandler] Loading URL: ${printURL}`);
      printWindow.loadURL(printURL);
      
      if (isDev) {
          printWindow.webContents.openDevTools({ mode: 'detach' });
      }

      // We no longer send data on load, the window will ask for it
      printWindow.on('closed', () => {
        printWindow = null;
        tempOrderData = null; // Clear data when window is closed
      });
      
      return { success: true };

    } catch (error) {
      console.error("Failed to create print window:", error);
      tempOrderData = null; // Clear data on error
      throw error;
    }
  });

  // This new handler lets the receipt window "pull" the data when it's ready
  ipcMain.handle('get-receipt-data', (event) => {
    // Check if the request is coming from our print window
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win === printWindow) {
      return tempOrderData;
    }
    return null;
  });


  // Renderer will tell us when it's ready to print
  ipcMain.on('trigger-print-dialog', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win === printWindow) { 
      console.log(`[PrintingHandler] Triggering print dialog.`);
      event.sender.print({
        silent: false, 
        printBackground: false,
        deviceName: '',
      }, (success, failureReason) => {
        if (!success && failureReason !== 'cancelled') { 
          console.error('Failed to print:', failureReason);
        }
        
        // --- START: MODIFICATION ---
        // The window will no longer close automatically.
        // You can close it manually for development.
        /*
        setTimeout(() => {
           if (win && !win.isDestroyed()) {
             win.close();
           }
        }, 250);
        */
        // --- END: MODIFICATION ---
      });
    }
  });
}

module.exports = { setupPrintingHandlers };