// src/main/handlers/paymentMethodHandlers.js
const { ipcMain } = require('electron');
const { prisma, Prisma } = require('../../lib/db');

function setupPaymentMethodHandlers() {
  // Array of protected system names (only Cash remains)
  const PROTECTED_NAMES = ['Cash']; 

  // Get all payment methods (active and inactive)
  ipcMain.handle('get-payment-methods', (e, { activeOnly = false } = {}) => {
    const whereClause = { 
        name: { not: 'Credit' },
        ...(activeOnly ? { isActive: true } : {}) 
    };
    return prisma.paymentMethod.findMany({
      where: whereClause,
      orderBy: { displayOrder: 'asc' },
    });
  });

  // Add a new payment method
  ipcMain.handle('add-payment-method', async (e, data) => {
    if (!data.name || data.name.trim() === '') {
      throw new Error('Payment method name cannot be empty.');
    }
    
    // 🔥 FIX 1: Validation requires Color AND (iconName OR customIconUrl)
    // We check if (iconName is NOT null/empty) OR (customIconUrl is NOT null/empty)
    const isIconValid = (data.iconName && data.iconName.trim() !== '') || (data.customIconUrl && data.customIconUrl.trim() !== '');

    if (!data.color || !isIconValid) {
        throw new Error('Color and a valid icon selection (preset or custom) are required.');
    }
    
    const name = data.name.trim();

    // Check if name is a reserved name
    if (PROTECTED_NAMES.includes(name) || name === 'Credit') {
        throw new Error(`"${name}" is a reserved system payment method name and cannot be manually created.`);
    }
    
    // Determine the next display order
    const lastMethod = await prisma.paymentMethod.findFirst({ orderBy: { displayOrder: 'desc' } });
    const newDisplayOrder = (lastMethod?.displayOrder || 0) + 1;

    try {
      return await prisma.paymentMethod.create({
        data: {
          name: name,
          isActive: data.isActive !== undefined ? data.isActive : true,
          displayOrder: newDisplayOrder,
          color: data.color, 
          // Store all new fields explicitly
          iconName: data.iconName || null, // Store null if empty string is passed
          iconSourceType: data.iconSourceType || 'preset',
          customIconUrl: data.customIconUrl || '',
          icon: data.iconName, // Keep the old 'icon' field updated for compatibility
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new Error(`A payment method named "${name}" already exists.`);
      }
      throw error;
    }
  });

  // Update an existing payment method (name, status, order, color, icon)
  ipcMain.handle('update-payment-method', async (e, { id, data }) => {
    const methodId = parseInt(id, 10);
    const updateData = {};
    const currentMethod = await prisma.paymentMethod.findUnique({ where: { id: methodId } });
    if (!currentMethod) throw new Error('Payment method not found.');
    const isProtected = PROTECTED_NAMES.includes(currentMethod.name);

    // 1. Handle Name/Status Update
    if (data.name !== undefined) {
      if (data.name.trim() === '') throw new Error('Payment method name cannot be empty.');
      const newName = data.name.trim();
      if ((PROTECTED_NAMES.includes(newName) || newName === 'Credit') && newName !== currentMethod.name) {
         throw new Error(`Cannot rename to "${newName}". That is a reserved system name.`);
      }
      if (isProtected && newName !== currentMethod.name) {
          throw new Error(`The protected method "${currentMethod.name}" cannot be renamed.`);
      }
      updateData.name = newName;
    }
    
    if (data.isActive !== undefined) {
        if (currentMethod.name === 'Cash' && data.isActive === false) {
             throw new Error('The "Cash" payment method cannot be deactivated.');
        }
        updateData.isActive = data.isActive;
    }
    
    // 2. Handle Display Order Update
    if (data.displayOrder !== undefined) {
        updateData.displayOrder = parseInt(data.displayOrder, 10);
    }
    
    // 3. Handle Style/Icon Updates (New Fields)
    if (data.color !== undefined) updateData.color = data.color;
    if (data.iconName !== undefined) {
        updateData.iconName = data.iconName || null;
        updateData.icon = data.iconName; // Update old 'icon' for compatibility
    }
    if (data.iconSourceType !== undefined) updateData.iconSourceType = data.iconSourceType;
    if (data.customIconUrl !== undefined) updateData.customIconUrl = data.customIconUrl;


    if (Object.keys(updateData).length === 0) {
      throw new Error('No valid data provided for update.');
    }

    try {
      return await prisma.paymentMethod.update({
        where: { id: methodId },
        data: updateData,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new Error(`A payment method named "${data.name}" already exists.`);
      }
      throw error;
    }
  });

  // Delete a payment method (only if inactive and not protected)
  ipcMain.handle('delete-payment-method', async (e, id) => {
    const methodId = parseInt(id, 10);
    const method = await prisma.paymentMethod.findUnique({ where: { id: methodId } });
    if (!method) throw new Error('Payment method not found.');
    
    if (PROTECTED_NAMES.includes(method.name) || method.name === 'Credit') { // Explicitly check Credit name
        throw new Error(`The method "${method.name}" cannot be permanently deleted.`);
    }
    if (method.isActive) {
        throw new Error('Please deactivate the payment method before attempting to delete it.');
    }
    
    return prisma.paymentMethod.delete({ where: { id: methodId } });
  });
}

module.exports = { setupPaymentMethodHandlers };