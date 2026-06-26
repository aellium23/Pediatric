export interface PediatricianService {
  id: string;
  type: string;
  priceCents: number;
  currency: string;
  slaHours: number;
}

export interface PediatricianCard {
  id: string;
  displayName?: string | null;
  bio: string | null;
  experienceYears: number | null;
  languages: string[];
  specialties: string[];
  region?: string | null;
  ratingAvg: number;
  services: PediatricianService[];
  availableWeekdays?: number[];
}
