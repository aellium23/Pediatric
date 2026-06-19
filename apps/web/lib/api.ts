export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:3000/api';

export interface PediatricianService {
  id: string;
  type: string;
  priceCents: number;
  currency: string;
  slaHours: number;
}

export interface PediatricianCard {
  id: string;
  bio: string | null;
  experienceYears: number | null;
  languages: string[];
  specialties: string[];
  ratingAvg: number;
  services: PediatricianService[];
}

/** Fetches the public marketplace listing. Returns [] on any error. */
export async function getPediatricians(): Promise<PediatricianCard[]> {
  try {
    const res = await fetch(`${API_BASE}/pediatricians`, { cache: 'no-store' });
    if (!res.ok) return [];
    return (await res.json()) as PediatricianCard[];
  } catch {
    return [];
  }
}
