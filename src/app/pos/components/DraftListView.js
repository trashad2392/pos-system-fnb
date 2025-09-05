// src/app/pos/components/DraftListView.js
"use client";

import { Title, Button, Paper, Text, Group, ScrollArea, SimpleGrid, ActionIcon, UnstyledButton } from '@mantine/core';
import { IconArrowLeft, IconX } from '@tabler/icons-react';

export default function DraftListView({ drafts, onResume, onBack, orderType, onDeleteDraft }) {
  return (
    <div>
      <Group justify="space-between" mb="xl">
        <Title order={1}>Drafted {orderType} Orders</Title>
        <Button onClick={onBack} variant="light" leftSection={<IconArrowLeft size={16} />}>
          Back to {orderType} Options
        </Button>
      </Group>
      <Paper p="md" withBorder>
        <ScrollArea style={{ height: '80vh' }}>
          <SimpleGrid cols={{ base: 2, sm: 3, md: 5 }}>
            {drafts.length > 0 ? (
              drafts.map(draft => (
                <Paper
                  key={draft.id}
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
                      if (window.confirm(`Are you sure you want to delete Draft Order #${draft.id}?`)) {
                        onDeleteDraft(draft.id);
                      }
                    }}
                    title="Delete Draft"
                  >
                    <IconX size={16} />
                  </ActionIcon>
                  <UnstyledButton
                    onClick={() => onResume(draft.id)}
                    style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}
                  >
                    <Text>Order #{draft.id}</Text>
                    <Text size="sm" c="dimmed">{new Date(draft.createdAt).toLocaleTimeString()}</Text>
                    <Text size="sm" c="dimmed">{draft.items.length} item(s)</Text>
                  </UnstyledButton>
                </Paper>
              ))
            ) : (
              <Text>No drafted orders found for {orderType}.</Text>
            )}
          </SimpleGrid>
        </ScrollArea>
      </Paper>
    </div>
  );
}