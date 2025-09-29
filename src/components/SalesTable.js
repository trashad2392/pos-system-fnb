// src/components/SalesTable.js
"use client";

import { Table, Text, Box } from '@mantine/core';

const ClientDateTime = ({ date }) => {
  if (!date) return null;
  return new Date(date).toLocaleString();
};

export default function SalesTable({ sales }) {
  const displayedSales = [...sales].reverse();

  return (
    <>
      <Table striped highlightOnHover withTableBorder withColumnBorders>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Sale #</Table.Th>
            <Table.Th>Date & Time</Table.Th>
            <Table.Th>Type</Table.Th>
            <Table.Th>Payment Method</Table.Th>
            <Table.Th>Items Sold</Table.Th>
            <Table.Th>Total Amount</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {displayedSales.map((sale, index) => (
            <Table.Tr key={sale.id}>
              <Table.Td>{index + 1}</Table.Td>
              <Table.Td>
                <ClientDateTime date={sale.createdAt} />
              </Table.Td>
              <Table.Td>{sale.orderType}</Table.Td>
              <Table.Td>{sale.paymentMethod || 'N/A'}</Table.Td>
              <Table.Td>
                {sale.items.map((item) => (
                  <Box key={item.id} mb="xs">
                    <Text size="sm" fw={500}>
                      {item.product.name} (x{item.quantity})
                    </Text>
                    {item.selectedModifiers && item.selectedModifiers.length > 0 && (
                      <Box pl="sm">
                        {item.selectedModifiers.map(mod => (
                          <Text key={mod.id} size="xs" c="dimmed">
                            &bull; {mod.modifierOption.name}
                            {mod.quantity > 1 ? ` (x${mod.quantity})` : ''}
                          </Text>
                        ))}
                      </Box>
                    )}
                  </Box>
                ))}
              </Table.Td>
              <Table.Td>${Number(sale.totalAmount).toFixed(2)}</Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
      {sales.length === 0 && <Text mt="md">No sales have been recorded yet.</Text>}
    </>
  );
}