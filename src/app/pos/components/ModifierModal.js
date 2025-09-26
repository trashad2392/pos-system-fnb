// src/app/pos/components/ModifierModal.js
"use client";

import { useState, useEffect, useMemo } from 'react';
import { Modal, Title, Text, Button, Group, Divider, Box, Chip, Progress, Badge } from '@mantine/core';

export default function ModifierModal({ product, opened, onClose, onConfirm }) {
  // --- STATE MANAGEMENT ---
  const [currentStep, setCurrentStep] = useState(0);
  // NEW: Selections now store quantities for each option, e.g., { groupId: { optionId: quantity } }
  const [selections, setSelections] = useState({});
  const [totalPrice, setTotalPrice] = useState(0);
  // NEW: Tracks the required selection cost for groups with 'exactBudgetRequired'
  const [lockedCosts, setLockedCosts] = useState({});

  // --- DATA & CALCULATIONS ---

  // Memoize sorted modifier groups to prevent re-sorting on every render
  const sortedModifierGroups = useMemo(() => {
    if (!product || !product.modifierGroups) return [];
    return [...product.modifierGroups].sort((a, b) => a.displayOrder - b.displayOrder).map(pmg => pmg.modifierGroup);
  }, [product]);

  // Get the current group based on the step
  const currentGroup = sortedModifierGroups[currentStep];
  const currentGroupSelections = selections[currentGroup?.id] || {};
  
  // Calculate the total points and items used for the current group
  const { pointsUsed, itemsUsed } = useMemo(() => {
    if (!currentGroup) return { pointsUsed: 0, itemsUsed: 0 };
    let points = 0;
    let items = 0;
    for (const optionId in currentGroupSelections) {
      const quantity = currentGroupSelections[optionId];
      const option = currentGroup.options.find(opt => opt.id === Number(optionId));
      if (option) {
        points += option.selectionCost * quantity;
        items += quantity;
      }
    }
    return { pointsUsed: points, itemsUsed: items };
  }, [currentGroup, currentGroupSelections]);

  // Determine the effective maximum number of selections
  const effectiveMaxSelections = useMemo(() => {
    if (!currentGroup) return null;
    if (currentGroup.maxSelectionsSyncedToOptionCount) {
      return currentGroup.options.length;
    }
    return currentGroup.maxSelections;
  }, [currentGroup]);


  // --- SIDE EFFECTS (useEffect) ---

  // Reset state when a new product is passed in or the modal is opened
  useEffect(() => {
    if (opened && product) {
      setCurrentStep(0);
      setSelections({});
      setLockedCosts({});
      setTotalPrice(product.price);
    }
  }, [opened, product]);

  // Recalculate total price whenever selections change
  useEffect(() => {
    if (!product) return;
    let newTotal = product.price;
    Object.keys(selections).forEach(groupId => {
      const group = sortedModifierGroups.find(g => g.id === Number(groupId));
      if (group) {
        Object.keys(selections[groupId]).forEach(optionId => {
          const quantity = selections[groupId][optionId];
          const option = group.options.find(opt => opt.id === Number(optionId));
          if (option) {
            newTotal += option.priceAdjustment * quantity;
          }
        });
      }
    });
    setTotalPrice(newTotal);
  }, [selections, product, sortedModifierGroups]);

  // --- HANDLER FUNCTIONS ---

  const handleSelectionChange = (groupId, option) => {
    const currentSelectionsForGroup = selections[groupId] || {};
    const existingQty = currentSelectionsForGroup[option.id] || 0;
    const newSelections = { ...selections };

    // Determine the new quantity for the selected option
    let newQty;
    if (currentGroup.allowRepeatedSelections) {
      newQty = existingQty + 1;
    } else {
      newQty = existingQty > 0 ? 0 : 1; // Toggle if repeats are not allowed
    }

    // --- RULE VALIDATION ---
    const tempSelections = { ...currentSelectionsForGroup, [option.id]: newQty };
    let tempItemsUsed = 0;
    let tempPointsUsed = 0;
    for (const optId in tempSelections) {
      const qty = tempSelections[optId];
      const opt = currentGroup.options.find(o => o.id === Number(optId));
      if (opt && qty > 0) {
        tempItemsUsed += qty;
        tempPointsUsed += opt.selectionCost * qty;
      }
    }

    // 1. Check max selections limit
    if (effectiveMaxSelections !== null && tempItemsUsed > effectiveMaxSelections) {
      // If we are just adding one and it would exceed, don't do it
      if (newQty === existingQty + 1) return; 
    }

    // 2. Check selection budget limit
    if (tempPointsUsed > currentGroup.selectionBudget) {
      // Prevent adding if it exceeds the budget
      if (newQty > existingQty) return;
    }
    
    // --- UPDATE STATE ---
    if (newQty > 0) {
      newSelections[groupId] = { ...currentSelectionsForGroup, [option.id]: newQty };
    } else {
      delete currentSelectionsForGroup[option.id];
      newSelections[groupId] = { ...currentSelectionsForGroup };
    }
    
    setSelections(newSelections);

    // --- COMPLEX RULE: Lock selection cost for "exact budget" groups ---
    if (currentGroup.exactBudgetRequired) {
      const isFirstSelection = Object.keys(currentSelectionsForGroup).length === 0 && newQty > 0;
      const isLastSelectionCleared = Object.keys(newSelections[groupId]).length === 0;

      if (isFirstSelection) {
        setLockedCosts({ ...lockedCosts, [groupId]: option.selectionCost });
      } else if (isLastSelectionCleared) {
        const newLockedCosts = { ...lockedCosts };
        delete newLockedCosts[groupId];
        setLockedCosts(newLockedCosts);
      }
    }
  };

  const handleNextOrFinish = () => {
    const isFinalStep = currentStep === sortedModifierGroups.length - 1;
    if (isFinalStep) {
      // Flatten all selections into a single array of option IDs
      const allSelectedOptionIds = [];
      Object.keys(selections).forEach(groupId => {
        Object.keys(selections[groupId]).forEach(optionId => {
          const quantity = selections[groupId][optionId];
          for (let i = 0; i < quantity; i++) {
            allSelectedOptionIds.push(Number(optionId));
          }
        });
      });
      onConfirm(product, allSelectedOptionIds);
    } else {
      setCurrentStep(s => s + 1);
    }
  };
  
  // --- RENDER LOGIC ---

  if (!product || !opened || !currentGroup) return null;
  
  const isMinMet = itemsUsed >= currentGroup.minSelection;
  const isBudgetOk = currentGroup.exactBudgetRequired ? (pointsUsed === currentGroup.selectionBudget) : (pointsUsed <= currentGroup.selectionBudget);
  const isGroupComplete = isMinMet && isBudgetOk;
  
  return (
    <Modal opened={opened} onClose={onClose} title={`Customize ${product.name}`} size="lg" withCloseButton={false} closeOnClickOutside={false} closeOnEscape={false}>
      <Progress value={((currentStep + 1) / sortedModifierGroups.length) * 100} mb="md" />
      
      <Box style={{ minHeight: '40vh', position: 'relative' }}>
        <Box key={currentGroup.id}>
          <Group justify="space-between">
            <Title order={4}>{currentGroup.name}</Title>
            <Text size="sm" c="dimmed">Points used: {pointsUsed} / {currentGroup.selectionBudget}</Text>
          </Group>
          <Text size="sm" c="dimmed">
            Choose at least {currentGroup.minSelection}.
            {effectiveMaxSelections !== null && ` Choose up to ${effectiveMaxSelections}.`}
          </Text>
          <Divider my="md" />
          
          <Group mt="xs" gap="md">
            {currentGroup.options.map(option => {
              const quantity = currentGroupSelections[option.id] || 0;
              const isSelected = quantity > 0;
              
              // --- Disabling Logic ---
              let isDisabled = false;
              // 1. Locked cost for exact budget groups (like the grill)
              const lockedCost = lockedCosts[currentGroup.id];
              if (lockedCost !== undefined && option.selectionCost !== 0 && option.selectionCost !== lockedCost) {
                isDisabled = true;
              }
              // 2. Budget exceeded
              if (!isSelected && pointsUsed + option.selectionCost > currentGroup.selectionBudget) {
                isDisabled = true;
              }
              // 3. Max items reached
              if (!isSelected && effectiveMaxSelections !== null && itemsUsed >= effectiveMaxSelections) {
                isDisabled = true;
              }

              return (
                <Chip
                  key={option.id}
                  value={option.id.toString()}
                  checked={isSelected}
                  onChange={() => handleSelectionChange(currentGroup.id, option)}
                  variant="outline"
                  size="lg"
                  radius="md"
                  disabled={isDisabled}
                >
                  <Group gap="xs">
                    <Text>{option.name}</Text>
                    {currentGroup.allowRepeatedSelections && isSelected && (<Badge variant="light" size="lg">{quantity}</Badge>)}
                    <Text size="sm" c="dimmed">
                      ({option.selectionCost}pt) {option.priceAdjustment > 0 ? `(+$${option.priceAdjustment.toFixed(2)})` : ''}
                    </Text>
                  </Group>
                </Chip>
              );
            })}
          </Group>
        </Box>
      </Box>

      <Divider my="sm" />
      <Group justify="space-between" align="center" mt="md">
        <Title order={3}>Total: ${totalPrice.toFixed(2)}</Title>
        <Button onClick={handleNextOrFinish} disabled={!isGroupComplete}>
          {currentStep === sortedModifierGroups.length - 1 ? 'Confirm' : 'Next'}
        </Button>
      </Group>
    </Modal>
  );
}