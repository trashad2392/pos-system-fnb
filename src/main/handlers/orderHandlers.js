// src/main/handlers/orderHandlers.js
const { ipcMain } = require('electron');
const { prisma } = require('../../lib/db');

function setupOrderHandlers() {
  ipcMain.handle('get-sales', async () => prisma.order.findMany({ 
    where: { status: 'PAID' }, // Assuming 'PAID' status means it's a completed sale
    orderBy: { createdAt: 'desc' }, 
    include: { items: { include: { product: true, selectedModifiers: true } } } 
  }));

  // UPDATED to be more robust with optional tables
  ipcMain.handle('create-order', async (e, { tableId, orderType }) => {
    return prisma.$transaction(async (tx) => {
      const orderData = {
        status: 'OPEN',
        orderType: orderType,
        totalAmount: 0,
      };

      // Only connect a table if a tableId was provided
      if (tableId) {
        await tx.table.update({
          where: { id: tableId },
          data: { status: 'OCCUPIED' },
        });
        orderData.table = { 
          connect: { id: tableId }
        };
      }

      const newOrder = await tx.order.create({
        data: orderData,
        include: {
          table: true,
          items: {
            include: {
              product: true,
              selectedModifiers: true
            }
          }
        }
      });
      return newOrder;
    });
  });

  ipcMain.handle('get-open-order-for-table', async (e, tableId) => {
    if (!tableId) return null;
    return await prisma.order.findFirst({
      where: {
        tableId: tableId,
        status: 'OPEN',
      },
      include: {
        table: true,
        items: {
          include: {
            product: true,
            selectedModifiers: true,
          }
        }
      }
    });
  });

  ipcMain.handle('add-item-to-order', async (e, { orderId, productId, selectedModifierIds = [] }) => {
    return prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({ where: { id: productId } });
      if (!product) throw new Error('Product not found.');

      let modifierPrice = 0;
      if (selectedModifierIds && selectedModifierIds.length > 0) {
        const modifierOptions = await tx.modifierOption.findMany({
          where: { id: { in: selectedModifierIds } },
        });
        modifierPrice = modifierOptions.reduce((sum, opt) => sum + opt.priceAdjustment, 0);
      }
      
      const priceAtTimeOfOrder = product.price + modifierPrice;

      const existingItems = await tx.orderItem.findMany({
        where: { orderId, productId },
        include: { selectedModifiers: { select: { id: true } } },
      });

      const sortedSelectedIds = [...selectedModifierIds].sort((a, b) => a - b);
      const matchingItem = existingItems.find(item => {
        const itemModifierIds = item.selectedModifiers.map(m => m.id).sort((a, b) => a - b);
        return JSON.stringify(itemModifierIds) === JSON.stringify(sortedSelectedIds);
      });

      if (matchingItem) {
        await tx.orderItem.update({
          where: { id: matchingItem.id },
          data: { quantity: { increment: 1 } },
        });
      } else {
        await tx.orderItem.create({
          data: {
            orderId: orderId,
            productId: productId,
            quantity: 1,
            priceAtTimeOfOrder: priceAtTimeOfOrder,
            selectedModifiers: {
              connect: selectedModifierIds.map(id => ({ id })),
            },
          },
        });
      }

      const allItemsInOrder = await tx.orderItem.findMany({ where: { orderId: orderId } });
      const totalAmount = allItemsInOrder.reduce((sum, item) => sum + (item.quantity * item.priceAtTimeOfOrder), 0);
      await tx.order.update({ where: { id: orderId }, data: { totalAmount: totalAmount } });

      return tx.order.findUnique({
        where: { id: orderId },
        include: { 
          table: true, 
          items: { 
            orderBy: { id: 'asc' }, 
            include: { product: true, selectedModifiers: { orderBy: { name: 'asc' } } } 
          } 
        },
      });
    });
  });
  
  ipcMain.handle('create-sale', (e, items) => { /* Placeholder */ });
}

module.exports = { setupOrderHandlers };