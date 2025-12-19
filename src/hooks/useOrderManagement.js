// src/hooks/useOrderManagement.js
"use client";

import { useState } from 'react';
import { notifications } from '@mantine/notifications';

export function useOrderManagement() {
  const [activeOrder, setActiveOrder] = useState(null);
  const [selectedItemId, setSelectedItemId] = useState(null);

  const initializeOrder = (order) => {
    setActiveOrder(order);
    setSelectedItemId(null);
  };

  const clearActiveOrder = () => {
    setActiveOrder(null);
    setSelectedItemId(null);
  };

  const handleAddItem = async (product, selectedModifiers = []) => {
    if (!activeOrder) return;
    try {
      const updatedOrder = await window.api.addItemToOrder({
        orderId: activeOrder.id,
        productId: product.id,
        selectedModifiers,
      });
      setActiveOrder(updatedOrder);
      if (updatedOrder.items && updatedOrder.items.length > 0) {
        const lastMatchingItem = [...updatedOrder.items].reverse().find(item => {
          if (item.productId !== product.id) return false;
          if (!item.selectedModifiers || item.selectedModifiers.length !== selectedModifiers.length) return false;
          return item.selectedModifiers.every((mod, index) =>
            selectedModifiers[index] &&
            mod.modifierOptionId === selectedModifiers[index].id &&
            mod.quantity === selectedModifiers[index].quantity
          );
        });
        setSelectedItemId(lastMatchingItem ? lastMatchingItem.id : null);
      }
    } catch (error) {
      notifications.show({ title: 'Error', message: `Failed to add item: ${error.message}`, color: 'red' });
    }
  };

  const handleUpdateItemQuantity = async (orderItemId, quantity) => {
    if (!activeOrder) return;
    try {
      const updatedOrder = await window.api.updateItemQuantity({ orderId: activeOrder.id, orderItemId, quantity });
      setActiveOrder(updatedOrder);
      if (quantity <= 0) {
        setSelectedItemId(null);
      }
    } catch (error) {
      notifications.show({ title: 'Error', message: `Failed to update item quantity: ${error.message}`, color: 'red' });
    }
  };

  const handleRemoveItem = async (orderItemId) => {
    if (!activeOrder) return;
    try {
      const updatedOrder = await window.api.removeItemFromOrder({ orderId: activeOrder.id, orderItemId });
      setActiveOrder(updatedOrder);
      if (selectedItemId === orderItemId) {
        setSelectedItemId(null);
      }
    } catch (error) {
      notifications.show({ title: 'Error', message: `Failed to remove item: ${error.message}`, color: 'red' });
    }
  };

  const handleSelectItem = (itemId) => {
    setSelectedItemId(currentItemId => currentItemId === itemId ? null : itemId);
  };

  const handleSaveComment = async (target, comment) => {
    if (!activeOrder) return;
    try {
      let updatedOrder;
      if (target.product) {
        updatedOrder = await window.api.updateItemComment({
          orderId: activeOrder.id,
          orderItemId: target.id,
          comment,
        });
      } else {
        updatedOrder = await window.api.updateOrderComment({
          orderId: activeOrder.id,
          comment,
        });
      }
      setActiveOrder(updatedOrder);
      notifications.show({ title: 'Success', message: 'Note saved.', color: 'green' });
    } catch (error) {
      notifications.show({ title: 'Error', message: `Failed to save note: ${error.message}`, color: 'red' });
    }
  };

  const handleSelectDiscount = async (discountTarget, discountId) => {
    if (!activeOrder) return;
    
    console.log(`[ORDER-MGMT] Requesting Discount ID: ${discountId} for Order: ${activeOrder.id}`);

    try {
      const updatedOrder = await window.api.applyDiscountToOrder({
        orderId: activeOrder.id,
        discountId: discountId,
      });

      console.log("[ORDER-MGMT] API SUCCESS Response:", updatedOrder);

      // Force a fresh state update using a new object reference
      setActiveOrder((prev) => {
        if (!prev || prev.id !== updatedOrder.id) return prev;
        
        const freshState = { ...updatedOrder };
        console.log(`[ORDER-MGMT] UI State synced. Applied discountId: ${freshState.discountId}`);
        return freshState;
      });
      
      notifications.show({
        title: 'Success',
        message: discountId ? 'Order discount applied.' : 'Order discount removed.',
        color: discountId ? 'green' : 'gray',
      });
    } catch (error) {
      console.error("[ORDER-MGMT] Discount API Error:", error);
      notifications.show({ title: 'Error', message: `Database error: ${error.message}`, color: 'red' });
    }
  };

  return {
    activeOrder,
    setActiveOrder,
    selectedItemId,
    initializeOrder,
    clearActiveOrder,
    actions: {
        handleAddItem,
        handleUpdateItemQuantity,
        handleRemoveItem,
        handleSelectItem,
        handleSaveComment,
        handleSelectDiscount,
    }
  };
}