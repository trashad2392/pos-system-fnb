// src/components/management/ModifierManager.js
"use client";
import { useState } from 'react';
import { 
  Title, Box, TextInput, Table, Button, Paper, Group, ActionIcon, Modal, 
  NumberInput, Text, Accordion, SimpleGrid, UnstyledButton, Collapse, Switch 
} from '@mantine/core';
import { IconEdit, IconTrash, IconPlus, IconChevronDown, IconChevronUp } from '@tabler/icons-react';
import { useDisclosure } from '@mantine/hooks';

// modifierTemplates defined directly to ensure ESM compatibility
const modifierTemplates = [
  {
    name: 'Single Choice (Required)',
    description: 'User must pick exactly one item. e.g., Milk for coffee.',
    config: { minSelection: 1, selectionBudget: 1, maxSelections: 1, allowRepeatedSelections: false, exactBudgetRequired: true, maxSelectionsSyncedToOptionCount: false }
  },
  {
    name: 'Optional Add-ons',
    description: 'User can pick any number of items. e.g., Extra sauces.',
    config: { minSelection: 0, selectionBudget: 100, maxSelections: null, allowRepeatedSelections: false, exactBudgetRequired: false, maxSelectionsSyncedToOptionCount: true }
  },
  {
    name: 'Toppings with Repeats',
    description: 'User can add multiple toppings, including repeats like "Double Pepperoni".',
    config: { minSelection: 0, selectionBudget: 100, maxSelections: null, allowRepeatedSelections: true, exactBudgetRequired: false, maxSelectionsSyncedToOptionCount: true }
  },
  {
    name: 'Build-a-Meal (Fixed #)',
    description: 'User must pick a specific number of items. e.g., "1 main + 2 sides".',
    config: { minSelection: 3, selectionBudget: 3, maxSelections: 3, allowRepeatedSelections: false, exactBudgetRequired: true, maxSelectionsSyncedToOptionCount: false }
  },
  {
    name: 'The "1KG Grill" Special',
    description: 'Complex rule where items have different points and an exact budget must be met.',
    config: { minSelection: 3, selectionBudget: 12, maxSelections: 4, allowRepeatedSelections: false, exactBudgetRequired: true, maxSelectionsSyncedToOptionCount: false }
  },
  {
    name: 'Create Your Own',
    description: 'Start with a blank slate and configure all the rules yourself.',
    config: { minSelection: 0, selectionBudget: 1, maxSelections: null, allowRepeatedSelections: false, exactBudgetRequired: false, maxSelectionsSyncedToOptionCount: false }
  }
];

// Helper component for the template selection modal
function ModifierTypeSelectionModal({ opened, onClose, onSelect }) {
  return (
    <Modal opened={opened} onClose={onClose} title="Choose a Modifier Type" size="xl">
      <SimpleGrid cols={2}>
        {modifierTemplates.map(template => (
          <UnstyledButton key={template.name} onClick={() => onSelect(template.config)}>
            <Paper withBorder p="md" style={{ height: '100%' }}>
              <Text fw={500}>{template.name}</Text>
              <Text size="sm" c="dimmed">{template.description}</Text>
            </Paper>
          </UnstyledButton>
        ))}
      </SimpleGrid>
    </Modal>
  );
}

export default function ModifierManager({ modifierGroups, onDataChanged, currencySymbol = '$ ' }) {
  const [editingGroup, setEditingGroup] = useState(null);
  const [editingOption, setEditingOption] = useState(null);
  const [groupModalOpened, { open: openGroupModal, close: closeGroupModal }] = useDisclosure(false);
  const [optionModalOpened, { open: openOptionModal, close: closeOptionModal }] = useDisclosure(false);
  const [templateModalOpened, { open: openTemplateModal, close: closeTemplateModal }] = useDisclosure(false);
  const [advancedOpened, { toggle: toggleAdvanced }] = useDisclosure(false);
  
  const handleNewGroupClick = () => {
    setEditingGroup(null);
    toggleAdvanced(false);
    openTemplateModal();
  };

  const handleTemplateSelect = (config) => {
    closeTemplateModal();
    setEditingGroup({ 
      name: '', 
      ...config, 
      maxSelections: config.maxSelections === null ? '' : config.maxSelections
    });
    openGroupModal();
  };

  const handleEditGroupClick = (group) => {
    setEditingGroup({
      ...group,
      maxSelections: group.maxSelections === null ? '' : group.maxSelections
    });
    openGroupModal();
  };

  const handleGroupSave = async () => {
    const data = { 
      name: editingGroup.name,
      minSelection: Number(editingGroup.minSelection) || 0,
      selectionBudget: Number(editingGroup.selectionBudget) || 0,
      maxSelections: editingGroup.maxSelections === '' || editingGroup.maxSelections === null ? null : Number(editingGroup.maxSelections),
      maxSelectionsSyncedToOptionCount: editingGroup.maxSelectionsSyncedToOptionCount,
      allowRepeatedSelections: editingGroup.allowRepeatedSelections,
      exactBudgetRequired: editingGroup.exactBudgetRequired,
    };

    if (data.maxSelections !== null && data.minSelection > data.maxSelections) {
      alert('Error: Minimum selections cannot be greater than the maximum selections.');
      return;
    }
    
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

  const getModalTitle = () => {
    if (!editingGroup) return '';
    if (editingGroup.id) return `Edit Group: ${editingGroup.name}`;
    return 'Add New Group';
  }

  return (
    <Paper shadow="xs" p="md" withBorder>
      <ModifierTypeSelectionModal 
        opened={templateModalOpened}
        onClose={closeTemplateModal}
        onSelect={handleTemplateSelect}
      />

      <Modal opened={groupModalOpened} onClose={closeGroupModal} title={getModalTitle()} size="lg">
        {editingGroup && (
          <Box>
            <TextInput label="Group Name" placeholder="e.g., Pizza Toppings" required value={editingGroup.name || ''} onChange={(e) => setEditingGroup({...editingGroup, name: e.target.value})} />
            
            {editingGroup.id && (
              <UnstyledButton onClick={toggleAdvanced} mt="md">
                <Group gap="xs">
                  {advancedOpened ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />}
                  <Text size="sm">Advanced Rules</Text>
                </Group>
              </UnstyledButton>
            )}

            <Collapse in={advancedOpened || !editingGroup.id}>
                <NumberInput mt="md" label="Minimum Selections" required value={editingGroup.minSelection} onChange={(val) => setEditingGroup({...editingGroup, minSelection: val || 0})} min={0} />
                <NumberInput mt="md" label="Selection Budget (Points)" required value={editingGroup.selectionBudget} onChange={(val) => setEditingGroup({...editingGroup, selectionBudget: val || 0})} min={0} />
                <Switch
                  mt="md"
                  label="Set max selections to total number of options"
                  checked={editingGroup.maxSelectionsSyncedToOptionCount}
                  onChange={(e) => setEditingGroup({ ...editingGroup, maxSelectionsSyncedToOptionCount: e.currentTarget.checked })}
                />
                <NumberInput 
                  mt="xs" 
                  label="Maximum Selections (optional)" 
                  placeholder="Leave blank for no limit"
                  disabled={editingGroup.maxSelectionsSyncedToOptionCount}
                  value={editingGroup.maxSelections} 
                  onChange={(val) => setEditingGroup({...editingGroup, maxSelections: val})} min={0} 
                />
                 <Switch
                  mt="md"
                  label="Allow repeated selections (e.g., 'Double Extra Cheese')"
                  checked={editingGroup.allowRepeatedSelections}
                  onChange={(e) => setEditingGroup({ ...editingGroup, allowRepeatedSelections: e.currentTarget.checked })}
                />
                 <Switch
                  mt="md"
                  label="Require exact budget to be used"
                  description="Useful for combos where the full point value must be spent."
                  checked={editingGroup.exactBudgetRequired}
                  onChange={(e) => setEditingGroup({ ...editingGroup, exactBudgetRequired: e.currentTarget.checked })}
                />
            </Collapse>

            <Group justify="flex-end" mt="xl"><Button variant="default" onClick={closeGroupModal}>Cancel</Button><Button onClick={handleGroupSave}>Save Group</Button></Group>
          </Box>
        )}
      </Modal>

      <Modal opened={optionModalOpened} onClose={closeOptionModal} title={editingOption?.id ? 'Edit Option' : 'Add New Option'}>
        <Box>
          <TextInput label="Option Name" placeholder="e.g., Extra Cheese" required value={editingOption?.name || ''} onChange={(e) => setEditingOption({...editingOption, name: e.target.value})} />
          <NumberInput mt="md" label="Price Adjustment" defaultValue={0} precision={2} step={0.50} value={editingOption?.priceAdjustment || 0} onChange={(val) => setEditingOption({...editingOption, priceAdjustment: val || 0})} />
          <NumberInput mt="md" label="Selection Cost (Points)" defaultValue={1} min={0} step={1} value={editingOption?.selectionCost === undefined ? 1 : editingOption.selectionCost} onChange={(val) => setEditingOption({...editingOption, selectionCost: val === undefined ? 1 : val})} />
          <Group justify="flex-end" mt="xl"><Button variant="default" onClick={closeOptionModal}>Cancel</Button><Button onClick={handleOptionSave}>Save Option</Button></Group>
        </Box>
      </Modal>
      
      <Group justify="space-between" mb="md">
        <Title order={3}>Modifier Groups</Title>
        <Button onClick={handleNewGroupClick} leftSection={<IconPlus size={16} />}>New Group</Button>
      </Group>
      <Accordion variant="separated">
        {modifierGroups.map(group => (
          <Accordion.Item key={group.id} value={group.name + group.id}>
            <Group wrap="nowrap" justify="space-between" align="center">
              <Accordion.Control style={{ flex: 1 }}><Text fw={500}>{group.name}</Text></Accordion.Control>
              <Group gap="xs" wrap="nowrap">
                <ActionIcon variant="outline" onClick={() => handleEditGroupClick(group)}><IconEdit size={16} /></ActionIcon>
                <ActionIcon color="red" variant="outline" onClick={() => handleGroupDelete(group.id)}><IconTrash size={16} /></ActionIcon>
              </Group>
            </Group>
            <Accordion.Panel>
              <Button size="xs" variant="light" mb="sm" onClick={() => { setEditingOption({ name: '', priceAdjustment: 0, selectionCost: 1, modifierGroupId: group.id }); openOptionModal(); }}>Add Option</Button>
              <Table striped withTableBorder fontSize="sm">
                <Table.Thead><Table.Tr>
                  <Table.Th>Option Name</Table.Th>
                  <Table.Th>Price Adj.</Table.Th>
                  <Table.Th>Selection Points</Table.Th>
                  <Table.Th>Actions</Table.Th>
                </Table.Tr></Table.Thead>
                <Table.Tbody>
                  {group.options.map(option => (
                    <Table.Tr key={option.id}>
                      <Table.Td>{option.name}</Table.Td>
                      <Table.Td>{currencySymbol}{Number(option.priceAdjustment).toFixed(2)}</Table.Td>
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
    </Paper>
  );
}