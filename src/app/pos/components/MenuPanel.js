// src/app/pos/components/MenuPanel.js
"use client";

import { Title, Grid, Button, Paper, Text, Group, Tabs, ScrollArea, Center, Box, Image, Stack, UnstyledButton, AspectRatio } from '@mantine/core';
import { IconArrowLeft, IconChevronUp, IconChevronDown, IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import { useRef, useState, useEffect, useMemo } from 'react';

// --- Small Square Scroll Button Component for Menu Panel ---
const ScrollButton = ({ icon: Icon, onClick, direction, ariaLabel }) => {
    return (
      <Button 
        onClick={onClick} 
        variant="outline" // Use outline for borders
        size="sm"
        color="gray"
        p={0}
        aria-label={ariaLabel}
        style={{ 
            height: 40, 
            width: 40, 
            minWidth: 40,
            flexShrink: 0,
        }}
      >
        <Icon size={20} />
      </Button>
    );
};
// -----------------------------------------------------------


export default function MenuPanel({ order, onBack, menu, onProductSelect }) {
  const { categories, products } = menu;
  const [activeTab, setActiveTab] = useState(categories?.length > 0 ? categories[0].id.toString() : null);

  // 🛑 FIX: Use separate refs for the component instance and the actual DOM viewport element
  const productScrollComponentRef = useRef(null); 
  const productViewportElementRef = useRef(null); 
  
  const tabsScrollRef = useRef(null); 

  // Set the default active tab on initial load
  useEffect(() => {
    if (categories.length > 0 && !activeTab) {
      setActiveTab(categories[0].id.toString());
    }
  }, [categories, activeTab]);


  // Custom scroll logic for the vertical product grid
  const scrollProducts = (direction) => {
    
    const scrollComponent = productScrollComponentRef.current;
    const scrollElement = productViewportElementRef.current; // Direct access to the DOM viewport

    // Execute immediately since refs are stable and working
    if (scrollComponent && scrollElement) {
      
      const scrollStep = 150; // Use the smoother, item-aligned scroll step
      const currentScrollTop = scrollElement.scrollTop;
      const maxScroll = scrollElement.scrollHeight - scrollElement.clientHeight;
      let newScrollTop;

      if (direction === 'up') {
        newScrollTop = Math.max(0, currentScrollTop - scrollStep);
      } else {
        newScrollTop = Math.min(maxScroll, currentScrollTop + scrollStep);
      }
      
      // Execute scroll only if position changes
      if (newScrollTop !== currentScrollTop) {
        // 🛑 CRITICAL FIX: Direct assignment to native DOM scrollTop property
        scrollElement.scrollTop = newScrollTop; 
        console.log(`[Product Scroll SUCCESS] Scrolling ${direction} from ${currentScrollTop.toFixed(0)} to ${newScrollTop.toFixed(0)}`);
      } else {
         console.warn(`[Product Scroll BLOCKED] Already at the ${direction === 'up' ? 'top' : 'bottom'} boundary.`);
      }

    } else {
        console.warn("[Product Scroll FAIL] ScrollArea component ref or viewport element not ready. Try again.");
    }
  };

  // Custom scroll logic for the horizontal category tabs (DOM element) - (Remains stable)
  const scrollTabs = (direction) => {
    const scrollElement = tabsScrollRef.current;
    if (scrollElement) {
      const scrollStep = 250;
      let newScrollLeft;

      if (direction === 'left') {
        newScrollLeft = Math.max(0, scrollElement.scrollLeft - scrollStep);
      } else {
        newScrollLeft = Math.min(scrollElement.scrollWidth - scrollElement.clientWidth, scrollElement.scrollLeft + scrollStep);
      }

      // Use raw DOM method as Tabs.List is a standard div
      scrollElement.scrollTo({ 
        left: newScrollLeft, 
        behavior: 'smooth' 
      });
    } else {
        console.warn("[Tabs Scroll FAIL] TabsList DOM element not found.");
    }
  };

  const filteredProducts = useMemo(() => {
    if (!activeTab || isNaN(parseInt(activeTab, 10))) return [];
    return products.filter(p => p.categoryId === parseInt(activeTab, 10));
  }, [products, activeTab]);

  return (
    <>
      <Group justify="space-between" mb="md" style={{ flexShrink: 0 }}>
        <Title order={2} style={{ flexGrow: 1, marginRight: '10px' }}>
            {order?.table ? `Order for ${order.table.name}` : `${order?.orderType || 'New'} Order`}
        </Title>
        <Button onClick={onBack} variant="outline" leftSection={<IconArrowLeft size={16} />} style={{ flexShrink: 0 }}>
            Back to Home
        </Button>
      </Group>
      {/* Outer Paper wrapper uses flex: 1 for height */}
      <Paper withBorder p="md" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        
        {/* --- Category Tabs with Custom Horizontal Scrollers (Fixed Height) --- */}
        <Group align="center" gap="xs" mb="sm" style={{ flexShrink: 0 }}>
          <ScrollButton 
            icon={IconChevronLeft} 
            onClick={() => scrollTabs('left')} 
            ariaLabel="Scroll Categories Left" 
            direction="left"
          />
          <Box style={{ overflowX: 'hidden', flex: 1 }}>
            <Tabs value={activeTab} onChange={setActiveTab} style={{ minWidth: '100%' }}>
              <Tabs.List 
                ref={tabsScrollRef} 
                style={{ flexWrap: 'nowrap', overflowX: 'auto', paddingBottom: '5px' }} 
              >
                {(categories || []).map(cat => (
                  <Tabs.Tab key={cat.id} value={cat.id.toString()} style={{ flexShrink: 0 }}>
                    {cat.name}
                  </Tabs.Tab>
                ))}
              </Tabs.List>
            </Tabs>
          </Box>
          <ScrollButton 
            icon={IconChevronRight} 
            onClick={() => scrollTabs('right')} 
            ariaLabel="Scroll Categories Right" 
            direction="right"
          />
        </Group>
        
        {/* --- Product Grid with Custom Vertical Scrollers (Flexible Height) --- */}
        <Box style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          
          {/* Scroll Up Button Group (Fixed Height) */}
          <Group justify="space-between" mb="xs" style={{ flexShrink: 0 }}>
            <Text fw={600}>Products</Text>
            <Group gap={4}>
                <ScrollButton 
                    icon={IconChevronUp} 
                    onClick={() => scrollProducts('up')} 
                    label="Scroll Products Up"
                />
            </Group>
          </Group>

          {/* Scroll Area (Flexible Height, minHeight: 0 for internal scrolling) */}
          <ScrollArea 
            style={{ flex: 1, minHeight: 0, padding: '5px' }} 
            // 🛑 FIX: Assigning two separate refs
            ref={productScrollComponentRef} 
            viewportRef={productViewportElementRef}
            scrollbarSize={0}
          >
            <Tabs value={activeTab}>
              {(categories || []).map(cat => (
                <Tabs.Panel 
                  key={cat.id} 
                  value={cat.id.toString()} 
                  style={{ padding: 0 }} 
                >
                  <Grid gutter="xs">
                    {filteredProducts.map(product => (
                        <Grid.Col span={{ base: 6, sm: 3, md: 2.4 }} key={product.id}>
                          <UnstyledButton
                            onClick={() => onProductSelect(product)}
                            style={{ width: '100%' }}
                          >
                            <Paper withBorder shadow="sm" p="xs" radius="md">
                              <Stack align="center" justify="center" gap={4}>
                                <AspectRatio ratio={4 / 3} style={{ width: '100%' }}>
                                  {product.image ? (
                                    <Image src={product.image} alt={product.name} fit="contain" />
                                  ) : (
                                    <Center style={{ height: '100%', border: '1px dashed var(--mantine-color-gray-3)', borderRadius: '4px' }}>
                                      <Text size="xs" c="dimmed">No Image</Text>
                                    </Center>
                                  )}
                                </AspectRatio>
                                <Text size="sm" wrap="wrap" ta="center" lh={1.2} mt={4} style={{ height: '40px' }}>
                                  {product.name}
                                </Text>
                                <Text size="sm" fw={500} c="dimmed">
                                  ${product.price.toFixed(2)}
                                </Text>
                              </Stack>
                            </Paper>
                          </UnstyledButton>
                        </Grid.Col>
                    ))}
                  </Grid>
                </Tabs.Panel>
              ))}
            </Tabs>
          </ScrollArea>

          {/* Scroll Down Button Group (Fixed Height) */}
          <Group justify="flex-end" mt="xs" style={{ flexShrink: 0 }}>
            <ScrollButton 
                icon={IconChevronDown} 
                onClick={() => scrollProducts('down')} 
                label="Scroll Products Down"
            />
          </Group>
        </Box>
      </Paper>
    </>
  );
}