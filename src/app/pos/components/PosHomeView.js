// src/app/pos/components/PosHomeView.js
"use client";

import { Title, Button, Paper, SimpleGrid } from '@mantine/core';
import { IconTable, IconBox, IconTruckDelivery, IconCar } from '@tabler/icons-react';

// UPDATED: The component now expects an 'onStartOrder' prop
export default function PosHomeView({ onSelectDineIn, onStartOrder }) {
  const orderTypes = [
    { name: 'Dine-In', type: 'Dine-In', icon: IconTable, action: onSelectDineIn },
    { name: 'Takeaway', type: 'Takeaway', icon: IconBox, action: () => onStartOrder('Takeaway') },
    { name: 'Delivery', type: 'Delivery', icon: IconTruckDelivery, action: () => onStartOrder('Delivery') },
    { name: 'Drive-Through', type: 'Drive-Through', icon: IconCar, action: () => onStartOrder('Drive-Through') },
  ];

  return (
    <div>
      <Title order={1} mb="xl">Point of Sale</Title>
      <Paper p="xl" withBorder>
        <SimpleGrid 
          cols={{ base: 1, sm: 2, md: 4 }}
          spacing="xl"
        >
          {orderTypes.map((type) => (
            <Button
              key={type.name}
              onClick={type.action}
              style={{ height: '180px' }}
              variant="outline"
              size="xl"
            >
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <type.icon size={48} />
                <span style={{ marginTop: '10px', fontSize: '1.2rem' }}>{type.name}</span>
              </div>
            </Button>
          ))}
        </SimpleGrid>
      </Paper>
    </div>
  );
}