// src/app/pos/components/DiscountModal.js
"use client";

import { Modal, Button, Stack, Title, Text, Group, Paper } from '@mantine/core';
import { IconReceipt2 } from '@tabler/icons-react';

export default function DiscountModal({ opened, onClose, discounts = [], onSelectDiscount, target }) {
    // Determine the currently applied discount ID from the order
    const currentDiscountId = target?.discountId || null;

    const handleSelect = (id) => {
        console.log(`[MODAL] Discount Clicked. ID: ${id}`);
        onSelectDiscount(id);
    };

    return (
        <Modal opened={opened} onClose={onClose} title="Apply Order Discount" centered size="md">
            <Stack>
                {discounts && discounts.length > 0 ? (
                    discounts.map((discount) => (
                        <Paper
                            key={discount.id}
                            withBorder
                            p="md"
                            component="button"
                            // CRITICAL: Ensure we are passing discount.id here
                            onClick={() => handleSelect(discount.id)}
                            style={{
                                cursor: 'pointer',
                                textAlign: 'left',
                                width: '100%',
                                backgroundColor: currentDiscountId === discount.id ? 'var(--mantine-color-blue-light)' : 'transparent',
                                border: currentDiscountId === discount.id ? '2px solid var(--mantine-color-blue-filled)' : '1px solid var(--mantine-color-gray-3)'
                            }}
                        >
                            <Group justify="space-between" wrap="nowrap">
                                <Stack gap={2}>
                                    <Text fw={700} size="sm">{discount.name}</Text>
                                    {discount.description && (
                                        <Text size="xs" c="dimmed">{discount.description}</Text>
                                    )}
                                </Stack>
                                <Title order={4} c="blue">
                                    {discount.type === 'PERCENT' ? `${discount.value}%` : `$${discount.value}`}
                                </Title>
                            </Group>
                        </Paper>
                    ))
                ) : (
                    <Stack align="center" py="xl" c="dimmed">
                        <IconReceipt2 size={48} stroke={1.5} />
                        <Text size="sm">No active discounts available.</Text>
                    </Stack>
                )}

                {currentDiscountId && (
                    <Button variant="subtle" color="red" onClick={() => handleSelect(null)} mt="sm">
                        Remove Current Discount
                    </Button>
                )}
                
                <Button fullWidth onClick={onClose} variant="light" mt="md">
                    Close
                </Button>
            </Stack>
        </Modal>
    );
}