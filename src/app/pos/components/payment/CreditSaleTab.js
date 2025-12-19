// src/app/pos/components/payment/CreditSaleTab.js
"use client";

import { Group, Select, Divider, ScrollArea, Grid, UnstyledButton, Paper, Text, Badge, Title } from '@mantine/core';
import * as TablerIcons from '@tabler/icons-react';

export default function CreditSaleTab({
    companyOptions,
    selectedCompanyId,
    setSelectedCompanyId,
    filteredCreditCustomers,
    selectedCustomerId,
    setSelectedCustomerId,
    customerCreditStatus,
    formatCurrency
}) {
    return (
        <>
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
            </Paper>
        </>
    );
}