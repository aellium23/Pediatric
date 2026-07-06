export interface PediatricianService {
  id: string;
  type: string;
  priceCents: number;
  currency: string;
  slaHours: number;
  /** Aspirational reply time INSIDE message windows (MESSAGE services). */
  targetHours?: number;
}

/** Weekly-template message window (kind=MESSAGES availability). */
export interface MessageWindow {
  weekday: number;
  startMinute: number;
  endMinute: number;
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
  messageWindows?: MessageWindow[];
}

/** GET /pediatricians/:id — the public detail adds a server-computed
 *  "if you send now, expect a reply by…" preview (capped at the SLA). */
export interface PediatricianDetail extends PediatricianCard {
  expectedReplyPreview?: string | null;
}
