// src/app/pos/components/CartPanel.js
"use client";

import { useRef } from 'react';
import { Button, Paper, Text, Group, ScrollArea, Box, ActionIcon, Badge, Tooltip, Center } from '@mantine/core';
import { IconX, IconChevronUp, IconChevronDown, IconNote } from '@tabler/icons-react';

// --- Small Square Scroll Button Component (Pure Icon) ---
const ScrollButton = ({ icon: Icon, onClick, label }) => (
  <Button 
    size="md" 
    onClick={onClick} 
    variant="outline" 
    color="gray"
    p={0}
    style={{ 
        height: 40, 
        width: 40, 
        minWidth: 40,
        flexShrink: 0,
        borderColor: 'var(--mantine-color-gray-4)'
    }}
    aria-label={label}
  >
    <Icon size={24} />
  </Button>
);
// ----------------------------------------------------------------

export default function CartPanel({
  order,
  isCartEmpty,
  selectedItemId,
  onSelectItem,
  onRemoveItem,
  calculateItemTotal,
  currencySymbol = '$', // Added prop with default fallback
}) {
  const scrollComponentRef = useRef(null); 
  const viewportElementRef = useRef(null); 

  const scrollCart = (direction) => {
    const scrollComponent = scrollComponentRef.current;
    const scrollElement = viewportElementRef.current; 

    if (scrollComponent && scrollElement) {
        const scrollStep = 150; 
        const currentScrollTop = scrollElement.scrollTop;
        const maxScroll = scrollElement.scrollHeight - scrollElement.clientHeight;
        let newScrollTop;

        if (direction === 'up') {
            newScrollTop = Math.max(0, currentScrollTop - scrollStep);
        } else {
            newScrollTop = Math.min(maxScroll, currentScrollTop + scrollStep);
        }

        if (newScrollTop !== currentScrollTop) {
            scrollElement.scrollTop = newScrollTop; 
            console.log(`[Cart Scroll SUCCESS] Scrolling ${direction} from ${currentScrollTop.toFixed(0)} to ${newScrollTop.toFixed(0)}`);
        } else {
             console.warn(`[Cart Scroll BLOCKED] Already at the ${direction === 'up' ? 'top' : 'bottom'} boundary.`);
        }
    } 
  };

  return (
    <Paper withBorder p="xs" style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      
      <Group justify="space-between" px="xs" pt="xs" pb={4} style={{ flexShrink: 0 }}>
        <Text fw={700} size="sm">Cart Items</Text>
        <ScrollButton 
            icon={IconChevronUp} 
            onClick={() => scrollCart('up')} 
            label="Scroll Up"
        />
      </Group>
      
      {!isCartEmpty ? (
        <ScrollArea 
          ref={scrollComponentRef} 
          viewportRef={viewportElementRef} 
          style={{ 
              flex: 1,                 
              minHeight: 0,            
              position: 'relative', 
              padding: '0 4px' 
          }}
          scrollbarSize={0} 
        >
          <Box>
            {order?.comment && (
              <Paper withBorder p="xs" mb="xs" shadow="xs" bg="blue.0">
                <Group gap="xs">
                  <IconNote size={16} style={{ flexShrink: 0 }}/>
                  <Text size="sm" style={{ whiteSpace: 'pre-wrap', flexGrow: 1 }}>
                      {order.comment}
                  </Text>
                </Group>
              </Paper>
            )}

            {order.items.map(item => {
              const itemTotal = calculateItemTotal(item);
              let discountedItemTotal = itemTotal;
              if (item.discount) {
                if (item.discount.type === 'PERCENT') {
                  discountedItemTotal *= (1 - item.discount.value / 100);
                } else {
                  discountedItemTotal -= (item.discount.value * item.quantity);
                }
              }
              
              return (
                <Box key={item.id} onClick={() => onSelectItem(item.id)} style={{ cursor: 'pointer' }} mb="xs">
                  <Paper withBorder p="xs" shadow={selectedItemId === item.id ? 'md' : 'xs'}
                    style={selectedItemId === item.id ? { border: `1px solid var(--mantine-color-blue-6)` } : {}}
                  >
                    <Group justify="space-between" wrap="nowrap">
                        <Text fw={500} lineClamp={2} style={{ lineHeight: 1.2 }}>{item.product?.name || 'Unknown'}</Text>
                        <Tooltip label="Remove" position="left">
                          <ActionIcon color="red" variant="subtle" onClick={(e) => { e.stopPropagation(); onRemoveItem(item.id); }}>
                              <IconX size={16} />
                          </ActionIcon>
                        </Tooltip>
                    </Group>
                    
                    {item.comment && <Text size="xs" c="blue.8" fs="italic">&bull; {item.comment}</Text>}
                    
                    {item.selectedModifiers?.map(mod => (
                        <Text key={mod.id} size="xs" c="dimmed" style={{ lineHeight: 1.1, marginLeft: 4 }}>
                        &bull; {mod.modifierOption?.name}
                        </Text>
                    ))}

                    {item.discount && (
                        <Badge color="red" variant="outline" size="xs" mt={2}>
                            {item.discount.name}
                        </Badge>
                    )}
                    
                    <Group justify="space-between" mt={4}>
                      <Text size="md" fw={700}>x{item.quantity}</Text>
                      {item.discount ? (
                        <Group gap={4}>
                            <Text td="line-through" c="dimmed" size="sm">{currencySymbol}{itemTotal.toFixed(2)}</Text>
                            <Text fw={600}>{currencySymbol}{discountedItemTotal.toFixed(2)}</Text>
                        </Group>
                      ) : (
                        <Text fw={600}>{currencySymbol}{itemTotal.toFixed(2)}</Text>
                      )}
                    </Group>
                  </Paper>
                </Box>
              )
            })}
          </Box>
        </ScrollArea>
      ) : (
        <Center style={{ flex: 1 }}><Text c="dimmed">Empty</Text></Center>
      )}

      <Group justify="flex-end" px="xs" pt={4} pb="xs" style={{ flexShrink: 0 }}>
        <ScrollButton 
            icon={IconChevronDown} 
            onClick={() => scrollCart('down')} 
            label="Scroll Down"
        />
      </Group>
      
    </Paper>
  );
}