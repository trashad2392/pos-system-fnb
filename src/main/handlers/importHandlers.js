// src/main/handlers/importHandlers.js
const { ipcMain, dialog } = require('electron');
const fs = require('fs');
const { prisma } = require('../../lib/db');
// NEW: We now import our shared template definitions
const { modifierTemplates } = require('../../lib/modifierTemplates');

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
          
          // --- NEW: Smart Template Logic ---
          let groupConfig = {};

          // If a "type" is specified in the JSON, find its template configuration
          if (group.type) {
            const template = modifierTemplates.find(t => t.name === group.type);
            if (template) {
              groupConfig = template.config;
            } else {
              console.warn(`Warning: Modifier group type "${group.type}" not found in templates. Manual values will be used.`);
            }
          }
          
          // Combine template config with any direct values from the JSON.
          // This allows a user to use a template but override one specific rule if needed.
          const finalGroupData = {
            ...groupConfig,
            name: group.name, // The name always comes from the JSON
            minSelection: group.minSelection ?? groupConfig.minSelection,
            selectionBudget: group.selectionBudget ?? groupConfig.selectionBudget,
            maxSelections: group.maxSelections ?? groupConfig.maxSelections,
            maxSelectionsSyncedToOptionCount: group.maxSelectionsSyncedToOptionCount ?? groupConfig.maxSelectionsSyncedToOptionCount,
            allowRepeatedSelections: group.allowRepeatedSelections ?? groupConfig.allowRepeatedSelections,
            exactBudgetRequired: group.exactBudgetRequired ?? groupConfig.exactBudgetRequired
          };
          // --- END NEW LOGIC ---

          const newGroup = await tx.modifierGroup.create({
            data: {
              ...finalGroupData,
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