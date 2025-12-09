'use client';

import { useEffect } from 'react';

export function usePushServiceWorker() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      // Skip push SW registration for self-signed certificates (development/testing)
      // Push notifications require a valid SSL certificate
      const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      const isSecureContext = window.isSecureContext;

      // Only register push SW on localhost or with valid SSL
      if (!isLocalhost && window.location.protocol === 'https:') {
        // Check if we can register by testing first
        navigator.serviceWorker
          .register('/push-sw.js', { scope: '/' })
          .then((registration) => {
            console.log('Push SW registered:', registration.scope);
          })
          .catch((error) => {
            // Silently fail for SSL certificate errors (self-signed certs)
            if (error.name === 'SecurityError') {
              console.log('Push notifications disabled (self-signed certificate)');
            } else {
              console.error('Push SW registration failed:', error);
            }
          });
      } else if (isLocalhost) {
        navigator.serviceWorker
          .register('/push-sw.js', { scope: '/' })
          .then((registration) => {
            console.log('Push SW registered:', registration.scope);
          })
          .catch((error) => {
            console.error('Push SW registration failed:', error);
          });
      }
    }
  }, []);
}
