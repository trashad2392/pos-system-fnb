// src/components/SalesTable.js
"use client";

import { Table, Text, Box, Button, Badge, Group } from '@mantine/core';
import { IconBan } from '@tabler/icons-react';

const ClientDateTime = ({ date }) => {
  if (!date) return null;
  return new Date(date).toLocaleString();
};

export default function SalesTable({ sales, onOpenVoidModal }) {
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
            <Table.Th>Adjusted Total</Table.Th>
            <Table.Th>Status</Table.Th>
            <Table.Th>Actions</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {displayedSales.map((sale, index) => {
            const isFullyVoided = sale.status === 'VOIDED';
            const hasActiveItems = sale.items.some(item => item.status === 'ACTIVE');

            return (
              <Table.Tr key={sale.id} style={isFullyVoided ? { backgroundColor: 'var(--mantine-color-red-0)' } : {}}>
                <Table.Td>{index + 1}</Table.Td>
                <Table.Td>
                  <ClientDateTime date={sale.createdAt} />
                </Table.Td>
                <Table.Td>{sale.orderType}</Table.Td>
                <Table.Td>{sale.paymentMethod || 'N/A'}</Table.Td>
                <Table.Td>
                  {sale.items.map((item) => (
                    <Box 
                      key={item.id} 
                      mb="xs" 
                      style={item.status === 'VOIDED' ? { textDecoration: 'line-through', color: 'var(--mantine-color-gray-6)' } : {}}
                    >
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
                      {item.status === 'VOIDED' && <Badge color="red" variant="light" size="xs">VOIDED ({item.voidType})</Badge>}
                    </Box>
                  ))}
                </Table.Td>
                <Table.Td fw={700}>${Number(sale.totalAmount).toFixed(2)}</Table.Td>
                <Table.Td>
                  {isFullyVoided ? (
                    <Badge color="red" variant="filled">VOIDED</Badge>
                  ) : !hasActiveItems ? (
                    // This case should be rare now but good for safety
                    <Badge color="red" variant="filled">VOIDED</Badge>
                  ) : (sale.items.length > 0 && !hasActiveItems) ? (
                    <Badge color="red" variant="filled">VOIDED</Badge>
                  ) : (sale.items.some(i => i.status === 'VOIDED')) ? (
                    <Badge color="orange" variant="light">Partially Voided</Badge>
                  ) : (
                    <Badge color="green" variant="light">Paid</Badge>
                  )}
                </Table.Td>
                 <Table.Td>
                  {sale.status === 'PAID' && (
                    <Button
                      size="xs"
                      color="red"
                      variant="outline"
                      onClick={() => onOpenVoidModal(sale.id)}
                      leftSection={<IconBan size={14} />}
                    >
                      Void / Edit
                    </Button>
                  )}
                </Table.Td>
              </Table.Tr>
            )
          })}
        </Table.Tbody>
      </Table>
      {sales.length === 0 && <Text mt="md">No sales have been recorded yet.</Text>}
    </>
  );
}