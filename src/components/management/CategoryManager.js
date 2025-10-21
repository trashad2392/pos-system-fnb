// src/components/management/CategoryManager.js
"use client";
import { useState, useEffect } from 'react';
import {
  Title, Box, TextInput, Table, Button, Paper, Group, ActionIcon, Modal, Select, Text
} from '@mantine/core';
import { IconEdit, IconTrash, IconPlus } from '@tabler/icons-react';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';

export default function CategoryManager({ categories = [], menus = [], onDataChanged }) {
  const [newCategoryName, setNewCategoryName] = useState('');
  const [selectedMenuId, setSelectedMenuId] = useState(null);
  const [editingCategory, setEditingCategory] = useState(null);
  const [opened, { open, close }] = useDisclosure(false);

  const menuOptions = menus.map(menu => ({
    value: menu.id.toString(),
    label: menu.name,
  }));

  useEffect(() => {
    if (!selectedMenuId && menuOptions.length > 0) {
      setSelectedMenuId(menuOptions[0].value);
    }
  }, [menuOptions, selectedMenuId]);


  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!newCategoryName.trim()) {
        notifications.show({ title: 'Error', message: 'Category name cannot be empty.', color: 'red' });
        return;
    }
    if (!selectedMenuId) {
        notifications.show({ title: 'Error', message: 'Please select a menu.', color: 'red' });
        return;
    }
    try {
      await window.api.addCategory({ name: newCategoryName.trim(), menuId: selectedMenuId });
      setNewCategoryName('');
      notifications.show({ title: 'Success', message: 'Category added successfully.', color: 'green' });
      onDataChanged();
    } catch (error) {
      console.error("Error adding category:", error);
      notifications.show({ title: 'Error', message: `Failed to add category: ${error.message}`, color: 'red' });
    }
  };

  const handleUpdateCategory = async () => {
    if (!editingCategory || !editingCategory.name || !editingCategory.name.trim()) {
       notifications.show({ title: 'Error', message: 'Category name cannot be empty.', color: 'red' });
      return;
    }
    try {
      await window.api.updateCategory({ id: editingCategory.id, name: editingCategory.name.trim() });
       notifications.show({ title: 'Success', message: 'Category updated successfully.', color: 'green' });
      setEditingCategory(null);
      close();
      onDataChanged();
    } catch (error) {
      console.error("Error updating category:", error);
      notifications.show({ title: 'Error', message: `Failed to update category: ${error.message}`, color: 'red' });
    }
  };

  const handleDeleteCategory = async (id) => {
    if (window.confirm('Are you sure you want to delete this category? This cannot be undone and is only possible if the category has no products.')) {
      try {
        await window.api.deleteCategory(id);
        notifications.show({ title: 'Success', message: 'Category deleted successfully.', color: 'orange' });
        onDataChanged();
      } catch (error) {
        console.error("Error deleting category:", error);
        notifications.show({ title: 'Error', message: `Failed to delete category: ${error.message}`, color: 'red' });
      }
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
            <TextInput label="Menu" value={editingCategory.menu?.name || 'N/A'} readOnly mt="md" />
            <Group justify="flex-end" mt="xl">
              <Button variant="default" onClick={close}>Cancel</Button>
              <Button onClick={handleUpdateCategory}>Save Changes</Button>
            </Group>
          </Box>
        )}
      </Modal>

      <Title order={3} mb="md">Add New Category</Title>
      <form onSubmit={handleAddCategory}>
        <Group grow align="flex-end">
          <Select
            label="Select Menu"
            placeholder="Choose a menu"
            data={menuOptions}
            value={selectedMenuId}
            onChange={setSelectedMenuId}
            required
            searchable
            nothingFoundMessage="No menus found"
          />
          <TextInput
            label="New Category Name"
            placeholder="e.g., Appetizers, Desserts"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.currentTarget.value)}
            required
            style={{ flex: 2 }}
          />
          <Button type="submit" leftSection={<IconPlus size={16} />}>Add Category</Button>
        </Group>
      </form>

      <Title order={3} mt="xl" mb="md">Existing Categories</Title>
      <Table striped highlightOnHover withTableBorder>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>ID</Table.Th>
            <Table.Th>Name</Table.Th>
            <Table.Th>Menu</Table.Th>
            <Table.Th>Actions</Table.Th>
          </Table.Tr>
        </Table.Thead>
        {/* --- FIX: Removed extra whitespace around map --- */}
        <Table.Tbody>{
          categories.length > 0 ? categories.map(cat => (
            <Table.Tr key={cat.id}>
              <Table.Td>{cat.id}</Table.Td>
              <Table.Td>{cat.name}</Table.Td>
              <Table.Td>{cat.menu?.name || 'N/A'}</Table.Td>
              <Table.Td>
                <Group gap="xs">
                  <ActionIcon variant="outline" onClick={() => openEditModal(cat)}>
                    <IconEdit size={16} />
                  </ActionIcon>
                  <ActionIcon color="red" variant="outline" onClick={() => handleDeleteCategory(cat.id)}>
                    <IconTrash size={16} />
                  </ActionIcon>
                </Group>
              </Table.Td>
            </Table.Tr>
          )) : (
             <Table.Tr>
                <Table.Td colSpan={4}><Text ta="center">No categories created yet.</Text></Table.Td>
            </Table.Tr>
          )
        }</Table.Tbody>
        {/* --- END FIX --- */}
      </Table>
    </Paper>
  );
}