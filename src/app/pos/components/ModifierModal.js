// src/app/pos/components/ModifierModal.js
"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Modal, Title, Text, Button, Group, Divider, Box, Chip, Progress } from '@mantine/core';

export default function ModifierModal({ product, opened, onClose, onConfirm }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [selections, setSelections] = useState({});
  const [totalPrice, setTotalPrice] = useState(0);

  const sortedModifierGroups = useMemo(() => {
    if (!product || !product.modifierGroups) return [];
    return product.modifierGroups.map(pmg => pmg.modifierGroup);
  }, [product]);

  useEffect(() => {
    if (opened && product) {
      setCurrentStep(0);
      setSelections({});
      setTotalPrice(product.price);
    }
  }, [opened, product]);

  const handleConfirm = useCallback(() => {
    const allSelectedOptionIds = Object.values(selections).flat();
    onConfirm(product, allSelectedOptionIds);
  }, [selections, product, onConfirm]);

  useEffect(() => {
    if (!opened || !sortedModifierGroups || sortedModifierGroups.length === 0) return;

    const currentGroup = sortedModifierGroups[currentStep];
    if (!currentGroup) return;
    
    const isOptional = currentGroup.minSelection === 0;
    const currentGroupSelections = selections[currentGroup.id] || [];
    
    if (isOptional && currentGroupSelections.length === 0) {
        return;
    }
    
    const pointsUsed = currentGroupSelections.reduce((sum, optionId) => {
        const option = currentGroup.options.find(opt => opt.id === optionId);
        return sum + (option ? option.selectionCost : 0);
    }, 0);

    const isMinItemsMet = currentGroupSelections.length >= currentGroup.minSelection;
    const isBudgetFilled = pointsUsed >= currentGroup.selectionBudget;

    if (isMinItemsMet && (isBudgetFilled || isOptional)) {
      const isFinalStep = currentStep === sortedModifierGroups.length - 1;
      
      if (isFinalStep) {
        const timer = setTimeout(() => handleConfirm(), 300); 
        return () => clearTimeout(timer);
      } else {
        const timer = setTimeout(() => setCurrentStep(s => s + 1), 300);
        return () => clearTimeout(timer);
      }
    }
  }, [selections, currentStep, opened, sortedModifierGroups, handleConfirm]);
  
  useEffect(() => {
    if (!product) return;
    let newTotal = product.price;
    Object.values(selections).flat().forEach(optionId => {
      for (const group of sortedModifierGroups) {
        const option = group.options.find(opt => opt.id === optionId);
        if (option) {
          newTotal += option.priceAdjustment;
          break; 
        }
      }
    });
    setTotalPrice(newTotal);
  }, [selections, product, sortedModifierGroups]);


  const handleSelectionChange = (groupId, optionId) => {
    setSelections(currentSelections => {
      const group = sortedModifierGroups.find(g => g.id === groupId);
      const currentGroupSelections = currentSelections[groupId] || [];
      const isSelected = currentGroupSelections.includes(optionId);
      let newGroupSelections;

      if (isSelected) {
        newGroupSelections = currentGroupSelections.filter(id => id !== optionId);
      } else {
        const optionToAdd = group.options.find(opt => opt.id === optionId);
        if (!optionToAdd) return currentSelections;

        let pointsUsed = currentGroupSelections.reduce((sum, id) => {
          const opt = group.options.find(o => o.id === id);
          return sum + (opt ? opt.selectionCost : 0);
        }, 0);
        
        if (pointsUsed + optionToAdd.selectionCost <= group.selectionBudget) {
          newGroupSelections = [...currentGroupSelections, optionId];
        } else {
          if (group.selectionBudget === 1 && optionToAdd.selectionCost === 1) {
            newGroupSelections = [optionId];
          } else {
            newGroupSelections = currentGroupSelections;
          }
        }
      }
      return { ...currentSelections, [groupId]: newGroupSelections };
    });
  };
  
  // This button now handles both skipping and finishing
  const handleNextOrFinish = () => {
    const isFinalStep = currentStep === sortedModifierGroups.length - 1;
    if (isFinalStep) {
        handleConfirm();
    } else {
        setCurrentStep(s => s + 1);
    }
  };

  if (!product || !opened || sortedModifierGroups.length === 0) return null;
  const currentGroup = sortedModifierGroups[currentStep];
  if (!currentGroup) return null;
  
  const currentGroupSelections = selections[currentGroup.id] || [];
  const pointsUsed = currentGroupSelections.reduce((sum, optionId) => {
    const option = currentGroup.options.find(opt => opt.id === optionId);
    return sum + (option ? option.selectionCost : 0);
  }, 0);

  const isFinalStep = currentStep === sortedModifierGroups.length - 1;
  const showOptionalButton = currentGroup.minSelection === 0 && currentGroupSelections.length === 0;

  return (
    <Modal 
      opened={opened} 
      onClose={onClose} 
      title={`Customize ${product.name}`} 
      size="lg" 
      withCloseButton={false}
      closeOnClickOutside={false}
      closeOnEscape={false}
    >
      <Progress value={((currentStep + 1) / sortedModifierGroups.length) * 100} mb="md" />
      
      <Box style={{ minHeight: '50vh', position: 'relative' }}>
          <Box key={currentGroup.id}>
            <Group justify="space-between">
              <Title order={4}>{currentGroup.name}</Title>
              <Text size="sm" c="dimmed">Points used: {pointsUsed} / {currentGroup.selectionBudget}</Text>
            </Group>
            <Text size="sm" c="dimmed">
              Choose at least {currentGroup.minSelection}. Use up to {currentGroup.selectionBudget} points.
            </Text>
            <Divider my="md" />
            
            <Group mt="xs" gap="md">
              {currentGroup.options.map(option => {
                const isSelected = currentGroupSelections.includes(option.id);
                const isDisabled = !isSelected && (pointsUsed + option.selectionCost > currentGroup.selectionBudget);

                return (
                  <Chip
                    key={option.id}
                    value={option.id.toString()}
                    checked={isSelected}
                    onChange={() => handleSelectionChange(currentGroup.id, option.id)}
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
      </Box>

      <Divider my="sm" />
      <Group justify="space-between" align="center" mt="md">
        <Title order={3}>Total: ${totalPrice.toFixed(2)}</Title>
        <Group>
            {showOptionalButton && (
                <Button variant="outline" onClick={handleNextOrFinish}>
                    {isFinalStep ? 'Finish' : 'Skip'}
                </Button>
            )}
        </Group>
      </Group>
    </Modal>
  );
}