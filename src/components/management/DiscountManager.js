// src/components/management/DiscountManager.js
"use client";

import { useState } from 'react';
import {
  Title, Table, Button, Paper, Group, ActionIcon, Modal,
  TextInput, Select, NumberInput, Text, Switch
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconEdit, IconTrash, IconPlus } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';

const initialDiscountState = {
  name: '',
  type: 'PERCENT',
  value: 0,
  isActive: true,
};

export default function DiscountManager({ discounts, onDataChanged }) {
  const [opened, { open, close }] = useDisclosure(false);
  const [editingDiscount, setEditingDiscount] = useState(initialDiscountState);

  const handleOpenModal = (discount = null) => {
    setEditingDiscount(discount ? { ...discount } : initialDiscountState);
    open();
  };

  const handleCloseModal = () => {
    setEditingDiscount(initialDiscountState);
    close();
  };

  const handleSaveDiscount = async () => {
    if (!editingDiscount.name || !editingDiscount.value) {
      notifications.show({ title: 'Error', message: 'Name and Value are required.', color: 'red' });
      return;
    }

    try {
      const dataToSave = {
        name: editingDiscount.name,
        type: editingDiscount.type,
        value: parseFloat(editingDiscount.value) || 0,
        isActive: editingDiscount.isActive,
      };

      if (editingDiscount.id) {
        await window.api.updateDiscount({ id: editingDiscount.id, data: dataToSave });
        notifications.show({ title: 'Success', message: 'Discount updated successfully.', color: 'green' });
      } else {
        await window.api.addDiscount(dataToSave);
        notifications.show({ title: 'Success', message: 'Discount added successfully.', color: 'green' });
      }
      onDataChanged();
      handleCloseModal();
    } catch (error) {
      console.error("Failed to save discount:", error);
      notifications.show({ title: 'Error', message: `Failed to save discount: ${error.message}`, color: 'red' });
    }
  };

  const handleDeactivate = async (id) => {
    if (window.confirm('Are you sure you want to deactivate this discount? It will no longer be available in the POS.')) {
      try {
        await window.api.deactivateDiscount(id);
        notifications.show({ title: 'Success', message: 'Discount deactivated.', color: 'orange' });
        onDataChanged();
      } catch (error) {
        console.error("Failed to deactivate discount:", error);
        notifications.show({ title: 'Error', message: `Failed to deactivate discount: ${error.message}`, color: 'red' });
      }
    }
  };

  const modalTitle = editingDiscount.id ? 'Edit Discount' : 'Add New Discount';

  return (
    <>
      <Modal opened={opened} onClose={handleCloseModal} title={modalTitle}>
        <TextInput
          label="Discount Name"
          placeholder="e.g., Employee Discount, Happy Hour"
          required
          value={editingDiscount.name}
          onChange={(e) => setEditingDiscount({ ...editingDiscount, name: e.currentTarget.value })}
        />
        <Select
          mt="md"
          label="Discount Type"
          required
          data={[{ value: 'PERCENT', label: 'Percentage (%)' }, { value: 'FIXED', label: 'Fixed Amount ($)' }]}
          value={editingDiscount.type}
          onChange={(value) => setEditingDiscount({ ...editingDiscount, type: value })}
        />
        <NumberInput
          mt="md"
          label="Value"
          description={editingDiscount.type === 'PERCENT' ? 'Enter a number like 15 for 15%' : 'Enter a dollar amount like 5.00'}
          precision={2}
          min={0}
          required
          value={editingDiscount.value || 0}
          onChange={(value) => setEditingDiscount({ ...editingDiscount, value })}
        />
        <Switch
          mt="lg"
          label="Discount is active"
          checked={editingDiscount.isActive}
          onChange={(event) => setEditingDiscount({ ...editingDiscount, isActive: event.currentTarget.checked })}
        />
        <Group justify="flex-end" mt="xl">
          <Button variant="default" onClick={handleCloseModal}>Cancel</Button>
          <Button onClick={handleSaveDiscount}>Save Discount</Button>
        </Group>
      </Modal>

      <Paper shadow="xs" p="md" withBorder>
        <Group justify="space-between" mb="md">
          <Title order={3}>Manage Discounts</Title>
          <Button onClick={() => handleOpenModal()} leftSection={<IconPlus size={16} />}>
            Add Discount
          </Button>
        </Group>

        <Table striped highlightOnHover withTableBorder>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Name</Table.Th>
              <Table.Th>Type</Table.Th>
              <Table.Th>Value</Table.Th>
              <Table.Th>Status</Table.Th>
              <Table.Th>Actions</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {discounts.length > 0 ? (
              discounts.map((discount) => (
                <Table.Tr key={discount.id}>
                  <Table.Td>{discount.name}</Table.Td>
                  <Table.Td>{discount.type}</Table.Td>
                  <Table.Td>{discount.type === 'PERCENT' ? `${discount.value}%` : `$${discount.value.toFixed(2)}`}</Table.Td>
                  <Table.Td>
                    <Text c={discount.isActive ? 'green' : 'red'}>{discount.isActive ? 'Active' : 'Inactive'}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Group gap="xs">
                      <ActionIcon variant="outline" onClick={() => handleOpenModal(discount)}>
                        <IconEdit size={16} />
                      </ActionIcon>
                      {discount.isActive && (
                        <ActionIcon color="red" variant="outline" onClick={() => handleDeactivate(discount.id)} title="Deactivate">
                          <IconTrash size={16} />
                        </ActionIcon>
                      )}
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))
            ) : (
              <Table.Tr>
                <Table.Td colSpan={5}>
                  <Text ta="center">No discounts have been created yet.</Text>
                </Table.Td>
              </Table.Tr>
            )}
          </Table.Tbody>
        </Table>
      </Paper>
    </>
  );
}