// src/app/sales/components/Dashboard.js
"use client";

import { Paper, Title, Text, SimpleGrid, Group, Center, Box, Badge } from '@mantine/core';
import { IconCash, IconReceipt, IconChartBar, IconTrophy, IconArrowUpRight, IconArrowDownRight } from '@tabler/icons-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { DatePickerInput } from '@mantine/dates';
import '@mantine/dates/styles.css';

function ComparisonBadge({ current, previous }) {
  if (previous === 0) {
    if (current > 0) return <Badge color="green">+100%</Badge>;
    return <Badge color="gray">0%</Badge>;
  }
  const percentChange = ((current - previous) / previous) * 100;
  const isPositive = percentChange >= 0;

  return (
    <Badge
      color={isPositive ? 'green' : 'red'}
      variant="light"
      leftSection={isPositive ? <IconArrowUpRight size={14} /> : <IconArrowDownRight size={14} />}
    >
      {percentChange.toFixed(1)}% vs. previous period
    </Badge>
  );
}

function StatCard({ title, value, icon: Icon, comparison }) {
  return (
    <Paper withBorder p="md" radius="md">
      <Group>
        <Center style={{ width: 48, height: 48, borderRadius: '50%', backgroundColor: 'var(--mantine-color-blue-1)' }}>
          <Icon size={24} color="var(--mantine-color-blue-6)" />
        </Center>
        <div>
          <Text c="dimmed" size="xs" tt="uppercase" fw={700}>{title}</Text>
          <Title order={3}>{value}</Title>
        </div>
      </Group>
      {comparison !== undefined && <Group justify="right" mt="xs">{comparison}</Group>}
    </Paper>
  );
}

export default function Dashboard({ stats, comparisonStats, chartData, dateRange, onDateChange }) {
  if (!stats) {
    return <Text>Loading stats...</Text>;
  }

  return (
    <div>
      <Group justify="space-between" mb="md">
        <Title order={2}>Dashboard</Title>
        <DatePickerInput
          type="range"
          label="Select date range"
          placeholder="Pick dates range"
          value={dateRange}
          onChange={onDateChange}
          maw={400}
        />
      </Group>

      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} mb="xl">
        <StatCard
          title="Total Revenue"
          value={`$${stats.totalRevenue.toFixed(2)}`}
          icon={IconCash}
          comparison={<ComparisonBadge current={stats.totalRevenue} previous={comparisonStats.totalRevenue} />}
        />
        <StatCard
          title="Total Sales"
          value={stats.totalSales}
          icon={IconReceipt}
          comparison={<ComparisonBadge current={stats.totalSales} previous={comparisonStats.totalSales} />}
        />
        <StatCard title="Average Sale Value" value={`$${stats.averageSaleValue.toFixed(2)}`} icon={IconChartBar} />
        <StatCard title="Best Seller" value={`${stats.bestSellingItem.name} (x${stats.bestSellingItem.quantity})`} icon={IconTrophy} />
      </SimpleGrid>

      <Title order={3} mb="md">Sales Over Time</Title>
      
      {/* --- START OF CHANGES --- */}
      <Box style={{ height: '400px', width: '100%' }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip formatter={(value) => `$${value}`} />
            <Legend />
            <Bar dataKey="total" fill="var(--mantine-color-blue-6)" name="Revenue" />
          </BarChart>
        </ResponsiveContainer>
      </Box>
      {/* --- END OF CHANGES --- */}

    </div>
  );
}