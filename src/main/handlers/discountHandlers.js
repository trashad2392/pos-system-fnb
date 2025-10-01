// src/main/handlers/discountHandlers.js
const { ipcMain } = require('electron');
const { prisma } = require('../../lib/db');

function setupDiscountHandlers() {
  // Get all discounts
  ipcMain.handle('get-discounts', () => 
    prisma.discount.findMany({ 
      orderBy: { name: 'asc' } 
    })
  );

  // Add a new discount
  ipcMain.handle('add-discount', (e, data) => 
    prisma.discount.create({ data })
  );

  // Update an existing discount
  ipcMain.handle('update-discount', (e, { id, data }) => 
    prisma.discount.update({ where: { id }, data })
  );

  // Deleting a discount is risky if it's been used. 
  // We'll just deactivate it instead (soft delete).
  ipcMain.handle('deactivate-discount', (e, id) => 
    prisma.discount.update({ 
      where: { id }, 
      data: { isActive: false } 
    })
  );
}

module.exports = { setupDiscountHandlers };