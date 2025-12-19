// src/app/pos/components/payment/SplitPaymentTab.js
"use client";

import { Grid, Stack, UnstyledButton, Paper, Group, Text } from '@mantine/core';
import Keypad from '../Keypad';

export default function SplitPaymentTab({
    displayedSplitMethods,
    activeSplitMethod,
    splitAmounts,
    selectSplitMethod,
    onNumberPress,
    onBackspace,
    onClear
}) {
    return (
        <Grid>
            <Grid.Col span={6}>
                <Stack>
                    {displayedSplitMethods.map(method => {
                        const isEditable = method.name !== 'Cash';
                        return (
                            <UnstyledButton
                                key={method.name}
                                onClick={() => selectSplitMethod(method.name)}
                                disabled={!isEditable}
                            >
                                <Paper
                                    withBorder p="md"
                                    bg={activeSplitMethod === method.name && isEditable ? `${method.color}.0` : 'transparent'}
                                    opacity={isEditable ? 1 : 0.6}
                                >
                                    <Group justify="space-between">
                                        <Text fw={500} c={isEditable ? 'inherit' : 'dimmed'}>{method.name}</Text>
                                        <Text fw={700}>${(splitAmounts[method.name] || 0).toFixed(2)}</Text>
                                    </Group>
                                </Paper>
                            </UnstyledButton>
                        );
                    })}
                </Stack>
            </Grid.Col>
            <Grid.Col span={6}>
                <Keypad
                    onNumberPress={onNumberPress}
                    onBackspace={onBackspace}
                    onClear={onClear}
                    disabled={activeSplitMethod === 'Cash' || activeSplitMethod === 'Credit'}
                />
            </Grid.Col>
        </Grid>
    );
}