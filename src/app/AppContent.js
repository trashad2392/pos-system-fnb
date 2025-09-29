// src/app/AppContent.js
"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import LoginScreen from '../components/auth/LoginScreen';
import UserMenu from '../components/auth/UserMenu';
import { Box, Group } from '@mantine/core';

export default function AppContent({ children }) {
  const { isAuthenticated, isManager } = useAuth();
  const pathname = usePathname();

  if (!isAuthenticated) {
    return <LoginScreen />;
  }
  
  // --- START OF CHANGES ---
  const navLinks = [
    { href: "/pos/", label: "Point of Sale", requiredRole: "Cashier" },
    { href: "/", label: "Inventory", requiredRole: "Manager" },
    { href: "/sales/", label: "Sales", requiredRole: "Manager" },
    { href: "/settings/", label: "Settings", requiredRole: "Manager" }, // New link
  ];
  // --- END OF CHANGES ---

  const accessibleLinks = navLinks.filter(link => {
    if (link.requiredRole === "Manager") {
      return isManager;
    }
    return true;
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
                fontWeight: pathname.startsWith(link.href) && (link.href !== '/' || pathname === '/') ? 'bold' : 'normal'
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