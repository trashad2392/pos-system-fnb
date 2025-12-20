// src/hooks/useOrderManagement.js
"use client";

import { useState, useCallback, useEffect } from 'react';
import { notifications } from '@mantine/notifications';

export function useOrderManagement() {
  const [activeOrder, setActiveOrder] = useState(null);
  const [selectedItemId, setSelectedItemId] = useState(null);
  const [posSettings, setPosSettings] = useState(null);

  useEffect(() => {
    window.api.getPosSettings().then(setPosSettings);
  }, []);

  const initializeOrder = useCallback((order) => {
    setActiveOrder(order);
    setSelectedItemId(null);
  }, []);

  const clearActiveOrder = useCallback(() => {
    setActiveOrder(null);
    setSelectedItemId(null);
  }, []);

  const calculateTotals = useCallback((order, settings) => {
    if (!order || !order.items) return { subtotal: 0, totalAmount: 0 };

    // 1. Calculate Items Gross Total (Sum of all non-voided items)
    const itemsGrossTotal = order.items.reduce((sum, item) => {
      if (item.status === 'VOIDED') return sum;
      
      const basePrice = Number(item.priceAtTimeOfOrder) || 0;
      const modifiersPrice = (item.selectedModifiers || []).reduce((acc, mod) => {
        const priceAdj = Number(mod?.modifierOption?.priceAdjustment) || 0;
        return acc + (priceAdj * (Number(mod?.quantity) || 0));
      }, 0);
      
      let itemTotal = (basePrice + modifiersPrice) * (Number(item.quantity) || 0);

      // Handle item-level discounts
      if (item.discount) {
        if (item.discount.type === 'PERCENT') {
            itemTotal *= (1 - (Number(item.discount.value) || 0) / 100);
        } else {
            itemTotal -= ((Number(item.discount.value) || 0) * (Number(item.quantity) || 0));
        }
      }
      
      return sum + itemTotal;
    }, 0);

    // 2. Apply Order-level Discount (Strictly Inclusive)
    let finalTotal = itemsGrossTotal;
    
    // Check if discount exists on the order object
    const discount = order.discount;
    if (discount) {
      const minAmount = Number(discount.minimumOrderAmount) || 0;
      if (itemsGrossTotal >= minAmount) {
        if (discount.type === 'PERCENT') {
          finalTotal = itemsGrossTotal * (1 - (Number(discount.value) || 0) / 100);
        } else {
          finalTotal = itemsGrossTotal - (Number(discount.value) || 0);
        }
      }
    }

    // Ensure we never return NaN or undefined to Prisma
    const safeTotal = Math.max(0, finalTotal);

    return {
      subtotal: parseFloat(itemsGrossTotal.toFixed(2)) || 0,
      totalAmount: parseFloat(safeTotal.toFixed(2)) || 0
    };
  }, []);

  const updateOrderData = useCallback(async (orderId, updates) => {
    // Final safety check before calling IPC
    if (updates.totalAmount === undefined || isNaN(updates.totalAmount)) {
        console.error("Critical Error: totalAmount is invalid", updates);
        return;
    }

    try {
      const updatedOrder = await window.api.updateOrder({ orderId, updates });
      setActiveOrder(updatedOrder);
    } catch (err) {
      notifications.show({ title: 'Error', message: err.message, color: 'red' });
    }
  }, []);

  const actions = {
    handleAddItem: async (product, modifiers) => {
      if (!activeOrder) return;
      try {
        const newItem = await window.api.addOrderItem({
          orderId: activeOrder.id,
          productId: product.id,
          priceAtTimeOfOrder: product.price,
          modifiers
        });
        
        // Use the newly fetched item plus existing items for accurate total
        const updatedItems = [...(activeOrder.items || []), newItem];
        const { subtotal, totalAmount } = calculateTotals({ ...activeOrder, items: updatedItems }, posSettings);
        
        await updateOrderData(activeOrder.id, { totalAmount });
      } catch (err) {
        notifications.show({ title: 'Error', message: err.message, color: 'red' });
      }
    },

    handleUpdateItemQuantity: async (itemId, quantity) => {
      if (!activeOrder || quantity < 1) return;
      try {
        await window.api.updateOrderItem({ orderItemId: itemId, updates: { quantity } });
        const updatedItems = activeOrder.items.map(item => 
          item.id === itemId ? { ...item, quantity } : item
        );
        const { totalAmount } = calculateTotals({ ...activeOrder, items: updatedItems }, posSettings);
        await updateOrderData(activeOrder.id, { totalAmount });
      } catch (err) {
        notifications.show({ title: 'Error', message: err.message, color: 'red' });
      }
    },

    handleRemoveItem: async (itemId) => {
      if (!activeOrder) return;
      try {
        await window.api.removeOrderItem(itemId);
        const updatedItems = activeOrder.items.filter(item => item.id !== itemId);
        const { totalAmount } = calculateTotals({ ...activeOrder, items: updatedItems }, posSettings);
        if (selectedItemId === itemId) setSelectedItemId(null);
        await updateOrderData(activeOrder.id, { totalAmount });
      } catch (err) {
        notifications.show({ title: 'Error', message: err.message, color: 'red' });
      }
    },

    handleSelectDiscount: async (order, discountId) => {
      try {
        const discount = discountId ? (await window.api.getDiscounts()).find(d => d.id === discountId) : null;
        // Important: Create a temporary order object with the new discount to calculate correctly
        const tempOrder = { ...order, discount, discountId };
        const { totalAmount } = calculateTotals(tempOrder, posSettings);
        await updateOrderData(order.id, { discountId, totalAmount });
      } catch (err) {
        notifications.show({ title: 'Error', message: err.message, color: 'red' });
      }
    },

    handleSelectItem: (itemId) => setSelectedItemId(itemId === selectedItemId ? null : itemId),
    
    handleSaveComment: async (target, comment) => {
      if (target.productId) {
        await window.api.updateOrderItem({ orderItemId: target.id, updates: { comment } });
      } else {
        await window.api.updateOrder({ orderId: target.id, updates: { comment } });
      }
      const updatedOrder = await window.api.getOrderById(activeOrder.id);
      setActiveOrder(updatedOrder);
    }
  };

  return { activeOrder, selectedItemId, initializeOrder, clearActiveOrder, actions };
}