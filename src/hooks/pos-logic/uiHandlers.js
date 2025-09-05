// src/hooks/pos-logic/uiHandlers.js

export function createUiHandlers({ 
  setCustomizingProduct, 
  openModifierModal, 
  handleAddItem,
  startOrder, 
  resumeOrder,
  setSelectedItemId,
  posView,
  setPosView,
  setPreviousPosView,
  setActiveOrderType,
  setDraftedOrders
}) {
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
  };

  const handleSelectItem = (itemId) => {
    setSelectedItemId(currentItemId => currentItemId === itemId ? null : itemId);
  };

  const handleSelectDineIn = () => {
    setPreviousPosView(posView);
    setPosView('table-select');
  };
  
  const handleSelectOrderType = (orderType) => {
    setPreviousPosView(posView);
    setActiveOrderType(orderType);
    setPosView('order-type-hub');
  };

  const handleShowDrafts = async (orderType) => {
    try {
      setPreviousPosView(posView);
      const drafts = await window.api.getDraftedOrders({ orderType });
      setDraftedOrders(drafts);
      setPosView('draft-list');
    } catch (error) {
      console.error('Failed to get drafts:', error);
      alert(`Error: ${error.message}`);
    }
  };

  return { 
    handleTableSelect, 
    handleProductSelect, 
    handleConfirmModifiers, 
    handleSelectItem, 
    handleSelectDineIn, 
    handleSelectOrderType, 
    handleShowDrafts 
  };
}