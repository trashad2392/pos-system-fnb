// src/components/AddProductForm.js
'use client';

import { useState, useEffect, useMemo } from 'react'; // <-- Added useMemo
import {
  Button, TextInput, NumberInput, Group, Text, Paper, Title, Select, Box, ActionIcon, Image
} from '@mantine/core';
import { IconArrowDown, IconArrowUp, IconX, IconUpload } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications'; // <-- Import notifications

// Helper component for the re-orderable list (unchanged)
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

// --- MODIFIED Props: Added menus and rawCategories ---
export default function AddProductForm({ onProductAdded, categories, rawCategories = [], menus = [], modifierGroups }) {
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [price, setPrice] = useState(0);
  const [selectedMenuId, setSelectedMenuId] = useState(null); // <-- State for selected menu
  const [categoryId, setCategoryId] = useState(null);
  const [orderedModifiers, setOrderedModifiers] = useState([]);
  const [image, setImage] = useState(null);
  const [message, setMessage] = useState(''); // Keep message state if needed

  // Format menus for Select dropdown
  const menuOptions = useMemo(() => menus.map(menu => ({
    value: menu.id.toString(),
    label: menu.name,
  })), [menus]);

  // Filter categories based on selected menu
  const filteredCategoryOptions = useMemo(() => {
    if (!selectedMenuId) return [];
    return rawCategories
      .filter(cat => cat.menuId === parseInt(selectedMenuId, 10))
      .map(cat => ({ value: cat.id.toString(), label: cat.name }));
  }, [selectedMenuId, rawCategories]);

  // Effect to reset categoryId when menu changes
  useEffect(() => {
    setCategoryId(null); // Reset category when menu changes
  }, [selectedMenuId]);

  // Effect to set default menu if available
  useEffect(() => {
    if (!selectedMenuId && menuOptions.length > 0) {
      setSelectedMenuId(menuOptions[0].value);
    }
  }, [menuOptions, selectedMenuId]);


  const handleImageUpload = async () => {
    try {
      const imagePath = await window.api.uploadImage();
      if (imagePath) {
        setImage(imagePath);
         notifications.show({ title: 'Success', message: 'Image selected.', color: 'blue' });
      }
    } catch (error) {
       notifications.show({ title: 'Error', message: `Error uploading image: ${error.message}`, color: 'red' });
    }
  };

  const resetForm = () => {
      setName('');
      setSku('');
      setPrice(0);
      // Don't reset menuId, keep the user's selection
      setCategoryId(null);
      setOrderedModifiers([]);
      setImage(null);
      setMessage(''); // Clear any previous messages
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    // Validate required fields
    if (!selectedMenuId) {
       notifications.show({ title: 'Error', message: 'Please select a menu.', color: 'red' });
       return;
    }
     if (!categoryId) {
       notifications.show({ title: 'Error', message: 'Please select a category.', color: 'red' });
       return;
     }

    setMessage('Adding product...'); // Optional: Provide user feedback

    const productData = {
      name,
      sku,
      price: parseFloat(price) || 0,
      categoryId: parseInt(categoryId, 10),
      image, // Add image to data
      modifierGroupIds: orderedModifiers.map(om => om.modifierGroupId),
    };

    try {
      const result = await window.api.addProduct(productData);
      notifications.show({ title: 'Success', message: `Added: ${result.name}`, color: 'green' });
      resetForm(); // Reset form fields on success
      if (onProductAdded) { onProductAdded(); }
    } catch (error) {
      notifications.show({ title: 'Error', message: `Failed to add product: ${error.message}`, color: 'red' });
      console.error("Add Product Error:", error);
      setMessage(''); // Clear "Adding product..." message on error
    }
  };

  // --- Functions to manage the ordered list (unchanged) ---
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
          {/* --- Added Menu Select --- */}
          <Select
              label="Menu"
              placeholder="Select Menu first"
              data={menuOptions}
              value={selectedMenuId}
              onChange={setSelectedMenuId}
              required
              searchable
              nothingFoundMessage="No menus found"
          />
          {/* --- Modified Category Select --- */}
          <Select
            label="Category"
            placeholder={selectedMenuId ? "Pick a category" : "Select menu first"}
            data={filteredCategoryOptions} // Use filtered options
            value={categoryId}
            onChange={setCategoryId}
            required
            disabled={!selectedMenuId} // Disable until menu is selected
            searchable
            nothingFoundMessage="No categories found for this menu"
          />
        </Group>
         <Group grow mt="md">
            <NumberInput label="Price" value={price} onChange={setPrice} required precision={2} step={0.01} min={0} />
            {/* Empty group item to maintain layout */}
            <Box />
         </Group>

        <Box mt="md">
            <Text fw={500}>Product Image</Text>
            {image && <Image src={image} alt="Product image preview" w={100} h={100} radius="sm" mt="xs" />}
            <Button leftSection={<IconUpload size={14} />} onClick={handleImageUpload} mt="xs" variant="outline">
                {image ? 'Change Image' : 'Upload Image'}
            </Button>
        </Box>

        <Box mt="md">
            <Text fw={500}>Modifier Groups (Optional)</Text>
            <Select
              label="Add a modifier group"
              placeholder="Search and select a group to add..."
              data={modifierGroups.filter(mg => !orderedModifiers.some(om => om.modifierGroupId === parseInt(mg.value, 10)))}
              onChange={handleAddModifier}
              searchable
              clearable
              mt="xs"
            />
            <OrderedModifierList
              items={orderedModifiers}
              onMove={handleMoveModifier}
              onRemove={handleRemoveModifier}
            />
        </Box>

        <Button type="submit" mt="xl">Add Product</Button>
      </form>
      {/* Removed the dedicated message Text component, using notifications instead */}
    </Paper>
  );
}