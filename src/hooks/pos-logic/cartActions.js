// src/hooks/pos-logic/cartActions.js

export function createCartActions({ activeOrder, setActiveOrder, setSelectedItemId }) {
  const handleAddItem = async (product, selectedModifierIds = []) => {
    if (!activeOrder) return;
    try {
      const updatedOrder = await window.api.addItemToOrder({
        orderId: activeOrder.id,
        productId: product.id,
        selectedModifierIds,
      });
      setActiveOrder(updatedOrder);
      if (updatedOrder.items && updatedOrder.items.length > 0) {
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
      setSelectedItemId(null);
    } catch (error) {
      console.error('Failed to remove item:', error);
      alert(`Error: ${error.message}`);
    }
  };

  return { handleAddItem, handleUpdateItemQuantity, handleRemoveItem };
}