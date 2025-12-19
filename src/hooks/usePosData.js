// src/hooks/usePosData.js
"use client";

import { useState, useEffect, useCallback } from 'react';

export function usePosData() {
  const [tables, setTables] = useState([]);
  
  // Initialize with empty arrays to prevent mapping errors during initial render
  const [fullActiveMenuData, setFullActiveMenuData] = useState({
    menus: [],
    categories: [],
    products: [],
  });
  
  const [posSettings, setPosSettings] = useState({});
  const [discounts, setDiscounts] = useState([]); 
  const [paymentMethods, setPaymentMethods] = useState([]); 
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Fetch all necessary data in parallel from the main process API
      const [
        tableData,
        allProductData,
        allCategoryData,
        discountData,
        activeMenus,
        settingsData,
        paymentMethodData,
      ] = await Promise.all([
        window.api.getTables(),
        window.api.getProducts(),
        window.api.getCategories(),
        window.api.getDiscounts(),
        window.api.getMenus({ activeOnly: true }),
        window.api.getPosSettings(),
        window.api.getPaymentMethods({ activeOnly: true }),
      ]);

      // Defensive assignment: Ensure we always work with arrays even if database returns null
      const safeProducts = Array.isArray(allProductData) ? allProductData : [];
      const safeCategories = Array.isArray(allCategoryData) ? allCategoryData : [];
      const safeDiscounts = Array.isArray(discountData) ? discountData : [];
      const safeMenus = Array.isArray(activeMenus) ? activeMenus : [];

      setTables(tableData || []);
      
      // Store active discounts for the DiscountModal
      setDiscounts(safeDiscounts.filter((d) => d.isActive));
      
      setPosSettings(settingsData || {});
      setPaymentMethods(paymentMethodData || []);

      // Process and filter active menu, category, and product relationships
      if (safeMenus.length > 0) {
        const activeMenuIds = safeMenus.map((m) => m.id);

        const activeCategories = safeCategories.filter((cat) =>
          activeMenuIds.includes(cat.menuId)
        );
        const activeCategoryIds = activeCategories.map((cat) => cat.id);

        const activeProducts = safeProducts.filter((prod) =>
          activeCategoryIds.includes(prod.categoryId)
        );

        setFullActiveMenuData({
          menus: safeMenus,
          categories: activeCategories,
          products: activeProducts,
        });
      } else {
        setFullActiveMenuData({ menus: [], categories: [], products: [] });
      }

    } catch (err) {
      console.error("Failed to fetch initial POS data:", err);
      setError(`Failed to load POS data: ${err.message}`);
      
      // Reset to empty states on error to prevent UI crashes in dependent components
      setFullActiveMenuData({ menus: [], categories: [], products: [] });
      setTables([]);
      setDiscounts([]);
      setPaymentMethods([]);
      setPosSettings({});
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    tables,
    fullActiveMenuData,
    posSettings,
    discounts,
    paymentMethods,
    isLoading,
    error,
    refreshData: fetchData
  };
}