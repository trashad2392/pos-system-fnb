// src/app/pos/components/PaymentModal.js
"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Modal, Title, Text, Button, Group, Divider, Grid, Box, Tabs, Stack, UnstyledButton, Paper, ScrollArea, Select, Badge } from '@mantine/core';
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
  
  // --- MODIFIED STATE FOR CREDIT SALE ---
  const [companies, setCompanies] = useState([]);
  const [allCustomers, setAllCustomers] = useState([]); // All customers with their calculated status
  const [selectedCompanyId, setSelectedCompanyId] = useState(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [customerCreditStatus, setCustomerCreditStatus] = useState(null); // Status of the currently selected customer
  // --- END MODIFIED STATE ---

  const totalAmount = useMemo(() => order?.totalAmount || 0, [order?.totalAmount]);

  // Calculate remaining amount
  const remainingAmount = useMemo(() => {
    const totalPaid = Object.values(splitAmounts).reduce((sum, amount) => sum + (amount || 0), 0);
    return parseFloat((totalAmount - totalPaid).toFixed(2));
  }, [splitAmounts, totalAmount]);
  
  // --- MODIFIED: Filtered Customers for Credit Sale Tab, now uses allCustomers ---
  const filteredCreditCustomers = useMemo(() => {
    // 1. Filter out inactive customers (though getCustomers should only return active ones, this is safer)
    const activeCustomers = allCustomers.filter(c => c.isActive); 
    
    // 2. Filter by company
    // Check if the selected ID points to an actual company
    const selectedCompany = companies.find(c => c.id === Number(selectedCompanyId));
    
    // If no company selected or the selected company is the 'No Company' pseudo-group, show individuals
    if (!selectedCompanyId || selectedCompanyId === '') {
        return activeCustomers.filter(c => c.companyId === null);
    }

    // If a company is selected, show its associated customers
    return activeCustomers.filter(c => c.companyId === selectedCompany.id);
  }, [companies, allCustomers, selectedCompanyId]);

  const companyOptions = useMemo(() => [
    { value: '', label: 'Individual Accounts' },
    ...companies.map(c => ({
      value: c.id.toString(),
      label: c.name
    }))
  ], [companies]);
  
  // --- MODIFIED: Effect to fetch Customer/Company data AND credit status ---
  const fetchCreditData = useCallback(async () => {
    if (!opened || !order) return;
    try {
      const orderTotal = order.totalAmount;
      const companyData = await window.api.getCompanies();
      // Fetch only active customers
      const rawCustomerData = await window.api.getCustomers();
      
      // 1. Fetch current credit status for all customers in parallel
      const creditStatusPromises = rawCustomerData.map(c => 
          window.api.getCustomerCreditStatus(c.id).then(status => {
              // Calculate the theoretical new balance after charging the order
              const theoreticalNewBalance = status.balance - orderTotal;

              // --- FIX: Only flag 'willExceedLimit' if a limit is explicitly set (> 0) ---
              const willExceed = status.creditLimit > 0 && 
                               theoreticalNewBalance < 0 && 
                               Math.abs(theoreticalNewBalance) > status.creditLimit;

              return {
                  ...c,
                  creditStatus: status,
                  willExceedLimit: willExceed, // Use the new, safer calculation
              };
          })
      );
      const customersWithStatus = await Promise.all(creditStatusPromises);
      
      setCompanies(companyData);
      setAllCustomers(customersWithStatus);
      setSelectedCompanyId(''); // Default to individual accounts
    } catch (error) {
      notifications.show({ title: 'Error', message: 'Failed to load credit accounts.', color: 'red' });
      console.error("Failed to load credit accounts:", error);
    }
  }, [opened, order]); // Added order dependency

  // --- MODIFIED: Effect to sync selected customer's credit status ---
  useEffect(() => {
    const selected = allCustomers.find(c => c.id === Number(selectedCustomerId));
    if (selected) {
        setCustomerCreditStatus({
            ...selected.creditStatus,
            willExceedLimit: selected.willExceedLimit, // Expose the pre-calculated flag
            // Ensure availableCredit respects Infinity logic from backend for display
            availableCredit: selected.creditStatus.availableCredit, 
            creditLimit: selected.creditStatus.creditLimit
        });
    } else {
        setCustomerCreditStatus(null);
    }
  }, [selectedCustomerId, allCustomers]);

  // Reset state on modal open/close (updated to use modified state names)
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

  // --- MODIFIED: Credit Sale Confirmation Handler to use calculated status ---
  const handleCreditSaleConfirm = () => {
    if (!selectedCustomerId) {
        return notifications.show({ title: 'Error', message: 'Please select a customer account.', color: 'red' });
    }
    
    const selectedCustomer = allCustomers.find(c => c.id === Number(selectedCustomerId));
    // Check if the current selection would exceed the limit (which should disable the button)
    if (selectedCustomer?.willExceedLimit) {
        return notifications.show({ title: 'Error', message: 'Cannot charge: Transaction would exceed credit limit.', color: 'red' });
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
          <Tabs.Tab value="credit">Credit Sale</Tabs.Tab>
        </Tabs.List>

        {/* --- Pay in Full Tab (Omitted for brevity) --- */}
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

        {/* --- Split Payment Tab (Omitted for brevity) --- */}
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
        
        {/* --- MODIFIED: Credit Sale Tab --- */}
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
                    {filteredCreditCustomers.map(customer => {
                        const isDisabled = customer.willExceedLimit; // Use the pre-calculated flag
                        return (
                            <Grid.Col span={6} key={customer.id}>
                                <UnstyledButton
                                    onClick={() => !isDisabled && setSelectedCustomerId(customer.id)}
                                    disabled={isDisabled} // DISABLE/DIM if over limit
                                    style={{ width: '100%' }}
                                >
                                    <Paper 
                                        withBorder p="md" 
                                        bg={selectedCustomerId === customer.id ? 'blue.0' : 'transparent'} 
                                        opacity={isDisabled ? 0.4 : 1} // DIM if over limit
                                    >
                                        <Group justify="space-between" wrap="nowrap">
                                            <Text fw={500} lineClamp={1} pr="xs">
                                                <IconUser size={16} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                                                {customer.name}
                                            </Text>
                                            {isDisabled && <Badge color="red" variant="filled">OVER LIMIT</Badge>}
                                            {!isDisabled && customer.creditStatus?.balance < 0 && <Badge color="orange" variant="light">DEBT</Badge>}
                                            {!isDisabled && customer.creditStatus?.balance > 0 && <Badge color="green" variant="light">CREDIT</Badge>}
                                        </Group>
                                    </Paper>
                                </UnstyledButton>
                            </Grid.Col>
                        );
                    })}
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

                {/* --- FIX: Only show Credit Limit and Available Credit if limit > 0 --- */}
                {customerCreditStatus?.creditLimit > 0 && (
                  <>
                    <Group justify="space-between">
                        <Text>Credit Limit:</Text>
                        <Text fw={700}>
                            {formatCurrency(customerCreditStatus.creditLimit)}
                        </Text>
                    </Group>
                    
                    <Group justify="space-between">
                        <Text>Available Credit:</Text>
                        <Text fw={700} c={customerCreditStatus?.willExceedLimit ? 'red' : 'green'}>
                            {formatCurrency(customerCreditStatus?.availableCredit ?? 0)}
                        </Text>
                    </Group>
                  </>
                )}
                {/* --- END FIX --- */}
                
                {/* Check if the selected customer is marked as over limit and display the warning */}
                {allCustomers.find(c => c.id === selectedCustomerId)?.willExceedLimit && (
                    <Text c="red" size="sm" mt="sm">
                       This transaction would exceed the available credit limit of {formatCurrency(customerCreditStatus?.creditLimit || 0)}.
                    </Text>
                )}
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
                  // MODIFIED DISABLED LOGIC: Now checks the selected customer's calculated status
                  disabled={activeTab === 'split' 
                      ? Math.abs(remainingAmount) > 0.01 
                      : (!selectedCustomerId || allCustomers.find(c => c.id === Number(selectedCustomerId))?.willExceedLimit)
                  }
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