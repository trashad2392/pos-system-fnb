// src/components/auth/LoginScreen.js
"use client";

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { 
  Container, 
  Title, 
  Paper, 
  PasswordInput, 
  Button, 
  Group, 
  Grid, 
  Center,
  Box,
  Text
} from '@mantine/core';
import { IconBackspace } from '@tabler/icons-react';

export default function LoginScreen() {
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleKeyPress = (key) => {
    if (pin.length < 8) {
      setPin(pin + key);
    }
  };

  const handleBackspace = () => {
    setPin(pin.slice(0, -1));
  };

  const handleClear = () => {
    setPin('');
  };

  const handleLogin = async (event) => {
    // Prevent default form submission if triggered by Enter key
    if (event) event.preventDefault();
    
    if (!pin) return;
    setLoading(true);
    try {
      await login(pin);
      // On successful login, AuthProvider will switch the view.
    } catch (error) {
      // Clear PIN on failed login
      setPin('');
    } finally {
      setLoading(false);
    }
  };
  
  const keypadButtons = [
    '7', '8', '9',
    '4', '5', '6',
    '1', '2', '3'
  ];

  return (
    <Container size="xs" style={{ height: '100vh', display: 'flex', alignItems: 'center' }}>
      <Paper withBorder shadow="md" p={30} radius="md" style={{width: '100%'}}>
        <Title ta="center" mb="lg">Enter PIN</Title>
        {/* We wrap the input and button in a form to allow submitting with the Enter key */}
        <form onSubmit={handleLogin}>
          <PasswordInput
            value={pin}
            // --- START OF CHANGES ---
            onChange={(event) => {
              // This allows typing from a physical keyboard, filtering non-numeric characters
              const newPin = event.currentTarget.value.replace(/[^0-9]/g, '');
              if (newPin.length <= 8) {
                setPin(newPin);
              }
            }}
            // --- END OF CHANGES ---
            size="xl"
            ta="center"
            mb="md"
            autoFocus // Automatically focus the input field on load
          />
          
          <Grid gutter="xs">
            {keypadButtons.map((num) => (
              <Grid.Col span={4} key={num}>
                <Button onClick={() => handleKeyPress(num)} size="lg" fullWidth variant="default">
                  <Text size="xl">{num}</Text>
                </Button>
              </Grid.Col>
            ))}
            <Grid.Col span={4}>
              <Button onClick={handleClear} size="lg" fullWidth color="red" variant="outline">
                C
              </Button>
            </Grid.Col>
            <Grid.Col span={4}>
              <Button onClick={() => handleKeyPress('0')} size="lg" fullWidth variant="default">
                  <Text size="xl">0</Text>
              </Button>
            </Grid.Col>
            <Grid.Col span={4}>
              <Button onClick={handleBackspace} size="lg" fullWidth variant="light">
                <IconBackspace />
              </Button>
            </Grid.Col>
          </Grid>

          <Button 
            type="submit" // Allows pressing Enter to submit
            fullWidth 
            mt="xl" 
            size="lg" 
            onClick={handleLogin} 
            loading={loading}
            disabled={!pin}
          >
            Login
          </Button>
        </form>
      </Paper>
    </Container>
  );
}