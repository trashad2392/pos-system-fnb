// src/app/pos/components/CommentModal.js
"use client";

import { useState, useEffect } from 'react';
import { Modal, Textarea, Button, Group } from '@mantine/core';

export default function CommentModal({ opened, onClose, onSave, target }) {
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

  const title = target?.product ? `Note for ${target.product.name}` : 'Note for Order';

  return (
    <Modal opened={opened} onClose={onClose} title={title} centered>
      <Textarea
        placeholder="Enter special requests or notes here..."
        value={comment}
        onChange={(event) => setComment(event.currentTarget.value)}
        autosize
        minRows={4}
      />
      <Group justify="flex-end" mt="md">
        <Button variant="default" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={handleSave}>Save Note</Button>
      </Group>
    </Modal>
  );
}