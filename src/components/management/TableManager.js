// src/components/management/TableManager.js
"use client";
import { useState } from 'react';
import { Title, Box, TextInput, Table, Button, Paper, Group, ActionIcon, Modal } from '@mantine/core';
import { IconEdit, IconTrash, IconPlus } from '@tabler/icons-react';
import { useDisclosure } from '@mantine/hooks';

export default function TableManager({ tables, onDataChanged }) {
  const [newTableName, setNewTableName] = useState('');
  const [editingTable, setEditingTable] = useState(null);
  const [opened, { open, close }] = useDisclosure(false);

  const handleAddTable = async (e) => {
    e.preventDefault();
    if (!newTableName) return;
    try {
      await window.api.addTable(newTableName);
      setNewTableName('');
      onDataChanged(); 
    } catch (error) { console.error("Error adding table:", error); alert(`Error: ${error.message}`); }
  };

  const handleUpdateTable = async () => {
    if (!editingTable) return;
    try {
      await window.api.updateTable(editingTable);
      setEditingTable(null);
      close();
      onDataChanged();
    } catch (error) { console.error("Error updating table:", error); alert(`Error: ${error.message}`); }
  };

  const handleDeleteTable = async (id) => {
    if (window.confirm('Are you sure you want to delete this table? Open orders on this table will prevent deletion.')) {
      try {
        await window.api.deleteTable(id);
        onDataChanged();
      } catch (error) { console.error("Error deleting table:", error); alert(`Error: ${error.message}`); }
    }
  };
  
  const openEditModal = (table) => {
    setEditingTable({ ...table });
    open();
  };

  return (
    <Paper shadow="xs" p="md" withBorder>
      <Modal opened={opened} onClose={close} title="Edit Table">
        {editingTable && (
          <Box>
            <TextInput label="Table Name" required value={editingTable.name} onChange={(e) => setEditingTable({ ...editingTable, name: e.currentTarget.value })} />
            <Group justify="flex-end" mt="xl">
              <Button variant="default" onClick={close}>Cancel</Button>
              <Button onClick={handleUpdateTable}>Save Changes</Button>
            </Group>
          </Box>
        )}
      </Modal>
      <Title order={3} mb="md">Add New Table</Title>
      <form onSubmit={handleAddTable}>
        <Group>
          <TextInput placeholder="e.g., Table 5, Patio 2" style={{ flex: 1 }} value={newTableName} onChange={(e) => setNewTableName(e.currentTarget.value)} required />
          <Button type="submit" leftSection={<IconPlus size={16} />}>Add Table</Button>
        </Group>
      </form>
      <Title order={3} mt="xl" mb="md">Existing Tables</Title>
      <Table striped highlightOnHover withTableBorder>
        <Table.Thead><Table.Tr><Table.Th>ID</Table.Th><Table.Th>Name</Table.Th><Table.Th>Actions</Table.Th></Table.Tr></Table.Thead>
        <Table.Tbody>
          {tables.map(table => (
            <Table.Tr key={table.id}><Table.Td>{table.id}</Table.Td><Table.Td>{table.name}</Table.Td><Table.Td><Group gap="xs"><ActionIcon variant="outline" onClick={() => openEditModal(table)}><IconEdit size={16} /></ActionIcon><ActionIcon color="red" variant="outline" onClick={() => handleDeleteTable(table.id)}><IconTrash size={16} /></ActionIcon></Group></Table.Td></Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Paper>
  );
}