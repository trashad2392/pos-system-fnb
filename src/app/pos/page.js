// src/app/pos/page.js

"use client";

import { useState, useEffect } from 'react';
// --- CHANGE 1: Added ActionIcon here ---
import { Button, Paper, Title, Grid, Card, Text, Group, NumberInput, ScrollArea, ActionIcon } from '@mantine/core';
// --- CHANGE 2: Added IconTrash here ---
import { IconTrash } from '@tabler/icons-react';

export default function PosPage() {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [message, setMessage] = useState('');

  const fetchProducts = async () => {
    try {
      const data = await window.api.getProducts();
      setProducts(data);
    } catch (error) { 
      console.error("Error fetching products:", error); 
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const addToCart = (product) => {
    setMessage('');
    setCart(currentCart => {
      const itemInCart = currentCart.find(item => item.id === product.id);
      if (itemInCart) {
        return currentCart.map(item => 
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...currentCart, { ...product, quantity: 1 }];
    });
  };

  const updateCartQuantity = (productId, quantity) => {
    setCart(currentCart => {
      if (quantity <= 0) {
        return currentCart.filter(item => item.id !== productId);
      }
      return currentCart.map(item => 
        item.id === productId ? { ...item, quantity } : item
      );
    });
  };

  // --- CHANGE 3: Added this new function ---
  const removeFromCart = (productId) => {
    setCart(currentCart => currentCart.filter(item => item.id !== productId));
  };

  const handleCheckout = async () => {
    if (cart.length === 0) {
      setMessage('Error: Cart is empty.');
      return;
    }
    setMessage('Processing checkout...');
    try {
      const result = await window.api.createSale(cart);
      if (result && result.id) {
        setMessage(`Success! Sale #${result.id} created.`);
        setCart([]);
        fetchProducts();
      } else {
        throw new Error('Checkout failed. The backend did not return a sale ID.');
      }
    } catch (error) {
      setMessage(`Error during checkout: ${error.message}`);
      console.error("Checkout Error:", error);
    }
  };

  const cartTotal = cart.reduce((total, item) => total + (Number(item.price) * item.quantity), 0);

  return (
    <Grid>
      {/* Product Selection Column */}
      <Grid.Col span={8}>
        <Paper p="md" withBorder>
          <Title order={2} mb="md">Products</Title>
          <ScrollArea style={{ height: '85vh' }}>
            <Grid>
              {products.map(product => (
                <Grid.Col span={4} key={product.id}>
                  <Card shadow="sm" padding="lg" radius="md" withBorder>
                    <Text fw={500}>{product.name}</Text>
                    <Text size="sm" c="dimmed">
                      Stock: {product.stock_quantity > 0 ? product.stock_quantity : 'Out of Stock'}
                    </Text>
                    <Text size="lg" fw={700}>${Number(product.price).toFixed(2)}</Text>
                    <Button 
                      onClick={() => addToCart(product)} 
                      disabled={product.stock_quantity <= cart.find(item => item.id === product.id)?.quantity || product.stock_quantity === 0}
                      fullWidth 
                      mt="md"
                    >
                      Add to Cart
                    </Button>
                  </Card>
                </Grid.Col>
              ))}
            </Grid>
          </ScrollArea>
        </Paper>
      </Grid.Col>

      {/* Cart Column */}
      <Grid.Col span={4}>
        <Paper p="md" withBorder>
          <Title order={2}>Cart</Title>
          <ScrollArea style={{ height: '60vh', marginBottom: '1rem' }}>
            {cart.length === 0 ? <Text>Cart is empty</Text> : (
              cart.map(item => (
                <Group key={item.id} justify="space-between" mt="sm" wrap="nowrap">
                  <div style={{ flex: 1 }}>
                    <Text size="sm">{item.name}</Text>
                    <Text size="xs" c="dimmed">${Number(item.price).toFixed(2)} each</Text>
                  </div>
                  <NumberInput 
                    value={item.quantity} 
                    onChange={(val) => updateCartQuantity(item.id, val || 0)} 
                    min={0} 
                    max={item.stock_quantity} 
                    style={{ width: 80 }} 
                  />
                  <Text fw={500} style={{ minWidth: '60px', textAlign: 'right' }}>
                    ${(Number(item.price) * item.quantity).toFixed(2)}
                  </Text>
                  {/* --- CHANGE 4: Added this delete button --- */}
                  <ActionIcon color="red" variant="subtle" onClick={() => removeFromCart(item.id)} title="Remove item">
                    <IconTrash size={16} />
                  </ActionIcon>
                </Group>
              ))
            )}
          </ScrollArea>
          <hr/>
          <Group justify="space-between" mt="md">
            <Title order={3}>Total:</Title>
            <Title order={3}>${cartTotal.toFixed(2)}</Title>
          </Group>
          <Button onClick={handleCheckout} fullWidth mt="md" size="lg" disabled={cart.length === 0}>
            Check-out
          </Button>
          {message && <Text mt="sm" size="sm" c={message.startsWith('Error') ? 'red' : 'green'}>{message}</Text>}
        </Paper>
      </Grid.Col>
    </Grid>
  );
}