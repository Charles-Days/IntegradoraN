'use client';

import { useEffect } from 'react';

export function usePushServiceWorker() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      // Register the push service worker alongside the PWA service worker
      navigator.serviceWorker
        .register('/push-sw.js', { scope: '/' })
        .then((registration) => {
          console.log('Push SW registered:', registration.scope);
        })
        .catch((error) => {
          console.error('Push SW registration failed:', error);
        });
    }
  }, []);
}
