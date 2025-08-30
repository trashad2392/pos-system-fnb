// src/app/sales/page.js
"use client";

import { useState, useEffect } from 'react';
import { Title, Paper } from '@mantine/core';
import SalesTable from '@/components/SalesTable';

export default function SalesPage() {
  const [sales, setSales] = useState([]);

  useEffect(() => {
    // This function runs when the component loads, fetching sales via Electron's API
    const fetchSales = async () => {
      try {
        const data = await window.api.getSales();
        setSales(data);
      } catch (error) {
        console.error("Failed to fetch sales:", error);
      }
    };
    fetchSales();
  }, []); // The empty array means this runs once on mount

  return (
    <Paper shadow="xs" p="md" withBorder>
      <Title order={1} mb="xl">Sales Report</Title>
      <SalesTable sales={sales} />
    </Paper>
  );
}