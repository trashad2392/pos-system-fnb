// src/main/handlers/categoryHandlers.js
const { ipcMain } = require('electron');
const { prisma } = require('../../lib/db');

function setupCategoryHandlers() {
  ipcMain.handle('get-categories', () => prisma.category.findMany({ orderBy: { name: 'asc' } }));
  
  ipcMain.handle('add-category', (e, name) => prisma.category.create({ data: { name } }));
  
  ipcMain.handle('update-category', (e, { id, name }) => prisma.category.update({ where: { id }, data: { name } }));
  
  ipcMain.handle('delete-category', async (e, id) => {
    const productCount = await prisma.product.count({ where: { categoryId: id } });
    if (productCount > 0) {
      throw new Error('Cannot delete category because it still contains products. Please move them first.');
    }
    return prisma.category.delete({ where: { id } });
  });
}

module.exports = { setupCategoryHandlers };