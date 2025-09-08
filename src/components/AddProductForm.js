// src/components/AddProductForm.js
'use client';

import { useState } from 'react';
import { Button, TextInput, NumberInput, Group, Text, Paper, Title, Select, Box, ActionIcon } from '@mantine/core';
import { IconArrowDown, IconArrowUp, IconX } from '@tabler/icons-react';

// Helper component for the re-orderable list
function OrderedModifierList({ items, onMove, onRemove }) {
  if (!items || items.length === 0) {
    return <Text c="dimmed" ta="center" mt="sm">No modifier groups selected.</Text>;
  }

  return (
    <Box mt="sm">
      {items.map((item, index) => (
        <Paper withBorder p="xs" key={item.modifierGroupId} mb="xs">
          <Group justify="space-between">
            <Text>{item.label}</Text>
            <Group gap="xs">
              <ActionIcon variant="default" onClick={() => onMove(index, 'up')} disabled={index === 0}>
                <IconArrowUp size={16} />
              </ActionIcon>
              <ActionIcon variant="default" onClick={() => onMove(index, 'down')} disabled={index === items.length - 1}>
                <IconArrowDown size={16} />
              </ActionIcon>
              <ActionIcon color="red" variant="light" onClick={() => onRemove(index)}>
                <IconX size={16} />
              </ActionIcon>
            </Group>
          </Group>
        </Paper>
      ))}
    </Box>
  );
}

export default function AddProductForm({ onProductAdded, categories, modifierGroups }) {
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [price, setPrice] = useState(0);
  const [categoryId, setCategoryId] = useState(null);
  const [orderedModifiers, setOrderedModifiers] = useState([]);
  const [message, setMessage] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!categoryId) { setMessage('Error: Please select a category.'); return; }
    setMessage('Adding product...');
    
    const productData = {
      name,
      sku,
      price: parseFloat(price) || 0,
      categoryId: parseInt(categoryId, 10),
      // UPDATED: Send the ordered list of modifier IDs
      modifierGroupIds: orderedModifiers.map(om => om.modifierGroupId),
    };

    try {
      const result = await window.api.addProduct(productData);
      setMessage(`Success! Added: ${result.name}`);
      // Reset all state
      setName(''); 
      setSku(''); 
      setPrice(0); 
      setCategoryId(null); 
      setOrderedModifiers([]);
      if (onProductAdded) { onProductAdded(); }
    } catch (error) {
      setMessage(`Error: ${error.message}`);
      console.error("Add Product Error:", error); 
    }
  };

  // --- Functions to manage the ordered list ---
  const handleAddModifier = (modifierGroupIdStr) => {
    if (!modifierGroupIdStr) return;
    const modifierGroupId = parseInt(modifierGroupIdStr, 10);
    if (orderedModifiers.some(om => om.modifierGroupId === modifierGroupId)) return;
    
    const groupToAdd = modifierGroups.find(mg => parseInt(mg.value, 10) === modifierGroupId);
    if (groupToAdd) {
      setOrderedModifiers(current => [...current, { modifierGroupId, label: groupToAdd.label }]);
    }
  };

  const handleRemoveModifier = (index) => {
    setOrderedModifiers(current => current.filter((_, i) => i !== index));
  };

  const handleMoveModifier = (index, direction) => {
    const newOrderedModifiers = [...orderedModifiers];
    const item = newOrderedModifiers[index];
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    
    newOrderedModifiers[index] = newOrderedModifiers[swapIndex];
    newOrderedModifiers[swapIndex] = item;
    
    setOrderedModifiers(newOrderedModifiers);
  };


  return (
    <Paper shadow="xs" p="md" withBorder mt="xl">
      <Title order={2} mb="md">Add a New Product</Title>
      <form onSubmit={handleSubmit}>
        <Group grow>
          <TextInput label="Name" value={name} onChange={(e) => setName(e.target.value)} required />
          <TextInput label="SKU" value={sku} onChange={(e) => setSku(e.target.value)} required />
        </Group>
        <Group grow mt="md">
          <NumberInput label="Price" value={price} onChange={setPrice} required precision={2} step={0.01} min={0} />
          <Select
            label="Category"
            placeholder="Pick a category"
            data={categories}
            value={categoryId}
            onChange={setCategoryId}
            required
          />
        </Group>
        
        {/* --- UPDATED MODIFIER SECTION --- */}
        <Box mt="md">
            <Text fw={500}>Modifier Groups</Text>
            <Select
              label="Add a modifier group"
              placeholder="Search and select a group to add..."
              // Filter out groups that have already been added
              data={modifierGroups.filter(mg => !orderedModifiers.some(om => om.modifierGroupId === parseInt(mg.value, 10)))}
              onChange={handleAddModifier}
              searchable
              clearable
            />
            <OrderedModifierList 
              items={orderedModifiers}
              onMove={handleMoveModifier}
              onRemove={handleRemoveModifier}
            />
        </Box>
        {/* --- END UPDATED SECTION --- */}
        
        <Button type="submit" mt="md">Add Product</Button>
      </form>
      {message && <Text mt="sm" c={message.startsWith('Error') ? 'red' : 'green'}>{message}</Text>}
    </Paper>
  );
}