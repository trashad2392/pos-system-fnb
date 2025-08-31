// src/hooks/usePosLogic.js
"use client";

import { useState, useEffect } from 'react';
import { useDisclosure } from '@mantine/hooks';

export function usePosLogic() {
  // All state now lives inside the hook
  const [activeOrder, setActiveOrder] = useState(null);
  const [tables, setTables] = useState([]);
  const [menu, setMenu] = useState({ products: [], categories: [] });
  const [activeTab, setActiveTab] = useState('dine-in');
  const [customizingProduct, setCustomizingProduct] = useState(null);
  const [modifierModalOpened, { open: openModifierModal, close: closeModifierModal }] = useDisclosure(false);

  // Data fetching logic
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

  // All handler functions now live inside the hook
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
  
  const handleTableSelect = (table) => {
    if (table.status === 'AVAILABLE') {
      startOrder({ tableId: table.id, orderType: 'Dine-In' });
    } else {
      resumeOrder(table);
    }
  };

  const handleBackToMainScreen = async () => {
    setActiveOrder(null);
    const updatedTables = await window.api.getTables();
    setTables(updatedTables);
  };
  
  const handleProductSelect = (product) => {
    if (product.modifierGroups && product.modifierGroups.length > 0) {
      setCustomizingProduct(product);
      openModifierModal();
    } else {
      handleAddItem(product, []);
    }
  };
  
  const handleAddItem = async (product, selectedModifierIds = []) => {
    if (!activeOrder) return;
    try {
      const updatedOrder = await window.api.addItemToOrder({
        orderId: activeOrder.id,
        productId: product.id,
        selectedModifierIds,
      });
      setActiveOrder(updatedOrder);
    } catch (error) {
      console.error('Failed to add item:', error);
      alert(`Error: ${error.message}`);
    }
  };

  const handleConfirmModifiers = (product, selectedIds) => {
    handleAddItem(product, selectedIds);
    closeModifierModal();
  };

  // Return all the state and functions that the UI needs
  return {
    activeOrder,
    tables,
    menu,
    activeTab,
    customizingProduct,
    modifierModalOpened,
    actions: {
      setActiveTab,
      handleTableSelect,
      startOrder,
      handleBackToMainScreen,
      handleProductSelect,
      handleConfirmModifiers,
      closeModifierModal
    }
  };
}