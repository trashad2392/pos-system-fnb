// src/hooks/usePosLogic.js
"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { usePosData } from './usePosData';
import { useModalState } from './useModalState';
import { useOrderManagement } from './useOrderManagement';
import { usePosView } from './usePosView';
import { useHeldOrders } from './useHeldOrders';
import { useMenuFiltering } from './useMenuFiltering';
import { notifications } from '@mantine/notifications';

// Helper hook to track previous value
function usePrevious(value) {
  const ref = useRef();
  useEffect(() => {
    ref.current = value;
  });
  return ref.current;
}


export function usePosLogic() {
  const {
    tables, fullActiveMenuData, posSettings, discounts,
    isLoading, error, refreshData
  } = usePosData();

  const {
    modifierModalOpened, paymentModalOpened, heldOrdersModalOpened, commentModalOpened, discountModalOpened, keyboardVisible,
    customizingProduct, commentTarget, discountTarget,
    paymentModalInitialTab, // Get initial tab state
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

  const [selectedPaymentMethods, setSelectedPaymentMethods] = useState(null);
  const [paymentSelectionType, setPaymentSelectionType] = useState(null);
  const [splitPaymentRequiresReconfirm, setSplitPaymentRequiresReconfirm] = useState(false);

  const {
    heldOrders, actions: heldOrderActions
  } = useHeldOrders(modalActions, viewActions, initializeOrder, menuActions.updateDisplayMenuForOrderType);

  const previousTotalAmount = usePrevious(activeOrder?.totalAmount);
  const previousOrderId = usePrevious(activeOrder?.id);

  // Effect to clear selected payments when the order ID changes or becomes null
  useEffect(() => {
    if (activeOrder?.id !== previousOrderId) {
        console.log(`[usePosLogic] Order ID changed from ${previousOrderId} to ${activeOrder?.id}. Clearing payment selection.`);
        setSelectedPaymentMethods(null);
        setPaymentSelectionType(null);
        setSplitPaymentRequiresReconfirm(false);
    }
  }, [activeOrder?.id, previousOrderId]);


  // Effect to FLAG reconfirmation if total changes *after* 'split' selection
  useEffect(() => {
    if (
        selectedPaymentMethods &&
        activeOrder &&
        previousTotalAmount !== undefined &&
        activeOrder?.id === previousOrderId &&
        activeOrder.totalAmount !== previousTotalAmount
       ) {

        if (paymentSelectionType === 'split') {
            console.log(`[usePosLogic] Order total changed after SPLIT payment selection. Flagging for reconfirmation.`);
            setSplitPaymentRequiresReconfirm(true);
            // --- NOTIFICATION REMOVED ---
        }
        // No action needed for 'full' payment type change
    }
  }, [activeOrder?.totalAmount, previousTotalAmount, selectedPaymentMethods, paymentSelectionType, activeOrder?.id, previousOrderId]);


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
      if (tableId) await refreshData();
      console.log(`[usePosLogic] Started new order ID: ${newOrder.id}`);
    } catch (err) {
      console.error("[usePosLogic] Failed to start order:", err);
      notifications.show({ title: 'Error', message: `Failed to start order: ${err.message}`, color: 'red' });
    }
  }, [tables, menuActions, initializeOrder, viewActions, refreshData]);

  // --- RESUME DINE-IN ORDER ---
  const resumeOrder = useCallback(async (table) => {
     console.log(`[usePosLogic] Attempting to resume order for table: ${table.name} (ID: ${table.id})`);
    try {
      const existingOrder = await window.api.getOpenOrderForTable(table.id);
      if (existingOrder) {
        menuActions.updateDisplayMenuForOrderType(existingOrder.orderType);
        initializeOrder(existingOrder);
        viewActions.navigateToOrderView();
        console.log(`[usePosLogic] Resumed order ID: ${existingOrder.id}`);
      } else {
        console.warn(`[usePosLogic] No open order found for table ${table.id}, starting a new Dine-In order.`);
        await startOrder('Dine-In', table.id);
      }
    } catch (err) {
      console.error("[usePosLogic] Failed to resume order:", err);
      notifications.show({ title: 'Error', message: `Failed to resume order: ${err.message}`, color: 'red' });
    }
  }, [menuActions, initializeOrder, viewActions, startOrder]);


  // --- GO HOME (Reset View) ---
  const handleGoHome = useCallback(async () => {
    console.log("[usePosLogic] Navigating home");
    clearActiveOrder();
    viewActions.navigateToHome();
    menuActions.clearDisplayMenu();
    await refreshData();
  }, [clearActiveOrder, viewActions, menuActions, refreshData]);

  // --- SELECT DINE-IN ---
  const handleSelectDineIn = useCallback(() => {
    console.log("[usePosLogic] Selected Dine-In");
    viewActions.navigateToTableSelect();
  }, [viewActions]);

  // --- SELECT TABLE ---
  const handleTableSelect = useCallback((table) => {
    console.log(`[usePosLogic] Selected table: ${table.name} (Status: ${table.status})`);
    if (table.status === 'OCCUPIED') {
      resumeOrder(table);
    } else {
      startOrder('Dine-In', table.id);
    }
  }, [resumeOrder, startOrder]);

  // --- Function to handle payment selection, now accepts type ---
  const handleSelectPayment = useCallback((payments, type) => {
     if (!activeOrder) {
         console.error("[usePosLogic] Cannot select payment: No active order.");
         return;
     }
     const selectedTotal = payments.reduce((sum, p) => sum + p.amount, 0);
     if (Math.abs(selectedTotal - activeOrder.totalAmount) > 0.015) {
        console.warn(`[usePosLogic] Payment selection total (${selectedTotal.toFixed(2)}) doesn't match current order total (${activeOrder.totalAmount.toFixed(2)}).`);
        notifications.show({ title: 'Amount Mismatch', message: 'Order total may have changed. Please verify amounts.', color: 'yellow', autoClose: 5000 });
     }

    console.log("[usePosLogic] Payment method selected:", payments, "Type:", type);
    setSelectedPaymentMethods(payments);
    setPaymentSelectionType(type);
    setSplitPaymentRequiresReconfirm(false);
    modalActions.closePaymentModal();
  }, [modalActions, activeOrder]);

  // --- START: MODIFIED finalizeOrder ---
  const handleFinalizeOrder = useCallback(async () => {
    if (!activeOrder || !selectedPaymentMethods) {
        notifications.show({ title: 'Warning', message: 'Please select payment method via Exceptions.', color: 'yellow' });
        return;
    }
    if (paymentSelectionType === 'split' && splitPaymentRequiresReconfirm) {
        console.log("[usePosLogic] Split payment requires reconfirmation. Re-opening modal.");
        modalActions.openPaymentModal({ initialTab: 'split' });
        return;
    }
    let finalPayments = [...selectedPaymentMethods];
    let finalTotalCheckAmount = finalPayments.reduce((sum, p) => sum + p.amount, 0);
    if (paymentSelectionType === 'full' && finalPayments.length === 1) {
        finalPayments[0].amount = activeOrder.totalAmount;
        finalTotalCheckAmount = activeOrder.totalAmount;
    }
     if (Math.abs(finalTotalCheckAmount - activeOrder.totalAmount) > 0.015) {
        console.error(`[usePosLogic] Finalization Mismatch: Payment total (${finalTotalCheckAmount.toFixed(2)}) vs Order total (${activeOrder.totalAmount.toFixed(2)}).`);
        notifications.show({ title: 'Error: Amount Mismatch', message: 'Order total changed unexpectedly. Please re-select payment method.', color: 'red', autoClose: 7000 });
        setSelectedPaymentMethods(null);
        setPaymentSelectionType(null);
        setSplitPaymentRequiresReconfirm(false);
        return;
     }
    const orderType = activeOrder.orderType;
    const orderIdToFinalize = activeOrder.id;
    try {
      // Capture the finalized order object returned from the API
      const finalizedOrder = await window.api.finalizeOrder({ orderId: orderIdToFinalize, payments: finalPayments });
      notifications.show({ title: 'Success', message: 'Order finalized!', color: 'green' });

      // --- ADDED PRINT CALL ---
      if (finalizedOrder) {
        console.log(`[usePosLogic] Order finalized, triggering print for ID: ${finalizedOrder.id}`);
        await window.api.printReceipt(finalizedOrder.id);
      }
      // --- END PRINT CALL ---

      clearActiveOrder();
      if (orderType === 'Dine-In') await handleGoHome(); else await startOrder(orderType);
    } catch (err) {
      console.error("[usePosLogic] Failed to finalize order:", err);
      notifications.show({ title: 'Error', message: `Failed to finalize order: ${err.message}`, color: 'red' });
       if (err.message.includes("does not match order total")) {
            setSelectedPaymentMethods(null);
            setPaymentSelectionType(null);
            setSplitPaymentRequiresReconfirm(false);
       }
    }
  }, [activeOrder, selectedPaymentMethods, paymentSelectionType, splitPaymentRequiresReconfirm, modalActions, clearActiveOrder, handleGoHome, startOrder]);
  // --- END: MODIFIED finalizeOrder ---


  // --- START: MODIFIED handleFastCash ---
  const handleFastCash = useCallback(async () => {
     if (!activeOrder || !activeOrder.items || activeOrder.items.length === 0) return;
    if (activeOrder.totalAmount < 0.001) {
        notifications.show({ title: 'Info', message: 'Cannot Fast Cash a zero total order.', color: 'blue' });
        return;
    }
    const cashPayment = [{ method: 'Cash', amount: activeOrder.totalAmount }];
    const orderType = activeOrder.orderType;
    const orderIdToFinalize = activeOrder.id;
    try {
        // Capture the finalized order object returned from the API
        const finalizedOrder = await window.api.finalizeOrder({ orderId: orderIdToFinalize, payments: cashPayment });
        notifications.show({ title: 'Success', message: 'Order paid in cash!', color: 'green' });

        // --- ADDED PRINT CALL ---
        if (finalizedOrder) {
          console.log(`[usePosLogic] Fast Cash finalized, triggering print for ID: ${finalizedOrder.id}`);
          await window.api.printReceipt(finalizedOrder.id);
        }
        // --- END PRINT CALL ---

        clearActiveOrder();
        if (orderType === 'Dine-In') await handleGoHome(); else await startOrder(orderType);
    } catch (err) {
        console.error("[usePosLogic] Fast cash failed:", err);
        notifications.show({ title: 'Error', message: `Fast cash failed: ${err.message}`, color: 'red' });
    }
  }, [activeOrder, clearActiveOrder, handleGoHome, startOrder]);
  // --- END: MODIFIED handleFastCash ---


  // --- HOLD ORDER ---
  const handleHoldOrder = useCallback(async () => {
     if (!activeOrder || !activeOrder.items || activeOrder.items.length === 0) return;
    const orderIdToHold = activeOrder.id;
    const orderType = activeOrder.orderType;
    try {
      await window.api.holdOrder({ orderId: orderIdToHold });
      notifications.show({ title: 'Held', message: 'Order placed on hold.', color: 'blue' });
      clearActiveOrder();
      await startOrder(orderType);
    } catch (err) {
      console.error("[usePosLogic - handleHoldOrder] Failed to hold order:", err);
      notifications.show({ title: 'Error', message: `Failed to hold order: ${err.message}`, color: 'red' });
    }
  }, [activeOrder, clearActiveOrder, startOrder]);

  // --- CLEAR ORDER ---
  const handleClearOrder = useCallback(async () => {
     if (!activeOrder || !activeOrder.items || activeOrder.items.length === 0) return;
    const orderIdToClear = activeOrder.id;
    const orderType = activeOrder.orderType;
    if (window.confirm('Are you sure you want to clear this entire order?')) {
        try {
            await window.api.clearOrder({ orderId: orderIdToClear });
            notifications.show({ title: 'Cleared', message: 'Order has been cleared.', color: 'orange' });
            clearActiveOrder();
            await startOrder(orderType);
        } catch (err) {
            console.error("[usePosLogic] Failed to clear order:", err);
            notifications.show({ title: 'Error', message: `Failed to clear order: ${err.message}`, color: 'red' });
        }
    }
  }, [activeOrder, clearActiveOrder, startOrder]);

  // --- Define handleHold wrapper ---
  const handleHold = useCallback(() => {
    console.log("[usePosLogic] handleHold action triggered.");
    if (!activeOrder) {
        console.log("[usePosLogic] No active order, showing held Takeaway orders.");
        heldOrderActions.handleShowHeldOrders('Takeaway');
        return;
    }
    if (!activeOrder.items || activeOrder.items.length === 0) {
        console.log(`[usePosLogic] Active order is empty, showing held orders for type: ${activeOrder.orderType}`);
        heldOrderActions.handleShowHeldOrders(activeOrder.orderType);
    } else {
        console.log("[usePosLogic] Active order has items, calling handleHoldOrder function.");
        handleHoldOrder();
    }
  }, [activeOrder, handleHoldOrder, heldOrderActions]);

  // --- RETURN VALUE ---
  return {
    // States
    posView, activeOrder, tables, menu: currentDisplayMenu, heldOrders, discounts, isLoading, error, selectedItemId,
    selectedPaymentMethods,
    paymentSelectionType,
    splitPaymentRequiresReconfirm,

    // Modal States
    modifierModalOpened, paymentModalOpened, heldOrdersModalOpened, commentModalOpened, discountModalOpened, keyboardVisible,
    customizingProduct, commentTarget, discountTarget,
    paymentModalInitialTab,

    actions: {
      handleGoHome, handleSelectDineIn, setPosView: viewActions.setPosView,
      startOrder, handleTableSelect,

      // Item/Modifier actions
      handleProductSelect: (product) => {
        if (!activeOrder) {
            console.error("[usePosLogic] Cannot add item: No active order found.");
            notifications.show({ title: 'Error', message: 'Cannot add item, no active order.', color: 'red'});
            return;
        }
        console.log(`[usePosLogic] Product selected: ${product.name}`);
        if (!currentDisplayMenu.products.some(p => p.id === product.id)) {
            console.warn("[usePosLogic] Selected product not found in current display menu.");
            return;
        }
        if (product.modifierGroups && product.modifierGroups.length > 0) {
            modalActions.handleOpenModifierModal(product);
        } else {
            orderActions.handleAddItem(product, []);
        }
      },
      handleConfirmModifiers: (product, selectedModifiers) => {
          if (!activeOrder) {
             console.error("[usePosLogic] Cannot confirm modifiers: No active order found.");
             return;
          }
          orderActions.handleAddItem(product, selectedModifiers);
          modalActions.handleCloseModifierModal();
      },
      ...orderActions, // Expose remaining order actions

      // Held/Resume actions
      handleHold,
      ...heldOrderActions,

      // Payment actions
      handleSelectPayment,
      handleFinalizeOrder,
      handleClearOrder,
      handleFastCash,
      refreshData,

      // Wrapped Comment/Discount actions
      handleSaveComment: async (target, comment) => {
          if (!activeOrder) return;
          await orderActions.handleSaveComment(target, comment);
          modalActions.handleCloseCommentModal();
      },
      handleSelectDiscount: async (discountId) => {
           if (!activeOrder) return;
           const target = discountTarget || activeOrder;
           await orderActions.handleSelectDiscount(target, discountId);
           modalActions.handleCloseDiscountModal();
      },

      // Modal actions
      ...modalActions
    }
  };
}