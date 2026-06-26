'use client';

import { useEffect } from 'react';
import { wakeBackend } from '@/lib/client';

// Ping a little under the free-tier sleep window (~15 min) so an open app keeps
// the backend awake throughout a session.
const KEEPALIVE_MS = 10 * 60 * 1000;

/**
 * Keeps the app usable across inactivity and keeps the backend warm.
 *
 * The real cause of "stops working after inactivity" is the free-tier backend
 * sleeping after ~15 min: the first request then fails with a network error
 * while it cold-starts. We tackle it on three fronts here:
 *  - On resume (tab visible again) → warm-up ping, so the next request lands on
 *    a waking server (the request layer already retries through the cold start).
 *  - While the app is open and visible → a periodic keep-alive ping every 10 min
 *    keeps the backend from ever sleeping during an active session/demo.
 *  - On a genuine bfcache restore → reload, where the page can come back stale.
 */
export function RecoverOnResume() {
  useEffect(() => {
    if (typeof document === 'undefined') return;

    let timer: ReturnType<typeof setInterval> | null = null;
    const startKeepAlive = () => {
      if (timer) return;
      wakeBackend();
      timer = setInterval(() => {
        if (document.visibilityState === 'visible') wakeBackend();
      }, KEEPALIVE_MS);
    };
    const stopKeepAlive = () => {
      if (timer) clearInterval(timer);
      timer = null;
    };

    const onVisibility = () => {
      if (document.visibilityState === 'visible') startKeepAlive();
      else stopKeepAlive();
    };
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) window.location.reload();
    };

    if (document.visibilityState === 'visible') startKeepAlive();
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pageshow', onPageShow);
    return () => {
      stopKeepAlive();
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pageshow', onPageShow);
    };
  }, []);

  return null;
}
