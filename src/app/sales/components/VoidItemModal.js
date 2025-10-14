// src/app/sales/components/VoidItemModal.js
"use client";

import { Modal, Text, Button, Group, ScrollArea, Paper, Badge, Divider } from '@mantine/core';
import { IconRotateClockwise, IconTrash } from '@tabler/icons-react';

export default function VoidItemModal({ opened, onClose, order, onVoidItem, onVoidFullOrder }) {
  if (!order) {
    return null;
  }

  const hasActiveItems = order.items.some(item => item.status === 'ACTIVE');

  return (
    <Modal opened={opened} onClose={onClose} title={`Void Actions for Order #${order.id}`} size="xl" centered>
      <ScrollArea style={{ height: '55vh' }}>
        {order.items.map(item => {
          const isVoided = item.status === 'VOIDED';
          return (
            <Paper key={item.id} withBorder p="md" mb="sm" style={isVoided ? { backgroundColor: 'var(--mantine-color-gray-1)' } : {}}>
              <Group justify="space-between">
                <div style={isVoided ? { textDecoration: 'line-through', color: 'var(--mantine-color-gray-6)' } : {}}>
                  <Text fw={500}>{item.product.name} (x{item.quantity})</Text>
                  <Text size="sm" c="dimmed">Original Item Price: ${((item.priceAtTimeOfOrder) * item.quantity).toFixed(2)}</Text>
                </div>
                {isVoided ? (
                  <Badge color="red" size="lg" variant="filled">VOIDED ({item.voidType})</Badge>
                ) : (
                  <Group gap="xs">
                    {/* --- START: ADDED CONFIRMATION DIALOG --- */}
                    <Button
                      color="blue"
                      variant="light"
                      size="xs"
                      onClick={() => {
                        if (window.confirm(`Are you sure you want to SHORT void "${item.product.name}"? This assumes it was a mistake and not waste.`)) {
                          onVoidItem(item.id, 'SHORT');
                        }
                      }}
                      leftSection={<IconRotateClockwise size={16} />}
                    >
                      Short Void
                    </Button>
                    <Button
                      color="red"
                      variant="light"
                      size="xs"
                      onClick={() => {
                        if (window.confirm(`Are you sure you want to LONG void "${item.product.name}"? This assumes the item was wasted.`)) {
                          onVoidItem(item.id, 'LONG');
                        }
                      }}
                      leftSection={<IconTrash size={16} />}
                    >
                      Long Void
                    </Button>
                    {/* --- END: ADDED CONFIRMATION DIALOG --- */}
                  </Group>
                )}
              </Group>
            </Paper>
          );
        })}
      </ScrollArea>
      
      <Divider my="md" label="Full Order Actions" labelPosition="center" />
      
      <Group grow>
        <Button
          color="blue"
          variant="filled"
          leftSection={<IconRotateClockwise size={18} />}
          onClick={() => {
            if (window.confirm(`Are you sure you want to SHORT void the entire order #${order.id}?`)) {
              onVoidFullOrder(order.id, 'SHORT');
            }
          }}
          disabled={!hasActiveItems}
        >
          Short Void Full Order
        </Button>
        <Button
          color="red"
          variant="filled"
          leftSection={<IconTrash size={18} />}
          onClick={() => {
             if (window.confirm(`Are you sure you want to LONG void the entire order #${order.id}? This implies waste.`)) {
              onVoidFullOrder(order.id, 'LONG');
            }
          }}
          disabled={!hasActiveItems}
        >
          Long Void Full Order
        </Button>
      </Group>
      <Button onClick={onClose} mt="md" variant="default" fullWidth>
        Close
      </Button>
    </Modal>
  );
}