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

export const Api = {
  devLogin: (email = 'marta@demo.pedia') =>
    request('/auth/dev-login', {
      method: 'POST',
      body: JSON.stringify({ email, role: 'PARENT' }),
    }),
  children: () => request('/children'),
  addChild: (data: { name: string; birthDate: string; healthDataConsent: boolean }) =>
    request('/children', { method: 'POST', body: JSON.stringify(data) }),
  pediatricians: () => request('/pediatricians'),
  startConsultation: (data: { childId: string; serviceId: string; question: string }) =>
    request('/consultations', { method: 'POST', body: JSON.stringify(data) }),
};
