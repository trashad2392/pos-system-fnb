// src/hooks/pos-logic/orderLifecycle.js

// UPDATED: Corrected the typo from 'previousPosV' to 'previousPosView'
export function createOrderLifecycleActions({ 
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
  setDraftedOrders,
}) {
  
  const startOrder = async ({ tableId, orderType }) => {
    try {
      setPreviousPosView(posView);
      const selectedTable = tableId ? tables.find(t => t.id === tableId) : null;
      const newOrder = await window.api.createOrder({ tableId, orderType });
      if (selectedTable) newOrder.table = selectedTable;
      setActiveOrder(newOrder);
      setPosView('order-view');
      if (tableId) {
        refreshData();
      }
    } catch (error) {
      console.error(`Failed to create ${orderType} order:`, error);
      alert(`Error: ${error.message}`);
    }
  };

  const resumeOrder = async (table) => {
    try {
      setPreviousPosView(posView);
      const existingOrder = await window.api.getOpenOrderForTable(table.id);
      if (existingOrder) {
        existingOrder.table = table;
        setActiveOrder(existingOrder);
        setPosView('order-view');
      } else {
        alert(`Error: Table ${table.name} is occupied, but no open order was found.`);
        refreshData();
      }
    } catch (error) {
      console.error("Failed to handle table selection:", error);
      alert(`Error: ${error.message}`);
    }
  };

  const handleGoBack = () => {
    setActiveOrder(null);
    if (previousPosView) {
      setPosView(previousPosView);
      setPreviousPosView(null);
    } else {
      if (posView === 'table-select' || posView === 'order-type-hub' || posView === 'draft-list') {
        setPosView('home');
      } else {
        setPosView('home');
      }
    }
    refreshData();
  };
  
  const handleFinalizeOrder = async (paymentMethod) => {
    if (!activeOrder) return;
    const orderType = activeOrder.orderType;
    try {
      await window.api.finalizeOrder({ 
        orderId: activeOrder.id,
        paymentMethod: paymentMethod,
      });
      alert('Order finalized successfully!');
      closePaymentModal();
      
      setActiveOrder(null);
      setPreviousPosView(null);
      
      if (orderType === 'Dine-In') {
        setPosView('table-select');
      } else {
        setActiveOrderType(orderType);
        setPosView('order-type-hub');
      }
      refreshData();
    } catch (error) {
      console.error('Failed to finalize order:', error);
      alert(`Error: ${error.message}`);
    }
  };

  const handleSaveAsDraft = async () => {
    if (!activeOrder) return;
    const orderType = activeOrder.orderType;
    try {
      await window.api.draftOrder({ orderId: activeOrder.id });
      alert('Order saved as a draft.');
      
      setActiveOrder(null);
      setPreviousPosView(null);

      if (orderType === 'Dine-In') {
        setPosView('table-select');
      } else {
        setActiveOrderType(orderType);
        setPosView('order-type-hub');
      }
      refreshData();
    } catch (error) {
      console.error('Failed to save draft:', error);
      alert(`Error: ${error.message}`);
    }
  };

  const handleResumeDraft = async (orderId) => {
    try {
      setPreviousPosView(posView);
      const resumedOrder = await window.api.resumeDraftedOrder({ orderId });
      setActiveOrder(resumedOrder);
      setPosView('order-view');
    } catch (error) {
      console.error('Failed to resume draft:', error);
      alert(`Error: ${error.message}`);
    }
  };

  const handleDeleteDraft = async (orderId) => {
    if (!activeOrderType) return;
    try {
      await window.api.deleteDraftedOrder({ orderId });
      const drafts = await window.api.getDraftedOrders({ orderType: activeOrderType });
      setDraftedOrders(drafts);
    } catch (error) {
      console.error('Failed to delete draft:', error);
      alert(`Error: ${error.message}`);
    }
  };
  
  return { startOrder, resumeOrder, handleGoBack, handleFinalizeOrder, handleSaveAsDraft, handleResumeDraft, handleDeleteDraft };
}