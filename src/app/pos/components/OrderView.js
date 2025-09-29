// src/app/pos/components/OrderView.js
"use client";

import { useState, useEffect } from 'react';
import { Title, Grid, Button, Paper, Text, Group, Tabs, ScrollArea, Divider, Center, Box, ActionIcon } from '@mantine/core';
import { IconArrowLeft, IconDeviceFloppy, IconEraser, IconX, IconPencil } from '@tabler/icons-react';
import Keypad from './Keypad';

export default function OrderView({
  order,
  onBack,
  menu,
  onProductSelect,
  onUpdateQuantity,
  onRemoveItem,
  onFinalize,
  onHold,
  onClearOrder,
  selectedItemId,
  onSelectItem,
  onOpenCommentModal
}) {
  const { categories, products } = menu;
  const defaultCategory = categories.length > 0 ? categories[0].id.toString() : null;
  const [keypadInput, setKeypadInput] = useState('');

  const isCartEmpty = !order || !order.items || order.items.length === 0;

  useEffect(() => {
    setKeypadInput('');
  }, [selectedItemId]);

  const handleNumberPress = (number) => {
    if (!selectedItemId) return;
    const currentVal = keypadInput === '0' ? '' : keypadInput;
    const newString = (currentVal + number).slice(0, 4);
    setKeypadInput(newString);
    const newQuantity = parseInt(newString, 10);
    if (!isNaN(newQuantity)) {
      onUpdateQuantity(selectedItemId, newQuantity);
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

  const calculateItemTotal = (item) => {
    const basePrice = item.priceAtTimeOfOrder;
    const modifiersPrice = item.selectedModifiers.reduce((acc, mod) => {
      return acc + (mod.modifierOption.priceAdjustment * mod.quantity);
    }, 0);
    return (basePrice + modifiersPrice) * item.quantity;
  };

  return (
    <Grid>
      <Grid.Col span={5}>
        <Group justify="space-between" mb="md">
          <Title order={2}>Current Order</Title>
        </Group>
        <Paper withBorder style={{ height: '85vh', display: 'flex', flexDirection: 'column' }}>
          <ScrollArea style={{ flex: 1 }}>
            <Box p="xs">
              {order.comment && (
                <Paper withBorder p="xs" mb="xs" bg="yellow.0">
                  <Text size="sm" fw={500}>Order Note:</Text>
                  <Text size="sm" c="dimmed" style={{ whiteSpace: 'pre-wrap' }}>{order.comment}</Text>
                </Paper>
              )}
              {!isCartEmpty ? (
                order.items.map(item => (
                  <Box key={item.id} onClick={() => onSelectItem(item.id)} style={{ cursor: 'pointer' }}>
                    <Paper withBorder p="xs" mb="xs" shadow={selectedItemId === item.id ? 'md' : 'xs'}
                      style={selectedItemId === item.id ? { border: `1px solid var(--mantine-color-blue-6)` } : {}}
                    >
                      <Group justify="space-between">
                        <Text fw={500}>{item.product.name}</Text>
                        <ActionIcon color="red" variant="subtle" onClick={(e) => { e.stopPropagation(); onRemoveItem(item.id); }}>
                          <IconX size={16} />
                        </ActionIcon>
                      </Group>
                      {item.comment && (
                         <Text size="xs" c="blue.8" fs="italic" mt={-5} mb={5} pl="sm" style={{ whiteSpace: 'pre-wrap' }}>
                           &bull; {item.comment}
                         </Text>
                      )}
                      {item.selectedModifiers && item.selectedModifiers.length > 0 && (
                        <Box pl="sm" mt={-5} mb={5}>
                          {item.selectedModifiers.map(mod => (
                            <Text key={mod.id} size="xs" c="dimmed">
                              &bull; {mod.modifierOption.name}
                              {mod.quantity > 1 ? ` (x${mod.quantity})` : ''}
                              {mod.modifierOption.priceAdjustment > 0 ? ` (+$${(mod.modifierOption.priceAdjustment * mod.quantity).toFixed(2)})` : ''}
                            </Text>
                          ))}
                        </Box>
                      )}
                      <Group justify="space-between" mt="xs">
                        <Text size="lg" fw={700}>Qty: {item.quantity}</Text>
                        <Text fw={500}>${calculateItemTotal(item).toFixed(2)}</Text>
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
             <Group grow mb="sm">
              <Button
                variant="default"
                leftSection={<IconPencil size={16} />}
                onClick={() => onOpenCommentModal(order)}
                disabled={isCartEmpty}
              >
                Order Note
              </Button>
              <Button
                variant="default"
                leftSection={<IconPencil size={16} />}
                onClick={() => {
                  const item = order.items.find(i => i.id === selectedItemId);
                  if (item) onOpenCommentModal(item);
                }}
                disabled={!selectedItemId}
              >
                Item Note
              </Button>
            </Group>
            <Divider my="sm" />
            <Group justify="space-between">
              <Title order={3}>Total:</Title>
              <Title order={3}>${Number(order.totalAmount || 0).toFixed(2)}</Title>
            </Group>
            <Grid mt="md">
              <Grid.Col span={6}>
                <Button
                  size="lg"
                  fullWidth
                  variant="outline"
                  leftSection={<IconDeviceFloppy size={20} />}
                  onClick={onHold}
                  disabled={order.orderType === 'Dine-In'}
                >
                  {isCartEmpty ? 'View Held' : 'Hold Order'}
                </Button>
              </Grid.Col>
              <Grid.Col span={6}>
                <Button
                  size="lg"
                  fullWidth
                  variant="outline"
                  color="red"
                  leftSection={<IconEraser size={20} />}
                  disabled={isCartEmpty}
                  onClick={onClearOrder}
                >
                  Clear Cart
                </Button>
              </Grid.Col>
              <Grid.Col span={12}>
                <Button size="lg" fullWidth disabled={isCartEmpty} onClick={onFinalize}>
                  Finalize & Pay
                </Button>
              </Grid.Col>
            </Grid>
          </Box>
        </Paper>
      </Grid.Col>
      <Grid.Col span={7}>
        <Group justify="space-between" mb="md">
          <Title order={2}>
            {order.table ? `Order for ${order.table.name}` : `${order.orderType} Order`}
          </Title>
          <Button onClick={onBack} variant="outline" leftSection={<IconArrowLeft size={16} />}>
            Back to Home
          </Button>
        </Group>
        <Paper withBorder p="md">
          <Tabs defaultValue={defaultCategory}>
            <Tabs.List>
              {categories.map(cat => (
                <Tabs.Tab key={cat.id} value={cat.id.toString()}>{cat.name}</Tabs.Tab>
              ))}
            </Tabs.List>
            {categories.map(cat => (
              <Tabs.Panel key={cat.id} value={cat.id.toString()} pt="xs">
                <ScrollArea style={{ height: '75vh' }}>
                  <Grid>
                    {products.filter(p => p.categoryId === cat.id).map(product => (
                      <Grid.Col span={4} key={product.id}>
                        <Button
                          variant="outline"
                          style={{ height: '100px', width: '100%', padding: '8px' }}
                          onClick={() => onProductSelect(product)}
                        >
                          <Text wrap="wrap">{product.name}</Text>
                        </Button>
                      </Grid.Col>
                    ))}
                  </Grid>
                </ScrollArea>
              </Tabs.Panel>
            ))}
          </Tabs>
        </Paper>
      </Grid.Col>
    </Grid>
  );
}