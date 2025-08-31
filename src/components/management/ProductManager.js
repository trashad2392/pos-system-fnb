// src/components/management/ProductManager.js
"use client";
import { useState } from 'react';
import { Title, Box, TextInput, Table, Button, Paper, Group, ActionIcon, Modal, NumberInput, Text, Select, MultiSelect } from '@mantine/core';
import { IconSearch, IconEdit, IconArchive, IconTrash } from '@tabler/icons-react';
import { useDisclosure } from '@mantine/hooks';
import AddProductForm from '@/components/AddProductForm';

export default function ProductManager({ products, categories, modifierGroups, onDataChanged }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [opened, { open, close }] = useDisclosure(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  const handleEditClick = (product) => {
    setSelectedProduct({
      ...product,
      categoryId: product.categoryId.toString(),
      modifierGroupIds: product.modifierGroups.map(mg => mg.id.toString())
    });
    open();
  };

  const handleUpdateProduct = async (event) => {
    event.preventDefault(); if (!selectedProduct) return;
    try {
      const { id, name, sku, price, categoryId, modifierGroupIds } = selectedProduct;
      const dataToUpdate = {
        name, sku, price,
        categoryId: parseInt(categoryId, 10),
        modifierGroupIds: modifierGroupIds.map(id => parseInt(id, 10))
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
            <MultiSelect
              mt="md"
              label="Apply Modifier Groups"
              placeholder="Select customizations for this product"
              data={modifierGroups}
              value={selectedProduct.modifierGroupIds}
              onChange={(v) => setSelectedProduct({ ...selectedProduct, modifierGroupIds: v })}
              clearable
              searchable
            />
            <Group justify="flex-end" mt="xl"><Button variant="default" onClick={close}>Cancel</Button><Button type="submit">Save Changes</Button></Group>
          </form>
        )}
      </Modal>
    </>
  )
}