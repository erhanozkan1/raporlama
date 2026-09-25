import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Döküm Operasyon Takip Sistemi',
    short_name: 'Döküm Takip',
    description:
      'Döküm tesisleri için günlük operasyon, üretim ve fırın takip sistemi. Çevrimdışı çalışır.',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#F8FAFC',
    theme_color: '#F8FAFC',
    lang: 'tr',
    icons: [
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
