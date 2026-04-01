"use client";

import { usePathname } from 'next/navigation';
import { MantineProvider, ColorSchemeScript } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { AuthProvider } from '../context/AuthContext'; 
import AppContent from './AppContent';
import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import './globals.css';

export default function RootLayout({ children }) {
  const pathname = usePathname();
  const isPrintRoute = pathname === '/print/receipt/';
  
  // 1. Check if we are currently on the POS page
  const isPosRoute = pathname.startsWith('/pos');

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <ColorSchemeScript />
      </head>
      {/* 2. Apply the strict 100vh and hidden overflow ONLY to the POS page */}
      <body style={isPosRoute ? { height: '100vh', overflow: 'hidden' } : {}}>
        <MantineProvider>
          {isPrintRoute ? (
            // If it's the print route, render *only* the children (the receipt page)
            children
          ) : (
            // Otherwise, render the full app with auth and navigation
            <>
              <Notifications position="top-right" autoClose={1500} />
              <AuthProvider>
                <AppContent>
                  {children}
                </AppContent>
              </AuthProvider>
            </>
          )}
        </MantineProvider>
      </body>
    </html>
  );
}