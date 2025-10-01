// src/hooks/usePosData.js
"use client";

import { useState, useEffect, useCallback } from 'react';

export function usePosData() {
  const [tables, setTables] = useState([]);
  const [menu, setMenu] = useState({ products: [], categories: [] });
  const [discounts, setDiscounts] = useState([]); // <-- ADD THIS
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Fetch all data in parallel
      const [tableData, productData, categoryData, discountData] = await Promise.all([
        window.api.getTables(),
        window.api.getProducts(),
        window.api.getCategories(),
        window.api.getDiscounts(), // <-- ADD THIS
      ]);
      
      setTables(tableData);
      setMenu({ products: productData, categories: categoryData });
      setDiscounts(discountData.filter(d => d.isActive)); // <-- ADD THIS, only get active ones

    } catch (error) { 
      console.error("Failed to fetch initial POS data:", error); 
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Expose discounts
  return { tables, menu, discounts, isLoading, refreshData: fetchData };
}