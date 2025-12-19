// src/app/sales/components/SalesReport.js
"use client";

import { Paper, Title, Group } from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import '@mantine/dates/styles.css';
import SalesTable from '@/components/SalesTable';

export default function SalesReport({ sales, dateRange, onDateChange, onOpenVoidModal, currencySymbol }) {
  return (
    <Paper withBorder p="md">
      <Group justify="space-between" mb="md">
        <Title order={2}>Detailed Sales Report</Title>
        <DatePickerInput
          type="range"
          label="Select date range"
          placeholder="Pick dates range"
          value={dateRange}
          onChange={onDateChange}
          maw={400}
        />
      </Group>
      <SalesTable 
        sales={sales} 
        onOpenVoidModal={onOpenVoidModal} 
        currencySymbol={currencySymbol} // Propagate to table
      />
    </Paper>
  );
}