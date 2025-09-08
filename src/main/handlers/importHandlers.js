// src/main/handlers/importHandlers.js
const { ipcMain, dialog } = require('electron');
const fs = require('fs');
const { prisma } = require('../../lib/db');

function setupImportHandlers() {
  ipcMain.handle('open-file-dialog', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [{ name: 'JSON Files', extensions: ['json'] }]
    });
    if (canceled || filePaths.length === 0) { return null; }
    try {
      const content = fs.readFileSync(filePaths[0], 'utf-8');
      return content;
    } catch (error) {
      console.error('Failed to read file:', error);
      throw new Error('Could not read the selected file.');
    }
  });

  ipcMain.handle('import-menu-from-json', async (e, jsonContent) => {
    const data = JSON.parse(jsonContent);
    await prisma.$transaction(async (tx) => {
      // Clear existing menu data
      await tx.productModifierGroup.deleteMany({});
      await tx.orderItem.deleteMany({});
      await tx.product.deleteMany({});
      await tx.modifierOption.deleteMany({});
      await tx.modifierGroup.deleteMany({});
      await tx.category.deleteMany({});
      
      const groupMap = new Map();

      if (data.modifierGroups) {
        for (const group of data.modifierGroups) {
          const newGroup = await tx.modifierGroup.create({
            data: {
              name: group.name,
              minSelection: group.minSelection,
              selectionBudget: group.selectionBudget,
              options: {
                create: group.options.map(opt => ({
                  name: opt.name,
                  priceAdjustment: opt.priceAdjustment,
                  selectionCost: opt.selectionCost,
                })),
              },
            },
          });
          groupMap.set(group.name, newGroup.id);
        }
      }

      if (data.categories) {
        for (const category of data.categories) {
          const createdCategory = await tx.category.create({
            data: {
              name: category.name,
              sku: category.sku,
            }
          });

          for (const prod of category.products) {
            const createdProduct = await tx.product.create({
              data: {
                name: prod.name,
                sku: prod.sku,
                price: prod.price,
                categoryId: createdCategory.id,
              }
            });

            if (prod.modifierGroups && prod.modifierGroups.length > 0) {
              const links = prod.modifierGroups.map((groupName, index) => ({
                productId: createdProduct.id,
                modifierGroupId: groupMap.get(groupName),
                displayOrder: index,
              }));
              await tx.productModifierGroup.createMany({ data: links });
            }
          }
        }
      }
    });
    return { success: true, message: 'Menu imported successfully!' };
  });
}

module.exports = { setupImportHandlers };