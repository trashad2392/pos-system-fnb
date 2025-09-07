// src/components/management/ModifierManager.js
"use client";
import { useState, useEffect } from 'react';
import { Title, Box, TextInput, Table, Button, Paper, Group, ActionIcon, Modal, NumberInput, Text, Accordion } from '@mantine/core';
import { IconEdit, IconTrash, IconPlus } from '@tabler/icons-react';
import { useDisclosure } from '@mantine/hooks';

export default function ModifierManager({ modifierGroups, onDataChanged }) {
  const [editingGroup, setEditingGroup] = useState(null);
  const [editingOption, setEditingOption] = useState(null);
  const [groupModalOpened, { open: openGroupModal, close: closeGroupModal }] = useDisclosure(false);
  const [optionModalOpened, { open: openOptionModal, close: closeOptionModal }] = useDisclosure(false);

  const handleGroupSave = async () => {
    // UPDATED: Check minSelection against selectionBudget
    if (Number(editingGroup.minSelection) > Number(editingGroup.selectionBudget)) {
      alert('Error: Minimum selections cannot be greater than the selection budget.');
      return;
    }
    // UPDATED: Include selectionBudget in the data payload
    const data = { 
      name: editingGroup.name, 
      minSelection: Number(editingGroup.minSelection), 
      selectionBudget: Number(editingGroup.selectionBudget) 
    };
    try {
      if (editingGroup.id) { await window.api.updateModifierGroup(editingGroup.id, data); } 
      else { await window.api.addModifierGroup(data); }
      onDataChanged();
      closeGroupModal();
    } catch (error) { alert(`Error saving group: ${error.message}`); }
  };

  const handleGroupDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this group?')) {
      try { await window.api.deleteModifierGroup(id); onDataChanged(); } 
      catch (error) { alert(`Error deleting group: ${error.message}`); }
    }
  };

  const handleOptionSave = async () => {
    // UPDATED: Include selectionCost in the data payload
    const data = { 
      name: editingOption.name, 
      priceAdjustment: Number(editingOption.priceAdjustment), 
      selectionCost: Number(editingOption.selectionCost),
      modifierGroupId: editingOption.modifierGroupId 
    };
    try {
      if (editingOption.id) { await window.api.updateModifierOption(editingOption.id, data); } 
      else { await window.api.addModifierOption(data); }
      onDataChanged();
      closeOptionModal();
    } catch (error) { alert(`Error saving option: ${error.message}`); }
  };
  
  const handleOptionDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this option?')) {
      try { await window.api.deleteModifierOption(id); onDataChanged(); } 
      catch (error) { alert(`Error deleting option: ${error.message}`); }
    }
  };

  return (
    <Paper shadow="xs" p="md" withBorder>
      <Group justify="space-between" mb="md">
        <Title order={3}>Modifier Groups</Title>
        {/* UPDATED: Default selectionBudget */}
        <Button onClick={() => { setEditingGroup({ name: '', minSelection: 1, selectionBudget: 1 }); openGroupModal(); }} leftSection={<IconPlus size={16} />}>New Group</Button>
      </Group>
      <Accordion variant="separated">
        {modifierGroups.map(group => (
          <Accordion.Item key={group.id} value={group.name + group.id}>
            <Group wrap="nowrap" justify="space-between" align="center">
              <Accordion.Control style={{ flex: 1 }}><Text fw={500}>{group.name}</Text></Accordion.Control>
              <Group gap="xs" wrap="nowrap">
                <ActionIcon variant="outline" onClick={() => { setEditingGroup(group); openGroupModal(); }}><IconEdit size={16} /></ActionIcon>
                <ActionIcon color="red" variant="outline" onClick={() => handleGroupDelete(group.id)}><IconTrash size={16} /></ActionIcon>
              </Group>
            </Group>
            <Accordion.Panel>
              {/* UPDATED: Default selectionCost */}
              <Button size="xs" variant="light" mb="sm" onClick={() => { setEditingOption({ name: '', priceAdjustment: 0, selectionCost: 1, modifierGroupId: group.id }); openOptionModal(); }}>Add Option</Button>
              <Table striped withTableBorder fontSize="sm">
                <Table.Thead><Table.Tr>
                  <Table.Th>Option Name</Table.Th>
                  <Table.Th>Price Adj.</Table.Th>
                  {/* ADDED: New column header */}
                  <Table.Th>Selection Points</Table.Th>
                  <Table.Th>Actions</Table.Th>
                </Table.Tr></Table.Thead>
                <Table.Tbody>
                  {group.options.map(option => (
                    <Table.Tr key={option.id}>
                      <Table.Td>{option.name}</Table.Td>
                      <Table.Td>${Number(option.priceAdjustment).toFixed(2)}</Table.Td>
                      {/* ADDED: New column data */}
                      <Table.Td>{option.selectionCost}</Table.Td>
                      <Table.Td><Group gap="xs"><ActionIcon variant="subtle" onClick={() => { setEditingOption(option); openOptionModal(); }}><IconEdit size={14} /></ActionIcon><ActionIcon color="red" variant="subtle" onClick={() => handleOptionDelete(option.id)}><IconTrash size={14} /></ActionIcon></Group></Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Accordion.Panel>
          </Accordion.Item>
        ))}
      </Accordion>
      <Modal opened={groupModalOpened} onClose={closeGroupModal} title={editingGroup?.id ? 'Edit Group' : 'Add New Group'}>
        <Box>
          <TextInput label="Group Name" placeholder="e.g., Pizza Toppings" required value={editingGroup?.name || ''} onChange={(e) => setEditingGroup({...editingGroup, name: e.target.value})} />
          <NumberInput mt="md" label="Minimum Selections" required value={editingGroup?.minSelection === undefined ? 0 : editingGroup.minSelection} onChange={(val) => setEditingGroup({...editingGroup, minSelection: val || 0})} min={0} max={editingGroup?.selectionBudget} />
          {/* UPDATED: Changed from maxSelection to selectionBudget */}
          <NumberInput mt="md" label="Selection Budget (Points)" required value={editingGroup?.selectionBudget === undefined ? 1 : editingGroup.selectionBudget} onChange={(val) => setEditingGroup({...editingGroup, selectionBudget: val || 1})} min={editingGroup?.minSelection} />
          <Group justify="flex-end" mt="xl"><Button variant="default" onClick={closeGroupModal}>Cancel</Button><Button onClick={handleGroupSave}>Save Group</Button></Group>
        </Box>
      </Modal>
      <Modal opened={optionModalOpened} onClose={closeOptionModal} title={editingOption?.id ? 'Edit Option' : 'Add New Option'}>
        <Box>
          <TextInput label="Option Name" placeholder="e.g., Extra Cheese" required value={editingOption?.name || ''} onChange={(e) => setEditingOption({...editingOption, name: e.target.value})} />
          <NumberInput mt="md" label="Price Adjustment" defaultValue={0} precision={2} step={0.50} value={editingOption?.priceAdjustment || 0} onChange={(val) => setEditingOption({...editingOption, priceAdjustment: val || 0})} />
          {/* ADDED: New input for selectionCost */}
          <NumberInput mt="md" label="Selection Cost (Points)" defaultValue={1} min={0} step={1} value={editingOption?.selectionCost || 1} onChange={(val) => setEditingOption({...editingOption, selectionCost: val === undefined ? 1 : val})} />
          <Group justify="flex-end" mt="xl"><Button variant="default" onClick={closeOptionModal}>Cancel</Button><Button onClick={handleOptionSave}>Save Option</Button></Group>
        </Box>
      </Modal>
    </Paper>
  );
}