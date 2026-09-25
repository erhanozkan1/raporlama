'use client';

import { useEffect } from 'react';

/**
 * Service worker kaydı — yalnızca production'da.
 * (Geliştirmede HMR ile çakışmaması için devre dışı.)
 */
export default function PwaRegister() {
  useEffect(() => {
    if (
      process.env.NODE_ENV === 'production' &&
      typeof navigator !== 'undefined' &&
      'serviceWorker' in navigator
    ) {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.error('Service worker kaydı başarısız:', err);
      });
    }
  }, []);

  return null;
}
