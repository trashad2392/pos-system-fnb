// src/app/management/page.js
"use client";
import { useState, useEffect, useMemo } from 'react';
import { Title, Button, Group, Tabs, Center, Text } from '@mantine/core';
import { useAuth } from '@/context/AuthContext';
import CategoryManager from '@/components/management/CategoryManager';
import ProductManager from '@/components/management/ProductManager';
import ModifierManager from '@/components/management/ModifierManager';
import TableManager from '@/components/management/TableManager';
import DiscountManager from '@/components/management/DiscountManager';
import MenuManager from '@/components/management/MenuManager';
import MenuSettingsManager from '@/components/management/MenuSettingsManager';
import CustomerManager from '@/components/management/CustomerManager';

// Define the tab structure and permissions
const managementTabs = [
  // General Management Tabs
  { value: 'pos_settings', label: 'POS Settings', permission: 'settings:manage_pos', component: MenuSettingsManager },
  { value: 'menus', label: 'Menus', permission: 'inventory:manage', component: MenuManager },
  { value: 'categories', label: 'Categories', permission: 'inventory:manage', component: CategoryManager },
  { value: 'products', label: 'Products', permission: 'inventory:manage', component: ProductManager },
  { value: 'modifiers', label: 'Modifiers', permission: 'inventory:manage', component: ModifierManager },
  { value: 'tables', label: 'Tables', permission: 'inventory:manage', component: TableManager },
  { value: 'discounts', label: 'Discounts', permission: 'discounts:manage', component: DiscountManager },
  // Credit Sale Customer Manager
  { value: 'customers', label: 'Credit Sale Customers Manager', permission: 'customers:manage', component: CustomerManager },
];

export default function InventoryPage() {
  const { hasPermission } = useAuth();

  // Determine access permissions
  const canManageInventory = hasPermission('inventory:manage');
  const canManageDiscounts = hasPermission('discounts:manage');
  const canManagePosSettings = hasPermission('settings:manage_pos');
  const canManageCustomers = hasPermission('customers:manage');

  // Filter tabs accessible to the current user
  const accessibleTabs = useMemo(() => {
    return managementTabs.filter(tab => {
        if (tab.permission === 'inventory:manage') return canManageInventory;
        if (tab.permission === 'discounts:manage') return canManageDiscounts;
        if (tab.permission === 'settings:manage_pos') return canManagePosSettings;
        if (tab.permission === 'customers:manage') return canManageCustomers;
        return false;
    });
  }, [canManageInventory, canManageDiscounts, canManagePosSettings, canManageCustomers]);

  // If the user has access to neither section, then deny access to the whole page.
  if (accessibleTabs.length === 0) { 
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
  const [menus, setMenus] = useState([]);
  const [posSettings, setPosSettings] = useState(null); // Added state for settings

  const fetchData = async () => {
    try {
      // Fetch all data in parallel, including POS settings
      const [
        menuData,
        productData,
        categoryData,
        groupData,
        tableData,
        discountData,
        settingsData
      ] = await Promise.all([
        window.api.getMenus(),
        window.api.getProducts(),
        window.api.getCategories(),
        window.api.getModifierGroups(),
        window.api.getTables(),
        window.api.getDiscounts(),
        window.api.getPosSettings(),
      ]);

      setMenus(menuData);
      setProducts(productData);
      setRawCategories(categoryData);
      // Format categories for Select dropdowns
      setCategories(categoryData.map(cat => ({
        value: cat.id.toString(),
        label: `${cat.name} (${cat.menu?.name || 'No Menu'})`
      })));
      setRawModifierGroups(groupData);
      // Format modifier groups for Select dropdowns
      setModifierGroups(groupData.map(g => ({ value: g.id.toString(), label: g.name })));
      setTables(tableData);
      setDiscounts(discountData);
      setPosSettings(settingsData); // Store settings

    } catch (error) { console.error("Error fetching page data:", error); }
  };

  useEffect(() => { fetchData(); }, []);

  // Format the currency symbol with a mandatory space
  const currencySymbol = `${posSettings?.currency_symbol || '$'} `;

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
  const defaultTab = accessibleTabs[0]?.value || 'menus';
  
  return (
    <div>
      <Group justify="space-between" mb="xl">
        <Title order={1}>Menu Management</Title>
        {canManageInventory && <Button onClick={handleImportMenu} variant="outline">Import Menu</Button>}
      </Group>

      <Tabs defaultValue={defaultTab}>
        <Tabs.List>
          {accessibleTabs.map(tab => (
            <Tabs.Tab key={tab.value} value={tab.value}>
              {tab.label}
            </Tabs.Tab>
          ))}
        </Tabs.List>

        {accessibleTabs.map(tab => {
          if (tab.value === 'customers') {
            return (
              <Tabs.Panel key={tab.value} value={tab.value} pt="md">
                <CustomerManager currencySymbol={currencySymbol} />
              </Tabs.Panel>
            );
          }

          if (tab.value === 'pos_settings') {
            return (
              <Tabs.Panel key={tab.value} value={tab.value} pt="md">
                <MenuSettingsManager />
              </Tabs.Panel>
            );
          }

          if (tab.value === 'menus') {
            return (
              <Tabs.Panel key={tab.value} value={tab.value} pt="xs">
                <MenuManager menus={menus} onDataChanged={fetchData} />
              </Tabs.Panel>
            );
          }

          if (tab.value === 'categories') {
            return (
              <Tabs.Panel key={tab.value} value={tab.value} pt="xs">
                <CategoryManager categories={rawCategories} menus={menus} onDataChanged={fetchData} />
              </Tabs.Panel>
            );
          }

          if (tab.value === 'products') {
            return (
              <Tabs.Panel key={tab.value} value={tab.value} pt="xs">
                <ProductManager
                  products={products}
                  categories={categories}
                  rawCategories={rawCategories}
                  modifierGroups={modifierGroups}
                  menus={menus}
                  onDataChanged={fetchData}
                  currencySymbol={currencySymbol}
                />
              </Tabs.Panel>
            );
          }

          if (tab.value === 'modifiers') {
            return (
              <Tabs.Panel key={tab.value} value={tab.value} pt="xs">
                <ModifierManager modifierGroups={rawModifierGroups} onDataChanged={fetchData} currencySymbol={currencySymbol} />
              </Tabs.Panel>
            );
          }

          if (tab.value === 'tables') {
            return (
              <Tabs.Panel key={tab.value} value={tab.value} pt="xs">
                <TableManager tables={tables} onDataChanged={fetchData} />
              </Tabs.Panel>
            );
          }

          if (tab.value === 'discounts') {
            return (
              <Tabs.Panel key={tab.value} value={tab.value} pt="xs">
                <DiscountManager discounts={discounts} onDataChanged={fetchData} currencySymbol={currencySymbol} />
              </Tabs.Panel>
            );
          }
          
          return null;
        })}
      </Tabs>
    </div>
  );
}