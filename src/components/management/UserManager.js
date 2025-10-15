// src/components/management/UserManager.js
"use client";

import { useState } from 'react';
import {
  Title,
  Table,
  Button,
  Paper,
  Group,
  ActionIcon,
  Modal,
  TextInput,
  Select,
  NumberInput,
  Text,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconEdit, IconTrash, IconPlus } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';

const initialUserState = {
  name: '',
  pin: '',
  roleId: null,
  hourlyRate: 0,
};

export default function UserManager({ users, roles, onDataChanged }) {
  const [opened, { open, close }] = useDisclosure(false);
  const [editingUser, setEditingUser] = useState(initialUserState);

  const roleOptions = roles.map(role => ({
    value: role.id.toString(),
    label: role.name,
  }));

  const handleOpenModal = (user = null) => {
    if (user) {
      setEditingUser({ ...user, roleId: user.roleId.toString() });
    } else {
      const defaultRole = roles.find(r => r.name === 'Cashier');
      setEditingUser({ ...initialUserState, roleId: defaultRole ? defaultRole.id.toString() : null });
    }
    open();
  };

  const handleCloseModal = () => {
    setEditingUser(initialUserState);
    close();
  };

  const handleSaveUser = async () => {
    if (!editingUser.name || !editingUser.pin || !editingUser.roleId) {
      notifications.show({ title: 'Error', message: 'Name, PIN, and Role are required.', color: 'red' });
      return;
    }

    try {
      const dataToSave = {
        name: editingUser.name,
        pin: editingUser.pin,
        roleId: parseInt(editingUser.roleId, 10),
        hourlyRate: parseFloat(editingUser.hourlyRate) || 0,
      };

      if (editingUser.id) {
        await window.api.updateUser({ id: editingUser.id, data: dataToSave });
        notifications.show({ title: 'Success', message: 'User updated successfully.', color: 'green' });
      } else {
        await window.api.addUser(dataToSave);
        notifications.show({ title: 'Success', message: 'User added successfully.', color: 'green' });
      }
      onDataChanged();
      handleCloseModal();
    } catch (error) {
      console.error("Failed to save user:", error);
      notifications.show({ title: 'Error', message: `Failed to save user: ${error.message}`, color: 'red' });
    }
  };

  const handleDeleteUser = async (id) => {
    if (window.confirm('Are you sure you want to archive this user?')) {
      try {
        await window.api.deleteUser(id);
        notifications.show({ title: 'Success', message: 'User archived successfully.', color: 'orange' });
        onDataChanged();
      } catch (error) {
        console.error("Failed to archive user:", error);
        notifications.show({ title: 'Error', message: `Failed to archive user: ${error.message}`, color: 'red' });
      }
    }
  };

  const modalTitle = editingUser.id ? 'Edit Staff Member' : 'Add New Staff Member';

  return (
    <>
      <Modal opened={opened} onClose={handleCloseModal} title={modalTitle}>
        <TextInput
          label="Name"
          placeholder="Enter staff member's name"
          required
          value={editingUser.name}
          onChange={(e) => setEditingUser({ ...editingUser, name: e.currentTarget.value })}
        />
        <TextInput
          mt="md"
          label="PIN (4-8 digits)"
          placeholder="Enter a unique PIN"
          required
          type="password"
          value={editingUser.pin}
          onChange={(e) => setEditingUser({ ...editingUser, pin: e.currentTarget.value.replace(/[^0-9]/g, '').slice(0, 8) })}
        />
        <Select
          mt="md"
          label="Role"
          required
          data={roleOptions}
          value={editingUser.roleId}
          onChange={(value) => setEditingUser({ ...editingUser, roleId: value })}
        />
        <NumberInput
          mt="md"
          label="Hourly Rate ($)"
          precision={2}
          step={0.5}
          min={0}
          value={editingUser.hourlyRate || 0}
          onChange={(value) => setEditingUser({ ...editingUser, hourlyRate: value })}
        />
        <Group justify="flex-end" mt="xl">
          <Button variant="default" onClick={handleCloseModal}>Cancel</Button>
          <Button onClick={handleSaveUser}>Save</Button>
        </Group>
      </Modal>

      <Paper shadow="xs" p="md" withBorder>
        <Group justify="space-between" mb="md">
          <Title order={3}>Manage Staff</Title>
          <Button onClick={() => handleOpenModal()} leftSection={<IconPlus size={16} />}>
            Add Staff
          </Button>
        </Group>

        <Table striped highlightOnHover withTableBorder withColumnBorders>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Name</Table.Th>
              <Table.Th>Role</Table.Th>
              <Table.Th>Hourly Rate</Table.Th>
              <Table.Th>Actions</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {users.length > 0 ? (
              users.map((user) => (
                <Table.Tr key={user.id}>
                  <Table.Td>{user.name}</Table.Td>
                  {/* --- THIS IS THE FIX --- */}
                  <Table.Td>{user.role?.name || 'N/A'}</Table.Td>
                  <Table.Td>${(user.hourlyRate || 0).toFixed(2)}</Table.Td>
                  <Table.Td>
                    <Group gap="xs">
                      <ActionIcon variant="outline" onClick={() => handleOpenModal(user)}>
                        <IconEdit size={16} />
                      </ActionIcon>
                      <ActionIcon color="red" variant="outline" onClick={() => handleDeleteUser(user.id)}>
                        <IconTrash size={16} />
                      </ActionIcon>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))
            ) : (
              <Table.Tr>
                <Table.Td colSpan={4}>
                  <Text ta="center">No staff members found.</Text>
                </Table.Td>
              </Table.Tr>
            )}
          </Table.Tbody>
        </Table>
      </Paper>
    </>
  );
}