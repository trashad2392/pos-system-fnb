// src/app/pos/components/PaymentModal.js
"use client";

import { Modal, Tabs, Button, Group, Text, Title, Paper, Stack, Divider, Alert, Box } from '@mantine/core';
import { IconCash, IconCreditCard, IconUsers, IconAlertCircle } from '@tabler/icons-react';
import { useState, useEffect, useMemo, useCallback } from 'react';
import FullPaymentTab from './payment/FullPaymentTab';
import SplitPaymentTab from './payment/SplitPaymentTab';
import CreditSaleTab from './payment/CreditSaleTab';

export default function PaymentModal({ 
    order, 
    opened, 
    onClose, 
    onSelectPayment, 
    initialTab = 'full', 
    paymentMethods = [],
    posSettings // Received from PosPage
}) {
    const [activeTab, setActiveTab] = useState(initialTab);
    const [splitAmounts, setSplitAmounts] = useState({});
    const [activeSplitMethod, setActiveSplitMethod] = useState(null);
    const [keypadInput, setKeypadInput] = useState('');

    // Dynamic Currency Symbol with mandatory space
    const currencySymbol = `${posSettings?.currency_symbol || '$'} `;

    // Credit Sale State
    const [selectedCompanyId, setSelectedCompanyId] = useState('');
    const [selectedCustomerId, setSelectedCustomerId] = useState(null);
    const [companies, setCompanies] = useState([]);
    const [customers, setCustomers] = useState([]);

    // Reset tab and state when opened
    useEffect(() => {
        if (opened) {
            setActiveTab(initialTab);
            setSplitAmounts({});
            setActiveSplitMethod(null);
            setKeypadInput('');
            setSelectedCustomerId(null);
        }
    }, [initialTab, opened]);

    // Fetch Companies and Customers for Credit Sale
    useEffect(() => {
        if (opened && activeTab === 'credit') {
            const fetchCreditData = async () => {
                try {
                    const [companyData, customerData] = await Promise.all([
                        window.api.getCompanies(),
                        window.api.getCustomers()
                    ]);
                    setCompanies(companyData);
                    setCustomers(customerData);
                } catch (err) {
                    console.error("Failed to load credit data", err);
                }
            };
            fetchCreditData();
        }
    }, [opened, activeTab]);

    const payInFullMethods = useMemo(() => 
        paymentMethods.filter(m => m.name !== 'Credit' && m.isActive), 
    [paymentMethods]);

    const splitEnabledMethods = useMemo(() => 
        paymentMethods.filter(m => m.name !== 'Credit' && m.isActive), 
    [paymentMethods]);

    // Keypad Logic for Split Payment
    const handleNumberPress = (num) => {
        if (!activeSplitMethod) return;
        
        const currentVal = keypadInput === '0' ? '' : keypadInput;
        const newVal = (currentVal + num).slice(0, 8);
        setKeypadInput(newVal);
        
        const amount = parseFloat(newVal) || 0;
        setSplitAmounts(prev => ({
            ...prev,
            [activeSplitMethod]: amount
        }));
    };

    const handleBackspace = () => {
        if (!activeSplitMethod) return;
        
        const newVal = keypadInput.slice(0, -1);
        setKeypadInput(newVal);
        
        const amount = newVal === '' ? 0 : (parseFloat(newVal) || 0);
        setSplitAmounts(prev => ({
            ...prev,
            [activeSplitMethod]: amount
        }));
    };

    const handleClear = () => {
        if (!activeSplitMethod) return;
        setKeypadInput('');
        setSplitAmounts(prev => ({
            ...prev,
            [activeSplitMethod]: 0
        }));
    };

    const totalSplitAssigned = Object.values(splitAmounts).reduce((a, b) => a + b, 0);
    const remainingToAssign = Math.max(0, (order?.totalAmount || 0) - totalSplitAssigned);

    const handleConfirmSplit = () => {
        const payments = Object.entries(splitAmounts)
            .filter(([_, amt]) => amt > 0)
            .map(([method, amount]) => ({ method, amount }));
        
        onSelectPayment(payments, 'split');
    };

    const handleConfirmCredit = () => {
        if (selectedCustomerId) {
            onSelectPayment([{ method: 'Credit', amount: order.totalAmount }], 'credit', selectedCustomerId);
        }
    };

    const formatCurrency = (amt) => `${currencySymbol}${Number(amt).toFixed(2)}`;

    return (
        <Modal 
            opened={opened} 
            onClose={onClose} 
            title={<Title order={3}>Payment: {formatCurrency(order?.totalAmount || 0)}</Title>}
            size="70%"
            padding="xl"
            closeOnClickOutside={false}
        >
            <Tabs value={activeTab} onChange={setActiveTab}>
                <Tabs.List grow mb="md">
                    <Tabs.Tab value="full" leftSection={<IconCash size={18} />}>
                        Pay in Full
                    </Tabs.Tab>
                    <Tabs.Tab value="split" leftSection={<IconCreditCard size={18} />}>
                        Split Payment
                    </Tabs.Tab>
                    <Tabs.Tab value="credit" leftSection={<IconUsers size={18} />}>
                        Credit Sale
                    </Tabs.Tab>
                </Tabs.List>

                {/* 1. Full Payment Tab */}
                <Tabs.Panel value="full">
                    <FullPaymentTab 
                        payInFullMethods={payInFullMethods}
                        onSelectPayment={(methodName) => onSelectPayment([{ method: methodName, amount: order.totalAmount }], 'full')}
                    />
                </Tabs.Panel>

                {/* 2. Split Payment Tab */}
                <Tabs.Panel value="split">
                    <SplitPaymentTab 
                        displayedSplitMethods={splitEnabledMethods}
                        activeSplitMethod={activeSplitMethod}
                        splitAmounts={splitAmounts}
                        selectSplitMethod={(methodName) => {
                            setActiveSplitMethod(methodName);
                            setKeypadInput(splitAmounts[methodName]?.toString() || '');
                        }}
                        onNumberPress={handleNumberPress}
                        onBackspace={handleBackspace}
                        onClear={handleClear}
                        currencySymbol={currencySymbol}
                    />

                    <Divider my="md" />

                    <Group justify="space-between">
                        <Stack gap={0}>
                            <Text size="sm" c={remainingToAssign > 0.01 ? 'orange' : 'dimmed'}>
                                Remaining: {formatCurrency(remainingToAssign)}
                            </Text>
                            <Text size="sm" fw={700}>
                                Total Assigned: {formatCurrency(totalSplitAssigned)}
                            </Text>
                        </Stack>
                        
                        <Button 
                            size="lg" 
                            disabled={Math.abs(remainingToAssign) > 0.01}
                            onClick={handleConfirmSplit}
                            color="blue"
                        >
                            Confirm Split Payment
                        </Button>
                    </Group>
                    
                    {remainingToAssign > 0.01 && (
                        <Alert icon={<IconAlertCircle size={16} />} color="orange" mt="sm" variant="light">
                            Assigned amounts must match the total bill exactly.
                        </Alert>
                    )}
                </Tabs.Panel>

                {/* 3. Credit Sale Tab */}
                <Tabs.Panel value="credit">
                    <CreditSaleTab 
                        companyOptions={[
                            { value: '', label: 'Individual Accounts' },
                            ...companies.map(c => ({ value: c.id.toString(), label: c.name }))
                        ]}
                        selectedCompanyId={selectedCompanyId}
                        setSelectedCompanyId={setSelectedCompanyId}
                        filteredCreditCustomers={customers.filter(c => {
                            if (selectedCompanyId === '') return !c.companyId;
                            return c.companyId === parseInt(selectedCompanyId, 10);
                        })}
                        selectedCustomerId={selectedCustomerId}
                        setSelectedCustomerId={setSelectedCustomerId}
                        customerCreditStatus={customers.find(c => c.id === selectedCustomerId)}
                        formatCurrency={formatCurrency}
                    />

                    <Box mt="xl">
                        <Button 
                            fullWidth 
                            size="lg" 
                            disabled={!selectedCustomerId}
                            onClick={handleConfirmCredit}
                            color="indigo"
                        >
                            Finalize Credit Sale
                        </Button>
                    </Box>
                </Tabs.Panel>
            </Tabs>
        </Modal>
    );
}