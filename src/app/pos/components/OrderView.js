// src/app/pos/components/OrderView.js
"use client";

import { useState, useEffect } from 'react';
import { Title, Grid, Button, Paper, Text, Group, Divider, Center, Box, Alert } from '@mantine/core';
import { IconCash, IconInfoCircle, IconCurrencyDollar } from '@tabler/icons-react';
import Keypad from './Keypad';
import ActionSidebar from './ActionSidebar';
import MenuPanel from './MenuPanel';
import CartPanel from './CartPanel';
import styles from './OrderView.module.css'; 

export default function OrderView({
  order,
  onBack,
  menu,
  onProductSelect,
  onUpdateQuantity,
  onRemoveItem,
  onFinalize,
  onHold,
  onClearOrder,
  selectedItemId,
  onSelectItem,
  onOpenCommentModal,
  onFastCash,
  onOpenDiscountModal,
  selectedPaymentMethods,
  openPaymentModal,
  posSettings,
}) {
  const [keypadInput, setKeypadInput] = useState('');
  const isCartEmpty = !order || !order.items || order.items.length === 0;

  // FIXED: Always append a space after the symbol for better visual spacing
  const rawSymbol = posSettings?.currency_symbol || '$';
  const currencySymbol = `${rawSymbol} `; 

  useEffect(() => {
    setKeypadInput('');
  }, [selectedItemId]);

  const handleNumberPress = (number) => {
    if (!selectedItemId) return;
    const currentVal = keypadInput === '0' ? '' : keypadInput;
    const newString = (currentVal + number).slice(0, 4);
    setKeypadInput(newString);
    const newQuantity = parseInt(newString, 10);
    if (!isNaN(newQuantity)) onUpdateQuantity(selectedItemId, newQuantity);
  };

  const handleBackspace = () => {
    if (!selectedItemId) return;
    const newString = keypadInput.slice(0, -1);
    setKeypadInput(newString);
    if (newString === '') onUpdateQuantity(selectedItemId, 1);
    else {
        const newQuantity = parseInt(newString, 10);
        if (!isNaN(newQuantity)) onUpdateQuantity(selectedItemId, newQuantity);
    }
  };

  const handleClear = () => {
    if (!selectedItemId) return;
    setKeypadInput('');
    onUpdateQuantity(selectedItemId, 1);
  };

  const calculateItemTotal = (item) => {
    if (!item) return 0;
    const basePrice = item.priceAtTimeOfOrder || 0;
    const modifiersPrice = (item.selectedModifiers || []).reduce((acc, mod) => {
      const priceAdjustment = mod?.modifierOption?.priceAdjustment || 0;
      const quantity = mod?.quantity || 0;
      return acc + (priceAdjustment * quantity);
    }, 0);
    return (basePrice + modifiersPrice) * (item.quantity || 0);
  };

  const subtotal = order?.items?.reduce((sum, item) => sum + calculateItemTotal(item), 0) || 0;
  
  let totalDiscountValue = 0;
  if (order?.discount) {
    const minAmount = order.discount.minimumOrderAmount || 0;
    if (subtotal >= minAmount) {
      if (order.discount.type === 'PERCENT') {
        totalDiscountValue = subtotal * (order.discount.value / 100);
      } else {
        totalDiscountValue = order.discount.value;
      }
      totalDiscountValue = Math.min(subtotal, totalDiscountValue);
    }
  }

  const formatPaymentMethods = (methods) => {
    if (!methods || methods.length === 0) return null;
    const creditPayment = methods.find(p => p.method === 'Credit');
    if (creditPayment) return 'Credit Sale';
    if (methods.length === 1) return methods[0].method;
    return 'Split Payment';
  };

  const selectedPaymentText = formatPaymentMethods(selectedPaymentMethods);
  const FinalPaymentButtonIcon = selectedPaymentMethods ? IconCurrencyDollar : IconCash;
  const finalPaymentButtonText = selectedPaymentMethods
    ? (selectedPaymentMethods.some(p => p.method === 'Credit') ? 'Charge Account' : `Pay by ${selectedPaymentText}`)
    : 'Fast Cash';
  const finalPaymentButtonAction = selectedPaymentMethods ? onFinalize : onFastCash;
  const finalPaymentButtonColor = selectedPaymentMethods ? 'blue' : 'green';

  const totalGridHeight = 'calc(100vh - 100px)'; 

  const columnStyle = {
      height: totalGridHeight,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden' 
  };

  return (
    <Grid gutter="xs" style={{ height: totalGridHeight, overflow: 'hidden' }}>
      <Grid.Col span={{ base: 12, xs: 1.5 }} style={{ minWidth: 65, ...columnStyle }}>
        <ActionSidebar
          order={order}
          isCartEmpty={isCartEmpty}
          selectedItemId={selectedItemId}
          onOpenCommentModal={onOpenCommentModal}
          onOpenDiscountModal={onOpenDiscountModal}
          onHold={onHold}
          onClearOrder={onClearOrder}
          openPaymentModal={openPaymentModal}
        />
      </Grid.Col>

      <Grid.Col span={{ base: 12, xs: 3 }} style={columnStyle}>
        <Group justify="space-between" align="center" mb="xs" style={{ flexShrink: 0, paddingBottom: 5 }}>
          <Title order={3}>Cart</Title>
           {selectedPaymentMethods && (
            <Alert
              icon={<IconInfoCircle size=".9rem" />}
              variant="unstyled"
              p={0}
              className={styles.transparentAlert}
              classNames={{ message: styles.flashingAlertMessage }}
            >
              {selectedPaymentText}
            </Alert>
          )}
        </Group>

        <Box style={{ flexGrow: 1, flexShrink: 1, minHeight: 0 }}>
            <CartPanel
              order={order}
              isCartEmpty={isCartEmpty}
              selectedItemId={selectedItemId}
              onSelectItem={onSelectItem}
              onRemoveItem={onRemoveItem}
              calculateItemTotal={calculateItemTotal}
              currencySymbol={currencySymbol} 
            />
        </Box>

        <Box style={{ flexShrink: 0, marginTop: 8 }}>
            <Keypad 
              onNumberPress={handleNumberPress} 
              onBackspace={handleBackspace} 
              onClear={handleClear} 
              disabled={selectedItemId === null} 
            />
            
            <Box p="xs" pt={0}>
                <Divider my="xs" />
                
                {totalDiscountValue > 0.001 && (
                <>
                    <Group justify="space-between">
                      <Text size="sm">Subtotal:</Text>
                      <Text size="sm">{currencySymbol}{subtotal.toFixed(2)}</Text>
                    </Group>
                    <Group justify="space-between">
                      <Text size="sm" c="red">Discount:</Text>
                      <Text size="sm" c="red">- {currencySymbol}{totalDiscountValue.toFixed(2)}</Text>
                    </Group>
                </>
                )}
                
                <Group justify="space-between" mb="xs">
                    <Title order={3}>Total:</Title>
                    <Title order={3}>{currencySymbol}{Number(order?.totalAmount || 0).toFixed(2)}</Title>
                </Group>

                <Button
                    size="xl"
                    fullWidth
                    disabled={isCartEmpty}
                    onClick={finalPaymentButtonAction}
                    color={finalPaymentButtonColor}
                    leftSection={<FinalPaymentButtonIcon size={24} />}
                >
                    {finalPaymentButtonText}
                </Button>
            </Box>
        </Box>
      </Grid.Col>

      <Grid.Col span={{ base: 12, xs: 7.5 }} style={columnStyle}>
        <MenuPanel
          order={order}
          onBack={onBack}
          menu={menu}
          onProductSelect={onProductSelect}
          currencySymbol={currencySymbol} 
        />
      </Grid.Col>
    </Grid>
  );
}