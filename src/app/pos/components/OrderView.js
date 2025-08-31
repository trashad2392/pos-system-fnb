// src/app/pos/components/OrderView.js
"use client";

import { Title, Grid, Button, Paper, Text, Group, Tabs, ScrollArea, Divider, Center, Box } from '@mantine/core';
import { IconArrowLeft } from '@tabler/icons-react';

export default function OrderView({ order, onBack, menu, onProductSelect }) {
  const { categories, products } = menu;
  const defaultCategory = categories.length > 0 ? categories[0].id.toString() : null;

  return (
    <Grid>
      {/* Left Column: Menu */}
      <Grid.Col span={7}>
        <Group justify="space-between" mb="md">
          <Title order={2}>
            {order.table ? `Order for ${order.table.name}` : 'Takeaway Order'}
          </Title>
          <Button onClick={onBack} variant="outline" leftSection={<IconArrowLeft size={16} />}>
            Back to Main Screen
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

      {/* Right Column: Cart */}
      <Grid.Col span={5}>
        <Group justify="space-between" mb="md">
           <Title order={2}>Current Order</Title>
           <Text>Order #{order.id}</Text>
        </Group>
        <Paper withBorder p="md" style={{ height: '85vh', display: 'flex', flexDirection: 'column' }}>
          <ScrollArea style={{ flex: 1, marginBottom: '1rem' }}>
            {order.items && order.items.length > 0 ? (
              order.items.map(item => (
                <Paper key={item.id} withBorder p="xs" mb="xs">
                  <Group justify="space-between">
                    <Text fw={500}>{item.product.name}</Text>
                    <Text fw={500}>${(item.quantity * item.priceAtTimeOfOrder).toFixed(2)}</Text>
                  </Group>
                  <Group justify="space-between">
                    <Text size="sm" c="dimmed">Qty: {item.quantity}</Text>
                    <Text size="sm" c="dimmed">@ ${Number(item.priceAtTimeOfOrder).toFixed(2)}</Text>
                  </Group>
                  {item.selectedModifiers && item.selectedModifiers.length > 0 && (
                    <Box pl="sm" mt="xs">
                      {item.selectedModifiers.map(mod => (
                        <Text key={mod.id} size="xs" c="dimmed">
                          &bull; {mod.name} {mod.priceAdjustment > 0 ? `(+$${mod.priceAdjustment.toFixed(2)})` : ''}
                        </Text>
                      ))}
                    </Box>
                  )}
                </Paper>
              ))
            ) : (
              <Center style={{ height: '100%' }}><Text c="dimmed">Cart is empty</Text></Center>
            )}
          </ScrollArea>
          <Divider my="sm" />
          <Group justify="space-between">
            <Title order={3}>Total:</Title>
            <Title order={3}>${Number(order.totalAmount || 0).toFixed(2)}</Title>
          </Group>
          <Button mt="md" size="lg" disabled={!order.items || order.items.length === 0}>
            Finalize & Pay
          </Button>
        </Paper>
      </Grid.Col>
    </Grid>
  );
}