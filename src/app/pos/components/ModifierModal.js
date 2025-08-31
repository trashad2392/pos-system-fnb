// src/app/pos/components/ModifierModal.js
"use client";

import { useState, useEffect } from 'react';
import { Modal, Title, Text, Button, Group, Divider, Checkbox, Radio, ScrollArea, Box } from '@mantine/core';

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

  // Recalculate total price and validate selections whenever they change
  useEffect(() => {
    if (!product) return;

    let newTotal = product.price;
    let allGroupsValid = true;

    for (const group of product.modifierGroups) {
      const groupSelections = selections[group.id] || [];
      
      // Check if the number of selections is valid for this group
      if (groupSelections.length < group.minSelection) {
        allGroupsValid = false;
      }

      // Add price adjustments to total
      for (const optionId of groupSelections) {
        const option = group.options.find(opt => opt.id === optionId);
        if (option) {
          newTotal += option.priceAdjustment;
        }
      }
    }

    setTotalPrice(newTotal);
    setIsValid(allGroupsValid);

  }, [selections, product]);

  const handleSelectionChange = (groupId, optionId, isMultiSelect) => {
    setSelections(currentSelections => {
      const newGroupSelections = isMultiSelect ? (currentSelections[groupId] || []) : [];
      const optionIndex = newGroupSelections.indexOf(optionId);

      if (optionIndex > -1) {
        newGroupSelections.splice(optionIndex, 1); // Deselect
      } else {
        // Enforce max selections for multi-select groups
        const group = product.modifierGroups.find(g => g.id === groupId);
        if (isMultiSelect && newGroupSelections.length >= group.maxSelection) {
          // Optional: alert the user they can't select more
          return currentSelections;
        }
        newGroupSelections.push(optionId); // Select
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
        {product.modifierGroups.map(group => (
          <Box key={group.id} mb="md">
            <Title order={4}>{group.name}</Title>
            <Text size="sm" c="dimmed">
              {group.minSelection === group.maxSelection 
                ? `Choose exactly ${group.minSelection}` 
                : `Choose between ${group.minSelection} and ${group.maxSelection}`
              }
            </Text>
            <Divider my="xs" />
            
            {/* Render Radio for single-select, Checkbox for multi-select */}
            {group.maxSelection === 1 ? (
              <Radio.Group value={selections[group.id]?.[0]?.toString() || null} onChange={(val) => handleSelectionChange(group.id, Number(val), false)}>
                <Group mt="xs">
                  {group.options.map(option => (
                    <Radio key={option.id} value={option.id.toString()} label={`${option.name} ($${option.priceAdjustment.toFixed(2)})`} />
                  ))}
                </Group>
              </Radio.Group>
            ) : (
              <Checkbox.Group value={selections[group.id]?.map(String) || []} onChange={(vals) => setSelections({...selections, [group.id]: vals.map(Number)})}>
                <Group mt="xs">
                  {group.options.map(option => (
                    <Checkbox key={option.id} value={option.id.toString()} label={`${option.name} ($${option.priceAdjustment.toFixed(2)})`} />
                  ))}
                </Group>
              </Checkbox.Group>
            )}
          </Box>
        ))}
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