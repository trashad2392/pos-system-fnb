// src/app/inventory/page.js
"use client";
import { useState, useEffect } from 'react';
import { Title, Button, Group, Tabs, Center, Text } from '@mantine/core';
import { useAuth } from '@/context/AuthContext';
import CategoryManager from '@/components/management/CategoryManager';
import ProductManager from '@/components/management/ProductManager';
import ModifierManager from '@/components/management/ModifierManager';
import TableManager from '@/components/management/TableManager';
import DiscountManager from '@/components/management/DiscountManager';

export default function InventoryPage() {
  const { hasPermission } = useAuth();

  // --- NEW: Multi-Permission Gate ---
  // Determine which sections the user can access
  const canManageInventory = hasPermission('inventory:manage');
  const canManageDiscounts = hasPermission('discounts:manage');

  // If the user has access to neither section, then deny access to the whole page.
  if (!canManageInventory && !canManageDiscounts) {
    return (
      <Center style={{ height: '50vh' }}>
        <Text c="red" fw={500}>You do not have permission to view this page.</Text>
      </Center>
    );
  }
  // --- END: Multi-Permission Gate ---

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [rawCategories, setRawCategories] = useState([]);
  const [modifierGroups, setModifierGroups] = useState([]);
  const [rawModifierGroups, setRawModifierGroups] = useState([]);
  const [tables, setTables] = useState([]);
  const [discounts, setDiscounts] = useState([]);

  const fetchData = async () => {
    try {
      // Fetch all data in parallel
      const [
        productData, 
        categoryData, 
        groupData, 
        tableData, 
        discountData
      ] = await Promise.all([
        window.api.getProducts(),
        window.api.getCategories(),
        window.api.getModifierGroups(),
        window.api.getTables(),
        window.api.getDiscounts(),
      ]);
      
      setProducts(productData);
      setRawCategories(categoryData);
      setCategories(categoryData.map(cat => ({ value: cat.id.toString(), label: cat.name })));
      setRawModifierGroups(groupData);
      setModifierGroups(groupData.map(g => ({ value: g.id.toString(), label: g.name })));
      setTables(tableData);
      setDiscounts(discountData);

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
  
  // Determine which tab should be active by default
  const defaultTab = canManageInventory ? 'products' : 'discounts';

  return (
    <div>
      <Group justify="space-between" mb="xl">
        <Title order={1}>Inventory & Menu Management</Title>
        {/* Only show the import button if they can manage the inventory itself */}
        {canManageInventory && <Button onClick={handleImportMenu} variant="outline">Import Menu</Button>}
      </Group>

      <Tabs defaultValue={defaultTab}>
        <Tabs.List>
          {/* Conditionally render each tab based on specific permissions */}
          {canManageInventory && <Tabs.Tab value="products">Products</Tabs.Tab>}
          {canManageInventory && <Tabs.Tab value="categories">Categories</Tabs.Tab>}
          {canManageInventory && <Tabs.Tab value="modifiers">Modifiers</Tabs.Tab>}
          {canManageInventory && <Tabs.Tab value="tables">Tables</Tabs.Tab>}
          {canManageDiscounts && <Tabs.Tab value="discounts">Discounts</Tabs.Tab>}
        </Tabs.List>

        {canManageInventory && (
          <>
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
          </>
        )}
        
        {canManageDiscounts && (
          <Tabs.Panel value="discounts" pt="xs">
            <DiscountManager discounts={discounts} onDataChanged={fetchData} />
          </Tabs.Panel>
        )}
      </Tabs>
    </div>
  );
}