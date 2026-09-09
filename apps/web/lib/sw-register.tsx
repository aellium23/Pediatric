'use client';

import { useEffect } from 'react';

/** Registers the offline-shell service worker (no UI). */
export function RegisterSW() {
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
    const onLoad = () => navigator.serviceWorker.register('/sw.js').catch(() => {});
    window.addEventListener('load', onLoad);
    return () => window.removeEventListener('load', onLoad);
  }, []);
  return null;
}
