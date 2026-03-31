// src/app/pos/components/PaymentModal.js
"use client";

import { Modal, Tabs, Button, Group, Text, Title, Paper, Stack, Divider, Box } from '@mantine/core';
import { IconCash, IconCreditCard, IconUsers } from '@tabler/icons-react';
import { useState, useEffect, useMemo } from 'react';
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
    posSettings 
}) {
    const [activeTab, setActiveTab] = useState(initialTab);
    const [splitAmounts, setSplitAmounts] = useState({});
    const [activeSplitMethod, setActiveSplitMethod] = useState(null);
    const [keypadInput, setKeypadInput] = useState('');

    const currencySymbol = `${posSettings?.currency_symbol || '$'} `;

    const [selectedCompanyId, setSelectedCompanyId] = useState('');
    const [selectedCustomerId, setSelectedCustomerId] = useState(null);
    const [companies, setCompanies] = useState([]);
    const [customers, setCustomers] = useState([]);

    // Fully reset the splitAmounts object whenever the modal opens or the order changes
    useEffect(() => {
        if (opened) {
            setActiveTab(initialTab);
            setActiveSplitMethod(null);
            setKeypadInput('');
            setSelectedCustomerId(null);

            // Fresh state: All value defaults to Cash
            setSplitAmounts({
                'Cash': order?.totalAmount || 0
            });
        }
    }, [initialTab, opened, order?.id, order?.totalAmount]);

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

    // Cap the keypad input so it never exceeds the total order amount
    const handleNumberPress = (num) => {
        if (!activeSplitMethod || activeSplitMethod === 'Cash') return;
        
        const currentVal = keypadInput === '0' ? '' : keypadInput;
        let newValStr = (currentVal + num).slice(0, 8);
        let amount = parseFloat(newValStr) || 0;

        // Calculate how much has been assigned to OTHER non-cash methods
        const otherTotal = Object.entries(splitAmounts)
            .filter(([k]) => k !== 'Cash' && k !== activeSplitMethod)
            .reduce((sum, [, v]) => sum + v, 0);

        // The absolute maximum this specific method can take
        const maxAllowed = Math.max(0, (order?.totalAmount || 0) - otherTotal);

        // Cap the amount and the keypad string if they over-type
        if (amount > maxAllowed) {
            amount = maxAllowed;
            newValStr = Number.isInteger(amount) ? amount.toString() : amount.toFixed(2).replace(/\.?0+$/, '');
        }

        setKeypadInput(newValStr);
        
        setSplitAmounts(prev => ({
            ...prev,
            [activeSplitMethod]: amount,
            'Cash': Math.max(0, (order?.totalAmount || 0) - otherTotal - amount)
        }));
    };

    const handleBackspace = () => {
        if (!activeSplitMethod || activeSplitMethod === 'Cash') return;
        
        const newValStr = keypadInput.slice(0, -1);
        setKeypadInput(newValStr);
        const amount = newValStr === '' ? 0 : (parseFloat(newValStr) || 0);

        const otherTotal = Object.entries(splitAmounts)
            .filter(([k]) => k !== 'Cash' && k !== activeSplitMethod)
            .reduce((sum, [, v]) => sum + v, 0);

        setSplitAmounts(prev => ({
            ...prev,
            [activeSplitMethod]: amount,
            'Cash': Math.max(0, (order?.totalAmount || 0) - otherTotal - amount)
        }));
    };

    const handleClear = () => {
        if (!activeSplitMethod || activeSplitMethod === 'Cash') return;
        
        setKeypadInput('');
        
        const otherTotal = Object.entries(splitAmounts)
            .filter(([k]) => k !== 'Cash' && k !== activeSplitMethod)
            .reduce((sum, [, v]) => sum + v, 0);

        setSplitAmounts(prev => ({
            ...prev,
            [activeSplitMethod]: 0,
            'Cash': Math.max(0, (order?.totalAmount || 0) - otherTotal)
        }));
    };

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

                <Tabs.Panel value="full">
                    <FullPaymentTab 
                        payInFullMethods={payInFullMethods}
                        onSelectPayment={(methodName) => onSelectPayment([{ method: methodName, amount: order.totalAmount }], 'full')}
                    />
                </Tabs.Panel>

                <Tabs.Panel value="split">
                    <SplitPaymentTab 
                        displayedSplitMethods={splitEnabledMethods}
                        activeSplitMethod={activeSplitMethod}
                        splitAmounts={splitAmounts}
                        selectSplitMethod={(methodName) => {
                            if (methodName === 'Cash') return; // Cash is read-only
                            setActiveSplitMethod(methodName);
                            // REMOVED AUTO-FILL BUG HERE: It now simply prepares the keypad for input
                            setKeypadInput(splitAmounts[methodName]?.toString() || '');
                        }}
                        onNumberPress={handleNumberPress}
                        onBackspace={handleBackspace}
                        onClear={handleClear}
                        currencySymbol={currencySymbol}
                    />

                    <Divider my="md" />

                    <Button 
                        fullWidth
                        size="lg" 
                        onClick={handleConfirmSplit}
                        color="blue"
                    >
                        Confirm Split Payment
                    </Button>
                </Tabs.Panel>

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