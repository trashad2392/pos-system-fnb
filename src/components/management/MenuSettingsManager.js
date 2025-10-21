// src/components/management/MenuSettingsManager.js
"use client";
import { useState, useEffect, useMemo } from 'react';
import {
  Title, Paper, Group, Button, Select, Stack, Text, Box
} from '@mantine/core';
import { notifications } from '@mantine/notifications';

const ORDER_TYPES = ['Dine-In', 'Takeaway', 'Delivery', 'Drive-Through'];
const SETTING_KEY_PREFIX = 'menu_'; // Prefix for setting keys in the database

export default function MenuSettingsManager() {
  const [activeMenus, setActiveMenus] = useState([]);
  const [menuSettings, setMenuSettings] = useState({}); // Stores { 'menu_Dine-In': '1', ... }
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch initial data
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const [menusData, settingsData] = await Promise.all([
          window.api.getMenus({ activeOnly: true }), // Fetch only active menus
          window.api.getPosSettings(),
        ]);
        setActiveMenus(menusData);
        // Initialize settings state, using existing values or defaulting to ''
        const initialSettings = ORDER_TYPES.reduce((acc, type) => {
          const key = `${SETTING_KEY_PREFIX}${type}`;
          acc[key] = settingsData[key] || ''; // Use empty string for 'Default'
          return acc;
        }, {});
        setMenuSettings(initialSettings);
      } catch (error) {
        console.error("Failed to load menu settings:", error);
        notifications.show({
          title: 'Error Loading Settings',
          message: `Could not load menus or settings: ${error.message}`,
          color: 'red',
        });
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  // Format active menus for Select dropdowns, adding a "Default" option
  const menuOptions = useMemo(() => [
    { value: '', label: 'Default (First Active Menu)' }, // Represent default behavior
    ...activeMenus.map(menu => ({
      value: menu.id.toString(),
      label: menu.name,
    })),
  ], [activeMenus]);

  // Handle changes in the Select dropdowns
  const handleSettingChange = (orderType, selectedMenuId) => {
    const key = `${SETTING_KEY_PREFIX}${orderType}`;
    setMenuSettings(prevSettings => ({
      ...prevSettings,
      [key]: selectedMenuId || '', // Store empty string if null/undefined
    }));
  };

  // Save all settings to the backend
  const handleSaveChanges = async () => {
    setIsSaving(true);
    try {
      await window.api.setPosSettings(menuSettings);
      notifications.show({
        title: 'Success',
        message: 'POS Menu settings saved successfully.',
        color: 'green',
      });
    } catch (error) {
      console.error("Failed to save menu settings:", error);
      notifications.show({
        title: 'Error Saving Settings',
        message: `Could not save settings: ${error.message}`,
        color: 'red',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <Text>Loading settings...</Text>;
  }

  return (
    <Paper shadow="xs" p="md" withBorder>
      <Title order={3} mb="md">POS Menu Assignments</Title>
      <Text size="sm" c="dimmed" mb="lg">
        Assign a specific active menu to each order type. If 'Default' is selected,
        the POS will use the first active menu found in the system for that order type.
      </Text>

      <Stack gap="md">
        {ORDER_TYPES.map(orderType => {
          const settingKey = `${SETTING_KEY_PREFIX}${orderType}`;
          return (
            <Select
              key={orderType}
              label={`${orderType} Menu`}
              placeholder="Select a menu"
              data={menuOptions}
              value={menuSettings[settingKey] || ''}
              onChange={(value) => handleSettingChange(orderType, value)}
              searchable
              nothingFoundMessage="No active menus found"
              allowDeselect={false} // Ensure something is always selected (even Default)
            />
          );
        })}
      </Stack>

      <Group justify="flex-end" mt="xl">
        <Button onClick={handleSaveChanges} loading={isSaving}>
          Save Menu Settings
        </Button>
      </Group>
    </Paper>
  );
}