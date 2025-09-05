// src/hooks/usePosData.js
"use client";

import { useState, useEffect, useCallback } from 'react';

export function usePosData() {
  const [tables, setTables] = useState([]);
  const [menu, setMenu] = useState({ products: [], categories: [] });
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Fetch all data in parallel for speed
      const [tableData, productData, categoryData] = await Promise.all([
        window.api.getTables(),
        window.api.getProducts(),
        window.api.getCategories(),
      ]);
      
      setTables(tableData);
      setMenu({ products: productData, categories: categoryData });
    } catch (error) { 
      console.error("Failed to fetch initial POS data:", error); 
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Expose the data, loading state, and the refresh function
  return { tables, menu, isLoading, refreshData: fetchData };
}