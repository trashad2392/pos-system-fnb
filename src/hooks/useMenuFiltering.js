// src/hooks/useMenuFiltering.js
"use client";

import { useState, useCallback } from 'react';

const SETTING_KEY_PREFIX = 'menu_'; // Consistent prefix

// This hook depends on the full menu data and POS settings loaded by usePosData
export function useMenuFiltering(fullActiveMenuData, posSettings, isLoading, error) {
  const [currentDisplayMenu, setCurrentDisplayMenu] = useState({ products: [], categories: [] });

  const updateDisplayMenuForOrderType = useCallback((orderType) => {
    // If still loading, there's an error, or no menu data, set to empty
    if (isLoading || error || !fullActiveMenuData || !fullActiveMenuData.menus || fullActiveMenuData.menus.length === 0) {
      setCurrentDisplayMenu({ products: [], categories: [] });
      return;
    }

    const settingKey = `${SETTING_KEY_PREFIX}${orderType}`;
    const assignedMenuIdStr = posSettings[settingKey];
    let targetMenuId = null;

    // Check if a specific menu is assigned and active
    if (assignedMenuIdStr && assignedMenuIdStr !== '') {
      targetMenuId = parseInt(assignedMenuIdStr, 10);
      if (!fullActiveMenuData.menus.some(m => m.id === targetMenuId)) {
        console.warn(`Menu ID ${targetMenuId} set for ${orderType} is not active or doesn't exist. Falling back to default.`);
        targetMenuId = null; // Fallback required
      }
    }

    // Fallback to the first active menu if no specific one is assigned/valid
    if (targetMenuId === null && fullActiveMenuData.menus.length > 0) {
      targetMenuId = fullActiveMenuData.menus[0].id;
      // console.log(`No specific menu set for ${orderType}, using default: ${fullActiveMenuData.menus[0].name} (ID: ${targetMenuId})`);
    }

    // Filter products and categories based on the determined targetMenuId
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
      // Handles the case where there are truly no active menus
      setCurrentDisplayMenu({ products: [], categories: [] });
    }
  }, [fullActiveMenuData, posSettings, isLoading, error]); // Dependencies for the callback

  const clearDisplayMenu = useCallback(() => {
     setCurrentDisplayMenu({ products: [], categories: [] });
  }, []);

  return {
    currentDisplayMenu,
    actions: {
        updateDisplayMenuForOrderType,
        clearDisplayMenu,
    }
  };
}