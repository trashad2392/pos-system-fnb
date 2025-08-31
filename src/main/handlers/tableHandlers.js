// src/main/handlers/tableHandlers.js
const { ipcMain } = require('electron');
const { prisma } = require('../../lib/db');

function setupTableHandlers() {
  ipcMain.handle('get-tables', () => prisma.table.findMany({ orderBy: { name: 'asc' } }));
  
  ipcMain.handle('add-table', (e, name) => prisma.table.create({ data: { name } }));
  
  ipcMain.handle('update-table', (e, { id, name }) => prisma.table.update({ where: { id }, data: { name } }));
  
  ipcMain.handle('delete-table', async (e, id) => {
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

module.exports = { setupTableHandlers };