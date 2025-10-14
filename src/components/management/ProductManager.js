// src/components/management/ProductManager.js
"use client";
import { useState } from 'react';
import { Title, Box, TextInput, Table, Button, Paper, Group, ActionIcon, Modal, NumberInput, Text, Select, Image } from '@mantine/core';
import { IconSearch, IconEdit, IconArchive, IconArrowDown, IconArrowUp, IconX, IconUpload } from '@tabler/icons-react';
import { useDisclosure } from '@mantine/hooks';
import AddProductForm from '@/components/AddProductForm';

function OrderedModifierList({ items, onMove, onRemove }) {
  if (!items || items.length === 0) {
    return <Text c="dimmed" ta="center" mt="sm">No modifier groups selected.</Text>;
  }

  return (
    <Box mt="sm">
      {items.map((item, index) => (
        <Paper withBorder p="xs" key={item.modifierGroupId} mb="xs">
          <Group justify="space-between">
            <Text>{item.modifierGroup.name}</Text>
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

export default function ProductManager({ products, categories, modifierGroups, onDataChanged }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [opened, { open, close }] = useDisclosure(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [orderedModifiers, setOrderedModifiers] = useState([]);

  const handleEditClick = (product) => {
    const initialOrderedModifiers = product.modifierGroups.map(pmg => ({
      modifierGroupId: pmg.modifierGroupId,
      modifierGroup: pmg.modifierGroup,
    }));
    setOrderedModifiers(initialOrderedModifiers);

    setSelectedProduct({
      ...product,
      categoryId: product.categoryId.toString(),
    });
    open();
  };

  const handleImageUpload = async () => {
    try {
      const imagePath = await window.api.uploadImage();
      if (imagePath && selectedProduct) {
        setSelectedProduct({ ...selectedProduct, image: imagePath });
      }
    } catch (error) {
      console.error("Failed to upload image:", error);
    }
  };

  const handleUpdateProduct = async (event) => {
    event.preventDefault();
    if (!selectedProduct) return;
    try {
      const { id, name, sku, price, categoryId, image } = selectedProduct;
      const dataToUpdate = {
        name, sku, price,
        categoryId: parseInt(categoryId, 10),
        modifierGroups: orderedModifiers.map(om => ({ modifierGroupId: om.modifierGroupId })),
        image,
      };
      await window.api.updateProduct({ id, data: dataToUpdate });
      onDataChanged();
      close();
    } catch (error) { console.error("Failed to update product:", error); }
  };

  const handleArchive = async (productId) => {
    if (window.confirm('Are you sure you want to archive this product?')) {
      try { await window.api.deleteProduct(productId); onDataChanged(); } catch (error) { console.error("Failed to archive product:", error); }
    }
  };

  const handleAddModifier = (modifierGroupIdStr) => {
    if (!modifierGroupIdStr) return;
    const modifierGroupId = parseInt(modifierGroupIdStr, 10);
    if (orderedModifiers.some(om => om.modifierGroupId === modifierGroupId)) return;

    const groupToAdd = modifierGroups.find(mg => parseInt(mg.value, 10) === modifierGroupId);
    if (groupToAdd) {
      setOrderedModifiers(current => [...current, { modifierGroupId, modifierGroup: { name: groupToAdd.label } }]);
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

  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.sku.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <>
      <AddProductForm onProductAdded={onDataChanged} categories={categories} modifierGroups={modifierGroups} />

      <Paper shadow="xs" p="md" withBorder mt="xl">
        <Title order={2} mb="md">Product List</Title>
        <Box mb="md"><TextInput placeholder="Search by name or SKU..." leftSection={<IconSearch size={14} />} value={searchQuery} onChange={(e) => setSearchQuery(e.currentTarget.value)}/></Box>
        <Table striped highlightOnHover withTableBorder withColumnBorders>
          <Table.Thead><Table.Tr><Table.Th>ID</Table.Th><Table.Th>Name</Table.Th><Table.Th>SKU</Table.Th><Table.Th>Category</Table.Th><Table.Th>Price</Table.Th><Table.Th>Actions</Table.Th></Table.Tr></Table.Thead>
          <Table.Tbody>{products.length === 0 ? <Table.Tr><Table.Td colSpan={6}><Text align="center">No products found.</Text></Table.Td></Table.Tr> : filteredProducts.map((p) => (<Table.Tr key={p.id}><Table.Td>{p.id}</Table.Td><Table.Td>{p.name}</Table.Td><Table.Td>{p.sku}</Table.Td><Table.Td>{p.category?.name || 'N/A'}</Table.Td><Table.Td>${Number(p.price).toFixed(2)}</Table.Td><Table.Td><Group gap="xs"><ActionIcon variant="outline" onClick={() => handleEditClick(p)}><IconEdit size={16} /></ActionIcon><ActionIcon title="Archive Product" color="red" variant="outline" onClick={() => handleArchive(p.id)}><IconArchive size={16} /></ActionIcon></Group></Table.Td></Table.Tr>))}</Table.Tbody>
        </Table>
      </Paper>

      <Modal opened={opened} onClose={close} title="Edit Product" size="lg">
        {selectedProduct && (
          <form onSubmit={handleUpdateProduct}>
            <TextInput label="Product Name" required value={selectedProduct.name} onChange={(e) => setSelectedProduct({ ...selectedProduct, name: e.currentTarget.value })}/>
            <TextInput mt="md" label="SKU" required value={selectedProduct.sku} onChange={(e) => setSelectedProduct({ ...selectedProduct, sku: e.currentTarget.value })}/>
            <NumberInput mt="md" label="Price" required precision={2} min={0} value={Number(selectedProduct.price)} onChange={(v) => setSelectedProduct({ ...selectedProduct, price: v || 0 })}/>
            <Select mt="md" label="Category" required data={categories} value={selectedProduct.categoryId} onChange={(v) => setSelectedProduct({ ...selectedProduct, categoryId: v })} />

            <Box mt="md">
                <Text fw={500}>Product Image</Text>
                {selectedProduct.image && <Image src={selectedProduct.image} alt="Product image" w={100} h={100} radius="sm" mt="xs" />}
                <Button leftSection={<IconUpload size={14} />} onClick={handleImageUpload} mt="xs" variant="outline">
                    Change Image
                </Button>
            </Box>

            <Box mt="md">
              <Text fw={500}>Modifier Groups</Text>
              <Select
                label="Add a modifier group"
                placeholder="Search and select a group to add..."
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

            <Group justify="flex-end" mt="xl"><Button variant="default" onClick={close}>Cancel</Button><Button type="submit">Save Changes</Button></Group>
          </form>
        )}
      </Modal>
    </>
  )
}