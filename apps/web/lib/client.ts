// Browser-side API client (uses localStorage; only call from client components).
import { trs } from './i18n';

const BASE = process.env.NEXT_PUBLIC_API_BASE ?? '';

export const hasApi = BASE.length > 0;

const TOKEN_KEY = 'pedia_token';
const REFRESH_KEY = 'pedia_refresh';

export function getToken(): string | null {
  return typeof window === 'undefined' ? null : localStorage.getItem(TOKEN_KEY);
}
export function setToken(t: string): void {
  localStorage.setItem(TOKEN_KEY, t);
}
export function getRefreshToken(): string | null {
  return typeof window === 'undefined' ? null : localStorage.getItem(REFRESH_KEY);
}
export function setRefreshToken(t?: string | null): void {
  if (t) localStorage.setItem(REFRESH_KEY, t);
}
export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

/**
 * Exchange the stored refresh token for a fresh access token (rotating).
 * Returns true on success. Guarded so concurrent 401s trigger a single refresh.
 */
let refreshing: Promise<boolean> | null = null;
function refreshAccessToken(): Promise<boolean> {
  if (refreshing) return refreshing;
  refreshing = (async () => {
    const rt = getRefreshToken();
    if (!rt) return false;
    try {
      const res = await fetch(`${BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ refreshToken: rt }),
      });
      if (!res.ok) return false;
      const data = (await res.json()) as { accessToken: string; refreshToken?: string };
      setToken(data.accessToken);
      setRefreshToken(data.refreshToken);
      return true;
    } catch {
      return false;
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
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

const ATTEMPT_TIMEOUT_MS = 28000; // per attempt — generous for a cold backend
const COLD_RETRIES = 4; // attempts when the backend is waking up
const BOOT_STATUSES = new Set([502, 503, 504]); // platform/proxy while booting

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * Turns a backend error response into a clean, human message. NestJS errors are
 * `{ statusCode, message, error }` (message may be a string or a validation
 * array). We surface that when present, otherwise a friendly status-based line —
 * never a raw JSON blob or a Prisma error string.
 */
function friendlyError(status: number, body: string): string {
  let serverMsg = '';
  try {
    const j = JSON.parse(body) as { message?: string | string[]; error?: string };
    serverMsg = Array.isArray(j.message) ? j.message.join('; ') : j.message || j.error || '';
  } catch {
    serverMsg = body && body.length < 160 && !body.includes('<') ? body : '';
  }
  if (status === 401) return trs('A sessão expirou. Entra novamente.');
  if (status === 403) return serverMsg || trs('Não tens permissão para esta ação.');
  if (status === 404) return serverMsg || trs('Não encontrado.');
  if (status === 409) return serverMsg || trs('Este pedido entra em conflito com o estado atual.');
  if (status === 400 || status === 422) return serverMsg || trs('Pedido inválido. Verifica os dados.');
  if (status >= 500) return trs('Erro no servidor. Tenta novamente em instantes.');
  return serverMsg || `Erro (${status}).`;
}

/** Consultation a schedule change would cancel (409 payload of availability edits). */
export interface AffectedConsultation {
  consultationId: string;
  scheduledAt: string;
  childInitials: string;
}

/** Error thrown by request(): the friendly message plus the parsed backend body. */
export interface ApiError extends Error {
  status?: number;
  body?: unknown;
  /** Present on 409s from availability changes that would cancel bookings. */
  affected?: AffectedConsultation[];
}

function doFetch(path: string, init: RequestInit, timeoutMs = ATTEMPT_TIMEOUT_MS): Promise<Response> {
  const token = getToken();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  return fetch(`${BASE}${path}`, {
    ...init,
    signal: ctrl.signal,
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {}),
    },
  }).finally(() => clearTimeout(timer));
}

/**
 * Wakes the (free-tier) backend, which sleeps after ~15 min idle and needs
 * 30–60 s to cold-start. Fire-and-forget: kicking off the boot so the user's
 * next real request lands on a warming server. Health lives at the origin root,
 * outside the `/api` prefix.
 */
export function wakeBackend(): void {
  if (!hasApi) return;
  const healthUrl = BASE.replace(/\/api\/?$/, '') + '/health';
  fetch(healthUrl, { method: 'GET', cache: 'no-store' }).catch(() => {});
}

/**
 * Resilient request. A sleeping backend makes the first call fail with a network
 * error ("Load failed") or a 502/503/504 while it boots — so safe/idempotent
 * calls (GET + auth) are retried with backoff for up to ~60 s, giving the server
 * time to wake. Non-idempotent mutations are not auto-retried (avoids
 * double-submit); by then a warm-up ping has usually woken the backend anyway.
 */
async function request(path: string, init: RequestInit = {}, retry = true): Promise<any> {
  const method = (init.method ?? 'GET').toUpperCase();
  const idempotent =
    method === 'GET' || path === '/auth/dev-login' || path === '/auth/refresh';

  let res: Response | null = null;
  const maxAttempts = idempotent ? COLD_RETRIES : 1;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      res = await doFetch(path, init);
    } catch {
      res = null; // network error or timeout (abort) — backend likely waking
    }
    if (res && !BOOT_STATUSES.has(res.status)) break;
    if (attempt === 0) wakeBackend(); // nudge the boot on the first miss
    if (attempt < maxAttempts - 1) await sleep(2000 * (attempt + 1)); // 2s,4s,6s
  }

  if (!res) {
    throw new Error(trs('Sem ligação ao servidor. Pode estar a iniciar — tenta novamente em instantes.'));
  }

  // Access token likely expired → refresh once and retry transparently.
  if (res.status === 401 && retry && getRefreshToken() && path !== '/auth/refresh') {
    if (await refreshAccessToken()) res = await doFetch(path, init);
  }
  if (!res.ok) {
    // Dead session (refresh failed or absent): clear the stored tokens and tell
    // the app shell, so the user lands back on the profile picker instead of a
    // logged-in shell where every tab errors with "sessão expirou".
    if (res.status === 401 && path !== '/auth/refresh' && !path.startsWith('/auth/dev-login')) {
      clearToken();
      if (typeof window !== 'undefined') window.dispatchEvent(new Event('hoc:logout'));
    }
    const text = await res.text().catch(() => '');
    // Attach the parsed body so callers can react to structured payloads
    // (e.g. 409 `affected` lists from availability edits) — the message
    // stays the friendly human line.
    const err = new Error(friendlyError(res.status, text)) as ApiError;
    err.status = res.status;
    try {
      const parsed = JSON.parse(text) as { affected?: AffectedConsultation[] };
      err.body = parsed;
      if (Array.isArray(parsed?.affected)) err.affected = parsed.affected;
    } catch {
      /* non-JSON error body — message alone is enough */
    }
    throw err;
  }
  if (res.status === 204) return null;
  // Parse defensively: a sleeping/booting backend (or a proxy) can answer 200
  // with a non-JSON page, which would otherwise surface as a cryptic
  // "SyntaxError: The string did not match the expected pattern.".
  const text = await res.text().catch(() => '');
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(trs('O servidor devolveu uma resposta inesperada. Tenta novamente em instantes.'));
  }
}

export interface ChildDto {
  id: string;
  name: string;
  birthDate: string;
  photoUrl?: string | null;
}

export interface UserMeDto {
  id: string;
  role: string;
  name: string | null;
  email: string | null;
  photoUrl: string | null;
  preferredPayment: string | null;
  locale?: string | null;
}

export interface ConsultationDto {
  id: string;
  type: string;
  status: string;
  priceCents: number;
  currency: string;
  openedAt: string;
  slaDueAt: string | null;
  /** Honest reply expectation persisted at open (message windows + target); null for video. */
  expectedReplyAt?: string | null;
  answeredAt: string | null;
  closedAt: string | null;
  pediatricianId?: string;
  episodeId?: string | null;
  childId?: string | null;
  scheduledAt?: string | null;
  /** On REFUNDED rows: why (e.g. 'pediatrician_unavailable' → rebook CTAs). */
  refundReason?: string | null;
  triage?: Record<string, unknown> | null;
  child?: { id: string; name: string; birthDate?: string } | null;
  pediatrician?: { displayName: string | null; specialties: string[] } | null;
}

export interface MessageDto {
  id: string;
  senderUserId: string;
  body: string;
  /** Decrypted data-URL images (up to 3) attached to the message. */
  attachments?: string[];
  aiGenerated: boolean;
  createdAt: string;
}

export interface StatementEntry {
  consultationId: string;
  type: string;
  capturedAt: string;
  grossCents: number;
  feeCents: number;
  netCents: number;
}
export interface FinanceDto {
  consultationsSettled: number;
  grossCents: number;
  netCents: number;
  commissionCents: number;
  commissionInvoices: number;
  currency: string;
  /** Per-consultation breakdown (backends without it omit the field). */
  statement?: StatementEntry[];
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
  displayName?: string | null;
  bio: string | null;
  experienceYears: number | null;
  languages: string[];
  specialties: string[];
  ratingAvg: number;
  status: string;
  licenseNumber?: string;
  stripeAccountId?: string | null;
  /** IANA timezone the doctor's availability minutes are interpreted in. */
  timezone?: string;
  services: ServiceDto[];
}

export interface AvailabilityDto {
  id: string;
  weekday: number;
  startMinute: number;
  endMinute: number;
  slotMinutes: number;
  /** VIDEO blocks generate bookable slots; MESSAGES blocks are "message hours". */
  kind?: 'VIDEO' | 'MESSAGES';
  /** ISO datetime (midnight UTC) for a concrete dated block; null/absent = weekly-template block. */
  date?: string | null;
}

export interface NotificationDto {
  id: string;
  type: string;
  title: string;
  body: string;
  refId?: string | null; // e.g. consultationId — enables tap-to-open
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

  // Account (any role) — profile photo + preferred payment method
  userMe: () => request('/users/me') as Promise<UserMeDto>,
  setMyPhoto: (photoUrl: string) =>
    request('/users/me/photo', { method: 'POST', body: JSON.stringify({ photoUrl }) }),
  removeMyPhoto: () => request('/users/me/photo/remove', { method: 'POST' }),
  setChildPhoto: (childId: string, photoUrl: string) =>
    request(`/children/${childId}/photo`, { method: 'POST', body: JSON.stringify({ photoUrl }) }),
  setPaymentMethod: (method?: string) =>
    request('/users/me/payment-method', { method: 'POST', body: JSON.stringify({ method }) }),

  // Parent
  children: () => request('/children') as Promise<ChildDto[]>,
  addChild: (data: { name: string; birthDate: string; sex?: string; healthDataConsent: boolean }) =>
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
  // Public doctor detail — adds messageWindows + expectedReplyPreview (cast to
  // PediatricianDetail at the call site, like the marketplace list).
  pedDetail: (id: string) => request(`/pediatricians/${id}`) as Promise<unknown>,
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
  pedHistory: (take = 50) =>
    request(`/consultations/history?take=${take}`) as Promise<ConsultationDto[]>,
  cancelConsultation: (id: string) =>
    request(`/consultations/${id}/cancel`, { method: 'POST' }),
  reviews: (pedId: string) => request(`/pediatricians/${pedId}/reviews`) as Promise<ReviewDto[]>,
  addReview: (data: { consultationId: string; rating: number; comment?: string }) =>
    request('/pediatricians/reviews', { method: 'POST', body: JSON.stringify(data) }),

  // Scheduling (video)
  nextSlots: (pedId: string, days = 10) =>
    request(`/scheduling/pediatricians/${pedId}/next-slots?days=${days}`) as Promise<
      { date: string; slots: string[] }[]
    >,
  book: (data: { childId: string; serviceId: string; scheduledAt: string; teleconsultConsent: boolean }) =>
    request('/scheduling/book', { method: 'POST', body: JSON.stringify(data) }) as Promise<{
      consultationId: string;
      roomId: string;
    }>,

  // Shared (parent + pediatrician)
  messages: (id: string) => request(`/consultations/${id}/messages`) as Promise<MessageDto[]>,
  sendMessage: (id: string, body: string, attachments?: string[]) =>
    request(`/consultations/${id}/messages`, {
      method: 'POST',
      body: JSON.stringify({
        body: body || undefined, // optional when attachments are present
        attachments: attachments && attachments.length ? attachments : undefined,
      }),
    }),
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
  finance: (range?: { from?: string; to?: string }) => {
    const q = new URLSearchParams();
    if (range?.from) q.set('from', range.from);
    if (range?.to) q.set('to', range.to);
    const qs = q.toString();
    return request(`/pediatricians/me/finance${qs ? `?${qs}` : ''}`) as Promise<FinanceDto>;
  },
  me: () => request('/pediatricians/me') as Promise<PedMeDto>,
  updateMe: (data: Partial<{ bio: string; experienceYears: number; languages: string[]; specialties: string[]; timezone: string }>) =>
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
  addAvailability: (data: {
    weekday?: number; // weekly-template block (omit when date is sent — derived server-side)
    date?: string; // YYYY-MM-DD — concrete dated block
    repeatWeeks?: number; // 1-12: with date, repeat on the same weekday for N weeks
    startMinute: number;
    endMinute: number;
    slotMinutes?: number;
    kind?: 'VIDEO' | 'MESSAGES'; // default VIDEO (bookable slots) — MESSAGES = message hours
  }) =>
    request('/scheduling/availability', { method: 'POST', body: JSON.stringify(data) }),
  updateAvailability: (
    id: string,
    data: {
      startMinute: number;
      endMinute: number;
      kind?: 'VIDEO' | 'MESSAGES';
      /** Recurring blocks only: 'all' edits the template, 'day' (with date) just that date. */
      scope?: 'all' | 'day';
      date?: string; // YYYY-MM-DD — required with scope 'day'
      /** Retry flag: cancel+refund the affected consultations and apply the change. */
      confirm?: boolean;
    },
  ) => request(`/scheduling/availability/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteAvailability: (id: string, confirm?: boolean) =>
    request(`/scheduling/availability/${id}${confirm ? '?confirm=true' : ''}`, { method: 'DELETE' }),

  // Notifications (all roles)
  notifications: () => request('/notifications') as Promise<NotificationDto[]>,
  markRead: (id: string) => request(`/notifications/${id}/read`, { method: 'POST' }),

  // Admin / Finance
  allConsultations: (skip = 0) =>
    request(`/consultations/all?skip=${skip}`) as Promise<ConsultationDto[]>,
  refund: (id: string, reason?: string) =>
    request(`/consultations/${id}/refund`, {
      method: 'POST',
      body: JSON.stringify({ reason: reason ?? 'demo refund' }),
    }),

  // Platform backoffice (admin / compliance / support)
  adminMetrics: () => request('/admin/metrics') as Promise<AdminMetrics>,
  adminFinanceSeries: (months = 12) =>
    request(`/admin/finance/series?months=${months}`) as Promise<FinanceSeriesDto>,
  adminPediatricians: (status?: string) =>
    request(`/admin/pediatricians${status ? `?status=${status}` : ''}`) as Promise<AdminPedRow[]>,
  verifyPediatrician: (id: string) =>
    request(`/admin/pediatricians/${id}/verify`, { method: 'POST' }),
  suspendPediatrician: (id: string) =>
    request(`/admin/pediatricians/${id}/suspend`, { method: 'POST' }),
  adminUsers: (q?: string) =>
    request(`/admin/users${q ? `?q=${encodeURIComponent(q)}` : ''}`) as Promise<AdminUserRow[]>,
  adminUserDetail: (id: string) =>
    request(`/admin/users/${id}`) as Promise<AdminUserDetail>,
  changeUserRole: (id: string, role: string) =>
    request(`/admin/users/${id}/role`, { method: 'PATCH', body: JSON.stringify({ role }) }),
  adminAudit: (skip = 0) => request(`/admin/audit?skip=${skip}`) as Promise<AuditRow[]>,

  // Content library
  articles: (category?: string) =>
    request(`/content${category ? `?category=${encodeURIComponent(category)}` : ''}`) as Promise<
      ArticleCard[]
    >,
  myArticles: () => request('/content/mine') as Promise<ArticleCard[]>,
  createArticle: (data: { title: string; body: string; category?: string; published?: boolean }) =>
    request('/content', { method: 'POST', body: JSON.stringify(data) }),
  updateArticle: (
    id: string,
    data: { title?: string; body?: string; category?: string; published?: boolean },
  ) => request(`/content/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  // Editorial review (PLATFORM_ADMIN / CLINIC_ADMIN)
  contentPending: () => request('/content/review/pending') as Promise<ArticleCard[]>,
  approveArticle: (id: string) => request(`/content/${id}/approve`, { method: 'POST' }),
  rejectArticle: (id: string, note?: string) =>
    request(`/content/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify(note ? { note } : {}),
    }),

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
  childTimeline: (childId: string) =>
    request(`/health-records/${childId}/timeline`) as Promise<ChildTimeline>,
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
  catDrugAllergy: (atc: string, codes: string[]) =>
    request(
      `/catalog/drug-allergy?atc=${encodeURIComponent(atc)}&codes=${encodeURIComponent(codes.join(','))}`,
    ) as Promise<{ code: string; cross: boolean }[]>,

  // Allergies (structured)
  addAllergy: (childId: string, data: { label: string; code?: string; category?: string }) =>
    request(`/health-records/${childId}/allergies`, { method: 'POST', body: JSON.stringify(data) }),
  removeAllergy: (childId: string, id: string) =>
    request(`/health-records/${childId}/allergies/${id}/remove`, { method: 'POST' }),

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
  status?: 'DRAFT' | 'PENDING_REVIEW' | 'PUBLISHED' | 'REJECTED';
  reviewNote?: string;
  reviewedAt?: string;
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

export interface CentileBand {
  p: number;
  points: { ageDays: number; value: number }[];
}

export interface HealthOverview {
  who?: { sex: string; source: string } | null;
  whoBands?: { wfa: CentileBand[]; lhfa: CentileBand[]; bfa: CentileBand[] } | null;
  growth: {
    id: string;
    measuredAt: string;
    ageDays?: number;
    heightCm: number | null;
    weightKg: number | null;
    headCm: number | null;
    bmi: number | null;
    weightP?: number | null;
    weightZ?: number | null;
    heightP?: number | null;
    heightZ?: number | null;
    bmiP?: number | null;
    bmiZ?: number | null;
    bmiClass?: string | null;
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
  allergies?: { id: string; label: string | null; code: string | null; category: string | null }[];
}

export interface TimelineEvent {
  at: string;
  kind: 'consultation' | 'vaccine' | 'growth' | 'episode' | 'medication' | 'allergy';
  title: string;
  detail: string | null;
  refId: string;
}
export interface ChildTimeline {
  child: { id: string; name: string; birthDate: string; sex: string | null };
  events: TimelineEvent[];
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
export interface Guardian {
  name: string;
  relationship: string;
}
export interface PatientFamily {
  id: string;
  name: string;
  guardians?: Guardian[];
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
  /** Present when the backend computes the clinic's revenue share. */
  finance?: {
    clinicEarnedCents: number;
    pedsGrossCents: number;
    capturedCount: number;
  };
}

export interface FinanceSeriesMonth {
  month: string; // "YYYY-MM"
  grossCents: number;
  platformCents: number;
  pediatricianCents: number;
  refundedCents: number;
  count: number;
}
export interface FinanceSeriesDto {
  months: FinanceSeriesMonth[];
  currency: string;
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
  displayName?: string | null;
  status: string;
  licenseNumber: string;
  ratingAvg: number;
  specialties: string[];
  user?: { email: string | null };
}
export interface AdminUserRow {
  id: string;
  email: string | null;
  name?: string | null;
  phone?: string | null;
  role: string;
  status: string;
  createdAt: string;
}
export interface AdminUserDetail {
  user: {
    id: string;
    email: string | null;
    name: string | null;
    phone: string | null;
    role: string;
    status: string;
    createdAt: string;
  };
  consultations: {
    id: string;
    type: string;
    status: string;
    openedAt: string;
    closedAt: string | null;
    scheduledAt: string | null;
    child: { name: string } | null;
    pediatrician: { displayName: string | null } | null;
  }[];
}
export interface AuditRow {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  createdAt: string;
  actor?: { email: string | null; role: string } | null;
}
