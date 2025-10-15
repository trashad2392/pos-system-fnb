// src/context/AuthContext.js
"use client";

import { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { notifications } from '@mantine/notifications';
import { Center, Loader } from '@mantine/core';

const AuthContext = createContext(null);

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

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
      
      // Redirect to the smart landing page
      router.push('/');

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
      router.push('/');
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
      const clockedOutUser = user;
      await window.api.clockOut();
      setUser(null);
      notifications.show({
        title: `Goodbye, ${clockedOutUser.name}!`,
        message: 'You have been successfully clocked out.',
        color: 'blue',
      });
      router.push('/');
    } catch (error) {
       notifications.show({
        title: 'Clock-Out Failed',
        message: error.message,
        color: 'red',
      });
    }
  };

  // --- NEW: hasPermission function ---
  const hasPermission = useCallback((permission) => {
    if (!user || !user.permissions) {
      return false;
    }
    return user.permissions.includes(permission);
  }, [user]);


  const value = {
    user,
    loading,
    login,
    logout,
    clockOut,
    isAuthenticated: !!user,
    hasPermission, // Expose the new function
    // isManager is now deprecated, but we can keep it for a bit for compatibility
    isManager: user?.role === 'Manager' || user?.role === 'Admin',
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}