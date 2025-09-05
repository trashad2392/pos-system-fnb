// src/app/pos/components/CartPanel.js
"use client";

import { useState, useEffect } from 'react'; // <-- THIS LINE IS THE FIX
import { Title, Button, Paper, Text, Group, ScrollArea, Divider, Center, Box, ActionIcon } from '@mantine/core';
import { IconPlus, IconMinus, IconX } from '@tabler/icons-react';
import Keypad from './Keypad';

export default function CartPanel({ order, onUpdateQuantity, onRemoveItem, onFinalize, selectedItemId, onSelectItem }) {
  const [keypadInput, setKeypadInput] = useState('');

  useEffect(() => {
    setKeypadInput('');
  }, [selectedItemId]);

  const handleNumberPress = (number) => {
    if (!selectedItemId) return;
    const newString = (keypadInput + number).slice(0, 4);
    setKeypadInput(newString);
    const newQuantity = parseInt(newString, 10);
    if (!isNaN(newQuantity) && newQuantity > 0) {
      onUpdateQuantity(selectedItemId, newQuantity);
    } else if (newString === '0') {
      onUpdateQuantity(selectedItemId, 0);
    }
  };

  const handleBackspace = () => {
    if (!selectedItemId) return;
    const newString = keypadInput.slice(0, -1);
    setKeypadInput(newString);
    
    if (newString === '') {
      onUpdateQuantity(selectedItemId, 1);
    } else {
      const newQuantity = parseInt(newString, 10);
      if (!isNaN(newQuantity)) {
        onUpdateQuantity(selectedItemId, newQuantity);
      }
    }
  };

  const handleClear = () => {
    if (!selectedItemId) return;
    setKeypadInput('');
    onUpdateQuantity(selectedItemId, 1);
  };

  return (
    <>
      <Group justify="space-between" mb="md">
        <Title order={2}>Current Order</Title>
        <Text>Order #{order.id}</Text>
      </Group>
      <Paper withBorder style={{ height: '85vh', display: 'flex', flexDirection: 'column' }}>
        <ScrollArea style={{ flex: 1 }}>
          <Box p="xs">
            {order.items && order.items.length > 0 ? (
              order.items.map(item => (
                <Box key={item.id} onClick={() => onSelectItem(item.id)} style={{cursor: 'pointer'}}>
                  <Paper withBorder p="xs" mb="xs" shadow={selectedItemId === item.id ? 'md' : 'xs'}
                    style={ selectedItemId === item.id ? { border: `1px solid var(--mantine-color-blue-6)` } : {} }
                  >
                    <Group justify="space-between">
                      <Text fw={500}>{item.product.name}</Text>
                      <ActionIcon color="red" variant="subtle" onClick={(e) => { e.stopPropagation(); onRemoveItem(item.id); }}>
                        <IconX size={16} />
                      </ActionIcon>
                    </Group>
                    {item.selectedModifiers && item.selectedModifiers.length > 0 && (
                      <Box pl="sm" mt={-5} mb={5}>
                        {item.selectedModifiers.map(mod => (
                          <Text key={mod.id} size="xs" c="dimmed">
                            &bull; {mod.name} {mod.priceAdjustment > 0 ? `(+$${mod.priceAdjustment.toFixed(2)})` : ''}
                          </Text>
                        ))}
                      </Box>
                    )}
                    <Group justify="space-between" mt="xs">
                      <Text size="lg" fw={700}>Qty: {item.quantity}</Text>
                      <Text fw={500}>${(item.quantity * item.priceAtTimeOfOrder).toFixed(2)}</Text>
                    </Group>
                  </Paper>
                </Box>
              ))
            ) : (
              <Center style={{ height: '100%' }}><Text c="dimmed">Cart is empty</Text></Center>
            )}
          </Box>
        </ScrollArea>
        
        <Box>
          <Divider />
          <Keypad 
            onNumberPress={handleNumberPress} 
            onBackspace={handleBackspace} 
            onClear={handleClear} 
            disabled={selectedItemId === null} 
          />
        </Box>

        <Box p="md" pt={0}>
          <Divider my="sm" />
          <Group justify="space-between">
            <Title order={3}>Total:</Title>
            <Title order={3}>${Number(order.totalAmount || 0).toFixed(2)}</Title>
          </Group>
          <Button mt="md" size="lg" disabled={!order.items || order.items.length === 0} onClick={onFinalize}>
            Finalize & Pay
          </Button>
        </Box>
      </Paper>
    </>
  );
}