// src/app/pos/components/PaymentModal.js
"use client";

import { useState, useEffect, useMemo } from 'react';
import { Modal, Title, Text, Button, Group, Divider, Grid, Box, Tabs, Stack, UnstyledButton, Paper } from '@mantine/core';
import { IconCash, IconCreditCard, IconGiftCard, IconBuildingBank, IconDeviceFloppy, IconWallet, IconCheck } from '@tabler/icons-react';
import Keypad from './Keypad';
import { notifications } from '@mantine/notifications';

const paymentMethods = [
  { name: 'Cash', icon: IconCash, color: 'green' },
  { name: 'Card', icon: IconCreditCard, color: 'blue' },
  { name: 'Wallet', icon: IconWallet, color: 'grape' },
  { name: 'Bank Transfer', icon: IconBuildingBank, color: 'cyan' },
];

const payInFullMethods = paymentMethods.filter(p => p.name !== 'Cash');

export default function PaymentModal({ opened, onClose, order, onSelectPayment, initialTab = 'full' }) {
  const [splitAmounts, setSplitAmounts] = useState({});
  const [activeTab, setActiveTab] = useState(initialTab);
  const [activeSplitMethod, setActiveSplitMethod] = useState('Card');
  const [keypadInput, setKeypadInput] = useState('');

  const totalAmount = useMemo(() => order?.totalAmount || 0, [order?.totalAmount]);

  // Calculate remaining amount (still needed for disabling button)
  const remainingAmount = useMemo(() => {
    const totalPaid = Object.values(splitAmounts).reduce((sum, amount) => sum + (amount || 0), 0);
    return parseFloat((totalAmount - totalPaid).toFixed(2));
  }, [splitAmounts, totalAmount]);

  // Reset state
  useEffect(() => {
    if (opened && order) {
      const initialAmounts = paymentMethods.reduce((acc, method) => {
        acc[method.name] = 0;
        return acc;
      }, {});
      initialAmounts.Cash = parseFloat(totalAmount.toFixed(2));
      setSplitAmounts(initialAmounts);
      setActiveTab(initialTab);
      const firstEditableMethod = paymentMethods.find(p => p.name !== 'Cash')?.name || paymentMethods[0].name;
      setActiveSplitMethod(initialTab === 'split' ? firstEditableMethod : 'Card');
      setKeypadInput('');
    }
  }, [opened, order, totalAmount, initialTab]);

  // Link keypad
  useEffect(() => {
    if (activeTab === 'split' && activeSplitMethod !== 'Cash') {
      const numericValue = parseInt(keypadInput || '0', 10) / 100;
      handleSplitAmountChange(activeSplitMethod, numericValue);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keypadInput]);

  // Handlers
  const handleSinglePaymentSelect = (method) => {
    onSelectPayment([{ method, amount: totalAmount }], 'full');
  };

  const handleSplitAmountChange = (method, value) => {
    if (method === 'Cash') return;
    const newAmount = Math.max(0, value || 0);
    setSplitAmounts(prevAmounts => {
        const currentOtherNonCashTotal = Object.entries(prevAmounts).reduce((sum, [key, amount]) => {
            if (key !== 'Cash' && key !== method) { return sum + (amount || 0); }
            return sum;
        }, 0);
        const maxAllowed = Math.max(0, totalAmount - currentOtherNonCashTotal);
        const clampedValue = parseFloat(Math.min(newAmount, maxAllowed).toFixed(2));
        const newTotalNonCash = currentOtherNonCashTotal + clampedValue;
        const newCashAmount = parseFloat(Math.max(0, totalAmount - newTotalNonCash).toFixed(2));
        return { ...prevAmounts, [method]: clampedValue, Cash: newCashAmount };
    });
  };

  const selectSplitMethod = (method) => {
    if (method === 'Cash') return;
    setActiveSplitMethod(method);
    const currentAmount = splitAmounts[method] ?? 0;
    const currentValue = (currentAmount * 100).toFixed(0);
    setKeypadInput(currentValue === '0' ? '' : currentValue);
  };

  const handleConfirmSplit = () => {
    const payments = Object.entries(splitAmounts)
      .filter(([_, amount]) => amount > 0.001)
      .map(([method, amount]) => ({ method, amount: parseFloat(amount.toFixed(2)) }));

    if (payments.length > 0 && Math.abs(remainingAmount) < 0.01) {
       if (Math.abs(remainingAmount) > 0.001 && payments.length > 0 && payments[payments.length - 1].method !== 'Cash') {
          payments[payments.length - 1].amount = parseFloat((payments[payments.length - 1].amount + remainingAmount).toFixed(2));
       } else if (Math.abs(remainingAmount) > 0.001 && payments.find(p => p.method === 'Cash')) {
           const cashPaymentIndex = payments.findIndex(p => p.method === 'Cash');
           if (cashPaymentIndex !== -1) {
                payments[cashPaymentIndex].amount = parseFloat((payments[cashPaymentIndex].amount + remainingAmount).toFixed(2));
           }
       }
      const finalPayments = payments.filter(p => p.amount > 0.001);
      onSelectPayment(finalPayments, 'split');
    } else {
        notifications.show({ title: 'Error', message: 'Split amounts do not match total due.', color: 'red' });
    }
  };

  const onNumberPress = (number) => {
    if (activeSplitMethod === 'Cash') return;
    if (keypadInput === '0' && number === '0') return;
    if (keypadInput === '' && number === '0') { setKeypadInput('0'); return; }
    const newValue = (keypadInput === '0' ? '' : keypadInput) + number;
    setKeypadInput(newValue.slice(0, 8));
  };
  const onBackspace = () => { if (activeSplitMethod !== 'Cash') setKeypadInput((current) => current.slice(0, -1)); };
  const onClear = () => { if (activeSplitMethod !== 'Cash') setKeypadInput(''); };

  if (!order) return null;

  return (
    <Modal opened={opened} onClose={onClose} title="Select Payment Method" size="lg" centered>
      <Group justify="space-between" mb="md">
        {/* Total Due always visible */}
        <Box>
          <Text size="lg">Total Due:</Text>
          <Title order={1}>${totalAmount.toFixed(2)}</Title>
        </Box>
        {/* --- REMOVED Remaining Amount Box --- */}
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
                <Button fullWidth size="lg" variant="outline" color={method.color} leftSection={<method.icon />} onClick={() => handleSinglePaymentSelect(method.name)}>
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
                            <UnstyledButton key={method.name} onClick={() => selectSplitMethod(method.name)} disabled={method.name === 'Cash'}>
                                <Paper withBorder p="md" bg={activeSplitMethod === method.name && method.name !== 'Cash' ? 'blue.0' : 'transparent'} opacity={method.name === 'Cash' ? 0.6 : 1}>
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

      {/* Confirm Button for Split */}
      {activeTab === 'split' && (
          <>
              <Divider my="xl" />
              <Button
                  fullWidth size="xl" h={70}
                  onClick={handleConfirmSplit}
                  disabled={Math.abs(remainingAmount) > 0.01}
                  color="blue"
                  leftSection={<IconCheck size={24} />}
              >
                  <Title order={3}>Confirm Split</Title>
              </Button>
          </>
      )}
    </Modal>
  );
}