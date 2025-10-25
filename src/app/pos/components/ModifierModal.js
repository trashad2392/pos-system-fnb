// src/app/pos/components/ModifierModal.js
"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Modal, Title, Text, Button, Group, Divider, Box, Chip, Progress, Badge, Grid, Paper, ScrollArea, UnstyledButton, Stack } from '@mantine/core'; // Added UnstyledButton, Stack

// --- Helper Hook to get previous value ---
function usePrevious(value) {
  const ref = useRef();
  useEffect(() => {
    ref.current = value;
  });
  return ref.current;
}

// --- Summary Panel Component (Unchanged) ---
function SummaryPanel({ product, sortedModifierGroups, selections, totalPrice }) {
  // ... (Keep the existing SummaryPanel code here) ...
  return (
    <Paper withBorder p="md" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Title order={4}>Order Summary</Title>
      <Divider my="sm" />
      <ScrollArea style={{ flex: 1 }}>
        <Group justify="space-between">
          <Text fw={500}>{product.name}</Text>
          <Text fw={500}>${product.price.toFixed(2)}</Text>
        </Group>
        <Box mt="sm" pl="sm">
          {sortedModifierGroups.map(group => {
            const groupSelections = selections[group.id];
            if (!groupSelections || Object.keys(groupSelections).length === 0) return null;

            return (
              <Box key={group.id} mb="xs">
                <Text size="sm" fw={500} c="dimmed">{group.name}:</Text>
                {Object.entries(groupSelections).map(([optionId, quantity]) => {
                  const option = group.options.find(opt => opt.id === Number(optionId));
                  if (!option) return null;
                  return (
                    <Text key={optionId} size="sm" pl="sm">
                      &bull; {option.name} {quantity > 1 ? `(x${quantity})` : ''}
                      {option.priceAdjustment > 0 ? <Text span c="green"> +${(option.priceAdjustment * quantity).toFixed(2)}</Text> : ''}
                    </Text>
                  );
                })}
              </Box>
            );
          })}
        </Box>
      </ScrollArea>
      <Divider my="sm" mt="auto" />
      <Group justify="space-between">
        <Title order={3}>Total:</Title>
        <Title order={3}>${totalPrice.toFixed(2)}</Title>
      </Group>
    </Paper>
  );
}

// --- Main Modal Component ---
export default function ModifierModal({ product, opened, onClose, onConfirm }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [selections, setSelections] = useState({});
  const [totalPrice, setTotalPrice] = useState(0);
  const [lockedCost, setLockedCost] = useState(null);

  const prevStep = usePrevious(currentStep);

  const sortedModifierGroups = useMemo(() => {
    if (!product?.modifierGroups) return [];
    return [...product.modifierGroups].sort((a, b) => a.displayOrder - b.displayOrder).map(pmg => pmg.modifierGroup);
  }, [product]);

  const currentGroup = useMemo(() => sortedModifierGroups[currentStep], [sortedModifierGroups, currentStep]);

  // --- derivedState (Unchanged) ---
  const derivedState = useMemo(() => {
    // ... (Keep the existing derivedState code here) ...
    if (!currentGroup) {
      return { pointsUsed: 0, itemsUsed: 0, effectiveMaxSelections: null, isMinMet: false };
    }
    const currentGroupSelections = selections[currentGroup.id] || {};
    let pointsUsed = 0;
    let itemsUsed = 0;
    for (const optionId in currentGroupSelections) {
      const quantity = currentGroupSelections[optionId];
      const option = currentGroup.options.find(opt => opt.id === Number(optionId));
      if (option) {
        pointsUsed += option.selectionCost * quantity;
        itemsUsed += quantity;
      }
    }

    let effectiveMaxSelections = currentGroup.maxSelectionsSyncedToOptionCount ? currentGroup.options.length : currentGroup.maxSelections;

    if (effectiveMaxSelections === null && currentGroup.minSelection === 1 && currentGroup.selectionBudget === 1) {
      effectiveMaxSelections = 1;
    }

    const isMinMet = itemsUsed >= currentGroup.minSelection;

    return { pointsUsed, itemsUsed, effectiveMaxSelections, isMinMet };
  }, [currentGroup, selections]);

  const { pointsUsed, itemsUsed, effectiveMaxSelections, isMinMet } = derivedState;

  // --- useEffect hooks (Unchanged) ---
  useEffect(() => {
    // ... (Keep the existing useEffect hooks here) ...
    if (opened && product) {
      setCurrentStep(0);
      setSelections({});
      setTotalPrice(product.price);
      setLockedCost(null);
    }
  }, [opened, product]);

  useEffect(() => {
    setLockedCost(null);
  }, [currentStep]);

  useEffect(() => {
    if (!product) return;
    let newTotal = product.price;
    Object.keys(selections).forEach(groupId => {
      const group = sortedModifierGroups.find(g => g.id === Number(groupId));
      if (group) {
        Object.keys(selections[groupId]).forEach(optionId => {
          const quantity = selections[groupId][optionId];
          const option = group.options.find(opt => opt.id === Number(optionId));
          if (option) newTotal += option.priceAdjustment * quantity;
        });
      }
    });
    setTotalPrice(newTotal);
  }, [selections, product, sortedModifierGroups]);

  // --- handleNextOrFinish, handleBack (Unchanged) ---
  const handleNextOrFinish = useCallback(() => {
    // ... (Keep the existing handleNextOrFinish code here) ...
    const isFinalStep = currentStep === sortedModifierGroups.length - 1;
    if (isFinalStep) {
      const finalModifiers = [];
      sortedModifierGroups.forEach(group => {
        const groupSelections = selections[group.id];
        if (groupSelections) {
          Object.entries(groupSelections).forEach(([optionId, quantity]) => {
            const option = group.options.find(opt => opt.id === Number(optionId));
            if (option) {
              finalModifiers.push({ ...option, quantity });
            }
          });
        }
      });
      onConfirm(product, finalModifiers);
    } else {
      setCurrentStep(s => s + 1);
    }
  }, [currentStep, sortedModifierGroups, selections, onConfirm, product]);

  const handleBack = () => {
    // ... (Keep the existing handleBack code here) ...
    if (currentStep > 0) {
      const prevStepIndex = currentStep - 1;
      const prevGroup = sortedModifierGroups[prevStepIndex];
      if (prevGroup) {
        const newSelections = { ...selections };
        delete newSelections[prevGroup.id];
        setSelections(newSelections);
      }
      setCurrentStep(prevStepIndex);
    }
  };

  // --- Auto-advance useEffect (Unchanged) ---
  useEffect(() => {
    // ... (Keep the existing auto-advance useEffect code here) ...
    const navigatedBackwards = typeof prevStep !== 'undefined' && prevStep > currentStep;
    if (navigatedBackwards || !currentGroup || !opened) {
      return;
    }
    const maxItemsMet = effectiveMaxSelections !== null && itemsUsed >= effectiveMaxSelections;
    const budgetMet = pointsUsed >= currentGroup.selectionBudget;
    if ((maxItemsMet || budgetMet) && itemsUsed > 0) {
      const timer = setTimeout(() => handleNextOrFinish(), 300);
      return () => clearTimeout(timer);
    }
  }, [currentStep, prevStep, itemsUsed, pointsUsed, currentGroup, opened, effectiveMaxSelections, handleNextOrFinish]);


  // --- handleSelectionChange (Unchanged) ---
  const handleSelectionChange = (groupId, option) => {
    // ... (Keep the existing handleSelectionChange code here) ...
    const groupSelections = selections[groupId] || {};
    const newGroupSelections = { ...groupSelections };
    const isCurrentlySelected = !!newGroupSelections[option.id];

    if (currentGroup.allowRepeatedSelections) {
      newGroupSelections[option.id] = (newGroupSelections[option.id] || 0) + 1;
    } else {
      if (effectiveMaxSelections === 1) {
        setSelections({ ...selections, [groupId]: { [option.id]: 1 } });
        return;
      } else {
        if (isCurrentlySelected) {
          delete newGroupSelections[option.id];
        } else {
          newGroupSelections[option.id] = 1;
        }
      }
    }

    if (currentGroup.exactBudgetRequired) {
      const isFirstSelection = Object.keys(groupSelections).length === 0 && !isCurrentlySelected;
      const isLastSelection = Object.keys(newGroupSelections).length === 0;

      if (isFirstSelection) {
        setLockedCost(option.selectionCost);
      } else if (isLastSelection) {
        setLockedCost(null);
      }
    }

    let tempItemsUsed = 0;
    let tempPointsUsed = 0;
    for (const optId in newGroupSelections) {
      const qty = newGroupSelections[optId];
      const opt = currentGroup.options.find(o => o.id === Number(optId));
      if (opt) {
        tempItemsUsed += qty;
        tempPointsUsed += opt.selectionCost * qty;
      }
    }

    if (effectiveMaxSelections !== null && tempItemsUsed > effectiveMaxSelections) return;
    if (tempPointsUsed > currentGroup.selectionBudget) return;

    setSelections({ ...selections, [groupId]: newGroupSelections });
  };

  // --- buttonState memo (Unchanged) ---
  const buttonState = useMemo(() => {
    // ... (Keep the existing buttonState code here) ...
    if (!currentGroup) return { show: false };
    const isFixedQuantity = effectiveMaxSelections !== null && currentGroup.minSelection === effectiveMaxSelections;
    if (isFixedQuantity || currentGroup.exactBudgetRequired) {
      return { show: false };
    }
    if (!isMinMet) {
      return { show: false };
    }
    const isFinalStep = currentStep === sortedModifierGroups.length - 1;
    let text = isFinalStep ? 'Confirm' : 'Next';
    if (currentGroup.minSelection === 0 && itemsUsed === 0) {
      text = 'Skip';
    }
    return { show: true, text, enabled: isMinMet };
  }, [currentGroup, itemsUsed, currentStep, sortedModifierGroups.length, effectiveMaxSelections, isMinMet]);

  if (!product || !opened || !currentGroup) return null;

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={`Customize ${product.name}`}
      // --- MODIFICATION: Increased size ---
      size="90%"
      // --- End Modification ---
      withCloseButton
      closeOnClickOutside
      closeOnEscape
    >
      <Grid>
        {/* --- Summary Panel (Unchanged) --- */}
        <Grid.Col span={{ base: 12, md: 4 }}> {/* Adjusted span for responsiveness */}
          <SummaryPanel product={product} sortedModifierGroups={sortedModifierGroups} selections={selections} totalPrice={totalPrice} />
        </Grid.Col>

        {/* --- Options Panel --- */}
        <Grid.Col span={{ base: 12, md: 8 }}> {/* Adjusted span for responsiveness */}
          <Progress value={((currentStep + 1) / sortedModifierGroups.length) * 100} mb="md" />
          <Box style={{ minHeight: '50vh', position: 'relative' }}>
            <Group justify="space-between">
              <Title order={4}>{currentGroup.name}</Title>
              {/* Points counter removed in previous step */}
            </Group>
            <Text size="sm" c="dimmed">
              {currentGroup.minSelection > 0 ? `Choose at least ${currentGroup.minSelection}.` : 'Optional.'}
              {effectiveMaxSelections !== null && ` Choose up to ${effectiveMaxSelections}.`}
            </Text>
            <Divider my="md" />

            <ScrollArea style={{ height: 'calc(50vh - 80px)' /* Adjusted height maybe needed */ }}>
              {/* --- MODIFICATION START: Replaced Chip Group with Grid --- */}
              <Grid gutter="sm">
                {currentGroup.options
                  .filter(option => {
                    // Filter logic remains the same
                    const isSelected = !!(selections[currentGroup.id] && selections[currentGroup.id][option.id]);
                    if (lockedCost !== null && option.selectionCost !== lockedCost) return false;
                    if (!isSelected && (pointsUsed + option.selectionCost > currentGroup.selectionBudget)) return false;
                    return true;
                  })
                  .map(option => {
                    const quantity = (selections[currentGroup.id] && selections[currentGroup.id][option.id]) || 0;
                    const isSelected = quantity > 0;

                    return (
                      <Grid.Col span={{ base: 6, sm: 4, md: 3 }} key={option.id}> {/* Adjust span as needed */}
                        <UnstyledButton
                          onClick={() => handleSelectionChange(currentGroup.id, option)}
                          style={{ width: '100%', height: '100%' }}
                        >
                          <Paper
                            withBorder
                            shadow="sm"
                            p="sm" // Adjust padding
                            radius="md"
                            style={{
                              height: '100px', // Adjust height as needed
                              display: 'flex',
                              flexDirection: 'column',
                              border: isSelected ? `2px solid var(--mantine-color-blue-6)` : undefined,
                              backgroundColor: isSelected ? 'var(--mantine-color-blue-0)' : undefined,
                            }}
                          >
                            <Stack align="center" justify="center" gap={4} style={{ flexGrow: 1 }}>
                              <Text size="sm" ta="center" wrap="wrap">
                                {option.name}
                              </Text>
                              {option.priceAdjustment > 0 && (
                                <Text size="xs" c="dimmed">
                                  {`(+$${option.priceAdjustment.toFixed(2)})`}
                                </Text>
                              )}
                              {currentGroup.allowRepeatedSelections && quantity > 0 && (
                                <Badge variant="light" size="sm" mt="xs">{quantity}</Badge>
                              )}
                            </Stack>
                          </Paper>
                        </UnstyledButton>
                      </Grid.Col>
                    );
                  })}
              </Grid>
              {/* --- MODIFICATION END --- */}
            </ScrollArea>
          </Box>
        </Grid.Col>
      </Grid>

      {/* --- Footer Buttons (Unchanged) --- */}
      <Group justify="space-between" align="center" mt="md" pt="sm" style={{ borderTop: '1px solid var(--mantine-color-gray-2)' }}>
        <Button variant="default" onClick={handleBack} disabled={currentStep === 0}>Back</Button>
        {buttonState.show && (
          <Button onClick={handleNextOrFinish} disabled={!buttonState.enabled}>
            {buttonState.text}
          </Button>
        )}
      </Group>
    </Modal>
  );
}