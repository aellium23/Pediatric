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

  // Shared (parent + pediatrician)
  messages: (id: string) => request(`/consultations/${id}/messages`) as Promise<MessageDto[]>,
  sendMessage: (id: string, body: string) =>
    request(`/consultations/${id}/messages`, { method: 'POST', body: JSON.stringify({ body }) }),

  // Pediatrician
  inbox: () => request('/consultations/inbox') as Promise<ConsultationDto[]>,
  closeConsultation: (id: string) =>
    request(`/consultations/${id}/close`, { method: 'POST' }),
  finance: () => request('/pediatricians/me/finance') as Promise<FinanceDto>,

  // Admin / Finance
  allConsultations: () => request('/consultations/all') as Promise<ConsultationDto[]>,
  refund: (id: string, reason?: string) =>
    request(`/consultations/${id}/refund`, {
      method: 'POST',
      body: JSON.stringify({ reason: reason ?? 'demo refund' }),
    }),
};
