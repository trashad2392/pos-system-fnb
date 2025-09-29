// src/context/AuthContext.js
"use client";

import { createContext, useState, useContext, useEffect } from 'react';
import { useRouter } from 'next/navigation'; // <-- NEW: Import useRouter
import { notifications } from '@mantine/notifications';
import { Center, Loader } from '@mantine/core';

const AuthContext = createContext(null);

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter(); // <-- NEW: Get router instance

  // On initial load, check if a user session is active on the backend
  useEffect(() => {
    const checkActiveUser = async () => {
      try {
        const activeUser = await window.api.getActiveUser();
        if (activeUser) {
          setUser(activeUser);
        }
      } catch (error) {
        console.error("Failed to get active user on load:", error);
      } finally {
        setLoading(false);
      }
    };
    checkActiveUser();
  }, []);

  const login = async (pin) => {
    try {
      const loggedInUser = await window.api.login(pin);
      setUser(loggedInUser);
      notifications.show({
        title: `Welcome, ${loggedInUser.name}!`,
        message: 'You have been successfully clocked in.',
        color: 'green',
      });
      
      // --- START OF FIX ---
      // Redirect based on role after successful login
      if (loggedInUser.role === 'Cashier') {
        router.push('/pos');
      } else {
        router.push('/'); // Managers and Admins go to the main management page
      }
      // --- END OF FIX ---

      return loggedInUser;
    } catch (error) {
      notifications.show({
        title: 'Login Failed',
        message: error.message,
        color: 'red',
      });
      throw error;
    }
  };

  const logout = async () => {
    try {
      await window.api.logout();
      setUser(null);
      notifications.show({
        title: 'Logged Out',
        message: 'You have been successfully logged out.',
        color: 'blue',
      });
      router.push('/'); // Redirect to the root, which will show the login screen
    } catch (error) {
      notifications.show({
        title: 'Logout Failed',
        message: error.message,
        color: 'red',
      });
    }
  };
  
  const clockOut = async () => {
    try {
      const clockedOutUser = user; // capture user before setting to null
      await window.api.clockOut();
      setUser(null);
      notifications.show({
        title: `Goodbye, ${clockedOutUser.name}!`,
        message: 'You have been successfully clocked out.',
        color: 'blue',
      });
      router.push('/'); // Redirect to the root, which will show the login screen
    } catch (error) {
       notifications.show({
        title: 'Clock-Out Failed',
        message: error.message,
        color: 'red',
      });
    }
  };

  const value = {
    user,
    login,
    logout,
    clockOut,
    isAuthenticated: !!user,
    // Add roles for easy access control
    isManager: user?.role === 'Manager' || user?.role === 'Admin',
    isAdmin: user?.role === 'Admin',
  };

  if (loading) {
    return (
      <Center style={{ height: '100vh' }}>
        <Loader size="xl" />
      </Center>
    );
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}