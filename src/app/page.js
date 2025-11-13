// src/app/page.js
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { Center, Loader } from '@mantine/core';

export default function RootRedirectPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Wait until the initial authentication check is complete
    if (loading) {
      return;
    }

    if (user) {
      // If a user is logged in, redirect based on their role
      if (user.role === 'Cashier') {
        router.replace('/pos');
      } else { // Manager or Admin
        router.replace('/menu'); // <-- FIXED: Redirecting to the new path
      }
    }
    // If there is no user, the AppContent component will handle showing the LoginScreen,
    // so we don't need an 'else' block here. The user will see the loader
    // until they are authenticated.

  }, [user, loading, router]);

  // Display a loader by default while the logic in useEffect runs
  return (
    <Center style={{ height: 'calc(100vh - 100px)' }}>
      <Loader size="xl" />
    </Center>
  );
}