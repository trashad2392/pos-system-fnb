// src/app/print/receipt/page.js
"use client";

import { useState, useEffect, Fragment, useRef } from 'react';
import { Box, Text, Title, Group, Divider, Center, Loader } from '@mantine/core';
import './receipt.css'; 

function ClientDateTime({ date }) {
  const [formatted, setFormatted] = useState('');
  useEffect(() => {
    if (date) setFormatted(new Date(date).toLocaleString());
  }, [date]);
  return <>{formatted}</>;
}

export default function ReceiptPage() {
  const [order, setOrder] = useState(null);
  const [settings, setSettings] = useState({
    currency_symbol: 'EGP',
    tax_label: 'VAT',
    tax_rate: 14
  });
  const [error, setError] = useState(null);
  const printInitiatedRef = useRef(false);

  useEffect(() => {
    const fetchReceiptData = async () => {
      try {
        const [orderData, posSettings] = await Promise.all([
          window.api.getReceiptData(),
          window.api.getPosSettings()
        ]);

        if (posSettings) {
          setSettings({
            currency_symbol: posSettings.currency_symbol || 'EGP',
            tax_label: posSettings.tax_label || 'VAT',
            tax_rate: posSettings.tax_rate !== undefined ? parseFloat(posSettings.tax_rate) : 14,
          });
        }

        if (orderData) {
          setOrder(orderData);
          setTimeout(() => {
            if (!printInitiatedRef.current && window.api) { 
              window.api.triggerPrintDialog();
              printInitiatedRef.current = true;
            }
          }, 500); 
        } else {
          setError("Failed to retrieve receipt data.");
        }
      } catch (err) {
        setError(err.message);
      }
    };
    fetchReceiptData();
  }, []);

  if (error) return <Center><Text c="red">{error}</Text></Center>;
  if (!order) return <Center style={{ height: '100vh' }}><Loader /></Center>;

  const { id, createdAt, user, table, orderType, items, payments, discount, subtotal, totalAmount } = order;

  // Tax Logic (Always Inclusive)
  const taxRate = settings.tax_rate;
  const currency = settings.currency_symbol;

  // Derive tax from the total amount stored in DB
  const taxAmount = totalAmount - (totalAmount / (1 + (taxRate / 100)));
  const netSubtotal = totalAmount - taxAmount;

  let orderDiscountAmount = 0;
  if (discount) {
    if (discount.type === 'PERCENT') orderDiscountAmount = subtotal * (discount.value / 100);
    else orderDiscountAmount = discount.value;
  }

  return (
    <Box className="receipt-container">
      <Center><Title order={4} mb="md">Store Receipt</Title></Center>
      <Text>Order #{id}</Text>
      <Text><ClientDateTime date={createdAt} /></Text>
      <Text>Cashier: {user?.name || 'N/A'}</Text>
      <Text>{orderType} {table ? `- ${table.name}` : ''}</Text>
      <Divider my="sm" variant="dashed" />

      <Box>
        {items.map(item => (
          <Fragment key={item.id}>
            <Group justify="space-between" wrap="nowrap" className={item.status === 'VOIDED' ? 'voided-item' : ''}>
              <Text className="item-name">{item.quantity} x {item.product.name}</Text>
              <Text className="item-price">
                {item.status === 'VOIDED' ? '(VOIDED)' : `${currency} ${(item.priceAtTimeOfOrder * item.quantity).toFixed(2)}`}
              </Text>
            </Group>
          </Fragment>
        ))}
      </Box>

      <Divider my="sm" variant="dashed" />

      <Group justify="space-between">
        <Text>Subtotal (Net):</Text>
        <Text>{currency} {netSubtotal.toFixed(2)}</Text>
      </Group>

      <Group justify="space-between">
        <Text>{settings.tax_label} ({settings.tax_rate}%):</Text>
        <Text>{currency} {taxAmount.toFixed(2)}</Text>
      </Group>

      {orderDiscountAmount > 0 && (
        <Group justify="space-between">
          <Text>Discount:</Text>
          <Text c="red">-{currency} {orderDiscountAmount.toFixed(2)}</Text>
        </Group>
      )}

      <Group justify="space-between" mt="xs">
        <Title order={5}>Total:</Title>
        <Title order={5}>{currency} {totalAmount.toFixed(2)}</Title>
      </Group>

      <Divider my="sm" variant="dashed" />
      <Title order={5} mb="xs">Payments:</Title>
      {payments.map((p, index) => (
        <Group key={index} justify="space-between">
          <Text>{p.method}:</Text>
          <Text>{currency} {p.amount.toFixed(2)}</Text>
        </Group>
      ))}
      <Center mt="xl"><Text size="sm">Thank you!</Text></Center>
    </Box>
  );
}