// src/components/SalesTable.js
"use client";

import { Table, Text, Box, Button, Badge, Group } from '@mantine/core';
import { IconBan, IconPrinter } from '@tabler/icons-react'; // <-- IMPORTED IconPrinter
import { useAuth } from '@/context/AuthContext'; // <-- Import useAuth

const ClientDateTime = ({ date }) => {
  if (!date) return null;
  return new Date(date).toLocaleString();
};

export default function SalesTable({ sales, onOpenVoidModal }) {
  const { hasPermission } = useAuth(); // <-- Use our permission hook
  const canVoid = hasPermission('orders:void'); // <-- Check permission once
  
  // --- ADDED THIS FUNCTION ---
  // We can just assume if a user can see this table, they can print.
  const handlePrint = async (orderId) => {
    try {
      await window.api.printReceipt(orderId);
    } catch (error) {
      console.error("Failed to print receipt:", error);
      // You could show a notification here if you want
    }
  };
  
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
            {/* Only render the Actions column if the user can void */}
            {canVoid && <Table.Th>Actions</Table.Th>}
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {displayedSales.map((sale, index) => {
            const isFullyVoided = sale.status === 'VOIDED';

            return (
              <Table.Tr key={sale.id} style={isFullyVoided ? { backgroundColor: 'var(--mantant-color-red-0)' } : {}}>
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
                   <Badge color={isFullyVoided ? "red" : "green"} variant="light">
                      {isFullyVoided ? "Voided" : "Paid"}
                   </Badge>
                </Table.Td>
                {/* Conditionally render the cell with the button */}
                {canVoid && (
                  <Table.Td>
                    {/* --- START: MODIFIED GROUP --- */}
                    <Group gap="xs">
                      {/* --- ADDED THIS BUTTON --- */}
                      <Button
                        size="xs"
                        color="blue"
                        variant="outline"
                        onClick={() => handlePrint(sale.id)}
                        leftSection={<IconPrinter size={14} />}
                      >
                        Print
                      </Button>
                      
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
                    </Group>
                    {/* --- END: MODIFIED GROUP --- */}
                  </Table.Td>
                )}
              </Table.Tr>
            )
          })}
        </Table.Tbody>
      </Table>
      {sales.length === 0 && <Text mt="md">No sales have been recorded yet.</Text>}
    </>
  );
}