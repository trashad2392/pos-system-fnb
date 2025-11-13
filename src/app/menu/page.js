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
import MenuManager from '@/components/management/MenuManager';
import MenuSettingsManager from '@/components/management/MenuSettingsManager'; // <-- Import MenuSettingsManager

export default function InventoryPage() {
  const { hasPermission } = useAuth();

  // Determine which sections the user can access
  const canManageInventory = hasPermission('inventory:manage');
  const canManageDiscounts = hasPermission('discounts:manage');
  // --- NEW: Check POS Settings permission ---
  const canManagePosSettings = hasPermission('settings:manage_pos');
  // --- END NEW ---

  // If the user has access to neither section, then deny access to the whole page.
  if (!canManageInventory && !canManageDiscounts && !canManagePosSettings) { // <-- UPDATED CHECK
    return (
      <Center style={{ height: '50vh' }}>
        <Text c="red" fw={500}>You do not have permission to view this page.</Text>
      </Center>
    );
  }

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [rawCategories, setRawCategories] = useState([]);
  const [modifierGroups, setModifierGroups] = useState([]);
  const [rawModifierGroups, setRawModifierGroups] = useState([]);
  const [tables, setTables] = useState([]);
  const [discounts, setDiscounts] = useState([]);
  const [menus, setMenus] = useState([]); // <-- Add state for menus

  const fetchData = async () => {
    try {
      // Fetch all data in parallel
      const [
        menuData, // <-- Fetch menus first
        productData,
        categoryData,
        groupData,
        tableData,
        discountData
      ] = await Promise.all([
        window.api.getMenus(), // <-- Call getMenus
        window.api.getProducts(),
        window.api.getCategories(),
        window.api.getModifierGroups(),
        window.api.getTables(),
        window.api.getDiscounts(),
      ]);

      setMenus(menuData); // <-- Set menus state
      setProducts(productData);
      setRawCategories(categoryData);
      // Format categories for Select dropdowns
      setCategories(categoryData.map(cat => ({
        value: cat.id.toString(),
        label: `${cat.name} (${cat.menu?.name || 'No Menu'})` // <-- Include menu name in label
      })));
      setRawModifierGroups(groupData);
      // Format modifier groups for Select dropdowns
      setModifierGroups(groupData.map(g => ({ value: g.id.toString(), label: g.name })));
      setTables(tableData);
      setDiscounts(discountData);

    } catch (error) { console.error("Error fetching page data:", error); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleImportMenu = async () => {
    if (!window.confirm('This will wipe your existing menus and replace them. Are you sure?')) {
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
  const defaultTab = canManagePosSettings ? 'pos_settings' : (canManageInventory ? 'menus' : 'discounts');
  
  return (
    <div>
      <Group justify="space-between" mb="xl">
        <Title order={1}>Menu Management</Title> {/* <-- CHANGED PAGE TITLE */}
        {canManageInventory && <Button onClick={handleImportMenu} variant="outline">Import Menu</Button>}
      </Group>

      <Tabs defaultValue={defaultTab}>
        <Tabs.List>
          {/* --- NEW: POS Settings Tab (moved from Settings) --- */}
          {canManagePosSettings && <Tabs.Tab value="pos_settings">POS Settings</Tabs.Tab>}
          {/* --- END NEW --- */}
          {/* Conditionally render each tab */}
          {canManageInventory && <Tabs.Tab value="menus">Menus</Tabs.Tab>}
          {canManageInventory && <Tabs.Tab value="categories">Categories</Tabs.Tab>}
          {canManageInventory && <Tabs.Tab value="products">Products</Tabs.Tab>}
          {canManageInventory && <Tabs.Tab value="modifiers">Modifiers</Tabs.Tab>}
          {canManageInventory && <Tabs.Tab value="tables">Tables</Tabs.Tab>}
          {canManageDiscounts && <Tabs.Tab value="discounts">Discounts</Tabs.Tab>}
        </Tabs.List>

        {/* --- NEW: POS Settings Panel (moved from Settings) --- */}
        {canManagePosSettings && (
          <Tabs.Panel value="pos_settings" pt="md">
            <MenuSettingsManager />
          </Tabs.Panel>
        )}
        {/* --- End NEW --- */}

        {canManageInventory && (
          <Tabs.Panel value="menus" pt="xs">
            <MenuManager menus={menus} onDataChanged={fetchData} />
          </Tabs.Panel>
        )}
        {/* --- End Add Menus Panel --- */}

        {canManageInventory && (
          <>
            <Tabs.Panel value="categories" pt="xs">
              {/* Pass menus prop */}
              <CategoryManager categories={rawCategories} menus={menus} onDataChanged={fetchData} />
            </Tabs.Panel>
            <Tabs.Panel value="products" pt="xs">
              {/* Pass menus prop */}
              <ProductManager
                products={products}
                categories={categories} // formatted categories
                rawCategories={rawCategories} // pass raw for filtering
                modifierGroups={modifierGroups}
                menus={menus} // <-- Pass menus
                onDataChanged={fetchData}
              />
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