import { DEMO_PEDIATRICIANS } from './demo';
import type { PediatricianCard } from './types';

export type { PediatricianCard, PediatricianService } from './types';

export const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? '';

/** When no API is configured (e.g. a plain Vercel deploy), run on demo data. */
export const DEMO_MODE = API_BASE.length === 0;

/** Fetches the public marketplace listing; falls back to demo data on any issue. */
export async function getPediatricians(): Promise<PediatricianCard[]> {
  if (DEMO_MODE) return DEMO_PEDIATRICIANS;
  try {
    const res = await fetch(`${API_BASE}/pediatricians`, { cache: 'no-store' });
    if (!res.ok) return DEMO_PEDIATRICIANS;
    const data = (await res.json()) as PediatricianCard[];
    return Array.isArray(data) && data.length > 0 ? data : DEMO_PEDIATRICIANS;
  } catch {
    return DEMO_PEDIATRICIANS;
  }
}
