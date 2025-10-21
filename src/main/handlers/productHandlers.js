// src/main/handlers/productHandlers.js
const { ipcMain } = require('electron');
const { prisma, Prisma } = require('../../lib/db');

function setupProductHandlers() {
  ipcMain.handle('get-products', async () => {
    const products = await prisma.product.findMany({
      where: { isArchived: false },
      orderBy: { id: 'asc' },
      include: {
        // --- MODIFIED: Include menu within category ---
        category: {
          include: {
            menu: true, // Include the menu data associated with the category
          },
        },
        // --- End Modification ---
        modifierGroups: {
          orderBy: {
            displayOrder: 'asc',
          },
          include: {
            group: {
              include: {
                options: {
                  orderBy: {
                    name: 'asc',
                  },
                },
              },
            },
          },
        },
      },
    });

    // Data structuring remains the same as before
    return products.map(p => {
      const { modifierGroups, ...restOfProduct } = p;
      const formattedModifierGroups = modifierGroups.map(pmg => {
        const { group, ...restOfPmg } = pmg;
        return { ...restOfPmg, modifierGroup: group };
      });
      return { ...restOfProduct, modifierGroups: formattedModifierGroups };
    });
  });

  ipcMain.handle('add-product', async (e, d) => {
    try {
      const { modifierGroupIds, ...productData } = d;
      return await prisma.product.create({
        data: {
          ...productData,
          modifierGroups: {
            create: modifierGroupIds.map((mgId, index) => ({
              modifierGroupId: parseInt(mgId, 10),
              displayOrder: index,
            })),
          },
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new Error('A product with this SKU already exists. Please use a different SKU.');
      }
      throw error;
    }
  });

  ipcMain.handle('update-product', (e, { id, data }) => {
    const { modifierGroups, ...productData } = data;
    const productId = parseInt(id);

    return prisma.$transaction(async (tx) => {
      // First, delete all existing links in our new join table
      await tx.productModifierGroup.deleteMany({
        where: { productId: productId },
      });

      // Then, update the product's own data
      const updatedProduct = await tx.product.update({
        where: { id: productId },
        data: { ...productData },
      });

      // Finally, create the new links with the correct order
      if (modifierGroups && modifierGroups.length > 0) {
        await tx.productModifierGroup.createMany({
          data: modifierGroups.map((mg, index) => ({
            productId: productId,
            modifierGroupId: mg.modifierGroupId,
            displayOrder: index,
          })),
        });
      }

      return updatedProduct;
    });
  });

  ipcMain.handle('delete-product', (e, id) =>
    prisma.product.update({
      where: { id: parseInt(id) },
      data: { isArchived: true },
    })
  );
}

module.exports = { setupProductHandlers };