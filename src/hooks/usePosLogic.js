// src/hooks/usePosLogic.js
"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { usePosData } from './usePosData';
import { useModalState } from './useModalState';
import { useOrderManagement } from './useOrderManagement';
import { usePosView } from './usePosView';
import { useHeldOrders } from './useHeldOrders';
import { useMenuFiltering } from './useMenuFiltering';
import { notifications } from '@mantine/notifications';
import { validatePaymentTotal, prepareFinalPayments } from '../lib/paymentUtils';

function usePrevious(value) {
  const ref = useRef();
  useEffect(() => { ref.current = value; });
  return ref.current;
}

export function usePosLogic() {
  const {
    tables, fullActiveMenuData, posSettings, paymentMethods,
    isLoading, error: dataError, discounts, refreshData 
  } = usePosData();

  const {
    paymentModalOpened, paymentModalInitialTab,
    modifierModalOpened, heldOrdersModalOpened, commentModalOpened, 
    discountModalOpened, keyboardVisible, customizingProduct, 
    commentTarget, discountTarget,
    actions: modalActions
  } = useModalState();

  const {
    activeOrder, selectedItemId,
    initializeOrder, clearActiveOrder, actions: orderActions
  } = useOrderManagement();

  const { posView, actions: viewActions } = usePosView();
  const { currentDisplayMenu, actions: menuActions } = useMenuFiltering(fullActiveMenuData, posSettings, isLoading);

  const [selectedPaymentMethods, setSelectedPaymentMethods] = useState(null);
  const [paymentSelectionType, setPaymentSelectionType] = useState(null);
  const [splitPaymentRequiresReconfirm, setSplitPaymentRequiresReconfirm] = useState(false);
  const [creditSaleCustomerId, setCreditSaleCustomerId] = useState(null);

  const { heldOrders, actions: heldOrderActions } = useHeldOrders(
    modalActions, 
    viewActions, 
    initializeOrder, 
    menuActions.updateDisplayMenuForOrderType
  );

  const previousTotalAmount = usePrevious(activeOrder?.totalAmount);
  const previousOrderId = usePrevious(activeOrder?.id);

  useEffect(() => {
    if (activeOrder?.id !== previousOrderId) {
        setSelectedPaymentMethods(null);
        setPaymentSelectionType(null);
        setSplitPaymentRequiresReconfirm(false);
        setCreditSaleCustomerId(null);
    }
  }, [activeOrder?.id, previousOrderId]);

  useEffect(() => {
    if (selectedPaymentMethods && activeOrder && previousTotalAmount !== undefined && 
        activeOrder?.id === previousOrderId && activeOrder.totalAmount !== previousTotalAmount) {
        if (paymentSelectionType === 'split') setSplitPaymentRequiresReconfirm(true);
    }
  }, [activeOrder?.totalAmount, previousTotalAmount, selectedPaymentMethods, paymentSelectionType, activeOrder?.id, previousOrderId]);

  const startOrder = useCallback(async (orderType, tableId = null) => {
    try {
      menuActions.updateDisplayMenuForOrderType(orderType);
      const newOrder = await window.api.createOrder({ tableId, orderType });
      const selectedTable = tableId ? tables.find(t => t.id === tableId) : null;
      if (selectedTable) newOrder.table = selectedTable;
      initializeOrder(newOrder);
      viewActions.navigateToOrderView();
      if (tableId) await refreshData();
    } catch (err) {
      notifications.show({ title: 'Error', message: `Failed to start order: ${err.message}`, color: 'red' });
    }
  }, [tables, menuActions, initializeOrder, viewActions, refreshData]);

  const handleHoldOrder = useCallback(async () => {
    if (!activeOrder || !activeOrder.items?.length) return;
    const orderType = activeOrder.orderType;
    try {
      await window.api.holdOrder({ orderId: activeOrder.id });
      notifications.show({ title: 'Held', message: 'Order placed on hold.', color: 'blue' });
      clearActiveOrder();
      await startOrder(orderType);
    } catch (err) {
      notifications.show({ title: 'Error', message: `Failed to hold order: ${err.message}`, color: 'red' });
    }
  }, [activeOrder, clearActiveOrder, startOrder]);

  const handleClearOrder = useCallback(async () => {
    if (!activeOrder) return;
    const orderType = activeOrder.orderType;
    if (window.confirm('Are you sure you want to clear this entire order?')) {
        try {
            await window.api.clearOrder({ orderId: activeOrder.id });
            clearActiveOrder(); 
            await startOrder(orderType); 
            notifications.show({ title: 'Cleared', message: 'Order cleared.', color: 'orange' });
        } catch (err) {
            notifications.show({ title: 'Error', message: `Failed to clear order: ${err.message}`, color: 'red' });
        }
    }
  }, [activeOrder, clearActiveOrder, startOrder]);

  const handleSelectPayment = useCallback((payments, type, customerId = null) => {
    if (!activeOrder) return;
    const validation = validatePaymentTotal(payments, activeOrder.totalAmount);
    if (!validation.isValid) {
       notifications.show({ title: 'Amount Mismatch', message: 'Payment total does not match bill.', color: 'yellow' });
    }
    setSelectedPaymentMethods(payments);
    setPaymentSelectionType(type);
    setSplitPaymentRequiresReconfirm(false);
    setCreditSaleCustomerId(customerId);
    modalActions.closePaymentModal();
  }, [modalActions, activeOrder]);

  const handleFinalizeOrder = useCallback(async () => {
    if (!activeOrder || !selectedPaymentMethods) {
        notifications.show({ title: 'Warning', message: 'Please select payment method.', color: 'yellow' });
        return;
    }
    if (paymentSelectionType === 'split' && splitPaymentRequiresReconfirm) {
        modalActions.openPaymentModal({ initialTab: 'split' });
        return;
    }
    const finalPayments = prepareFinalPayments(selectedPaymentMethods, activeOrder.totalAmount, paymentSelectionType);
    try {
      const finalizedOrder = await window.api.finalizeOrder({ 
        orderId: activeOrder.id, payments: finalPayments, customerId: paymentSelectionType === 'credit' ? creditSaleCustomerId : null 
      });
      if (finalizedOrder) await window.api.printReceipt(finalizedOrder.id);
      notifications.show({ title: 'Success', message: 'Order finalized!', color: 'green' });
      const type = activeOrder.orderType;
      clearActiveOrder();
      if (type === 'Dine-In') { viewActions.navigateToHome(); await refreshData(); } else { startOrder(type); }
    } catch (err) {
      notifications.show({ title: 'Transaction Failed', message: err.message, color: 'red' });
    }
  }, [activeOrder, selectedPaymentMethods, paymentSelectionType, splitPaymentRequiresReconfirm, creditSaleCustomerId, modalActions, clearActiveOrder, refreshData, viewActions, startOrder]);

  const handleFastCash = useCallback(async () => {
    if (!activeOrder || !activeOrder.items?.length) return;
    const total = parseFloat(activeOrder.totalAmount.toFixed(2));
    const cashPayment = [{ method: 'Cash', amount: total }];
    try {
        const finalizedOrder = await window.api.finalizeOrder({ orderId: activeOrder.id, payments: cashPayment, customerId: null });
        if (finalizedOrder) await window.api.printReceipt(finalizedOrder.id);
        notifications.show({ title: 'Success', message: 'Paid in cash!', color: 'green' });
        const type = activeOrder.orderType;
        clearActiveOrder();
        if (type === 'Dine-In') { viewActions.navigateToHome(); await refreshData(); } else { startOrder(type); }
    } catch (err) {
        notifications.show({ title: 'Error', message: err.message, color: 'red' });
    }
  }, [activeOrder, clearActiveOrder, refreshData, viewActions, startOrder]);

  return {
    posView, activeOrder, tables, menu: currentDisplayMenu, paymentMethods,
    isLoading, error: dataError, selectedItemId, selectedPaymentMethods, 
    paymentSelectionType, splitPaymentRequiresReconfirm, creditSaleCustomerId,
    modifierModalOpened, paymentModalOpened, heldOrdersModalOpened, 
    commentModalOpened, discountModalOpened, keyboardVisible,
    customizingProduct, commentTarget, discountTarget, paymentModalInitialTab,
    heldOrders, discounts,
    actions: {
      // 1. Spread generic actions first
      ...orderActions, 
      ...heldOrderActions, 
      ...modalActions,

      // 2. Define custom logic wrappers last so they are not overwritten
      handleSelectDiscount: async (id) => { 
          if (!activeOrder) return;
          
          console.log(`[LOGIC-HOOK] Received ID from Modal: ${id}`);

          const currentId = activeOrder?.discountId;
          const finalIdToApply = (id === currentId) ? null : id;

          console.log(`[LOGIC-HOOK] Final Intent -> ID: ${finalIdToApply}`);

          modalActions.handleCloseDiscountModal(); 
          
          // Call the order management handler with two arguments explicitly
          await orderActions.handleSelectDiscount(activeOrder, finalIdToApply); 
      },

      startOrder, 
      handleGoHome: async () => { clearActiveOrder(); viewActions.navigateToHome(); await refreshData(); },
      handleTableSelect: (t) => t.status === 'OCCUPIED' ? heldOrderActions.resumeOrder(t) : startOrder('Dine-In', t.id),
      handleProductSelect: (p) => p.modifierGroups?.length > 0 ? modalActions.handleOpenModifierModal(p) : orderActions.handleAddItem(p, []),
      handleConfirmModifiers: (p, m) => { orderActions.handleAddItem(p, m); modalActions.handleCloseModifierModal(); },
      handleHold: () => (!activeOrder || !activeOrder.items?.length) ? heldOrderActions.handleShowHeldOrders(activeOrder?.orderType || 'Takeaway') : handleHoldOrder(),
      handleSaveComment: async (t, c) => { await orderActions.handleSaveComment(t, c); modalActions.handleCloseCommentModal(); },
      handleSelectPayment, 
      handleFinalizeOrder, 
      handleClearOrder, 
      handleFastCash,
      refreshData,
    }
  };
}