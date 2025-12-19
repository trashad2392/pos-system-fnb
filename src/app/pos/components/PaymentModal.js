// src/app/pos/components/PaymentModal.js
"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Modal, Title, Text, Button, Group, Divider, Tabs, Box } from '@mantine/core';
import * as TablerIcons from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';

// New Modular Imports
import FullPaymentTab from './payment/FullPaymentTab';
import SplitPaymentTab from './payment/SplitPaymentTab';
import CreditSaleTab from './payment/CreditSaleTab';

function formatCurrency(amount) {
    return `$${Number(amount).toFixed(2)}`;
}

export default function PaymentModal({ opened, onClose, order, onSelectPayment, initialTab = 'full', paymentMethods = [] }) {
    const [splitAmounts, setSplitAmounts] = useState({});
    const [activeTab, setActiveTab] = useState(initialTab);
    const [activeSplitMethod, setActiveSplitMethod] = useState('Card');
    const [keypadInput, setKeypadInput] = useState('');

    const [companies, setCompanies] = useState([]);
    const [allCustomers, setAllCustomers] = useState([]);
    const [selectedCompanyId, setSelectedCompanyId] = useState(null);
    const [selectedCustomerId, setSelectedCustomerId] = useState(null);
    const [customerCreditStatus, setCustomerCreditStatus] = useState(null);

    const totalAmount = useMemo(() => order?.totalAmount || 0, [order?.totalAmount]);

    const remainingAmount = useMemo(() => {
        const totalPaid = Object.values(splitAmounts).reduce((sum, amount) => sum + (amount || 0), 0);
        return parseFloat((totalAmount - totalPaid).toFixed(2));
    }, [splitAmounts, totalAmount]);

    const payInFullMethods = useMemo(() =>
        paymentMethods.filter(p => p.isActive).sort((a, b) => a.displayOrder - b.displayOrder),
        [paymentMethods]
    );

    const displayedSplitMethods = useMemo(() =>
        paymentMethods.filter(p => p.isActive && p.name !== 'Credit').sort((a, b) => a.displayOrder - b.displayOrder),
        [paymentMethods]
    );

    const selectableSplitMethods = useMemo(() =>
        paymentMethods.filter(p => p.isActive && p.name !== 'Cash' && p.name !== 'Credit').sort((a, b) => a.displayOrder - b.displayOrder),
        [paymentMethods]
    );

    const filteredCreditCustomers = useMemo(() => {
        const activeCustomers = allCustomers.filter(c => c.isActive);
        if (!selectedCompanyId || selectedCompanyId === '') {
            return activeCustomers.filter(c => c.companyId === null);
        }
        return activeCustomers.filter(c => c.companyId === Number(selectedCompanyId));
    }, [allCustomers, selectedCompanyId]);

    const companyOptions = useMemo(() => [
        { value: '', label: 'Individual Accounts' },
        ...companies.map(c => ({ value: c.id.toString(), label: c.name }))
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
                    return { ...c, creditStatus: status, willExceedLimit: willExceed };
                })
            );
            const customersWithStatus = await Promise.all(creditStatusPromises);
            setCompanies(companyData);
            setAllCustomers(customersWithStatus);
            setSelectedCompanyId('');
        } catch (error) {
            notifications.show({ title: 'Error', message: 'Failed to load credit accounts.', color: 'red' });
        }
    }, [opened, order]);

    useEffect(() => {
        const selected = allCustomers.find(c => c.id === Number(selectedCustomerId));
        setCustomerCreditStatus(selected ? { ...selected.creditStatus, willExceedLimit: selected.willExceedLimit } : null);
    }, [selectedCustomerId, allCustomers]);

    useEffect(() => {
        if (opened && order && paymentMethods.length > 0) {
            const initialAmounts = paymentMethods.reduce((acc, method) => {
                acc[method.name] = 0;
                return acc;
            }, {});
            if (initialAmounts['Cash'] !== undefined) initialAmounts.Cash = parseFloat(totalAmount.toFixed(2));
            setSplitAmounts(initialAmounts);
            setActiveTab(initialTab);
            setActiveSplitMethod(selectableSplitMethods[0]?.name || 'Card');
            setKeypadInput('');
            setSelectedCustomerId(null);
            fetchCreditData();
        }
    }, [opened, order, totalAmount, initialTab, paymentMethods, selectableSplitMethods, fetchCreditData]);

    useEffect(() => {
        if (activeTab === 'split' && activeSplitMethod !== 'Cash') {
            const numericValue = parseInt(keypadInput || '0', 10) / 100;
            handleSplitAmountChange(activeSplitMethod, numericValue);
        }
    }, [keypadInput, activeTab, activeSplitMethod]);

    const handleSinglePaymentSelect = (method) => {
        onSelectPayment([{ method, amount: totalAmount }], 'full');
    };

    const handleCreditSaleConfirm = () => {
        if (!selectedCustomerId) return notifications.show({ title: 'Error', message: 'Please select a customer account.', color: 'red' });
        if (allCustomers.find(c => c.id === Number(selectedCustomerId))?.willExceedLimit) {
            return notifications.show({ title: 'Error', message: 'Cannot charge: Transaction would exceed credit limit.', color: 'red' });
        }
        onSelectPayment([{ method: 'Credit', amount: totalAmount, customerId: selectedCustomerId }], 'credit', selectedCustomerId);
    };

    const handleSplitAmountChange = (method, value) => {
        const newAmount = Math.max(0, value || 0);
        setSplitAmounts(prev => {
            const otherTotal = Object.entries(prev).reduce((sum, [key, val]) => (key !== 'Cash' && key !== 'Credit' && key !== method) ? sum + val : sum, 0);
            const clamped = parseFloat(Math.min(newAmount, totalAmount - otherTotal).toFixed(2));
            return { ...prev, [method]: clamped, Cash: parseFloat(Math.max(0, totalAmount - (otherTotal + clamped)).toFixed(2)) };
        });
    };

    const selectSplitMethod = (method) => {
        setActiveSplitMethod(method);
        const currentVal = ((splitAmounts[method] ?? 0) * 100).toFixed(0);
        setKeypadInput(currentVal === '0' ? '' : currentVal);
    };

    const handleConfirmSplit = () => {
        const payments = Object.entries(splitAmounts)
            .filter(([_, amount]) => amount > 0.001)
            .map(([method, amount]) => ({ method, amount: parseFloat(amount.toFixed(2)) }));
        onSelectPayment(payments, 'split');
    };

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

                <Tabs.Panel value="full" pt="md">
                    <FullPaymentTab payInFullMethods={payInFullMethods} onSelectPayment={handleSinglePaymentSelect} />
                </Tabs.Panel>

                <Tabs.Panel value="split" pt="md">
                    <SplitPaymentTab
                        displayedSplitMethods={displayedSplitMethods}
                        activeSplitMethod={activeSplitMethod}
                        splitAmounts={splitAmounts}
                        selectSplitMethod={selectSplitMethod}
                        onNumberPress={(n) => setKeypadInput(prev => (prev + n).slice(0, 8))}
                        onBackspace={() => setKeypadInput(prev => prev.slice(0, -1))}
                        onClear={() => setKeypadInput('')}
                    />
                </Tabs.Panel>

                <Tabs.Panel value="credit" pt="md">
                    <CreditSaleTab
                        companyOptions={companyOptions}
                        selectedCompanyId={selectedCompanyId}
                        setSelectedCompanyId={setSelectedCompanyId}
                        filteredCreditCustomers={filteredCreditCustomers}
                        selectedCustomerId={selectedCustomerId}
                        setSelectedCustomerId={setSelectedCustomerId}
                        customerCreditStatus={customerCreditStatus}
                        formatCurrency={formatCurrency}
                    />
                </Tabs.Panel>
            </Tabs>

            {(activeTab === 'split' || activeTab === 'credit') && (
                <>
                    <Divider my="xl" />
                    <Button
                        fullWidth size="xl" h={70}
                        onClick={activeTab === 'credit' ? handleCreditSaleConfirm : handleConfirmSplit}
                        disabled={activeTab === 'split' ? Math.abs(remainingAmount) > 0.01 : !selectedCustomerId}
                        color={activeTab === 'credit' ? 'orange' : 'blue'}
                        leftSection={<TablerIcons.IconCheck size={24} />}
                    >
                        <Title order={3}>{activeTab === 'credit' ? 'Charge to Account' : 'Confirm Split'}</Title>
                    </Button>
                </>
            )}
        </Modal>
    );
}