// src/app/AppContent.js
"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import LoginScreen from '../components/auth/LoginScreen';
import UserMenu from '../components/auth/UserMenu';
import { Box, Group, Center, Loader } from '@mantine/core';

export default function AppContent({ children }) {
  const { isAuthenticated, hasPermission, loading } = useAuth();
  const pathname = usePathname();

  if (loading) {
    return (
      <Center style={{ height: '100vh' }}>
        <Loader size="xl" />
      </Center>
    );
  }

  if (!isAuthenticated) {
    return <LoginScreen />;
  }
  
  const navLinks = [
    { href: "/pos", label: "Point of Sale", requiredPermission: "pos:access" },
    // --- UPDATED: Show Inventory link if user has EITHER permission ---
    { 
      href: "/inventory", 
      label: "Inventory", 
      requiredPermission: () => hasPermission('inventory:manage') || hasPermission('discounts:manage')
    },
    { href: "/sales", label: "Sales", requiredPermission: "sales:view_reports" },
    { 
      href: "/settings", 
      label: "Settings", 
      requiredPermission: () => hasPermission('settings:manage_users') || hasPermission('settings:manage_roles')
    },
  ];

  // Updated filter logic to handle both strings and functions
  const accessibleLinks = navLinks.filter(link => {
    if (typeof link.requiredPermission === 'function') {
      return link.requiredPermission();
    }
    return hasPermission(link.requiredPermission);
  });

  return (
    <>
      <Box 
        component="nav" 
        style={{ 
          padding: '1rem 2rem', 
          borderBottom: '1px solid var(--mantine-color-gray-3)', 
          backgroundColor: 'var(--mantine-color-body)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        <Group>
          {accessibleLinks.map(link => (
            <Link 
              key={link.href} 
              href={link.href}
              style={{ 
                textDecoration: 'none', 
                color: 'var(--mantine-color-blue-6)',
                fontWeight: pathname.startsWith(link.href) ? 'bold' : 'normal'
              }}
            >
              {link.label}
            </Link>
          ))}
        </Group>
        <UserMenu />
      </Box>
      <main style={{ padding: '1rem 2rem' }}>
        {children}
      </main>
    </>
  );
}