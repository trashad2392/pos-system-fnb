// src/app/pos/components/PaymentModal.js
"use client";

import { useState, useEffect } from 'react';
import { Modal, Title, Text, Button, Group, Divider, Grid, Box, Tabs, Stack, UnstyledButton, Paper } from '@mantine/core';
import { IconCash, IconCreditCard, IconGiftCard, IconBuildingBank, IconDeviceFloppy, IconWallet } from '@tabler/icons-react';
import Keypad from './Keypad';

const paymentMethods = [
  { name: 'Cash', icon: IconCash, color: 'green' },
  { name: 'Card', icon: IconCreditCard, color: 'blue' },
  { name: 'Wallet', icon: IconWallet, color: 'grape' },
  { name: 'Bank Transfer', icon: IconBuildingBank, color: 'cyan' },
];

const payInFullMethods = paymentMethods.filter(p => p.name !== 'Cash');

export default function PaymentModal({ opened, onClose, order, onConfirmPayment }) {
  const [splitAmounts, setSplitAmounts] = useState({});
  const [activeTab, setActiveTab] = useState('full');
  
  // State for the new keypad-driven input
  const [activeSplitMethod, setActiveSplitMethod] = useState('Card');
  const [keypadInput, setKeypadInput] = useState('');

  const totalAmount = order?.totalAmount || 0;
  const totalPaid = Object.values(splitAmounts).reduce((sum, amount) => sum + (amount || 0), 0);
  const remainingAmount = totalAmount - totalPaid;

  // Reset state when the modal opens or the order changes
  useEffect(() => {
    if (opened && order) {
      const initialAmounts = paymentMethods.reduce((acc, method) => {
        acc[method.name] = 0;
        return acc;
      }, {});
      initialAmounts.Cash = parseFloat(totalAmount.toFixed(2));
      
      setSplitAmounts(initialAmounts);
      setActiveTab('full');
      setActiveSplitMethod('Card'); // Default to Card for editing
      setKeypadInput('');
    }
  }, [opened, order]);

  // This effect links the keypadInput to the splitAmounts state
  useEffect(() => {
    if (activeTab === 'split') {
      const numericValue = parseInt(keypadInput, 10) / 100 || 0;
      handleSplitAmountChange(activeSplitMethod, numericValue);
    }
  }, [keypadInput]);
  
  // Handler for single-payment finalization
  const handleSinglePayment = (method) => {
    onConfirmPayment([{ method, amount: totalAmount }]);
  };

  // Revised handler for split payment changes
  const handleSplitAmountChange = (method, value) => {
    const newAmount = value || 0;
    
    // Calculate total of all OTHER non-cash methods
    const otherNonCashTotal = Object.entries(splitAmounts).reduce((sum, [key, amount]) => {
      if (key !== 'Cash' && key !== method) {
        return sum + (amount || 0);
      }
      return sum;
    }, 0);

    // The max value for this input is the total order amount minus what's already allocated elsewhere
    const maxValueForThisInput = totalAmount - otherNonCashTotal;
    const clampedValue = Math.min(newAmount, maxValueForThisInput);

    const newSplitAmounts = { ...splitAmounts, [method]: clampedValue };

    // Recalculate cash as the remainder
    const newNonCashTotal = otherNonCashTotal + clampedValue;
    newSplitAmounts.Cash = parseFloat((totalAmount - newNonCashTotal).toFixed(2));

    setSplitAmounts(newSplitAmounts);
  };
  
  // When switching active method, update the keypad
  const selectSplitMethod = (method) => {
    if (method === 'Cash') return; // Cash is not editable
    setActiveSplitMethod(method);
    const currentValue = (splitAmounts[method] * 100).toFixed(0);
    setKeypadInput(currentValue === '0' ? '' : currentValue);
  };

  const handleFinalize = () => {
    const payments = Object.entries(splitAmounts)
      .filter(([_, amount]) => amount > 0.001)
      .map(([method, amount]) => ({ method, amount }));

    if (payments.length > 0 && Math.abs(remainingAmount) < 0.001) {
      onConfirmPayment(payments);
    }
  };

  // --- Keypad Handlers ---
  const onNumberPress = (number) => {
    setKeypadInput((current) => (current + number).slice(0, 8));
  };
  const onBackspace = () => {
    setKeypadInput((current) => current.slice(0, -1));
  };
  const onClear = () => {
    setKeypadInput('');
  };

  if (!order) return null;

  return (
    <Modal opened={opened} onClose={onClose} title="Payment" size="lg" centered>
      <Group justify="space-between" mb="md">
        <Box>
          <Text size="lg">Total Due:</Text>
          <Title order={1}>${totalAmount.toFixed(2)}</Title>
        </Box>
        <Box ta="right">
          <Text size="lg" c={Math.abs(remainingAmount) > 0.001 ? 'red' : 'green'}>Remaining:</Text>
          <Title order={1} c={Math.abs(remainingAmount) > 0.001 ? 'red' : 'green'}>
            ${remainingAmount.toFixed(2)}
          </Title>
        </Box>
      </Group>

      <Divider my="md" />

      <Tabs value={activeTab} onChange={setActiveTab}>
        <Tabs.List grow>
          <Tabs.Tab value="full">Pay in Full</Tabs.Tab>
          <Tabs.Tab value="split">Split Payment</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="full" pt="md">
          <Text ta="center" mb="md">Select a method to pay the full amount.</Text>
          <Grid>
            {payInFullMethods.map(method => (
              <Grid.Col span={6} key={method.name}>
                <Button fullWidth size="lg" variant="outline" color={method.color} leftSection={<method.icon />} onClick={() => handleSinglePayment(method.name)}>
                  {method.name}
                </Button>
              </Grid.Col>
            ))}
          </Grid>
        </Tabs.Panel>

        <Tabs.Panel value="split" pt="md">
            <Grid>
                <Grid.Col span={6}>
                    <Stack>
                        {paymentMethods.map(method => (
                            <UnstyledButton key={method.name} onClick={() => selectSplitMethod(method.name)}>
                                <Paper withBorder p="md" bg={activeSplitMethod === method.name ? 'blue.0' : 'transparent'}>
                                    <Group justify="space-between">
                                        <Text fw={500} c={method.name === 'Cash' ? 'dimmed' : 'inherit'}>{method.name}</Text>
                                        <Text fw={700}>${(splitAmounts[method.name] || 0).toFixed(2)}</Text>
                                    </Group>
                                </Paper>
                            </UnstyledButton>
                        ))}
                    </Stack>
                </Grid.Col>
                <Grid.Col span={6}>
                    <Keypad onNumberPress={onNumberPress} onBackspace={onBackspace} onClear={onClear} disabled={activeSplitMethod === 'Cash'}/>
                </Grid.Col>
            </Grid>
        </Tabs.Panel>
      </Tabs>
      
      <Divider my="xl" />

      <Button fullWidth size="xl" h={70} onClick={handleFinalize} disabled={Math.abs(remainingAmount) > 0.001} color="green" leftSection={<IconDeviceFloppy size={24} />}>
        <Title order={3}>Finalize Order</Title>
      </Button>
    </Modal>
  );
}