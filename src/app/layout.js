// src/app/layout.js
"use client";

import { MantineProvider, ColorSchemeScript } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { AuthProvider } from '../context/AuthContext'; 
import AppContent from './AppContent';
import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import './globals.css';


export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <ColorSchemeScript />
      </head>
      <body>
        <MantineProvider>
          {/* --- START OF CHANGE --- */}
          {/* You can change the autoClose value to any number in milliseconds. */}
          {/* For example, 6000 is 6 seconds. */}
          <Notifications position="top-right" autoClose={1500} />
          {/* --- END OF CHANGE --- */}
          
          <AuthProvider>
            <AppContent>
              {children}
            </AppContent>
          </AuthProvider>
        </MantineProvider>
      </body>
    </html>
  );
}