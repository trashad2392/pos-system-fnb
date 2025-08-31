// src/main/handlers/productHandlers.js
const { ipcMain } = require('electron');
const { prisma, Prisma } = require('../../lib/db');

function setupProductHandlers() {
  // UPDATED: The 'include' for modifierGroups is now deeper to fetch the options
  ipcMain.handle('get-products', () => prisma.product.findMany({ 
    where: { isArchived: false }, 
    orderBy: { id: 'asc' }, 
    include: { 
      category: true, 
      modifierGroups: {
        include: {
          options: true
        }
      } 
    } 
  }));

  ipcMain.handle('add-product', async (e, d) => {
    try {
      const { modifierGroupIds, ...productData } = d;
      return await prisma.product.create({ 
        data: { 
          ...productData, 
          modifierGroups: { 
            connect: modifierGroupIds.map(id => ({ id })) 
          } 
        }
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new Error('A product with this SKU already exists. Please use a different SKU.');
      }
      throw error;
    }
  });

  ipcMain.handle('update-product', (e, { id, data }) => {
    const { modifierGroupIds, ...productData } = data;
    return prisma.product.update({
      where: { id: parseInt(id) },
      data: { 
        ...productData, 
        modifierGroups: { 
          set: modifierGroupIds.map(mgid => ({ id: mgid })) 
        } 
      }
    });
  });

  ipcMain.handle('delete-product', (e, id) => prisma.product.update({ 
    where: { id: parseInt(id) }, 
    data: { isArchived: true } 
  }));
}

module.exports = { setupProductHandlers };