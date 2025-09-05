// src/app/pos/components/TableSelectView.js
"use client";

import { Title, Grid, Button, Paper, Text, Group } from '@mantine/core';
import { IconArrowLeft } from '@tabler/icons-react';

export default function TableSelectView({ tables, onTableSelect, onBack }) {
  return (
    <>
      <Group justify="space-between" mb="xl">
        <Title order={1}>Dine-In</Title>
        <Button onClick={onBack} variant="light" leftSection={<IconArrowLeft size={16} />}>
          Back to Home
        </Button>
      </Group>
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
                  style={{ height: '120px', width: '100%', flexDirection: 'column' }}
                >
                  <Text size="xl" fw={700}>{table.name}</Text>
                  <Text size="sm" c={table.status === 'AVAILABLE' ? 'green' : 'white'}>{table.status}</Text>
                </Button>
              </Grid.Col>
            ))
          ) : (
            <Text p="md">No tables have been created yet. Please add tables in the 'Management' section.</Text>
          )}
        </Grid>
      </Paper>
    </>
  );
}