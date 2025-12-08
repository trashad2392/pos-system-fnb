// src/hooks/usePosData.js
"use client";

import { useState, useEffect, useCallback } from 'react';

export function usePosData() {
  const [tables, setTables] = useState([]);
  // --- MODIFIED: Store ALL active menu data (menus, categories, products) ---
  const [fullActiveMenuData, setFullActiveMenuData] = useState({
    menus: [],
    categories: [],
    products: [],
  });
  const [posSettings, setPosSettings] = useState({}); // <-- State for POS settings
  const [discounts, setDiscounts] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]); // <-- NEW STATE
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null); // <-- State for potential errors

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null); // Clear previous errors
    try {
      // Fetch all necessary data in parallel
      const [
        tableData,
        allProductData,
        allCategoryData,
        discountData,
        activeMenus,
        settingsData, // <-- Fetch settings
        paymentMethodData, // <-- NEW: Fetch payment methods
      ] = await Promise.all([
        window.api.getTables(),
        window.api.getProducts(),
        window.api.getCategories(),
        window.api.getDiscounts(),
        window.api.getMenus({ activeOnly: true }), // Fetch only active menus
        window.api.getPosSettings(), // <-- Fetch POS settings
        window.api.getPaymentMethods({ activeOnly: true }), // <-- NEW API CALL
      ]);

      setTables(tableData);
      setDiscounts(discountData.filter((d) => d.isActive));
      setPosSettings(settingsData); // <-- Store settings
      setPaymentMethods(paymentMethodData); // <-- NEW: Store payment methods

      // --- Store all data related to active menus ---
      if (activeMenus && activeMenus.length > 0) {
        const activeMenuIds = activeMenus.map((m) => m.id);

        // Filter categories belonging to any active menu
        const activeCategories = allCategoryData.filter((cat) =>
          activeMenuIds.includes(cat.menuId)
        );
        const activeCategoryIds = activeCategories.map((cat) => cat.id);

        // Filter products belonging to any active category
        const activeProducts = allProductData.filter((prod) =>
          activeCategoryIds.includes(prod.categoryId)
        );

        setFullActiveMenuData({
          menus: activeMenus,
          categories: activeCategories,
          products: activeProducts,
        });
        console.log(`Loaded data for ${activeMenus.length} active menu(s).`);
      } else {
        console.warn("No active menus found. POS will show no items.");
        setFullActiveMenuData({ menus: [], categories: [], products: [] });
      }
      // --- End storing active menu data ---

    } catch (err) {
      console.error("Failed to fetch initial POS data:", err);
      setError(`Failed to load POS data: ${err.message}`); // Store error message
      // Ensure state is empty on error
      setFullActiveMenuData({ menus: [], categories: [], products: [] });
      setTables([]);
      setDiscounts([]);
      setPaymentMethods([]); // <-- NEW: Clear on error
      setPosSettings({});
    } finally {
      setIsLoading(false);
    }
  }, []); // Keep dependencies empty

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Expose the combined active menu data and settings
  return {
    tables,
    fullActiveMenuData, // <-- Expose all active menu data
    posSettings,        // <-- Expose settings
    discounts,
    paymentMethods,     // <-- NEW: Expose payment methods
    isLoading,
    error,              // <-- Expose error state
    refreshData: fetchData
  };
}