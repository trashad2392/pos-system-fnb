// src/hooks/useModalState.js
"use client";

import { useDisclosure } from '@mantine/hooks';
import { useState, useCallback } from 'react'; // Added useCallback

export function useModalState() {
  const [modifierModalOpened, { open: openModifierModal, close: closeModifierModal }] = useDisclosure(false);
  const [paymentModalOpened, { open: openPaymentModal, close: closePaymentModal }] = useDisclosure(false);
  const [heldOrdersModalOpened, { open: openHeldOrdersModal, close: closeHeldOrdersModal }] = useDisclosure(false);
  const [commentModalOpened, { open: openCommentModal, close: closeCommentModal }] = useDisclosure(false);
  const [discountModalOpened, { open: openDiscountModal, close: closeDiscountModal }] = useDisclosure(false);

  // State for modal *content*
  const [customizingProduct, setCustomizingProduct] = useState(null);
  const [commentTarget, setCommentTarget] = useState(null);
  const [discountTarget, setDiscountTarget] = useState(null);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  // --- OPEN functions now use useCallback ---
  const handleOpenModifierModal = useCallback((product) => {
    setCustomizingProduct(product);
    openModifierModal();
  }, [openModifierModal]); // Dependency: the open function from useDisclosure

  const handleOpenCommentModal = useCallback((target) => {
    setCommentTarget(target);
    openCommentModal();
  }, [openCommentModal]);

  const handleOpenDiscountModal = useCallback((target) => {
    setDiscountTarget(target);
    openDiscountModal();
  }, [openDiscountModal]);

  // --- CLOSE functions also use useCallback and clear state ---
  // We'll expose these specifically named versions consistently
  const handleCloseModifierModal = useCallback(() => {
    setCustomizingProduct(null); // Clear product on close
    closeModifierModal();
  }, [closeModifierModal]);

  const handleCloseCommentModal = useCallback(() => {
    setKeyboardVisible(false); // Always hide keyboard on close
    // Optionally clear commentTarget: setCommentTarget(null);
    closeCommentModal();
  }, [closeCommentModal]);

  const handleCloseDiscountModal = useCallback(() => {
    // Optionally clear discountTarget: setDiscountTarget(null);
    closeDiscountModal();
  }, [closeDiscountModal]);

  // Keyboard toggle remains simple state update
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

    // --- Expose consistent function names via actions object ---
    actions: {
        // Open functions
        openPaymentModal,           // Direct from useDisclosure
        openHeldOrdersModal,        // Direct from useDisclosure
        handleOpenModifierModal,    // Wrapper
        handleOpenCommentModal,     // Wrapper
        handleOpenDiscountModal,    // Wrapper

        // Close functions
        closePaymentModal,          // Direct from useDisclosure
        closeHeldOrdersModal,       // Direct from useDisclosure
        handleCloseModifierModal,   // Wrapper
        handleCloseCommentModal,    // Wrapper
        handleCloseDiscountModal,   // Wrapper

        // Other controls
        toggleKeyboard,
    }
  };
}