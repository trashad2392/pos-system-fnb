// src/hooks/usePosLogic.js
"use client";

import { useState, useEffect } from 'react';
import { useDisclosure } from '@mantine/hooks';
import { usePosData } from './usePosData';
import { notifications } from '@mantine/notifications';

export function usePosLogic() {
  const { tables, menu, isLoading, refreshData } = usePosData();

  const [activeOrder, setActiveOrder] = useState(null);
  const [posView, setPosView] = useState('home');
  const [heldOrders, setHeldOrders] = useState([]);
  const [customizingProduct, setCustomizingProduct] = useState(null);
  const [selectedItemId, setSelectedItemId] = useState(null);
  const [commentTarget, setCommentTarget] = useState(null);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [modifierModalOpened, { open: openModifierModal, close: closeModifierModal }] = useDisclosure(false);
  const [paymentModalOpened, { open: openPaymentModal, close: closePaymentModal }] = useDisclosure(false);
  const [heldOrdersModalOpened, { open: openHeldOrdersModal, close: closeHeldOrdersModal }] = useDisclosure(false);
  const [commentModalOpened, { open: openCommentModal, close: closeCommentModal }] = useDisclosure(false);

  const toggleKeyboard = () => setKeyboardVisible((v) => !v);

  const handleOpenCommentModal = (target) => {
    setCommentTarget(target);
    openCommentModal();
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
  
  const startOrder = async (orderType, tableId = null) => {
    try {
      const newOrder = await window.api.createOrder({ tableId, orderType });
      const selectedTable = tableId ? tables.find(t => t.id === tableId) : null;
      if (selectedTable) newOrder.table = selectedTable;
      setActiveOrder(newOrder);
      setPosView('order-view');
      if (tableId) refreshData();
    } catch (error) {
      notifications.show({ title: 'Error', message: `Failed to create ${orderType} order: ${error.message}`, color: 'red' });
    }
  };

  useEffect(() => {
    setSelectedItemId(null);
    if (!activeOrder && !isLoading && posView !== 'home' && posView !== 'table-select') {
      startOrder(posView);
    }
  }, [activeOrder, posView, isLoading]);


  const handleGoHome = () => {
    setActiveOrder(null);
    setPosView('home');
    refreshData();
  };

  const handleSelectDineIn = () => {
    setPosView('table-select');
  };

  const resumeOrder = async (table) => {
    try {
      const existingOrder = await window.api.getOpenOrderForTable(table.id);
      if (existingOrder) {
        existingOrder.table = table;
        setActiveOrder(existingOrder);
        setPosView('order-view');
      } else {
        notifications.show({ title: 'Error', message: `Table ${table.name} is occupied, but no open order was found.`, color: 'red' });
        refreshData();
      }
    } catch (error) {
      notifications.show({ title: 'Error', message: `Failed to handle table selection: ${error.message}`, color: 'red' });
    }
  };

  const handleTableSelect = (table) => {
    if (table.status === 'AVAILABLE') {
      startOrder('Dine-In', table.id);
    } else {
      resumeOrder(table);
    }
  };
  
  const handleFinalizeOrder = async (paymentMethod) => {
    if (!activeOrder) return;
    const orderType = activeOrder.orderType;
    try {
      await window.api.finalizeOrder({ orderId: activeOrder.id, paymentMethod: paymentMethod });
      notifications.show({ title: 'Success', message: 'Order finalized successfully!', color: 'green' });
      closePaymentModal();
      if (orderType === 'Dine-In') {
        handleGoHome();
      } else {
        startOrder(orderType);
      }
    } catch (error) {
      notifications.show({ title: 'Error', message: `Failed to finalize order: ${error.message}`, color: 'red' });
    }
  };

  const handleHoldOrder = async () => {
    if (!activeOrder || !activeOrder.items || activeOrder.items.length === 0) return;
    const orderType = activeOrder.orderType;
    try {
      await window.api.holdOrder({ orderId: activeOrder.id });
      notifications.show({ title: 'Success', message: 'Order has been put on hold.', color: 'blue' });
      startOrder(orderType);
    } catch (error) {
      notifications.show({ title: 'Error', message: `Failed to hold order: ${error.message}`, color: 'red' });
    }
  };

  const handleShowHeldOrders = async () => {
    if (!activeOrder) return;
    try {
      const held = await window.api.getHeldOrders({ orderType: activeOrder.orderType });
      setHeldOrders(held);
      openHeldOrdersModal();
    } catch (error) {
      notifications.show({ title: 'Error', message: `Failed to get held orders: ${error.message}`, color: 'red' });
    }
  };
  
  const handleResumeHeldOrder = async (orderId) => {
    try {
      const resumedOrder = await window.api.resumeHeldOrder({ orderId });
      setActiveOrder(resumedOrder);
      setPosView('order-view');
      closeHeldOrdersModal();
    } catch (error) {
      notifications.show({ title: 'Error', message: `Failed to resume held order: ${error.message}`, color: 'red' });
    }
  };

  const handleDeleteHeldOrder = async (orderId) => {
    if (!activeOrder) return;
    try {
      await window.api.deleteHeldOrder({ orderId });
      handleShowHeldOrders();
    } catch (error) {
      notifications.show({ title: 'Error', message: `Failed to delete held order: ${error.message}`, color: 'red' });
    }
  };

  const handleClearOrder = async () => {
    if (!activeOrder || activeOrder.items.length === 0) return;
    if (window.confirm('Are you sure you want to clear this entire cart? This action will be logged.')) {
      const orderType = activeOrder.orderType;
      try {
        await window.api.clearOrder({ orderId: activeOrder.id });
        notifications.show({ title: 'Order Cleared', message: 'The cart has been cleared.', color: 'orange' });
        startOrder(orderType);
      } catch (error) {
        notifications.show({ title: 'Error', message: `Failed to clear order: ${error.message}`, color: 'red' });
      }
    }
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
        const lastItem = updatedOrder.items[updatedOrder.items.length - 1];
        setSelectedItemId(lastItem.id);
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
    } catch (error) {
      notifications.show({ title: 'Error', message: `Failed to update item quantity: ${error.message}`, color: 'red' });
    }
  };

  const handleRemoveItem = async (orderItemId) => {
    if (!activeOrder) return;
    try {
      const updatedOrder = await window.api.removeItemFromOrder({ orderId: activeOrder.id, orderItemId });
      setActiveOrder(updatedOrder);
      setSelectedItemId(null);
    } catch (error) {
      notifications.show({ title: 'Error', message: `Failed to remove item: ${error.message}`, color: 'red' });
    }
  };
  
  const handleProductSelect = (product) => {
    if (product.modifierGroups && product.modifierGroups.length > 0) {
      setCustomizingProduct(product);
      openModifierModal();
    } else {
      handleAddItem(product, []);
    }
  };

  const handleConfirmModifiers = (product, selectedModifiers) => {
    handleAddItem(product, selectedModifiers);
    closeModifierModal();
  };

  const handleSelectItem = (itemId) => {
    setSelectedItemId(currentItemId => currentItemId === itemId ? null : itemId);
  };
  
  const handleHold = () => {
    if (!activeOrder) return;
    if (activeOrder.items && activeOrder.items.length > 0) {
      handleHoldOrder();
    } else {
      handleShowHeldOrders();
    }
  };

  return {
    posView, activeOrder, tables, menu, heldOrders,
    customizingProduct, modifierModalOpened, paymentModalOpened, selectedItemId,
    heldOrdersModalOpened, isLoading, commentModalOpened, commentTarget,
    keyboardVisible,
    actions: {
      setPosView, handleGoHome, handleSelectDineIn, startOrder,
      handleTableSelect, handleProductSelect, handleConfirmModifiers,
      closeModifierModal, handleAddItem, handleUpdateItemQuantity,
      handleRemoveItem, handleSelectItem, openPaymentModal,
      closePaymentModal, handleFinalizeOrder, handleHold,
      openHeldOrdersModal, closeHeldOrdersModal,
      handleResumeHeldOrder, handleDeleteHeldOrder, handleClearOrder,
      handleOpenCommentModal, closeCommentModal, handleSaveComment,
      toggleKeyboard,
    }
  };
}