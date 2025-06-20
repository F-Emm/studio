
"use client";

import { useEffect } from 'react';

export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
          .then(registration => {
            console.log('Ascendia ServiceWorker registration successful with scope: ', registration.scope);
          })
          .catch(error => {
            console.error('Ascendia ServiceWorker registration failed: ', error);
          });
      });
    }
  }, []);

  return null; // This component doesn't render anything
}
