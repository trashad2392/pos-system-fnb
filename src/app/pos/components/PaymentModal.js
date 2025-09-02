// src/app/pos/components/PaymentModal.js
"use client";

import { Modal, Title, Text, Button, Group, Divider } from '@mantine/core';
import { IconCash, IconCreditCard } from '@tabler/icons-react';

export default function PaymentModal({ opened, onClose, order, onConfirmPayment }) {
  // Don't render anything if there's no order object
  if (!order) return null;

  return (
    <Modal opened={opened} onClose={onClose} title="Finalize and Pay" centered>
      <Text size="lg">Total Amount Due:</Text>
      <Title order={1} ta="center" my="md">${Number(order.totalAmount || 0).toFixed(2)}</Title>
      <Divider my="md" />
      <Text ta="center" mb="md">Select Payment Method:</Text>
      <Group grow>
        {/* These buttons now pass the payment method string to the handler */}
        <Button onClick={() => onConfirmPayment('Cash')} size="lg" leftSection={<IconCash />}>Cash</Button>
        <Button onClick={() => onConfirmPayment('Card')} size="lg" leftSection={<IconCreditCard />}>Card</Button>
      </Group>
    </Modal>
  );
}