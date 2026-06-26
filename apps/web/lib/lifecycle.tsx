'use client';

import { useEffect } from 'react';
import { wakeBackend } from '@/lib/client';

/**
 * Keeps the app usable when it returns from the background.
 *
 * The real cause of "stops working after inactivity" is the free-tier backend
 * sleeping after ~15 min: the first request then fails with a network error
 * while it cold-starts. The request layer already retries through that, so on
 * resume we just nudge the backend awake (a warm-up ping) rather than reloading
 * into a cold server. We still reload on a genuine bfcache restore, where the
 * page can come back in a stale, non-interactive state.
 */
export function RecoverOnResume() {
  useEffect(() => {
    if (typeof document === 'undefined') return;

    const onVisibility = () => {
      if (document.visibilityState === 'visible') wakeBackend();
    };
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) window.location.reload();
    };

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pageshow', onPageShow);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pageshow', onPageShow);
    };
  }, []);

  return null;
}
