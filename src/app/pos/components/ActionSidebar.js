// src/app/pos/components/ActionSidebar.js
"use client";
import { Stack, Button, Box, Tooltip, Text } from '@mantine/core';
import { IconDeviceFloppy, IconEraser, IconX, IconPencil, IconTag, IconNote, IconWallet } from '@tabler/icons-react';
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
        minHeight: 0, // Prevents buttons from forcing container growth
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

  const handleDiscountClick = () => {
    if (order) onOpenDiscountModal(order);
  };
  
  const handleItemNoteClick = () => {
    const item = order?.items?.find(i => i.id === selectedItemId);
    if (item) onOpenCommentModal(item);
  };
  
  const handleOrderNoteClick = () => {
    if (order) onOpenCommentModal(order);
  };
  
  const handleOtherPaymentsClick = () => {
     openPaymentModal();
  }

  return (
    <Box 
      style={{ 
        width: '100%', 
        height: '100%', // Inherited from parent Grid.Col
        borderRight: '1px solid var(--mantine-color-gray-3)',
        overflow: 'hidden' // Ensure no scroll is introduced here
      }} 
      // 🛑 FIX: Removed vertical padding (py) to prevent column overflow, kept horizontal (px)
      px="xs" 
      py={0}
    >
      {/* Stack (flex container) is set to 100% height, gap="xs" is the spacing */}
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