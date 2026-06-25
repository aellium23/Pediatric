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
  pediatricians: () => request('/pediatricians') as Promise<unknown[]>,
  startConsultation: (data: { childId: string; serviceId: string; question: string }) =>
    request('/consultations', { method: 'POST', body: JSON.stringify(data) }),
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
    request(`/video/${consultationId}/token`) as Promise<{ token: string; roomId: string }>,

  // Pediatrician
  inbox: () => request('/consultations/inbox') as Promise<ConsultationDto[]>,
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
};

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
