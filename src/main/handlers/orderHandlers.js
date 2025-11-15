// src/main/handlers/orderHandlers.js
const { ipcMain } = require('electron');
const { prisma } = require('../../lib/db');
const { differenceInMilliseconds, subMilliseconds, formatISO } = require('date-fns');

// --- Helper function to calculate the value of a single order item ---
function calculateOrderItemValue(item) {
  let itemBasePrice = item.priceAtTimeOfOrder;
  const modifiersTotal = (item.selectedModifiers || []).reduce((modSum, mod) => {
    // Ensure modifierOption is not null
    const priceAdjustment = mod.modifierOption ? mod.modifierOption.priceAdjustment : 0;
    return modSum + (priceAdjustment * mod.quantity);
  }, 0);

  let itemTotalBeforeDiscount = (itemBasePrice + modifiersTotal) * item.quantity;

  // Apply item-level discount
  if (item.discount) {
    if (item.discount.type === 'PERCENT') {
      itemTotalBeforeDiscount *= (1 - item.discount.value / 100);
    } else { // FIXED
      itemTotalBeforeDiscount -= (item.discount.value * item.quantity);
    }
  }
  return Math.max(0, itemTotalBeforeDiscount);
}


async function getUpdatedOrder(tx, orderId) {
  const order = await tx.order.findUnique({
    where: { id: orderId },
    include: {
      table: true,
      discount: true, // <-- This will now include minimumOrderAmount
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

  if (!order) {
    return null;
  }

  let subtotal = 0;
  for (const item of order.items) {
    if (item.status === 'ACTIVE') {
      subtotal += calculateOrderItemValue(item);
    }
  }

  let finalTotal = subtotal;
  
  // --- START: MODIFIED DISCOUNT LOGIC ---
  if (order.discount) {
    // Check if the subtotal meets the minimum required amount
    const meetsMinimum = (!order.discount.minimumOrderAmount || subtotal >= order.discount.minimumOrderAmount);

    if (meetsMinimum) {
      // If minimum is met (or 0), apply the discount
      if (order.discount.type === 'PERCENT') {
        finalTotal *= (1 - order.discount.value / 100);
      } else { // FIXED
        finalTotal -= order.discount.value;
      }
    }
    // If meetsMinimum is false, finalTotal simply remains the subtotal
  }
  // --- END: MODIFIED DISCOUNT LOGIC ---

  finalTotal = Math.max(0, finalTotal);

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


async function getStatsForPeriod(startDate, endDate) {
    const paidOrders = await prisma.order.findMany({
        where: {
            status: 'PAID', // Only 'PAID' orders contribute to stats
            createdAt: { gte: startDate, lte: endDate },
        },
        include: {
            items: {
                include: {
                    product: true,
                    selectedModifiers: { include: { modifierOption: true } },
                    discount: true
                }
            }
        }
    });

    // --- SIMPLER LOGIC ---
    // `getStatsForPeriod` should sum the `totalAmount` of 'PAID' orders
    // `order.totalAmount` already reflects the final amount charged.
    const totalRevenue = paidOrders.reduce((sum, order) => {
        return sum + order.totalAmount;
    }, 0);

    const totalSales = paidOrders.length;
    const averageSaleValue = totalSales > 0 ? totalRevenue / totalSales : 0;

    const productCounts = paidOrders
        .flatMap(order => order.items)
        .filter(item => item.status !== 'VOIDED') // Only count non-voided items
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

  ipcMain.handle('void-order-item', async (e, { orderItemId, voidType }) => {
    return prisma.$transaction(async (tx) => {
      const orderItemToVoid = await tx.orderItem.findUnique({
        where: { id: orderItemId },
        include: {
          order: { include: { discount: true } }, // <-- Need order discount info
          selectedModifiers: { include: { modifierOption: true } },
          discount: true,
        },
      });

      if (!orderItemToVoid) throw new Error('Order item not found.');
      if (orderItemToVoid.status === 'VOIDED') throw new Error('This item has already been voided.');
      if (orderItemToVoid.order.status !== 'PAID') throw new Error('Only items from a paid order can be voided.');

      // --- MODIFIED VOID LOGIC ---
      // We must recalculate the total *before* this item was voided
      // to see how much the order-level discount was worth.
      
      // 1. Get the current order total
      const originalOrderTotal = orderItemToVoid.order.totalAmount;

      // 2. Mark item as voided
      await tx.orderItem.update({
        where: { id: orderItemId },
        data: {
          status: 'VOIDED',
          voidedAt: new Date(),
          voidType: voidType,
        },
      });

      // 3. Recalculate the new order total using the *same* function
      // This will correctly recalculate the subtotal (without this item)
      // and re-evaluate the order-level discount eligibility.
      const updatedOrder = await getUpdatedOrder(tx, orderItemToVoid.orderId);
      const newOrderTotal = updatedOrder.totalAmount;
      
      // 4. The refund amount is the difference
      const refundAmount = Math.max(0, originalOrderTotal - newOrderTotal);

      // 5. Update the order with the new total and refund amount
      const finalOrder = await tx.order.update({
        where: { id: orderItemToVoid.orderId },
        data: {
          totalAmount: newOrderTotal, // Set the new, lower total
          refundAmount: { increment: refundAmount }, // Log the refund
        },
      });
      // --- END MODIFIED VOID LOGIC ---

      const remainingItems = await tx.orderItem.count({
          where: { orderId: finalOrder.id, status: 'ACTIVE' }
      });

      if (remainingItems === 0) {
          await tx.order.update({
              where: { id: finalOrder.id },
              data: { status: 'VOIDED' }
          });
      }

      return getUpdatedOrder(tx, finalOrder.id); // Return the fully updated order
    });
  });

  ipcMain.handle('void-full-order', async (e, { orderId, voidType }) => {
    return prisma.$transaction(async (tx) => {
      const orderToVoid = await tx.order.findUnique({
        where: { id: orderId },
        include: {
          items: {
            where: { status: 'ACTIVE' },
          }
        }
      });

      if (!orderToVoid || (orderToVoid.status !== 'PAID' && orderToVoid.status !== 'VOIDED')) {
        throw new Error('Order is not in a voidable state.');
      }
      
      // The amount to refund is the *current* totalAmount,
      // as this represents what the customer paid.
      const totalValueToVoid = orderToVoid.totalAmount;
      const now = new Date();

      // Void all *active* items
      for (const item of orderToVoid.items) {
        await tx.orderItem.update({
          where: { id: item.id },
          data: {
            status: 'VOIDED',
            voidedAt: now,
            voidType: voidType,
          }
        });
      }
      
      const finalOrder = await tx.order.update({
        where: { id: orderId },
        data: {
          status: 'VOIDED',
          totalAmount: 0, // The order total is now 0
          refundAmount: { increment: totalValueToVoid }, // Refund what was paid
        }
      });

      return getUpdatedOrder(tx, finalOrder.id); // Re-fetch to be safe
    });
  });


  ipcMain.handle('get-sales', async () => prisma.order.findMany({
    where: { status: { in: ['PAID', 'VOIDED'] } },
    orderBy: { createdAt: 'desc' },
    include: {
      items: {
        include: {
          product: true,
          selectedModifiers: {
            orderBy: { displayOrder: 'asc' },
            include: { modifierOption: true }
          },
          discount: true, // <-- Include item discount
        }
      },
      discount: true, // <-- Include order discount
    }
  }));

  ipcMain.handle('get-sales-by-date-range', async (e, { startDate, endDate }) => {
    return prisma.order.findMany({
      where: {
        createdAt: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
        status: { in: ['PAID', 'VOIDED'] } // Show both in the report
      },
      orderBy: { createdAt: 'desc' },
      include: {
        items: {
            orderBy: { id: 'asc' },
            include: {
                product: true,
                selectedModifiers: {
                    orderBy: { displayOrder: 'asc' },
                    include: { modifierOption: true }
                },
                discount: true, // <-- Include item discount
            }
        },
        discount: true, // <-- Include order discount
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
    
    // --- FIX: Ensure previous period doesn't overlap ---
    const prevStart = subMilliseconds(start, duration + 1);
    const prevEnd = subMilliseconds(start, 1);
    // --- END FIX ---

    return getStatsForPeriod(prevStart, prevEnd);
  });

  ipcMain.handle('get-daily-sales-for-range', async (e, { startDate, endDate }) => {
    const orders = await prisma.order.findMany({
      where: {
        status: { in: ['PAID', 'VOIDED'] }, // Must include voided to get accurate revenue
        createdAt: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      },
    });
  
    const salesByDay = orders.reduce((acc, order) => {
      const day = formatISO(order.createdAt, { representation: 'date' });
      // order.totalAmount reflects the final amount (post-voids, etc.)
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
        include: { table: true, items: { include: { product: true, selectedModifiers: true, discount: true } }, discount: true }
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
        discount: true,
        items: {
          include: {
            product: true,
            selectedModifiers: {
              orderBy: { displayOrder: 'asc' },
              include: { modifierOption: true }
            },
            discount: true,
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
        where: { orderId, productId, discountId: null, status: 'ACTIVE', comment: null }, // Only stack active, non-discounted, non-commented items
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

  // --- MODIFIED: Finalize Order to handle Credit Sales and prevent crash ---
  ipcMain.handle('finalize-order', async (e, { orderId, payments, customerId = null }) => {
    try {
        return await prisma.$transaction(async (tx) => {
            const orderToFinalize = await tx.order.findUnique({
                where: { id: orderId },
                include: { items: true },
            });

            if (!orderToFinalize) throw new Error('Order not found.');
            if (orderToFinalize.status !== 'OPEN') throw new Error('This order is not open and cannot be finalized.');

            const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
            const updatedOrderForTotal = await getUpdatedOrder(tx, orderId);
            const orderTotal = updatedOrderForTotal.totalAmount;

            // Use a small tolerance for floating point comparison
            if (Math.abs(totalPaid - orderTotal) > 0.01) {
                throw new Error(`Total paid (${totalPaid.toFixed(2)}) does not match order total (${orderTotal.toFixed(2)}).`);
            }
            
            const paymentMethodsString = payments.map(p => p.method).join(', ');
            
            // --- CREDIT SALE LOGIC ---
            if (customerId !== null) {
                const customer = await tx.customer.findUnique({ 
                    where: { id: customerId }, 
                    include: { company: true }
                });
                if (!customer) throw new Error('Customer for credit sale not found.');
                
                // Determine effective credit limit
                const effectiveCreditLimit = customer.creditLimit > 0 
                    ? customer.creditLimit 
                    : (customer.company?.creditLimit || Infinity); // Use Infinity if no limit set

                // Check if credit limit is exceeded (balance is negative for debt)
                const newBalance = customer.balance - orderTotal;
                if (effectiveCreditLimit !== Infinity && Math.abs(newBalance) > effectiveCreditLimit) {
                    throw new Error(`Credit limit exceeded. Current debt would be $${Math.abs(newBalance).toFixed(2)}. Limit: $${effectiveCreditLimit.toFixed(2)}.`);
                }
                
                // 1. Update Customer's debt balance
                await tx.customer.update({
                    where: { id: customerId },
                    data: { balance: newBalance }, // Decrement balance (i.e., increase debt)
                });
                
                // 2. We skip creating payment records for Credit Sale here,
                //    as the single payment method is "Credit" and the transaction
                //    is logged on the customer's balance.
            } else {
                // --- STANDARD PAYMENT LOGIC (Non-Credit Sale) ---
                await tx.payment.createMany({
                    data: payments.map(p => ({
                        amount: p.amount,
                        method: p.method,
                        orderId: orderId,
                    })),
                });
            }
            // --- END CREDIT SALE LOGIC ---

            if (orderToFinalize.tableId) {
                await tx.table.update({
                    where: { id: orderToFinalize.tableId },
                    data: { status: 'AVAILABLE' },
                });
            }

            return tx.order.update({
                where: { id: orderId },
                data: {
                    status: 'PAID',
                    paymentMethod: paymentMethodsString,
                    totalAmount: orderTotal,
                    customerId: customerId, // Set customer ID for credit sales
                },
            });
        });
    } catch (error) {
        // By using a top-level try-catch, we prevent Electron's main process from crashing 
        // on intentional errors (like credit limit exceeded) or minor validation errors.
        // We throw a new Error with the message, which Electron's IPC system will send 
        // back to the renderer process (usePosLogic hook) to be handled gracefully.
        throw new Error(error.message); 
    }
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
      // Must delete related payments first if they exist (though they shouldn't for 'HOLD')
      await tx.payment.deleteMany({ where: { orderId: orderId }});
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
      await tx.payment.deleteMany({ where: { orderId: orderId }}); // Clear any stray payments
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

  // --- MODIFIED: This function is no longer used, but we leave it ---
  ipcMain.handle('apply-discount-to-item', async (e, { orderId, orderItemId, discountId }) => {
    return prisma.$transaction(async (tx) => {
      // Applying an item discount should remove an order-level discount
      await tx.order.update({ where: { id: orderId }, data: { discountId: null } });

      await tx.orderItem.update({
        where: { id: orderItemId },
        data: { discountId: discountId },
      });
      return getUpdatedOrder(tx, orderId);
    });
  });

  ipcMain.handle('apply-discount-to-order', async (e, { orderId, discountId }) => {
    return prisma.$transaction(async (tx) => {
      // Applying an order discount should remove all item-level discounts
      await tx.orderItem.updateMany({
        where: { orderId: orderId },
        data: { discountId: null },
      });
      
      await tx.order.update({
        where: { id: orderId },
        data: { discountId: discountId },
      });
      return getUpdatedOrder(tx, orderId);
    });
  });
}

module.exports = { setupOrderHandlers };