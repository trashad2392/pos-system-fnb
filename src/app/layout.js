// src/app/layout.js
"use client";

import { usePathname } from 'next/navigation'; // <-- IMPORT usePathname
import { MantineProvider, ColorSchemeScript } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { AuthProvider } from '../context/AuthContext'; 
import AppContent from './AppContent';
import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import './globals.css';


export default function RootLayout({ children }) {
  // --- START: ADDED CONDITIONAL LOGIC ---
  const pathname = usePathname();
  const isPrintRoute = pathname === '/print/receipt/';
  // --- END: ADDED CONDITIONAL LOGIC ---

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <ColorSchemeScript />
      </head>
      <body>
        <MantineProvider>
          {/* --- START: MODIFIED CONTENT --- */}
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
          {/* --- END: MODIFIED CONTENT --- */}
        </MantineProvider>
      </body>
    </html>
  );
}