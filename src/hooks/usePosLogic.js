// src/hooks/usePosLogic.js
"use client";

import { useState, useEffect, useMemo } from 'react';
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

  // --- Use the revised modal hook ---
  const {
    // States
    modifierModalOpened, paymentModalOpened, heldOrdersModalOpened, commentModalOpened, discountModalOpened, keyboardVisible,
    customizingProduct, commentTarget, discountTarget,
    // Get the specific actions object
    actions: modalActions
  } = useModalState();
  // --- End using modal hook ---

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

  // --- Ensure internal functions use modalActions consistently ---
  const startOrder = async (orderType, tableId = null) => {
    try {
      menuActions.updateDisplayMenuForOrderType(orderType);
      const newOrder = await window.api.createOrder({ tableId, orderType });
      const selectedTable = tableId ? tables.find(t => t.id === tableId) : null;
      if (selectedTable) newOrder.table = selectedTable;
      initializeOrder(newOrder);
      viewActions.navigateToOrderView();
      if (tableId) await refreshData();
    } catch (err) { /* ... error handling ... */ }
  };
  const resumeOrder = async (table) => { /* ... uses menuActions, initializeOrder, viewActions ... */ };
  const handleGoHome = async () => { /* ... uses clearActiveOrder, viewActions, menuActions, refreshData ... */ };
  const handleSelectDineIn = () => { /* ... uses viewActions ... */ };
  const handleTableSelect = (table) => { /* ... uses startOrder, resumeOrder ... */ };

  const handleFinalizeOrder = async (payments) => {
    if (!activeOrder) return;
    const orderType = activeOrder.orderType;
    try {
      await window.api.finalizeOrder({ orderId: activeOrder.id, payments });
      notifications.show({ title: 'Success', message: 'Order finalized!', color: 'green' });
      modalActions.closePaymentModal(); // <-- Use modalActions
      clearActiveOrder();
      if (orderType === 'Dine-In') { await handleGoHome(); }
      else { await startOrder(orderType); }
    } catch (err) { /* ... error handling ... */ }
  };
   const handleFastCash = async () => {
        if (!activeOrder || !activeOrder.items || activeOrder.items.length === 0) return;
        const payments = [{ method: 'Cash', amount: activeOrder.totalAmount }];
        const orderType = activeOrder.orderType;
        try {
            await window.api.finalizeOrder({ orderId: activeOrder.id, payments });
            notifications.show({ title: 'Success', message: 'Order paid in cash!', color: 'green' });
            clearActiveOrder();
            if (orderType === 'Dine-In') { await handleGoHome(); }
            else { await startOrder(orderType); }
        } catch (err) { /* ... error handling ... */ }
    };
  const handleHoldOrder = async () => { /* ... uses clearActiveOrder, startOrder ... */ };
  const handleClearOrder = async () => { /* ... uses clearActiveOrder, startOrder ... */ };

  // --- Return Value ---
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
          if (!currentDisplayMenu.products.some(p => p.id === product.id)) { return; }
          if (product.modifierGroups && product.modifierGroups.length > 0) {
              modalActions.handleOpenModifierModal(product);
          } else {
              orderActions.handleAddItem(product, []);
          }
      },
      handleConfirmModifiers: (product, selectedModifiers) => {
          orderActions.handleAddItem(product, selectedModifiers);
          modalActions.handleCloseModifierModal();
      },
      ...orderActions, // Add/Update/Remove/Select Item

      // Held/Resume actions (pass activeOrder)
      handleHold: () => {
          if (!activeOrder) { heldOrderActions.handleShowHeldOrders('Takeaway'); return; }
          if (activeOrder.items && activeOrder.items.length > 0) { handleHoldOrder(); }
          else { heldOrderActions.handleShowHeldOrders(activeOrder.orderType); }
      },
      ...heldOrderActions, // Show/Resume/Delete Held

      // Other Order actions
      handleFinalizeOrder, handleClearOrder, handleFastCash, refreshData,

      // Wrapped Comment/Discount actions (pass targets from modal state)
      handleSaveComment: async (target, comment) => {
          await orderActions.handleSaveComment(target, comment);
          modalActions.handleCloseCommentModal(); // Close after save
      },
      handleSelectDiscount: async (discountId) => {
           await orderActions.handleSelectDiscount(discountTarget, discountId);
           modalActions.handleCloseDiscountModal(); // Close after select/remove
      },

      // --- Pass through ALL modal actions directly ---
      ...modalActions
    }
  };
}