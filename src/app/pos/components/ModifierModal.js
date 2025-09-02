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

  // Recalculate total price and validate selections whenever they change
  useEffect(() => {
    if (!product) return;

    let newTotal = product.price;
    let allGroupsValid = true;

    for (const group of product.modifierGroups) {
      const groupSelections = selections[group.id] || [];
      if (groupSelections.length < group.minSelection) {
        allGroupsValid = false;
      }
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

  const handleSelectionChange = (groupId, optionId) => {
    setSelections(currentSelections => {
      const group = product.modifierGroups.find(g => g.id === groupId);
      const currentGroupSelections = currentSelections[groupId] || [];
      const isSelected = currentGroupSelections.includes(optionId);
      let newGroupSelections;

      if (isSelected) {
        newGroupSelections = currentGroupSelections.filter(id => id !== optionId);
      } else {
        if (group.maxSelection === 1) {
          newGroupSelections = [optionId];
        } else {
          if (currentGroupSelections.length < group.maxSelection) {
            newGroupSelections = [...currentGroupSelections, optionId];
          } else {
            newGroupSelections = currentGroupSelections;
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
        {product.modifierGroups.map(group => (
          <Box key={group.id} mb="md">
            <Title order={4}>{group.name}</Title>
            <Text size="sm" c="dimmed">
              {group.minSelection === 0 && group.maxSelection > 1 ? `Choose up to ${group.maxSelection}` :
               group.minSelection === group.maxSelection ? `Choose exactly ${group.minSelection}` :
               `Choose between ${group.minSelection} and ${group.maxSelection}`
              }
            </Text>
            <Divider my="xs" />
            
            <Group mt="xs" gap="md">
              {group.options.map(option => {
                const isSelected = selections[group.id]?.includes(option.id);
                return (
                  <Chip
                    key={option.id}
                    value={option.id.toString()}
                    checked={isSelected}
                    onChange={() => handleSelectionChange(group.id, option.id)}
                    variant="outline"
                    // --- UPDATED STYLING ---
                    size="lg"      // Makes the text and overall size larger
                    radius="md"     // Makes the corners rounded, not a full pill
                  >
                    {option.name} {option.priceAdjustment > 0 ? `(+$${option.priceAdjustment.toFixed(2)})` : ''}
                  </Chip>
                );
              })}
            </Group>
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