import { DEMO_PEDIATRICIANS } from './demo';
import type { PediatricianCard } from './types';

export type { PediatricianCard, PediatricianService } from './types';

export const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? '';

/** When no API is configured (e.g. a plain Vercel deploy), run on demo data. */
export const DEMO_MODE = API_BASE.length === 0;

export interface MarketplaceResult {
  pediatricians: PediatricianCard[];
  /** True when the list is demo data (no API configured). */
  demo: boolean;
  /** True when a configured API could not be reached (cold start / outage). */
  unavailable: boolean;
}

/**
 * Fetches the public marketplace listing. With no API configured this is
 * honest demo data. With an API configured, a cold/unreachable backend is
 * reported as `unavailable` — never silently replaced with demo doctors
 * presented as verified professionals.
 */
export async function getMarketplace(): Promise<MarketplaceResult> {
  if (DEMO_MODE) return { pediatricians: DEMO_PEDIATRICIANS, demo: true, unavailable: false };
  // Two quick attempts with a timeout — the free-tier backend may be waking up.
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 8000);
      const res = await fetch(`${API_BASE}/pediatricians`, {
        cache: 'no-store',
        signal: ctrl.signal,
      });
      clearTimeout(timer);
      if (res.ok) {
        const data = (await res.json()) as PediatricianCard[];
        if (Array.isArray(data)) return { pediatricians: data, demo: false, unavailable: false };
      }
    } catch {
      // network error / timeout — retry once, then report unavailable
    }
  }
  return { pediatricians: [], demo: false, unavailable: true };
}
