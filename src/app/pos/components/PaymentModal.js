// src/app/pos/components/PaymentModal.js
"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Modal, Title, Text, Button, Group, Divider, Grid, Box, Tabs, Stack, UnstyledButton, Paper, ScrollArea, Select, Badge } from '@mantine/core';
import * as TablerIcons from '@tabler/icons-react'; // <-- IMPORT ALL ICONS
import Keypad from './Keypad';
import { notifications } from '@mantine/notifications';

// --- Helper function to get Icon Component from string name ---
const getPaymentIconComponent = (iconName) => {
    // Lookup the component dynamically, defaulting to IconCheck if not found
    return TablerIcons[iconName] || TablerIcons.IconCheck;
}

function formatCurrency(amount) {
    return `$${Number(amount).toFixed(2)}`;
}

// --- MODIFIED PROPS: Added paymentMethods ---
export default function PaymentModal({ opened, onClose, order, onSelectPayment, initialTab = 'full', paymentMethods = [] }) {
  const [splitAmounts, setSplitAmounts] = useState({});
  const [activeTab, setActiveTab] = useState(initialTab);
  const [activeSplitMethod, setActiveSplitMethod] = useState('Card');
  const [keypadInput, setKeypadInput] = useState('');
  
  // Renamed to availablePaymentMethods to reflect that they are received via props/hook
  const availablePaymentMethods = paymentMethods; 
  
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
  
  // --- MODIFIED LOGIC: Filtered Methods using dynamic properties ---
  const payInFullMethods = useMemo(() => 
    // Show all active methods
    availablePaymentMethods.filter(p => p.isActive).sort((a, b) => a.displayOrder - b.displayOrder), 
    [availablePaymentMethods]
  );
  
  const displayedSplitMethods = useMemo(() => 
    // All methods that appear in the split list (selectable + Cash remainder)
    availablePaymentMethods.filter(p => p.isActive && p.name !== 'Credit')
    .sort((a, b) => a.displayOrder - b.displayOrder), 
    [availablePaymentMethods]
  );

  const selectableSplitMethods = useMemo(() => 
    // Show all active methods EXCEPT Cash and Credit
    availablePaymentMethods.filter(p => p.isActive && p.name !== 'Cash' && p.name !== 'Credit')
    .sort((a, b) => a.displayOrder - b.displayOrder), 
    [availablePaymentMethods]
  );
  // --- END MODIFIED LOGIC ---
  
  
  const filteredCreditCustomers = useMemo(() => {
    const activeCustomers = allCustomers.filter(c => c.isActive); 
    const selectedCompany = companies.find(c => c.id === Number(selectedCompanyId));
    
    if (!selectedCompanyId || selectedCompanyId === '') {
        return activeCustomers.filter(c => c.companyId === null);
    }

    return activeCustomers.filter(c => c.companyId === selectedCompany.id);
  }, [companies, allCustomers, selectedCompanyId]);

  const companyOptions = useMemo(() => [
    { value: '', label: 'Individual Accounts' },
    ...companies.map(c => ({
      value: c.id.toString(),
      label: c.name
    }))
  ], [companies]);
  
  const fetchCreditData = useCallback(async () => {
    if (!opened || !order) return;
    try {
      const orderTotal = order.totalAmount;
      const companyData = await window.api.getCompanies();
      const rawCustomerData = await window.api.getCustomers();
      
      const creditStatusPromises = rawCustomerData.map(c => 
          window.api.getCustomerCreditStatus(c.id).then(status => {
              const theoreticalNewBalance = status.balance - orderTotal;
              const willExceed = status.creditLimit > 0 && 
                               theoreticalNewBalance < 0 && 
                               Math.abs(theoreticalNewBalance) > status.creditLimit;

              return {
                  ...c,
                  creditStatus: status,
                  willExceedLimit: willExceed, 
              };
          })
      );
      const customersWithStatus = await Promise.all(creditStatusPromises);
      
      setCompanies(companyData);
      setAllCustomers(customersWithStatus);
      setSelectedCompanyId(''); 
    } catch (error) {
      notifications.show({ title: 'Error', message: 'Failed to load credit accounts.', color: 'red' });
      console.error("Failed to load credit accounts:", error);
    }
  }, [opened, order]); 

  useEffect(() => {
    const selected = allCustomers.find(c => c.id === Number(selectedCustomerId));
    if (selected) {
        setCustomerCreditStatus({
            ...selected.creditStatus,
            willExceedLimit: selected.willExceedLimit, 
            availableCredit: selected.creditStatus.availableCredit, 
            creditLimit: selected.creditStatus.creditLimit
        });
    } else {
        setCustomerCreditStatus(null);
    }
  }, [selectedCustomerId, allCustomers]);


  // Reset state on modal open/close (updated to use dynamic methods)
  useEffect(() => {
    if (opened && order && availablePaymentMethods.length > 0) {
      
      // Initialize split amounts for all known methods
      const initialAmounts = availablePaymentMethods.reduce((acc, method) => {
        acc[method.name] = 0;
        return acc;
      }, {});
      
      // Default to paying the full amount in Cash if available
      if (initialAmounts['Cash'] !== undefined) {
         initialAmounts.Cash = parseFloat(totalAmount.toFixed(2));
      }
      
      setSplitAmounts(initialAmounts);
      setActiveTab(initialTab);
      // Default to first selectable split method (Card, Wallet, etc.)
      const firstEditableMethod = selectableSplitMethods[0]?.name || '';
      setActiveSplitMethod(firstEditableMethod || 'Card'); // Fallback if list is empty
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened, order, totalAmount, initialTab, availablePaymentMethods.length]); 
  
  // Initial fetch on open if credit data is empty
  useEffect(() => {
     if (opened && !companies.length) {
         fetchCreditData();
     }
  }, [opened, companies.length, fetchCreditData]);


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

  const handleCreditSaleConfirm = () => {
    if (!selectedCustomerId) {
        return notifications.show({ title: 'Error', message: 'Please select a customer account.', color: 'red' });
    }
    
    const selectedCustomer = allCustomers.find(c => c.id === Number(selectedCustomerId));
    if (selectedCustomer?.willExceedLimit) {
        return notifications.show({ title: 'Error', message: 'Cannot charge: Transaction would exceed credit limit.', color: 'red' });
    }

    const payments = [{ method: 'Credit', amount: totalAmount, customerId: selectedCustomerId }];
    
    onSelectPayment(payments, 'credit', selectedCustomerId);
  };
  
  const handleSplitAmountChange = (method, value) => {
    if (method === 'Cash' || method === 'Credit') return;
    const newAmount = Math.max(0, value || 0);
    setSplitAmounts(prevAmounts => {
        const currentOtherNonCashTotal = Object.entries(prevAmounts).reduce((sum, [key, amount]) => {
            // Only sum explicit non-cash, non-credit, non-current-method inputs
            if (key !== 'Cash' && key !== 'Credit' && key !== method && availablePaymentMethods.some(m => m.name === key)) { 
                return sum + (amount || 0); 
            }
            return sum;
        }, 0);
        
        const maxAllowed = parseFloat(Math.max(0, totalAmount - currentOtherNonCashTotal).toFixed(2));
        const clampedValue = parseFloat(Math.min(newAmount, maxAllowed).toFixed(2));
        
        const newTotalNonCash = parseFloat((currentOtherNonCashTotal + clampedValue).toFixed(2));
        
        // Cash absorbs the remainder (this is why Cash must exist in availablePaymentMethods)
        const newCashAmount = parseFloat(Math.max(0, totalAmount - newTotalNonCash).toFixed(2));
        
        // We ensure Cash is updated, and the current non-cash method is updated
        return { ...prevAmounts, [method]: clampedValue, Cash: newCashAmount };
    });
  };

  const selectSplitMethod = (method) => {
    if (method === 'Cash' || method === 'Credit') return;
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
       // Auto-adjust cash payment for floating point tolerance
       if (Math.abs(remainingAmount) > 0.001 && payments.length > 0) {
           const cashPaymentIndex = payments.findIndex(p => p.method === 'Cash');
           if (cashPaymentIndex !== -1) {
                payments[cashPaymentIndex].amount = parseFloat((payments[cashPaymentIndex].amount + remainingAmount).toFixed(2));
           } else {
               // Fallback: Adjust the last payment in the list (if no cash)
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
    if (activeSplitMethod === 'Cash' || activeSplitMethod === 'Credit') return;
    if (keypadInput === '0' && number === '0') return;
    if (keypadInput === '' && number === '0') { setKeypadInput('0'); return; }
    const newValue = (keypadInput === '0' ? '' : keypadInput) + number;
    setKeypadInput(newValue.slice(0, 8));
  };
  const onBackspace = () => { if (activeSplitMethod !== 'Cash' && activeSplitMethod !== 'Credit') setKeypadInput((current) => current.slice(0, -1)); };
  const onClear = () => { if (activeSplitMethod !== 'Cash' && activeSplitMethod !== 'Credit') setKeypadInput(''); };

  if (!order) return null;

  return (
    <Modal opened={opened} onClose={onClose} title="Select Payment Method" size="lg" centered>
      <Group justify="space-between" mb="md">
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

        {/* --- Pay in Full Tab --- */}
        <Tabs.Panel value="full" pt="md">
          <Text ta="center" mb="md">Select a method to pay the full amount.</Text>
          <Grid>
            {payInFullMethods.map(method => {
                // Check if it's a custom image first
                const isCustom = method.iconSourceType === 'custom' && method.customIconUrl;
                // Use the iconName for presets, which is now saved in the database
                const IconComponent = getPaymentIconComponent(method.iconName); 

                return (
                  <Grid.Col span={6} key={method.name}>
                    <Button 
                      fullWidth 
                      // 🔥 MODIFIED: Increased button size
                      size="xl" 
                      variant="outline" 
                      color={method.color} // Use dynamic color
                      onClick={() => handleSinglePaymentSelect(method.name)}
                      // 🔥 MODIFIED: Increased height for better icon/text spacing
                      style={{ height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}
                    >
                      {isCustom ? (
                        <img 
                            src={method.customIconUrl} 
                            alt={method.name} 
                            // 🔥 MODIFIED: Increased image size
                            style={{ width: '72px', height: '72px', objectFit: 'contain', marginBottom: '5px' }}
                        />
                      ) : (
                        // 🔥 MODIFIED: Increased IconComponent size
                        <IconComponent size={36} style={{ marginBottom: '5px' }} />
                      )}
                      {/* 🔥 MODIFIED: Made text larger and bolder */}
                      <Text size="xl" fw={700}>
                        {method.name}
                      </Text>
                    </Button>
                  </Grid.Col>
                );
            })}
          </Grid>
        </Tabs.Panel>

        {/* --- Split Payment Tab --- */}
        <Tabs.Panel value="split" pt="md">
            <Grid>
                <Grid.Col span={6}>
                    <Stack>
                        {/* --- MODIFIED: Use displayedSplitMethods for the buttons (excludes Credit) --- */}
                        {displayedSplitMethods.map(method => {
                            // Split input is NOT editable for Cash
                            const isEditable = method.name !== 'Cash'; 
                            return (
                                <UnstyledButton 
                                    key={method.name} 
                                    onClick={() => selectSplitMethod(method.name)} 
                                    disabled={!isEditable} 
                                >
                                    <Paper 
                                        withBorder p="md" 
                                        // Use dynamic color for active state
                                        bg={activeSplitMethod === method.name && isEditable ? `${method.color}.0` : 'transparent'} 
                                        opacity={isEditable ? 1 : 0.6} // Dim Cash
                                    >
                                        <Group justify="space-between">
                                            <Text fw={500} c={isEditable ? 'inherit' : 'dimmed'}>{method.name}</Text>
                                            <Text fw={700}>${(splitAmounts[method.name] || 0).toFixed(2)}</Text>
                                        </Group>
                                    </Paper>
                                </UnstyledButton>
                            );
                        })}
                        {/* --- END MODIFIED --- */}
                    </Stack>
                </Grid.Col>
                <Grid.Col span={6}>
                    {/* Keypad is disabled if Cash is the active method for editing */}
                    <Keypad onNumberPress={onNumberPress} onBackspace={onBackspace} onClear={onClear} disabled={activeSplitMethod === 'Cash' || activeSplitMethod === 'Credit'}/>
                </Grid.Col>
            </Grid>
        </Tabs.Panel>
        
        {/* --- Credit Sale Tab (Unchanged) --- */}
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
                    leftSection={<TablerIcons.IconBuilding size={16} />}
                />
            </Group>
            
            <Divider my="md" label="Select Customer" labelPosition="center" />

            <ScrollArea style={{ height: '30vh' }} mb="md">
                <Grid>
                    {filteredCreditCustomers.map(customer => {
                        const isDisabled = customer.willExceedLimit; 
                        return (
                            <Grid.Col span={6} key={customer.id}>
                                <UnstyledButton
                                    onClick={() => !isDisabled && setSelectedCustomerId(customer.id)}
                                    disabled={isDisabled} 
                                    style={{ width: '100%' }}
                                >
                                    <Paper 
                                        withBorder p="md" 
                                        bg={selectedCustomerId === customer.id ? 'blue.0' : 'transparent'} 
                                        opacity={isDisabled ? 0.4 : 1} 
                                    >
                                        <Group justify="space-between" wrap="nowrap">
                                            <Text fw={500} lineClamp={1} pr="xs">
                                                <TablerIcons.IconUser size={16} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                                                {customer.name}
                                            </Text>
                                            {isDisabled && <Badge color="red" variant="filled">OVER LIMIT</Badge>}
                                            {!isDisabled && customer.creditStatus?.balance < 0 && <Badge color="orange" variant="light">DEBT</Badge>}
                                            {!isDisabled && customer.creditStatus?.balance > 0 && <Badge color="green" variant="light">CREDIT</Badge>}
                                            {!isDisabled && customer.creditStatus?.balance === 0 && <Badge color="gray" variant="light">ZERO</Badge>}
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
                  disabled={activeTab === 'split' 
                      ? Math.abs(remainingAmount) > 0.01 
                      : (!selectedCustomerId || allCustomers.find(c => c.id === Number(selectedCustomerId))?.willExceedLimit)
                  }
                  color={activeTab === 'credit' ? 'orange' : 'blue'}
                  leftSection={<TablerIcons.IconCheck size={24} />}
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