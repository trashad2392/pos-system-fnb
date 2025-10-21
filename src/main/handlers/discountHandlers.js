// src/main/handlers/discountHandlers.js
const { ipcMain } = require('electron');
const { prisma, Prisma } = require('../../lib/db'); // Import Prisma namespace

function setupDiscountHandlers() {
  // Get all discounts
  ipcMain.handle('get-discounts', () =>
    prisma.discount.findMany({
      orderBy: { name: 'asc' }
    })
  );

  // Add a new discount
  ipcMain.handle('add-discount', (e, data) => {
    // --- ADDED VALIDATION ---
    if (!data || !data.name || !data.type || data.value === undefined) {
      throw new Error('Invalid discount data. Name, type, and value are required.');
    }
    if (data.type !== 'PERCENT' && data.type !== 'FIXED') {
        throw new Error('Invalid discount type. Must be PERCENT or FIXED.');
    }
    // --- END VALIDATION ---

    // Ensure value is a float, default isActive if not provided
    const dataToSave = {
        name: data.name,
        type: data.type,
        value: parseFloat(data.value) || 0,
        isActive: data.isActive !== undefined ? data.isActive : true,
    };

    try {
        return prisma.discount.create({ data: dataToSave });
    } catch (error) {
         if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            throw new Error(`A discount with the name "${data.name}" already exists.`);
         }
         throw error;
    }
  });

  // Update an existing discount
  ipcMain.handle('update-discount', (e, { id, data }) => {
     // --- ADDED VALIDATION ---
     if (!data || !id) {
        throw new Error('Invalid update data. ID and data object are required.');
     }
     const updateData = {};
     if (data.name !== undefined) updateData.name = data.name;
     if (data.type !== undefined) {
        if (data.type !== 'PERCENT' && data.type !== 'FIXED') {
            throw new Error('Invalid discount type. Must be PERCENT or FIXED.');
        }
        updateData.type = data.type;
     }
     if (data.value !== undefined) updateData.value = parseFloat(data.value) || 0;
     if (data.isActive !== undefined) updateData.isActive = data.isActive;

     if (Object.keys(updateData).length === 0) {
        throw new Error('No valid fields provided for update.');
     }
     // --- END VALIDATION ---

     try {
        return prisma.discount.update({ where: { id: parseInt(id, 10) }, data: updateData });
     } catch (error) {
         if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            throw new Error(`A discount with the name "${data.name}" already exists.`);
         }
         throw error;
     }
  });


  // Deactivate a discount (soft delete)
  ipcMain.handle('deactivate-discount', (e, id) =>
    prisma.discount.update({
      where: { id: parseInt(id, 10) },
      data: { isActive: false }
    })
  );
}

module.exports = { setupDiscountHandlers };