// src/app/print/receipt/page.js
"use client";

import { useState, useEffect, Fragment, useRef } from 'react';
import { Box, Text, Title, Group, Divider, Center, Loader } from '@mantine/core';
import './receipt.css'; 

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
  const [settings, setSettings] = useState({
    currency_symbol: 'EGP',
    tax_label: 'VAT',
    tax_rate: 14,
    tax_inclusive: true
  });
  const [error, setError] = useState(null);
  const printInitiatedRef = useRef(false);

  useEffect(() => {
    const fetchReceiptData = async () => {
      try {
        await new Promise(resolve => setTimeout(resolve, 50));

        if (!window.api || typeof window.api.getReceiptData !== 'function') {
          setError("API is not available. Cannot fetch data.");
          return;
        }

        // Fetch Order Data and General Settings simultaneously
        const [orderData, posSettings] = await Promise.all([
          window.api.getReceiptData(),
          window.api.getPosSettings()
        ]);

        if (posSettings) {
          setSettings({
            currency_symbol: posSettings.currency_symbol || 'EGP',
            tax_label: posSettings.tax_label || 'VAT',
            tax_rate: posSettings.tax_rate !== undefined ? parseFloat(posSettings.tax_rate) : 14,
            tax_inclusive: posSettings.tax_inclusive !== undefined ? posSettings.tax_inclusive === 'true' : true,
          });
        }

        if (orderData) {
          setOrder(orderData);
          
          setTimeout(() => {
            if (!printInitiatedRef.current && window.api && typeof window.api.triggerPrintDialog === 'function') { 
              window.api.triggerPrintDialog();
              printInitiatedRef.current = true;
            }
          }, 500); // Increased delay slightly to ensure settings are rendered
        } else {
          setError("Failed to retrieve receipt data.");
        }
      } catch (err) {
        console.error("Error fetching receipt data:", err);
        setError(err.message);
      }
    };

    fetchReceiptData();
  }, []);

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
        <Text ml="sm">Waiting for data...</Text>
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
    subtotal,
    totalAmount,
    refundAmount,
  } = order;

  // Calculate Order Discount
  const orderDiscountAmount = (discount && subtotal > totalAmount) ? (subtotal - totalAmount) : 0;

  // TAX CALCULATIONS
  let displaySubtotal = totalAmount; // Default for Inclusive
  let taxAmount = 0;

  if (settings.tax_inclusive) {
    // If tax is inclusive, the totalAmount already has the tax.
    // Formula: Tax = Total - (Total / (1 + Rate))
    taxAmount = totalAmount - (totalAmount / (1 + (settings.tax_rate / 100)));
    displaySubtotal = totalAmount - taxAmount; // Show subtotal before tax
  } else {
    // If tax is exclusive, the tax is added on top of the subtotal (which is totalAmount in your current logic)
    // Note: Assuming totalAmount passed from POS already includes item discounts but NOT exclusive tax
    taxAmount = totalAmount * (settings.tax_rate / 100);
    displaySubtotal = totalAmount;
  }

  const finalTotal = displaySubtotal + taxAmount;
  const currency = settings.currency_symbol;

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

      {/* Items Mapping */}
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
             } else {
                itemPrice -= item.discount.value;
             }
          }
          
          const finalItemTotal = itemPrice * item.quantity;

          return (
            <Fragment key={item.id}>
              <Group justify="space-between" wrap="nowrap" gap="xs" className={isVoided ? 'voided-item' : ''}>
                <Text className="item-name">{item.quantity} x {item.product.name}</Text>
                <Text className="item-price">
                  {isVoided ? `(VOIDED)` : `${currency} ${finalItemTotal.toFixed(2)}`}
                </Text>
              </Group>
              
              {item.selectedModifiers.map(mod => (
                <Box key={mod.id} className={`modifiers-list ${isVoided ? 'voided-item' : ''}`}>
                  <Group justify="space-between" wrap="nowrap" gap="xs">
                    <Text className="modifier-name">
                      &nbsp;&nbsp;&bull; {mod.modifierOption.name} {mod.quantity > 1 ? `(x${mod.quantity})` : ''}
                    </Text>
                    {mod.modifierOption.priceAdjustment > 0 && (
                      <Text className="modifier-price">
                        +{currency} {(mod.modifierOption.priceAdjustment * mod.quantity).toFixed(2)}
                      </Text>
                    )}
                  </Group>
                </Box>
              ))}
            </Fragment>
          );
        })}
      </Box>

      <Divider my="sm" variant="dashed" />

      {/* Totals Section */}
      <Group justify="space-between">
        <Text>Subtotal (excl. {settings.tax_label}):</Text>
        <Text>{currency} {displaySubtotal.toFixed(2)}</Text>
      </Group>

      <Group justify="space-between">
        <Text>{settings.tax_label} ({settings.tax_rate}%):</Text>
        <Text>{currency} {taxAmount.toFixed(2)}</Text>
      </Group>

      {orderDiscountAmount > 0 && (
        <Group justify="space-between">
          <Text>Order Discount:</Text>
          <Text c="red">-{currency} {orderDiscountAmount.toFixed(2)}</Text>
        </Group>
      )}

      <Group justify="space-between" mt="xs">
        <Title order={5}>Total:</Title>
        <Title order={5}>{currency} {finalTotal.toFixed(2)}</Title>
      </Group>
      
      {refundAmount > 0 && (
         <Group justify="space-between" mt="xs">
            <Title order={5} c="red">Refunded:</Title>
            <Title order={5} c="red">-{currency} {refundAmount.toFixed(2)}</Title>
         </Group>
      )}

      <Divider my="sm" variant="dashed" />

      {/* Payments */}
      <Title order={5} mb="xs">Payments:</Title>
      {payments.map((p, index) => (
        <Group key={index} justify="space-between">
          <Text>{p.method}:</Text>
          <Text>{currency} {p.amount.toFixed(2)}</Text>
        </Group>
      ))}
      
      <Center mt="xl">
        <Text size="sm">Thank you for your visit!</Text>
      </Center>
    </Box>
  );
}