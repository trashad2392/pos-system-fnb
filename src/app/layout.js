// src/app/layout.js
"use client";

import Link from 'next/link';
import { MantineProvider, ColorSchemeScript } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
// The import for react-simple-keyboard CSS should be removed from this file
import './globals.css';


export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <ColorSchemeScript />
      </head>
      <body>
        <MantineProvider>
          <Notifications position="top-right" /> 
          
          <nav style={{ padding: '1rem', borderBottom: '1px solid #ddd', marginBottom: '1rem', backgroundColor: '#fff' }}>
            <Link href="/" style={{ marginRight: '1rem', textDecoration: 'none', color: 'blue' }}>Inventory</Link>
            <Link href="/pos" style={{ marginRight: '1rem', textDecoration: 'none', color: 'blue' }}>Point of Sale</Link>
            <Link href="/sales" style={{ textDecoration: 'none', color: 'blue' }}>Sales</Link>
          </nav>
          <main style={{ padding: '0 2rem' }}>
            {children}
          </main>
        </MantineProvider>
      </body>
    </html>
  );
}