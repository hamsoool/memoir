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
};

export const viewport: Viewport = {
  themeColor: '#F2E8D3',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${fraunces.variable} ${specialElite.variable}`}>
      <body>{children}</body>
    </html>
  );
}
