// src/main/handlers/modifierHandlers.js
const { ipcMain } = require('electron');
const { prisma } = require('../../lib/db');

function setupModifierHandlers() {
  ipcMain.handle('get-modifier-groups', () => prisma.modifierGroup.findMany({ 
    orderBy: { name: 'asc' }, 
    include: { options: { orderBy: { name: 'asc' } } } 
  }));
  
  ipcMain.handle('add-modifier-group', (e, data) => prisma.modifierGroup.create({ data }));
  
  ipcMain.handle('update-modifier-group', (e, { id, data }) => prisma.modifierGroup.update({ where: { id }, data }));
  
  ipcMain.handle('delete-modifier-group', async (e, id) => {
    const optionCount = await prisma.modifierOption.count({ where: { modifierGroupId: id } });
    if (optionCount > 0) {
      throw new Error('Cannot delete this group because it still contains options. Please delete the options first.');
    }
    return prisma.modifierGroup.delete({ where: { id } });
  });
  
  ipcMain.handle('add-modifier-option', (e, data) => prisma.modifierOption.create({ data }));
  
  ipcMain.handle('update-modifier-option', (e, { id, data }) => prisma.modifierOption.update({ where: { id }, data }));
  
  ipcMain.handle('delete-modifier-option', (e, id) => prisma.modifierOption.delete({ where: { id } }));
}

module.exports = { setupModifierHandlers };