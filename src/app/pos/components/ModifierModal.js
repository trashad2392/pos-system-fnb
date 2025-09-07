// src/app/pos/components/ModifierModal.js
"use client";

import { useState, useEffect } from 'react';
import { Modal, Title, Text, Button, Group, Divider, ScrollArea, Box, Chip } from '@mantine/core';

export default function ModifierModal({ product, opened, onClose, onConfirm }) {
  const [selections, setSelections] = useState({});
  const [totalPrice, setTotalPrice] = useState(0);
  const [isValid, setIsValid] = useState(false);

  // Reset state and calculate initial price whenever a new product is passed in
  useEffect(() => {
    if (product) {
      setTotalPrice(product.price);
      setSelections({});
    }
  }, [product]);

  // Recalculate everything whenever selections change
  useEffect(() => {
    if (!product) return;

    let newTotal = product.price;
    let allRequiredGroupsMet = true;
    let totalPointsUsedInGroups = {};

    // First, calculate total price and points used for each group
    for (const group of product.modifierGroups) {
      totalPointsUsedInGroups[group.id] = 0;
      const groupSelections = selections[group.id] || [];
      for (const optionId of groupSelections) {
        const option = group.options.find(opt => opt.id === optionId);
        if (option) {
          newTotal += option.priceAdjustment;
          totalPointsUsedInGroups[group.id] += option.selectionCost;
        }
      }
    }

    // Then, validate if all requirements are met
    for (const group of product.modifierGroups) {
        const numSelected = (selections[group.id] || []).length;
        if (numSelected < group.minSelection) {
            allRequiredGroupsMet = false;
        }
        if (totalPointsUsedInGroups[group.id] > group.selectionBudget) {
            allRequiredGroupsMet = false; // Should not happen due to UI disabling, but good for safety
        }
    }

    setTotalPrice(newTotal);
    setIsValid(allRequiredGroupsMet);
  }, [selections, product]);

  const handleSelectionChange = (groupId, optionId) => {
    setSelections(currentSelections => {
      const group = product.modifierGroups.find(g => g.id === groupId);
      const currentGroupSelections = currentSelections[groupId] || [];
      const isSelected = currentGroupSelections.includes(optionId);
      let newGroupSelections;

      if (isSelected) {
        // If it's selected, deselect it
        newGroupSelections = currentGroupSelections.filter(id => id !== optionId);
      } else {
        // If it's not selected, try to select it
        const optionToAdd = group.options.find(opt => opt.id === optionId);
        if (!optionToAdd) return currentSelections; // Should not happen

        let pointsUsed = 0;
        currentGroupSelections.forEach(id => {
          const opt = group.options.find(o => o.id === id);
          if (opt) pointsUsed += opt.selectionCost;
        });
        
        // Only add if it doesn't exceed the budget
        if (pointsUsed + optionToAdd.selectionCost <= group.selectionBudget) {
            newGroupSelections = [...currentGroupSelections, optionId];
        } else {
            // If budget is 1, deselect others and select this one
            if (group.selectionBudget === 1 && optionToAdd.selectionCost === 1) {
              newGroupSelections = [optionId];
            } else {
              newGroupSelections = currentGroupSelections; // Do nothing if it exceeds budget
            }
        }
      }
      
      return { ...currentSelections, [groupId]: newGroupSelections };
    });
  };
  
  const handleConfirm = () => {
    const allSelectedOptionIds = Object.values(selections).flat();
    onConfirm(product, allSelectedOptionIds);
    onClose();
  };

  if (!product) return null;

  return (
    <Modal opened={opened} onClose={onClose} title={`Customize ${product.name}`} size="lg">
      <ScrollArea style={{ height: '60vh' }}>
        {product.modifierGroups.map(group => {
          // Calculate current points used for this group
          let pointsUsed = 0;
          if (selections[group.id]) {
            selections[group.id].forEach(optionId => {
              const option = group.options.find(opt => opt.id === optionId);
              if (option) pointsUsed += option.selectionCost;
            });
          }

          return (
            <Box key={group.id} mb="md">
              <Group justify="space-between">
                <Title order={4}>{group.name}</Title>
                <Text size="sm" c="dimmed">Points used: {pointsUsed} / {group.selectionBudget}</Text>
              </Group>
              <Text size="sm" c="dimmed">
                Choose at least {group.minSelection}. Use up to {group.selectionBudget} points.
              </Text>
              <Divider my="xs" />
              
              <Group mt="xs" gap="md">
                {group.options.map(option => {
                  const isSelected = selections[group.id]?.includes(option.id);
                  // An option is disabled if it's NOT selected AND adding it would exceed the budget
                  const isDisabled = !isSelected && (pointsUsed + option.selectionCost > group.selectionBudget);

                  return (
                    <Chip
                      key={option.id}
                      value={option.id.toString()}
                      checked={isSelected}
                      onChange={() => handleSelectionChange(group.id, option.id)}
                      variant="outline"
                      size="lg"
                      radius="md"
                      disabled={isDisabled}
                    >
                      {option.name} ({option.selectionCost}pt) {option.priceAdjustment > 0 ? `(+$${option.priceAdjustment.toFixed(2)})` : ''}
                    </Chip>
                  );
                })}
              </Group>
            </Box>
          );
        })}
      </ScrollArea>
      <Divider my="sm" />
      <Group justify="space-between" align="center" mt="md">
        <Title order={3}>Total Price: ${totalPrice.toFixed(2)}</Title>
        <Group>
          <Button variant="default" onClick={onClose}>Cancel</Button>
          <Button onClick={handleConfirm} disabled={!isValid}>Add to Order</Button>
        </Group>
      </Group>
    </Modal>
  );
}