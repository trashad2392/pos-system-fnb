// src/main/handlers/productHandlers.js
const { ipcMain } = require('electron');
const { prisma, Prisma } = require('../../lib/db');

function setupProductHandlers() {
  // FINAL CORRECTED VERSION
  ipcMain.handle('get-products', async () => { 
    const products = await prisma.product.findMany({ 
      where: { isArchived: false }, 
      orderBy: { id: 'asc' }, 
      include: { 
        category: true, 
        modifierGroups: { // This is the join table, ProductModifierGroup
          include: {
            group: { // UPDATED: This now correctly references the 'group' relation
              include: {
                options: {
                  orderBy: { name: 'asc' }
                }
              }
            }
          }
        } 
      } 
    });

    // Manually sort the modifierGroups for each product after fetching
    products.forEach(product => {
      if (product.modifierGroups && product.modifierGroups.length > 0) {
        product.modifierGroups.sort((a, b) => a.displayOrder - b.displayOrder);
      }
    });

    return products;
  });

  // This handler needs to be updated to use the 'group' relation as well
  ipcMain.handle('add-product', async (e, d) => {
    try {
      const { modifierGroups, ...productData } = d;
      
      return await prisma.product.create({ 
        data: { 
          ...productData, 
          modifierGroups: {
            create: modifierGroups.map((mg, index) => ({
              // This now connects via modifierGroupId, which is correct
              modifierGroupId: mg.modifierGroupId,
              displayOrder: index,
            })),
          },
        }
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new Error('A product with this SKU already exists. Please use a different SKU.');
      }
      console.error("Error in add-product handler:", error);
      throw error;
    }
  });

  // This handler needs to be updated to use the 'group' relation
  ipcMain.handle('update-product', (e, { id, data }) => {
    const { modifierGroups, ...productData } = data;
    const productId = parseInt(id);

    return prisma.$transaction(async (tx) => {
      await tx.productModifierGroup.deleteMany({
        where: { productId: productId }
      });
      
      const updatedProduct = await tx.product.update({
        where: { id: productId },
        data: { 
          ...productData,
        }
      });

      if (modifierGroups && modifierGroups.length > 0) {
        await tx.productModifierGroup.createMany({
          data: modifierGroups.map((mg, index) => ({
            productId: productId,
            // This also connects via modifierGroupId, which is correct
            modifierGroupId: mg.modifierGroupId,
            displayOrder: index,
          })),
        });
      }

      return updatedProduct;
    });
  });

  ipcMain.handle('delete-product', (e, id) => prisma.product.update({ 
    where: { id: parseInt(id) }, 
    data: { isArchived: true } 
  }));
}

module.exports = { setupProductHandlers };