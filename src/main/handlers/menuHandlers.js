// src/main/handlers/menuHandlers.js
const { ipcMain } = require('electron');
const { prisma } = require('../../lib/db');

function setupMenuHandlers() {
  // Get menus (optionally filtered by active status)
  ipcMain.handle('get-menus', (e, { activeOnly = false } = {}) => {
    const whereClause = activeOnly ? { isActive: true } : {};
    return prisma.menu.findMany({
      where: whereClause,
      orderBy: { name: 'asc' },
      include: {
        // Optionally include categories if needed later, but keep it light for now
        // categories: true
      },
    });
  });

  // Add a new menu
  ipcMain.handle('add-menu', (e, { name, isActive = true }) => {
    if (!name || name.trim() === '') {
      throw new Error('Menu name cannot be empty.');
    }
    return prisma.menu.create({
      data: {
        name: name.trim(),
        isActive: isActive,
      },
    });
  });

  // Update an existing menu
  ipcMain.handle('update-menu', (e, { id, data }) => {
    // Only allow updating name and isActive status for now
    const { name, isActive } = data;
    const updateData = {};
    if (name !== undefined && name.trim() !== '') {
      updateData.name = name.trim();
    }
    if (isActive !== undefined) {
      updateData.isActive = isActive;
    }

    if (Object.keys(updateData).length === 0) {
      throw new Error('No valid data provided for update.');
    }

    return prisma.menu.update({
      where: { id: parseInt(id, 10) },
      data: updateData,
    });
  });

  // Delete a menu (only if it has no categories)
  ipcMain.handle('delete-menu', async (e, id) => {
    const menuId = parseInt(id, 10);
    const categoryCount = await prisma.category.count({
      where: { menuId: menuId },
    });

    if (categoryCount > 0) {
      throw new Error(
        `Cannot delete menu because it still contains ${categoryCount} categories. Please move or delete them first.`
      );
    }

    return prisma.menu.delete({
      where: { id: menuId },
    });
  });
}

module.exports = { setupMenuHandlers };