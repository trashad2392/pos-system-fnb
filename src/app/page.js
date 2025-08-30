// src/app/page.js
"use client";
import { useState, useEffect } from 'react';
import { Title, Box, TextInput, Table, Button, Paper, Group, ActionIcon, Modal, NumberInput, Text, Tabs, Select, Accordion, MultiSelect } from '@mantine/core';
import { IconSearch, IconEdit, IconArchive, IconTrash, IconPlus } from '@tabler/icons-react';
import { useDisclosure } from '@mantine/hooks';
import AddProductForm from '@/components/AddProductForm';

// --- CATEGORY MANAGER COMPONENT ---
function CategoryManager({ categories, onDataChanged }) {
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

// --- PRODUCT MANAGER COMPONENT ---
function ProductManager({ products, categories, modifierGroups, onDataChanged }) {
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

// --- MODIFIER MANAGER COMPONENT ---
function ModifierManager({ modifierGroups, onDataChanged }) {
  const [editingGroup, setEditingGroup] = useState(null);
  const [editingOption, setEditingOption] = useState(null);
  const [groupModalOpened, { open: openGroupModal, close: closeGroupModal }] = useDisclosure(false);
  const [optionModalOpened, { open: openOptionModal, close: closeOptionModal }] = useDisclosure(false);

  const handleGroupSave = async () => {
    if (Number(editingGroup.minSelection) > Number(editingGroup.maxSelection)) {
      alert('Error: Minimum selections cannot be greater than maximum selections.');
      return;
    }
    const data = { name: editingGroup.name, minSelection: Number(editingGroup.minSelection), maxSelection: Number(editingGroup.maxSelection) };
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
    const data = { name: editingOption.name, priceAdjustment: Number(editingOption.priceAdjustment), modifierGroupId: editingOption.modifierGroupId };
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
        <Button onClick={() => { setEditingGroup({ name: '', minSelection: 1, maxSelection: 1 }); openGroupModal(); }} leftSection={<IconPlus size={16} />}>New Group</Button>
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
              <Button size="xs" variant="light" mb="sm" onClick={() => { setEditingOption({ name: '', priceAdjustment: 0, modifierGroupId: group.id }); openOptionModal(); }}>Add Option</Button>
              <Table striped withTableBorder fontSize="sm">
                <Table.Thead><Table.Tr><Table.Th>Option Name</Table.Th><Table.Th>Price Adj.</Table.Th><Table.Th>Actions</Table.Th></Table.Tr></Table.Thead>
                <Table.Tbody>
                  {group.options.map(option => (
                    <Table.Tr key={option.id}><Table.Td>{option.name}</Table.Td><Table.Td>${Number(option.priceAdjustment).toFixed(2)}</Table.Td><Table.Td><Group gap="xs"><ActionIcon variant="subtle" onClick={() => { setEditingOption(option); openOptionModal(); }}><IconEdit size={14} /></ActionIcon><ActionIcon color="red" variant="subtle" onClick={() => handleOptionDelete(option.id)}><IconTrash size={14} /></ActionIcon></Group></Table.Td></Table.Tr>
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
          <NumberInput mt="md" label="Minimum Selections" required value={editingGroup?.minSelection === undefined ? 0 : editingGroup.minSelection} onChange={(val) => setEditingGroup({...editingGroup, minSelection: val || 0})} min={0} max={editingGroup?.maxSelection} />
          <NumberInput mt="md" label="Maximum Selections" required value={editingGroup?.maxSelection === undefined ? 1 : editingGroup.maxSelection} onChange={(val) => setEditingGroup({...editingGroup, maxSelection: val || 1})} min={editingGroup?.minSelection} />
          <Group justify="flex-end" mt="xl"><Button variant="default" onClick={closeGroupModal}>Cancel</Button><Button onClick={handleGroupSave}>Save Group</Button></Group>
        </Box>
      </Modal>
      <Modal opened={optionModalOpened} onClose={closeOptionModal} title={editingOption?.id ? 'Edit Option' : 'Add New Option'}>
        <Box>
          <TextInput label="Option Name" placeholder="e.g., Extra Cheese" required value={editingOption?.name || ''} onChange={(e) => setEditingOption({...editingOption, name: e.target.value})} />
          <NumberInput mt="md" label="Price Adjustment" defaultValue={0} precision={2} step={0.50} value={editingOption?.priceAdjustment || 0} onChange={(val) => setEditingOption({...editingOption, priceAdjustment: val || 0})} />
          <Group justify="flex-end" mt="xl"><Button variant="default" onClick={closeOptionModal}>Cancel</Button><Button onClick={handleOptionSave}>Save Option</Button></Group>
        </Box>
      </Modal>
    </Paper>
  );
}

// --- NEW TABLE MANAGER COMPONENT ---
function TableManager({ tables, onDataChanged }) {
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

// --- MAIN PAGE LAYOUT (UPDATED) ---
export default function InventoryPage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [rawCategories, setRawCategories] = useState([]);
  const [modifierGroups, setModifierGroups] = useState([]);
  const [rawModifierGroups, setRawModifierGroups] = useState([]);
  const [tables, setTables] = useState([]);

  const fetchData = async () => {
    try {
      const productData = await window.api.getProducts();
      setProducts(productData);
      
      const categoryData = await window.api.getCategories();
      setRawCategories(categoryData);
      setCategories(categoryData.map(cat => ({ value: cat.id.toString(), label: cat.name })));

      const groupData = await window.api.getModifierGroups();
      setRawModifierGroups(groupData);
      setModifierGroups(groupData.map(g => ({ value: g.id.toString(), label: g.name })));
      
      const tableData = await window.api.getTables();
      setTables(tableData);

    } catch (error) { console.error("Error fetching page data:", error); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleImportMenu = async () => {
    if (!window.confirm('This will wipe your existing menu (products, categories, modifiers) and replace it with the data from the selected file. Are you sure you want to continue?')) {
      return;
    }
    try {
      const jsonContent = await window.api.openImportDialog();
      if (jsonContent) {
        const result = await window.api.importMenuFromJson(jsonContent);
        alert(result.message);
        fetchData();
      }
    } catch (error) {
      alert(`Error during import: ${error.message}`);
      console.error("Import failed:", error);
    }
  };

  return (
    <div>
      <Group justify="space-between" mb="xl">
        <Title order={1}>Inventory & Menu Management</Title>
        <Button onClick={handleImportMenu} variant="outline">Import Menu</Button>
      </Group>

      <Tabs defaultValue="products">
        <Tabs.List>
          <Tabs.Tab value="products">Products</Tabs.Tab>
          <Tabs.Tab value="categories">Categories</Tabs.Tab>
          <Tabs.Tab value="modifiers">Modifiers</Tabs.Tab>
          <Tabs.Tab value="tables">Tables</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="products" pt="xs">
          <ProductManager products={products} categories={categories} modifierGroups={modifierGroups} onDataChanged={fetchData} />
        </Tabs.Panel>
        <Tabs.Panel value="categories" pt="xs">
          <CategoryManager categories={rawCategories} onDataChanged={fetchData} />
        </Tabs.Panel>
        <Tabs.Panel value="modifiers" pt="xs">
          <ModifierManager modifierGroups={rawModifierGroups} onDataChanged={fetchData} />
        </Tabs.Panel>
        <Tabs.Panel value="tables" pt="xs">
          <TableManager tables={tables} onDataChanged={fetchData} />
        </Tabs.Panel>
      </Tabs>
    </div>
  );
}