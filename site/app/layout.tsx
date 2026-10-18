import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import { SEO, SITE_URL } from './content';
import client from './client-manifest.json';
import './globals.css';

const lato = localFont({
  src: [
    { path: './fonts/Lato-400.woff2', weight: '400', style: 'normal' },
    { path: './fonts/Lato-700.woff2', weight: '700', style: 'normal' },
    { path: './fonts/Lato-900.woff2', weight: '900', style: 'normal' }
  ],
  variable: '--font-lato',
  display: 'swap',
  fallback: ['system-ui', '-apple-system', 'Segoe UI', 'Arial', 'sans-serif']
});

const grandHotel = localFont({
  src: './fonts/GrandHotel-400.woff2',
  variable: '--font-script',
  display: 'swap',
  fallback: ['cursive']
});

const mono = localFont({
  src: './fonts/GeistMono.woff2',
  variable: '--font-mono',
  display: 'swap',
  preload: false,
  weight: '400 700',
  fallback: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace']
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: SEO.title,
  description: SEO.description,
  keywords: [SEO.focusKeyword, SEO.primaryKeyword, ...SEO.secondaryKeywords],
  applicationName: 'Spacing Inspector',
  category: 'Developer tools',
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    url: '/',
    siteName: 'Spacing Inspector',
    title: 'Spacing Inspector 2.0: see every margin and padding',
    description: SEO.description,
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'Spacing Inspector showing margin and padding on a web page' }]
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Spacing Inspector 2.0: see every margin and padding',
    description: SEO.description,
    images: ['/og.png']
  },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 } },
  verification: { google: '4N5b9mUevn2OzdIqgR_kUHPo2D-JTpIfd1gN0cCx03s' },
  other: { 'llms-txt': `${SITE_URL}/llms.txt` }
};

export const viewport: Viewport = {
  themeColor: '#07070B',
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${lato.variable} ${grandHotel.variable} ${mono.variable}`}>
      <head>
        <link rel="alternate" type="text/markdown" href="/llms.txt" title="llms.txt" />
        <script type="module" src={client.enhance} />
        {/* Analytics: paste the embed code here (inside <head>) when it's ready. */}
      </head>
      <body>{children}</body>
    </html>
  );
}
