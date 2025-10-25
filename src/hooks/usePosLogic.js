// src/hooks/usePosLogic.js
"use client";

import { useState, useEffect, useMemo, useCallback } from 'react'; // Added useCallback
import { usePosData } from './usePosData';
import { useModalState } from './useModalState';
import { useOrderManagement } from './useOrderManagement';
import { usePosView } from './usePosView';
import { useHeldOrders } from './useHeldOrders';
import { useMenuFiltering } from './useMenuFiltering';
import { notifications } from '@mantine/notifications';

export function usePosLogic() {
  const {
    tables, fullActiveMenuData, posSettings, discounts,
    isLoading, error, refreshData
  } = usePosData();

  const {
    modifierModalOpened, paymentModalOpened, heldOrdersModalOpened, commentModalOpened, discountModalOpened, keyboardVisible,
    customizingProduct, commentTarget, discountTarget,
    actions: modalActions
  } = useModalState();

  const {
    activeOrder, setActiveOrder, selectedItemId,
    initializeOrder, clearActiveOrder, actions: orderActions
  } = useOrderManagement();

  const {
    posView, actions: viewActions
  } = usePosView();

  const {
    currentDisplayMenu, actions: menuActions
  } = useMenuFiltering(fullActiveMenuData, posSettings, isLoading, error);

  const {
    heldOrders, actions: heldOrderActions
  } = useHeldOrders(modalActions, viewActions, initializeOrder, menuActions.updateDisplayMenuForOrderType);

  // --- START ORDER ---
  const startOrder = useCallback(async (orderType, tableId = null) => {
    console.log(`[usePosLogic] Attempting to start order: type=${orderType}, tableId=${tableId}`);
    try {
      menuActions.updateDisplayMenuForOrderType(orderType);
      const newOrder = await window.api.createOrder({ tableId, orderType });
      const selectedTable = tableId ? tables.find(t => t.id === tableId) : null;
      if (selectedTable) newOrder.table = selectedTable;
      initializeOrder(newOrder);
      viewActions.navigateToOrderView();
      if (tableId) await refreshData(); // Refresh table status
      console.log(`[usePosLogic] Started new order ID: ${newOrder.id}`);
    } catch (err) {
      console.error("[usePosLogic] Failed to start order:", err);
      notifications.show({ title: 'Error', message: `Failed to start order: ${err.message}`, color: 'red' });
    }
  }, [tables, menuActions, initializeOrder, viewActions, refreshData]); // Added dependencies

  // --- RESUME DINE-IN ORDER ---
  const resumeOrder = useCallback(async (table) => {
    console.log(`[usePosLogic] Attempting to resume order for table: ${table.name} (ID: ${table.id})`);
    try {
      const existingOrder = await window.api.getOpenOrderForTable(table.id);
      if (existingOrder) {
        menuActions.updateDisplayMenuForOrderType(existingOrder.orderType); // Ensure correct menu
        initializeOrder(existingOrder);
        viewActions.navigateToOrderView();
        console.log(`[usePosLogic] Resumed order ID: ${existingOrder.id}`);
      } else {
        // Should ideally not happen if table status is OCCUPIED, but handle defensively
        console.warn(`[usePosLogic] No open order found for table ${table.id}, starting a new Dine-In order.`);
        await startOrder('Dine-In', table.id);
      }
    } catch (err) {
      console.error("[usePosLogic] Failed to resume order:", err);
      notifications.show({ title: 'Error', message: `Failed to resume order: ${err.message}`, color: 'red' });
    }
  }, [menuActions, initializeOrder, viewActions, startOrder]); // Added dependencies


  // --- GO HOME (Reset View) ---
  const handleGoHome = useCallback(async () => {
    console.log("[usePosLogic] Navigating home");
    clearActiveOrder();
    viewActions.navigateToHome();
    menuActions.clearDisplayMenu(); // Clear specific menu
    await refreshData(); // Refresh tables status
  }, [clearActiveOrder, viewActions, menuActions, refreshData]); // Added dependencies

  // --- SELECT DINE-IN ---
  const handleSelectDineIn = useCallback(() => {
    console.log("[usePosLogic] Selected Dine-In");
    viewActions.navigateToTableSelect();
  }, [viewActions]); // Added dependency

  // --- SELECT TABLE ---
  const handleTableSelect = useCallback((table) => {
    console.log(`[usePosLogic] Selected table: ${table.name} (Status: ${table.status})`);
    if (table.status === 'OCCUPIED') {
      resumeOrder(table);
    } else {
      startOrder('Dine-In', table.id);
    }
  }, [resumeOrder, startOrder]); // Added dependencies

  // --- FINALIZE ORDER ---
  const handleFinalizeOrder = useCallback(async (payments) => {
    if (!activeOrder) return;
    console.log(`[usePosLogic] Attempting to finalize order ID: ${activeOrder.id}`);
    const orderType = activeOrder.orderType;
    try {
      await window.api.finalizeOrder({ orderId: activeOrder.id, payments });
      notifications.show({ title: 'Success', message: 'Order finalized!', color: 'green' });
      modalActions.closePaymentModal();
      clearActiveOrder();
      if (orderType === 'Dine-In') {
        await handleGoHome(); // Go home for Dine-In
      } else {
        await startOrder(orderType); // Start a new order of the same non-dine-in type
      }
      console.log(`[usePosLogic] Finalized order ID: ${activeOrder.id}`);
    } catch (err) {
      console.error("[usePosLogic] Failed to finalize order:", err);
      notifications.show({ title: 'Error', message: `Failed to finalize order: ${err.message}`, color: 'red' });
    }
  }, [activeOrder, modalActions, clearActiveOrder, handleGoHome, startOrder]); // Added dependencies

  // --- FAST CASH ---
  const handleFastCash = useCallback(async () => {
    if (!activeOrder || !activeOrder.items || activeOrder.items.length === 0) return;
    console.log(`[usePosLogic] Attempting fast cash for order ID: ${activeOrder.id}`);
    const payments = [{ method: 'Cash', amount: activeOrder.totalAmount }];
    const orderType = activeOrder.orderType;
    try {
        await window.api.finalizeOrder({ orderId: activeOrder.id, payments });
        notifications.show({ title: 'Success', message: 'Order paid in cash!', color: 'green' });
        clearActiveOrder();
        if (orderType === 'Dine-In') {
            await handleGoHome();
        } else {
            await startOrder(orderType);
        }
        console.log(`[usePosLogic] Fast cash completed for order ID: ${activeOrder.id}`);
    } catch (err) {
        console.error("[usePosLogic] Fast cash failed:", err);
        notifications.show({ title: 'Error', message: `Fast cash failed: ${err.message}`, color: 'red' });
    }
  }, [activeOrder, clearActiveOrder, handleGoHome, startOrder]); // Added dependencies

  // --- HOLD ORDER ---
  // *** THIS IS THE FUNCTION WE ARE DEBUGGING ***
  const handleHoldOrder = useCallback(async () => {
    if (!activeOrder || !activeOrder.items || activeOrder.items.length === 0) return;
    const orderIdToHold = activeOrder.id;
    const orderType = activeOrder.orderType;
    console.log(`[usePosLogic - handleHoldOrder] Attempting to hold order ID: ${orderIdToHold}, Type: ${orderType}`); // <<< ADDED LOG
    try {
      console.log(`[usePosLogic - handleHoldOrder] Calling window.api.holdOrder for ID: ${orderIdToHold}`); // <<< ADDED LOG
      await window.api.holdOrder({ orderId: orderIdToHold });
      console.log(`[usePosLogic - handleHoldOrder] API call success. Clearing active order.`); // <<< ADDED LOG
      notifications.show({ title: 'Held', message: 'Order placed on hold.', color: 'blue' });
      clearActiveOrder();
      console.log(`[usePosLogic - handleHoldOrder] Active order cleared. Starting new order of type: ${orderType}`); // <<< ADDED LOG
      await startOrder(orderType); // Start a new order of the same type
      console.log(`[usePosLogic - handleHoldOrder] Hold process complete.`); // <<< ADDED LOG
    } catch (err) {
      console.error("[usePosLogic - handleHoldOrder] Failed to hold order:", err); // <<< ADDED LOG
      notifications.show({ title: 'Error', message: `Failed to hold order: ${err.message}`, color: 'red' });
    }
  }, [activeOrder, clearActiveOrder, startOrder]); // Added dependencies

  // --- CLEAR ORDER ---
  const handleClearOrder = useCallback(async () => {
    if (!activeOrder || !activeOrder.items || activeOrder.items.length === 0) return;
    const orderIdToClear = activeOrder.id;
    const orderType = activeOrder.orderType;
    console.log(`[usePosLogic] Attempting to clear order ID: ${orderIdToClear}`);
    if (window.confirm('Are you sure you want to clear this entire order?')) {
        try {
            await window.api.clearOrder({ orderId: orderIdToClear });
            notifications.show({ title: 'Cleared', message: 'Order has been cleared.', color: 'orange' });
            clearActiveOrder();
            await startOrder(orderType); // Start a new blank order of the same type
            console.log(`[usePosLogic] Cleared order ID: ${orderIdToClear}`);
        } catch (err) {
            console.error("[usePosLogic] Failed to clear order:", err);
            notifications.show({ title: 'Error', message: `Failed to clear order: ${err.message}`, color: 'red' });
        }
    }
  }, [activeOrder, clearActiveOrder, startOrder]); // Added dependencies


  // --- RETURN VALUE ---
  return {
    // States
    posView, activeOrder, tables, menu: currentDisplayMenu, heldOrders, discounts, isLoading, error, selectedItemId,
    // Modal States (direct passthrough)
    modifierModalOpened, paymentModalOpened, heldOrdersModalOpened, commentModalOpened, discountModalOpened, keyboardVisible,
    customizingProduct, commentTarget, discountTarget,

    actions: {
      // View actions
      handleGoHome, handleSelectDineIn, setPosView: viewActions.setPosView,

      // Order start/select
      startOrder, handleTableSelect,

      // Item/Modifier actions (pass product from modal state)
      handleProductSelect: (product) => {
          console.log(`[usePosLogic] Product selected: ${product.name}`);
          if (!currentDisplayMenu.products.some(p => p.id === product.id)) {
              console.warn("[usePosLogic] Selected product not found in current display menu.");
              return;
          }
          if (product.modifierGroups && product.modifierGroups.length > 0) {
              console.log("[usePosLogic] Opening modifier modal.");
              modalActions.handleOpenModifierModal(product);
          } else {
              console.log("[usePosLogic] Adding item directly (no modifiers).");
              orderActions.handleAddItem(product, []);
          }
      },
      handleConfirmModifiers: (product, selectedModifiers) => {
          console.log(`[usePosLogic] Modifiers confirmed for ${product.name}. Adding item.`);
          orderActions.handleAddItem(product, selectedModifiers);
          modalActions.handleCloseModifierModal();
      },
      ...orderActions, // Add/Update/Remove/Select Item

      // Held/Resume actions (pass activeOrder)
      handleHold: () => {
          console.log("[usePosLogic] handleHold action triggered."); // <<< ADDED LOG
          if (!activeOrder) {
              console.log("[usePosLogic] No active order, showing held Takeaway orders."); // <<< ADDED LOG
              heldOrderActions.handleShowHeldOrders('Takeaway');
              return;
          }
          if (activeOrder.items && activeOrder.items.length > 0) {
              console.log("[usePosLogic] Active order has items, calling handleHoldOrder function."); // <<< ADDED LOG
              handleHoldOrder(); // *** This is the one we added logs to ***
          } else {
              console.log(`[usePosLogic] Active order is empty, showing held orders for type: ${activeOrder.orderType}`); // <<< ADDED LOG
              heldOrderActions.handleShowHeldOrders(activeOrder.orderType);
          }
      },
      ...heldOrderActions, // Show/Resume/Delete Held

      // Other Order actions
      handleFinalizeOrder, handleClearOrder, handleFastCash, refreshData,

      // Wrapped Comment/Discount actions (pass targets from modal state)
      handleSaveComment: async (target, comment) => {
          console.log("[usePosLogic] Saving comment.");
          await orderActions.handleSaveComment(target, comment);
          modalActions.handleCloseCommentModal(); // Close after save
      },
      handleSelectDiscount: async (discountId) => {
           console.log(`[usePosLogic] Applying/Removing discount ID: ${discountId}`);
           await orderActions.handleSelectDiscount(discountTarget, discountId);
           modalActions.handleCloseDiscountModal(); // Close after select/remove
      },

      // --- Pass through ALL modal actions directly ---
      ...modalActions
    }
  };
}