// src/main/handlers/importHandlers.js
const { ipcMain, dialog } = require('electron');
const fs = require('fs');
const { prisma } = require('../../lib/db');
// We still need modifier templates for potential default configurations
const { modifierTemplates } = require('../../lib/modifierTemplates');

function setupImportHandlers() {
  ipcMain.handle('open-file-dialog', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [{ name: 'JSON Files', extensions: ['json'] }],
    });
    if (canceled || filePaths.length === 0) {
      return null;
    }
    try {
      const content = fs.readFileSync(filePaths[0], 'utf-8');
      return content;
    } catch (error) {
      console.error('Failed to read file:', error);
      throw new Error('Could not read the selected file.');
    }
  });

  ipcMain.handle('import-menu-from-json', async (e, jsonContent) => {
    let data;
    try {
      data = JSON.parse(jsonContent);
    } catch (error) {
      throw new Error(`Invalid JSON format: ${error.message}`);
    }

    if (!data.menus || !Array.isArray(data.menus)) {
        throw new Error('Invalid import format: Missing top-level "menus" array.');
    }

    await prisma.$transaction(async (tx) => {
      // Clear existing menu data in the correct order
      await tx.productModifierGroup.deleteMany({});
      await tx.orderItemModifier.deleteMany({}); // Added for safety
      await tx.orderItem.deleteMany({});
      await tx.product.deleteMany({});
      await tx.category.deleteMany({});
      await tx.modifierOption.deleteMany({});
      await tx.modifierGroup.deleteMany({});
      await tx.menu.deleteMany({}); // Clear menus too

      // --- 1. Create Modifier Groups ---
      const groupMap = new Map(); // Map group name -> created group ID
      if (data.modifierGroups && Array.isArray(data.modifierGroups)) {
        for (const group of data.modifierGroups) {
          if (!group.name) {
            console.warn('Skipping modifier group with no name:', group);
            continue;
          }

          let groupConfig = {};
          if (group.type) {
            const template = modifierTemplates.find((t) => t.name === group.type);
            if (template) {
              groupConfig = template.config;
            } else {
              console.warn(
                `Warning: Modifier group type "${group.type}" not found. Using defaults/JSON values.`
              );
            }
          }

          const finalGroupData = {
            ...groupConfig, // Start with template defaults
            name: group.name, // Name always from JSON
            // Override with JSON values if they exist
            minSelection: group.minSelection ?? groupConfig.minSelection ?? 0,
            selectionBudget: group.selectionBudget ?? groupConfig.selectionBudget ?? 1,
            maxSelections: group.maxSelections === null ? null : (group.maxSelections ?? groupConfig.maxSelections), // Handle null explicitly
            maxSelectionsSyncedToOptionCount: group.maxSelectionsSyncedToOptionCount ?? groupConfig.maxSelectionsSyncedToOptionCount ?? false,
            allowRepeatedSelections: group.allowRepeatedSelections ?? groupConfig.allowRepeatedSelections ?? false,
            exactBudgetRequired: group.exactBudgetRequired ?? groupConfig.exactBudgetRequired ?? false,
          };

          const newGroup = await tx.modifierGroup.create({
            data: {
              ...finalGroupData,
              options: {
                create: (group.options || []).map((opt) => ({
                  name: opt.name || 'Unnamed Option',
                  priceAdjustment: opt.priceAdjustment || 0,
                  selectionCost: opt.selectionCost === undefined ? 1 : opt.selectionCost, // Default cost to 1
                })),
              },
            },
          });
          groupMap.set(group.name, newGroup.id);
        }
      } else {
        console.log("No modifier groups found in import file.");
      }

      // --- 2. Create Menus, Categories, and Products ---
      for (const menu of data.menus) {
        if (!menu.name) {
          console.warn('Skipping menu with no name:', menu);
          continue;
        }

        const createdMenu = await tx.menu.create({
          data: {
            name: menu.name,
            isActive: menu.isActive !== undefined ? menu.isActive : true, // Default to active
          },
        });

        if (menu.categories && Array.isArray(menu.categories)) {
          for (const category of menu.categories) {
            if (!category.name) {
              console.warn('Skipping category with no name:', category);
              continue;
            }

            const createdCategory = await tx.category.create({
              data: {
                name: category.name,
                sku: category.sku || `CAT-${Date.now()}-${Math.random()}`, // Generate SKU if missing
                menuId: createdMenu.id, // Link to the menu
              },
            });

            if (category.products && Array.isArray(category.products)) {
              for (const prod of category.products) {
                if (!prod.name || !prod.sku) {
                  console.warn('Skipping product with missing name or SKU:', prod);
                  continue;
                }

                const createdProduct = await tx.product.create({
                  data: {
                    name: prod.name,
                    sku: prod.sku,
                    price: prod.price || 0,
                    image: prod.image || null, // Add image if present
                    description: prod.description || null, // Add description if present
                    categoryId: createdCategory.id, // Link to the category
                  },
                });

                // Link modifier groups if specified
                if (prod.modifierGroups && Array.isArray(prod.modifierGroups)) {
                  const links = prod.modifierGroups
                    .map((groupName, index) => {
                      const modifierGroupId = groupMap.get(groupName);
                      if (!modifierGroupId) {
                        console.warn(
                          `Modifier group "${groupName}" specified for product "${prod.name}" not found. Skipping link.`
                        );
                        return null; // Skip if group wasn't found/created
                      }
                      return {
                        productId: createdProduct.id,
                        modifierGroupId: modifierGroupId,
                        displayOrder: index,
                      };
                    })
                    .filter((link) => link !== null); // Filter out skipped links

                  if (links.length > 0) {
                    await tx.productModifierGroup.createMany({ data: links });
                  }
                }
              } // end product loop
            } else {
              console.log(`No products found for category "${category.name}" in menu "${menu.name}".`);
            }
          } // end category loop
        } else {
           console.log(`No categories found for menu "${menu.name}".`);
        }
      } // end menu loop
    }); // end transaction

    return { success: true, message: 'Menu imported successfully!' };
  });
}

module.exports = { setupImportHandlers };