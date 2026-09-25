import type {Metadata, Viewport} from 'next';
import { Inter, Space_Grotesk, JetBrains_Mono } from 'next/font/google';
import PwaRegister from '@/components/PwaRegister';
import './globals.css'; // Global styles

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
});

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-display',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
});

export const metadata: Metadata = {
  title: 'Döküm Operasyon Takip Sistemi',
  description: 'Döküm tesisleri için modern, hızlı ve çevrimdışı (offline) uyumlu günlük operasyon, üretim ve fırın takip sistemi.',
  // PWA / iPhone ana ekrana ekleme desteği
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Döküm Takip',
  },
  icons: {
    icon: '/icons/icon-192.png',
    apple: '/icons/apple-touch-icon.png',
  },
};

// viewport-fit=cover: iPhone çentik / home-indicator alanları için env(safe-area-inset-*) değerlerini etkinleştirir
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
  themeColor: '#F8FAFC',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="tr" className={`${inter.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable}`}>
      <body suppressHydrationWarning className="antialiased">
        {children}
        <PwaRegister />
      </body>
    </html>
  );
}
