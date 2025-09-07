// src/app/pos/components/HeldOrdersModal.js
"use client";

import { Modal, Title, Button, Text, ScrollArea, SimpleGrid, Paper, ActionIcon, UnstyledButton, Group } from '@mantine/core';
import { IconX } from '@tabler/icons-react';

export default function HeldOrdersModal({ opened, onClose, heldOrders, onResume, onDelete, orderType }) {
  return (
    <Modal opened={opened} onClose={onClose} title={`Resume a Held ${orderType} Order`} size="xl" centered>
      <ScrollArea style={{ height: '60vh' }}>
        <SimpleGrid cols={{ base: 2, sm: 3, md: 4 }} spacing="md">
          {heldOrders && heldOrders.length > 0 ? (
            heldOrders.map(order => (
              <Paper
                key={order.id}
                withBorder
                p="xs"
                style={{ position: 'relative', minHeight: '100px' }}
              >
                <ActionIcon
                  color="red"
                  variant="subtle"
                  style={{ position: 'absolute', top: 4, right: 4, zIndex: 1 }}
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent resuming when deleting
                    if (window.confirm(`Are you sure you want to delete Held Order #${order.id}?`)) {
                      onDelete(order.id);
                    }
                  }}
                  title="Delete Held Order"
                >
                  <IconX size={16} />
                </ActionIcon>
                <UnstyledButton
                  onClick={() => onResume(order.id)}
                  style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}
                >
                  <Text fw={500}>Order #{order.id}</Text>
                  <Text size="sm" c="dimmed">{new Date(order.createdAt).toLocaleTimeString()}</Text>
                  <Text size="sm" c="dimmed">{order.items.length} item(s)</Text>
                  <Text fw={700} mt="xs">${Number(order.totalAmount).toFixed(2)}</Text>
                </UnstyledButton>
              </Paper>
            ))
          ) : (
            <Text>No orders are currently on hold for this order type.</Text>
          )}
        </SimpleGrid>
      </ScrollArea>
      <Group justify="flex-end" mt="md">
        <Button variant="default" onClick={onClose}>Close</Button>
      </Group>
    </Modal>
  );
}