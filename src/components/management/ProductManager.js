// src/components/management/ProductManager.js
"use client";
import { useState, useEffect, useMemo } from 'react';
import {
  Title, Box, TextInput, Table, Button, Paper, Group, ActionIcon, Modal,
  NumberInput, Text, Select, Image, SimpleGrid
} from '@mantine/core';
import { IconSearch, IconEdit, IconArchive, IconArrowDown, IconArrowUp, IconX, IconUpload } from '@tabler/icons-react';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import AddProductForm from '@/components/AddProductForm';

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
            <Text>{item.modifierGroup?.name || `Group ID: ${item.modifierGroupId}`}</Text>
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

export default function ProductManager({ products, categories, rawCategories = [], modifierGroups, menus = [], onDataChanged }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMenuId, setFilterMenuId] = useState(null);
  const [opened, { open, close }] = useDisclosure(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [orderedModifiers, setOrderedModifiers] = useState([]);
  const [editSelectedMenuId, setEditSelectedMenuId] = useState(null);

  const menuOptions = useMemo(() => [
    { value: '', label: 'All Menus' },
    ...menus.map(menu => ({
      value: menu.id.toString(),
      label: menu.name,
    }))
  ], [menus]);

  const filteredCategoryOptionsEdit = useMemo(() => {
    if (!editSelectedMenuId) return [];
    return rawCategories
      .filter(cat => cat.menuId === parseInt(editSelectedMenuId, 10))
      .map(cat => ({ value: cat.id.toString(), label: cat.name }));
  }, [editSelectedMenuId, rawCategories]);

  const handleEditClick = (product) => {
    const initialOrderedModifiers = product.modifierGroups.map(pmg => ({
      modifierGroupId: pmg.modifierGroupId,
      modifierGroup: pmg.modifierGroup || rawModifierGroups.find(g => g.id === pmg.modifierGroupId),
    }));
    setOrderedModifiers(initialOrderedModifiers);

    const initialMenuId = product.category?.menuId?.toString() || null;
    setEditSelectedMenuId(initialMenuId);

    setSelectedProduct({
      ...product,
      categoryId: product.categoryId?.toString() || null,
      price: Number(product.price) || 0,
    });
    open();
  };

  useEffect(() => {
    if (selectedProduct && opened) {
      const currentCategoryBelongsToNewMenu = rawCategories.some(cat =>
        cat.id === parseInt(selectedProduct.categoryId, 10) &&
        cat.menuId === parseInt(editSelectedMenuId, 10)
      );
      if (!currentCategoryBelongsToNewMenu) {
        setSelectedProduct(prev => ({ ...prev, categoryId: null }));
      }
    }
  }, [editSelectedMenuId, rawCategories, opened, selectedProduct?.categoryId]);

  const handleImageUpload = async () => {
    try {
      const imagePath = await window.api.uploadImage();
      if (imagePath && selectedProduct) {
        setSelectedProduct({ ...selectedProduct, image: imagePath });
         notifications.show({ title: 'Success', message: 'Image selected.', color: 'blue' });
      }
    } catch (error) {
      console.error("Failed to upload image:", error);
       notifications.show({ title: 'Error', message: `Error uploading image: ${error.message}`, color: 'red' });
    }
  };

  const handleUpdateProduct = async (event) => {
    event.preventDefault();
    if (!selectedProduct || !editSelectedMenuId || !selectedProduct.categoryId) {
       notifications.show({ title: 'Error', message: 'Menu and Category are required.', color: 'red' });
       return;
    }
    try {
      const { id, name, sku, price, categoryId, image } = selectedProduct;
      const dataToUpdate = {
        name, sku,
        price: parseFloat(price) || 0,
        categoryId: parseInt(categoryId, 10),
        modifierGroups: orderedModifiers.map(om => ({ modifierGroupId: om.modifierGroupId })),
        image,
      };
      await window.api.updateProduct({ id, data: dataToUpdate });
      notifications.show({ title: 'Success', message: 'Product updated successfully.', color: 'green' });
      onDataChanged();
      close();
      setSelectedProduct(null);
      setOrderedModifiers([]);
      setEditSelectedMenuId(null);
    } catch (error) {
       console.error("Failed to update product:", error);
       notifications.show({ title: 'Error', message: `Failed to update product: ${error.message}`, color: 'red' });
     }
  };

  const handleArchive = async (productId) => {
    if (window.confirm('Are you sure you want to archive this product?')) {
      try {
        await window.api.deleteProduct(productId);
        notifications.show({ title: 'Success', message: 'Product archived.', color: 'orange' });
        onDataChanged();
       } catch (error) {
         console.error("Failed to archive product:", error);
         notifications.show({ title: 'Error', message: `Failed to archive product: ${error.message}`, color: 'red' });
       }
    }
  };

  const handleAddModifier = (modifierGroupIdStr) => {
    if (!modifierGroupIdStr) return;
    const modifierGroupId = parseInt(modifierGroupIdStr, 10);
    if (orderedModifiers.some(om => om.modifierGroupId === modifierGroupId)) return;

    const groupToAdd = rawModifierGroups.find(mg => mg.id === modifierGroupId);
    if (groupToAdd) {
        setOrderedModifiers(current => [...current, { modifierGroupId, modifierGroup: groupToAdd }]);
    } else {
        console.warn(`Modifier group with ID ${modifierGroupIdStr} not found in rawModifierGroups`);
        const groupOption = modifierGroups.find(mg => mg.value === modifierGroupIdStr);
        if (groupOption) {
             setOrderedModifiers(current => [...current, { modifierGroupId, modifierGroup: { id: modifierGroupId, name: groupOption.label } }]);
        }
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

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const searchMatch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.sku.toLowerCase().includes(searchQuery.toLowerCase());
      const menuMatch = !filterMenuId || (p.category?.menuId === parseInt(filterMenuId, 10));
      return searchMatch && menuMatch;
    });
  }, [products, searchQuery, filterMenuId]);

  return (
    <>
      <AddProductForm
        onProductAdded={onDataChanged}
        categories={categories}
        rawCategories={rawCategories}
        menus={menus}
        modifierGroups={modifierGroups}
      />

      <Paper shadow="xs" p="md" withBorder mt="xl">
        <Title order={2} mb="md">Product List</Title>
        <SimpleGrid cols={{ base: 1, sm: 2 }} mb="md">
           <TextInput
             placeholder="Search by name or SKU..."
             leftSection={<IconSearch size={14} />}
             value={searchQuery}
             onChange={(e) => setSearchQuery(e.currentTarget.value)}
           />
           <Select
             placeholder="Filter by Menu"
             data={menuOptions}
             value={filterMenuId}
             onChange={setFilterMenuId}
             clearable
           />
        </SimpleGrid>

        <Table striped highlightOnHover withTableBorder withColumnBorders>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Name</Table.Th>
              <Table.Th>SKU</Table.Th>
              <Table.Th>Menu</Table.Th>
              <Table.Th>Category</Table.Th>
              <Table.Th>Price</Table.Th>
              <Table.Th>Actions</Table.Th>
            </Table.Tr>
          </Table.Thead>
          {/* --- FIX: Removed whitespace around map --- */}
          <Table.Tbody>{
            filteredProducts.length === 0 ? (
              <Table.Tr><Table.Td colSpan={6}><Text ta="center">No products found matching your criteria.</Text></Table.Td></Table.Tr>
             ) : (
               filteredProducts.map((p) => (
                <Table.Tr key={p.id}>
                  <Table.Td>{p.name}</Table.Td>
                  <Table.Td>{p.sku}</Table.Td>
                  <Table.Td>{p.category?.menu?.name || 'N/A'}</Table.Td>
                  <Table.Td>{p.category?.name || 'N/A'}</Table.Td>
                  <Table.Td>${Number(p.price).toFixed(2)}</Table.Td>
                  <Table.Td>
                    <Group gap="xs">
                      <ActionIcon variant="outline" onClick={() => handleEditClick(p)}>
                        <IconEdit size={16} />
                      </ActionIcon>
                      <ActionIcon title="Archive Product" color="red" variant="outline" onClick={() => handleArchive(p.id)}>
                        <IconArchive size={16} />
                      </ActionIcon>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))
             )
          }</Table.Tbody>
           {/* --- END FIX --- */}
        </Table>
      </Paper>

      <Modal opened={opened} onClose={close} title="Edit Product" size="lg">
        {selectedProduct && (
          <form onSubmit={handleUpdateProduct}>
            <TextInput label="Product Name" required value={selectedProduct.name} onChange={(e) => setSelectedProduct({ ...selectedProduct, name: e.currentTarget.value })}/>
            <TextInput mt="md" label="SKU" required value={selectedProduct.sku} onChange={(e) => setSelectedProduct({ ...selectedProduct, sku: e.currentTarget.value })}/>
             <Group grow mt="md">
               <Select
                   label="Menu"
                   placeholder="Select Menu first"
                   data={menuOptions.filter(opt => opt.value !== '')}
                   value={editSelectedMenuId}
                   onChange={setEditSelectedMenuId}
                   required
                   searchable
                   nothingFoundMessage="No menus found"
               />
               <Select
                 label="Category"
                 placeholder={editSelectedMenuId ? "Pick a category" : "Select menu first"}
                 data={filteredCategoryOptionsEdit}
                 value={selectedProduct.categoryId}
                 onChange={(v) => setSelectedProduct({ ...selectedProduct, categoryId: v })}
                 required
                 disabled={!editSelectedMenuId}
                 searchable
                 nothingFoundMessage="No categories found for this menu"
               />
             </Group>
            <NumberInput mt="md" label="Price" required precision={2} min={0} value={selectedProduct.price} onChange={(v) => setSelectedProduct({ ...selectedProduct, price: v || 0 })}/>

            <Box mt="md">
                <Text fw={500}>Product Image</Text>
                {selectedProduct.image ? (
                   <Image src={selectedProduct.image} alt="Product image" w={100} h={100} radius="sm" mt="xs" />
                 ) : (
                   <Text size="sm" c="dimmed" mt="xs">No image uploaded.</Text>
                 )}
                <Button leftSection={<IconUpload size={14} />} onClick={handleImageUpload} mt="xs" variant="outline">
                    {selectedProduct.image ? 'Change Image' : 'Upload Image'}
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

            <Group justify="flex-end" mt="xl">
              <Button variant="default" onClick={close}>Cancel</Button>
              <Button type="submit">Save Changes</Button>
            </Group>
          </form>
        )}
      </Modal>
    </>
  )
}