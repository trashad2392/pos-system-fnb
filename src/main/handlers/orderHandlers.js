// src/main/handlers/orderHandlers.js
const { ipcMain } = require('electron');
const { prisma } = require('../../lib/db');

async function getUpdatedOrder(tx, orderId) {
  const allItems = await tx.orderItem.findMany({ where: { orderId: orderId } });
  const totalAmount = allItems.reduce((sum, item) => sum + (item.quantity * item.priceAtTimeOfOrder), 0);
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
}

function setupOrderHandlers() {
  ipcMain.handle('get-sales', async () => prisma.order.findMany({ 
    where: { status: { in: ['PAID', 'CLEARED'] } },
    orderBy: { createdAt: 'desc' }, 
    include: { items: { include: { product: true, selectedModifiers: true } } } 
  }));

  ipcMain.handle('create-order', async (e, { tableId, orderType }) => {
    return prisma.$transaction(async (tx) => {
      const orderData = { status: 'OPEN', orderType: orderType, totalAmount: 0 };
      if (tableId) {
        await tx.table.update({ where: { id: tableId }, data: { status: 'OCCUPIED' } });
        orderData.table = { connect: { id: tableId } };
      }
      return tx.order.create({
        data: orderData,
        include: { table: true, items: { include: { product: true, selectedModifiers: true } } }
      });
    });
  });

  ipcMain.handle('get-open-order-for-table', async (e, tableId) => {
    if (!tableId) return null;
    return await prisma.order.findFirst({
      where: { tableId: tableId, status: 'OPEN' },
      include: { table: true, items: { include: { product: true, selectedModifiers: true } } }
    });
  });

  ipcMain.handle('add-item-to-order', async (e, { orderId, productId, selectedModifierIds = [] }) => {
    return prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({ where: { id: productId } });
      if (!product) throw new Error('Product not found.');
      let modifierPrice = 0;
      if (selectedModifierIds && selectedModifierIds.length > 0) {
        const modifierOptions = await tx.modifierOption.findMany({ where: { id: { in: selectedModifierIds } } });
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
        await tx.orderItem.update({ where: { id: matchingItem.id }, data: { quantity: { increment: 1 } } });
      } else {
        await tx.orderItem.create({
          data: {
            orderId, productId, quantity: 1, priceAtTimeOfOrder,
            selectedModifiers: { connect: selectedModifierIds.map(id => ({ id })) },
          },
        });
      }
      return getUpdatedOrder(tx, orderId);
    });
  });

  ipcMain.handle('update-item-quantity', async (e, { orderId, orderItemId, quantity }) => {
    return prisma.$transaction(async (tx) => {
      if (quantity > 0) {
        await tx.orderItem.update({ where: { id: orderItemId }, data: { quantity } });
      } else {
        await tx.orderItem.delete({ where: { id: orderItemId } });
      }
      return getUpdatedOrder(tx, orderId);
    });
  });

  ipcMain.handle('remove-item-from-order', async (e, { orderId, orderItemId }) => {
    return prisma.$transaction(async (tx) => {
      await tx.orderItem.delete({ where: { id: orderItemId } });
      return getUpdatedOrder(tx, orderId);
    });
  });

  ipcMain.handle('finalize-order', async (e, { orderId, paymentMethod }) => {
    return prisma.$transaction(async (tx) => {
      const orderToFinalize = await tx.order.findUnique({ where: { id: orderId } });
      if (!orderToFinalize) throw new Error('Order not found.');
      if (orderToFinalize.status !== 'OPEN') throw new Error('This order is not open and cannot be finalized.');
      if (orderToFinalize.tableId) {
        await tx.table.update({ where: { id: orderToFinalize.tableId }, data: { status: 'AVAILABLE' } });
      }
      return tx.order.update({ where: { id: orderId }, data: { status: 'PAID', paymentMethod: paymentMethod } });
    });
  });
  
  ipcMain.handle('hold-order', async (e, { orderId }) => {
    return prisma.$transaction(async (tx) => {
      const orderToHold = await tx.order.findUnique({ where: { id: orderId } });
      if (!orderToHold) throw new Error('Order to hold not found.');
      if (orderToHold.tableId) {
        await tx.table.update({ where: { id: orderToHold.tableId }, data: { status: 'AVAILABLE' } });
      }
      return tx.order.update({ where: { id: orderId }, data: { status: 'HOLD', tableId: null } });
    });
  });

  ipcMain.handle('get-held-orders', async (e, { orderType }) => {
    return prisma.order.findMany({
      where: { status: 'HOLD', orderType: orderType },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: { items: { include: { product: true, selectedModifiers: true } } }
    });
  });

  ipcMain.handle('resume-held-order', async (e, { orderId }) => {
    await prisma.order.update({ where: { id: orderId }, data: { status: 'OPEN' } });
    return prisma.order.findUnique({ where: { id: orderId }, include: { table: true, items: { include: { product: true, selectedModifiers: true } } } });
  });
  
  ipcMain.handle('delete-held-order', async (e, { orderId }) => {
    return prisma.$transaction(async (tx) => {
      const heldOrder = await tx.order.findUnique({ where: { id: orderId } });
      if (!heldOrder || heldOrder.status !== 'HOLD') {
        throw new Error('Order is not a valid held order and cannot be deleted.');
      }
      await tx.orderItem.deleteMany({ where: { orderId: orderId } });
      await tx.order.delete({ where: { id: orderId } });
      return { success: true };
    });
  });
  
  ipcMain.handle('clear-order', async (e, { orderId }) => {
    return prisma.$transaction(async (tx) => {
      const orderToClear = await tx.order.findUnique({ where: { id: orderId } });
      if (!orderToClear) throw new Error('Order not found.');
      if (orderToClear.status !== 'OPEN') throw new Error('Only open orders can be cleared.');
      if (orderToClear.tableId) {
        await tx.table.update({ where: { id: orderToClear.tableId }, data: { status: 'AVAILABLE' } });
      }
      return tx.order.update({ where: { id: orderId }, data: { status: 'CLEARED' } });
    });
  });
}

module.exports = { setupOrderHandlers };