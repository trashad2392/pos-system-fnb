// src/components/management/MenuManager.js
"use client";
import { useState } from 'react';
import {
  Title, Box, TextInput, Table, Button, Paper, Group, ActionIcon, Modal, Switch, Text
} from '@mantine/core';
import { IconEdit, IconTrash, IconPlus } from '@tabler/icons-react';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';

const initialMenuState = {
  name: '',
  isActive: true,
};

export default function MenuManager({ menus = [], onDataChanged }) {
  const [newMenuName, setNewMenuName] = useState('');
  const [editingMenu, setEditingMenu] = useState(null);
  const [opened, { open, close }] = useDisclosure(false);

  const handleAddMenu = async (e) => {
    e.preventDefault();
    if (!newMenuName.trim()) {
        notifications.show({ title: 'Error', message: 'Menu name cannot be empty.', color: 'red' });
        return;
    }
    try {
      await window.api.addMenu({ name: newMenuName.trim() }); // isActive defaults to true
      setNewMenuName('');
      notifications.show({ title: 'Success', message: 'Menu added successfully.', color: 'green' });
      onDataChanged();
    } catch (error) {
      console.error("Error adding menu:", error);
      notifications.show({ title: 'Error', message: `Failed to add menu: ${error.message}`, color: 'red' });
    }
  };

  const handleUpdateMenu = async () => {
    if (!editingMenu || !editingMenu.name || !editingMenu.name.trim()) {
        notifications.show({ title: 'Error', message: 'Menu name cannot be empty.', color: 'red' });
        return;
    }
    try {
      await window.api.updateMenu({
        id: editingMenu.id,
        data: { name: editingMenu.name.trim(), isActive: editingMenu.isActive },
      });
      notifications.show({ title: 'Success', message: 'Menu updated successfully.', color: 'green' });
      setEditingMenu(null);
      close();
      onDataChanged();
    } catch (error) {
      console.error("Error updating menu:", error);
      notifications.show({ title: 'Error', message: `Failed to update menu: ${error.message}`, color: 'red' });
    }
  };

  const handleDeleteMenu = async (id) => {
    if (window.confirm('Are you sure you want to delete this menu? This cannot be undone and is only possible if the menu has no categories.')) {
      try {
        await window.api.deleteMenu(id);
        notifications.show({ title: 'Success', message: 'Menu deleted successfully.', color: 'orange' });
        onDataChanged();
      } catch (error) {
        console.error("Error deleting menu:", error);
        notifications.show({ title: 'Error', message: `Failed to delete menu: ${error.message}`, color: 'red' });
      }
    }
  };

  const openEditModal = (menu) => {
    setEditingMenu({ ...menu });
    open();
  };

  return (
    <Paper shadow="xs" p="md" withBorder>
      <Modal opened={opened} onClose={close} title={editingMenu ? `Edit Menu: ${editingMenu.name}` : 'Add New Menu'}>
        {editingMenu && (
          <Box>
            <TextInput
              label="Menu Name"
              required
              value={editingMenu.name}
              onChange={(e) => setEditingMenu({ ...editingMenu, name: e.currentTarget.value })}
            />
            <Switch
              mt="md"
              label="Menu is active"
              checked={editingMenu.isActive}
              onChange={(event) => setEditingMenu({ ...editingMenu, isActive: event.currentTarget.checked })}
            />
            <Group justify="flex-end" mt="xl">
              <Button variant="default" onClick={close}>Cancel</Button>
              <Button onClick={handleUpdateMenu}>Save Changes</Button>
            </Group>
          </Box>
        )}
      </Modal>

      <Title order={3} mb="md">Add New Menu</Title>
      <form onSubmit={handleAddMenu}>
        <Group>
          <TextInput
            placeholder="e.g., Dinner Menu, Specials"
            style={{ flex: 1 }}
            value={newMenuName}
            onChange={(e) => setNewMenuName(e.currentTarget.value)}
            required
          />
          <Button type="submit" leftSection={<IconPlus size={16} />}>Add Menu</Button>
        </Group>
      </form>

      <Title order={3} mt="xl" mb="md">Existing Menus</Title>
      <Table striped highlightOnHover withTableBorder>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>ID</Table.Th>
            <Table.Th>Name</Table.Th>
            <Table.Th>Status</Table.Th>
            <Table.Th>Actions</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {menus.length > 0 ? menus.map(menu => (
            <Table.Tr key={menu.id}>
              <Table.Td>{menu.id}</Table.Td>
              <Table.Td>{menu.name}</Table.Td>
              <Table.Td>
                <Text c={menu.isActive ? 'green' : 'red'}>{menu.isActive ? 'Active' : 'Inactive'}</Text>
              </Table.Td>
              <Table.Td>
                <Group gap="xs">
                  <ActionIcon variant="outline" onClick={() => openEditModal(menu)}>
                    <IconEdit size={16} />
                  </ActionIcon>
                  <ActionIcon color="red" variant="outline" onClick={() => handleDeleteMenu(menu.id)}>
                    <IconTrash size={16} />
                  </ActionIcon>
                </Group>
              </Table.Td>
            </Table.Tr>
          )) : (
            <Table.Tr>
                <Table.Td colSpan={4}><Text ta="center">No menus created yet.</Text></Table.Td>
            </Table.Tr>
          )}
        </Table.Tbody>
      </Table>
    </Paper>
  );
}