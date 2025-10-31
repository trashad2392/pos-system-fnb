// src/app/print/receipt/page.js
"use client";

import { useState, useEffect, Fragment } from 'react';
import { Box, Text, Title, Group, Divider, Center, Loader } from '@mantine/core';
import './receipt.css'; 

// A simple component to handle client-side date formatting
function ClientDateTime({ date }) {
  const [formatted, setFormatted] = useState('');
  useEffect(() => {
    if (date) {
      setFormatted(new Date(date).toLocaleString());
    }
  }, [date]);
  return <>{formatted}</>;
}

export default function ReceiptPage() {
  const [order, setOrder] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    // --- START: MODIFIED LOGIC (PULL DATA) ---
    const fetchReceiptData = async () => {
      try {
        // Wait a tiny moment to ensure preload.js has injected the API
        await new Promise(resolve => setTimeout(resolve, 50));

        if (!window.api || typeof window.api.getReceiptData !== 'function') {
          console.error("window.api.getReceiptData is not available.");
          setError("API is not available. Cannot fetch data.");
          return;
        }

        console.log("Receipt page mounted. Calling window.api.getReceiptData()...");
        const orderData = await window.api.getReceiptData();

        if (orderData) {
          console.log("Receipt data received!", orderData);
          setOrder(orderData);
          
          // Wait a brief moment for React to render the new state
          // Then, tell the main process to open the print dialog
          setTimeout(() => {
            if (window.api && typeof window.api.triggerPrintDialog === 'function') {
              console.log("Triggering print dialog...");
              window.api.triggerPrintDialog();
            } else {
              console.error("window.api.triggerPrintDialog is not available.");
            }
          }, 250); // 250ms delay to ensure DOM is updated
        } else {
          console.error("Received null or undefined data from getReceiptData.");
          setError("Failed to retrieve receipt data.");
        }
      } catch (err) {
        console.error("Error fetching receipt data:", err);
        setError(err.message);
      }
    };

    fetchReceiptData();
    // --- END: MODIFIED LOGIC ---
  }, []); // Empty dependency array ensures this runs once on mount

  if (error) {
     return (
      <Center className="receipt-container">
        <Box>
          <Text c="red" fw={700}>Error:</Text>
          <Text c="red">{error}</Text>
        </Box>
      </Center>
     );
  }

  if (!order) {
    return (
      <Center className="receipt-container" style={{ height: '100vh', boxSizing: 'border-box' }}>
        <Loader />
        <Text ml="sm">Waiting for order data...</Text>
      </Center>
    );
  }

  const {
    id,
    createdAt,
    user,
    table,
    orderType,
    items,
    payments,
    discount,
    subtotal, // This is the pre-order-discount subtotal
    totalAmount, // This is the final amount charged
    refundAmount, // Amount refunded from voids
  } = order;

  // Calculate discount amount based on subtotal and final total
  const orderDiscountAmount = (discount && subtotal > totalAmount) ? (subtotal - totalAmount) : 0;

  return (
    <Box className="receipt-container">
      <Center>
        <Title order={4} mb="md">Store Receipt</Title>
      </Center>
      
      <Text>Order #{id}</Text>
      <Text><ClientDateTime date={createdAt} /></Text>
      <Text>Cashier: {user?.name || 'N/A'}</Text>
      <Text>{orderType} {table ? `- ${table.name}` : ''}</Text>
      
      <Divider my="sm" variant="dashed" />

      {/* Items */}
      <Box>
        {items.map(item => {
          const isVoided = item.status === 'VOIDED';
          let itemPrice = item.priceAtTimeOfOrder;
          
          const modifiersTotal = (item.selectedModifiers || []).reduce((modSum, mod) => {
             const priceAdjustment = mod.modifierOption ? mod.modifierOption.priceAdjustment : 0;
             return modSum + (priceAdjustment * mod.quantity);
          }, 0);
          
          itemPrice += modifiersTotal; 
          
          if (item.discount) {
             if (item.discount.type === 'PERCENT') {
                itemPrice *= (1 - item.discount.value / 100);
             } else { // FIXED
                itemPrice -= item.discount.value;
             }
          }
          
          const finalItemTotal = itemPrice * item.quantity;

          return (
            <Fragment key={item.id}>
              <Group justify="space-between" wrap="nowrap" gap="xs" className={isVoided ? 'voided-item' : ''}>
                <Text className="item-name">{item.quantity} x {item.product.name}</Text>
                <Text className="item-price">
                  {isVoided ? `(VOIDED)` : `$${finalItemTotal.toFixed(2)}`}
                </Text>
              </Group>
              
              {item.selectedModifiers.length > 0 && (
                <Box className={`modifiers-list ${isVoided ? 'voided-item' : ''}`}>
                  {item.selectedModifiers.map(mod => (
                    <Group key={mod.id} justify="space-between" wrap="nowrap" gap="xs">
                      <Text className="modifier-name">
                        &nbsp;&nbsp;&bull; {mod.modifierOption.name} {mod.quantity > 1 ? `(x${mod.quantity})` : ''}
                      </Text>
                      {mod.modifierOption.priceAdjustment > 0 && (
                        <Text className="modifier-price">
                          +${(mod.modifierOption.priceAdjustment * mod.quantity).toFixed(2)}
                        </Text>
                      )}
                    </Group>
                  ))}
                </Box>
              )}
            </Fragment>
          );
        })}
      </Box>

      <Divider my="sm" variant="dashed" />

      {/* Totals */}
      <Group justify="space-between">
        <Text>Subtotal:</Text>
        <Text>${subtotal.toFixed(2)}</Text>
      </Group>
      {discount && (
        <Group justify="space-between">
          <Text>Order Discount ({discount.name}):</Text>
          <Text c="red">-${orderDiscountAmount.toFixed(2)}</Text>
        </Group>
      )}
      <Group justify="space-between" mt="xs">
        <Title order={5}>Total:</Title>
        <Title order={5}>${totalAmount.toFixed(2)}</Title>
      </Group>
      
      {refundAmount > 0 && (
         <Group justify="space-between" mt="xs">
            <Title order={5} c="red">Refunded:</Title>
            <Title order={5} c="red">-${refundAmount.toFixed(2)}</Title>
         </Group>
      )}


      <Divider my="sm" variant="dashed" />

      {/* Payments */}
      <Title order={5} mb="xs">Payments:</Title>
      {payments.map((p, index) => (
        <Group key={index} justify="space-between">
          <Text>{p.method}:</Text>
          <Text>${p.amount.toFixed(2)}</Text>
        </Group>
      ))}
      
      <Center mt="xl">
        <Text size="sm">Thank you for your visit!</Text>
      </Center>
    </Box>
  );
}