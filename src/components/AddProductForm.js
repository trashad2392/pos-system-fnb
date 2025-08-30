// src/components/AddProductForm.js
'use client';

import { useState } from 'react';
import { Button, TextInput, NumberInput, Group, Text, Paper, Title, Select, MultiSelect } from '@mantine/core';

// It now accepts 'modifierGroups' as a prop
export default function AddProductForm({ onProductAdded, categories, modifierGroups }) {
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [price, setPrice] = useState(0);
  const [categoryId, setCategoryId] = useState(null);
  const [selectedModifiers, setSelectedModifiers] = useState([]);
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
      modifierGroupIds: selectedModifiers.map(id => parseInt(id, 10)),
    };

    try {
      const result = await window.api.addProduct(productData);
      setMessage(`Success! Added: ${result.name}`);
      setName(''); setSku(''); setPrice(0); setCategoryId(null); setSelectedModifiers([]);
      if (onProductAdded) { onProductAdded(); }
    } catch (error) {
      setMessage(`Error: ${error.message}`);
      console.error("Add Product Error:", error); 
    }
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
        <MultiSelect
          mt="md"
          label="Apply Modifier Groups (Optional)"
          placeholder="Select customizations"
          data={modifierGroups}
          value={selectedModifiers}
          onChange={setSelectedModifiers}
          clearable
        />
        <Button type="submit" mt="md">Add Product</Button>
      </form>
      {message && <Text mt="sm" size="sm" c={message.startsWith('Error') ? 'red' : 'green'}>{message}</Text>}
    </Paper>
  );
}