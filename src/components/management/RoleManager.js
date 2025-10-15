// src/components/management/RoleManager.js
"use client";

import { useState, useEffect } from 'react';
import {
  Title, Paper, Group, ActionIcon, Modal, TextInput,
  Text, Button, Accordion, Checkbox, SimpleGrid
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconEdit, IconTrash, IconPlus } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';

const initialRoleState = { name: '', permissionIds: [] };

export default function RoleManager({ roles, onDataChanged }) {
  const [allPermissions, setAllPermissions] = useState([]);
  const [opened, { open, close }] = useDisclosure(false);
  const [editingRole, setEditingRole] = useState(null);
  const [selectedPermissions, setSelectedPermissions] = useState(new Set());

  useEffect(() => {
    const fetchPermissions = async () => {
      try {
        const perms = await window.api.getPermissions();
        setAllPermissions(perms);
      } catch (error) {
        console.error("Failed to fetch permissions:", error);
      }
    };
    fetchPermissions();
  }, []);

  const handleOpenModal = (role = null) => {
    if (role) {
      setEditingRole(role);
      setSelectedPermissions(new Set(role.permissions.map(p => p.id)));
    } else {
      setEditingRole(initialRoleState);
      setSelectedPermissions(new Set());
    }
    open();
  };

  const handleCloseModal = () => {
    setEditingRole(null);
    setSelectedPermissions(new Set());
    close();
  };
  
  const handlePermissionToggle = (permissionId) => {
    const newSelection = new Set(selectedPermissions);
    if (newSelection.has(permissionId)) {
      newSelection.delete(permissionId);
    } else {
      newSelection.add(permissionId);
    }
    setSelectedPermissions(newSelection);
  };

  const handleSaveRole = async () => {
    if (!editingRole?.name) {
      notifications.show({ title: 'Error', message: 'Role name is required.', color: 'red' });
      return;
    }

    const data = {
      name: editingRole.name,
      permissionIds: Array.from(selectedPermissions),
    };

    try {
      if (editingRole.id) {
        await window.api.updateRole({ id: editingRole.id, ...data });
        notifications.show({ title: 'Success', message: 'Role updated successfully.', color: 'green' });
      } else {
        await window.api.createRole(data);
        notifications.show({ title: 'Success', message: 'Role created successfully.', color: 'green' });
      }
      onDataChanged();
      handleCloseModal();
    } catch (error) {
      notifications.show({ title: 'Error', message: `Failed to save role: ${error.message}`, color: 'red' });
    }
  };

  const handleDeleteRole = async (role) => {
    if (role.name === 'Admin') {
      notifications.show({ title: 'Error', message: 'The Admin role cannot be deleted.', color: 'red' });
      return;
    }
    if (window.confirm(`Are you sure you want to delete the "${role.name}" role?`)) {
      try {
        await window.api.deleteRole(role.id);
        notifications.show({ title: 'Success', message: 'Role deleted.', color: 'orange' });
        onDataChanged();
      } catch (error) {
        notifications.show({ title: 'Error', message: `Failed to delete role: ${error.message}`, color: 'red' });
      }
    }
  };
  
  const modalTitle = editingRole?.id ? `Edit Role: ${editingRole.name}` : 'Add New Role';

  return (
    <>
      <Modal opened={opened} onClose={handleCloseModal} title={modalTitle} size="lg">
        <TextInput
          label="Role Name"
          required
          value={editingRole?.name || ''}
          onChange={(e) => setEditingRole({ ...editingRole, name: e.currentTarget.value })}
        />
        <Title order={5} mt="lg" mb="sm">Permissions</Title>
        <Paper withBorder p="md" style={{ maxHeight: '40vh', overflowY: 'auto' }}>
          <SimpleGrid cols={2}>
            {allPermissions.map(permission => (
              <Checkbox
                key={permission.id}
                label={permission.name}
                checked={selectedPermissions.has(permission.id)}
                onChange={() => handlePermissionToggle(permission.id)}
              />
            ))}
          </SimpleGrid>
        </Paper>
        <Group justify="flex-end" mt="xl">
          <Button variant="default" onClick={handleCloseModal}>Cancel</Button>
          <Button onClick={handleSaveRole}>Save Role</Button>
        </Group>
      </Modal>

      <Paper shadow="xs" p="md" withBorder>
        <Group justify="space-between" mb="md">
          <Title order={3}>Manage Roles</Title>
          <Button onClick={() => handleOpenModal()} leftSection={<IconPlus size={16} />}>
            Add Role
          </Button>
        </Group>
        <Accordion variant="separated">
          {roles.map(role => (
            <Accordion.Item key={role.id} value={role.name}>
               <Group wrap="nowrap" justify="space-between" align="center">
                <Accordion.Control style={{ flex: 1 }}>
                  <Text fw={500}>{role.name}</Text>
                </Accordion.Control>
                <Group gap="xs" wrap="nowrap" pr="xs">
                  {/* --- THIS IS THE FIX --- */}
                  <ActionIcon 
                    variant="outline" 
                    onClick={() => handleOpenModal(role)} 
                    disabled={role.name === 'Admin'}
                    title={role.name === 'Admin' ? 'The Admin role cannot be edited.' : 'Edit role'}
                  >
                    <IconEdit size={16} />
                  </ActionIcon>
                  <ActionIcon 
                    color="red" 
                    variant="outline" 
                    onClick={() => handleDeleteRole(role)} 
                    disabled={role.name === 'Admin'}
                    title={role.name === 'Admin' ? 'The Admin role cannot be deleted.' : 'Delete role'}
                  >
                    <IconTrash size={16} />
                  </ActionIcon>
                  {/* --- END OF FIX --- */}
                </Group>
              </Group>
              <Accordion.Panel>
                <Text size="sm" c="dimmed" mb="xs">Permissions assigned to this role:</Text>
                <SimpleGrid cols={{ base: 2, sm: 3, md: 4 }}>
                  {allPermissions.map(p => (
                    <Text size="sm" key={p.id} c={role.permissions.some(rp => rp.id === p.id) ? 'inherit' : 'dimmed'}>
                      {role.permissions.some(rp => rp.id === p.id) ? '✓' : '✗'} {p.name}
                    </Text>
                  ))}
                </SimpleGrid>
              </Accordion.Panel>
            </Accordion.Item>
          ))}
        </Accordion>
      </Paper>
    </>
  );
}