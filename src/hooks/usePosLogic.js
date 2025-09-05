// src/hooks/usePosLogic.js
"use client";

import { useState, useEffect } from 'react';
import { useDisclosure } from '@mantine/hooks';
import { createOrderLifecycleActions } from './pos-logic/orderLifecycle';
import { createCartActions } from './pos-logic/cartActions';
import { createUiHandlers } from './pos-logic/uiHandlers';

export function usePosLogic({ tables, refreshData }) {
  // --- STATE MANAGEMENT ---
  const [activeOrder, setActiveOrder] = useState(null);
  const [posView, setPosView] = useState('home');
  const [activeOrderType, setActiveOrderType] = useState(null);
  const [draftedOrders, setDraftedOrders] = useState([]);
  const [customizingProduct, setCustomizingProduct] = useState(null);
  const [selectedItemId, setSelectedItemId] = useState(null);
  const [modifierModalOpened, { open: openModifierModal, close: closeModifierModal }] = useDisclosure(false);
  const [paymentModalOpened, { open: openPaymentModal, close: closePaymentModal }] = useDisclosure(false);
  const [previousPosView, setPreviousPosView] = useState(null);

  useEffect(() => {
    setSelectedItemId(null);
  }, [activeOrder?.id]);

  // --- ASSEMBLE ACTIONS FROM SMALLER FILES ---
  
  const orderLifecycleActions = createOrderLifecycleActions({ 
    tables, 
    activeOrder, 
    setActiveOrder, 
    posView,
    setPosView, 
    activeOrderType,
    setActiveOrderType,
    previousPosView,
    setPreviousPosView,
    refreshData, 
    closePaymentModal,
    setDraftedOrders, // <-- This was the missing piece for the delete draft refresh
  });

  const cartActions = createCartActions({ 
    activeOrder, setActiveOrder, setSelectedItemId 
  });
  
  const uiHandlers = createUiHandlers({ 
    setCustomizingProduct, openModifierModal, 
    handleAddItem: cartActions.handleAddItem,
    startOrder: orderLifecycleActions.startOrder, 
    resumeOrder: orderLifecycleActions.resumeOrder,
    setSelectedItemId, posView, setPosView, setPreviousPosView,
    setActiveOrderType, setDraftedOrders
  });

  // --- RETURN VALUE ---
  return {
    posView,
    activeOrder,
    activeOrderType,
    draftedOrders,
    customizingProduct,
    modifierModalOpened,
    paymentModalOpened,
    selectedItemId,
    actions: {
      ...orderLifecycleActions,
      ...cartActions,
      ...uiHandlers,
      closeModifierModal,
      openPaymentModal,
      closePaymentModal,
    }
  };
}