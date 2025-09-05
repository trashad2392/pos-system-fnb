// src/app/pos/components/OrderTypeHubView.js
"use client";

import { Title, Button, Paper, Center, Stack, Group } from '@mantine/core';
import { IconPlus, IconFileText, IconArrowLeft } from '@tabler/icons-react';

export default function OrderTypeHubView({ orderType, onNewOrder, onShowDrafts, onBack }) {
  return (
    <div>
      <Group justify="space-between" mb="xl">
        <Title order={1}>{orderType} Orders</Title>
        <Button onClick={onBack} variant="light" leftSection={<IconArrowLeft size={16} />}>
          Back to Home
        </Button>
      </Group>
      <Paper p="xl" withBorder>
        <Center>
          <Stack>
            <Button onClick={() => onNewOrder(orderType)} size="xl" leftSection={<IconPlus size={30}/>}>
              Start New {orderType} Order
            </Button>
            <Button onClick={() => onShowDrafts(orderType)} size="xl" leftSection={<IconFileText size={30}/>} variant="outline">
              View Drafted Orders
            </Button>
          </Stack>
        </Center>
      </Paper>
    </div>
  );
}