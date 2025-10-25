// src/hooks/useOrderManagement.js
"use client";

import { useState } from 'react';
import { notifications } from '@mantine/notifications';

export function useOrderManagement() {
  const [activeOrder, setActiveOrder] = useState(null);
  const [selectedItemId, setSelectedItemId] = useState(null); // Keep item selection tied to the order

  const initializeOrder = (order) => {
    setActiveOrder(order);
    setSelectedItemId(null); // Reset selection when a new order starts
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
      // Select the newly added/updated item
      if (updatedOrder.items && updatedOrder.items.length > 0) {
        const lastMatchingItem = [...updatedOrder.items].reverse().find(item => {
          if (item.productId !== product.id) return false;
          // Ensure selectedModifiers exists before checking length
          if (!item.selectedModifiers || item.selectedModifiers.length !== selectedModifiers.length) return false;
          // Ensure selectedModifiers[index] exists before accessing id/quantity
          return item.selectedModifiers.every((mod, index) =>
            selectedModifiers[index] && // Check if modifier exists at index
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
      // Keep the item selected after quantity update unless it was removed (quantity <= 0)
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
      // If the removed item was selected, deselect it
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

  // --- Comment and Discount Logic (related to updating the activeOrder) ---
  const handleSaveComment = async (target, comment) => {
    if (!activeOrder) return;
    try {
      let updatedOrder;
      if (target.product) { // Item comment
        updatedOrder = await window.api.updateItemComment({
          orderId: activeOrder.id,
          orderItemId: target.id,
          comment,
        });
      } else { // Order comment
        updatedOrder = await window.api.updateOrderComment({
          orderId: activeOrder.id,
          comment,
        });
      }
      setActiveOrder(updatedOrder); // Update state here
      notifications.show({ title: 'Success', message: 'Note saved.', color: 'green' });
    } catch (error) {
      notifications.show({ title: 'Error', message: `Failed to save note: ${error.message}`, color: 'red' });
    }
  };

  const handleSelectDiscount = async (discountTarget, discountId) => {
    if (!activeOrder || !discountTarget) return;
    try {
      let updatedOrder;
      if (discountTarget.product) { // Item discount
        updatedOrder = await window.api.applyDiscountToItem({
          orderId: activeOrder.id,
          orderItemId: discountTarget.id,
          discountId: discountId,
        });
      } else { // Order discount (target is the order itself)
        updatedOrder = await window.api.applyDiscountToOrder({
          orderId: activeOrder.id,
          discountId: discountId,
        });
      }
      setActiveOrder(updatedOrder); // Update state here
      notifications.show({
        title: 'Success',
        message: discountId ? 'Discount applied.' : 'Discount removed.',
        color: 'green',
      });
    } catch (error) {
      notifications.show({ title: 'Error', message: `Failed to apply discount: ${error.message}`, color: 'red' });
    }
    // Note: Closing the modal is handled by the caller (usePosLogic/useModalState)
  };


  return {
    activeOrder,
    setActiveOrder, // Expose setter for specific cases if needed outside typical flow
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