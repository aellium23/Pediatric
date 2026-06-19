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
