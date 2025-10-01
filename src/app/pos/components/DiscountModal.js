// src/app/pos/components/DiscountModal.js
"use client";

import { Modal, Title, Text, Button, Group, SimpleGrid, ScrollArea } from '@mantine/core';

export default function DiscountModal({ opened, onClose, onSelectDiscount, target, discounts }) {
  const targetName = target?.product ? target.product.name : 'Entire Order';
  
  return (
    <Modal opened={opened} onClose={onClose} title={`Apply Discount to ${targetName}`} centered>
      <ScrollArea style={{ height: '50vh' }}>
        <SimpleGrid cols={2}>
          {discounts.map(discount => (
            <Button 
              key={discount.id} 
              variant="outline" 
              onClick={() => onSelectDiscount(discount.id)}
              style={{ height: '80px', flexDirection: 'column' }}
            >
              <Text>{discount.name}</Text>
              <Text size="xs" c="dimmed">
                {discount.type === 'PERCENT' ? `${discount.value}% Off` : `$${discount.value.toFixed(2)} Off`}
              </Text>
            </Button>
          ))}
        </SimpleGrid>
      </ScrollArea>
      
      <Group justify="space-between" mt="xl">
        <Button variant="outline" color="red" onClick={() => onSelectDiscount(null)}>
          Remove Discount
        </Button>
        <Button variant="default" onClick={onClose}>
          Cancel
        </Button>
      </Group>
    </Modal>
  );
}