// src/components/management/CategoryManager.js
"use client";
import { useState } from 'react';
import { Title, Box, TextInput, Table, Button, Paper, Group, ActionIcon, Modal } from '@mantine/core';
import { IconEdit, IconTrash, IconPlus } from '@tabler/icons-react';
import { useDisclosure } from '@mantine/hooks';

export default function CategoryManager({ categories, onDataChanged }) {
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingCategory, setEditingCategory] = useState(null);
  const [opened, { open, close }] = useDisclosure(false);

  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!newCategoryName) return;
    try {
      await window.api.addCategory(newCategoryName);
      setNewCategoryName('');
      onDataChanged(); 
    } catch (error) { console.error("Error adding category:", error); alert(`Error: ${error.message}`); }
  };

  const handleUpdateCategory = async () => {
    if (!editingCategory) return;
    try {
      await window.api.updateCategory(editingCategory);
      setEditingCategory(null);
      close();
      onDataChanged();
    } catch (error) { console.error("Error updating category:", error); alert(`Error: ${error.message}`); }
  };

  const handleDeleteCategory = async (id) => {
    if (window.confirm('Are you sure you want to delete this category? This cannot be undone.')) {
      try {
        await window.api.deleteCategory(id);
        onDataChanged();
      } catch (error) { console.error("Error deleting category:", error); alert(`Error: ${error.message}`); }
    }
  };
  
  const openEditModal = (category) => {
    setEditingCategory({ ...category });
    open();
  };

  return (
    <Paper shadow="xs" p="md" withBorder>
      <Modal opened={opened} onClose={close} title="Edit Category">
        {editingCategory && (
          <Box>
            <TextInput label="Category Name" required value={editingCategory.name} onChange={(e) => setEditingCategory({ ...editingCategory, name: e.currentTarget.value })} />
            <Group justify="flex-end" mt="xl">
              <Button variant="default" onClick={close}>Cancel</Button>
              <Button onClick={handleUpdateCategory}>Save Changes</Button>
            </Group>
          </Box>
        )}
      </Modal>
      <Title order={3} mb="md">Add New Category</Title>
      <form onSubmit={handleAddCategory}>
        <Group>
          <TextInput placeholder="e.g., Appetizers, Desserts" style={{ flex: 1 }} value={newCategoryName} onChange={(e) => setNewCategoryName(e.currentTarget.value)} required />
          <Button type="submit" leftSection={<IconPlus size={16} />}>Add Category</Button>
        </Group>
      </form>
      <Title order={3} mt="xl" mb="md">Existing Categories</Title>
      <Table striped highlightOnHover withTableBorder>
        <Table.Thead><Table.Tr><Table.Th>ID</Table.Th><Table.Th>Name</Table.Th><Table.Th>Actions</Table.Th></Table.Tr></Table.Thead>
        <Table.Tbody>
          {categories.map(cat => (
            <Table.Tr key={cat.id}><Table.Td>{cat.id}</Table.Td><Table.Td>{cat.name}</Table.Td><Table.Td><Group gap="xs"><ActionIcon variant="outline" onClick={() => openEditModal(cat)}><IconEdit size={16} /></ActionIcon><ActionIcon color="red" variant="outline" onClick={() => handleDeleteCategory(cat.id)}><IconTrash size={16} /></ActionIcon></Group></Table.Td></Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Paper>
  );
}