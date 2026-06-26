// Browser-side API client (uses localStorage; only call from client components).
const BASE = process.env.NEXT_PUBLIC_API_BASE ?? '';

export const hasApi = BASE.length > 0;

const TOKEN_KEY = 'pedia_token';

export function getToken(): string | null {
  return typeof window === 'undefined' ? null : localStorage.getItem(TOKEN_KEY);
}
export function setToken(t: string): void {
  localStorage.setItem(TOKEN_KEY, t);
}
export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

/** Decode the current user id (sub) from the stored JWT, for chat alignment. */
export function currentUserId(): string | null {
  const t = getToken();
  if (!t) return null;
  try {
    const part = t.split('.')[1];
    const json = atob(part.replace(/-/g, '+').replace(/_/g, '/'));
    return (JSON.parse(json).sub as string) ?? null;
  } catch {
    return null;
  }
}

async function request(path: string, init: RequestInit = {}): Promise<any> {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `${res.status} ${res.statusText}`);
  }
  return res.status === 204 ? null : res.json();
}

export interface ChildDto {
  id: string;
  name: string;
  birthDate: string;
}

export interface ConsultationDto {
  id: string;
  type: string;
  status: string;
  priceCents: number;
  currency: string;
  openedAt: string;
  slaDueAt: string | null;
  answeredAt: string | null;
  closedAt: string | null;
  episodeId?: string | null;
  childId?: string | null;
  triage?: Record<string, unknown> | null;
}

export interface MessageDto {
  id: string;
  senderUserId: string;
  body: string;
  aiGenerated: boolean;
  createdAt: string;
}

export interface FinanceDto {
  consultationsSettled: number;
  grossCents: number;
  netCents: number;
  commissionCents: number;
  commissionInvoices: number;
  currency: string;
}

export interface ServiceDto {
  id: string;
  type: string;
  priceCents: number;
  currency: string;
  slaHours: number;
  scopeText?: string | null;
  active?: boolean;
}

export interface PedMeDto {
  id: string;
  bio: string | null;
  experienceYears: number | null;
  languages: string[];
  specialties: string[];
  ratingAvg: number;
  status: string;
  licenseNumber?: string;
  stripeAccountId?: string | null;
  services: ServiceDto[];
}

export interface AvailabilityDto {
  id: string;
  weekday: number;
  startMinute: number;
  endMinute: number;
  slotMinutes: number;
}

export interface NotificationDto {
  id: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
}

export interface ReviewDto {
  id: string;
  rating: number;
  comment: string | null;
  verified: boolean;
  createdAt: string;
}

export const Api = {
  // Auth — sign in as any seeded demo profile (role comes from the DB user).
  devLogin: (email = 'marta@demo.pedia') =>
    request('/auth/dev-login', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }) as Promise<{ accessToken: string; refreshToken?: string }>,

  // Parent
  children: () => request('/children') as Promise<ChildDto[]>,
  addChild: (data: { name: string; birthDate: string; healthDataConsent: boolean }) =>
    request('/children', { method: 'POST', body: JSON.stringify(data) }),
  pediatricians: (filters?: {
    specialty?: string;
    language?: string;
    maxPriceCents?: number;
    minRating?: number;
  }) => {
    const q = new URLSearchParams();
    if (filters?.specialty) q.set('specialty', filters.specialty);
    if (filters?.language) q.set('language', filters.language);
    if (filters?.maxPriceCents != null) q.set('maxPriceCents', String(filters.maxPriceCents));
    if (filters?.minRating != null) q.set('minRating', String(filters.minRating));
    const qs = q.toString();
    return request(`/pediatricians${qs ? `?${qs}` : ''}`) as Promise<unknown[]>;
  },
  favorites: () => request('/pediatricians/favorites') as Promise<unknown[]>,
  addFavorite: (id: string) => request(`/pediatricians/${id}/favorite`, { method: 'POST' }),
  removeFavorite: (id: string) => request(`/pediatricians/${id}/favorite`, { method: 'DELETE' }),
  startConsultation: (data: {
    childId: string;
    serviceId: string;
    question: string;
    triage?: Record<string, unknown>;
    episodeId?: string;
  }) => request('/consultations', { method: 'POST', body: JSON.stringify(data) }),
  myConsultations: () => request('/consultations') as Promise<ConsultationDto[]>,
  cancelConsultation: (id: string) =>
    request(`/consultations/${id}/cancel`, { method: 'POST' }),
  pediatrician: (id: string) => request(`/pediatricians/${id}`),
  reviews: (pedId: string) => request(`/pediatricians/${pedId}/reviews`) as Promise<ReviewDto[]>,
  addReview: (data: { consultationId: string; rating: number; comment?: string }) =>
    request('/pediatricians/reviews', { method: 'POST', body: JSON.stringify(data) }),

  // Scheduling (video)
  slots: (pedId: string, date: string) =>
    request(`/scheduling/pediatricians/${pedId}/slots?date=${encodeURIComponent(date)}`) as Promise<
      string[]
    >,
  book: (data: { childId: string; serviceId: string; scheduledAt: string; teleconsultConsent: boolean }) =>
    request('/scheduling/book', { method: 'POST', body: JSON.stringify(data) }) as Promise<{
      consultationId: string;
      roomId: string;
    }>,

  // Shared (parent + pediatrician)
  messages: (id: string) => request(`/consultations/${id}/messages`) as Promise<MessageDto[]>,
  sendMessage: (id: string, body: string) =>
    request(`/consultations/${id}/messages`, { method: 'POST', body: JSON.stringify({ body }) }),
  videoToken: (consultationId: string) =>
    request(`/video/${consultationId}/token`) as Promise<{
      token: string;
      url: string;
      roomId: string;
    }>,
  consultationSummary: (id: string) =>
    request(`/consultations/${id}/summary`) as Promise<{ summary: string | null }>,
  setSummary: (id: string, text: string) =>
    request(`/consultations/${id}/summary`, { method: 'POST', body: JSON.stringify({ text }) }),
  structureSummary: (id: string, text: string) =>
    request(`/consultations/${id}/summary/structure`, {
      method: 'POST',
      body: JSON.stringify({ text }),
    }) as Promise<{ text: string }>,

  // Pediatrician
  inbox: () => request('/consultations/inbox') as Promise<ConsultationDto[]>,
  // Patient chart (caseload grouped by family + per-child consultation history)
  patients: () => request('/consultations/patients') as Promise<PatientFamily[]>,
  childHistory: (childId: string) =>
    request(`/consultations/child/${childId}/history`) as Promise<ChildHistory>,
  closeConsultation: (id: string) =>
    request(`/consultations/${id}/close`, { method: 'POST' }),
  finance: () => request('/pediatricians/me/finance') as Promise<FinanceDto>,
  me: () => request('/pediatricians/me') as Promise<PedMeDto>,
  updateMe: (data: Partial<{ bio: string; experienceYears: number; languages: string[]; specialties: string[] }>) =>
    request('/pediatricians/me', { method: 'PATCH', body: JSON.stringify(data) }),
  addService: (data: { type: string; priceCents: number; slaHours: number; scopeText?: string }) =>
    request('/pediatricians/me/services', { method: 'POST', body: JSON.stringify(data) }),
  deleteService: (id: string) =>
    request(`/pediatricians/me/services/${id}`, { method: 'DELETE' }),
  // Credential documents (pediatrician verification)
  myDocuments: () => request('/pediatricians/me/documents') as Promise<VerificationDoc[]>,
  submitDocument: (data: { kind: string; fileName: string; storageKey?: string }) =>
    request('/pediatricians/me/documents', { method: 'POST', body: JSON.stringify(data) }),
  adminDocuments: (pedId: string) =>
    request(`/admin/pediatricians/${pedId}/documents`) as Promise<VerificationDoc[]>,
  reviewDocument: (docId: string, status: 'approved' | 'rejected', note?: string) =>
    request(`/admin/documents/${docId}/review`, {
      method: 'POST',
      body: JSON.stringify({ status, note }),
    }),

  // Doctor-to-doctor second opinion (referrals)
  referralsIncoming: () => request('/referrals/incoming') as Promise<ReferralDto[]>,
  referralsOutgoing: () => request('/referrals/outgoing') as Promise<ReferralDto[]>,
  createReferral: (data: { consultationId: string; toPediatricianId: string; reason: string }) =>
    request('/referrals', { method: 'POST', body: JSON.stringify(data) }),
  acceptReferral: (id: string) => request(`/referrals/${id}/accept`, { method: 'POST' }),
  declineReferral: (id: string) => request(`/referrals/${id}/decline`, { method: 'POST' }),
  submitReferralOpinion: (id: string, opinion: string) =>
    request(`/referrals/${id}/opinion`, { method: 'POST', body: JSON.stringify({ opinion }) }),

  availability: () => request('/scheduling/availability/me') as Promise<AvailabilityDto[]>,
  addAvailability: (data: { weekday: number; startMinute: number; endMinute: number; slotMinutes?: number }) =>
    request('/scheduling/availability', { method: 'POST', body: JSON.stringify(data) }),
  deleteAvailability: (id: string) =>
    request(`/scheduling/availability/${id}`, { method: 'DELETE' }),

  // Notifications (all roles)
  notifications: () => request('/notifications') as Promise<NotificationDto[]>,
  markRead: (id: string) => request(`/notifications/${id}/read`, { method: 'POST' }),

  // Admin / Finance
  allConsultations: () => request('/consultations/all') as Promise<ConsultationDto[]>,
  refund: (id: string, reason?: string) =>
    request(`/consultations/${id}/refund`, {
      method: 'POST',
      body: JSON.stringify({ reason: reason ?? 'demo refund' }),
    }),

  // Platform backoffice (admin / compliance / support)
  adminMetrics: () => request('/admin/metrics') as Promise<AdminMetrics>,
  adminPediatricians: (status?: string) =>
    request(`/admin/pediatricians${status ? `?status=${status}` : ''}`) as Promise<AdminPedRow[]>,
  verifyPediatrician: (id: string) =>
    request(`/admin/pediatricians/${id}/verify`, { method: 'POST' }),
  suspendPediatrician: (id: string) =>
    request(`/admin/pediatricians/${id}/suspend`, { method: 'POST' }),
  adminUsers: () => request('/admin/users') as Promise<AdminUserRow[]>,
  changeUserRole: (id: string, role: string) =>
    request(`/admin/users/${id}/role`, { method: 'PATCH', body: JSON.stringify({ role }) }),
  adminAudit: () => request('/admin/audit') as Promise<AuditRow[]>,

  // Content library
  articles: (category?: string) =>
    request(`/content${category ? `?category=${encodeURIComponent(category)}` : ''}`) as Promise<
      ArticleCard[]
    >,
  article: (slug: string) => request(`/content/${slug}`) as Promise<ArticleCard>,
  myArticles: () => request('/content/mine') as Promise<ArticleCard[]>,
  createArticle: (data: { title: string; body: string; category?: string; published?: boolean }) =>
    request('/content', { method: 'POST', body: JSON.stringify(data) }),

  // Privacy / GDPR
  consents: () => request('/privacy/consents') as Promise<ConsentRow[]>,
  revokeConsent: (id: string) => request(`/privacy/consents/${id}/revoke`, { method: 'POST' }),
  exportData: () => request('/privacy/export') as Promise<Record<string, unknown>>,
  deleteAccount: () => request('/privacy/delete-account', { method: 'POST' }),
  invoices: () => request('/privacy/invoices') as Promise<InvoicesDto>,

  // Subscriptions
  subPlans: () => request('/subscriptions/plans') as Promise<PlanDto[]>,
  mySubscription: () => request('/subscriptions/me') as Promise<MySubscription | null>,
  subscribe: (plan: string) =>
    request('/subscriptions', { method: 'POST', body: JSON.stringify({ plan }) }),
  cancelSubscription: () => request('/subscriptions/cancel', { method: 'POST' }),

  // Health records (rich child health profile)
  childHealth: (childId: string) =>
    request(`/health-records/${childId}`) as Promise<HealthOverview>,
  addGrowth: (
    childId: string,
    data: { measuredAt: string; heightCm?: number; weightKg?: number; headCm?: number },
  ) => request(`/health-records/${childId}/growth`, { method: 'POST', body: JSON.stringify(data) }),
  addVital: (
    childId: string,
    data: {
      measuredAt: string;
      temperatureC?: number;
      heartRateBpm?: number;
      respRateBpm?: number;
      spo2Pct?: number;
      systolicMmHg?: number;
      diastolicMmHg?: number;
    },
  ) => request(`/health-records/${childId}/vitals`, { method: 'POST', body: JSON.stringify(data) }),
  addVaccine: (
    childId: string,
    data: { name: string; date: string; notes?: string; pnvAbbr?: string; cvx?: string },
  ) => request(`/health-records/${childId}/vaccines`, { method: 'POST', body: JSON.stringify(data) }),
  addMedication: (
    childId: string,
    data: {
      name: string;
      dose?: string;
      startedAt?: string;
      atcCode?: string;
      route?: string;
      frequency?: string;
      durationDays?: number;
    },
  ) =>
    request(`/health-records/${childId}/medications`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  setMedicationActive: (childId: string, id: string, active: boolean) =>
    request(`/health-records/${childId}/medications/${id}/active`, {
      method: 'POST',
      body: JSON.stringify({ active }),
    }),
  addEpisode: (
    childId: string,
    data: { title: string; summary?: string; icpc2Code?: string; icd10Code?: string },
  ) => request(`/health-records/${childId}/episodes`, { method: 'POST', body: JSON.stringify(data) }),
  closeEpisode: (childId: string, id: string) =>
    request(`/health-records/${childId}/episodes/${id}/close`, { method: 'POST' }),

  // Clinical reference catalogs (autocomplete + coding)
  catConditions: (q: string) =>
    request(`/catalog/conditions?q=${encodeURIComponent(q)}`) as Promise<CatalogCondition[]>,
  catMedications: (q: string) =>
    request(`/catalog/medications?q=${encodeURIComponent(q)}`) as Promise<CatalogMedication[]>,
  catAllergens: (q: string) =>
    request(`/catalog/allergens?q=${encodeURIComponent(q)}`) as Promise<CatalogAllergen[]>,
  catVaccines: (dueByAgeMonths?: number) =>
    request(
      `/catalog/vaccines${dueByAgeMonths != null ? `?dueByAgeMonths=${dueByAgeMonths}` : ''}`,
    ) as Promise<CatalogVaccine[]>,
  catDose: (atc: string, weightKg: number) =>
    request(`/catalog/dose?atc=${encodeURIComponent(atc)}&weightKg=${weightKg}`) as Promise<DoseSuggestion>,

  // Clinics (B2B)
  myClinic: () => request('/clinics/me') as Promise<ClinicDashboard | null>,
  addClinicStaff: (clinicId: string, email: string, role: string) =>
    request(`/clinics/${clinicId}/staff`, { method: 'POST', body: JSON.stringify({ email, role }) }),
  addClinicPediatrician: (clinicId: string, pediatricianId: string) =>
    request(`/clinics/${clinicId}/pediatricians`, {
      method: 'POST',
      body: JSON.stringify({ pediatricianId }),
    }),
};

export interface ArticleCard {
  id: string;
  slug: string;
  title: string;
  category: string;
  body: string;
  published?: boolean;
  createdAt: string;
}

export interface ConsentRow {
  id: string;
  subject: string;
  version: string;
  grantedAt: string;
  revokedAt: string | null;
}
export interface InvoiceRow {
  id: string;
  amountCents: number;
  vatCents: number;
  vatRegime: string;
  atcud: string | null;
  issuedAt: string;
}
export interface InvoicesDto {
  medical: InvoiceRow[];
  commission: InvoiceRow[];
}

export interface PlanDto {
  plan: string;
  name: string;
  priceCents: number;
  perks: string[];
}
export interface MySubscription {
  id: string;
  plan: string;
  status: string;
  priceCents: number;
  startedAt: string;
  catalog: { name: string; priceCents: number; perks: string[] };
}

export interface HealthOverview {
  growth: {
    id: string;
    measuredAt: string;
    heightCm: number | null;
    weightKg: number | null;
    headCm: number | null;
    bmi: number | null;
  }[];
  vaccines: {
    id: string;
    name: string | null;
    date: string;
    notes: string | null;
    pnvAbbr?: string | null;
    cvx?: string | null;
  }[];
  medications: {
    id: string;
    name: string | null;
    dose: string | null;
    atcCode?: string | null;
    route?: string | null;
    frequency?: string | null;
    durationDays?: number | null;
    active: boolean;
    startedAt: string | null;
  }[];
  episodes: {
    id: string;
    title: string | null;
    summary: string | null;
    icpc2Code?: string | null;
    icd10Code?: string | null;
    status: string;
    createdAt: string;
    closedAt: string | null;
  }[];
  vitals?: {
    id: string;
    measuredAt: string;
    temperatureC: number | null;
    heartRateBpm: number | null;
    respRateBpm: number | null;
    spo2Pct: number | null;
    systolicMmHg: number | null;
    diastolicMmHg: number | null;
  }[];
}

export interface CatalogCondition {
  icpc2: string;
  term: string;
  chapter: string;
  icd10?: string;
  synonyms?: string[];
}
export interface CatalogMedication {
  atc: string;
  dci: string;
  forms: string[];
  brands?: string[];
  dosing?: { mgPerKgDose?: number; mgPerKgDay?: number; maxDoseMg?: number; everyHours?: number; note: string };
}
export interface CatalogAllergen {
  code: string;
  term: string;
  category: 'farmaco' | 'alimento' | 'ambiental';
}
export interface CatalogVaccine {
  abbr: string;
  name: string;
  agesMonths?: number[];
  cvx?: string;
  covers?: string;
  ageMonths?: number;
}
export interface DoseSuggestion {
  found: boolean;
  perDoseMg?: number;
  perDayMg?: number;
  everyHours?: number;
  note?: string;
  verify: boolean;
}

export interface PatientChild {
  id: string;
  name: string;
  birthDate: string;
  sex: string | null;
  consultationCount: number;
  lastConsultAt: string | null;
}
export interface PatientFamily {
  id: string;
  name: string;
  children: PatientChild[];
}
export interface ChildHistory {
  child: { id: string; name: string; birthDate: string; sex: string | null };
  consultations: ConsultationDto[];
}

export interface VerificationDoc {
  id: string;
  pediatricianId: string;
  kind: string;
  fileName: string;
  storageKey: string | null;
  status: 'pending' | 'approved' | 'rejected';
  note: string | null;
  createdAt: string;
  reviewedAt: string | null;
}

export interface ReferralDto {
  id: string;
  consultationId: string;
  fromPediatricianId: string;
  toPediatricianId: string;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'COMPLETED';
  reason: string | null;
  opinion: string | null;
  createdAt: string;
  respondedAt: string | null;
  completedAt: string | null;
}

export interface ClinicDashboard {
  clinic: { id: string; name: string; taxId: string | null; countryCode: string };
  role: string;
  members: { id: string; userId: string; role: string; email: string | null }[];
  pediatricians: {
    id: string;
    email: string | null;
    status: string;
    ratingAvg: number;
    revenueSharePct: number;
  }[];
  consultations: ConsultationDto[];
}

export interface AdminMetrics {
  usersByRole: Record<string, number>;
  pediatriciansByStatus: Record<string, number>;
  consultationsByStatus: Record<string, number>;
  grossCents: number;
  commissionCents: number;
  refunds: number;
  families: number;
  children: number;
  currency: string;
}
export interface AdminPedRow {
  id: string;
  status: string;
  licenseNumber: string;
  ratingAvg: number;
  specialties: string[];
  user?: { email: string | null };
}
export interface AdminUserRow {
  id: string;
  email: string | null;
  role: string;
  status: string;
  createdAt: string;
}
export interface AuditRow {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  createdAt: string;
  actor?: { email: string | null; role: string } | null;
}
