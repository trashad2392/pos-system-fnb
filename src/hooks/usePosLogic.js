// src/hooks/usePosLogic.js
"use client";

import { useState, useEffect } from 'react';
import { useDisclosure } from '@mantine/hooks';

export function usePosLogic() {
  // --- STATE MANAGEMENT ---
  const [activeOrder, setActiveOrder] = useState(null);
  const [tables, setTables] = useState([]);
  const [menu, setMenu] = useState({ products: [], categories: [] });
  const [activeTab, setActiveTab] = useState('dine-in');
  const [customizingProduct, setCustomizingProduct] = useState(null);
  const [selectedItemId, setSelectedItemId] = useState(null);
  const [modifierModalOpened, { open: openModifierModal, close: closeModifierModal }] = useDisclosure(false);
  const [paymentModalOpened, { open: openPaymentModal, close: closePaymentModal }] = useDisclosure(false);

  // --- DATA FETCHING ---
  const fetchInitialData = async () => {
    try {
      const tableData = await window.api.getTables();
      setTables(tableData);
      const productData = await window.api.getProducts();
      const categoryData = await window.api.getCategories();
      setMenu({ products: productData, categories: categoryData });
    } catch (error) { console.error("Failed to fetch initial POS data:", error); }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  // When a new order becomes active, clear any previous item selection
  useEffect(() => {
    setSelectedItemId(null);
  }, [activeOrder?.id]);


  // --- ORDER LIFECYCLE ACTIONS ---
  const startOrder = async ({ tableId, orderType }) => {
    try {
      const selectedTable = tableId ? tables.find(t => t.id === tableId) : null;
      const newOrder = await window.api.createOrder({ tableId, orderType });
      if (selectedTable) newOrder.table = selectedTable;
      setActiveOrder(newOrder);
      if (tableId) {
        const updatedTables = await window.api.getTables();
        setTables(updatedTables);
      }
    } catch (error) {
      console.error(`Failed to create ${orderType} order:`, error);
      alert(`Error: ${error.message}`);
    }
  };

  const resumeOrder = async (table) => {
    try {
      const existingOrder = await window.api.getOpenOrderForTable(table.id);
      if (existingOrder) {
        existingOrder.table = table;
        setActiveOrder(existingOrder);
      } else {
        alert(`Error: Table ${table.name} is occupied, but no open order was found.`);
        fetchInitialData();
      }
    } catch (error) {
      console.error("Failed to handle table selection:", error);
      alert(`Error: ${error.message}`);
    }
  };

  const handleBackToMainScreen = async () => {
    setActiveOrder(null);
    const updatedTables = await window.api.getTables();
    setTables(updatedTables);
  };
  
  const handleFinalizeOrder = async (paymentMethod) => {
    if (!activeOrder) return;
    try {
      await window.api.finalizeOrder({ 
        orderId: activeOrder.id,
        paymentMethod: paymentMethod,
      });
      alert('Order finalized successfully!');
      closePaymentModal();
      handleBackToMainScreen();
    } catch (error) {
      console.error('Failed to finalize order:', error);
      alert(`Error: ${error.message}`);
    }
  };

  // --- CART ITEM ACTIONS ---
  const handleAddItem = async (product, selectedModifierIds = []) => {
    if (!activeOrder) return;
    try {
      const updatedOrder = await window.api.addItemToOrder({
        orderId: activeOrder.id,
        productId: product.id,
        selectedModifierIds,
      });
      setActiveOrder(updatedOrder);

      // --- NEW: Automatically select the newly added item ---
      if (updatedOrder.items && updatedOrder.items.length > 0) {
        // The newest item is the last one in the list returned from the backend
        const lastItem = updatedOrder.items[updatedOrder.items.length - 1];
        setSelectedItemId(lastItem.id);
      }
    } catch (error) {
      console.error('Failed to add item:', error);
      alert(`Error: ${error.message}`);
    }
  };

  const handleUpdateItemQuantity = async (orderItemId, quantity) => {
    if (!activeOrder) return;
    try {
      const updatedOrder = await window.api.updateItemQuantity({
        orderId: activeOrder.id,
        orderItemId,
        quantity,
      });
      setActiveOrder(updatedOrder);
    } catch (error) {
      console.error('Failed to update item quantity:', error);
      alert(`Error: ${error.message}`);
    }
  };

  const handleRemoveItem = async (orderItemId) => {
    if (!activeOrder) return;
    try {
      const updatedOrder = await window.api.removeItemFromOrder({
        orderId: activeOrder.id,
        orderItemId,
      });
      setActiveOrder(updatedOrder);
      setSelectedItemId(null); // --- NEW: Clear selection after removing an item ---
    } catch (error) {
      console.error('Failed to remove item:', error);
      alert(`Error: ${error.message}`);
    }
  };

  // --- UI INTERACTION HANDLERS ---
  const handleTableSelect = (table) => {
    if (table.status === 'AVAILABLE') {
      startOrder({ tableId: table.id, orderType: 'Dine-In' });
    } else {
      resumeOrder(table);
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

  const handleConfirmModifiers = (product, selectedIds) => {
    handleAddItem(product, selectedIds);
    closeModifierModal();
  };

  const handleSelectItem = (itemId) => {
    setSelectedItemId(currentItemId => currentItemId === itemId ? null : itemId);
  };

  // --- RETURN VALUE ---
  return {
    activeOrder,
    tables,
    menu,
    activeTab,
    customizingProduct,
    modifierModalOpened,
    paymentModalOpened,
    selectedItemId,
    actions: {
      setActiveTab,
      handleTableSelect,
      startOrder,
      handleBackToMainScreen,
      handleProductSelect,
      handleConfirmModifiers,
      closeModifierModal,
      handleUpdateItemQuantity,
      handleRemoveItem,
      openPaymentModal,
      closePaymentModal,
      handleFinalizeOrder,
      handleSelectItem,
    }
  };
}