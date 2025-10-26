// src/hooks/useModalState.js
"use client";

import { useDisclosure } from '@mantine/hooks';
import { useState, useCallback } from 'react';

export function useModalState() {
  const [modifierModalOpened, { open: openModifierModal, close: closeModifierModal }] = useDisclosure(false);
  const [paymentModalOpened, { open: openPaymentModalBase, close: closePaymentModalBase }] = useDisclosure(false); // Renamed base function
  const [heldOrdersModalOpened, { open: openHeldOrdersModal, close: closeHeldOrdersModal }] = useDisclosure(false);
  const [commentModalOpened, { open: openCommentModal, close: closeCommentModal }] = useDisclosure(false);
  const [discountModalOpened, { open: openDiscountModal, close: closeDiscountModal }] = useDisclosure(false);

  // State for modal *content*
  const [customizingProduct, setCustomizingProduct] = useState(null);
  const [commentTarget, setCommentTarget] = useState(null);
  const [discountTarget, setDiscountTarget] = useState(null);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  // --- NEW: State for initial payment tab ---
  const [paymentModalInitialTab, setPaymentModalInitialTab] = useState('full');

  // --- OPEN functions ---
  const handleOpenModifierModal = useCallback((product) => {
    setCustomizingProduct(product);
    openModifierModal();
  }, [openModifierModal]);

  const handleOpenCommentModal = useCallback((target) => {
    setCommentTarget(target);
    openCommentModal();
  }, [openCommentModal]);

  const handleOpenDiscountModal = useCallback((target) => {
    setDiscountTarget(target);
    openDiscountModal();
  }, [openDiscountModal]);

  // --- MODIFIED: Wrapper for opening payment modal, accepts initial tab ---
  const openPaymentModal = useCallback((options = {}) => {
      setPaymentModalInitialTab(options.initialTab || 'full'); // Default to 'full'
      openPaymentModalBase(); // Call the original open function
  }, [openPaymentModalBase]);


  // --- CLOSE functions ---
  const handleCloseModifierModal = useCallback(() => {
    setCustomizingProduct(null);
    closeModifierModal();
  }, [closeModifierModal]);

  const handleCloseCommentModal = useCallback(() => {
    setKeyboardVisible(false);
    // setCommentTarget(null); // Optional clear
    closeCommentModal();
  }, [closeCommentModal]);

  const handleCloseDiscountModal = useCallback(() => {
    // setDiscountTarget(null); // Optional clear
    closeDiscountModal();
  }, [closeDiscountModal]);

  // --- MODIFIED: Wrapper for closing payment modal, resets initial tab ---
  const closePaymentModal = useCallback(() => {
      closePaymentModalBase();
      // Reset initial tab after a short delay to avoid flicker if re-opened quickly
      setTimeout(() => setPaymentModalInitialTab('full'), 100);
  }, [closePaymentModalBase]);


  const toggleKeyboard = () => setKeyboardVisible((v) => !v);

  return {
    // Modal opened states
    modifierModalOpened,
    paymentModalOpened,
    heldOrdersModalOpened,
    commentModalOpened,
    discountModalOpened,
    keyboardVisible,

    // Modal content states
    customizingProduct,
    commentTarget,
    discountTarget,
    paymentModalInitialTab, // <-- Expose initial tab state

    actions: {
        // Open functions
        openHeldOrdersModal,        // Direct
        handleOpenModifierModal,    // Wrapper
        handleOpenCommentModal,     // Wrapper
        handleOpenDiscountModal,    // Wrapper
        openPaymentModal,           // <-- Use new wrapper

        // Close functions
        closeHeldOrdersModal,       // Direct
        handleCloseModifierModal,   // Wrapper
        handleCloseCommentModal,    // Wrapper
        handleCloseDiscountModal,   // Wrapper
        closePaymentModal,          // <-- Use new wrapper

        // Other controls
        toggleKeyboard,
    }
  };
}