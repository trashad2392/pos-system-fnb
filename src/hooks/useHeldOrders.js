// src/hooks/useHeldOrders.js
"use client";

import { useState, useCallback } from 'react';
import { notifications } from '@mantine/notifications';

// This hook needs access to modal controls to open/close the held orders modal
// and the main navigateToOrderView/initializeOrder functions to resume an order.
export function useHeldOrders(modalControls, viewActions, initializeOrder, updateDisplayMenuForOrderType) {
  const [heldOrders, setHeldOrders] = useState([]);

  const handleShowHeldOrders = useCallback(async (orderTypeToShow) => {
    if (!orderTypeToShow) {
       notifications.show({ title: 'Info', message: 'Cannot determine order type for held orders.', color: 'yellow' });
       return;
    }
    try {
      const held = await window.api.getHeldOrders({ orderType: orderTypeToShow });
      setHeldOrders(held);
      modalControls.openHeldOrdersModal(); // Use passed-in modal controls
    } catch (error) {
      notifications.show({ title: 'Error', message: `Failed to get held orders: ${error.message}`, color: 'red' });
    }
  }, [modalControls]); // Dependency on modalControls

  const handleResumeHeldOrder = useCallback(async (orderId) => {
    try {
      const resumedOrder = await window.api.resumeHeldOrder({ orderId });
      // Call functions passed from usePosLogic
      updateDisplayMenuForOrderType(resumedOrder.orderType);
      initializeOrder(resumedOrder);
      viewActions.navigateToOrderView();
      modalControls.closeHeldOrdersModal(); // Use passed-in modal controls
    } catch (error) {
      notifications.show({ title: 'Error', message: `Failed to resume held order: ${error.message}`, color: 'red' });
    }
  }, [modalControls, viewActions, initializeOrder, updateDisplayMenuForOrderType]); // Add dependencies

  const handleDeleteHeldOrder = useCallback(async (orderId, orderTypeOfDeleted) => {
    if (!orderTypeOfDeleted) {
        console.warn("handleDeleteHeldOrder called without orderTypeOfDeleted");
        return;
    }
    try {
      await window.api.deleteHeldOrder({ orderId });
      notifications.show({ title: 'Success', message: 'Held order deleted.', color: 'orange' });
      // Refresh the list in the modal using the correct order type
      await handleShowHeldOrders(orderTypeOfDeleted); // Call own function to refresh
    } catch (error) {
      notifications.show({ title: 'Error', message: `Failed to delete held order: ${error.message}`, color: 'red' });
    }
  }, [handleShowHeldOrders]); // Dependency on own handleShowHeldOrders

  return {
    heldOrders, // State
    actions: {
      handleShowHeldOrders,
      handleResumeHeldOrder,
      handleDeleteHeldOrder,
    }
  };
}