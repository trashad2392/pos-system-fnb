// src/app/layout.js
"use client";

import Link from 'next/link';
import { MantineProvider, ColorSchemeScript } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css'; // Import notification styles
import './globals.css';

// Metadata can be exported from a client component in the App Router
// export const metadata = { ... }; // This can be kept if you prefer

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <ColorSchemeScript />
      </head>
      <body>
        <MantineProvider>
          {/* This component will display all our notifications */}
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