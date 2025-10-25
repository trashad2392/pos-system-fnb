// src/hooks/usePosView.js
"use client";

import { useState } from 'react';

export function usePosView() {
  const [posView, setPosView] = useState('home'); // Initial view is home

  const navigateToHome = () => {
    setPosView('home');
  };

  const navigateToTableSelect = () => {
    setPosView('table-select');
  };

  const navigateToOrderView = () => {
    setPosView('order-view');
  };

  return {
    posView,
    actions: {
      setPosView, // Expose direct setter if absolutely needed
      navigateToHome,
      navigateToTableSelect,
      navigateToOrderView,
    }
  };
}