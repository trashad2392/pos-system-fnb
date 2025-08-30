// src/app/layout.js

import Link from 'next/link'; // <-- Use the standard Next.js Link
import { MantineProvider, ColorSchemeScript } from '@mantine/core';
import '@mantine/core/styles.css';
import './globals.css';

export const metadata = {
  title: 'POS System',
  description: 'Built with Next.js and Gemini',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <ColorSchemeScript />
      </head>
      <body>
        <MantineProvider>
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