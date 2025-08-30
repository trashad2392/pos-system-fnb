// src/components/SalesTable.js
"use client";

import { Table, Text } from '@mantine/core';

// This component is fine, no changes needed here.
// We'll assume it exists at '@/components/ClientDateTime.js'
const ClientDateTime = ({ date }) => {
  if (!date) return null;
  // Using toLocaleString for a user-friendly format
  return new Date(date).toLocaleString(); 
};

export default function SalesTable({ sales }) {
  return (
    <>
      <Table striped highlightOnHover withTableBorder withColumnBorders>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Sale ID</Table.Th>
            <Table.Th>Date & Time</Table.Th>
            <Table.Th>Items Sold</Table.Th>
            <Table.Th>Total Amount</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {sales.map((sale) => (
            // --- CHANGE 1: Use sale.id for the key ---
            <Table.Tr key={sale.id}>
              {/* --- CHANGE 2: Use sale.id for the display --- */}
              <Table.Td>{sale.id}</Table.Td>
              <Table.Td>
                <ClientDateTime date={sale.created_at} />
              </Table.Td>
              <Table.Td>
                <div>
                  {sale.items.map((item, index) => (
                    <p key={index} style={{ margin: 0, padding: '2px 0', fontSize: '14px' }}>
                      {/* --- CHANGE 3: Use item.product.name to get the name --- */}
                      {`${item.product.name} (x${item.quantity}) @ $${Number(item.price_at_sale).toFixed(2)}`}
                    </p>
                  ))}
                </div>
              </Table.Td>
              <Table.Td>${Number(sale.total_amount).toFixed(2)}</Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
      {sales.length === 0 && <Text mt="md">No sales have been recorded yet.</Text>}
    </>
  );
}