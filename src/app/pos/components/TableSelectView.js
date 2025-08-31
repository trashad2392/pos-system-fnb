// src/app/pos/components/TableSelectView.js
"use client";

import { Title, Grid, Button, Paper, Text, Group, Tabs, Center, Loader } from '@mantine/core';
import { IconBox, IconTable, IconTruckDelivery, IconCar } from '@tabler/icons-react';

export default function TableSelectView({
  tables,
  activeTab,
  onTabChange,
  onTableSelect,
  onTakeaway,
  onDelivery,
  onDriveThrough,
}) {
  const handleTabChange = (value) => {
    // First, update the parent's state so the tab visually changes and is remembered.
    onTabChange(value);
    
    // Then, if the new tab is a direct-action tab, call the appropriate function to start an order.
    if (value === 'takeaway') {
      onTakeaway();
    } else if (value === 'delivery') {
      onDelivery();
    } else if (value === 'drive-through') {
      onDriveThrough();
    }
  };

  return (
    <>
      <Group justify="space-between" mb="xl">
        <Title order={1}>Point of Sale</Title>
      </Group>
      <Tabs value={activeTab} onChange={handleTabChange} variant="pills" fz="lg">
        <Tabs.List>
          <Tabs.Tab value="dine-in" leftSection={<IconTable size={20} />}>Dine-In</Tabs.Tab>
          <Tabs.Tab value="takeaway" leftSection={<IconBox size={20} />}>Takeaway</Tabs.Tab>
          <Tabs.Tab value="delivery" leftSection={<IconTruckDelivery size={20} />}>Delivery</Tabs.Tab>
          <Tabs.Tab value="drive-through" leftSection={<IconCar size={20} />}>Drive-Through</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="dine-in" pt="lg">
          <Title order={3} mb="md">Select a Table</Title>
          <Paper p="md" withBorder>
            <Grid>
              {tables.length > 0 ? (
                tables.map(table => (
                  <Grid.Col span={{ base: 12, xs: 4, sm: 3, md: 2 }} key={table.id}>
                    <Button
                      variant={table.status === 'AVAILABLE' ? 'light' : 'filled'}
                      color={table.status === 'OCCUPIED' ? 'blue' : 'gray'}
                      onClick={() => onTableSelect(table)}
                      style={{ 
                        height: '120px', 
                        width: '100%', 
                        flexDirection: 'column',
                        padding: '10px'
                      }}
                    >
                      <Text size="xl" fw={700}>{table.name}</Text>
                      <Text size="sm" c={table.status === 'AVAILABLE' ? 'green' : 'white'}>
                        {table.status}
                      </Text>
                    </Button>
                  </Grid.Col>
                ))
              ) : (
                <Text p="md">No tables have been created yet. Please add tables in the 'Management' section.</Text>
              )}
            </Grid>
          </Paper>
        </Tabs.Panel>
        
        {/* The panels below will only be visible for a split second before the view changes */}
        <Tabs.Panel value="takeaway" pt="lg">
           <Center p="xl"><Loader /></Center>
        </Tabs.Panel>
        <Tabs.Panel value="delivery" pt="lg">
           <Center p="xl"><Loader /></Center>
        </Tabs.Panel>
        <Tabs.Panel value="drive-through" pt="lg">
           <Center p="xl"><Loader /></Center>
        </Tabs.Panel>
      </Tabs>
    </>
  );
}