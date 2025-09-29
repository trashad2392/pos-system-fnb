// src/main/handlers/orderHandlers.js
const { ipcMain } = require('electron');
const { prisma } = require('../../lib/db');

async function getUpdatedOrder(tx, orderId) {
  const order = await tx.order.findUnique({
    where: { id: orderId },
    include: {
      items: {
        include: {
          product: true,
          selectedModifiers: {
            orderBy: { displayOrder: 'asc' }, // Order by our new field
            include: { modifierOption: true },
          },
        },
      },
    },
  });

  // Recalculate total amount based on items and their modifiers
  const totalAmount = order.items.reduce((sum, item) => {
    const itemBasePrice = item.priceAtTimeOfOrder;
    const modifiersTotal = item.selectedModifiers.reduce((modSum, mod) => {
      return modSum + (mod.modifierOption.priceAdjustment * mod.quantity);
    }, 0);
    return sum + (item.quantity * (itemBasePrice + modifiersTotal));
  }, 0);


  await tx.order.update({ where: { id: orderId }, data: { totalAmount: totalAmount } });

  // Re-fetch the full order with the final total
  return tx.order.findUnique({
    where: { id: orderId },
    include: {
      table: true,
      items: {
        orderBy: { id: 'asc' },
        include: {
          product: true,
          selectedModifiers: {
            orderBy: { displayOrder: 'asc' },
            include: { modifierOption: true },
          },
        },
      },
    },
  });
}

function setupOrderHandlers() {
  ipcMain.handle('get-sales', async () => prisma.order.findMany({
    where: { status: { in: ['PAID', 'CLEARED'] } },
    orderBy: { createdAt: 'desc' },
    include: {
      items: {
        include: {
          product: true,
          selectedModifiers: { // This now correctly includes the nested modifier option data
            orderBy: { displayOrder: 'asc' },
            include: { modifierOption: true }
          }
        }
      }
    }
  }));

  ipcMain.handle('create-order', async (e, { tableId, orderType }) => {
    return prisma.$transaction(async (tx) => {
      const orderData = { status: 'OPEN', orderType: orderType, totalAmount: 0 };
      if (tableId) {
        await tx.table.update({ where: { id: tableId }, data: { status: 'OCCUPIED' } });
        orderData.table = { connect: { id: tableId } };
      }
      const newOrder = await tx.order.create({
        data: orderData,
        include: { table: true, items: { include: { product: true, selectedModifiers: true } } }
      });
      return getUpdatedOrder(tx, newOrder.id);
    });
  });

  ipcMain.handle('get-open-order-for-table', async (e, tableId) => {
    if (!tableId) return null;
    const order = await prisma.order.findFirst({
      where: { tableId: tableId, status: 'OPEN' },
      include: {
        table: true,
        items: {
          include: {
            product: true,
            selectedModifiers: {
              orderBy: { displayOrder: 'asc' },
              include: { modifierOption: true }
            }
          }
        }
      }
    });
    return order;
  });

  ipcMain.handle('add-item-to-order', async (e, { orderId, productId, selectedModifiers = [] }) => {
    return prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({ where: { id: productId } });
      if (!product) throw new Error('Product not found.');

      // Price at time of order is now just the base product price.
      // Modifier adjustments will be calculated from the related table.
      const priceAtTimeOfOrder = product.price;

      // Check for an existing item with the exact same modifiers in the same order
      const existingItems = await tx.orderItem.findMany({
        where: { orderId, productId },
        include: { selectedModifiers: { orderBy: { displayOrder: 'asc' } } },
      });

      const matchingItem = existingItems.find(item => {
        if (item.selectedModifiers.length !== selectedModifiers.length) return false;
        return item.selectedModifiers.every((mod, index) =>
          mod.modifierOptionId === selectedModifiers[index].id &&
          mod.quantity === selectedModifiers[index].quantity
        );
      });

      if (matchingItem) {
        // If a matching item exists, just increment its quantity
        await tx.orderItem.update({
          where: { id: matchingItem.id },
          data: { quantity: { increment: 1 } },
        });
      } else {
        // Otherwise, create a new order item and its modifier links
        const newOrderItem = await tx.orderItem.create({
          data: {
            orderId,
            productId,
            quantity: 1,
            priceAtTimeOfOrder,
          },
        });

        if (selectedModifiers.length > 0) {
          await tx.orderItemModifier.createMany({
            data: selectedModifiers.map((mod, index) => ({
              orderItemId: newOrderItem.id,
              modifierOptionId: mod.id,
              quantity: mod.quantity,
              displayOrder: index,
            })),
          });
        }
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
      include: {
        items: {
          include: {
            product: true,
            selectedModifiers: { include: { modifierOption: true } }
          }
        }
      }
    });
  });

  ipcMain.handle('resume-held-order', async (e, { orderId }) => {
    await prisma.order.update({ where: { id: orderId }, data: { status: 'OPEN' } });
    return getUpdatedOrder(prisma, orderId);
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

  ipcMain.handle('update-item-comment', async (e, { orderId, orderItemId, comment }) => {
    return prisma.$transaction(async (tx) => {
      await tx.orderItem.update({
        where: { id: orderItemId },
        data: { comment },
      });
      return getUpdatedOrder(tx, orderId);
    });
  });

  ipcMain.handle('update-order-comment', async (e, { orderId, comment }) => {
    return prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: orderId },
        data: { comment },
      });
      return getUpdatedOrder(tx, orderId);
    });
  });
}
module.exports = { setupOrderHandlers };