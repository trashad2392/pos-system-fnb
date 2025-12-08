// src/components/management/PaymentMethodManager.js
"use client";
import { useState, useEffect, useCallback } from 'react';
import {
  Title, Box, TextInput, Table, Button, Paper, Group, ActionIcon, Modal, Switch, Text, SimpleGrid, Space
} from '@mantine/core';

// Static imports for Tabler Icons
import { 
    IconEdit, IconTrash, IconPlus, IconArrowUp, IconArrowDown, 
    IconCheck, 
    IconCash, 
    IconCreditCard, 
    IconWallet, 
    IconBuildingBank, 
    IconCoins,
    IconCurrencyDollar,
    IconGift,
    IconDiscount,
    IconBarcode,
    IconBrandMastercard,
    IconBrandVisa,
    IconReceipt,
    IconFileInvoice 
} from '@tabler/icons-react'; 

import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';

// --- Helper Functions and Data ---

/**
 * Maps icon names to their imported component reference (for dynamic rendering).
 */
const iconNameMap = {
    IconCash, IconCreditCard, IconWallet, IconBuildingBank, IconCoins,
    IconCurrencyDollar, IconGift, IconDiscount, IconBarcode,
    IconBrandMastercard, IconBrandVisa, IconReceipt, IconFileInvoice
};

const getIconComponent = (iconName) => iconNameMap[iconName] || IconCheck;

/**
 * Dedicated component to handle rendering either the preset SVG or the custom image URL.
 */
const PaymentIconDisplay = ({ iconName, color, iconSourceType, customIconUrl }) => {
    // If it's a custom image, display the <img> tag
    if (iconSourceType === 'custom' && customIconUrl) {
        return (
            <img 
                src={customIconUrl} 
                alt="Custom Icon" 
                style={{ width: '20px', height: '20px', objectFit: 'contain' }}
            />
        );
    }

    // Otherwise, display the preset SVG icon (using richer shade 7)
    const iconColor = `var(--mantine-color-${color}-7)`; 
    const IconComponent = getIconComponent(iconName);
    return <IconComponent size={20} color={iconColor} />;
};

// List of supported Mantine colors for selection
const colorOptions = [
    { value: 'red', label: 'Red' },
    { value: 'pink', label: 'Pink' },
    { value: 'grape', label: 'Grape' },
    { value: 'violet', label: 'Violet' },
    { value: 'indigo', label: 'Indigo' },
    { value: 'blue', label: 'Blue' },
    { value: 'cyan', label: 'Cyan' },
    { value: 'teal', label: 'Teal' },
    { value: 'green', label: 'Green' },
    { value: 'lime', label: 'Lime' },
    { value: 'yellow', label: 'Yellow' },
    { value: 'orange', label: 'Orange' },
];

// Dynamically generate list of relevant icons (Names only)
const iconOptions = [
    'IconCash', 'IconCreditCard', 'IconWallet', 'IconBuildingBank', 
    'IconCoins', 'IconCurrencyDollar', 'IconGift', 'IconDiscount',
    'IconBarcode', 'IconBrandMastercard', 'IconBrandVisa', 
    'IconReceipt', 'IconFileInvoice',
].map(name => ({ value: name, label: name }));

// Initial state now includes fields for handling custom uploads
const initialMethodState = {
  name: '',
  isActive: true,
  displayOrder: 0,
  color: 'blue',
  iconName: 'IconWallet',    // Stores the name of the preset icon
  iconSourceType: 'preset',  // 'preset' or 'custom'
  customIconUrl: '',         // Stores the URL/path of the custom icon
};

// --- Main Component ---

export default function PaymentMethodManager() {
  // Initialize state with the new icon properties
  const [methods, setMethods] = useState([]);
  const [editingMethod, setEditingMethod] = useState(initialMethodState);
  const [opened, { open, close }] = useDisclosure(false);
  const [isLoading, setIsLoading] = useState(true);

  // Popover controls kept for structure, although logic is replaced by direct grid
  const [colorPickerOpened, colorPickerControls] = useDisclosure(false);
  const [iconPickerOpened, iconPickerControls] = useDisclosure(false);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      // NOTE: Ensure your API returns the iconSourceType and customIconUrl fields
      const data = await window.api.getPaymentMethods();
      const sortedData = data.sort((a, b) => a.displayOrder - b.displayOrder);
      
      // Map data to ensure required fields are present with defaults
      const mappedData = sortedData.map(m => ({
          ...m,
          iconName: m.iconName || m.icon || 'IconWallet', // Use the old 'icon' if 'iconName' doesn't exist
          iconSourceType: m.iconSourceType || 'preset',
          customIconUrl: m.customIconUrl || '',
      }));

      setMethods(mappedData);
    } catch (error) {
      notifications.show({ title: 'Error', message: 'Failed to load payment methods.', color: 'red' });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleOpenModal = (method = null) => {
    if (method && method.name === 'Cash') {
         notifications.show({ title: 'Info', message: `The "${method.name}" payment method is system-protected and cannot be edited.`, color: 'yellow' });
         return;
    }
    // Map existing method data to the new structure when opening the modal
    const methodData = method ? {
        ...method,
        iconName: method.iconName || method.icon || 'IconWallet',
        iconSourceType: method.iconSourceType || 'preset',
        customIconUrl: method.customIconUrl || '',
    } : initialMethodState;

    setEditingMethod(methodData);
    open();
  };
  
  const handleIconUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
        const base64Data = reader.result; 
        
        try {
            notifications.show({ title: 'Processing', message: 'Saving image to persistent storage...', color: 'blue' });

            // 2. Call the API to save the file persistently
            const persistentUrl = await window.api.saveIconImage({ 
                name: file.name, 
                data: base64Data 
            });

            // 3. Update the state with the permanent URL
            setEditingMethod(prev => ({
                ...prev,
                iconSourceType: 'custom',
                customIconUrl: persistentUrl, // Use the URL returned by the API
                iconName: '',
            }));

            notifications.show({ title: 'Success', message: `Icon saved and ready for use.`, color: 'green' });

        } catch (error) {
            // Display error if window.api.saveIconImage is not found or throws
            notifications.show({ title: 'Error', message: `Failed to save icon: ${error.message}`, color: 'red' });
        }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveMethod = async () => {
    if (!editingMethod.name.trim() || !editingMethod.color || (!editingMethod.iconName && !editingMethod.customIconUrl)) {
        notifications.show({ title: 'Error', message: 'Name, Color, and Icon are required.', color: 'red' });
        return;
    }
    
    // Construct the data to save, including the new fields
    const dataToSave = {
      name: editingMethod.name.trim(),
      isActive: editingMethod.isActive,
      color: editingMethod.color, 
      iconName: editingMethod.iconName,
      iconSourceType: editingMethod.iconSourceType,
      customIconUrl: editingMethod.customIconUrl,
    };

    try {
      if (editingMethod.id) {
        await window.api.updatePaymentMethod({ id: editingMethod.id, data: dataToSave });
        notifications.show({ title: 'Success', message: 'Payment method updated.', color: 'green' });
      } else {
        await window.api.addPaymentMethod(dataToSave);
        notifications.show({ title: 'Success', message: 'Payment method added.', color: 'green' });
      }
      fetchData();
      close();
    } catch (error) {
      notifications.show({ title: 'Error', message: `Failed to save method: ${error.message}`, color: 'red' });
    }
  };

  const handleToggleActive = async (id, name) => {
    if (name === 'Cash') {
        notifications.show({ title: 'Error', message: `The "${name}" payment method's active status cannot be manually toggled.`, color: 'red' });
        return;
    }
    if (window.confirm(`Are you sure you want to toggle the active status of "${name}"?`)) {
      try {
        const currentStatus = methods.find(m => m.id === id)?.isActive;
        await window.api.updatePaymentMethod({ id, data: { isActive: !currentStatus } });
        notifications.show({ title: 'Success', message: `Method status toggled to ${currentStatus ? 'Inactive' : 'Activated'}.`, color: 'orange' });
        fetchData();
      } catch (error) {
        notifications.show({ title: 'Error', message: `Failed to update status: ${error.message}`, color: 'red' });
      }
    }
  };

  const handleDelete = async (id, name, isActive) => {
    if (name === 'Cash' || name === 'Credit') {
        notifications.show({ title: 'Error', message: `The "${name}" method cannot be deleted.`, color: 'red' });
        return;
    }
    if (isActive) {
        notifications.show({ title: 'Error', message: 'Please deactivate the payment method before attempting to delete it.', color: 'red' });
        return;
    }
    if (window.confirm(`Are you sure you want to permanently delete the INACTIVE method "${name}"?`)) {
        try {
            await window.api.deletePaymentMethod(id);
            notifications.show({ title: 'Success', message: 'Method permanently deleted.', color: 'orange' });
            fetchData();
        } catch (error) {
             notifications.show({ title: 'Error', message: `Failed to delete method: ${error.message}`, color: 'red' });
        }
    }
  };

  const handleMove = async (id, direction) => {
    const currentIndex = methods.findIndex(m => m.id === id);
    if (currentIndex === -1) return;

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= methods.length) return;

    const methodA = methods[currentIndex];
    const methodB = methods[newIndex];
    
    // Swap display orders
    const newDisplayOrderA = methodB.displayOrder;
    const newDisplayOrderB = methodA.displayOrder;
    
    try {
        await Promise.all([
            window.api.updatePaymentMethod({ id: methodA.id, data: { displayOrder: newDisplayOrderA } }),
            window.api.updatePaymentMethod({ id: methodB.id, data: { displayOrder: newDisplayOrderB } })
        ]);
        
        fetchData();
        
    } catch (error) {
        notifications.show({ title: 'Error', message: `Failed to reorder: ${error.message}`, color: 'red' });
    }
  };


  if (isLoading) {
      return <Text>Loading payment methods...</Text>;
  }

  const modalTitle = editingMethod?.id ? `Edit Method: ${editingMethod.name}` : 'Add New Payment Method';

  return (
    <>
      <Modal opened={opened} onClose={close} title={modalTitle}>
        {editingMethod && (
          <Box>
            <TextInput
              label="Method Name"
              required
              value={editingMethod.name}
              onChange={(e) => setEditingMethod({ ...editingMethod, name: e.currentTarget.value })}
            />
            
            {/* --- 1. Color Selection Grid (Directly in Modal) --- */}
            <Title order={5} mt="md" mb="xs">Select Button Color</Title>
            <SimpleGrid cols={6} spacing="xs">
                {colorOptions.map((color) => (
                    <ActionIcon
                        key={color.value}
                        size="xl" 
                        color={color.value}
                        // FIX: Set variant unconditionally to 'filled' to make all swatches visible and saturated
                        variant={'filled'} 
                        onClick={() => {
                            setEditingMethod({ ...editingMethod, color: color.value });
                        }}
                    >
                        {/* Checkmark appears only on the selected color */}
                        {editingMethod.color === color.value ? <IconCheck size={20} /> : null}
                    </ActionIcon>
                ))}
            </SimpleGrid>
            
            <Space h="lg" />

            {/* --- 2. Icon Selection UI (Preset vs. Upload) --- */}
            <Title order={5} mt="md" mb="xs">Select Button Icon</Title>

            <Group gap="md" mb="md">
                <Button 
                    variant={editingMethod.iconSourceType === 'preset' ? 'filled' : 'default'}
                    onClick={() => setEditingMethod(p => ({ ...p, iconSourceType: 'preset' }))}
                >
                    Select Preset Icon
                </Button>
                <Button 
                    variant={editingMethod.iconSourceType === 'custom' ? 'filled' : 'default'}
                    onClick={() => setEditingMethod(p => ({ ...p, iconSourceType: 'custom' }))}
                >
                    Use Custom Icon
                </Button>
            </Group>

            {/* --- Preset Icon Grid (Conditional View) --- */}
            {editingMethod.iconSourceType === 'preset' && (
                <SimpleGrid cols={6} spacing="xs">
                    {iconOptions.map((icon) => {
                        const Icon = iconNameMap[icon.value] || IconCheck;
                        return (
                            <ActionIcon
                                key={icon.value}
                                size="xl" 
                                color={editingMethod.color || 'gray'}
                                variant={editingMethod.iconName === icon.value ? 'filled' : 'light'} // Check against iconName
                                onClick={() => {
                                    setEditingMethod(p => ({ 
                                        ...p, 
                                        iconName: icon.value, 
                                        customIconUrl: '', // Clear custom URL
                                        iconSourceType: 'preset' 
                                    }));
                                }}
                                title={icon.value}
                            >
                                <Icon size={24} /> 
                            </ActionIcon>
                        );
                    })}
                </SimpleGrid>
            )}

            {/* --- Custom Icon Upload (Conditional View) --- */}
            {editingMethod.iconSourceType === 'custom' && (
    <Box>
        <TextInput
            label="Upload Icon Image (PNG, JPG)"
            placeholder="No file selected"
            readOnly
            // Set a fixed width so it doesn't stretch
            w={300} 
            
            // Display the URL or status
            value={editingMethod.customIconUrl ? 'Custom image loaded' : ''}
            
            // 🔥 DEFINITIVE STYLING FIX: Override the input padding to reserve space for the button.
            styles={{ 
                input: { 
                    paddingRight: 100 // Reserves space for the 90px wide 'Browse' button + buffer
                },
            }} 
            
            rightSection={
                <Button 
                    component="label" 
                    // Use standard 'sm' size for visible text
                    size="sm" 
                    htmlFor="icon-upload"
                    // Use absolute positioning within the Mantine rightSection container
                    style={{ position: 'absolute', right: 4 }} 
                >
                    Browse
                </Button>
            }
        />
        <input
            type="file"
            id="icon-upload"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleIconUpload}
        />
        
        {editingMethod.customIconUrl && (
            <Group mt="md" align="center">
                <Text size="sm">Preview:</Text>
                {/* Display the custom uploaded image preview */}
                <img 
                    src={editingMethod.customIconUrl} 
                    alt="Custom Icon Preview" 
                    style={{ width: '48px', height: '48px', objectFit: 'contain', border: '1px solid #ddd' }}
                />
                <Button 
                    variant="light" 
                    color="red" 
                    size="compact-sm"
                    onClick={() => setEditingMethod(p => ({ 
                        ...p, 
                        customIconUrl: '', 
                        iconSourceType: 'preset',
                        iconName: 'IconWallet' 
                    }))}
                >
                    Clear
                </Button>
            </Group>
        )}
    </Box>
)}

            {/* Status Toggle */}
            <Switch
              mt="xl"
              label="Method is active in POS"
              checked={editingMethod.isActive}
              onChange={(event) => setEditingMethod({ ...editingMethod, isActive: event.currentTarget.checked })}
            />
            
            <Group justify="flex-end" mt="xl">
                <Button variant="default" onClick={close}>Cancel</Button>
                <Button onClick={handleSaveMethod}>Save Method</Button>
            </Group>
          </Box>
        )}
      </Modal>

      {/* --- Main Table View --- */}
      <Paper shadow="xs" p="md" withBorder>
        <Group justify="space-between" mb="md">
          <Title order={3}>Manage Payment Methods</Title>
          <Button onClick={() => handleOpenModal()} leftSection={<IconPlus size={16} />}>
            Add New Method
          </Button>
        </Group>

        <Text c="dimmed" size="sm" mb="md">
            Note: "Cash" is a protected system method and cannot be edited or deleted.
        </Text>

        <Table striped highlightOnHover withTableBorder>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Name</Table.Th>
              <Table.Th>Icon</Table.Th>
              <Table.Th>Status</Table.Th>
              <Table.Th>Order</Table.Th>
              <Table.Th>Actions</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {methods.length > 0 ? methods.map((method, index) => {
              const isProtected = method.name === 'Cash';

              return (
                <Table.Tr key={method.id}>
                  <Table.Td>{method.name}</Table.Td>
                  
                  {/* Pass all icon source details to the display component */}
                  <Table.Td>
                     <PaymentIconDisplay 
                        iconName={method.iconName} 
                        color={method.color} 
                        iconSourceType={method.iconSourceType}
                        customIconUrl={method.customIconUrl}
                     />
                  </Table.Td>
                  
                  <Table.Td>
                    <Text c={method.isActive ? 'green' : 'red'}>{method.isActive ? 'Active' : 'Inactive'}</Text>
                  </Table.Td>
                  <Table.Td>
                      <Group gap="xs">
                        {/* Static Icon Imports used here */}
                        <ActionIcon 
                            variant="default" 
                            onClick={() => handleMove(method.id, 'up')} 
                            disabled={index === 0}
                        >
                            <IconArrowUp size={16} />
                        </ActionIcon>
                        <ActionIcon 
                            variant="default" 
                            onClick={() => handleMove(method.id, 'down')} 
                            disabled={index === methods.length - 1}
                        >
                            <IconArrowDown size={16} />
                        </ActionIcon>
                      </Group>
                  </Table.Td>
                  <Table.Td>
                    <Group gap="xs">
                      {/* Edit Button */}
                      <ActionIcon 
                        variant="outline" 
                        onClick={() => handleOpenModal(method)} 
                        disabled={isProtected}
                        title={isProtected ? 'Protected' : 'Edit name/style'}
                      >
                        <IconEdit size={16} />
                      </ActionIcon>
                      
                      {/* Toggle Activate/Deactivate */}
                      {!isProtected && (
                          <ActionIcon 
                            color={method.isActive ? 'red' : 'green'}
                            variant="outline" 
                            onClick={() => handleToggleActive(method.id, method.name)}
                            title={method.isActive ? "Deactivate" : "Activate"}
                          >
                            <IconCheck size={16} /> 
                          </ActionIcon>
                      )}
                      
                      {/* Delete Permanently */}
                      {!method.isActive && !isProtected && (
                          <ActionIcon 
                            color="red"
                            variant="filled" 
                            onClick={() => handleDelete(method.id, method.name, method.isActive)}
                            title="Delete Permanently"
                          >
                            <IconTrash size={16} />
                          </ActionIcon>
                      )}
                    </Group>
                  </Table.Td>
                </Table.Tr>
              );
            }) : (
              <Table.Tr>
                <Table.Td colSpan={5}><Text ta="center">No payment methods found.</Text></Table.Td>
              </Table.Tr>
            )}
          </Table.Tbody>
        </Table>
      </Paper>
    </>
  );
}