// src/app/pos/components/PaymentModal.js
"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Modal, Title, Text, Button, Group, Divider, Grid, Box, Tabs, Stack, UnstyledButton, Paper, ScrollArea, Select } from '@mantine/core';
import { IconCash, IconCreditCard, IconWallet, IconBuildingBank, IconCheck, IconBuilding, IconUser } from '@tabler/icons-react';
import Keypad from './Keypad';
import { notifications } from '@mantine/notifications';

const paymentMethods = [
  { name: 'Cash', icon: IconCash, color: 'green' },
  { name: 'Card', icon: IconCreditCard, color: 'blue' },
  { name: 'Wallet', icon: IconWallet, color: 'grape' },
  { name: 'Bank Transfer', icon: IconBuildingBank, color: 'cyan' },
];

const payInFullMethods = paymentMethods.filter(p => p.name !== 'Cash');

function formatCurrency(amount) {
    return `$${Number(amount).toFixed(2)}`;
}

export default function PaymentModal({ opened, onClose, order, onSelectPayment, initialTab = 'full' }) {
  const [splitAmounts, setSplitAmounts] = useState({});
  const [activeTab, setActiveTab] = useState(initialTab);
  const [activeSplitMethod, setActiveSplitMethod] = useState('Card');
  const [keypadInput, setKeypadInput] = useState('');
  
  // --- NEW STATE FOR CREDIT SALE ---
  const [companies, setCompanies] = useState([]);
  const [individualCustomers, setIndividualCustomers] = useState([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [customerCreditStatus, setCustomerCreditStatus] = useState(null);
  // --- END NEW STATE ---

  const totalAmount = useMemo(() => order?.totalAmount || 0, [order?.totalAmount]);

  // Calculate remaining amount (still needed for disabling button)
  const remainingAmount = useMemo(() => {
    const totalPaid = Object.values(splitAmounts).reduce((sum, amount) => sum + (amount || 0), 0);
    return parseFloat((totalAmount - totalPaid).toFixed(2));
  }, [splitAmounts, totalAmount]);
  
  // --- NEW: Filtered Customers for Credit Sale Tab ---
  const filteredCreditCustomers = useMemo(() => {
    if (!companies.length) return [];
    
    // Check if the selected ID points to an actual company
    const selectedCompany = companies.find(c => c.id === Number(selectedCompanyId));
    
    // If no company selected or the selected company is the 'No Company' pseudo-group, show individuals
    if (!selectedCompanyId || selectedCompanyId === '') {
        return individualCustomers;
    }

    // If a company is selected, show its associated customers
    return selectedCompany?.customers || [];
  }, [companies, individualCustomers, selectedCompanyId]);

  const companyOptions = useMemo(() => [
    { value: '', label: 'Individual Accounts' },
    ...companies.map(c => ({
      value: c.id.toString(),
      label: c.name
    }))
  ], [companies]);
  
  // --- NEW: Effect to fetch Customer/Company data ---
  const fetchCreditData = useCallback(async () => {
    if (!opened) return;
    try {
      const companyData = await window.api.getCompanies();
      const customerData = await window.api.getCustomers();
      
      setCompanies(companyData);
      setIndividualCustomers(customerData.filter(c => c.companyId === null));
      setSelectedCompanyId(''); // Default to individual accounts
    } catch (error) {
      notifications.show({ title: 'Error', message: 'Failed to load credit accounts.', color: 'red' });
      console.error("Failed to load credit accounts:", error);
    }
  }, [opened]);

  // --- NEW: Effect to fetch selected customer's credit status ---
  useEffect(() => {
    setCustomerCreditStatus(null);
    if (selectedCustomerId) {
      window.api.getCustomerCreditStatus(selectedCustomerId)
        .then(setCustomerCreditStatus)
        .catch(err => console.error("Failed to fetch credit status:", err));
    }
  }, [selectedCustomerId]);

  // Reset state on modal open/close
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
      
      // Reset Credit Sale state
      setSelectedCustomerId(null);
      setCustomerCreditStatus(null);
      fetchCreditData();

    } else if (!opened) {
       // Clear payment selection state when modal closes
        setSelectedCustomerId(null);
        setCustomerCreditStatus(null);
    }
  }, [opened, order, totalAmount, initialTab, fetchCreditData]);

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

  // --- NEW: Credit Sale Confirmation Handler ---
  const handleCreditSaleConfirm = () => {
    if (!selectedCustomerId) {
        return notifications.show({ title: 'Error', message: 'Please select a customer account.', color: 'red' });
    }
    if (customerCreditStatus?.isOverdue) {
        return notifications.show({ title: 'Error', message: 'Customer has exceeded their credit limit.', color: 'red' });
    }

    // The payment method is 'Credit' and the amount is the order total
    const payments = [{ method: 'Credit', amount: totalAmount, customerId: selectedCustomerId }];
    
    onSelectPayment(payments, 'credit', selectedCustomerId);
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
       // Auto-adjusting cash payment for floating point tolerance (already implemented in original file logic)
       if (Math.abs(remainingAmount) > 0.001 && payments.length > 0) {
           const cashPaymentIndex = payments.findIndex(p => p.method === 'Cash');
           if (cashPaymentIndex !== -1) {
                payments[cashPaymentIndex].amount = parseFloat((payments[cashPaymentIndex].amount + remainingAmount).toFixed(2));
           } else {
               // Adjust last non-cash payment if cash isn't involved (less ideal, but handles edge case)
               payments[payments.length - 1].amount = parseFloat((payments[payments.length - 1].amount + remainingAmount).toFixed(2));
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
      </Group>
      <Divider my="md" />

      <Tabs value={activeTab} onChange={setActiveTab}>
        <Tabs.List grow>
          <Tabs.Tab value="full">Pay in Full</Tabs.Tab>
          <Tabs.Tab value="split">Split Payment</Tabs.Tab>
          <Tabs.Tab value="credit">Credit Sale</Tabs.Tab> {/* <-- NEW TAB */}
        </Tabs.List>

        {/* --- Pay in Full Tab --- */}
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

        {/* --- Split Payment Tab --- */}
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
        
        {/* --- NEW: Credit Sale Tab --- */}
        <Tabs.Panel value="credit" pt="md">
            <Group grow mb="md">
                <Select
                    label="Select Company"
                    placeholder="Individual Accounts"
                    data={companyOptions}
                    value={selectedCompanyId}
                    onChange={setSelectedCompanyId}
                    searchable
                    clearable={false}
                    leftSection={<IconBuilding size={16} />}
                />
            </Group>
            
            <Divider my="md" label="Select Customer" labelPosition="center" />

            <ScrollArea style={{ height: '30vh' }} mb="md">
                <Grid>
                    {filteredCreditCustomers.map(customer => (
                        <Grid.Col span={6} key={customer.id}>
                            <UnstyledButton
                                onClick={() => setSelectedCustomerId(customer.id)}
                                style={{ width: '100%' }}
                            >
                                <Paper withBorder p="md" bg={selectedCustomerId === customer.id ? 'blue.0' : 'transparent'}>
                                    <Group justify="space-between" wrap="nowrap">
                                        <Text fw={500} lineClamp={1} pr="xs">
                                            <IconUser size={16} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                                            {customer.name}
                                        </Text>
                                        <Text size="sm" c="dimmed">{customer.company?.name || 'Individual'}</Text>
                                    </Group>
                                </Paper>
                            </UnstyledButton>
                        </Grid.Col>
                    ))}
                </Grid>
            </ScrollArea>
            
            <Paper withBorder p="md">
                <Title order={5} mb="xs">Credit Status</Title>
                <Group justify="space-between">
                    <Text>Current Balance:</Text>
                    <Text fw={700} c={customerCreditStatus?.balance < 0 ? 'red' : 'green'}>
                        {formatCurrency(customerCreditStatus?.balance ?? 0)}
                    </Text>
                </Group>
                <Group justify="space-between">
                    <Text>Available Credit:</Text>
                    <Text fw={700} c={customerCreditStatus?.isOverdue ? 'red' : 'green'}>
                        {formatCurrency(customerCreditStatus?.availableCredit ?? 0)}
                    </Text>
                </Group>
            </Paper>

        </Tabs.Panel>
      </Tabs>

      {/* Confirm Button for Split / Credit */}
      {(activeTab === 'split' || activeTab === 'credit') && (
          <>
              <Divider my="xl" />
              <Button
                  fullWidth size="xl" h={70}
                  onClick={activeTab === 'credit' ? handleCreditSaleConfirm : handleConfirmSplit}
                  disabled={activeTab === 'split' ? Math.abs(remainingAmount) > 0.01 : !selectedCustomerId || customerCreditStatus?.isOverdue}
                  color={activeTab === 'credit' ? 'orange' : 'blue'}
                  leftSection={<IconCheck size={24} />}
              >
                  <Title order={3}>
                    {activeTab === 'credit' ? 'Charge to Account' : 'Confirm Split'}
                  </Title>
              </Button>
          </>
      )}
    </Modal>
  );
}