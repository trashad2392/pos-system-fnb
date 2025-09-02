// src/app/pos/components/MenuPanel.js
"use client";

import { Title, Grid, Button, Paper, Text, Group, Tabs, ScrollArea } from '@mantine/core';
import { IconArrowLeft } from '@tabler/icons-react';

export default function MenuPanel({ order, onBack, menu, onProductSelect }) {
  const { categories, products } = menu;
  const defaultCategory = categories.length > 0 ? categories[0].id.toString() : null;

  return (
    <>
      <Group justify="space-between" mb="md">
        <Title order={2}>
          {order.table ? `Order for ${order.table.name}` : `${order.orderType} Order`}
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
    </>
  );
}