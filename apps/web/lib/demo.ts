import type { PediatricianCard } from './types';

/** Built-in demo data so the web portal is usable on Vercel without a backend. */
export const DEMO_PEDIATRICIANS: PediatricianCard[] = [
  {
    id: 'demo-1',
    bio: 'Pediatria geral, 15 anos de experiência.',
    experienceYears: 15,
    languages: ['PT', 'EN'],
    specialties: ['Pediatria geral'],
    ratingAvg: 4.9,
    services: [
      { id: 's1', type: 'MESSAGE', priceCents: 1800, currency: 'EUR', slaHours: 4 },
      { id: 's2', type: 'VIDEO', priceCents: 4500, currency: 'EUR', slaHours: 24 },
    ],
  },
  {
    id: 'demo-2',
    bio: 'Neonatologia e primeiros meses.',
    experienceYears: 10,
    languages: ['PT'],
    specialties: ['Neonatologia'],
    ratingAvg: 4.8,
    services: [
      { id: 's3', type: 'MESSAGE', priceCents: 2000, currency: 'EUR', slaHours: 6 },
    ],
  },
  {
    id: 'demo-3',
    bio: 'Alergologia pediátrica e asma.',
    experienceYears: 8,
    languages: ['PT', 'ES'],
    specialties: ['Alergologia'],
    ratingAvg: 4.7,
    services: [
      { id: 's4', type: 'SECOND_OPINION', priceCents: 7000, currency: 'EUR', slaHours: 48 },
    ],
  },
];
