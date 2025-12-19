// src/app/pos/components/payment/FullPaymentTab.js
"use client";

import { Grid, Button, Text } from '@mantine/core';
import * as TablerIcons from '@tabler/icons-react';

const getPaymentIconComponent = (iconName) => {
    return TablerIcons[iconName] || TablerIcons.IconCheck;
};

export default function FullPaymentTab({ payInFullMethods, onSelectPayment }) {
    return (
        <>
            <Text ta="center" mb="md">Select a method to pay the full amount.</Text>
            <Grid>
                {payInFullMethods.map(method => {
                    const isCustom = method.iconSourceType === 'custom' && method.customIconUrl;
                    const IconComponent = getPaymentIconComponent(method.iconName);

                    return (
                        <Grid.Col span={6} key={method.name}>
                            <Button
                                fullWidth
                                size="xl"
                                variant="outline"
                                color={method.color}
                                onClick={() => onSelectPayment(method.name)}
                                style={{ height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}
                            >
                                {isCustom ? (
                                    <img
                                        src={method.customIconUrl}
                                        alt={method.name}
                                        style={{ width: '72px', height: '72px', objectFit: 'contain', marginBottom: '5px' }}
                                    />
                                ) : (
                                    <IconComponent size={36} style={{ marginBottom: '5px' }} />
                                )}
                                <Text size="xl" fw={700}>
                                    {method.name}
                                </Text>
                            </Button>
                        </Grid.Col>
                    );
                })}
            </Grid>
        </>
    );
}