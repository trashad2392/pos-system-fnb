// src/app/pos/components/CommentModal.js
"use client";

import { useState, useEffect } from 'react';
import { Modal, Textarea, Button, Group, ActionIcon, Title } from '@mantine/core';
import { IconKeyboard } from '@tabler/icons-react';
import OnScreenKeyboard from './OnScreenKeyboard';

export default function CommentModal({ opened, onClose, onSave, target, keyboardVisible, onToggleKeyboard }) {
  const [comment, setComment] = useState('');

  useEffect(() => {
    if (opened && target) {
      setComment(target.comment || '');
    }
  }, [opened, target]);

  const handleSave = () => {
    onSave(target, comment);
    onClose();
  };
  
  const titleText = target?.product ? `Note for ${target.product.name}` : 'Note for Order';

  const modalHeader = (
    <Group justify="space-between" style={{ width: '100%' }}>
      <Title order={4}>{titleText}</Title>
      <ActionIcon
        variant={keyboardVisible ? 'filled' : 'outline'}
        color="blue"
        onClick={onToggleKeyboard}
        title="Toggle On-Screen Keyboard"
      >
        <IconKeyboard size={20} />
      </ActionIcon>
    </Group>
  );

  return (
    <Modal opened={opened} onClose={onClose} title={modalHeader} centered size="lg">
      <Textarea
        placeholder="Enter special requests or notes here..."
        value={comment}
        onChange={(event) => setComment(event.currentTarget.value)}
        autosize
        minRows={4}
      />
      
      {keyboardVisible && (
        <OnScreenKeyboard
          value={comment}
          onChange={setComment}
        />
      )}

      <Group justify="flex-end" mt="md">
        <Button variant="default" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={handleSave}>Save Note</Button>
      </Group>
    </Modal>
  );
}