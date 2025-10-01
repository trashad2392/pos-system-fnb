// src/main/handlers/orderHandlers.js
const { ipcMain } = require('electron');
const { prisma } = require('../../lib/db');
const { differenceInMilliseconds, subMilliseconds, formatISO } = require('date-fns');

// --- START: REWRITTEN getUpdatedOrder FUNCTION ---
async function getUpdatedOrder(tx, orderId) {
  // 1. Get the order with all its relations, including discounts
  const order = await tx.order.findUnique({
    where: { id: orderId },
    include: {
      table: true,
      discount: true, // Include order-level discount
      items: {
        orderBy: { id: 'asc' },
        include: {
          product: true,
          selectedModifiers: {
            orderBy: { displayOrder: 'asc' },
            include: { modifierOption: true },
          },
          discount: true, // Include item-level discount
        },
      },
    },
  });

  if (!order) {
    // If the order was deleted (e.g., cleared), we might not find it.
    // Return null or a specific structure if needed.
    return null;
  }

  // 2. Calculate the new total amount considering all discounts
  let subtotal = 0;
  for (const item of order.items) {
    let itemBasePrice = item.priceAtTimeOfOrder;
    const modifiersTotal = item.selectedModifiers.reduce((modSum, mod) => {
      return modSum + (mod.modifierOption.priceAdjustment * mod.quantity);
    }, 0);
    
    let itemTotalBeforeDiscount = (itemBasePrice + modifiersTotal) * item.quantity;

    // Apply item-level discount
    if (item.discount) {
      if (item.discount.type === 'PERCENT') {
        itemTotalBeforeDiscount *= (1 - item.discount.value / 100);
      } else { // FIXED
        // Apply fixed discount per unit in the quantity
        itemTotalBeforeDiscount -= (item.discount.value * item.quantity);
      }
    }
    subtotal += Math.max(0, itemTotalBeforeDiscount); // Ensure price doesn't go below zero
  }

  let finalTotal = subtotal;
  // Apply order-level discount
  if (order.discount) {
    if (order.discount.type === 'PERCENT') {
      finalTotal *= (1 - order.discount.value / 100);
    } else { // FIXED
      finalTotal -= order.discount.value;
    }
  }

  finalTotal = Math.max(0, finalTotal);

  // 3. Update the order with the new total
  const updatedOrder = await tx.order.update({
    where: { id: orderId },
    data: { totalAmount: finalTotal },
    include: {
      table: true,
      discount: true,
      items: {
        orderBy: { id: 'asc' },
        include: {
          product: true,
          selectedModifiers: {
            orderBy: { displayOrder: 'asc' },
            include: { modifierOption: true },
          },
          discount: true,
        },
      },
    },
  });

  return updatedOrder;
}
// --- END: REWRITTEN getUpdatedOrder FUNCTION ---


async function getStatsForPeriod(startDate, endDate) {
  const paidOrders = await prisma.order.findMany({
    where: {
      status: 'PAID',
      createdAt: { gte: startDate, lte: endDate },
    },
    include: {
      items: {
        include: { product: true }
      }
    }
  });

  const totalRevenue = paidOrders.reduce((sum, order) => sum + order.totalAmount, 0);
  const totalSales = paidOrders.length;
  const averageSaleValue = totalSales > 0 ? totalRevenue / totalSales : 0;

  const productCounts = paidOrders
    .flatMap(order => order.items)
    .reduce((acc, item) => {
      acc[item.product.name] = (acc[item.product.name] || 0) + item.quantity;
      return acc;
    }, {});

  const bestSellingItem = Object.entries(productCounts).sort(([, a], [, b]) => b - a)[0] || ['N/A', 0];

  return {
    totalRevenue,
    totalSales,
    averageSaleValue,
    bestSellingItem: {
      name: bestSellingItem[0],
      quantity: bestSellingItem[1],
    },
  };
}

function setupOrderHandlers() {
  ipcMain.handle('get-sales', async () => prisma.order.findMany({
    where: { status: { in: ['PAID', 'CLEARED'] } },
    orderBy: { createdAt: 'desc' },
    include: {
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
  }));

  ipcMain.handle('get-sales-by-date-range', async (e, { startDate, endDate }) => {
    return prisma.order.findMany({
      where: {
        status: 'PAID',
        createdAt: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      },
      orderBy: { createdAt: 'desc' },
      include: {
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
  });

  ipcMain.handle('get-sales-stats', async (e, { startDate, endDate }) => {
    return getStatsForPeriod(new Date(startDate), new Date(endDate));
  });

  ipcMain.handle('get-sales-comparison', async (e, { startDate, endDate }) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    const duration = differenceInMilliseconds(end, start);
    
    const prevStart = subMilliseconds(start, duration);
    const prevEnd = subMilliseconds(end, duration);

    return getStatsForPeriod(prevStart, prevEnd);
  });

  ipcMain.handle('get-daily-sales-for-range', async (e, { startDate, endDate }) => {
    const paidOrders = await prisma.order.findMany({
      where: {
        status: 'PAID',
        createdAt: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      },
    });

    const salesByDay = paidOrders.reduce((acc, order) => {
      const day = formatISO(order.createdAt, { representation: 'date' });
      acc[day] = (acc[day] || 0) + order.totalAmount;
      return acc;
    }, {});

    return Object.entries(salesByDay).map(([date, total]) => ({
      date,
      total: parseFloat(total.toFixed(2)),
    })).sort((a, b) => new Date(a.date) - new Date(b.date));
  });

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
      const priceAtTimeOfOrder = product.price;
      const existingItems = await tx.orderItem.findMany({
        where: { orderId, productId, discountId: null }, // Only stack if no discount
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
        await tx.orderItem.update({
          where: { id: matchingItem.id },
          data: { quantity: { increment: 1 } },
        });
      } else {
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

  ipcMain.handle('finalize-order', async (e, { orderId, payments }) => {
    return prisma.$transaction(async (tx) => {
      const orderToFinalize = await tx.order.findUnique({
        where: { id: orderId },
        include: { items: true },
      });

      if (!orderToFinalize) throw new Error('Order not found.');
      if (orderToFinalize.status !== 'OPEN') throw new Error('This order is not open and cannot be finalized.');

      const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
      const updatedOrderForTotal = await getUpdatedOrder(tx, orderId);

      if (Math.abs(totalPaid - updatedOrderForTotal.totalAmount) > 0.001) {
        throw new Error(`Total paid (${totalPaid.toFixed(2)}) does not match order total (${updatedOrderForTotal.totalAmount.toFixed(2)}).`);
      }

      await tx.payment.createMany({
        data: payments.map(p => ({
          amount: p.amount,
          method: p.method,
          orderId: orderId,
        })),
      });

      if (orderToFinalize.tableId) {
        await tx.table.update({
          where: { id: orderToFinalize.tableId },
          data: { status: 'AVAILABLE' },
        });
      }

      const paymentMethodsString = payments.map(p => p.method).join(', ');
      return tx.order.update({
        where: { id: orderId },
        data: {
          status: 'PAID',
          paymentMethod: paymentMethodsString,
        },
      });
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
      include: { items: { include: { product: true, selectedModifiers: { include: { modifierOption: true } } } } }
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
      // Instead of updating status, we delete the order and its items
      await tx.orderItem.deleteMany({ where: { orderId: orderId } });
      await tx.order.delete({ where: { id: orderId } });
      return { success: true };
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

  // --- START: NEW DISCOUNT HANDLERS ---
  ipcMain.handle('apply-discount-to-item', async (e, { orderId, orderItemId, discountId }) => {
    return prisma.$transaction(async (tx) => {
      // Rule: Applying an item discount clears any whole-order discount.
      await tx.order.update({ where: { id: orderId }, data: { discountId: null } });

      await tx.orderItem.update({
        where: { id: orderItemId },
        data: { discountId: discountId }, // Pass null to remove a discount
      });
      return getUpdatedOrder(tx, orderId);
    });
  });

  ipcMain.handle('apply-discount-to-order', async (e, { orderId, discountId }) => {
    return prisma.$transaction(async (tx) => {
      // Rule: Applying a whole-order discount clears all item-level discounts.
      await tx.orderItem.updateMany({
        where: { orderId: orderId },
        data: { discountId: null },
      });
      
      await tx.order.update({
        where: { id: orderId },
        data: { discountId: discountId }, // Pass null to remove a discount
      });
      return getUpdatedOrder(tx, orderId);
    });
  });
  // --- END: NEW DISCOUNT HANDLERS ---
}

module.exports = { setupOrderHandlers };