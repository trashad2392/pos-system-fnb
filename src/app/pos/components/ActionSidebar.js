// src/app/pos/components/ActionSidebar.js
"use client";
import { Stack, Button, Box, Tooltip, Text } from '@mantine/core';
import { IconDeviceFloppy, IconEraser, IconPencil, IconTag, IconNote, IconWallet } from '@tabler/icons-react';
import { useAuth } from '@/context/AuthContext';

// Revised ActionButton to use flex: 1 for equal height distribution
const ActionButton = ({ icon: Icon, onClick, color = 'blue', label, disabled = false, variant = 'light' }) => (
  <Tooltip label={label} position="right" withArrow>
    <Button
      variant={variant}
      color={color}
      onClick={onClick}
      disabled={disabled}
      size="md"
      style={{
        flex: 1, // CRITICAL: Shares the available vertical space equally
        width: '100%',
        padding: '4px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 0, 
      }}
    >
      <Icon size={26} style={{ marginBottom: 4, flexShrink: 0 }} />
      <Text size="10px" fw={600} style={{ lineHeight: 1.1, textAlign: 'center', whiteSpace: 'pre-wrap' }}>
        {label}
      </Text>
    </Button>
  </Tooltip>
);

export default function ActionSidebar({
  order,
  isCartEmpty,
  selectedItemId,
  onOpenCommentModal,
  onOpenDiscountModal,
  onHold,
  onClearOrder,
  openPaymentModal,
}) {
  const { hasPermission } = useAuth();

  // FIXED: Trigger the modal without passing the order object here.
  // The target is already determined in usePosLogic.js
  const handleDiscountClick = () => {
    onOpenDiscountModal(); 
  };
  
  const handleItemNoteClick = () => {
    // Pass the selectedItemId so the modal knows we are commenting on an item
    if (selectedItemId) onOpenCommentModal(selectedItemId);
  };
  
  const handleOrderNoteClick = () => {
    // Passing null triggers the modal to target the Order level
    onOpenCommentModal(null);
  };
  
  const handleOtherPaymentsClick = () => {
     openPaymentModal();
  }

  return (
    <Box 
      style={{ 
        width: '100%', 
        height: '100%', 
        borderRight: '1px solid var(--mantine-color-gray-3)',
        overflow: 'hidden' 
      }} 
      px="xs" 
      py={0}
    >
      <Stack gap="xs" style={{ height: '100%' }}>
        
        {/* 1. Order Note */}
        <ActionButton 
          icon={IconNote} 
          onClick={handleOrderNoteClick} 
          label="Order Note" 
          color="blue"
          variant="outline"
          disabled={!order}
        />
        
        {/* 2. Item Note */}
        <ActionButton 
          icon={IconPencil} 
          onClick={handleItemNoteClick} 
          label="Item Note" 
          color="blue"
          variant="outline"
          disabled={!selectedItemId}
        />
        
        {/* 3. Discount Order */}
        <ActionButton 
          icon={IconTag} 
          onClick={handleDiscountClick} 
          label="Discount" 
          color="red"
          variant="outline"
          // Ensure permission check is active
          disabled={isCartEmpty || !order || !hasPermission('discounts:apply')}
        />

        {/* 4. Hold Order / View Held */}
        <ActionButton 
          icon={IconDeviceFloppy} 
          onClick={onHold} 
          label={isCartEmpty ? 'View Held' : 'Hold Order'} 
          color={order?.orderType === 'Dine-In' ? 'gray' : 'yellow'}
          variant="light"
          disabled={order?.orderType === 'Dine-In' && isCartEmpty} 
        />

        {/* 5. Clear Cart */}
        <ActionButton 
          icon={IconEraser} 
          onClick={onClearOrder} 
          label="Clear Cart" 
          color="red" 
          variant="light"
          disabled={isCartEmpty}
        />

        {/* 6. Other Payments */}
        <ActionButton 
          icon={IconWallet} 
          onClick={handleOtherPaymentsClick} 
          label="Other Payments" 
          color="blue"
          variant="light"
          disabled={isCartEmpty}
        />

      </Stack>
    </Box>
  );
}