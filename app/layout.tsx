import type { Metadata, Viewport } from 'next';
import { Fraunces, Special_Elite } from 'next/font/google';
import './globals.css';

// Fraunces carries the personality of the page: a printed, slightly worn
// display serif for headlines, dialed down for body copy via weight.
const fraunces = Fraunces({
  subsets: ['latin'],
  style: ['normal', 'italic'],
  weight: ['300', '400', '500', '600', '700', '900'],
  variable: '--font-fraunces',
  display: 'swap',
});

// Special Elite reads like a date-stamp printed on the back of a photo.
// It's used only for genuine metadata — counters, filenames, timestamps —
// never as a decorative label.
const specialElite = Special_Elite({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-stamp',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Memoir',
  description: 'A private reel of memories for the two of us.',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/icons/icon.svg', type: 'image/svg+xml' },
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Memoir',
  },
  applicationName: 'Memoir',
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: '#0E0C0A',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
};

import VintageFilmBackground from '@/components/VintageFilmBackground';
import PwaRegister from '@/components/PwaRegister';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${fraunces.variable} ${specialElite.variable}`}>
      <body>
        <VintageFilmBackground />
        {children}
        <PwaRegister />
      </body>
    </html>
  );
}
