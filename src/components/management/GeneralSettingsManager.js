// src/components/management/GeneralSettingsManager.js
"use client";

import { useState, useEffect } from 'react';
import { 
  TextInput, 
  NumberInput, 
  Switch, 
  Button, 
  Stack, 
  Group, 
  Paper, 
  Title, 
  LoadingOverlay,
  Divider,
  Text
} from '@mantine/core';
import { notifications } from '@mantine/notifications';

export default function GeneralSettingsManager() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Settings State with your requested defaults
  const [settings, setSettings] = useState({
    currency_symbol: 'EGP',
    tax_label: 'VAT',
    tax_rate: 14,
    tax_inclusive: true,
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      // Fetches all settings from the database via IPC
      const data = await window.api.getPosSettings();
      
      // Update state if values exist, otherwise keep defaults
      setSettings({
        currency_symbol: data.currency_symbol || 'EGP',
        tax_label: data.tax_label || 'VAT',
        tax_rate: data.tax_rate !== undefined ? parseFloat(data.tax_rate) : 14,
        tax_inclusive: data.tax_inclusive !== undefined ? data.tax_inclusive === 'true' : true,
      });
    } catch (error) {
      console.error("Failed to fetch settings:", error);
      notifications.show({ title: 'Error', message: 'Failed to load settings', color: 'red' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      // Save all settings at once using the transaction-based IPC handler
      await window.api.setPosSettings({
        currency_symbol: settings.currency_symbol,
        tax_label: settings.tax_label,
        tax_rate: String(settings.tax_rate),
        tax_inclusive: String(settings.tax_inclusive),
      });
      notifications.show({ title: 'Success', message: 'General settings updated successfully', color: 'green' });
    } catch (error) {
      console.error("Failed to save settings:", error);
      notifications.show({ title: 'Error', message: 'Failed to save settings', color: 'red' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Paper withBorder p="md" pos="relative" radius="md">
      {/* Fixed: overlayBlur moved into overlayProps to resolve React warning */}
      <LoadingOverlay 
        visible={loading} 
        overlayProps={{ blur: 2 }} 
      />
      
      <Stack gap="md">
        <div>
          <Title order={3}>Localization & Tax</Title>
          <Text size="sm" c="dimmed">Configure how your currency and taxes appear on receipts and the POS.</Text>
        </div>
        
        <Divider />

        <Group grow align="flex-start">
          <TextInput
            label="Currency Symbol"
            placeholder="e.g., EGP, $, €"
            description="Displayed next to all prices"
            value={settings.currency_symbol}
            onChange={(e) => setSettings({ ...settings, currency_symbol: e.target.value })}
          />
          <TextInput
            label="Tax Label"
            placeholder="e.g., VAT, GST, Sales Tax"
            description="The name shown on the receipt"
            value={settings.tax_label}
            onChange={(e) => setSettings({ ...settings, tax_label: e.target.value })}
          />
        </Group>

        <Group grow align="flex-end">
          <NumberInput
            label="Tax Rate (%)"
            description="Percentage to calculate"
            decimalScale={2}
            min={0}
            max={100}
            value={settings.tax_rate}
            onChange={(val) => setSettings({ ...settings, tax_rate: val })}
          />
          <Paper withBorder p="xs" radius="sm" style={{ flex: 1 }}>
            <Switch
              label="Prices include tax"
              description="Inclusive: Tax is inside the price. Exclusive: Tax is added on top."
              checked={settings.tax_inclusive}
              onChange={(e) => setSettings({ ...settings, tax_inclusive: e.currentTarget.checked })}
            />
          </Paper>
        </Group>

        <Divider mt="sm" />

        <Button 
          onClick={handleSave} 
          loading={saving} 
          size="md"
          color="blue"
        >
          Save General Settings
        </Button>
      </Stack>
    </Paper>
  );
}