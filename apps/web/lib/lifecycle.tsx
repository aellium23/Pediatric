'use client';

import { useEffect } from 'react';

/**
 * Recovers interactivity when an iOS standalone PWA returns from the background.
 *
 * On iOS, Safari/WKWebView suspends (and sometimes freezes) a standalone PWA's
 * JS context while it is backgrounded. On return the rendered pixels are shown
 * but the page can be in a stale, half-frozen state where taps do nothing — and
 * by then the access token (15 min TTL) has usually expired too. Rather than
 * leave the user with a dead screen, we reload deterministically on the two
 * signals the browser still delivers:
 *   1. bfcache restore — `pageshow` with `event.persisted === true`.
 *   2. becoming visible again after a long hidden period (session is stale).
 *
 * Quick foreground/background switches (e.g. glancing at a notification) are
 * left untouched: only a long absence triggers a reload.
 */
export function RecoverOnResume() {
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const STALE_MS = 15 * 60 * 1000; // matches the access-token TTL
    let hiddenAt: number | null =
      document.visibilityState === 'hidden' ? Date.now() : null;

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        hiddenAt = Date.now();
        return;
      }
      const awayMs = hiddenAt ? Date.now() - hiddenAt : 0;
      hiddenAt = null;
      if (awayMs > STALE_MS) window.location.reload();
    };

    const onPageShow = (e: PageTransitionEvent) => {
      // Restored from bfcache → reload for a clean, fully-interactive page.
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
