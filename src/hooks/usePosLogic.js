// src/hooks/usePosLogic.js
"use client";

import { useState, useEffect, useMemo } from 'react'; // <-- Added useMemo
import { useDisclosure } from '@mantine/hooks';
import { usePosData } from './usePosData';
import { notifications } from '@mantine/notifications';

const SETTING_KEY_PREFIX = 'menu_'; // Consistent prefix

export function usePosLogic() {
  // --- MODIFIED: Use updated data hook ---
  const {
    tables,
    fullActiveMenuData, // Contains { menus: [], categories: [], products: [] } for ALL active menus
    posSettings,        // Contains { 'menu_Dine-In': '1', ... }
    discounts,
    isLoading,
    error,              // <-- Get error state
    refreshData
  } = usePosData();
  // --- End Modification ---

  const [activeOrder, setActiveOrder] = useState(null);
  const [posView, setPosView] = useState('home');
  const [heldOrders, setHeldOrders] = useState([]);
  const [customizingProduct, setCustomizingProduct] = useState(null);
  const [selectedItemId, setSelectedItemId] = useState(null);
  const [commentTarget, setCommentTarget] = useState(null);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [discountTarget, setDiscountTarget] = useState(null);

  // --- NEW: State for the currently displayed menu items ---
  const [currentDisplayMenu, setCurrentDisplayMenu] = useState({ products: [], categories: [] });

  const [modifierModalOpened, { open: openModifierModal, close: closeModifierModal }] = useDisclosure(false);
  const [paymentModalOpened, { open: openPaymentModal, close: closePaymentModal }] = useDisclosure(false);
  const [heldOrdersModalOpened, { open: openHeldOrdersModal, close: closeHeldOrdersModal }] = useDisclosure(false);
  const [commentModalOpened, { open: openCommentModal, close: closeCommentModal }] = useDisclosure(false);
  const [discountModalOpened, { open: openDiscountModal, close: closeDiscountModal }] = useDisclosure(false);


  // --- NEW: Function to filter menu data based on order type ---
  const updateDisplayMenuForOrderType = (orderType) => {
    if (isLoading || error || !fullActiveMenuData || fullActiveMenuData.menus.length === 0) {
      setCurrentDisplayMenu({ products: [], categories: [] }); // Set empty if no data or error
      return;
    }

    const settingKey = `${SETTING_KEY_PREFIX}${orderType}`;
    const assignedMenuIdStr = posSettings[settingKey];
    let targetMenuId = null;

    if (assignedMenuIdStr && assignedMenuIdStr !== '') {
      targetMenuId = parseInt(assignedMenuIdStr, 10);
      // Verify this menu ID exists in our active menus
      if (!fullActiveMenuData.menus.some(m => m.id === targetMenuId)) {
        console.warn(`Menu ID ${targetMenuId} set for ${orderType} is not active or doesn't exist. Falling back to default.`);
        targetMenuId = null; // Fallback
      }
    }

    // Fallback to the first active menu if no specific one is assigned or valid
    if (targetMenuId === null && fullActiveMenuData.menus.length > 0) {
      targetMenuId = fullActiveMenuData.menus[0].id;
      console.log(`No specific menu set for ${orderType}, using default: ${fullActiveMenuData.menus[0].name} (ID: ${targetMenuId})`);
    }

    if (targetMenuId !== null) {
      const filteredCategories = fullActiveMenuData.categories.filter(
        (cat) => cat.menuId === targetMenuId
      );
      const filteredCategoryIds = filteredCategories.map((cat) => cat.id);
      const filteredProducts = fullActiveMenuData.products.filter((prod) =>
        filteredCategoryIds.includes(prod.categoryId)
      );
      setCurrentDisplayMenu({ products: filteredProducts, categories: filteredCategories });
    } else {
      // Should only happen if there are NO active menus at all
      setCurrentDisplayMenu({ products: [], categories: [] });
    }
  };
  // --- End Filter Function ---


  // --- MODIFIED: Start Order ---
  const startOrder = async (orderType, tableId = null) => {
    try {
      // Set the display menu *before* creating the order
      updateDisplayMenuForOrderType(orderType);

      const newOrder = await window.api.createOrder({ tableId, orderType });
      const selectedTable = tableId ? tables.find(t => t.id === tableId) : null;
      if (selectedTable) newOrder.table = selectedTable; // Attach table info if dine-in
      setActiveOrder(newOrder);
      setPosView('order-view');
      if (tableId) await refreshData(); // Refresh table status after creating dine-in order
    } catch (error) {
      notifications.show({ title: 'Error', message: `Failed to create ${orderType} order: ${error.message}`, color: 'red' });
      // Reset view or handle error appropriately
      setPosView('home');
      setCurrentDisplayMenu({ products: [], categories: [] }); // Clear menu on error
    }
  };
  // --- End Start Order Modification ---

  // --- MODIFIED: Resume Order ---
   const resumeOrder = async (table) => {
    try {
      const existingOrder = await window.api.getOpenOrderForTable(table.id);
      if (existingOrder) {
        existingOrder.table = table; // Ensure table info is attached
        // Set the display menu based on the resumed order's type
        updateDisplayMenuForOrderType(existingOrder.orderType);
        setActiveOrder(existingOrder);
        setPosView('order-view');
      } else {
        notifications.show({ title: 'Error', message: `Table ${table.name} is occupied, but no open order was found.`, color: 'red' });
        await refreshData(); // Refresh table status
      }
    } catch (error) {
      notifications.show({ title: 'Error', message: `Failed to handle table selection: ${error.message}`, color: 'red' });
    }
  };
   // --- End Resume Order Modification ---

  // Reset item selection and potentially menu when order becomes null
  useEffect(() => {
    if (!activeOrder) {
      setSelectedItemId(null);
      // Optionally reset display menu if returning to home/table select?
      // setCurrentDisplayMenu({ products: [], categories: [] });
    }
  }, [activeOrder]);

  // Handle errors from usePosData
  useEffect(() => {
    if (error) {
       notifications.show({
         title: 'Data Loading Error',
         message: `Could not load essential POS data. Please check connections or restart. Error: ${error}`,
         color: 'red',
         autoClose: false // Keep error visible
       });
    }
  }, [error]);


  const handleGoHome = async () => {
    setActiveOrder(null);
    setPosView('home');
    setCurrentDisplayMenu({ products: [], categories: [] }); // Clear menu
    await refreshData(); // Refresh tables status
  };

  const handleSelectDineIn = () => {
    setPosView('table-select');
  };

  const handleTableSelect = (table) => {
    if (table.status === 'AVAILABLE') {
      startOrder('Dine-In', table.id); // startOrder now handles menu filtering
    } else {
      resumeOrder(table); // resumeOrder now handles menu filtering
    }
  };

   const handleFinalizeOrder = async (payments) => {
    if (!activeOrder) return;
    const orderType = activeOrder.orderType; // Store type before clearing activeOrder
    try {
      await window.api.finalizeOrder({ orderId: activeOrder.id, payments: payments });
      notifications.show({ title: 'Success', message: 'Order finalized successfully!', color: 'green' });
      closePaymentModal();
      setActiveOrder(null); // Clear the finalized order first

      // Decide next step based on order type
      if (orderType === 'Dine-In') {
        await handleGoHome(); // Go home and refresh table statuses
      } else {
        await startOrder(orderType); // Start a new order of the same non-dine-in type
      }
    } catch (error) {
      notifications.show({ title: 'Error', message: `Failed to finalize order: ${error.message}`, color: 'red' });
    }
  };

  const handleFastCash = async () => {
    if (!activeOrder || !activeOrder.items || activeOrder.items.length === 0) return;

    const payments = [{ method: 'Cash', amount: activeOrder.totalAmount }];
    const orderType = activeOrder.orderType; // Store type

    try {
      await window.api.finalizeOrder({ orderId: activeOrder.id, payments });
      notifications.show({ title: 'Success', message: 'Order paid in cash!', color: 'green' });
      setActiveOrder(null); // Clear the finalized order

      if (orderType === 'Dine-In') {
        await handleGoHome();
      } else {
        await startOrder(orderType);
      }
    } catch (error) {
      notifications.show({ title: 'Error', message: `Failed to finalize with fast cash: ${error.message}`, color: 'red' });
    }
  };


  const handleHoldOrder = async () => {
    if (!activeOrder || !activeOrder.items || activeOrder.items.length === 0) return;
    const orderType = activeOrder.orderType; // Store type
    try {
      await window.api.holdOrder({ orderId: activeOrder.id });
      notifications.show({ title: 'Success', message: 'Order has been put on hold.', color: 'blue' });
      setActiveOrder(null); // Clear held order
      await startOrder(orderType); // Start a new one
    } catch (error) {
      notifications.show({ title: 'Error', message: `Failed to hold order: ${error.message}`, color: 'red' });
    }
  };

  const handleShowHeldOrders = async (orderTypeToShow) => {
     // If called without an orderType (e.g., from OrderView Hold button when cart is empty),
     // try to use the activeOrder's type, or default if none exists.
     const type = orderTypeToShow || activeOrder?.orderType;
     if (!type) {
        notifications.show({ title: 'Info', message: 'Cannot determine order type for held orders.', color: 'yellow' });
        return;
     }
    try {
      const held = await window.api.getHeldOrders({ orderType: type });
      setHeldOrders(held);
      openHeldOrdersModal();
    } catch (error) {
      notifications.show({ title: 'Error', message: `Failed to get held orders: ${error.message}`, color: 'red' });
    }
  };

  const handleResumeHeldOrder = async (orderId) => {
    try {
      const resumedOrder = await window.api.resumeHeldOrder({ orderId });
      // Set the display menu based on the resumed order's type
      updateDisplayMenuForOrderType(resumedOrder.orderType);
      setActiveOrder(resumedOrder);
      setPosView('order-view');
      closeHeldOrdersModal();
    } catch (error) {
      notifications.show({ title: 'Error', message: `Failed to resume held order: ${error.message}`, color: 'red' });
    }
  };

  const handleDeleteHeldOrder = async (orderId, orderTypeOfDeleted) => {
     // Use the passed orderTypeOfDeleted to refresh the correct list
    if (!orderTypeOfDeleted) return;
    try {
      await window.api.deleteHeldOrder({ orderId });
       notifications.show({ title: 'Success', message: 'Held order deleted.', color: 'orange' });
      // Refresh the list in the modal
      await handleShowHeldOrders(orderTypeOfDeleted);
    } catch (error) {
      notifications.show({ title: 'Error', message: `Failed to delete held order: ${error.message}`, color: 'red' });
    }
  };

  const handleClearOrder = async () => {
    if (!activeOrder || activeOrder.items.length === 0) return;
    if (window.confirm('Are you sure you want to clear this entire cart? This action cannot be undone.')) {
      const orderType = activeOrder.orderType; // Store type
      try {
        await window.api.clearOrder({ orderId: activeOrder.id });
        notifications.show({ title: 'Order Cleared', message: 'The cart has been cleared.', color: 'orange' });
        setActiveOrder(null); // Clear cleared order
        await startOrder(orderType); // Start a new one
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
      // Select the newly added/updated item
      if (updatedOrder.items && updatedOrder.items.length > 0) {
        // Find the item matching product ID and modifiers to handle stacking
         const lastMatchingItem = [...updatedOrder.items].reverse().find(item => {
             if (item.productId !== product.id) return false;
             if (item.selectedModifiers.length !== selectedModifiers.length) return false;
             // Simple check assuming order is consistent; more robust check might be needed
             return item.selectedModifiers.every((mod, index) =>
                 mod.modifierOptionId === selectedModifiers[index]?.id && // Check ID exists
                 mod.quantity === selectedModifiers[index]?.quantity // Check quantity exists
             );
         });
         setSelectedItemId(lastMatchingItem ? lastMatchingItem.id : null);
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
      // Keep the item selected after quantity update unless it was removed (quantity <= 0)
      if (quantity <= 0) {
          setSelectedItemId(null);
      }
    } catch (error) {
      notifications.show({ title: 'Error', message: `Failed to update item quantity: ${error.message}`, color: 'red' });
    }
  };

  const handleRemoveItem = async (orderItemId) => {
    if (!activeOrder) return;
    try {
      const updatedOrder = await window.api.removeItemFromOrder({ orderId: activeOrder.id, orderItemId });
      setActiveOrder(updatedOrder);
      // If the removed item was selected, deselect it
      if (selectedItemId === orderItemId) {
          setSelectedItemId(null);
      }
    } catch (error) {
      notifications.show({ title: 'Error', message: `Failed to remove item: ${error.message}`, color: 'red' });
    }
  };

  const handleProductSelect = (product) => {
    // Ensure product belongs to the currently displayed menu context
    if (!currentDisplayMenu.products.some(p => p.id === product.id)) {
        console.warn("Selected product does not belong to the current menu context.");
        // Optionally show a notification or just ignore the click
        return;
    }

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
    setCustomizingProduct(null); // Clear customizing product
  };

  const handleSelectItem = (itemId) => {
    setSelectedItemId(currentItemId => currentItemId === itemId ? null : itemId);
  };

  const handleHold = () => {
    if (!activeOrder) {
         // This case should ideally not happen if called from OrderView
         handleShowHeldOrders('Takeaway'); // Or some default type?
         return;
    };
    if (activeOrder.items && activeOrder.items.length > 0) {
      handleHoldOrder();
    } else {
      // Show held orders for the current order type
      handleShowHeldOrders(activeOrder.orderType);
    }
  };

  // --- Discount Handlers (Unchanged) ---
  const handleOpenDiscountModal = (target) => {
    setDiscountTarget(target);
    openDiscountModal();
  };

  const handleSelectDiscount = async (discountId) => {
    if (!activeOrder || !discountTarget) return;
    try {
      let updatedOrder;
      if (discountTarget.product) { // Item discount
        updatedOrder = await window.api.applyDiscountToItem({
          orderId: activeOrder.id,
          orderItemId: discountTarget.id,
          discountId: discountId,
        });
      } else { // Order discount
        updatedOrder = await window.api.applyDiscountToOrder({
          orderId: activeOrder.id,
          discountId: discountId,
        });
      }
      setActiveOrder(updatedOrder);
      notifications.show({
        title: 'Success',
        message: discountId ? 'Discount applied.' : 'Discount removed.',
        color: 'green',
      });
    } catch (error) {
      notifications.show({ title: 'Error', message: `Failed to apply discount: ${error.message}`, color: 'red' });
    } finally {
      closeDiscountModal();
    }
  };
  // --- End Discount Handlers ---

  // --- Comment Handlers (Unchanged) ---
  const toggleKeyboard = () => setKeyboardVisible((v) => !v);
  const handleOpenCommentModal = (target) => {
    setCommentTarget(target);
    openCommentModal();
  };
  const handleSaveComment = async (target, comment) => {
    if (!activeOrder) return;
    try {
      let updatedOrder;
      if (target.product) { // Item comment
        updatedOrder = await window.api.updateItemComment({
          orderId: activeOrder.id,
          orderItemId: target.id,
          comment,
        });
      } else { // Order comment
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
  // --- End Comment Handlers ---

  return {
    posView,
    activeOrder,
    tables,
    // --- MODIFIED: Expose currentDisplayMenu instead of raw menu data ---
    menu: currentDisplayMenu,
    // --- End Modification ---
    heldOrders,
    discounts,
    customizingProduct,
    modifierModalOpened,
    paymentModalOpened,
    selectedItemId,
    heldOrdersModalOpened,
    isLoading,
    error, // Expose error
    commentModalOpened,
    commentTarget,
    keyboardVisible,
    discountTarget,
    discountModalOpened,
    actions: {
      setPosView, // Generally avoid direct setting from outside?
      handleGoHome,
      handleSelectDineIn,
      startOrder, // Updated
      handleTableSelect, // Uses updated startOrder/resumeOrder
      handleProductSelect, // Uses currentDisplayMenu
      handleConfirmModifiers, // Uses updated handleAddItem
      closeModifierModal,
      handleAddItem, // Updated to select new item
      handleUpdateItemQuantity, // Updated
      handleRemoveItem, // Updated
      handleSelectItem,
      openPaymentModal,
      closePaymentModal,
      handleFinalizeOrder, // Updated
      handleHold, // Updated to call correct show/hold function
      openHeldOrdersModal,
      closeHeldOrdersModal,
      handleResumeHeldOrder, // Updated
      handleDeleteHeldOrder, // Updated
      handleClearOrder, // Updated
      handleOpenCommentModal,
      closeCommentModal,
      handleSaveComment,
      toggleKeyboard,
      handleFastCash, // Updated
      handleOpenDiscountModal,
      closeDiscountModal,
      handleSelectDiscount,
      refreshData, // Expose refresh if needed elsewhere
    }
  };
}