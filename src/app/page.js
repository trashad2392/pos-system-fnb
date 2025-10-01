// src/app/page.js
"use client";
import { useState, useEffect } from 'react';
import { Title, Button, Group, Tabs } from '@mantine/core';
import { useAuth } from '@/context/AuthContext';
import CategoryManager from '@/components/management/CategoryManager';
import ProductManager from '@/components/management/ProductManager';
import ModifierManager from '@/components/management/ModifierManager';
import TableManager from '@/components/management/TableManager';
import DiscountManager from '@/components/management/DiscountManager'; // <-- ADD THIS IMPORT

export default function InventoryPage() {
  const { isManager } = useAuth();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [rawCategories, setRawCategories] = useState([]);
  const [modifierGroups, setModifierGroups] = useState([]);
  const [rawModifierGroups, setRawModifierGroups] = useState([]);
  const [tables, setTables] = useState([]);
  const [discounts, setDiscounts] = useState([]); // <-- ADD DISCOUNT STATE

  const fetchData = async () => {
    try {
      // Fetch all data in parallel
      const [
        productData, 
        categoryData, 
        groupData, 
        tableData, 
        discountData // <-- FETCH DISCOUNTS
      ] = await Promise.all([
        window.api.getProducts(),
        window.api.getCategories(),
        window.api.getModifierGroups(),
        window.api.getTables(),
        window.api.getDiscounts(), // <-- NEW API CALL
      ]);
      
      setProducts(productData);
      
      setRawCategories(categoryData);
      setCategories(categoryData.map(cat => ({ value: cat.id.toString(), label: cat.name })));

      setRawModifierGroups(groupData);
      setModifierGroups(groupData.map(g => ({ value: g.id.toString(), label: g.name })));
      
      setTables(tableData);
      setDiscounts(discountData); // <-- SET DISCOUNT STATE

    } catch (error) { console.error("Error fetching page data:", error); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleImportMenu = async () => {
    if (!window.confirm('This will wipe your existing menu and replace it. Are you sure?')) {
      return;
    }
    try {
      const jsonContent = await window.api.openImportDialog();
      if (jsonContent) {
        const result = await window.api.importMenuFromJson(jsonContent);
        alert(result.message);
        fetchData();
      }
    } catch (error) {
      alert(`Error during import: ${error.message}`);
      console.error("Import failed:", error);
    }
  };

  return (
    <div>
      <Group justify="space-between" mb="xl">
        <Title order={1}>Inventory & Menu Management</Title>
        {isManager && <Button onClick={handleImportMenu} variant="outline">Import Menu</Button>}
      </Group>

      <Tabs defaultValue="products">
        <Tabs.List>
          <Tabs.Tab value="products">Products</Tabs.Tab>
          <Tabs.Tab value="categories">Categories</Tabs.Tab>
          <Tabs.Tab value="modifiers">Modifiers</Tabs.Tab>
          <Tabs.Tab value="tables">Tables</Tabs.Tab>
          <Tabs.Tab value="discounts">Discounts</Tabs.Tab> {/* <-- ADD NEW TAB */}
        </Tabs.List>

        <Tabs.Panel value="products" pt="xs">
          <ProductManager products={products} categories={categories} modifierGroups={modifierGroups} onDataChanged={fetchData} />
        </Tabs.Panel>
        <Tabs.Panel value="categories" pt="xs">
          <CategoryManager categories={rawCategories} onDataChanged={fetchData} />
        </Tabs.Panel>
        <Tabs.Panel value="modifiers" pt="xs">
          <ModifierManager modifierGroups={rawModifierGroups} onDataChanged={fetchData} />
        </Tabs.Panel>
        <Tabs.Panel value="tables" pt="xs">
          <TableManager tables={tables} onDataChanged={fetchData} />
        </Tabs.Panel>
        {/* --- ADD NEW TAB PANEL --- */}
        <Tabs.Panel value="discounts" pt="xs">
          <DiscountManager discounts={discounts} onDataChanged={fetchData} />
        </Tabs.Panel>
      </Tabs>
    </div>
  );
}