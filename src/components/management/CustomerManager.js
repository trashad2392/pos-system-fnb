// src/components/management/CustomerManager.js
"use client";
import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Title, Box, TextInput, Table, Button, Paper, Group, ActionIcon, Modal,
  Text, NumberInput, Accordion, Badge, Select, Divider, Switch, Grid
} from '@mantine/core';
import { IconEdit, IconTrash, IconPlus, IconWallet } from '@tabler/icons-react';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';

const initialCompanyState = { name: '', creditLimit: 0, isActive: true };
const initialCustomerState = { name: '', balance: 0, creditLimit: 0, companyId: null, isActive: true };

function formatCurrency(amount) {
    return `$${Number(amount).toFixed(2)}`;
}

// --- Component to manage Company and Customer data ---
export default function CustomerManager() {
  const [companies, setCompanies] = useState([]);
  const [customers, setCustomers] = useState([]); // Flat list of all customers
  const [isLoading, setIsLoading] = useState(true);

  // Modals and State
  const [companyModalOpened, { open: openCompanyModal, close: closeCompanyModal }] = useDisclosure(false);
  const [customerModalOpened, { open: openCustomerModal, close: closeCustomerModal }] = useDisclosure(false);
  const [paymentModalOpened, { open: openPaymentModal, close: closePaymentModal }] = useDisclosure(false);
  
  const [editingCompany, setEditingCompany] = useState(initialCompanyState);
  const [editingCustomer, setEditingCustomer] = useState(initialCustomerState);
  const [customerToPay, setCustomerToPay] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState(0);

  // --- FIXED: Define companiesInCompanies BEFORE its use in the return block ---
  const customersInCompanies = useMemo(() => {
    return companies.map(company => {
        const associatedCustomers = customers.filter(c => c.companyId === company.id);
        return {
            ...company,
            customers: associatedCustomers,
        };
    });
  }, [companies, customers]);


  const companyOptions = useMemo(() => [
    { value: '', label: 'No Company (Individual Account)' },
    ...companies.map(c => ({
      value: c.id.toString(),
      label: c.name
    }))
  ], [companies]);
  
  // --- Data Fetching ---
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Fetch active companies including their active customers
      const companyData = await window.api.getCompanies();
      // Fetch all active customers, regardless of company
      const customerData = await window.api.getCustomers();
      
      setCompanies(companyData);
      setCustomers(customerData);
    } catch (error) {
      console.error("Error fetching customer data:", error);
      // NOTE: This will now log the error, but the IPC error is fixed
      notifications.show({ title: 'Error', message: 'Failed to load customer and company data.', color: 'red' });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // --- Company CRUD Handlers ---

  const handleOpenCompanyModal = (company = null) => {
    setEditingCompany(company ? { ...company } : initialCompanyState);
    openCompanyModal();
  };

  const handleSaveCompany = async () => {
    if (!editingCompany.name) return notifications.show({ title: 'Error', message: 'Name is required.', color: 'red' });
    
    const dataToSave = {
      name: editingCompany.name,
      creditLimit: parseFloat(editingCompany.creditLimit) || 0,
      isActive: editingCompany.isActive,
    };

    try {
      if (editingCompany.id) {
        await window.api.updateCompany({ id: editingCompany.id, data: dataToSave });
        notifications.show({ title: 'Success', message: 'Company updated.', color: 'green' });
      } else {
        await window.api.addCompany(dataToSave);
        notifications.show({ title: 'Success', message: 'Company added.', color: 'green' });
      }
      fetchData();
      closeCompanyModal();
    } catch (error) {
      notifications.show({ title: 'Error', message: `Failed to save company: ${error.message}`, color: 'red' });
    }
  };

  // --- Customer CRUD Handlers ---

  const handleOpenCustomerModal = (customer = null, defaultCompanyId = null) => {
    const initial = customer ? 
        { ...customer, companyId: customer.companyId?.toString() || '' } : 
        { ...initialCustomerState, companyId: defaultCompanyId?.toString() || '' };
    setEditingCustomer(initial);
    openCustomerModal();
  };

  const handleSaveCustomer = async () => {
    if (!editingCustomer.name) return notifications.show({ title: 'Error', message: 'Name is required.', color: 'red' });
    
    const dataToSave = {
      name: editingCustomer.name,
      balance: parseFloat(editingCustomer.balance) || 0,
      creditLimit: parseFloat(editingCustomer.creditLimit) || 0,
      isActive: editingCustomer.isActive,
      companyId: editingCustomer.companyId ? parseInt(editingCustomer.companyId, 10) : null,
    };

    try {
      if (editingCustomer.id) {
        await window.api.updateCustomer({ id: editingCustomer.id, data: dataToSave });
        notifications.show({ title: 'Success', message: 'Customer updated.', color: 'green' });
      } else {
        await window.api.addCustomer(dataToSave);
        notifications.show({ title: 'Success', message: 'Customer added.', color: 'green' });
      }
      fetchData();
      closeCustomerModal();
    } catch (error) {
      notifications.show({ title: 'Error', message: `Failed to save customer: ${error.message}`, color: 'red' });
    }
  };

  // --- Payment Handlers ---

  const handleOpenPaymentModal = (customer) => {
    setCustomerToPay(customer);
    setPaymentAmount(Math.max(0, -customer.balance)); // Pre-fill with debt, or 0
    openPaymentModal();
  };

  const handleProcessPayment = async () => {
    if (!customerToPay || paymentAmount <= 0) {
      return notifications.show({ title: 'Error', message: 'Invalid payment amount.', color: 'red' });
    }
    
    try {
      const updatedCustomer = await window.api.addCustomerPayment({
        customerId: customerToPay.id,
        amount: parseFloat(paymentAmount),
        method: 'Account Payment', // Simple placeholder method
      });
      notifications.show({ 
        title: 'Payment Successful', 
        message: `${formatCurrency(paymentAmount)} paid by ${updatedCustomer.name}. New Balance: ${formatCurrency(updatedCustomer.balance)}`, 
        color: 'green' 
      });
      fetchData();
      closePaymentModal();
    } catch (error) {
      notifications.show({ title: 'Error', message: `Payment failed: ${error.message}`, color: 'red' });
    }
  };

  if (isLoading) {
    return <Text>Loading customer accounts...</Text>;
  }

  // Filter customers not linked to a company
  const individualCustomers = customers.filter(c => c.companyId === null);

  return (
    <>
      {/* ===== Company Modal ===== */}
      <Modal opened={companyModalOpened} onClose={closeCompanyModal} title={editingCompany.id ? `Edit Company: ${editingCompany.name}` : 'Add New Company'}>
        <TextInput
          label="Company Name"
          required
          value={editingCompany.name}
          onChange={(e) => setEditingCompany({ ...editingCompany, name: e.currentTarget.value })}
        />
        <NumberInput
          mt="md"
          label="Credit Limit ($)"
          description="Maximum debt allowed before payment is required. (0 = no limit)"
          precision={2}
          min={0}
          value={editingCompany.creditLimit || 0}
          onChange={(value) => setEditingCompany({ ...editingCompany, creditLimit: value })}
        />
        <Switch
          mt="lg"
          label="Company is active"
          checked={editingCompany.isActive}
          onChange={(event) => setEditingCompany({ ...editingCompany, isActive: event.currentTarget.checked })}
        />
        <Group justify="flex-end" mt="xl"><Button variant="default" onClick={closeCompanyModal}>Cancel</Button><Button onClick={handleSaveCompany}>Save Company</Button></Group>
      </Modal>

      {/* ===== Customer Modal ===== */}
      <Modal opened={customerModalOpened} onClose={closeCustomerModal} title={editingCustomer.id ? `Edit Customer: ${editingCustomer.name}` : 'Add New Customer'}>
        <TextInput
          label="Customer Name"
          required
          value={editingCustomer.name}
          onChange={(e) => setEditingCustomer({ ...editingCustomer, name: e.currentTarget.value })}
        />
        <Select
          mt="md"
          label="Company (Optional)"
          placeholder="Select a company"
          data={companyOptions}
          value={editingCustomer.companyId}
          onChange={(value) => setEditingCustomer({ ...editingCustomer, companyId: value })}
          clearable
        />
        <NumberInput
          mt="md"
          label="Current Balance ($)"
          description="Positive amount is credit balance, negative is debt."
          precision={2}
          value={editingCustomer.balance || 0}
          onChange={(value) => setEditingCustomer({ ...editingCustomer, balance: value })}
        />
        <NumberInput
          mt="md"
          label="Credit Limit ($)"
          description="Maximum personal debt allowed. Overrides company limit."
          precision={2}
          min={0}
          value={editingCustomer.creditLimit || 0}
          onChange={(value) => setEditingCustomer({ ...editingCustomer, creditLimit: value })}
        />
        <Group justify="flex-end" mt="xl"><Button variant="default" onClick={closeCustomerModal}>Cancel</Button><Button onClick={handleSaveCustomer}>Save Customer</Button></Group>
      </Modal>
      
      {/* ===== Payment Modal (Pay off debt / Add balance) ===== */}
      <Modal opened={paymentModalOpened} onClose={closePaymentModal} title={`Receive Payment from ${customerToPay?.name}`}>
         <Text size="lg" mb="sm">Current Balance: <Text span fw={700} c={customerToPay?.balance < 0 ? 'red' : 'green'}>{formatCurrency(customerToPay?.balance)}</Text></Text>
         <NumberInput
            label="Payment Amount ($)"
            description="Enter the amount received from the customer."
            precision={2}
            min={0.01}
            value={paymentAmount}
            onChange={setPaymentAmount}
            mt="md"
         />
         <Group justify="flex-end" mt="xl">
            <Button variant="default" onClick={closePaymentModal}>Cancel</Button>
            <Button onClick={handleProcessPayment} disabled={paymentAmount <= 0}>Process Payment</Button>
         </Group>
      </Modal>


      {/* ===== Main View ===== */}
      <Paper shadow="xs" p="md" withBorder>
        <Group justify="space-between" mb="md">
          <Title order={3}>Credit Sale Customers Manager</Title>
          <Group>
            <Button onClick={() => handleOpenCompanyModal()} leftSection={<IconPlus size={16} />}>New Company</Button>
            <Button onClick={() => handleOpenCustomerModal()} leftSection={<IconPlus size={16} />} variant="outline">New Individual</Button>
          </Group>
        </Group>
        <Divider my="md" label="Company Accounts" labelPosition="left" />

        {/* --- Company List (Accordion) --- */}
        {companies.length > 0 ? (
          <Accordion variant="separated">
            {/* FIXED: companiesInCompanies is now correctly defined and used */}
            {customersInCompanies.map(company => (
              <Accordion.Item key={company.id} value={`company-${company.id}`}>
                <Group wrap="nowrap" justify="space-between" align="center">
                  <Accordion.Control style={{ flex: 1 }}>
                    <Text fw={500}>{company.name}</Text>
                    <Text size="xs" c="dimmed">Credit Limit: {formatCurrency(company.creditLimit)}</Text>
                  </Accordion.Control>
                  <Group gap="xs" wrap="nowrap" pr="xs">
                    <ActionIcon variant="outline" onClick={() => handleOpenCompanyModal(company)}><IconEdit size={16} /></ActionIcon>
                    <ActionIcon color="blue" variant="outline" onClick={() => handleOpenCustomerModal(null, company.id)}><IconPlus size={16} /></ActionIcon>
                  </Group>
                </Group>
                <Accordion.Panel>
                  <Text size="sm" c="dimmed" mb="xs">Associated Customers:</Text>
                  {company.customers.length > 0 ? (
                    <CustomerTable customers={company.customers} onEdit={handleOpenCustomerModal} onPay={handleOpenPaymentModal} />
                  ) : (
                    <Text size="sm" c="dimmed">No active customers linked.</Text>
                  )}
                </Accordion.Panel>
              </Accordion.Item>
            ))}
          </Accordion>
        ) : (
          <Text c="dimmed" mb="lg">No active companies found.</Text>
        )}
        
        <Divider my="md" label="Individual Accounts" labelPosition="left" />

        {/* --- Individual Customer List --- */}
        {individualCustomers.length > 0 ? (
          <CustomerTable customers={individualCustomers} onEdit={handleOpenCustomerModal} onPay={handleOpenPaymentModal} />
        ) : (
          <Text c="dimmed">No individual customer accounts found.</Text>
        )}
      </Paper>
    </>
  );
}

// --- Helper Table Component for Customers ---
function CustomerTable({ customers, onEdit, onPay }) {
    return (
        <Table striped highlightOnHover withTableBorder>
            <Table.Thead>
                <Table.Tr>
                    <Table.Th>Name</Table.Th>
                    <Table.Th>Balance</Table.Th>
                    <Table.Th>Credit Limit</Table.Th>
                    <Table.Th>Status</Table.Th>
                    <Table.Th>Actions</Table.Th>
                </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
                {customers.map(customer => {
                    const balance = customer.balance || 0;
                    const creditLimit = customer.creditLimit || 0;
                    const isOverLimit = balance < 0 && creditLimit > 0 && Math.abs(balance) > creditLimit;
                    
                    return (
                        <Table.Tr key={customer.id}>
                            <Table.Td>{customer.name}</Table.Td>
                            <Table.Td>
                                <Text c={balance < 0 ? 'red' : (balance > 0 ? 'green' : 'dimmed')} fw={600}>
                                    {formatCurrency(balance)}
                                </Text>
                            </Table.Td>
                            <Table.Td>{creditLimit > 0 ? formatCurrency(creditLimit) : 'No Limit'}</Table.Td>
                            <Table.Td>
                                {isOverLimit && <Badge color="red" variant="filled">OVER LIMIT</Badge>}
                                {balance < 0 && !isOverLimit && <Badge color="orange" variant="light">DEBT</Badge>}
                                {balance > 0 && <Badge color="green" variant="light">CREDIT</Badge>}
                                {balance === 0 && <Badge color="gray" variant="light">ZERO</Badge>}
                            </Table.Td>
                            <Table.Td>
                                <Group gap="xs">
                                    <ActionIcon variant="outline" onClick={() => onEdit(customer)}>
                                        <IconEdit size={16} />
                                    </ActionIcon>
                                    <Button size="xs" variant="light" leftSection={<IconWallet size={14} />} onClick={() => onPay(customer)}>
                                        Receive Pmt
                                    </Button>
                                </Group>
                            </Table.Td>
                        </Table.Tr>
                    );
                })}
            </Table.Tbody>
        </Table>
    );
}