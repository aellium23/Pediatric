'use client';

import { Fragment, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import {
  Api,
  hasApi,
  wakeBackend,
  setToken,
  setRefreshToken,
  clearToken,
  currentUserId,
  type ChildDto,
  type ConsultationDto,
  type MessageDto,
  type FinanceDto,
  type PedMeDto,
  type ServiceDto,
  type AvailabilityDto,
  type NotificationDto,
  type AdminMetrics,
  type AdminPedRow,
  type AdminUserRow,
  type AuditRow,
  type ClinicDashboard,
  type HealthOverview,
  type PlanDto,
  type MySubscription,
  type ConsentRow,
  type InvoicesDto,
  type ArticleCard,
  type ReferralDto,
  type VerificationDoc,
  type PatientFamily,
  type ChildHistory,
  type ChildTimeline,
  type TimelineEvent,
} from '@/lib/client';
import type { PediatricianCard } from '@/lib/types';
import { useT, LanguageSwitcher, appLocale } from '@/lib/i18n';
import { useTheme, type Theme, type TextSize } from '@/lib/theme';

// LiveKit room is browser-only — load it without SSR.
const VideoRoom = dynamic(() => import('./VideoRoom'), { ssr: false });

interface Profile {
  email: string;
  role: string;
  name: string;
  emoji: string;
  desc: string;
}

const PROFILES: Profile[] = [
  { email: 'marta@demo.pedia', role: 'PARENT', name: 'Marta', emoji: '👩‍👧', desc: 'Mãe / Encarregada' },
  { email: 'ines@demo.pedia', role: 'PEDIATRICIAN', name: 'Dra. Inês', emoji: '👩‍⚕️', desc: 'Pediatra verificada · tem videoconsulta agendada hoje' },
  { email: 'admin@demo.pedia', role: 'PLATFORM_ADMIN', name: 'Admin', emoji: '🛡️', desc: 'Administrador da plataforma' },
  { email: 'financas@demo.pedia', role: 'FINANCE', name: 'Finanças', emoji: '💶', desc: 'Equipa financeira' },
  { email: 'clinica.admin@demo.pedia', role: 'CLINIC_ADMIN', name: 'Clínica · Admin', emoji: '🏥', desc: 'Administrador de clínica' },
  { email: 'clinica.staff@demo.pedia', role: 'CLINIC_STAFF', name: 'Clínica · Colaborador', emoji: '🧑‍💼', desc: 'Colaborador de clínica' },
  { email: 'suporte@demo.pedia', role: 'SUPPORT', name: 'Suporte', emoji: '🎧', desc: 'Apoio ao cliente' },
  { email: 'compliance@demo.pedia', role: 'COMPLIANCE', name: 'Compliance', emoji: '📋', desc: 'Conformidade / RGPD' },
];

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

function euro(cents: number): string {
  return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(cents / 100);
}
const STATUS_PT: Record<string, string> = {
  OPEN: 'Aberta',
  TRIAGE: 'Em triagem',
  ANSWERED: 'Respondida',
  CLOSED: 'Fechada',
  CANCELLED: 'Cancelada',
  EXPIRED: 'Expirada',
  REFUNDED: 'Reembolsada',
  DISPUTED: 'Em disputa',
};
function statusLabel(s: string): string {
  return STATUS_PT[s] ?? s;
}
function statusPill(s: string): string {
  if (s === 'CLOSED' || s === 'ANSWERED') return 'pill ok';
  if (s === 'REFUNDED' || s === 'EXPIRED' || s === 'CANCELLED' || s === 'DISPUTED') return 'pill warn';
  return 'pill';
}
function when(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('pt-PT', { dateStyle: 'short', timeStyle: 'short' });
}
function hhmm(min: number): string {
  return `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
}
function toMin(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + (m || 0);
}
function isForbidden(e: unknown): boolean {
  return /403|Forbidden/i.test(String(e));
}
function svcLabel(t: string): string {
  return t === 'VIDEO' ? 'Vídeo' : t === 'MESSAGE' ? 'Mensagem' : t;
}
const SPECIALTY_PT: Record<string, string> = {
  general: 'Pediatria geral',
  neonatology: 'Neonatologia',
  pulmonology: 'Pneumologia',
  allergology: 'Alergologia',
  cardiology: 'Cardiologia',
  gastroenterology: 'Gastroenterologia',
  dermatology: 'Dermatologia',
  neurology: 'Neurologia',
};
/** Plain-parent explanations — most families don't know specialty names. */
const SPECIALTY_DESC: Record<string, string> = {
  general: 'Tudo o que é habitual: febres, infeções, crescimento, dúvidas do dia a dia.',
  neonatology: 'Recém-nascidos e primeiras semanas de vida (amamentação, icterícia, peso).',
  pulmonology: 'Respiração: asma, bronquiolites, tosse persistente, pieira.',
  allergology: 'Alergias alimentares e respiratórias, eczema alérgico, rinite.',
  cardiology: 'Coração: sopros, palpitações, avaliação cardíaca.',
  gastroenterology: 'Digestão: refluxo, obstipação, dores de barriga, intolerâncias.',
  dermatology: 'Pele: dermatite atópica, borbulhas, manchas, infeções da pele.',
  neurology: 'Desenvolvimento, dores de cabeça, convulsões, sono.',
};
function specLabel(s?: string | null): string {
  if (!s) return 'Pediatria geral';
  return SPECIALTY_PT[s] ?? s.charAt(0).toUpperCase() + s.slice(1);
}
function specDesc(s?: string | null): string | null {
  if (!s) return null;
  return SPECIALTY_DESC[s] ?? null;
}
/** "Seg–Sáb", "Todos os dias", or a short list of available weekdays. */
function availabilityLabel(days?: number[]): string | null {
  if (!days || days.length === 0) return null;
  if (days.length === 7) return 'Todos os dias';
  const sorted = [...days].sort((a, b) => a - b);
  const contiguous = sorted.every((d, i) => i === 0 || d === sorted[i - 1] + 1);
  if (contiguous && sorted.length >= 3) {
    return `${WEEKDAYS[sorted[0]]}–${WEEKDAYS[sorted[sorted.length - 1]]}`;
  }
  return sorted.map((d) => WEEKDAYS[d]).join(' · ');
}
/** Group list rows for scanability: months in the current year, whole years
 *  before ("julho", "junho", …, "2025"). Rows must arrive newest-first. */
function groupByPeriod<T>(rows: T[], dateOf: (r: T) => string): { label: string; items: T[] }[] {
  const thisYear = new Date().getFullYear();
  const groups: { label: string; items: T[] }[] = [];
  for (const r of rows) {
    const d = new Date(dateOf(r));
    const label =
      d.getFullYear() === thisYear
        ? d.toLocaleDateString('pt-PT', { month: 'long' })
        : String(d.getFullYear());
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.items.push(r);
    else groups.push({ label, items: [r] });
  }
  return groups;
}

function Skeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="grid" aria-hidden="true">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="card">
          <div className="skel skel-line w40" />
          <div className="skel skel-line w70" />
          <div className="skel skel-line w55" />
        </div>
      ))}
    </div>
  );
}

function GrowthChart({
  points,
  label,
  unit,
}: {
  points: { x: number; y: number }[];
  label: string;
  unit: string;
}) {
  if (points.length < 2) return null;
  const w = 300;
  const h = 110;
  const pad = 10;
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const sx = (x: number) => pad + (maxX === minX ? 0 : (x - minX) / (maxX - minX)) * (w - 2 * pad);
  const sy = (y: number) =>
    h - pad - (maxY === minY ? 0.5 : (y - minY) / (maxY - minY)) * (h - 2 * pad);
  const d = points.map((p, i) => `${i ? 'L' : 'M'}${sx(p.x).toFixed(1)} ${sy(p.y).toFixed(1)}`).join(' ');
  return (
    <div className="card" style={{ marginBottom: 8 }}>
      <div className="muted" style={{ fontSize: 13, marginBottom: 4 }}>
        {label}
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} preserveAspectRatio="none">
        <path d={d} fill="none" stroke="var(--accent)" strokeWidth="2.5" />
        {points.map((p, i) => (
          <circle key={i} cx={sx(p.x)} cy={sy(p.y)} r="2.6" fill="var(--brand)" />
        ))}
      </svg>
      <div
        className="muted"
        style={{ fontSize: 11, display: 'flex', justifyContent: 'space-between' }}
      >
        <span>
          {minY}
          {unit}
        </span>
        <span>
          {maxY}
          {unit}
        </span>
      </div>
    </div>
  );
}

/** Growth chart with WHO P3–P97 reference bands (x = age in months). */
function WhoGrowthChart({
  label,
  unit,
  bands,
  child,
}: {
  label: string;
  unit: string;
  bands: { p: number; points: { ageDays: number; value: number }[] }[];
  child: { ageDays: number; value: number }[];
}) {
  if (!bands.length || child.length === 0) return null;
  const w = 320;
  const h = 150;
  const pad = 16;
  const allPts = [...bands.flatMap((b) => b.points), ...child];
  const xs = allPts.map((p) => p.ageDays);
  const ys = allPts.map((p) => p.value);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const sx = (x: number) => pad + (maxX === minX ? 0 : (x - minX) / (maxX - minX)) * (w - 2 * pad);
  const sy = (y: number) =>
    h - pad - (maxY === minY ? 0.5 : (y - minY) / (maxY - minY)) * (h - 2 * pad);
  const pathOf = (pts: { ageDays: number; value: number }[]) =>
    pts.map((p, i) => `${i ? 'L' : 'M'}${sx(p.ageDays).toFixed(1)} ${sy(p.value).toFixed(1)}`).join(' ');
  const childPath = pathOf(child);
  return (
    <div className="card" style={{ marginBottom: 8 }}>
      <div className="muted" style={{ fontSize: 13, marginBottom: 4 }}>
        {label} — percentis WHO (P3·P15·P50·P85·P97)
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} preserveAspectRatio="none">
        {bands.map((b) => (
          <path
            key={b.p}
            d={pathOf(b.points)}
            fill="none"
            stroke="var(--border, #ccc)"
            strokeWidth={b.p === 50 ? 1.3 : 0.8}
            strokeDasharray={b.p === 50 ? '' : '3 3'}
          />
        ))}
        <path d={childPath} fill="none" stroke="var(--accent)" strokeWidth="2.5" />
        {child.map((p, i) => (
          <circle key={i} cx={sx(p.ageDays)} cy={sy(p.value)} r="2.8" fill="var(--brand)" />
        ))}
      </svg>
      <div className="muted" style={{ fontSize: 11, display: 'flex', justifyContent: 'space-between' }}>
        <span>{Math.round((minX / 30.4375) * 10) / 10} m</span>
        <span>
          {minY}–{maxY}
          {unit}
        </span>
        <span>{Math.round((maxX / 30.4375) * 10) / 10} m</span>
      </div>
    </div>
  );
}

/**
 * Faltering-growth flag from WHO weight-for-age z-scores: latest below P3
 * (z ≤ -2) or a downward crossing of ~one centile band from a previous peak
 * (Δz ≤ -0.67). A prompt to review, never a diagnosis.
 */
function GrowthAlert({ growth }: { growth: HealthOverview['growth'] }) {
  const zs = growth
    .filter((g) => g.weightZ != null && g.ageDays != null)
    .map((g) => g.weightZ as number);
  if (zs.length === 0) return null;
  const latest = zs[zs.length - 1];
  const prevPeak = zs.length >= 2 ? Math.max(...zs.slice(0, -1)) : latest;
  const lowNow = latest <= -2;
  const crossedDown = zs.length >= 2 && latest - prevPeak <= -0.67;
  if (!lowNow && !crossedDown) return null;
  return (
    <div className="card" style={{ borderColor: 'var(--warn, #b26a00)' }}>
      <strong>⚠️ Possível crescimento insuficiente</strong>
      <div className="muted" style={{ marginTop: 4 }}>
        {lowNow ? 'Peso para a idade abaixo do percentil 3 (P3). ' : ''}
        {crossedDown ? 'Descida de percentil entre medições. ' : ''}
        Vale a pena avaliar (alimentação, alguma doença, ou a própria medição) — isto é um sinal,
        não um diagnóstico. Fala com o pediatra.
      </div>
    </div>
  );
}

function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="empty">
      <div className="empty-ring" />
      <strong>{title}</strong>
      {hint ? <p className="muted">{hint}</p> : null}
    </div>
  );
}

/**
 * HOC — Healthcare on Call brand logo (company DES). The full lockup uses the
 * official vector artwork (light/dark variants swapped via CSS, because its
 * halo technique needs a known background). The compact header mark stays
 * inline (currentColor) so it sits cleanly on the translucent blurred chrome.
 */
function BrandLogo({ full = false, height }: { full?: boolean; height?: number }) {
  if (full) {
    const h = height ?? 150;
    // The artwork's 1000×1000 canvas carries ~28% padding around the lockup —
    // render larger and crop with a wrapper so the visual weight matches.
    const box = Math.round(h * 1.9);
    return (
      <span
        role="img"
        aria-label="HOC — Healthcare on Call"
        style={{ display: 'inline-flex', height: box * 0.62, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/hoc-logo-light.svg" alt="" width={box} height={box} className="logo-light" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/hoc-logo-dark.svg" alt="" width={box} height={box} className="logo-dark" />
      </span>
    );
  }
  // Compact mark: the official monogram with mask-cut gaps (no halo), so it
  // sits cleanly on the translucent blurred header in light AND dark.
  const h = height ?? 28;
  return (
    <span role="img" aria-label="HOC — Healthcare on Call" style={{ display: 'inline-flex' }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/hoc-mark-light.svg" alt="" height={h} className="logo-light" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/hoc-mark-dark.svg" alt="" height={h} className="logo-dark" />
    </span>
  );
}

/**
 * Debounced autocomplete: the user types, picks from the catalog, and we keep
 * both the free text (so anything is still allowed) and the coded selection.
 * Less typing, consistent terms — the core of "minimum effort".
 */
function Autocomplete<T>({
  value,
  onText,
  onPick,
  fetcher,
  render,
  placeholder,
  style,
}: {
  value: string;
  onText: (s: string) => void;
  onPick: (item: T) => void;
  fetcher: (q: string) => Promise<T[]>;
  render: (item: T) => string;
  placeholder: string;
  style?: React.CSSProperties;
}) {
  const [opts, setOpts] = useState<T[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!value.trim()) {
      setOpts([]);
      return;
    }
    let live = true;
    const id = setTimeout(() => {
      fetcher(value)
        .then((r) => live && setOpts(r))
        .catch(() => undefined);
    }, 180);
    return () => {
      live = false;
      clearTimeout(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <div style={{ position: 'relative', flex: 1, ...style }}>
      <input
        placeholder={placeholder}
        value={value}
        style={{ width: '100%' }}
        onChange={(e) => {
          onText(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      {open && opts.length > 0 ? (
        <div
          className="card"
          style={{
            position: 'absolute',
            zIndex: 30,
            top: '100%',
            left: 0,
            right: 0,
            maxHeight: 220,
            overflowY: 'auto',
            padding: 4,
          }}
        >
          {opts.map((o, i) => (
            <button
              key={i}
              type="button"
              className="link"
              style={{ display: 'block', width: '100%', textAlign: 'left', padding: '5px 6px' }}
              onMouseDown={(e) => {
                e.preventDefault();
                onPick(o);
                setOpen(false);
              }}
            >
              {render(o)}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function svcFullLabel(t: string): string {
  const m: Record<string, string> = {
    MESSAGE: 'Mensagem',
    VIDEO: 'Vídeo',
    SECOND_OPINION: '2ª opinião',
    FOLLOW_UP: 'Seguimento',
    ASYNC: 'Assíncrona',
    PRESCRIPTION_RENEWAL: 'Renovar receita',
  };
  return m[t] ?? t;
}

export default function MultiProfileApp() {
  const { t } = useT();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [tab, setTab] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [onboarding, setOnboarding] = useState(false);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  // Cross-tab deep link: "open this consultation" (from Início, Avisos or a
  // just-created consultation) — consumed by MyConsultsTab/InboxTab on mount.
  const [focusConsult, setFocusConsult] = useState<string | null>(null);
  // Unread-notifications badge on the header bell; refreshed on each tab
  // change (cheap, role-scoped endpoint) so it reacts to reads and new events.
  const [unread, setUnread] = useState(0);
  useEffect(() => {
    if (!profile) return;
    Api.notifications()
      .then((rows) => setUnread(rows.filter((n) => !n.read).length))
      .catch(() => {});
  }, [profile, tab]);

  function openConsultation(id: string) {
    setFocusConsult(id);
    setSettingsOpen(false);
    setMsg('');
    setTab(profile?.role === 'PEDIATRICIAN' ? 'inbox' : 'myconsults');
  }

  useEffect(() => {
    if (typeof window === 'undefined') return;
    // Kick the (free-tier) backend awake as early as possible so the first real
    // request doesn't hit a cold, sleeping server.
    wakeBackend();
    const saved = localStorage.getItem('pedia_profile');
    if (saved && localStorage.getItem('pedia_token')) {
      const p = PROFILES.find((x) => x.email === saved);
      if (p) {
        setProfile(p);
        setTab(tabsFor(p.role)[0].key);
      }
    }
    // Dead session detected by the API client (401 + failed refresh): return to
    // the profile picker instead of a logged-in shell where every tab errors.
    const onLogout = () => {
      localStorage.removeItem('pedia_profile');
      setProfile(null);
      setMsg('A sessão expirou. Entra novamente.');
    };
    window.addEventListener('hoc:logout', onLogout);
    return () => window.removeEventListener('hoc:logout', onLogout);
  }, []);

  async function enter(p: Profile) {
    setBusy(true);
    if (!hasApi) {
      setMsg('Backend não configurado (NEXT_PUBLIC_API_BASE).');
      setBusy(false);
      return;
    }
    setMsg('A ligar ao servidor… (pode demorar até ~1 min na primeira utilização)');
    try {
      const r = await Api.devLogin(p.email);
      setToken(r.accessToken);
      setRefreshToken(r.refreshToken);
      localStorage.setItem('pedia_profile', p.email);
      setMsg('');
      setProfile(p);
      setTab(tabsFor(p.role)[0].key);
      if (p.role === 'PARENT' && !localStorage.getItem('pedia_onboarded')) {
        setOnboarding(true);
      }
    } catch (e) {
      setMsg(`Não foi possível entrar: ${String(e)}`);
    } finally {
      setBusy(false);
    }
  }

  function leave() {
    clearToken();
    if (typeof window !== 'undefined') localStorage.removeItem('pedia_profile');
    setProfile(null);
    setMsg('');
    setTab('');
  }

  if (!profile) {
    const mainProfiles = PROFILES.filter((p) => p.role === 'PARENT' || p.role === 'PEDIATRICIAN');
    const teamProfiles = PROFILES.filter((p) => p.role !== 'PARENT' && p.role !== 'PEDIATRICIAN');
    const profileRow = (p: Profile) => (
      <button key={p.email} className="lrow" onClick={() => enter(p)} disabled={busy}>
        <span className="avatar">
          <TabIcon name={roleIcon(p.role)} />
        </span>
        <span className="lrow-main">
          <strong>{p.name}</strong>
          <span className="muted">{p.desc}</span>
        </span>
        <span className="chev">›</span>
      </button>
    );
    return (
      <main>
        <div style={{ textAlign: 'center', margin: '10px 0 18px' }}>
          <BrandLogo full height={150} />
        </div>
        <h1 style={{ textAlign: 'center', fontSize: 22 }}>Bem-vindo à HOC</h1>
        <p className="muted" style={{ textAlign: 'center' }}>
          A saúde do teu filho num só lugar — e um pediatra à distância de uma mensagem.
        </p>
        {!hasApi ? (
          <p className="notice">
            ⚠️ Backend não ligado. Sem dados reais — usa a <a href="/demo">/demo</a> (modo local).
          </p>
        ) : null}
        {msg ? <p className="notice">{msg}</p> : null}
        <div className="list">{mainProfiles.map(profileRow)}</div>
        {teamProfiles.length ? (
          <details style={{ marginTop: 14 }}>
            <summary className="muted" style={{ cursor: 'pointer', padding: '6px 2px' }}>
              Perfis de equipa (demonstração)
            </summary>
            <div className="list">{teamProfiles.map(profileRow)}</div>
          </details>
        ) : null}
      </main>
    );
  }

  if (onboarding) {
    return (
      <main>
        <Onboarding
          onDone={() => {
            if (typeof window !== 'undefined') localStorage.setItem('pedia_onboarded', '1');
            setOnboarding(false);
          }}
        />
      </main>
    );
  }

  const tabs = tabsFor(profile.role);

  return (
    <main>
      <div className="apphead">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <BrandLogo height={26} />
          <span className="avatar sm">
            <TabIcon name={roleIcon(profile.role)} />
          </span>
          <div style={{ minWidth: 0 }}>
            <strong style={{ display: 'block', lineHeight: 1.1 }}>{profile.name}</strong>
            <span className="muted" style={{ fontSize: 12 }}>
              {roleLabel(profile.role)}
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button
            className="iconbtn"
            aria-label={unread > 0 ? `Avisos — ${unread} por ler` : 'Avisos'}
            style={{ position: 'relative' }}
            onClick={() => {
              setSettingsOpen(false);
              setTab('notif');
            }}
          >
            <TabIcon name="notif" />
            {unread > 0 ? <span className="dot-badge" aria-hidden /> : null}
          </button>
          <button
            className="iconbtn"
            aria-label="Definições"
            onClick={() => setSettingsOpen(true)}
          >
            <TabIcon name="profile" />
          </button>
          <button className="btn secondary small" onClick={leave}>
            {t('app.switchProfile')}
          </button>
        </div>
      </div>

      {msg ? <p className="notice">{msg}</p> : null}

      <div style={{ minHeight: '50vh' }}>
        {settingsOpen ? (
          <SettingsScreen profile={profile} onClose={() => setSettingsOpen(false)} />
        ) : null}
        {settingsOpen ? null : (
          <>
        {tab === 'home' ? (
          <HomeTab
            profile={profile}
            onMsg={setMsg}
            onGo={(k) => {
              setMsg('');
              setTab(k);
            }}
            onOpenConsultation={openConsultation}
          />
        ) : null}
        {tab === 'children' ? <ChildrenTab onMsg={setMsg} /> : null}
        {tab === 'consult' ? <ConsultTab onMsg={setMsg} onOpenConsultation={openConsultation} /> : null}
        {tab === 'myconsults' ? (
          <MyConsultsTab
            onMsg={setMsg}
            focusId={focusConsult}
            onFocusConsumed={() => setFocusConsult(null)}
          />
        ) : null}
        {tab === 'myaccount' ? (
          <div className="section">
            <h2>A minha conta</h2>
            <h3>Plano</h3>
            <SubscriptionSection onMsg={setMsg} />
            <InvoicesSection onMsg={setMsg} />
            <PrivacySection onMsg={setMsg} onLeave={leave} />
          </div>
        ) : null}
        {tab === 'inbox' ? (
          <InboxTab
            onMsg={setMsg}
            focusId={focusConsult}
            onFocusConsumed={() => setFocusConsult(null)}
          />
        ) : null}
        {tab === 'patients' ? <PatientsTab onMsg={setMsg} /> : null}
        {tab === 'referrals' ? <ReferralsTab onMsg={setMsg} /> : null}
        {tab === 'agenda' ? <AgendaTab onMsg={setMsg} /> : null}
        {tab === 'profile' ? <PedProfileTab onMsg={setMsg} onLeave={leave} /> : null}
        {tab === 'finance' ? <FinanceTab onMsg={setMsg} /> : null}
        {tab === 'admin' ? <AdminTab onMsg={setMsg} /> : null}
        {tab === 'overview' ? <OverviewTab onMsg={setMsg} /> : null}
        {tab === 'verify' ? <VerifyTab onMsg={setMsg} /> : null}
        {tab === 'users' ? <UsersTab onMsg={setMsg} /> : null}
        {tab === 'audit' ? <AuditTab onMsg={setMsg} /> : null}
        {tab === 'fin_treasury' ? <FinTreasuryTab onMsg={setMsg} /> : null}
        {tab === 'fin_moves' ? <FinMovementsTab onMsg={setMsg} /> : null}
        {tab === 'comp_overview' ? <ComplianceOverviewTab onMsg={setMsg} onGoCreds={() => setTab('comp_creds')} /> : null}
        {tab === 'comp_creds' ? <CredentialsTab onMsg={setMsg} /> : null}
        {tab === 'sup_users' ? <SupportUsersTab onMsg={setMsg} /> : null}
        {tab === 'sup_peds' ? <SupportPedsTab onMsg={setMsg} /> : null}
        {tab === 'sup_help' ? <SupportOverviewTab onMsg={setMsg} /> : null}
        {tab === 'clinic' ? <ClinicTab role={profile.role} onMsg={setMsg} /> : null}
        {tab === 'account' ? <GenericTab profile={profile} onMsg={setMsg} /> : null}
        {tab === 'content' ? <ContentTab onMsg={setMsg} /> : null}
        {tab === 'notif' ? (
          <NotifTab
            onMsg={setMsg}
            onOpenConsultation={openConsultation}
            onGoConsults={() => {
              setMsg('');
              setTab(profile.role === 'PEDIATRICIAN' ? 'inbox' : 'myconsults');
            }}
          />
        ) : null}
          </>
        )}
      </div>

      <nav className="appbar">
        {tabs.map((tb) => (
          <button
            key={tb.key}
            className={tab === tb.key ? 'active' : ''}
            aria-label={t(`tab.${tb.key}`, tb.label)}
            title={t(`tab.${tb.key}`, tb.label)}
            onClick={() => {
              setTab(tb.key);
              setSettingsOpen(false);
              setMsg('');
            }}
          >
            <span className="ico">
              <TabIcon name={tb.key} active={tab === tb.key} />
            </span>
            <span className="lbl">{t(`tab.${tb.key}`, tb.label)}</span>
          </button>
        ))}
      </nav>

      <Emergency />
    </main>
  );
}

// Clean monochrome line icons (Instagram-style bottom bar: thin when
// inactive, heavier when active).
function TabIcon({ name, active }: { name: string; active?: boolean }) {
  const person = (
    <>
      <circle cx="12" cy="8" r="3.2" />
      <path d="M5.5 20a6.5 6.5 0 0 1 13 0" />
    </>
  );
  const people = (
    <>
      <circle cx="9" cy="8" r="3" />
      <path d="M3.5 19a5.5 5.5 0 0 1 11 0" />
      <circle cx="17.5" cy="9.5" r="2.2" />
      <path d="M15.2 19a4.2 4.2 0 0 1 6.3-3.2" />
    </>
  );
  const icons: Record<string, React.ReactNode> = {
    person,
    people,
    home: (
      <>
        <path d="M4 11.5 12 4.5l8 7" />
        <path d="M6 10v9.5h12V10" />
        <path d="M10 19.5v-5h4v5" />
      </>
    ),
    cross: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 8v8M8 12h8" />
      </>
    ),
    shield: <path d="M12 3l7 2.8v5.2c0 4.4-3 7.4-7 8.9-4-1.5-7-4.5-7-8.9V5.8z" />,
    headset: (
      <>
        <path d="M4 13v-1a8 8 0 0 1 16 0v1" />
        <rect x="2.6" y="13" width="4.2" height="6.2" rx="1.6" />
        <rect x="17.2" y="13" width="4.2" height="6.2" rx="1.6" />
        <path d="M21.4 19.2a3 3 0 0 1-3 3H15" />
      </>
    ),
    children: people,
    // "Consultar" = talk to a doctor (chat + cross), not a search magnifier.
    consult: (
      <>
        <path d="M21 11.5a8 8 0 0 1-11.7 7.1L4 20l1.4-5.1A8 8 0 1 1 21 11.5z" />
        <path d="M12 8.5v6M9 11.5h6" />
      </>
    ),
    search: (
      <>
        <circle cx="11" cy="11" r="6.5" />
        <path d="m20 20-3.4-3.4" />
      </>
    ),
    myconsults: <path d="M21 11.5a8 8 0 0 1-11.7 7.1L4 20l1.4-5.1A8 8 0 1 1 21 11.5z" />,
    content: (
      <>
        <path d="M12 6.5C10.4 5.2 8.4 4.5 6 4.5V18c2.4 0 4.4.7 6 2 1.6-1.3 3.6-2 6-2V4.5c-2.4 0-4.4.7-6 2z" />
        <path d="M12 6.5V20" />
      </>
    ),
    myaccount: person,
    account: person,
    profile: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 12.9a7.6 7.6 0 0 0 0-1.8l2-1.5-2-3.4-2.3 1a7.6 7.6 0 0 0-1.6-.9l-.3-2.5h-4l-.3 2.5a7.6 7.6 0 0 0-1.6.9l-2.3-1-2 3.4 2 1.5a7.6 7.6 0 0 0 0 1.8l-2 1.5 2 3.4 2.3-1a7.6 7.6 0 0 0 1.6.9l.3 2.5h4l.3-2.5a7.6 7.6 0 0 0 1.6-.9l2.3 1 2-3.4z" />
      </>
    ),
    notif: (
      <>
        <path d="M18 8.5a6 6 0 1 0-12 0c0 6.5-2.5 8-2.5 8h17S18 15 18 8.5z" />
        <path d="M13.6 21a2 2 0 0 1-3.2 0" />
      </>
    ),
    inbox: (
      <>
        <path d="M22 12.5h-5.2l-1.5 2.5h-6.6L7.2 12.5H2" />
        <path d="M5.6 5.7 2 12.5V18a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-5.5l-3.6-6.8A2 2 0 0 0 16.6 4.5H7.4a2 2 0 0 0-1.8 1.2z" />
      </>
    ),
    agenda: (
      <>
        <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
        <path d="M3.5 9.5h17M8 3v4M16 3v4" />
      </>
    ),
    finance: (
      <>
        <rect x="2.5" y="6" width="19" height="13" rx="3" />
        <path d="M2.5 10.5h19M16.5 15h2" />
      </>
    ),
    overview: <path d="M5 20.5V11M12 20.5V4M19 20.5v-7" />,
    verify: (
      <>
        <circle cx="12" cy="12" r="8.5" />
        <path d="m8.5 12 2.3 2.3 4.7-4.6" />
      </>
    ),
    admin: <path d="M8 6.5h13M8 12h13M8 17.5h13M3.5 6.5h.01M3.5 12h.01M3.5 17.5h.01" />,
    users: people,
    audit: (
      <>
        <rect x="6" y="3.5" width="12" height="17" rx="2.5" />
        <path d="M9.5 3.5V6h5V3.5M9 11h6M9 15h4" />
      </>
    ),
    clinic: (
      <>
        <path d="M4 21V8.5l8-5 8 5V21" />
        <path d="M9.5 21v-4.5h5V21M12 9.5v3M10.5 11h3" />
      </>
    ),
    referrals: (
      <>
        <path d="M3 8h11l-2.5-2.5M21 16H10l2.5 2.5" />
        <circle cx="17.5" cy="8" r="2.2" />
        <circle cx="6.5" cy="16" r="2.2" />
      </>
    ),
  };
  // Backoffice tabs reuse existing glyphs.
  const alias: Record<string, string> = {
    fin_treasury: 'finance',
    fin_moves: 'audit',
    comp_overview: 'shield',
    comp_creds: 'audit',
    sup_users: 'search',
    sup_peds: 'cross',
    sup_help: 'headset',
  };
  return (
    <svg
      width="23"
      height="23"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={active ? 2.4 : 1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {icons[alias[name] ?? name] ?? icons.consult}
    </svg>
  );
}

// Friendly Portuguese labels for roles and pediatrician status, used across the
// backoffice panels so users never see raw enum values.
const ROLE_PT: Record<string, string> = {
  PARENT: 'Família',
  PEDIATRICIAN: 'Pediatra',
  CLINIC_ADMIN: 'Clínica · Administrador',
  CLINIC_STAFF: 'Clínica · Colaborador',
  PLATFORM_ADMIN: 'Administração',
  SUPPORT: 'Suporte',
  FINANCE: 'Finanças',
  COMPLIANCE: 'Conformidade',
};
function roleLabel(r: string): string {
  return ROLE_PT[r] ?? r;
}
const PED_STATUS_PT: Record<string, { label: string; pill: string }> = {
  ACTIVE: { label: 'Verificado', pill: 'pill ok' },
  PENDING: { label: 'Pendente', pill: 'pill' },
  SUSPENDED: { label: 'Suspenso', pill: 'pill warn' },
};
function pedStatus(s: string): { label: string; pill: string } {
  return PED_STATUS_PT[s] ?? { label: s, pill: 'pill muted' };
}
function guardianLabel(rel: string): string {
  return ({ mother: 'Mãe', father: 'Pai' } as Record<string, string>)[rel] ?? 'Tutor';
}

function roleIcon(role: string): string {
  const m: Record<string, string> = {
    PARENT: 'person',
    PEDIATRICIAN: 'cross',
    PLATFORM_ADMIN: 'shield',
    FINANCE: 'finance',
    CLINIC_ADMIN: 'clinic',
    CLINIC_STAFF: 'clinic',
    SUPPORT: 'headset',
    COMPLIANCE: 'audit',
  };
  return m[role] ?? 'person';
}

// Notifications live behind the header bell (not a tab) — recognition over
// clutter; the labels under each icon carry the rest.
function tabsFor(role: string): { key: string; label: string }[] {
  if (role === 'PARENT')
    return [
      { key: 'home', label: 'Início' },
      { key: 'consult', label: 'Consultar' },
      { key: 'myconsults', label: 'Consultas' },
      { key: 'children', label: 'Crianças' },
      { key: 'myaccount', label: 'Conta' },
    ];
  if (role === 'PEDIATRICIAN')
    return [
      { key: 'inbox', label: 'Caixa' },
      { key: 'patients', label: 'Doentes' },
      { key: 'referrals', label: '2ª opinião' },
      { key: 'agenda', label: 'Agenda' },
      { key: 'profile', label: 'Perfil' },
      { key: 'finance', label: 'Ganhos' },
    ];
  const overview = { key: 'overview', label: 'Visão' };
  const audit = { key: 'audit', label: 'Auditoria' };
  const users = { key: 'users', label: 'Utilizadores' };
  if (role === 'PLATFORM_ADMIN')
    return [
      overview,
      { key: 'verify', label: 'Pediatras' },
      { key: 'admin', label: 'Consultas' },
      users,
    ];
  if (role === 'FINANCE')
    return [
      { key: 'fin_treasury', label: 'Tesouraria' },
      { key: 'fin_moves', label: 'Movimentos' },
    ];
  if (role === 'COMPLIANCE')
    return [
      { key: 'comp_overview', label: 'Conformidade' },
      { key: 'comp_creds', label: 'Credenciais' },
      audit,
    ];
  if (role === 'SUPPORT')
    return [
      { key: 'sup_users', label: 'Utilizadores' },
      { key: 'sup_peds', label: 'Pediatras' },
      { key: 'sup_help', label: 'Visão' },
    ];
  if (role === 'CLINIC_ADMIN' || role === 'CLINIC_STAFF') return [{ key: 'clinic', label: 'Clínica' }];
  return [{ key: 'account', label: 'Conta' }];
}

// ───────────────────────── Thread (shared) ─────────────────────────
// Minimal typing for the browser Web Speech API (not in every lib.dom target).
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
}
function getSpeechRecognition(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/**
 * Compact child record shown inside the consultation, so the pediatrician reads
 * the relevant history (active problems, medication, recent weight, vaccines)
 * without leaving the thread. Collapsible; fails silent if unreachable.
 */
function ChildSummary({ childId }: { childId: string }) {
  const [d, setD] = useState<HealthOverview | null>(null);
  const [open, setOpen] = useState(true);
  const [err, setErr] = useState(false);

  useEffect(() => {
    let live = true;
    Api.childHealth(childId)
      .then((r) => live && setD(r))
      .catch(() => live && setErr(true));
    return () => {
      live = false;
    };
  }, [childId]);

  if (err) return null;
  const problems = (d?.episodes ?? []).filter((e) => e.status !== 'CLOSED');
  const meds = (d?.medications ?? []).filter((m) => m.active);
  const lastWeight = [...(d?.growth ?? [])].reverse().find((g) => g.weightKg != null)?.weightKg ?? null;
  const vaccines = d?.vaccines ?? [];

  return (
    <div className="card" style={{ marginTop: 12, borderColor: 'var(--brand)' }}>
      <button
        className="link"
        onClick={() => setOpen(!open)}
        style={{ display: 'block', width: '100%', textAlign: 'left', fontWeight: 600 }}
      >
        {open ? '▾' : '▸'} Ficha da criança
      </button>
      {open ? (
        !d ? (
          <span className="muted">A carregar…</span>
        ) : (
          <div style={{ fontSize: 14, marginTop: 6, display: 'grid', gap: 4 }}>
            <div>
              <strong>Problemas ativos:</strong>{' '}
              {problems.length ? problems.map((p) => p.title ?? '—').join(', ') : '—'}
            </div>
            <div>
              <strong>Medicação:</strong>{' '}
              {meds.length
                ? meds.map((m) => `${m.name ?? '—'}${m.dose ? ` (${m.dose})` : ''}`).join(', ')
                : '—'}
            </div>
            <div>
              <strong>Alergias:</strong>{' '}
              {(d.allergies ?? []).length
                ? (d.allergies ?? []).map((a) => a.label ?? '—').join(', ')
                : 'nenhuma registada'}
            </div>
            <div>
              <strong>Vacinas:</strong> {vaccines.length} registada{vaccines.length === 1 ? '' : 's'}
            </div>
            <div>
              <strong>Peso recente:</strong> {lastWeight != null ? `${lastWeight} kg` : '—'}
            </div>
            {(d.vitals ?? [])[0] ? (
              <div>
                <strong>Últimos vitais:</strong>{' '}
                {[
                  (d.vitals ?? [])[0].temperatureC != null ? `${(d.vitals ?? [])[0].temperatureC}ºC` : null,
                  (d.vitals ?? [])[0].heartRateBpm != null ? `${(d.vitals ?? [])[0].heartRateBpm} bpm` : null,
                  (d.vitals ?? [])[0].spo2Pct != null ? `SpO₂ ${(d.vitals ?? [])[0].spo2Pct}%` : null,
                ]
                  .filter(Boolean)
                  .join(' · ') || '—'}
              </div>
            ) : null}
          </div>
        )
      ) : null}
    </div>
  );
}

function Thread({
  consultation,
  canClose,
  canCancel,
  onChanged,
  onBack,
  onMsg,
}: {
  consultation: ConsultationDto;
  canClose: boolean;
  canCancel: boolean;
  onChanged: () => void;
  onBack: () => void;
  onMsg: (m: string) => void;
}) {
  const [messages, setMessages] = useState<MessageDto[]>([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [video, setVideo] = useState<{ url: string; token: string } | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [sumDraft, setSumDraft] = useState('');
  const [editSum, setEditSum] = useState(false);
  const [dictating, setDictating] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const myId = currentUserId();

  async function loadSummary() {
    try {
      const r = await Api.consultationSummary(consultation.id);
      setSummary(r.summary);
      setSumDraft(r.summary ?? '');
    } catch {
      /* ignore */
    }
  }
  useEffect(() => {
    void loadSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [consultation.id]);

  async function saveSummary() {
    setBusy(true);
    try {
      await Api.setSummary(consultation.id, sumDraft);
      setEditSum(false);
      onMsg('Resumo guardado ✓');
      await loadSummary();
    } catch (e) {
      onMsg(`Erro: ${String(e)}`);
    } finally {
      setBusy(false);
    }
  }

  // Structured SOAP skeleton (a template helper, not external AI) pre-filled
  // from the intake triage. The pediatrician completes and edits before saving.
  function genDraft() {
    const triage = (consultation.triage ?? {}) as { redFlags?: unknown; severe?: unknown };
    const keys = Array.isArray(triage.redFlags) ? (triage.redFlags as string[]) : [];
    const flagLabels = keys
      .map((k) => RED_FLAGS.find((f) => f.key === k)?.label ?? k)
      .filter(Boolean);
    const motivo = flagLabels.length
      ? `Triagem assinalou: ${flagLabels.join('; ')}.`
      : 'Sem sinais de alarme assinalados na triagem.';
    const urgencia = triage.severe ? '\n⚠️ Triagem indicou sinais graves — avaliar prioridade.' : '';
    const tpl =
      `Motivo / queixa:\n${motivo}${urgencia}\n\n` +
      `Avaliação:\n- \n\n` +
      `Orientação / plano:\n- \n\n` +
      `Sinais de alarme a vigiar:\n- Recorrer a urgência se agravamento, febre persistente, recusa alimentar ou prostração.\n\n` +
      `Seguimento:\n- `;
    setSumDraft((prev) => (prev.trim() ? prev : tpl));
    setEditSum(true);
  }

  // Voice dictation of the clinical note (Web Speech API). The pediatrician
  // dictates their own note — speech-to-text via the browser — and appends it
  // to the editable summary draft. Stays in the browser until the pediatrician
  // saves the (encrypted) summary. Full ambient transcription is a separate,
  // consented feature (see docs/26).
  const speechSupported = getSpeechRecognition() !== null;
  function toggleDictation() {
    if (dictating) {
      recognitionRef.current?.stop();
      return;
    }
    const SR = getSpeechRecognition();
    if (!SR) {
      onMsg('Este browser não suporta ditado por voz (tenta o Chrome).');
      return;
    }
    const rec = new SR();
    rec.lang = 'pt-PT';
    rec.continuous = true;
    rec.interimResults = false;
    rec.onresult = (e) => {
      let finalText = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) finalText += e.results[i][0].transcript;
      }
      finalText = finalText.trim();
      if (finalText) setSumDraft((prev) => (prev.trim() ? `${prev} ${finalText}` : finalText));
    };
    rec.onerror = (e) => {
      onMsg(`Ditado: ${e.error}`);
      setDictating(false);
    };
    rec.onend = () => {
      setDictating(false);
      recognitionRef.current = null;
    };
    recognitionRef.current = rec;
    rec.start();
    setDictating(true);
    setEditSum(true);
  }
  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
    };
  }, []);

  // Clean/structure the dictated note into SOAP via the AI assistant (server-side
  // Claude). Replaces the draft with the structured text for review; never auto-saves.
  async function structureWithAi() {
    if (!sumDraft.trim()) {
      onMsg('Escreve ou dita a nota primeiro.');
      return;
    }
    setBusy(true);
    try {
      const r = await Api.structureSummary(consultation.id, sumDraft);
      setSumDraft(r.text);
      setEditSum(true);
      onMsg('Nota estruturada com IA — revê antes de guardar.');
    } catch (e) {
      onMsg(`IA indisponível: ${String(e)} (precisa de ANTHROPIC_API_KEY no backend)`);
    } finally {
      setBusy(false);
    }
  }

  async function load() {
    try {
      setMessages(await Api.messages(consultation.id));
    } catch (e) {
      onMsg(`Erro a carregar mensagens: ${String(e)}`);
    }
  }
  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [consultation.id]);

  async function send() {
    if (!draft.trim()) return;
    setBusy(true);
    try {
      await Api.sendMessage(consultation.id, draft.trim());
      setDraft('');
      await load();
    } catch (e) {
      onMsg(`Erro ao enviar: ${String(e)}`);
    } finally {
      setBusy(false);
    }
  }
  async function close() {
    setBusy(true);
    try {
      await Api.closeConsultation(consultation.id);
      onMsg('Consulta fechada ✓');
      onChanged();
    } catch (e) {
      onMsg(`Erro ao fechar: ${String(e)}`);
    } finally {
      setBusy(false);
    }
  }
  async function cancel() {
    setBusy(true);
    try {
      await Api.cancelConsultation(consultation.id);
      onMsg('Consulta cancelada e reembolsada ✓');
      onChanged();
    } catch (e) {
      onMsg(`Erro ao cancelar: ${String(e)}`);
    } finally {
      setBusy(false);
    }
  }
  async function joinVideo() {
    if (busy) return; // guard against double-click spawning two token requests
    setBusy(true);
    try {
      const r = await Api.videoToken(consultation.id);
      setVideo({ url: r.url, token: r.token });
    } catch (e) {
      onMsg(`Erro no vídeo: ${String(e)}`);
    } finally {
      setBusy(false);
    }
  }
  // Tear down the LiveKit room if the thread is closed while still connected.
  useEffect(() => () => setVideo(null), []);

  return (
    <div className="section">
      <button className="btn secondary small" onClick={onBack} style={{ marginBottom: 12 }}>
        ← Voltar
      </button>
      <div className="card">
        <span className={statusPill(consultation.status)}>{statusLabel(consultation.status)}</span>{' '}
        <strong>{svcLabel(consultation.type)}</strong>
        <div className="muted">
          {euro(consultation.priceCents)} · aberta {when(consultation.openedAt)}
        </div>
        {consultation.type === 'VIDEO' && consultation.status !== 'CLOSED' ? (
          <button className="btn small" onClick={joinVideo} disabled={busy} style={{ marginTop: 8 }}>
            Entrar na videochamada
          </button>
        ) : null}
      </div>
      {/* What the family flagged in triage — the pediatrician must see it
          before reading the question (and the parent sees what they sent). */}
      {(() => {
        const tri = consultation.triage as { redFlags?: string[]; severe?: boolean } | null;
        if (!tri?.redFlags?.length) return null;
        return (
          <div className={`notice${tri.severe ? ' warn' : ''}`} style={{ marginTop: 10 }}>
            <strong style={{ display: 'block', marginBottom: 6 }}>
              Triagem da família{tri.severe ? ' — sinais graves assinalados ⚠️' : ''}
            </strong>
            <div className="row" style={{ flexWrap: 'wrap', gap: 6 }}>
              {tri.redFlags.map((k) => (
                <span key={k} className="pill warn">
                  {RED_FLAGS.find((f) => f.key === k)?.label ?? k}
                </span>
              ))}
            </div>
          </div>
        );
      })()}
      {canClose && consultation.childId ? (
        <ChildSummary childId={consultation.childId} />
      ) : null}
      {canClose && consultation.status !== 'REFUNDED' && consultation.status !== 'CANCELLED' ? (
        <ReferralRequest consultationId={consultation.id} onMsg={onMsg} />
      ) : null}
      {video ? (
        <VideoRoom url={video.url} token={video.token} onLeave={() => setVideo(null)} />
      ) : null}

      {/* Post-consultation summary (pediatrician writes; both read). */}
      {summary && !editSum ? (
        <div className="card" style={{ borderColor: 'var(--brand)', marginTop: 12 }}>
          <strong>Resumo do pediatra</strong>
          <p style={{ whiteSpace: 'pre-wrap', margin: '6px 0 0' }}>{summary}</p>
          {canClose ? (
            <button className="btn secondary small" onClick={() => setEditSum(true)} style={{ marginTop: 8 }}>
              Editar resumo
            </button>
          ) : null}
        </div>
      ) : null}
      {canClose && (editSum || !summary) ? (
        <div className="card section">
          <strong>Resumo / nota clínica</strong>
          <textarea
            placeholder="Resumo da consulta para a família…"
            value={sumDraft}
            onChange={(e) => setSumDraft(e.target.value)}
            rows={6}
          />
          <div className="row" style={{ marginTop: 8 }}>
            <button className="btn small secondary" onClick={genDraft} disabled={busy} title="Pré-preenche um esqueleto a partir da triagem">
              Gerar rascunho
            </button>
            {speechSupported ? (
              <button
                className={dictating ? 'btn small danger' : 'btn small secondary'}
                onClick={toggleDictation}
                disabled={busy}
                title="Dita a nota clínica por voz (transcrição no browser)"
              >
                {dictating ? 'Parar ditado' : 'Ditar nota'}
              </button>
            ) : null}
            <button
              className="btn small secondary"
              onClick={structureWithAi}
              disabled={busy || !sumDraft.trim()}
              title="Corrige e organiza a nota em SOAP com IA (revê antes de guardar)"
            >
              Estruturar com IA
            </button>
            <button className="btn small" onClick={saveSummary} disabled={busy || !sumDraft.trim()}>
              Guardar resumo
            </button>
          </div>
          {dictating ? (
            <p className="muted" style={{ fontSize: 12, marginTop: 6 }}>
              A ouvir… fala a tua nota. (A transcrição é feita pelo serviço de voz do browser.)
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="chat">
        {messages.length === 0 ? (
          <p className="muted">Ainda sem mensagens.</p>
        ) : (
          messages.map((m) => {
            const mine = !!myId && m.senderUserId === myId;
            return (
              <div key={m.id} className={mine ? 'bubble me' : 'bubble them'}>
                <span>{m.body}</span>
                <span className="bubble-time">{when(m.createdAt)}</span>
              </div>
            );
          })
        )}
      </div>

      {consultation.status !== 'CLOSED' && consultation.status !== 'REFUNDED' ? (
        <div className="card section">
          <textarea
            placeholder="Escrever mensagem…"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={2}
          />
          <div className="row" style={{ marginTop: 8 }}>
            <button className="btn" onClick={send} disabled={busy}>
              Enviar
            </button>
            {canClose ? (
              <button className="btn secondary" onClick={close} disabled={busy}>
                Fechar consulta
              </button>
            ) : null}
            {canCancel && (consultation.status === 'OPEN' || consultation.status === 'TRIAGE') ? (
              <button className="btn danger" onClick={cancel} disabled={busy}>
                Cancelar (reembolso)
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

// ───────────────────────── Parent: Início (home) ─────────────────────────
/** Answers "what should I do now?": primary action, what's happening,
 *  the children, and a taste of Saber+ — no forms, no jargon. */
function HomeTab({
  profile,
  onMsg,
  onGo,
  onOpenConsultation,
}: {
  profile: Profile;
  onMsg: (m: string) => void;
  onGo: (tab: string) => void;
  onOpenConsultation: (id: string) => void;
}) {
  const [children, setChildren] = useState<ChildDto[]>([]);
  const [consults, setConsults] = useState<ConsultationDto[]>([]);
  const [articles, setArticles] = useState<ArticleCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [c, m, a] = await Promise.all([
          Api.children().catch(() => [] as ChildDto[]),
          Api.myConsultations().catch(() => [] as ConsultationDto[]),
          Api.articles().catch(() => [] as ArticleCard[]),
        ]);
        setChildren(c);
        setConsults(m);
        setArticles(a.slice(0, 2));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const now = Date.now();
  const upcomingVideo = consults
    .filter(
      (c) =>
        c.type === 'VIDEO' &&
        c.scheduledAt &&
        new Date(c.scheduledAt).getTime() > now - 30 * 60 * 1000 &&
        !['CLOSED', 'REFUNDED', 'EXPIRED'].includes(c.status),
    )
    .sort((a, b) => new Date(a.scheduledAt!).getTime() - new Date(b.scheduledAt!).getTime())[0];
  const answered = consults.filter((c) => c.status === 'ANSWERED');

  const firstName = (profile.name || '').split(' ')[0];
  const ageLabel = (birth: string) => {
    const months = Math.floor((now - new Date(birth).getTime()) / (30.44 * 86_400_000));
    return months < 24 ? `${months} m` : `${Math.floor(months / 12)} anos`;
  };

  return (
    <div className="section">
      <h2 style={{ marginBottom: 0 }}>Olá, {firstName} 👋</h2>
      <p className="muted" style={{ marginTop: 2, textTransform: 'capitalize' }}>
        {new Date().toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long' })}
      </p>

      <button
        className="card accent"
        onClick={() => onGo('consult')}
        style={{ marginTop: 12, display: 'block', width: '100%', textAlign: 'left' }}
      >
        <strong style={{ fontSize: 17 }}>Falar com um pediatra</strong>
        <span className="muted" style={{ display: 'block', marginTop: 2 }}>
          Envia uma pergunta ou marca uma videoconsulta — resposta de um pediatra verificado.
        </span>
      </button>

      {upcomingVideo ? (
        <button
          className="card"
          onClick={() => onOpenConsultation(upcomingVideo.id)}
          style={{ marginTop: 10, display: 'block', width: '100%', textAlign: 'left' }}
        >
          <span className="pill">A seguir</span>
          <strong style={{ display: 'block', marginTop: 6 }}>
            Videoconsulta{upcomingVideo.child?.name ? ` · ${upcomingVideo.child.name}` : ''}
          </strong>
          <span className="muted">
            {new Date(upcomingVideo.scheduledAt!).toLocaleString('pt-PT', {
              weekday: 'long',
              day: 'numeric',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
            })}{' '}
            · toca para abrir
          </span>
        </button>
      ) : null}

      {answered.length > 0 ? (
        <button
          className="card"
          onClick={() => onOpenConsultation(answered[0].id)}
          style={{ marginTop: 10, display: 'block', width: '100%', textAlign: 'left' }}
        >
          <span className="pill ok">Resposta nova</span>
          <strong style={{ display: 'block', marginTop: 6 }}>
            O pediatra respondeu{answered[0].child?.name ? ` sobre ${answered[0].child.name}` : ''}
          </strong>
          <span className="muted">Toca para ler a resposta.</span>
        </button>
      ) : null}

      <h3 style={{ marginTop: 18 }}>As crianças</h3>
      {loading ? (
        <Skeleton rows={1} />
      ) : children.length === 0 ? (
        <button
          className="card"
          onClick={() => onGo('children')}
          style={{ display: 'block', width: '100%', textAlign: 'left' }}
        >
          <strong>Adicionar o meu filho</strong>
          <span className="muted" style={{ display: 'block', marginTop: 2 }}>
            Guarda vacinas, crescimento e consultas num só sítio, em segurança.
          </span>
        </button>
      ) : (
        <div className="row" style={{ flexWrap: 'wrap' }}>
          {children.map((c) => (
            <button key={c.id} className="chip" onClick={() => onGo('children')}>
              🧒 {c.name} · {ageLabel(c.birthDate)}
            </button>
          ))}
        </div>
      )}

      {consults.length ? (
        <>
          <h3 style={{ marginTop: 18 }}>Últimas consultas</h3>
          {consults.slice(0, 3).map((c) => (
            <button
              key={c.id}
              className="card"
              onClick={() => onOpenConsultation(c.id)}
              style={{ display: 'block', width: '100%', textAlign: 'left', marginTop: 8 }}
            >
              <span className={statusPill(c.status)}>{statusLabel(c.status)}</span>{' '}
              <strong>{svcLabel(c.type)}</strong>
              {c.child?.name ? <span className="muted"> · {c.child.name}</span> : null}
              <span className="muted" style={{ display: 'block', fontSize: 12, marginTop: 2 }}>
                {new Date(c.openedAt).toLocaleDateString('pt-PT', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}{' '}
                · toca para rever
              </span>
            </button>
          ))}
          <button className="btn secondary small" onClick={() => onGo('myconsults')} style={{ marginTop: 8 }}>
            Ver todas as consultas
          </button>
        </>
      ) : null}

      {articles.length ? (
        <>
          <h3 style={{ marginTop: 18 }}>Saber+</h3>
          {articles.map((a) => (
            <button
              key={a.id}
              className="card"
              onClick={() => onGo('content')}
              style={{ display: 'block', width: '100%', textAlign: 'left', marginTop: 8 }}
            >
              <span className="badge">{a.category}</span>
              <strong style={{ display: 'block', marginTop: 2 }}>{a.title}</strong>
            </button>
          ))}
          <button className="btn secondary small" onClick={() => onGo('content')} style={{ marginTop: 8 }}>
            Ver todos os conteúdos
          </button>
        </>
      ) : null}
    </div>
  );
}

// ───────────────────────── Parent: Children ─────────────────────────
function ChildrenTab({ onMsg }: { onMsg: (m: string) => void }) {
  const [children, setChildren] = useState<ChildDto[]>([]);
  const [name, setName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [sex, setSex] = useState('');
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState<ChildDto | null>(null);

  async function load() {
    try {
      setChildren(await Api.children());
    } catch (e) {
      onMsg(`Erro a carregar: ${String(e)}`);
    }
  }
  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function add() {
    if (!name || !birthDate) return onMsg('Indica nome e data de nascimento.');
    if (!consent) return onMsg('Tens de autorizar o tratamento de dados de saúde.');
    setBusy(true);
    try {
      await Api.addChild({ name, birthDate, sex: sex || undefined, healthDataConsent: true });
      setName('');
      setBirthDate('');
      setSex('');
      setConsent(false);
      onMsg('Criança adicionada ✓');
      await load();
    } catch (e) {
      onMsg(`Erro: ${String(e)}`);
    } finally {
      setBusy(false);
    }
  }

  if (open) return <ChildHealth child={open} onBack={() => setOpen(null)} onMsg={onMsg} />;

  return (
    <div className="section">
      <h2>As crianças</h2>
      {children.length === 0 ? (
        <p className="muted">Vamos começar pelo teu filho — adiciona-o para guardar vacinas, crescimento e consultas num só sítio.</p>
      ) : (
        <div className="grid">
          {children.map((c) => (
            <button
              key={c.id}
              className="card"
              onClick={() => setOpen(c)}
              style={{ textAlign: 'left', cursor: 'pointer' }}
            >
              <strong>{c.name}</strong>
              <div className="muted">
                {new Date(c.birthDate).toLocaleDateString('pt-PT')} · ver saúde →
              </div>
            </button>
          ))}
        </div>
      )}
      <div className="card section">
        <h3>Adicionar criança</h3>
        <input placeholder="Nome" value={name} onChange={(e) => setName(e.target.value)} />
        <input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
        <select value={sex} onChange={(e) => setSex(e.target.value)} style={{ display: 'block', margin: '8px 0' }}>
          <option value="">Sexo — para as curvas de crescimento certas…</option>
          <option value="M">Masculino</option>
          <option value="F">Feminino</option>
        </select>
        <label className="muted" style={{ display: 'block', margin: '8px 0' }}>
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            style={{ width: 'auto', marginRight: 8 }}
          />
          Autorizo o tratamento dos dados de saúde do meu filho 🔒
        </label>
        <button className="btn" onClick={add} disabled={busy}>
          Adicionar
        </button>
      </div>
    </div>
  );
}

/** Collapsed "+ Registar" form — the health profile reads first, writes on
 *  demand (no wall of six open forms for a parent). */
function Reg({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <details className="regform">
      <summary>{label}</summary>
      <div className="card" style={{ marginTop: 8 }}>{children}</div>
    </details>
  );
}

// ───────────────────────── Parent: Child health profile ─────────────────────────
function ChildHealth({
  child,
  onBack,
  onMsg,
}: {
  child: ChildDto;
  onBack: () => void;
  onMsg: (m: string) => void;
}) {
  const [d, setD] = useState<HealthOverview | null>(null);
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState<'main' | 'timeline' | 'boletim'>('main');
  // growth form
  const [gDate, setGDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [gH, setGH] = useState('');
  const [gW, setGW] = useState('');
  // vitals form
  const [vtTemp, setVtTemp] = useState('');
  const [vtHr, setVtHr] = useState('');
  const [vtRr, setVtRr] = useState('');
  const [vtSpo2, setVtSpo2] = useState('');
  // vaccine form
  const [vName, setVName] = useState('');
  const [vDate, setVDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [vCode, setVCode] = useState('');
  // medication form
  const [mName, setMName] = useState('');
  const [mDose, setMDose] = useState('');
  const [mAtc, setMAtc] = useState('');
  const [doseHint, setDoseHint] = useState('');
  const [drugWarn, setDrugWarn] = useState('');
  // allergy form
  const [alName, setAlName] = useState('');
  const [alCode, setAlCode] = useState('');
  const [alCat, setAlCat] = useState('');
  // episode form
  const [eTitle, setETitle] = useState('');
  const [eSummary, setESummary] = useState('');
  const [eIcpc, setEIcpc] = useState('');
  const [eIcd10, setEIcd10] = useState('');

  // Most recent recorded weight, for weight-based dose suggestions.
  const latestWeightKg =
    [...(d?.growth ?? [])].reverse().find((g) => g.weightKg != null)?.weightKg ?? null;

  async function load() {
    try {
      setD(await Api.childHealth(child.id));
    } catch (e) {
      onMsg(`Erro: ${String(e)}`);
    }
  }
  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [child.id]);

  async function run(fn: () => Promise<unknown>, ok: string) {
    setBusy(true);
    try {
      await fn();
      onMsg(ok);
      await load();
    } catch (e) {
      onMsg(`Erro: ${String(e)}`);
    } finally {
      setBusy(false);
    }
  }

  if (view === 'timeline') {
    return <ChildTimelineView child={child} onBack={() => setView('main')} onMsg={onMsg} />;
  }
  if (view === 'boletim' && d) {
    return <BoletimView child={child} d={d} onBack={() => setView('main')} />;
  }

  return (
    <div className="section">
      <button className="btn secondary small" onClick={onBack} style={{ marginBottom: 12 }}>
        ← Voltar
      </button>
      <h2>{child.name}</h2>
      <p className="muted">
        {new Date(child.birthDate).toLocaleDateString('pt-PT')} · os dados de saúde do teu filho, guardados em segurança 🔒
      </p>
      <div className="row" style={{ marginBottom: 4 }}>
        <button className="btn small secondary" onClick={() => setView('timeline')}>
          🕒 Linha do tempo
        </button>
        <button className="btn small secondary" disabled={!d} onClick={() => setView('boletim')}>
          📄 Boletim (PDF)
        </button>
      </div>
      {!d ? (
        <p className="muted">A carregar…</p>
      ) : (
        <>
          {/* Growth */}
          <GrowthAlert growth={d.growth} />
          <section className="hsec">
          <div className="hsec-head">
            <span className="hsec-ico" aria-hidden>📏</span>
            <h3>Crescimento</h3>
            <span className="pill muted">{d.growth.length}</span>
          </div>
          {d.whoBands && d.who ? (
            <>
              <WhoGrowthChart
                label="Peso (kg)"
                unit=" kg"
                bands={d.whoBands.wfa}
                child={d.growth
                  .filter((g) => g.weightKg != null && g.ageDays != null)
                  .map((g) => ({ ageDays: g.ageDays as number, value: g.weightKg as number }))}
              />
              <WhoGrowthChart
                label="Comprimento/Estatura (cm)"
                unit=" cm"
                bands={d.whoBands.lhfa}
                child={d.growth
                  .filter((g) => g.heightCm != null && g.ageDays != null)
                  .map((g) => ({ ageDays: g.ageDays as number, value: g.heightCm as number }))}
              />
            </>
          ) : (
            <>
              <GrowthChart
                label="Altura (cm)"
                unit=" cm"
                points={d.growth
                  .filter((g) => g.heightCm != null)
                  .map((g) => ({ x: new Date(g.measuredAt).getTime(), y: g.heightCm as number }))}
              />
              <GrowthChart
                label="Peso (kg)"
                unit=" kg"
                points={d.growth
                  .filter((g) => g.weightKg != null)
                  .map((g) => ({ x: new Date(g.measuredAt).getTime(), y: g.weightKg as number }))}
              />
            </>
          )}
          {!d.who ? (
            <p className="muted" style={{ fontSize: 12 }}>
              Define o sexo da criança para ver os percentis WHO (0–5 anos).
            </p>
          ) : null}
          {d.growth.length === 0 ? (
            <p className="muted">Sem medições.</p>
          ) : (
            <div className="grid">
              {d.growth.map((g) => (
                <div key={g.id} className="card">
                  <strong>{new Date(g.measuredAt).toLocaleDateString('pt-PT')}</strong>
                  <div className="muted">
                    {g.heightCm ? `${g.heightCm} cm` : ''} {g.weightKg ? `· ${g.weightKg} kg` : ''}
                    {g.bmi ? ` · IMC ${g.bmi}` : ''}
                  </div>
                  {g.weightP != null || g.heightP != null || g.bmiP != null ? (
                    <div className="muted" style={{ fontSize: 12 }}>
                      {g.weightP != null ? `Peso P${g.weightP}` : ''}
                      {g.heightP != null ? ` · Estatura P${g.heightP}` : ''}
                      {g.bmiP != null ? ` · IMC P${g.bmiP}` : ''}
                      {g.bmiClass ? ` (${g.bmiClass})` : ''}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
          <Reg label="+ Registar peso e altura">
            <div className="row">
              <input type="date" value={gDate} onChange={(e) => setGDate(e.target.value)} style={{ width: 150 }} />
              <input placeholder="Altura cm" value={gH} onChange={(e) => setGH(e.target.value)} style={{ width: 100 }} />
              <input placeholder="Peso kg" value={gW} onChange={(e) => setGW(e.target.value)} style={{ width: 100 }} />
            </div>
            <button
              className="btn small"
              disabled={busy || !gDate}
              onClick={() =>
                run(
                  () =>
                    Api.addGrowth(child.id, {
                      measuredAt: gDate,
                      heightCm: gH ? Number(gH) : undefined,
                      weightKg: gW ? Number(gW) : undefined,
                    }).then(() => {
                      setGDate('');
                      setGH('');
                      setGW('');
                    }),
                  'Medição adicionada ✓',
                )
              }
            >
              Adicionar medição
            </button>
          </Reg>
          </section>

          {/* Vital signs */}
          <section className="hsec">
          <div className="hsec-head">
            <span className="hsec-ico" aria-hidden>🌡️</span>
            <h3>Sinais do dia</h3>
            <span className="pill muted">{(d.vitals ?? []).length}</span>
          </div>
          {(d.vitals ?? []).length === 0 ? (
            <p className="muted">Sem registos.</p>
          ) : (
            <div className="grid">
              {(d.vitals ?? []).slice(0, 6).map((v) => (
                <div key={v.id} className="card">
                  <strong>{new Date(v.measuredAt).toLocaleDateString('pt-PT')}</strong>
                  <div className="muted">
                    {[
                      v.temperatureC != null ? `${v.temperatureC}ºC` : null,
                      v.heartRateBpm != null ? `${v.heartRateBpm} bpm` : null,
                      v.respRateBpm != null ? `${v.respRateBpm} cpm` : null,
                      v.spo2Pct != null ? `SpO₂ ${v.spo2Pct}%` : null,
                    ]
                      .filter(Boolean)
                      .join(' · ') || '—'}
                  </div>
                </div>
              ))}
            </div>
          )}
          <Reg label="+ Registar sinais do dia">
            <div className="row">
              <input placeholder="Tª ºC" value={vtTemp} onChange={(e) => setVtTemp(e.target.value)} style={{ width: 80 }} />
              <input placeholder="Batimentos (bpm)" value={vtHr} onChange={(e) => setVtHr(e.target.value)} style={{ width: 150 }} />
              <input placeholder="Respiração (por min.)" value={vtRr} onChange={(e) => setVtRr(e.target.value)} style={{ width: 170 }} />
              <input placeholder="Oxigénio (%)" value={vtSpo2} onChange={(e) => setVtSpo2(e.target.value)} style={{ width: 130 }} />
            </div>
            <button
              className="btn small"
              disabled={busy || (!vtTemp && !vtHr && !vtRr && !vtSpo2)}
              onClick={() =>
                run(
                  () =>
                    Api.addVital(child.id, {
                      measuredAt: new Date().toISOString(),
                      temperatureC: vtTemp ? Number(vtTemp) : undefined,
                      heartRateBpm: vtHr ? Number(vtHr) : undefined,
                      respRateBpm: vtRr ? Number(vtRr) : undefined,
                      spo2Pct: vtSpo2 ? Number(vtSpo2) : undefined,
                    }).then(() => {
                      setVtTemp('');
                      setVtHr('');
                      setVtRr('');
                      setVtSpo2('');
                    }),
                  'Sinais vitais registados ✓',
                )
              }
            >
              Registar sinais vitais
            </button>
          </Reg>
          </section>

          {/* Vaccines */}
          <section className="hsec">
          <div className="hsec-head">
            <span className="hsec-ico" aria-hidden>💉</span>
            <h3>Vacinas</h3>
            <span className="pill muted">{d.vaccines.length}</span>
          </div>
          {d.vaccines.length === 0 ? (
            <p className="muted">Sem vacinas registadas.</p>
          ) : (
            d.vaccines.map((v) => (
              <div key={v.id} className="card" style={{ marginBottom: 8 }}>
                <strong>{v.name}</strong>
                <div className="muted">{new Date(v.date).toLocaleDateString('pt-PT')}</div>
              </div>
            ))
          )}
          <Reg label="+ Registar vacina">
            <div className="row">
              <Autocomplete
                placeholder="Vacina (ex.: VASPR)"
                value={vName}
                onText={(s) => {
                  setVName(s);
                  setVCode('');
                }}
                fetcher={async (q) => {
                  const list = await Api.catVaccines();
                  const n = q.toLowerCase();
                  return list.filter(
                    (v) =>
                      v.name.toLowerCase().includes(n) || v.abbr.toLowerCase().includes(n),
                  );
                }}
                onPick={(v) => {
                  setVName(v.name);
                  setVCode(v.abbr);
                }}
                render={(v) => `${v.abbr} — ${v.name}`}
              />
              <input type="date" value={vDate} onChange={(e) => setVDate(e.target.value)} style={{ width: 150 }} />
            </div>
            {vCode ? <div className="muted">PNV: {vCode}</div> : null}
            <button
              className="btn small"
              disabled={busy || !vName || !vDate}
              onClick={() =>
                run(
                  () =>
                    Api.addVaccine(child.id, {
                      name: vName,
                      date: vDate,
                      pnvAbbr: vCode || undefined,
                    }).then(() => {
                      setVName('');
                      setVDate('');
                      setVCode('');
                    }),
                  'Vacina adicionada ✓',
                )
              }
            >
              Adicionar vacina
            </button>
          </Reg>
          </section>

          {/* Allergies */}
          <section className="hsec">
          <div className="hsec-head">
            <span className="hsec-ico" aria-hidden>⚠️</span>
            <h3>Alergias</h3>
            <span className="pill muted">{(d.allergies ?? []).length}</span>
          </div>
          {(d.allergies ?? []).length === 0 ? (
            <p className="muted">Sem alergias registadas.</p>
          ) : (
            <div className="grid">
              {(d.allergies ?? []).map((a) => (
                <div key={a.id} className="card">
                  <strong>{a.label}</strong>
                  {a.category ? <span className="muted"> · {a.category}</span> : null}
                  <div>
                    <button
                      className="btn small secondary"
                      disabled={busy}
                      onClick={() => run(() => Api.removeAllergy(child.id, a.id), 'Removida ✓')}
                    >
                      Remover
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <Reg label="+ Registar alergia">
            <Autocomplete
              placeholder="Alergia (ex.: penicilina, ovo)"
              value={alName}
              onText={(s) => {
                setAlName(s);
                setAlCode('');
                setAlCat('');
              }}
              fetcher={(q) => Api.catAllergens(q)}
              onPick={(a) => {
                setAlName(a.term);
                setAlCode(a.code);
                setAlCat(a.category);
              }}
              render={(a) => `${a.term} (${a.category})`}
              style={{ flex: 'unset' }}
            />
            <button
              className="btn small"
              disabled={busy || !alName}
              onClick={() =>
                run(
                  () =>
                    Api.addAllergy(child.id, {
                      label: alName,
                      code: alCode || undefined,
                      category: alCat || undefined,
                    }).then(() => {
                      setAlName('');
                      setAlCode('');
                      setAlCat('');
                    }),
                  'Alergia adicionada ✓',
                )
              }
            >
              Adicionar alergia
            </button>
          </Reg>
          </section>

          {/* Medications */}
          <section className="hsec">
          <div className="hsec-head">
            <span className="hsec-ico" aria-hidden>💊</span>
            <h3>Medicação</h3>
            <span className="pill muted">{d.medications.length}</span>
          </div>
          {d.medications.length === 0 ? (
            <p className="muted">Sem medicação.</p>
          ) : (
            d.medications.map((m) => (
              <div key={m.id} className="card" style={{ marginBottom: 8 }}>
                <span className={m.active ? 'pill ok' : 'pill muted'}>
                  {m.active ? 'ativa' : 'parada'}
                </span>{' '}
                <strong>{m.name}</strong>
                {m.dose ? <span className="muted"> · {m.dose}</span> : null}
                <div>
                  <button
                    className="btn small secondary"
                    disabled={busy}
                    onClick={() =>
                      run(
                        () => Api.setMedicationActive(child.id, m.id, !m.active),
                        'Atualizado ✓',
                      )
                    }
                  >
                    {m.active ? 'Marcar parada' : 'Reativar'}
                  </button>
                </div>
              </div>
            ))
          )}
          <Reg label="+ Registar medicação">
            <div className="row">
              <Autocomplete
                placeholder="Medicamento (ex.: amox)"
                value={mName}
                onText={(s) => {
                  setMName(s);
                  setMAtc('');
                  setDoseHint('');
                  setDrugWarn('');
                }}
                fetcher={(q) => Api.catMedications(q)}
                onPick={async (m) => {
                  setMName(m.dci);
                  setMAtc(m.atc);
                  setDoseHint('');
                  setDrugWarn('');
                  if (m.dosing && latestWeightKg) {
                    try {
                      const dose = await Api.catDose(m.atc, latestWeightKg);
                      if (dose.found && dose.perDoseMg) {
                        setMDose(`${dose.perDoseMg} mg${dose.everyHours ? ` ${dose.everyHours}/${dose.everyHours}h` : ''}`);
                        setDoseHint(`Sugerido p/ ${latestWeightKg} kg: ${dose.note ?? ''} — rever`);
                      }
                    } catch {
                      /* ignore */
                    }
                  }
                  // Cross-check against the child's recorded allergies.
                  const codes = (d?.allergies ?? []).map((a) => a.code).filter(Boolean) as string[];
                  if (codes.length) {
                    try {
                      const hits = await Api.catDrugAllergy(m.atc, codes);
                      if (hits.length) {
                        setDrugWarn(
                          `⚠️ Alergia registada pode contraindicar este fármaco${hits.some((h) => h.cross) ? ' (reatividade cruzada)' : ''} — confirmar antes de prescrever.`,
                        );
                      }
                    } catch {
                      /* ignore */
                    }
                  }
                }}
                render={(m) => `${m.dci} (${m.atc})`}
              />
              <input placeholder="Dose" value={mDose} onChange={(e) => setMDose(e.target.value)} style={{ width: 120 }} />
            </div>
            {mAtc ? <div className="muted">ATC: {mAtc}</div> : null}
            {doseHint ? <div className="muted" style={{ color: 'var(--warn, #b26a00)' }}>{doseHint}</div> : null}
            {drugWarn ? (
              <div className="card" style={{ borderColor: 'var(--warn, #b26a00)', marginTop: 6 }}>
                <strong>{drugWarn}</strong>
              </div>
            ) : null}
            <button
              className="btn small"
              disabled={busy || !mName}
              onClick={() =>
                run(
                  () =>
                    Api.addMedication(child.id, {
                      name: mName,
                      dose: mDose || undefined,
                      atcCode: mAtc || undefined,
                    }).then(() => {
                      setMName('');
                      setMDose('');
                      setMAtc('');
                      setDoseHint('');
                    }),
                  'Medicação adicionada ✓',
                )
              }
            >
              Adicionar medicação
            </button>
          </Reg>
          </section>

          {/* Episodes */}
          <section className="hsec">
          <div className="hsec-head">
            <span className="hsec-ico" aria-hidden>🤒</span>
            <h3>Problemas de saúde</h3>
            <span className="pill muted">{d.episodes.length}</span>
          </div>
          {d.episodes.length === 0 ? (
            <p className="muted">Sem episódios.</p>
          ) : (
            d.episodes.map((ep) => (
              <div key={ep.id} className="card" style={{ marginBottom: 8 }}>
                <span className={ep.status === 'OPEN' ? 'pill' : 'pill ok'}>
                  {ep.status === 'OPEN' ? 'aberto' : 'fechado'}
                </span>{' '}
                <strong>{ep.title}</strong>
                {ep.summary ? <div className="muted">{ep.summary}</div> : null}
                {ep.status === 'OPEN' ? (
                  <button
                    className="btn small secondary"
                    disabled={busy}
                    onClick={() => run(() => Api.closeEpisode(child.id, ep.id), 'Episódio fechado ✓')}
                  >
                    Fechar
                  </button>
                ) : null}
              </div>
            ))
          )}
          <Reg label="+ Registar problema de saúde">
            <Autocomplete
              placeholder="Diagnóstico / episódio (ex.: otite)"
              value={eTitle}
              onText={(s) => {
                setETitle(s);
                setEIcpc('');
                setEIcd10('');
              }}
              fetcher={(q) => Api.catConditions(q)}
              onPick={(c) => {
                setETitle(c.term);
                setEIcpc(c.icpc2);
                setEIcd10(c.icd10 ?? '');
              }}
              render={(c) => `${c.icpc2} — ${c.term}`}
              style={{ flex: 'unset' }}
            />
            <textarea placeholder="Resumo (opcional)" value={eSummary} onChange={(e) => setESummary(e.target.value)} rows={2} />
            {eIcpc ? <div className="muted">ICPC-2: {eIcpc}{eIcd10 ? ` · ICD-10: ${eIcd10}` : ''}</div> : null}
            <button
              className="btn small"
              disabled={busy || !eTitle}
              onClick={() =>
                run(
                  () =>
                    Api.addEpisode(child.id, {
                      title: eTitle,
                      summary: eSummary || undefined,
                      icpc2Code: eIcpc || undefined,
                      icd10Code: eIcd10 || undefined,
                    }).then(() => {
                      setETitle('');
                      setESummary('');
                      setEIcpc('');
                      setEIcd10('');
                    }),
                  'Episódio criado ✓',
                )
              }
            >
              Criar episódio
            </button>
          </Reg>
          </section>
        </>
      )}
    </div>
  );
}

// ───────────────────────── Child timeline (one chronological record) ─────────────────────────
const TL_ICON: Record<TimelineEvent['kind'], string> = {
  consultation: '🩺',
  vaccine: '💉',
  growth: '📏',
  episode: '🤒',
  medication: '💊',
  allergy: '⚠️',
};

function ChildTimelineView({
  child,
  onBack,
  onMsg,
}: {
  child: ChildDto;
  onBack: () => void;
  onMsg: (m: string) => void;
}) {
  const [data, setData] = useState<ChildTimeline | null>(null);
  const [kind, setKind] = useState<string>('');

  useEffect(() => {
    Api.childTimeline(child.id)
      .then(setData)
      .catch((e) => onMsg(`Erro a carregar: ${String(e)}`));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [child.id]);

  const events = (data?.events ?? []).filter((e) => !kind || e.kind === kind);
  // Group by month for scannability ("julho de 2026").
  const monthOf = (iso: string) =>
    new Date(iso).toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' });
  const groups: { month: string; items: TimelineEvent[] }[] = [];
  for (const ev of events) {
    const m = monthOf(ev.at);
    const last = groups[groups.length - 1];
    if (last && last.month === m) last.items.push(ev);
    else groups.push({ month: m, items: [ev] });
  }

  return (
    <div className="section">
      <button className="btn secondary small" onClick={onBack} style={{ marginBottom: 12 }}>
        ← Voltar
      </button>
      <h2>Linha do tempo · {child.name}</h2>
      <p className="muted" style={{ marginTop: -4, fontSize: 13 }}>
        Tudo o que aconteceu na saúde da criança, por ordem cronológica.
      </p>
      <div className="row" style={{ flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
        {[
          ['', 'Tudo'],
          ['consultation', '🩺 Consultas'],
          ['vaccine', '💉 Vacinas'],
          ['growth', '📏 Crescimento'],
          ['episode', '🤒 Episódios'],
          ['medication', '💊 Medicação'],
          ['allergy', '⚠️ Alergias'],
        ].map(([k, label]) => (
          <button
            key={k}
            className={`btn small ${kind === k ? '' : 'secondary'}`}
            aria-pressed={kind === k}
            onClick={() => setKind(k)}
          >
            {label}
          </button>
        ))}
      </div>
      {!data ? (
        <Skeleton rows={4} />
      ) : events.length === 0 ? (
        <EmptyState
          title="Sem eventos"
          hint="Regista consultas, vacinas ou medições para veres aqui a história da criança."
        />
      ) : (
        <ul className="tl">
          {groups.map((g) => (
            <Fragment key={g.month}>
              <li className="tl-month">{g.month}</li>
              {g.items.map((ev) => (
                <li key={`${ev.kind}-${ev.refId}-${ev.at}`}>
                  <span className="tl-dot" aria-hidden>
                    {TL_ICON[ev.kind]}
                  </span>
                  <strong style={{ display: 'block', fontSize: 14 }}>{ev.title}</strong>
                  <span className="muted" style={{ fontSize: 12 }}>
                    {new Date(ev.at).toLocaleDateString('pt-PT', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                    {ev.detail ? ` · ${ev.detail}` : ''}
                  </span>
                </li>
              ))}
            </Fragment>
          ))}
        </ul>
      )}
    </div>
  );
}

// ───────────────────────── Boletim de saúde (printable → PDF) ─────────────────────────
function BoletimView({
  child,
  d,
  onBack,
}: {
  child: ChildDto;
  d: HealthOverview;
  onBack: () => void;
}) {
  const fmt = (iso: string | null | undefined) =>
    iso ? new Date(iso).toLocaleDateString('pt-PT') : '—';
  const ageLabel = (() => {
    const months = Math.floor(
      (Date.now() - new Date(child.birthDate).getTime()) / (30.44 * 86_400_000),
    );
    return months < 24 ? `${months} meses` : `${Math.floor(months / 12)} anos`;
  })();
  const activeMeds = d.medications.filter((m) => m.active);
  const lastGrowth = d.growth.length ? d.growth[d.growth.length - 1] : null;

  return (
    <div className="section print-report">
      <div className="row no-print" style={{ marginBottom: 12 }}>
        <button className="btn secondary small" onClick={onBack}>
          ← Voltar
        </button>
        <button className="btn small" onClick={() => window.print()}>
          🖨️ Imprimir / Guardar PDF
        </button>
      </div>

      <h2 style={{ marginBottom: 2 }}>Boletim de saúde — {child.name}</h2>
      <p className="muted" style={{ marginTop: 0 }}>
        Nascimento: {fmt(child.birthDate)} · Idade: {ageLabel} · Emitido em{' '}
        {new Date().toLocaleDateString('pt-PT')} · HOC — Healthcare on Call
      </p>

      <h3>Alergias</h3>
      {d.allergies && d.allergies.length ? (
        <table>
          <thead>
            <tr>
              <th>Alergia</th>
              <th>Categoria</th>
            </tr>
          </thead>
          <tbody>
            {d.allergies.map((a) => (
              <tr key={a.id}>
                <td>{a.label ?? '—'}</td>
                <td>{a.category ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="muted">Sem alergias registadas.</p>
      )}

      <h3>Medicação ativa</h3>
      {activeMeds.length ? (
        <table>
          <thead>
            <tr>
              <th>Medicamento</th>
              <th>Dose</th>
              <th>Frequência</th>
              <th>Início</th>
            </tr>
          </thead>
          <tbody>
            {activeMeds.map((m) => (
              <tr key={m.id}>
                <td>{m.name ?? '—'}</td>
                <td>{m.dose ?? '—'}</td>
                <td>{m.frequency ?? '—'}</td>
                <td>{fmt(m.startedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="muted">Sem medicação ativa.</p>
      )}

      <h3>Vacinas</h3>
      {d.vaccines.length ? (
        <table>
          <thead>
            <tr>
              <th>Vacina</th>
              <th>PNV</th>
              <th>Data</th>
            </tr>
          </thead>
          <tbody>
            {d.vaccines.map((v) => (
              <tr key={v.id}>
                <td>{v.name ?? '—'}</td>
                <td>{v.pnvAbbr ?? '—'}</td>
                <td>{fmt(v.date)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="muted">Sem vacinas registadas.</p>
      )}

      <h3>Crescimento</h3>
      {lastGrowth ? (
        <p style={{ margin: '2px 0 6px' }}>
          Última medição ({fmt(lastGrowth.measuredAt)}):{' '}
          {lastGrowth.heightCm ? `${lastGrowth.heightCm} cm` : ''}
          {lastGrowth.heightCm && lastGrowth.weightKg ? ' · ' : ''}
          {lastGrowth.weightKg ? `${lastGrowth.weightKg} kg` : ''}
          {lastGrowth.heightP != null ? ` · estatura P${Math.round(lastGrowth.heightP)}` : ''}
          {lastGrowth.weightP != null ? ` · peso P${Math.round(lastGrowth.weightP)}` : ''}
        </p>
      ) : null}
      {d.growth.length ? (
        <table>
          <thead>
            <tr>
              <th>Data</th>
              <th>Estatura (cm)</th>
              <th>Peso (kg)</th>
              <th>IMC</th>
            </tr>
          </thead>
          <tbody>
            {[...d.growth].reverse().map((g) => (
              <tr key={g.id}>
                <td>{fmt(g.measuredAt)}</td>
                <td>{g.heightCm ?? '—'}</td>
                <td>{g.weightKg ?? '—'}</td>
                <td>{g.bmi ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="muted">Sem medições registadas.</p>
      )}

      <h3>Episódios clínicos</h3>
      {d.episodes.length ? (
        <table>
          <thead>
            <tr>
              <th>Episódio</th>
              <th>Estado</th>
              <th>Início</th>
              <th>Fim</th>
            </tr>
          </thead>
          <tbody>
            {d.episodes.map((e) => (
              <tr key={e.id}>
                <td>{e.title ?? '—'}</td>
                <td>{e.status === 'CLOSED' ? 'Resolvido' : 'Em curso'}</td>
                <td>{fmt(e.createdAt)}</td>
                <td>{fmt(e.closedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="muted">Sem episódios registados.</p>
      )}

      <p className="muted" style={{ fontSize: 11, marginTop: 16 }}>
        Documento informativo gerado pela família na app HOC. Não substitui o Boletim de Saúde
        Infantil e Juvenil oficial nem o registo clínico do médico assistente.
      </p>
    </div>
  );
}

// ───────────────────────── Parent: Consult (message + video) ─────────────────────────
function ConsultTab({
  onMsg,
  onOpenConsultation,
}: {
  onMsg: (m: string) => void;
  onOpenConsultation?: (id: string) => void;
}) {
  const [children, setChildren] = useState<ChildDto[]>([]);
  const [peds, setPeds] = useState<PediatricianCard[]>([]);
  const [favIds, setFavIds] = useState<Set<string>>(new Set());
  const [child, setChild] = useState('');
  const [booking, setBooking] = useState<PediatricianCard | null>(null);
  const [detail, setDetail] = useState<PediatricianCard | null>(null);
  const [triageFor, setTriageFor] = useState<PediatricianCard | null>(null);
  const [triageServiceId, setTriageServiceId] = useState('');
  const [busy, setBusy] = useState(false);
  // filters — specialty is a tap-to-filter chip set (parents don't know
  // specialty names, so we show the ones that actually exist, translated).
  const [fSpec, setFSpec] = useState('');
  const [allSpecs, setAllSpecs] = useState<string[]>([]);
  const [fMaxEuro, setFMaxEuro] = useState('');
  const [onlyFav, setOnlyFav] = useState(false);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  async function load(specOverride?: string, maxEuroOverride?: string) {
    const spec = specOverride ?? fSpec;
    const maxEuro = maxEuroOverride ?? fMaxEuro;
    try {
      const [c, p, favs] = await Promise.all([
        Api.children(),
        Api.pediatricians({
          specialty: spec || undefined,
          maxPriceCents: maxEuro ? Math.round(Number(maxEuro) * 100) : undefined,
        }) as Promise<PediatricianCard[]>,
        Api.favorites().catch(() => []) as Promise<PediatricianCard[]>,
      ]);
      setChildren(c);
      setPeds(p);
      // Grow the chip set from every listing seen (union), so chips never
      // disappear while a filter is active.
      setAllSpecs((prev) => [...new Set([...prev, ...p.flatMap((x) => x.specialties)])].sort());
      setFavIds(new Set(favs.map((f) => f.id)));
      if (c.length > 0 && !child) setChild(c[0].id);
    } catch (e) {
      onMsg(`Erro a carregar: ${String(e)}`);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function pickSpec(code: string) {
    setFSpec(code);
    void load(code);
  }

  async function toggleFav(p: PediatricianCard) {
    if (busy) return;
    const isFav = favIds.has(p.id);
    const apply = (fav: boolean) =>
      setFavIds((prev) => {
        const n = new Set(prev);
        if (fav) n.add(p.id);
        else n.delete(p.id);
        return n;
      });
    apply(!isFav); // optimistic
    setBusy(true);
    try {
      if (isFav) await Api.removeFavorite(p.id);
      else await Api.addFavorite(p.id);
    } catch (e) {
      apply(isFav); // revert — the server never stored the change
      onMsg(`Erro: ${String(e)}`);
    } finally {
      setBusy(false);
    }
  }

  function startService(p: PediatricianCard, serviceId: string) {
    if (!child) return onMsg('Seleciona uma criança.');
    setDetail(null);
    setTriageServiceId(serviceId);
    setTriageFor(p);
  }
  function startMessage(p: PediatricianCard) {
    const svc = p.services.find((s) => s.type === 'MESSAGE');
    if (!svc) return onMsg('Sem serviço de mensagem.');
    startService(p, svc.id);
  }

  if (triageFor) {
    return (
      <TriageDialog
        childId={child}
        serviceId={triageServiceId}
        onCancel={() => setTriageFor(null)}
        onDone={(consultationId) => {
          setTriageFor(null);
          onMsg('Pergunta enviada! Um pediatra vai responder — já a abrimos para ti.');
          if (consultationId && onOpenConsultation) onOpenConsultation(consultationId);
        }}
        onMsg={onMsg}
      />
    );
  }

  if (booking) {
    return (
      <BookVideo
        ped={booking}
        childId={child}
        onBack={() => setBooking(null)}
        onDone={(consultationId) => {
          setBooking(null);
          onMsg('Videoconsulta marcada ✓');
          if (consultationId && onOpenConsultation) onOpenConsultation(consultationId);
        }}
        onMsg={onMsg}
      />
    );
  }

  if (detail) {
    return (
      <PedDetail
        ped={detail}
        isFav={favIds.has(detail.id)}
        canBook={!!child}
        onBack={() => setDetail(null)}
        onToggleFav={() => toggleFav(detail)}
        onStartService={(sid) => startService(detail, sid)}
        onVideo={() => setBooking(detail)}
        onMsg={onMsg}
      />
    );
  }

  const q = search.trim().toLowerCase();
  // Live as-you-type filter over what a parent would actually type: the
  // doctor's NAME first, then translated specialty, region, language, bio.
  const shown = (onlyFav ? peds.filter((p) => favIds.has(p.id)) : peds).filter(
    (p) =>
      !q ||
      `${p.displayName ?? ''} ${p.specialties.map((s) => specLabel(s)).join(' ')} ${p.region ?? ''} ${p.languages.join(' ')} ${p.bio ?? ''}`
        .toLowerCase()
        .includes(q),
  );

  return (
    <div className="section">
      <h2>Escolher pediatra</h2>
      <input
        className="search"
        placeholder="Pesquisar pediatra por nome…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      {children.length === 0 ? (
        <p className="notice">Adiciona uma criança no separador "Crianças" primeiro.</p>
      ) : (
        <label className="muted" style={{ display: 'block' }}>
          Criança:
          <select value={child} onChange={(e) => setChild(e.target.value)} style={{ marginLeft: 8 }}>
            {children.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      )}

      <div className="card section">
        <span className="muted" style={{ fontSize: 12, fontWeight: 600 }}>Especialidade</span>
        <div className="row" style={{ flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
          <button className={`chip${fSpec === '' ? ' active' : ''}`} onClick={() => pickSpec('')}>
            Todas
          </button>
          {allSpecs.map((s) => (
            <button
              key={s}
              className={`chip${fSpec === s ? ' active' : ''}`}
              aria-pressed={fSpec === s}
              onClick={() => pickSpec(s)}
            >
              {specLabel(s)}
            </button>
          ))}
        </div>
        {fSpec && specDesc(fSpec) ? (
          <p className="muted" style={{ fontSize: 13, margin: '8px 0 0' }}>
            <strong>{specLabel(fSpec)}</strong> — {specDesc(fSpec)}
          </p>
        ) : null}
        <div className="row" style={{ marginTop: 10 }}>
          <input
            placeholder="Preço máx €"
            inputMode="decimal"
            value={fMaxEuro}
            onChange={(e) => setFMaxEuro(e.target.value)}
            onBlur={() => void load()}
            style={{ width: 110 }}
          />
          <label className="muted" style={{ margin: 0 }}>
            <input
              type="checkbox"
              checked={onlyFav}
              onChange={(e) => setOnlyFav(e.target.checked)}
              style={{ width: 'auto', marginRight: 8 }}
            />
            ❤️ Só favoritos
          </label>
        </div>
      </div>

      {loading ? (
        <Skeleton rows={3} />
      ) : shown.length === 0 ? (
        <EmptyState
          title="Sem pediatras"
          hint="Nenhum corresponde aos filtros. Tenta limpar a pesquisa."
        />
      ) : (
        <div className="grid">
          {shown.map((p) => {
            const msgSvc = p.services.find((s) => s.type === 'MESSAGE');
            const vidSvc = p.services.find((s) => s.type === 'VIDEO');
            return (
              <article key={p.id} className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="pill ok">✓ Verificado</span>
                  <button
                    type="button"
                    aria-label={favIds.has(p.id) ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
                    aria-pressed={favIds.has(p.id)}
                    disabled={busy}
                    style={{ cursor: 'pointer', fontSize: 18, background: 'none', border: 'none', padding: 0, width: 44, minHeight: 44 }}
                    onClick={() => toggleFav(p)}
                  >
                    {favIds.has(p.id) ? '❤️' : '🤍'}
                  </button>
                </div>
                <h3 style={{ margin: '6px 0 2px' }}>{p.displayName ?? specLabel(p.specialties[0])}</h3>
                <p className="muted" style={{ margin: 0 }}>
                  {specLabel(p.specialties[0])}
                  {p.region ? ` · 📍 ${p.region}` : ''}
                </p>
                <p className="muted" style={{ margin: '2px 0 0' }}>
                  {p.languages.join(' · ')} · ⭐ {p.ratingAvg.toFixed(1)}
                </p>
                {availabilityLabel(p.availableWeekdays) ? (
                  <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--brand)' }}>
                    📅 Disponível · {availabilityLabel(p.availableWeekdays)}
                  </p>
                ) : null}
                <button
                  className="btn small secondary"
                  onClick={() => setDetail(p)}
                  style={{ marginTop: 6 }}
                >
                  Ver perfil e avaliações
                </button>
                <div className="row" style={{ marginTop: 6 }}>
                  {msgSvc ? (
                    <button className="btn small" onClick={() => startMessage(p)} disabled={busy}>
                      Mensagem · {euro(msgSvc.priceCents)}
                    </button>
                  ) : null}
                  {vidSvc ? (
                    <button
                      className="btn small secondary"
                      onClick={() => setBooking(p)}
                      disabled={busy || !child}
                    >
                      Vídeo · {euro(vidSvc.priceCents)}
                    </button>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PedDetail({
  ped,
  isFav,
  canBook,
  onBack,
  onToggleFav,
  onStartService,
  onVideo,
  onMsg,
}: {
  ped: PediatricianCard;
  isFav: boolean;
  canBook: boolean;
  onBack: () => void;
  onToggleFav: () => void;
  onStartService: (serviceId: string) => void;
  onVideo: () => void;
  onMsg: (m: string) => void;
}) {
  const [reviews, setReviews] = useState<
    { id: string; rating: number; comment: string | null; createdAt: string }[]
  >([]);

  useEffect(() => {
    Api.reviews(ped.id)
      .then((r) => setReviews(r as typeof reviews))
      .catch((e) => onMsg(`Erro: ${String(e)}`));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ped.id]);

  return (
    <div className="section">
      <button className="btn secondary small" onClick={onBack} style={{ marginBottom: 12 }}>
        ← Voltar
      </button>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>{ped.displayName ?? specLabel(ped.specialties[0])}</h2>
        <button
          type="button"
          aria-label={isFav ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
          aria-pressed={isFav}
          style={{ cursor: 'pointer', fontSize: 22, background: 'none', border: 'none', padding: 0, width: 44, minHeight: 44 }}
          onClick={onToggleFav}
        >
          {isFav ? '❤️' : '🤍'}
        </button>
      </div>
      <p className="muted" style={{ marginBottom: 2 }}>{specLabel(ped.specialties[0])}</p>
      {specDesc(ped.specialties[0]) ? (
        <p className="muted" style={{ fontSize: 13, margin: '0 0 4px' }}>
          {specDesc(ped.specialties[0])}
        </p>
      ) : null}
      <p className="muted">
        {ped.region ? `📍 ${ped.region} · ` : ''}⭐ {ped.ratingAvg.toFixed(1)} ·{' '}
        {ped.experienceYears ?? 0} anos · {ped.languages.join(' · ')}
      </p>
      {availabilityLabel(ped.availableWeekdays) ? (
        <p style={{ margin: '0 0 4px', fontSize: 13, color: 'var(--brand)' }}>
          📅 Disponível · {availabilityLabel(ped.availableWeekdays)}
        </p>
      ) : null}
      {ped.bio ? <p>{ped.bio}</p> : null}

      <h3 style={{ marginTop: 14 }}>Serviços</h3>
      <div className="row">
        {ped.services.map((s) =>
          s.type === 'VIDEO' ? (
            <button
              key={s.id}
              className="btn small secondary"
              onClick={onVideo}
              disabled={!canBook}
            >
              Vídeo · {euro(s.priceCents)}
            </button>
          ) : (
            <button key={s.id} className="btn small" onClick={() => onStartService(s.id)}>
              {svcFullLabel(s.type)} · {euro(s.priceCents)}
            </button>
          ),
        )}
      </div>

      <h3 style={{ marginTop: 18 }}>Avaliações</h3>
      {reviews.length === 0 ? (
        <p className="muted">Ainda sem avaliações.</p>
      ) : (
        reviews.map((r) => (
          <div key={r.id} className="card" style={{ marginBottom: 8 }}>
            <div>{'⭐'.repeat(r.rating)}</div>
            {r.comment ? <div>{r.comment}</div> : null}
            <div className="muted" style={{ fontSize: 12 }}>
              {new Date(r.createdAt).toLocaleDateString('pt-PT')}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

const RED_FLAGS = [
  { key: 'breathing', label: 'Dificuldade a respirar / respiração muito rápida', severe: true },
  { key: 'unresponsive', label: 'Prostração / difícil de acordar', severe: true },
  { key: 'seizure', label: 'Convulsões', severe: true },
  { key: 'bluish', label: 'Lábios ou pele azulados', severe: true },
  { key: 'highfever', label: 'Febre alta há mais de 3 dias', severe: false },
  { key: 'dehydration', label: 'Não bebe / sem urinar há muitas horas', severe: false },
];

function TriageDialog({
  childId,
  serviceId,
  onCancel,
  onDone,
  onMsg,
}: {
  childId: string;
  serviceId: string;
  onCancel: () => void;
  onDone: (consultationId?: string) => void;
  onMsg: (m: string) => void;
}) {
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  const [question, setQuestion] = useState('');
  const [episodes, setEpisodes] = useState<{ id: string; title: string | null; status: string }[]>(
    [],
  );
  const [episodeId, setEpisodeId] = useState('');
  const [ack, setAck] = useState(false);
  const [busy, setBusy] = useState(false);
  const severe = RED_FLAGS.some((f) => f.severe && flags[f.key]);

  useEffect(() => {
    Api.childHealth(childId)
      .then((d) => setEpisodes(d.episodes.filter((e) => e.status === 'OPEN')))
      .catch(() => {});
  }, [childId]);

  async function submit() {
    if (!serviceId) return onMsg('Sem serviço de mensagem.');
    if (severe && !ack) return onMsg('Confirma o aviso de urgência para continuar.');
    setBusy(true);
    try {
      const created = (await Api.startConsultation({
        childId,
        serviceId,
        question: question || 'Olá, tenho uma dúvida sobre o meu filho.',
        triage: { redFlags: Object.keys(flags).filter((k) => flags[k]), severe },
        episodeId: episodeId || undefined,
      })) as { id?: string };
      onDone(created?.id);
    } catch (e) {
      onMsg(`Erro: ${String(e)}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="section">
      <button className="btn secondary small" onClick={onCancel} style={{ marginBottom: 12 }}>
        ← Voltar
      </button>
      <h2>Como está o teu filho agora?</h2>
      <p className="muted">Assinala o que se aplica — ajuda o pediatra a avaliar a urgência:</p>
      <div className="card">
        {RED_FLAGS.map((f) => (
          <label key={f.key} style={{ display: 'block', margin: '6px 0' }}>
            <input
              type="checkbox"
              checked={!!flags[f.key]}
              onChange={(e) => setFlags((p) => ({ ...p, [f.key]: e.target.checked }))}
              style={{ width: 'auto', marginRight: 8 }}
            />
            {f.label}
          </label>
        ))}
      </div>

      {severe ? (
        <div
          className="card"
          style={{ borderColor: '#f0b8be', background: '#fde4e7', color: '#3d0f14', marginTop: 12 }}
        >
          <strong style={{ color: '#d7263d' }}>⚠️ Sinais de alarme</strong>
          <p style={{ margin: '6px 0' }}>
            Estes sintomas podem ser urgentes. Liga <strong>112</strong> ou recorre à urgência. A
            teleconsulta <em>não substitui</em> emergência.
          </p>
          <label className="muted">
            <input
              type="checkbox"
              checked={ack}
              onChange={(e) => setAck(e.target.checked)}
              style={{ width: 'auto', marginRight: 8 }}
            />
            Compreendi; quero ainda assim contactar o pediatra.
          </label>
        </div>
      ) : null}

      <div className="card section">
        <h3>A tua questão</h3>
        <textarea
          placeholder="Descreve a dúvida…"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          rows={3}
        />
        {episodes.length > 0 ? (
          <label className="muted" style={{ display: 'block', marginTop: 8 }}>
            Associar a episódio:
            <select
              value={episodeId}
              onChange={(e) => setEpisodeId(e.target.value)}
              style={{ marginLeft: 8 }}
            >
              <option value="">— nenhum —</option>
              {episodes.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.title ?? 'Episódio'}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>

      <button className="btn" onClick={submit} disabled={busy}>
        Enviar pergunta ao pediatra
      </button>
    </div>
  );
}

function BookVideo({
  ped,
  childId,
  onBack,
  onDone,
  onMsg,
}: {
  ped: PediatricianCard;
  childId: string;
  onBack: () => void;
  onDone: (consultationId?: string) => void;
  onMsg: (m: string) => void;
}) {
  const [days, setDays] = useState<{ date: string; slots: string[] }[]>([]);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  // Two safe taps: pick a slot → review the summary (who/when/price + consent)
  // → confirm. A stray tap never books.
  const [pendingSlot, setPendingSlot] = useState<string | null>(null);
  const vidSvc = ped.services.find((s) => s.type === 'VIDEO');

  // Load the next available days up front, so the parent picks a time directly
  // instead of guessing dates (minimum effort → higher adherence).
  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const next = await Api.nextSlots(ped.id, 14);
        if (live) setDays(next);
      } catch (e) {
        if (live) onMsg(`Erro a procurar horários: ${String(e)}`);
      } finally {
        if (live) setLoading(false);
      }
    })();
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ped.id]);

  async function confirmBooking() {
    if (!vidSvc || !pendingSlot || busy) return;
    if (!consent) return onMsg('Para marcar, confirma o consentimento no resumo.');
    setBusy(true);
    try {
      const res = (await Api.book({
        childId,
        serviceId: vidSvc.id,
        scheduledAt: pendingSlot,
        teleconsultConsent: true,
      })) as { consultationId?: string };
      onDone(res?.consultationId);
    } catch (e) {
      onMsg(`Erro a marcar: ${String(e)}`);
      setPendingSlot(null);
    } finally {
      setBusy(false);
    }
  }

  if (pendingSlot) {
    const when = new Date(pendingSlot);
    return (
      <div className="section">
        <button
          className="btn secondary small"
          onClick={() => setPendingSlot(null)}
          style={{ marginBottom: 12 }}
        >
          ← Escolher outro horário
        </button>
        <h2>Confirmar marcação</h2>
        <div className="card accent" style={{ marginTop: 10 }}>
          <strong style={{ fontSize: 17, display: 'block' }}>
            {ped.displayName ?? specLabel(ped.specialties[0])}
          </strong>
          <span className="muted">{specLabel(ped.specialties[0])}</span>
          <p style={{ margin: '10px 0 4px', textTransform: 'capitalize' }}>
            📅{' '}
            {when.toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long' })} ·{' '}
            {when.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}
          </p>
          {vidSvc ? (
            <p style={{ margin: '0 0 6px', fontSize: 18, fontWeight: 700 }}>{euro(vidSvc.priceCents)}</p>
          ) : null}
          <label className="muted" style={{ display: 'block', margin: '8px 0', fontSize: 13 }}>
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              style={{ width: 'auto', marginRight: 8 }}
            />
            Aceito a videoconsulta e o tratamento dos dados de saúde da criança.
          </label>
          <button className="btn" disabled={busy || !consent} onClick={() => void confirmBooking()}>
            {vidSvc ? `Confirmar marcação · ${euro(vidSvc.priceCents)}` : 'Confirmar marcação'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="section">
      <button className="btn secondary small" onClick={onBack} style={{ marginBottom: 12 }}>
        ← Voltar
      </button>
      <h2>Marcar videoconsulta</h2>
      <p className="muted" style={{ marginBottom: 2 }}>
        {ped.displayName ?? specLabel(ped.specialties[0])}
      </p>
      <p className="muted">
        {specLabel(ped.specialties[0])} · {vidSvc ? euro(vidSvc.priceCents) : ''}
      </p>
      <h3 style={{ marginTop: 14 }}>Próximos horários disponíveis</h3>
      <p className="muted" style={{ fontSize: 13, marginTop: 2 }}>
        Escolhe um horário — confirmas os detalhes no passo seguinte.
      </p>
      {loading ? (
        <Skeleton rows={2} />
      ) : days.length === 0 ? (
        <p className="muted" style={{ fontSize: 13, marginTop: 10 }}>
          Sem horários nos próximos dias. Este pediatra ainda não tem agenda aberta.
        </p>
      ) : (
        days.map((d) => (
          <div key={d.date} style={{ marginTop: 10 }}>
            <strong style={{ fontSize: 14, textTransform: 'capitalize' }}>
              {new Date(`${d.date}T00:00:00`).toLocaleDateString('pt-PT', {
                weekday: 'long',
                day: '2-digit',
                month: 'long',
              })}
            </strong>
            <div className="row" style={{ marginTop: 6, flexWrap: 'wrap' }}>
              {d.slots.slice(0, 12).map((s) => (
                <button
                  key={s}
                  className="btn small secondary"
                  onClick={() => setPendingSlot(s)}
                  disabled={busy}
                >
                  {new Date(s).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}
                </button>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

// ───────────────────────── Parent: My consultations ─────────────────────────
function MyConsultsTab({
  onMsg,
  focusId,
  onFocusConsumed,
}: {
  onMsg: (m: string) => void;
  focusId?: string | null;
  onFocusConsumed?: () => void;
}) {
  const [rows, setRows] = useState<ConsultationDto[]>([]);
  const [open, setOpen] = useState<ConsultationDto | null>(null);
  const [reviewing, setReviewing] = useState<ConsultationDto | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const list = await Api.myConsultations();
      setRows(list);
      // Deep link from Início/Avisos/just-created: open that thread directly.
      if (focusId) {
        const target = list.find((c) => c.id === focusId);
        if (target) setOpen(target);
        onFocusConsumed?.();
      }
    } catch (e) {
      onMsg(`Erro a carregar: ${String(e)}`);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (open)
    return (
      <Thread
        consultation={open}
        canClose={false}
        canCancel
        onChanged={() => {
          setOpen(null);
          void load();
        }}
        onBack={() => setOpen(null)}
        onMsg={onMsg}
      />
    );
  if (reviewing)
    return (
      <ReviewForm
        consultation={reviewing}
        onBack={() => setReviewing(null)}
        onDone={() => {
          setReviewing(null);
          onMsg('Avaliação enviada ✓ obrigado!');
        }}
        onMsg={onMsg}
      />
    );

  return (
    <div className="section">
      <h2>As minhas consultas</h2>
      {loading ? (
        <Skeleton rows={2} />
      ) : rows.length === 0 ? (
        <EmptyState title="Ainda sem consultas" hint="Inicia uma no separador Consultar." />
      ) : (
        (() => {
          const card = (c: ConsultationDto) => (
            <div key={c.id} className="card">
              <span className={statusPill(c.status)}>{statusLabel(c.status)}</span>
              {c.type === 'VIDEO' ? (
                <span className="pill" style={{ marginLeft: 6 }}>🎥 Vídeo</span>
              ) : null}
              <div style={{ marginTop: 4 }}>
                <strong>{c.pediatrician?.displayName ?? specLabel(c.pediatrician?.specialties?.[0])}</strong>
                {c.child?.name ? ` · ${c.child.name}` : ''}
              </div>
              <div className="muted">
                {svcLabel(c.type)} · {euro(c.priceCents)}
              </div>
              {c.type === 'VIDEO' && c.scheduledAt ? (
                <div style={{ color: 'var(--brand)', fontSize: 13 }}>📅 {when(c.scheduledAt)}</div>
              ) : (
                <div className="muted">{when(c.openedAt)}</div>
              )}
              <div className="row" style={{ marginTop: 8 }}>
                <button className="btn small" onClick={() => setOpen(c)}>
                  Abrir
                </button>
                {c.status === 'CLOSED' ? (
                  <button className="btn small secondary" onClick={() => setReviewing(c)}>
                    ⭐ Avaliar
                  </button>
                ) : null}
              </div>
            </div>
          );
          // Short lists stay flat; longer ones get month/year group headers.
          if (rows.length <= 6) return <div className="grid">{rows.map(card)}</div>;
          return groupByPeriod(rows, (c) => c.openedAt).map((g) => (
            <Fragment key={g.label}>
              <h3 style={{ margin: '16px 0 4px', textTransform: 'capitalize' }}>{g.label}</h3>
              <div className="grid">{g.items.map(card)}</div>
            </Fragment>
          ));
        })()
      )}
    </div>
  );
}

function ReviewForm({
  consultation,
  onBack,
  onDone,
  onMsg,
}: {
  consultation: ConsultationDto;
  onBack: () => void;
  onDone: () => void;
  onMsg: (m: string) => void;
}) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    try {
      await Api.addReview({ consultationId: consultation.id, rating, comment: comment || undefined });
      onDone();
    } catch (e) {
      onMsg(`Erro a avaliar: ${String(e)}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="section">
      <button className="btn secondary small" onClick={onBack} style={{ marginBottom: 12 }}>
        ← Voltar
      </button>
      <h2>Avaliar consulta</h2>
      <div className="row" role="radiogroup" aria-label="Classificação" style={{ fontSize: 28 }}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={n === rating}
            aria-label={`${n} ${n === 1 ? 'estrela' : 'estrelas'}`}
            style={{ cursor: 'pointer', background: 'none', border: 'none', padding: 0, width: 44, minHeight: 44, fontSize: 28 }}
            onClick={() => setRating(n)}
          >
            {n <= rating ? '⭐' : '☆'}
          </button>
        ))}
      </div>
      <textarea
        placeholder="Comentário (opcional)"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={3}
      />
      <button className="btn" onClick={submit} disabled={busy}>
        Enviar avaliação
      </button>
    </div>
  );
}

// ──────────────── Pediatrician: doctor-to-doctor 2nd opinion ────────────────
type Colleague = { id: string; displayName?: string | null; bio?: string | null; specialties?: string[] };

/**
 * Inline "request a second opinion" action, shown inside a consultation thread
 * so the request is anchored to the patient/consultation in context.
 */
function ReferralRequest({ consultationId, onMsg }: { consultationId: string; onMsg: (m: string) => void }) {
  const [open, setOpen] = useState(false);
  const [colleagues, setColleagues] = useState<Colleague[]>([]);
  const [toId, setToId] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function start() {
    setOpen(true);
    if (colleagues.length) return;
    try {
      const [peds, me] = await Promise.all([Api.pediatricians(), Api.me()]);
      setColleagues((peds as Colleague[]).filter((p) => p.id !== me.id));
    } catch (e) {
      onMsg(`Erro a carregar colegas: ${String(e)}`);
    }
  }
  async function send() {
    if (!toId || reason.trim().length < 3) return onMsg('Escolhe o colega e descreve o contexto.');
    setBusy(true);
    try {
      await Api.createReferral({ consultationId, toPediatricianId: toId, reason: reason.trim() });
      onMsg('Pedido de 2ª opinião enviado ✓ — acompanha em “2ª opinião”.');
      setDone(true);
      setOpen(false);
    } catch (e) {
      onMsg(`Erro a enviar: ${String(e)}`);
    } finally {
      setBusy(false);
    }
  }

  if (done)
    return (
      <p className="muted" style={{ fontSize: 13, marginTop: 8 }}>
        ✓ 2ª opinião pedida sobre este doente — acompanha em “2ª opinião”.
      </p>
    );
  if (!open)
    return (
      <button className="btn secondary small" onClick={() => void start()} style={{ marginTop: 8 }}>
        🤝 Pedir 2ª opinião sobre este doente
      </button>
    );
  return (
    <div className="card section">
      <strong>Pedir 2ª opinião a um colega</strong>
      <p className="muted" style={{ fontSize: 12, margin: '2px 0 6px' }}>
        Sobre esta consulta. O contexto clínico é cifrado e enviado ao colega.
      </p>
      <label className="muted">Colega</label>
      <select className="search" value={toId} onChange={(e) => setToId(e.target.value)}>
        <option value="">Escolhe um pediatra…</option>
        {colleagues.map((p) => (
          <option key={p.id} value={p.id}>
            {p.displayName ?? specLabel(p.specialties?.[0])}
            {p.specialties && p.specialties.length ? ` · ${specLabel(p.specialties[0])}` : ''}
          </option>
        ))}
      </select>
      <label className="muted">Contexto clínico (cifrado)</label>
      <textarea
        className="search"
        rows={4}
        placeholder="Descreve o caso e a questão para o colega…"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
      />
      <div className="row" style={{ marginTop: 6 }}>
        <button className="btn small" onClick={() => void send()} disabled={busy}>
          Enviar pedido
        </button>
        <button className="btn secondary small" onClick={() => setOpen(false)}>
          Cancelar
        </button>
      </div>
    </div>
  );
}

function refStatusLabel(s: ReferralDto['status']): string {
  return (
    { PENDING: 'Pendente', ACCEPTED: 'Aceite', DECLINED: 'Recusada', COMPLETED: 'Concluída' } as Record<
      string,
      string
    >
  )[s] ?? s;
}

function ReferralsTab({ onMsg }: { onMsg: (m: string) => void }) {
  const [view, setView] = useState<'incoming' | 'outgoing' | 'new'>('incoming');
  const [incoming, setIncoming] = useState<ReferralDto[]>([]);
  const [outgoing, setOutgoing] = useState<ReferralDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false); // guards all mutations against double-taps
  const [opinions, setOpinions] = useState<Record<string, string>>({});

  // "New referral" form state
  const [myConsults, setMyConsults] = useState<ConsultationDto[]>([]);
  const [colleagues, setColleagues] = useState<Colleague[]>([]);
  const [consultId, setConsultId] = useState('');
  const [toId, setToId] = useState('');
  const [reason, setReason] = useState('');

  async function load() {
    try {
      const [inc, out] = await Promise.all([Api.referralsIncoming(), Api.referralsOutgoing()]);
      setIncoming(inc);
      setOutgoing(out);
    } catch (e) {
      onMsg(`Erro a carregar: ${String(e)}`);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function openNew() {
    setView('new');
    try {
      const [cons, peds, me] = await Promise.all([Api.inbox(), Api.pediatricians(), Api.me()]);
      setMyConsults(cons);
      // Exclude myself from the colleague list (can't refer to oneself).
      setColleagues((peds as Colleague[]).filter((p) => p.id !== me.id));
    } catch (e) {
      onMsg(`Erro a carregar dados: ${String(e)}`);
    }
  }

  async function send() {
    if (busy) return;
    if (!consultId || !toId || reason.trim().length < 3) {
      onMsg('Escolhe a consulta, o colega e descreve o contexto.');
      return;
    }
    setBusy(true);
    try {
      await Api.createReferral({ consultationId: consultId, toPediatricianId: toId, reason: reason.trim() });
      onMsg('Pedido de 2ª opinião enviado.');
      setReason('');
      setConsultId('');
      setToId('');
      setView('outgoing');
      await load();
    } catch (e) {
      onMsg(`Erro a enviar: ${String(e)}`);
    } finally {
      setBusy(false);
    }
  }

  async function respond(id: string, accept: boolean) {
    if (busy) return;
    setBusy(true);
    try {
      if (accept) await Api.acceptReferral(id);
      else await Api.declineReferral(id);
      await load();
    } catch (e) {
      onMsg(`Erro: ${String(e)}`);
    } finally {
      setBusy(false);
    }
  }

  async function submitOpinion(id: string) {
    if (busy) return;
    const text = (opinions[id] ?? '').trim();
    if (text.length < 3) {
      onMsg('Escreve a tua opinião.');
      return;
    }
    setBusy(true);
    try {
      await Api.submitReferralOpinion(id, text);
      onMsg('Opinião enviada ao colega.');
      await load();
    } catch (e) {
      onMsg(`Erro a enviar: ${String(e)}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="section">
      <h2>Segunda opinião</h2>
      <p className="muted" style={{ marginTop: -4, fontSize: 13 }}>
        Consulta entre médicos: pede o parecer de um colega sobre um caso teu, ou responde a quem te
        pede. O contexto clínico é cifrado e o pedido parte sempre de uma das tuas consultas (do
        doente) — em <strong>Pedir</strong>, escolhe a consulta e o colega.
      </p>
      <div className="seg" role="tablist">
        <button className={view === 'incoming' ? 'active' : ''} onClick={() => setView('incoming')}>
          Recebidos{incoming.length ? ` (${incoming.length})` : ''}
        </button>
        <button className={view === 'outgoing' ? 'active' : ''} onClick={() => setView('outgoing')}>
          Enviados{outgoing.length ? ` (${outgoing.length})` : ''}
        </button>
        <button className={view === 'new' ? 'active' : ''} onClick={() => void openNew()}>
          Pedir
        </button>
      </div>

      {loading ? <Skeleton rows={2} /> : null}

      {!loading && view === 'incoming' ? (
        incoming.length === 0 ? (
          <EmptyState title="Sem pedidos" hint="Quando um colega te pedir uma opinião aparece aqui." />
        ) : (
          <div className="grid">
            {incoming.map((r) => (
              <div key={r.id} className="card">
                <span className={statusPill(r.status === 'COMPLETED' ? 'CLOSED' : 'OPEN')}>
                  {refStatusLabel(r.status)}
                </span>
                <p style={{ whiteSpace: 'pre-wrap' }}>{r.reason}</p>
                {r.status === 'PENDING' ? (
                  <div className="row">
                    <button className="btn" disabled={busy} onClick={() => void respond(r.id, true)}>
                      Aceitar
                    </button>
                    <button className="btn secondary" disabled={busy} onClick={() => void respond(r.id, false)}>
                      Recusar
                    </button>
                  </div>
                ) : null}
                {r.status === 'ACCEPTED' ? (
                  <div>
                    <textarea
                      className="search"
                      rows={4}
                      placeholder="A tua opinião clínica…"
                      value={opinions[r.id] ?? ''}
                      onChange={(e) => setOpinions((o) => ({ ...o, [r.id]: e.target.value }))}
                    />
                    <button className="btn" disabled={busy} onClick={() => void submitOpinion(r.id)}>
                      Enviar opinião
                    </button>
                  </div>
                ) : null}
                {r.status === 'COMPLETED' && r.opinion ? (
                  <div className="notice" style={{ whiteSpace: 'pre-wrap' }}>
                    <strong>A tua opinião:</strong> {r.opinion}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )
      ) : null}

      {!loading && view === 'outgoing' ? (
        outgoing.length === 0 ? (
          <EmptyState title="Nada enviado" hint="Pede uma 2ª opinião a um colega no separador “Pedir”." />
        ) : (
          <div className="grid">
            {outgoing.map((r) => (
              <div key={r.id} className="card">
                <span className={statusPill(r.status === 'COMPLETED' ? 'CLOSED' : 'OPEN')}>
                  {refStatusLabel(r.status)}
                </span>
                <p style={{ whiteSpace: 'pre-wrap' }} className="muted">
                  {r.reason}
                </p>
                {r.opinion ? (
                  <div className="notice" style={{ whiteSpace: 'pre-wrap' }}>
                    <strong>Opinião do colega:</strong> {r.opinion}
                  </div>
                ) : (
                  <div className="muted">A aguardar resposta…</div>
                )}
              </div>
            ))}
          </div>
        )
      ) : null}

      {view === 'new' ? (
        <div className="card">
          <label className="muted">Doente / consulta</label>
          <select className="search" value={consultId} onChange={(e) => setConsultId(e.target.value)}>
            <option value="">Escolhe o doente / consulta…</option>
            {myConsults.map((c) => (
              <option key={c.id} value={c.id}>
                {c.child?.name ? `${c.child.name} · ` : ''}
                {svcLabel(c.type)} · {statusLabel(c.status)}
              </option>
            ))}
          </select>
          <label className="muted">Colega</label>
          <select className="search" value={toId} onChange={(e) => setToId(e.target.value)}>
            <option value="">Escolhe um pediatra…</option>
            {colleagues.map((p) => (
              <option key={p.id} value={p.id}>
                {p.displayName ?? specLabel(p.specialties?.[0])}
                {p.specialties && p.specialties.length ? ` · ${specLabel(p.specialties[0])}` : ''}
              </option>
            ))}
          </select>
          <label className="muted">Contexto clínico (cifrado)</label>
          <textarea
            className="search"
            rows={5}
            placeholder="Descreve o caso e a questão para o colega…"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <button className="btn" disabled={busy} onClick={() => void send()}>
            Enviar pedido
          </button>
        </div>
      ) : null}
    </div>
  );
}

// ───────────────────────── Pediatrician: Inbox ─────────────────────────
function InboxTab({
  onMsg,
  focusId,
  onFocusConsumed,
}: {
  onMsg: (m: string) => void;
  focusId?: string | null;
  onFocusConsumed?: () => void;
}) {
  const [rows, setRows] = useState<ConsultationDto[]>([]);
  const [recent, setRecent] = useState<ConsultationDto[]>([]);
  const [view, setView] = useState<'todo' | 'recent'>('todo');
  const [open, setOpen] = useState<ConsultationDto | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const [list, hist] = await Promise.all([
        Api.inbox(),
        Api.pedHistory().catch(() => [] as ConsultationDto[]),
      ]);
      setRows(list);
      setRecent(hist);
      if (focusId) {
        const target = list.find((c) => c.id === focusId) ?? hist.find((c) => c.id === focusId);
        if (target) setOpen(target);
        onFocusConsumed?.();
      }
    } catch (e) {
      onMsg(`Erro a carregar: ${String(e)}`);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (open) {
    const live = ['OPEN', 'TRIAGE', 'ANSWERED'].includes(open.status);
    return (
      <Thread
        consultation={open}
        canClose={live}
        canCancel={false}
        onChanged={() => {
          setOpen(null);
          void load();
        }}
        onBack={() => setOpen(null)}
        onMsg={onMsg}
      />
    );
  }

  // Priority order: alarm signs from triage first, then nearest SLA. Today's
  // scheduled video consultations get their own section so the day is scannable.
  const isSevere = (c: ConsultationDto) => Boolean((c.triage as { severe?: unknown } | null)?.severe);
  const byUrgency = (a: ConsultationDto, b: ConsultationDto) => {
    if (isSevere(a) !== isSevere(b)) return isSevere(a) ? -1 : 1;
    return new Date(a.slaDueAt ?? '2999-01-01').getTime() - new Date(b.slaDueAt ?? '2999-01-01').getTime();
  };
  const today = new Date().toDateString();
  const videosToday = rows
    .filter((c) => c.type === 'VIDEO' && c.scheduledAt && new Date(c.scheduledAt).toDateString() === today)
    .sort((a, b) => new Date(a.scheduledAt!).getTime() - new Date(b.scheduledAt!).getTime());
  const toAnswer = rows.filter((c) => !videosToday.includes(c)).sort(byUrgency);

  const consultCard = (c: ConsultationDto) => (
    <button
      key={c.id}
      className={`card${isSevere(c) ? ' accent' : ''}`}
      onClick={() => setOpen(c)}
      style={{ textAlign: 'left', cursor: 'pointer' }}
    >
      {isSevere(c) ? (
        <span className="pill" style={{ background: 'var(--danger-bg)', color: 'var(--danger)', marginRight: 6 }}>
          ⚠️ Sinais de alarme
        </span>
      ) : null}
      <span className={statusPill(c.status)}>{statusLabel(c.status)}</span>
      {c.type === 'VIDEO' ? (
        <span className="pill" style={{ marginLeft: 6 }}>🎥 Vídeo</span>
      ) : null}
      <div style={{ marginTop: 4 }}>
        <strong>{c.child?.name ?? 'Doente'}</strong>
        {c.child?.birthDate ? <span className="muted"> · {ageLabel(c.child.birthDate)}</span> : null} ·{' '}
        {euro(c.priceCents)}
      </div>
      {c.type === 'VIDEO' && c.scheduledAt ? (
        <div style={{ color: 'var(--brand)', fontSize: 13 }}>
          📅{' '}
          {new Date(c.scheduledAt).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}
          {' · '}
          {new Date(c.scheduledAt).toLocaleDateString('pt-PT', { day: 'numeric', month: 'short' })}
        </div>
      ) : c.slaDueAt ? (
        <div className="muted">
          Responder até{' '}
          {new Date(c.slaDueAt).toLocaleString('pt-PT', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </div>
      ) : null}
    </button>
  );

  return (
    <div className="section">
      <h2>Caixa de entrada</h2>
      <div className="seg" role="tablist" style={{ margin: '8px 0' }}>
        <button className={view === 'todo' ? 'active' : ''} onClick={() => setView('todo')}>
          A responder{rows.length ? ` (${rows.length})` : ''}
        </button>
        <button className={view === 'recent' ? 'active' : ''} onClick={() => setView('recent')}>
          Recentes
        </button>
      </div>
      {loading ? (
        <Skeleton rows={2} />
      ) : view === 'recent' ? (
        recent.length === 0 ? (
          <EmptyState title="Sem consultas anteriores" hint="O histórico aparece aqui." />
        ) : recent.length <= 6 ? (
          <div className="grid">{recent.map(consultCard)}</div>
        ) : (
          groupByPeriod(recent, (c) => c.openedAt).map((g) => (
            <Fragment key={g.label}>
              <h3 style={{ margin: '16px 0 4px', textTransform: 'capitalize' }}>{g.label}</h3>
              <div className="grid">{g.items.map(consultCard)}</div>
            </Fragment>
          ))
        )
      ) : rows.length === 0 ? (
        <EmptyState
          title="Tudo em dia"
          hint="Assim que uma família enviar uma questão ou marcar uma consulta, aparece aqui."
        />
      ) : (
        <>
          {videosToday.length ? (
            <>
              <h3 style={{ marginTop: 8 }}>Videoconsultas de hoje</h3>
              <div className="grid">{videosToday.map(consultCard)}</div>
            </>
          ) : null}
          {toAnswer.length ? (
            <>
              <h3 style={{ marginTop: videosToday.length ? 16 : 8 }}>A responder</h3>
              <div className="grid">{toAnswer.map(consultCard)}</div>
            </>
          ) : null}
        </>
      )}
    </div>
  );
}

// ───────────────────────── Pediatrician: Patient chart ─────────────────────────
function ageLabel(birthDate: string): string {
  const b = new Date(birthDate);
  const now = new Date();
  let months = (now.getFullYear() - b.getFullYear()) * 12 + (now.getMonth() - b.getMonth());
  if (now.getDate() < b.getDate()) months -= 1;
  if (months < 0) months = 0;
  const y = Math.floor(months / 12);
  const m = months % 12;
  if (y === 0) return `${m} ${m === 1 ? 'mês' : 'meses'}`;
  return m === 0 ? `${y} ${y === 1 ? 'ano' : 'anos'}` : `${y}a ${m}m`;
}
function ageMonths(birthDate: string): number {
  const b = new Date(birthDate);
  const now = new Date();
  let months = (now.getFullYear() - b.getFullYear()) * 12 + (now.getMonth() - b.getMonth());
  if (now.getDate() < b.getDate()) months -= 1;
  return Math.max(0, months);
}

/** Longitudinal chart for one child: consultation timeline + health record. */
function ChildChart({
  childId,
  childName,
  birthDate,
  onBack,
  onMsg,
}: {
  childId: string;
  childName: string;
  birthDate: string;
  onBack: () => void;
  onMsg: (m: string) => void;
}) {
  const [history, setHistory] = useState<ChildHistory | null>(null);
  const [health, setHealth] = useState<HealthOverview | null>(null);
  const [dueVax, setDueVax] = useState<{ abbr: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const [h, hc, due] = await Promise.all([
          Api.childHistory(childId),
          Api.childHealth(childId).catch(() => null),
          Api.catVaccines(ageMonths(birthDate)).catch(() => []),
        ]);
        if (!live) return;
        setHistory(h);
        setHealth(hc);
        setDueVax(due.map((v) => ({ abbr: v.abbr, name: v.name })));
      } catch (e) {
        onMsg(`Erro a carregar o doente: ${String(e)}`);
      } finally {
        if (live) setLoading(false);
      }
    })();
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [childId]);

  const growthPts = (health?.growth ?? [])
    .filter((g) => g.weightKg != null)
    .map((g) => ({ x: new Date(g.measuredAt).getTime(), y: g.weightKg as number }));
  const activeMeds = (health?.medications ?? []).filter((m) => m.active);
  const openProblems = (health?.episodes ?? []).filter((e) => e.status !== 'CLOSED');
  // Vaccines whose scheduled age has passed but that aren't recorded by PNV code.
  const recordedPnv = new Set(
    (health?.vaccines ?? []).map((v) => v.pnvAbbr).filter(Boolean) as string[],
  );
  const seenAbbr = new Set<string>();
  const overdueVax = dueVax.filter((v) => {
    if (recordedPnv.has(v.abbr) || seenAbbr.has(v.abbr)) return false;
    seenAbbr.add(v.abbr);
    return true;
  });

  return (
    <div className="section">
      <button className="link" onClick={onBack}>
        ← Doentes
      </button>
      <h2 style={{ marginTop: 8 }}>
        {childName} <span className="muted">· {ageLabel(birthDate)}</span>
      </h2>

      {loading ? (
        <Skeleton rows={3} />
      ) : (
        <>
          {overdueVax.length > 0 ? (
            <div className="card" style={{ borderColor: 'var(--warn, #b26a00)' }}>
              <strong>⚠️ Vacinas possivelmente em atraso</strong>
              <div className="muted" style={{ marginTop: 4 }}>
                Para a idade ({ageLabel(birthDate)}), sem registo destas vacinas do PNV — confirmar
                com o boletim:
              </div>
              <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>
                {overdueVax.map((v) => (
                  <li key={v.abbr}>
                    {v.name} <span className="pill">{v.abbr}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {health ? <GrowthAlert growth={health.growth} /> : null}
          <div className="card">
            <strong>Problemas ativos</strong>
            {openProblems.length === 0 ? (
              <div className="muted">Sem problemas em aberto.</div>
            ) : (
              <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>
                {openProblems.map((e) => (
                  <li key={e.id}>
                    {e.title ?? '—'}{' '}
                    {e.icpc2Code ? <span className="pill">{e.icpc2Code}</span> : null}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="card">
            <strong>Medicação ativa</strong>
            {activeMeds.length === 0 ? (
              <div className="muted">Nenhuma.</div>
            ) : (
              <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>
                {activeMeds.map((m) => (
                  <li key={m.id}>
                    {m.name ?? '—'}
                    {m.dose ? ` · ${m.dose}` : ''}
                    {m.frequency ? ` · ${m.frequency}` : ''}
                    {m.atcCode ? <span className="pill" style={{ marginLeft: 6 }}>{m.atcCode}</span> : null}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {growthPts.length >= 2 ? (
            <div className="card">
              <strong>Peso (kg)</strong>
              <GrowthChart points={growthPts} label="Peso" unit="kg" />
            </div>
          ) : null}

          <div className="card">
            <strong>Vacinas registadas</strong>
            {(health?.vaccines ?? []).length === 0 ? (
              <div className="muted">Nenhuma.</div>
            ) : (
              <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>
                {(health?.vaccines ?? []).map((v) => (
                  <li key={v.id}>
                    {v.name ?? '—'} · {when(v.date)}
                    {v.pnvAbbr ? <span className="pill" style={{ marginLeft: 6 }}>{v.pnvAbbr}</span> : null}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <h3 style={{ marginTop: 16 }}>Histórico de consultas</h3>
          {(history?.consultations ?? []).length === 0 ? (
            <EmptyState title="Sem consultas registadas" />
          ) : (
            <div className="grid">
              {(history?.consultations ?? []).map((c) => (
                <div key={c.id} className="card">
                  <span className={statusPill(c.status)}>{statusLabel(c.status)}</span>
                  <div>
                    <strong>{svcLabel(c.type)}</strong> · {euro(c.priceCents)}
                  </div>
                  <div className="muted">Aberta: {when(c.openedAt)}</div>
                  {c.closedAt ? <div className="muted">Fechada: {when(c.closedAt)}</div> : null}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function PatientsTab({ onMsg }: { onMsg: (m: string) => void }) {
  const [families, setFamilies] = useState<PatientFamily[]>([]);
  const [loading, setLoading] = useState(true);
  const [picked, setPicked] = useState<{ id: string; name: string; birthDate: string } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setFamilies(await Api.patients());
      } catch (e) {
        onMsg(`Erro a carregar doentes: ${String(e)}`);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (picked)
    return (
      <ChildChart
        childId={picked.id}
        childName={picked.name}
        birthDate={picked.birthDate}
        onBack={() => setPicked(null)}
        onMsg={onMsg}
      />
    );

  return (
    <div className="section">
      <h2>Os meus doentes</h2>
      <p className="muted">Agrupados por família — irmãos juntos. Toca numa criança para o registo.</p>
      {loading ? (
        <Skeleton rows={2} />
      ) : families.length === 0 ? (
        <EmptyState title="Ainda sem doentes" hint="Aparecem aqui as crianças que já consultaste." />
      ) : (
        families.map((fam) => (
          <div key={fam.id} className="card" style={{ marginBottom: 12 }}>
            <strong>{fam.name}</strong>
            {fam.guardians && fam.guardians.length > 0 ? (
              <div className="muted" style={{ fontSize: 13, marginTop: 2 }}>
                {fam.guardians.map((g) => `${guardianLabel(g.relationship)} ${g.name}`).join(' · ')}
              </div>
            ) : null}
            <div className="grid" style={{ marginTop: 8 }}>
              {fam.children.map((c) => (
                <button
                  key={c.id}
                  className="card"
                  style={{ textAlign: 'left', cursor: 'pointer' }}
                  onClick={() => setPicked({ id: c.id, name: c.name, birthDate: c.birthDate })}
                >
                  <strong>{c.name}</strong> <span className="muted">· {ageLabel(c.birthDate)}</span>
                  <div className="muted">
                    {c.consultationCount} consulta{c.consultationCount === 1 ? '' : 's'} · última{' '}
                    {when(c.lastConsultAt)}
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

// ───────────────────────── Pediatrician: Agenda ─────────────────────────
function AgendaTab({ onMsg }: { onMsg: (m: string) => void }) {
  const [rows, setRows] = useState<AvailabilityDto[]>([]);
  const [weekday, setWeekday] = useState(1);
  const [start, setStart] = useState('09:00');
  const [end, setEnd] = useState('13:00');
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      setRows(await Api.availability());
    } catch (e) {
      onMsg(`Erro a carregar: ${String(e)}`);
    }
  }
  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function add() {
    setBusy(true);
    try {
      await Api.addAvailability({
        weekday,
        startMinute: toMin(start),
        endMinute: toMin(end),
        slotMinutes: 20,
      });
      onMsg('Disponibilidade adicionada ✓');
      await load();
    } catch (e) {
      onMsg(`Erro: ${String(e)}`);
    } finally {
      setBusy(false);
    }
  }
  async function del(id: string) {
    setBusy(true);
    try {
      await Api.deleteAvailability(id);
      await load();
    } catch (e) {
      onMsg(`Erro: ${String(e)}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="section">
      <h2>Disponibilidade (vídeo)</h2>
      {rows.length === 0 ? (
        <p className="muted">Sem blocos definidos. Os pais só veem horários nos dias que definires.</p>
      ) : (
        <div className="grid">
          {rows.map((a) => (
            <div key={a.id} className="card">
              <strong>{WEEKDAYS[a.weekday]}</strong>
              <div className="muted">
                {hhmm(a.startMinute)}–{hhmm(a.endMinute)} · slots {a.slotMinutes} min
              </div>
              <button className="btn danger small" onClick={() => del(a.id)} disabled={busy}>
                Remover
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="card section">
        <h3>Adicionar bloco</h3>
        <label className="muted">
          Dia:
          <select
            value={weekday}
            onChange={(e) => setWeekday(Number(e.target.value))}
            style={{ marginLeft: 8 }}
          >
            {WEEKDAYS.map((d, i) => (
              <option key={i} value={i}>
                {d}
              </option>
            ))}
          </select>
        </label>
        <div className="row" style={{ marginTop: 8 }}>
          <label className="muted">
            Início <input type="time" value={start} onChange={(e) => setStart(e.target.value)} />
          </label>
          <label className="muted">
            Fim <input type="time" value={end} onChange={(e) => setEnd(e.target.value)} />
          </label>
        </div>
        <button className="btn" onClick={add} disabled={busy}>
          Adicionar
        </button>
      </div>
    </div>
  );
}

// ───────────────────────── Pediatrician: Profile + services ─────────────────────────
function PedProfileTab({ onMsg, onLeave }: { onMsg: (m: string) => void; onLeave: () => void }) {
  const [me, setMe] = useState<PedMeDto | null>(null);
  const [bio, setBio] = useState('');
  const [busy, setBusy] = useState(false);
  const [stype, setStype] = useState('MESSAGE');
  const [sprice, setSprice] = useState('18');
  const [ssla, setSsla] = useState('4');

  async function load() {
    try {
      const m = await Api.me();
      setMe(m);
      setBio(m.bio ?? '');
    } catch (e) {
      onMsg(`Erro a carregar perfil: ${String(e)}`);
    }
  }
  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function saveBio() {
    setBusy(true);
    try {
      await Api.updateMe({ bio });
      onMsg('Perfil atualizado ✓');
      await load();
    } catch (e) {
      onMsg(`Erro: ${String(e)}`);
    } finally {
      setBusy(false);
    }
  }
  async function addService() {
    setBusy(true);
    try {
      await Api.addService({
        type: stype,
        priceCents: Math.round(Number(sprice) * 100),
        slaHours: Number(ssla),
      });
      onMsg('Serviço adicionado ✓');
      await load();
    } catch (e) {
      onMsg(`Erro: ${String(e)}`);
    } finally {
      setBusy(false);
    }
  }
  async function delService(id: string) {
    setBusy(true);
    try {
      await Api.deleteService(id);
      await load();
    } catch (e) {
      onMsg(`Erro: ${String(e)}`);
    } finally {
      setBusy(false);
    }
  }

  if (!me) return <p className="muted section">A carregar…</p>;

  return (
    <div className="section">
      <h2>O meu perfil</h2>
      <div className="card">
        {me.displayName ? <strong>{me.displayName}</strong> : null}
        <div style={{ marginTop: me.displayName ? 4 : 0 }}>
          <span className="pill ok">{me.status}</span> · ⭐ {me.ratingAvg.toFixed(1)} ·{' '}
          {me.experienceYears ?? 0} anos
        </div>
        <div className="muted">
          {specLabel(me.specialties?.[0])} · {me.languages.join(' · ')}
        </div>
      </div>
      <div className="card section">
        <h3>Bio</h3>
        <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} />
        <button className="btn" onClick={saveBio} disabled={busy}>
          Guardar
        </button>
      </div>

      <h3 style={{ marginTop: 20 }}>Serviços</h3>
      <div className="grid">
        {me.services.map((s: ServiceDto) => (
          <div key={s.id} className="card">
            <strong>{svcLabel(s.type)}</strong> · {euro(s.priceCents)}
            <div className="muted">SLA {s.slaHours}h{s.active === false ? ' · inativo' : ''}</div>
            <button className="btn danger small" onClick={() => delService(s.id)} disabled={busy}>
              Remover
            </button>
          </div>
        ))}
      </div>
      <div className="card section">
        <h3>Adicionar serviço</h3>
        <label className="muted">
          Tipo:
          <select value={stype} onChange={(e) => setStype(e.target.value)} style={{ marginLeft: 8 }}>
            <option value="MESSAGE">Mensagem</option>
            <option value="VIDEO">Vídeo</option>
            <option value="SECOND_OPINION">Segunda opinião</option>
            <option value="FOLLOW_UP">Seguimento</option>
          </select>
        </label>
        <div className="row" style={{ marginTop: 8 }}>
          <label className="muted">
            Preço €
            <input
              type="number"
              value={sprice}
              onChange={(e) => setSprice(e.target.value)}
              style={{ width: 90 }}
            />
          </label>
          <label className="muted">
            SLA (h)
            <input
              type="number"
              value={ssla}
              onChange={(e) => setSsla(e.target.value)}
              style={{ width: 80 }}
            />
          </label>
        </div>
        <button className="btn" onClick={addService} disabled={busy}>
          Adicionar serviço
        </button>
      </div>

      <DocumentsSection onMsg={onMsg} />

      <ContentAuthor onMsg={onMsg} />

      <h3 style={{ marginTop: 20 }}>Subscrição</h3>
      <SubscriptionSection onMsg={onMsg} />
      <InvoicesSection onMsg={onMsg} />
      <PrivacySection onMsg={onMsg} onLeave={onLeave} />
    </div>
  );
}

// ───────────────────────── Credential documents (pediatrician) ─────────────────────────
const DOC_KINDS: { value: string; label: string }[] = [
  { value: 'cedula', label: 'Cédula profissional' },
  { value: 'diploma', label: 'Diploma / especialidade' },
  { value: 'id_document', label: 'Documento de identificação' },
  { value: 'insurance', label: 'Seguro de responsabilidade' },
  { value: 'other', label: 'Outro' },
];

function docStatusPill(s: string): string {
  if (s === 'approved') return 'pill ok';
  if (s === 'rejected') return 'pill warn';
  return 'pill muted';
}
function docStatusLabel(s: string): string {
  return ({ approved: 'Aprovado', rejected: 'Recusado', pending: 'Em análise' } as Record<string, string>)[s] ?? s;
}

function DocumentsSection({ onMsg }: { onMsg: (m: string) => void }) {
  const [docs, setDocs] = useState<VerificationDoc[]>([]);
  const [kind, setKind] = useState('cedula');
  const [fileName, setFileName] = useState('');
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      setDocs(await Api.myDocuments());
    } catch (e) {
      onMsg(`Erro a carregar documentos: ${String(e)}`);
    }
  }
  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submit() {
    if (fileName.trim().length < 2) {
      onMsg('Indica o nome do ficheiro.');
      return;
    }
    setBusy(true);
    try {
      await Api.submitDocument({ kind, fileName: fileName.trim() });
      onMsg('Documento submetido para verificação ✓');
      setFileName('');
      await load();
    } catch (e) {
      onMsg(`Erro: ${String(e)}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card section">
      <h3>Documentos de verificação</h3>
      <p className="muted">
        Submete a cédula profissional e outros comprovativos. A equipa de compliance analisa e
        aprova. (O upload do ficheiro em si fica disponível quando o armazenamento seguro estiver
        ativo.)
      </p>
      {docs.length > 0 ? (
        <div className="grid" style={{ marginBottom: 12 }}>
          {docs.map((d) => (
            <div key={d.id} className="card">
              <span className={docStatusPill(d.status)}>{docStatusLabel(d.status)}</span>
              <div>
                <strong>{DOC_KINDS.find((k) => k.value === d.kind)?.label ?? d.kind}</strong>
              </div>
              <div className="muted">{d.fileName}</div>
              {d.note ? <div className="muted">Nota: {d.note}</div> : null}
            </div>
          ))}
        </div>
      ) : (
        <p className="muted">Ainda não submeteste documentos.</p>
      )}
      <label className="muted">
        Tipo
        <select value={kind} onChange={(e) => setKind(e.target.value)} style={{ marginLeft: 8 }}>
          {DOC_KINDS.map((k) => (
            <option key={k.value} value={k.value}>
              {k.label}
            </option>
          ))}
        </select>
      </label>
      <input
        className="search"
        placeholder="Nome do ficheiro (ex.: cedula-12345.pdf)"
        value={fileName}
        onChange={(e) => setFileName(e.target.value)}
        style={{ marginTop: 8 }}
      />
      <button className="btn" onClick={submit} disabled={busy} style={{ marginTop: 8 }}>
        Submeter documento
      </button>
    </div>
  );
}

// ───────────────────────── Subscriptions (parent + pediatrician) ─────────────────────────
function SubscriptionSection({ onMsg }: { onMsg: (m: string) => void }) {
  const [sub, setSub] = useState<MySubscription | null>(null);
  const [plans, setPlans] = useState<PlanDto[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      const [s, p] = await Promise.all([Api.mySubscription(), Api.subPlans()]);
      setSub(s);
      setPlans(p);
    } catch (e) {
      onMsg(`Erro: ${String(e)}`);
    } finally {
      setLoaded(true);
    }
  }
  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function subscribe(plan: string) {
    setBusy(true);
    try {
      await Api.subscribe(plan);
      onMsg('Subscrição ativada ✓');
      await load();
    } catch (e) {
      onMsg(`Erro: ${String(e)}`);
    } finally {
      setBusy(false);
    }
  }
  async function cancel() {
    setBusy(true);
    try {
      await Api.cancelSubscription();
      onMsg('Subscrição cancelada.');
      await load();
    } catch (e) {
      onMsg(`Erro: ${String(e)}`);
    } finally {
      setBusy(false);
    }
  }

  if (!loaded) return <p className="muted">A carregar…</p>;

  if (sub) {
    return (
      <div className="card">
        <span className="pill ok">Ativo</span>
        <h3 style={{ margin: '6px 0' }}>{sub.catalog.name}</h3>
        <div className="muted">{euro(sub.priceCents)} / mês</div>
        <ul>
          {sub.catalog.perks.map((p) => (
            <li key={p} className="muted">
              {p}
            </li>
          ))}
        </ul>
        <button className="btn danger small" onClick={cancel} disabled={busy}>
          Cancelar plano
        </button>
      </div>
    );
  }

  return (
    <div className="grid">
      {plans.map((p) => (
        <div key={p.plan} className="card">
          <h3 style={{ margin: '0 0 4px' }}>{p.name}</h3>
          <div className="muted">{euro(p.priceCents)} / mês</div>
          <ul>
            {p.perks.map((perk) => (
              <li key={perk} className="muted">
                {perk}
              </li>
            ))}
          </ul>
          <button className="btn small" onClick={() => subscribe(p.plan)} disabled={busy}>
            Subscrever
          </button>
        </div>
      ))}
      <p className="muted" style={{ fontSize: 13 }}>
        Sem Stripe configurado, a subscrição ativa-se em modo demonstração (sem cobrança real).
      </p>
    </div>
  );
}

// ───────────────────────── Invoices (parent + pediatrician) ─────────────────────────
function InvoicesSection({ onMsg }: { onMsg: (m: string) => void }) {
  const [d, setD] = useState<InvoicesDto | null>(null);
  useEffect(() => {
    Api.invoices()
      .then(setD)
      .catch((e) => onMsg(`Erro: ${String(e)}`));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  if (!d) return null;
  const all = [
    ...d.medical.map((i) => ({ ...i, kind: 'Ato médico' })),
    ...d.commission.map((i) => ({ ...i, kind: 'Comissão' })),
  ];
  return (
    <div className="section">
      <h3>Faturas</h3>
      {all.length === 0 ? (
        <p className="muted">Sem faturas. (São emitidas quando uma consulta é paga e fechada.)</p>
      ) : (
        all.map((i) => (
          <div key={i.id} className="card" style={{ marginBottom: 8 }}>
            <strong>{euro(i.amountCents)}</strong> <span className="muted">· {i.kind}</span>
            <div className="muted" style={{ fontSize: 12 }}>
              IVA {euro(i.vatCents)} ({i.vatRegime}) · {i.atcud ?? 'ATCUD pendente'} ·{' '}
              {new Date(i.issuedAt).toLocaleDateString('pt-PT')}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

// ───────────────────────── Privacy / GDPR (all roles) ─────────────────────────
const CONSENT_PT: Record<string, string> = {
  HEALTH_DATA: 'Dados de saúde',
  TELECONSULT: 'Teleconsulta',
  TERMS: 'Termos',
  PRIVACY: 'Privacidade',
  MARKETING: 'Marketing',
};
function PrivacySection({ onMsg, onLeave }: { onMsg: (m: string) => void; onLeave: () => void }) {
  const [consents, setConsents] = useState<ConsentRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);

  async function load() {
    try {
      setConsents(await Api.consents());
    } catch (e) {
      onMsg(`Erro: ${String(e)}`);
    }
  }
  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function revoke(id: string) {
    setBusy(true);
    try {
      await Api.revokeConsent(id);
      onMsg('Consentimento revogado.');
      await load();
    } catch (e) {
      onMsg(`Erro: ${String(e)}`);
    } finally {
      setBusy(false);
    }
  }

  async function exportData() {
    setBusy(true);
    try {
      const data = await Api.exportData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'pedia-dados.json';
      a.click();
      URL.revokeObjectURL(url);
      onMsg('Exportação concluída ✓ (ficheiro descarregado).');
    } catch (e) {
      onMsg(`Erro: ${String(e)}`);
    } finally {
      setBusy(false);
    }
  }

  async function del() {
    setBusy(true);
    try {
      await Api.deleteAccount();
      onMsg('Conta anonimizada. Sessão terminada.');
      onLeave();
    } catch (e) {
      onMsg(`Erro: ${String(e)}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="section">
      <h3>Privacidade (RGPD)</h3>
      <div className="card">
        <strong>Consentimentos</strong>
        {consents.length === 0 ? (
          <p className="muted">Sem consentimentos registados.</p>
        ) : (
          consents.map((c) => (
            <div key={c.id} className="row" style={{ justifyContent: 'space-between', marginTop: 6 }}>
              <span>
                {CONSENT_PT[c.subject] ?? c.subject}{' '}
                <span className={c.revokedAt ? 'pill muted' : 'pill ok'}>
                  {c.revokedAt ? 'revogado' : 'ativo'}
                </span>
              </span>
              {!c.revokedAt ? (
                <button className="btn small secondary" onClick={() => revoke(c.id)} disabled={busy}>
                  Revogar
                </button>
              ) : null}
            </div>
          ))
        )}
      </div>

      <div className="card section">
        <strong>Os teus dados</strong>
        <p className="muted" style={{ fontSize: 13 }}>
          Direito de acesso e portabilidade — descarrega uma cópia em JSON.
        </p>
        <button className="btn small" onClick={exportData} disabled={busy}>
          Exportar os meus dados
        </button>
      </div>

      <div className="card section" style={{ borderColor: '#f0b8be' }}>
        <strong style={{ color: '#d7263d' }}>Apagar conta</strong>
        <p className="muted" style={{ fontSize: 13 }}>
          Direito ao esquecimento — anonimiza a conta (registos legais/contabilísticos são
          retidos pelo prazo obrigatório).
        </p>
        {!confirmDel ? (
          <button className="btn small danger" onClick={() => setConfirmDel(true)}>
            Apagar a minha conta
          </button>
        ) : (
          <div className="row">
            <button className="btn small danger" onClick={del} disabled={busy}>
              Confirmar apagar
            </button>
            <button className="btn small secondary" onClick={() => setConfirmDel(false)}>
              Cancelar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ───────────────────────── Pediatrician: Finance ─────────────────────────
function FinanceTab({ onMsg }: { onMsg: (m: string) => void }) {
  const [f, setF] = useState<FinanceDto | null>(null);
  useEffect(() => {
    Api.finance()
      .then(setF)
      .catch((e) => onMsg(`Erro: ${String(e)}`));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  if (!f) return <p className="muted section">A carregar…</p>;
  return (
    <div className="section">
      <h2>Ganhos</h2>
      <div className="grid">
        <div className="card">
          <div className="muted">Líquido recebido</div>
          <strong style={{ fontSize: 22 }}>{euro(f.netCents)}</strong>
        </div>
        <div className="card">
          <div className="muted">Comissão plataforma</div>
          <strong style={{ fontSize: 22 }}>{euro(f.commissionCents)}</strong>
        </div>
        <div className="card">
          <div className="muted">Consultas liquidadas</div>
          <strong style={{ fontSize: 22 }}>{f.consultationsSettled}</strong>
        </div>
      </div>
      <p className="muted" style={{ fontSize: 13 }}>
        Os valores ficam a zero até existir <code>STRIPE_SECRET_KEY</code> e a consulta ser fechada
        com pagamento.
      </p>
    </div>
  );
}

// ───────────────────────── Admin / Finance ─────────────────────────
function AdminTab({ onMsg }: { onMsg: (m: string) => void }) {
  const [rows, setRows] = useState<ConsultationDto[]>([]);
  const [open, setOpen] = useState<ConsultationDto | null>(null);
  const [busy, setBusy] = useState('');

  async function load() {
    try {
      setRows(await Api.allConsultations());
    } catch (e) {
      onMsg(`Erro a carregar: ${String(e)}`);
    }
  }
  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function refund(id: string) {
    setBusy(id);
    try {
      await Api.refund(id);
      onMsg('Reembolso registado ✓');
      await load();
    } catch (e) {
      onMsg(`Erro: ${String(e)}`);
    } finally {
      setBusy('');
    }
  }

  if (open)
    return (
      <Thread
        consultation={open}
        canClose={false}
        canCancel={false}
        onChanged={() => setOpen(null)}
        onBack={() => setOpen(null)}
        onMsg={onMsg}
      />
    );

  return (
    <div className="section">
      <h2>Consultas (plataforma)</h2>
      {rows.length === 0 ? (
        <p className="muted">Sem consultas.</p>
      ) : (
        <div className="grid">
          {rows.map((c) => (
            <div key={c.id} className="card">
              <span className={statusPill(c.status)}>{statusLabel(c.status)}</span>
              <div>
                <strong>{svcLabel(c.type)}</strong> · {euro(c.priceCents)}
              </div>
              <div className="muted">{when(c.openedAt)}</div>
              <div className="row" style={{ marginTop: 8 }}>
                <button className="btn small secondary" onClick={() => setOpen(c)}>
                  Ver
                </button>
                <button
                  className="btn small danger"
                  onClick={() => refund(c.id)}
                  disabled={busy === c.id || c.status === 'REFUNDED'}
                >
                  {c.status === 'REFUNDED' ? 'Reembolsada' : 'Reembolsar'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ───────────────────────── Notifications (all roles) ─────────────────────────
function NotifTab({
  onMsg,
  onOpenConsultation,
  onGoConsults,
}: {
  onMsg: (m: string) => void;
  onOpenConsultation?: (id: string) => void;
  onGoConsults?: () => void;
}) {
  const [rows, setRows] = useState<NotificationDto[]>([]);

  /**
   * Every notification is actionable: with a refId it opens that exact
   * consultation; without one (older rows, generic types) it still jumps to
   * the consultations list — tapping never dead-ends on "mark as read".
   * Opening marks it read implicitly.
   */
  function openTarget(n: NotificationDto) {
    if (!n.read) void Api.markRead(n.id).catch(() => {});
    if (n.refId && onOpenConsultation) onOpenConsultation(n.refId);
    else if (onGoConsults) onGoConsults();
  }

  async function load() {
    try {
      setRows(await Api.notifications());
    } catch (e) {
      onMsg(`Erro a carregar: ${String(e)}`);
    }
  }
  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="section">
      <h2>Avisos</h2>
      {rows.length === 0 ? (
        <p className="muted">Sem avisos. As notificações aparecem ao criar/fechar consultas.</p>
      ) : (
        rows.map((n) => (
          <button
            key={n.id}
            className="card"
            onClick={() => openTarget(n)}
            style={{
              marginBottom: 8,
              opacity: n.read ? 0.6 : 1,
              display: 'block',
              width: '100%',
              textAlign: 'left',
              cursor: 'pointer',
            }}
          >
            <strong>{n.title}</strong>
            {!n.read ? <span className="pill" style={{ marginLeft: 6 }}>novo</span> : null}
            <div className="muted">{n.body}</div>
            <div className="muted" style={{ fontSize: 12 }}>
              {when(n.createdAt)} · {n.refId ? 'toca para abrir a consulta' : 'toca para ver as consultas'}
            </div>
          </button>
        ))
      )}
    </div>
  );
}

// ───────────────────────── Admin: Overview (metrics) ─────────────────────────
function OverviewTab({ onMsg }: { onMsg: (m: string) => void }) {
  const [m, setM] = useState<AdminMetrics | null>(null);
  useEffect(() => {
    Api.adminMetrics()
      .then(setM)
      .catch((e) => onMsg(`Erro: ${String(e)}`));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  if (!m) return <p className="muted section">A carregar…</p>;
  const totalUsers = Object.values(m.usersByRole).reduce((a, b) => a + b, 0);
  return (
    <div className="section">
      <h2>Visão da plataforma</h2>
      <div className="grid">
        <div className="card">
          <div className="muted">Utilizadores</div>
          <strong style={{ fontSize: 22 }}>{totalUsers}</strong>
        </div>
        <div className="card">
          <div className="muted">Famílias · Crianças</div>
          <strong style={{ fontSize: 22 }}>
            {m.families} · {m.children}
          </strong>
        </div>
        <div className="card">
          <div className="muted">Receita bruta</div>
          <strong style={{ fontSize: 22 }}>{euro(m.grossCents)}</strong>
        </div>
        <div className="card">
          <div className="muted">Comissão · Reembolsos</div>
          <strong style={{ fontSize: 22 }}>
            {euro(m.commissionCents)} · {m.refunds}
          </strong>
        </div>
      </div>
      <div className="card section">
        <h3>Utilizadores por perfil</h3>
        {Object.entries(m.usersByRole).map(([k, v]) => (
          <div key={k} className="row" style={{ justifyContent: 'space-between' }}>
            <span className="muted">{roleLabel(k)}</span>
            <strong>{v}</strong>
          </div>
        ))}
      </div>
      <div className="card section">
        <h3>Consultas por estado</h3>
        {Object.entries(m.consultationsByStatus).map(([k, v]) => (
          <div key={k} className="row" style={{ justifyContent: 'space-between' }}>
            <span className="muted">{statusLabel(k)}</span>
            <strong>{v}</strong>
          </div>
        ))}
        {Object.keys(m.consultationsByStatus).length === 0 ? (
          <p className="muted">Sem consultas ainda.</p>
        ) : null}
      </div>
      <div className="card section">
        <h3>Pediatras por estado</h3>
        {Object.entries(m.pediatriciansByStatus).map(([k, v]) => (
          <div key={k} className="row" style={{ justifyContent: 'space-between' }}>
            <span className="muted">{pedStatus(k).label}</span>
            <strong>{v}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

// ───────────────────────── Admin: Verify pediatricians ─────────────────────────
function VerifyTab({ onMsg }: { onMsg: (m: string) => void }) {
  const [rows, setRows] = useState<AdminPedRow[]>([]);
  const [busy, setBusy] = useState('');
  const [openDocs, setOpenDocs] = useState('');

  async function load() {
    try {
      setRows(await Api.adminPediatricians());
    } catch (e) {
      onMsg(`Erro: ${String(e)}`);
    }
  }
  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function act(id: string, kind: 'verify' | 'suspend') {
    setBusy(id);
    try {
      if (kind === 'verify') await Api.verifyPediatrician(id);
      else await Api.suspendPediatrician(id);
      onMsg(kind === 'verify' ? 'Pediatra verificado ✓' : 'Pediatra suspenso.');
      await load();
    } catch (e) {
      onMsg(`Erro: ${String(e)}`);
    } finally {
      setBusy('');
    }
  }

  return (
    <div className="section">
      <h2>Verificação de pediatras</h2>
      {rows.length === 0 ? (
        <p className="muted">Sem pediatras.</p>
      ) : (
        <div className="grid">
          {rows.map((p) => (
            <div key={p.id} className="card">
              <span className={p.status === 'ACTIVE' ? 'pill ok' : 'pill warn'}>{p.status}</span>
              <div>
                <strong>{p.displayName ?? p.user?.email ?? p.specialties[0] ?? 'Pediatra'}</strong>
                {p.displayName && p.user?.email ? (
                  <span className="muted"> · {p.user.email}</span>
                ) : null}
              </div>
              <div className="muted">
                Licença {p.licenseNumber} · ⭐ {p.ratingAvg.toFixed(1)}
              </div>
              <div className="row" style={{ marginTop: 8 }}>
                {p.status !== 'ACTIVE' ? (
                  <button className="btn small" onClick={() => act(p.id, 'verify')} disabled={busy === p.id}>
                    Verificar
                  </button>
                ) : null}
                {p.status !== 'SUSPENDED' ? (
                  <button
                    className="btn small danger"
                    onClick={() => act(p.id, 'suspend')}
                    disabled={busy === p.id}
                  >
                    Suspender
                  </button>
                ) : null}
                <button
                  className="btn small secondary"
                  onClick={() => setOpenDocs(openDocs === p.id ? '' : p.id)}
                >
                  {openDocs === p.id ? 'Fechar documentos' : 'Documentos'}
                </button>
              </div>
              {openDocs === p.id ? <PedDocsReview pediatricianId={p.id} onMsg={onMsg} /> : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Compliance reviews a pediatrician's credential documents inline.
function PedDocsReview({
  pediatricianId,
  onMsg,
}: {
  pediatricianId: string;
  onMsg: (m: string) => void;
}) {
  const [docs, setDocs] = useState<VerificationDoc[]>([]);
  const [busy, setBusy] = useState('');

  async function load() {
    try {
      setDocs(await Api.adminDocuments(pediatricianId));
    } catch (e) {
      onMsg(`Erro a carregar documentos: ${String(e)}`);
    }
  }
  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pediatricianId]);

  async function review(id: string, status: 'approved' | 'rejected') {
    setBusy(id);
    try {
      await Api.reviewDocument(id, status);
      onMsg(status === 'approved' ? 'Documento aprovado ✓' : 'Documento recusado.');
      await load();
    } catch (e) {
      onMsg(`Erro: ${String(e)}`);
    } finally {
      setBusy('');
    }
  }

  return (
    <div style={{ marginTop: 10, borderTop: '1px solid var(--border)', paddingTop: 10 }}>
      {docs.length === 0 ? (
        <p className="muted">Sem documentos submetidos.</p>
      ) : (
        docs.map((d) => (
          <div key={d.id} style={{ marginBottom: 8 }}>
            <span className={docStatusPill(d.status)}>{docStatusLabel(d.status)}</span>{' '}
            <strong>{DOC_KINDS.find((k) => k.value === d.kind)?.label ?? d.kind}</strong>
            <div className="muted">{d.fileName}</div>
            {d.status === 'pending' ? (
              <div className="row" style={{ marginTop: 4 }}>
                <button className="btn small" onClick={() => review(d.id, 'approved')} disabled={busy === d.id}>
                  Aprovar
                </button>
                <button
                  className="btn small danger"
                  onClick={() => review(d.id, 'rejected')}
                  disabled={busy === d.id}
                >
                  Recusar
                </button>
              </div>
            ) : null}
          </div>
        ))
      )}
    </div>
  );
}

// ───────────────────────── Admin: Users ─────────────────────────
const ALL_ROLES = [
  'PARENT',
  'PEDIATRICIAN',
  'CLINIC_ADMIN',
  'CLINIC_STAFF',
  'PLATFORM_ADMIN',
  'SUPPORT',
  'FINANCE',
  'COMPLIANCE',
];
function UsersTab({ onMsg }: { onMsg: (m: string) => void }) {
  const [rows, setRows] = useState<AdminUserRow[]>([]);
  const [busy, setBusy] = useState('');

  async function load() {
    try {
      setRows(await Api.adminUsers());
    } catch (e) {
      onMsg(`Erro: ${String(e)}`);
    }
  }
  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function setRole(id: string, role: string) {
    setBusy(id);
    try {
      await Api.changeUserRole(id, role);
      onMsg('Perfil atualizado ✓');
      await load();
    } catch (e) {
      onMsg(isForbidden(e) ? 'Sem permissão para alterar perfis (só Admin).' : `Erro: ${String(e)}`);
    } finally {
      setBusy('');
    }
  }

  return (
    <div className="section">
      <h2>Utilizadores</h2>
      <div className="grid">
        {rows.map((u) => (
          <div key={u.id} className="card">
            <strong>{u.email ?? u.id.slice(0, 8)}</strong>
            <div className="muted">{new Date(u.createdAt).toLocaleDateString('pt-PT')}</div>
            <select
              value={u.role}
              onChange={(e) => setRole(u.id, e.target.value)}
              disabled={busy === u.id}
              style={{ marginTop: 8 }}
            >
              {ALL_ROLES.map((r) => (
                <option key={r} value={r}>
                  {roleLabel(r)}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>
    </div>
  );
}

// ───────────────────────── Compliance: Audit log (filterable) ─────────────────────────
const AUDIT_PAGE = 100;
function AuditTab({ onMsg }: { onMsg: (m: string) => void }) {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [more, setMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [q, setQ] = useState('');
  const [act, setAct] = useState('');
  useEffect(() => {
    Api.adminAudit(0)
      .then((page) => {
        setRows(page);
        setMore(page.length >= AUDIT_PAGE);
      })
      .catch((e) => onMsg(`Erro: ${String(e)}`))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  async function loadMore() {
    setLoadingMore(true);
    try {
      const page = await Api.adminAudit(rows.length);
      setRows((r) => [...r, ...page]);
      setMore(page.length >= AUDIT_PAGE);
    } catch (e) {
      onMsg(`Erro a carregar mais: ${String(e)}`);
    } finally {
      setLoadingMore(false);
    }
  }

  const actions = Array.from(new Set(rows.map((a) => a.action))).sort();
  const needle = q.trim().toLowerCase();
  const shown = rows.filter(
    (a) =>
      (!act || a.action === act) &&
      (!needle ||
        `${a.action} ${a.entityType} ${a.entityId ?? ''} ${a.actor?.email ?? ''}`
          .toLowerCase()
          .includes(needle)),
  );

  return (
    <div className="section">
      <h2>Registo de auditoria</h2>
      <p className="muted" style={{ fontSize: 13 }}>
        Trilho imutável de ações (RGPD / responsabilização). {rows.length} eventos.
      </p>
      <input
        className="search"
        placeholder="Procurar (ação, entidade, email)…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      {actions.length > 1 ? (
        <div className="row" style={{ flexWrap: 'wrap', gap: 6, margin: '8px 0' }}>
          <button className={`chip${act === '' ? ' active' : ''}`} onClick={() => setAct('')}>
            Todas
          </button>
          {actions.map((a) => (
            <button
              key={a}
              className={`chip${act === a ? ' active' : ''}`}
              onClick={() => setAct((c) => (c === a ? '' : a))}
            >
              {a}
            </button>
          ))}
        </div>
      ) : null}
      {loading ? (
        <Skeleton rows={3} />
      ) : shown.length === 0 ? (
        <EmptyState title="Sem registos" hint={rows.length ? 'Nenhum evento corresponde ao filtro.' : 'Sem ações registadas ainda.'} />
      ) : (
        shown.map((a) => (
          <div key={a.id} className="card" style={{ marginBottom: 8 }}>
            <strong>{a.action}</strong> · <span className="muted">{a.entityType}</span>
            {a.entityId ? <span className="muted"> · {a.entityId.slice(0, 8)}</span> : null}
            <div className="muted" style={{ fontSize: 12 }}>
              {a.actor?.email ?? 'sistema'}
              {a.actor?.role ? ` · ${roleLabel(a.actor.role)}` : ''} · {when(a.createdAt)}
            </div>
          </div>
        ))
      )}
      {more && !loading && !needle && !act ? (
        <button className="btn secondary" onClick={() => void loadMore()} disabled={loadingMore} style={{ marginTop: 8 }}>
          {loadingMore ? 'A carregar…' : 'Ver mais'}
        </button>
      ) : null}
    </div>
  );
}

// ═════════════════════════ FINANCE ═════════════════════════
function Kpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="card">
      <div className="muted">{label}</div>
      <strong style={{ fontSize: 22 }}>{value}</strong>
      {hint ? <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>{hint}</div> : null}
    </div>
  );
}

function FinTreasuryTab({ onMsg }: { onMsg: (m: string) => void }) {
  const [m, setM] = useState<AdminMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    Api.adminMetrics()
      .then(setM)
      .catch((e) => onMsg(`Erro: ${String(e)}`))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  if (loading) return <Skeleton rows={3} />;
  if (!m) return <EmptyState title="Sem dados" hint="Não foi possível carregar a tesouraria." />;

  const payout = m.grossCents - m.commissionCents;
  const paidCount = (m.consultationsByStatus.ANSWERED ?? 0) + (m.consultationsByStatus.CLOSED ?? 0);
  const avgTicket = paidCount > 0 ? m.grossCents / paidCount : null;
  const effRate = m.grossCents > 0 ? (m.commissionCents / m.grossCents) * 100 : null;
  const totalConsults = Object.values(m.consultationsByStatus).reduce((a, b) => a + b, 0);

  return (
    <div className="section">
      <h2>Tesouraria HOC</h2>
      <p className="muted" style={{ marginTop: -4 }}>Valores acumulados da plataforma · {m.currency}</p>
      {m.grossCents === 0 ? (
        <p className="notice">
          Sem pagamentos liquidados ainda. Os valores ficam a zero até existir{' '}
          <code>STRIPE_SECRET_KEY</code> no backend e consultas fechadas com pagamento.
        </p>
      ) : null}

      <div className="grid">
        <Kpi label="Receita bruta" value={euro(m.grossCents)} hint="Total cobrado às famílias" />
        <Kpi label="Comissão da plataforma" value={euro(m.commissionCents)} hint="Receita HOC (intermediação)" />
        <Kpi label="A pagar aos pediatras" value={euro(payout)} hint="Bruto − comissão (payout estimado)" />
      </div>
      <div className="grid" style={{ marginTop: 10 }}>
        <Kpi label="Reembolsos" value={String(m.refunds)} hint="Pagamentos reembolsados" />
        <Kpi label="Ticket médio" value={avgTicket != null ? euro(avgTicket) : '—'} hint="Receita ÷ consultas pagas" />
        <Kpi label="Taxa de comissão" value={effRate != null ? `${effRate.toFixed(1)}%` : '—'} hint="Comissão ÷ bruto" />
      </div>

      <div className="card section">
        <h3>Consultas por estado</h3>
        {Object.entries(m.consultationsByStatus).map(([k, v]) => (
          <div key={k} className="row" style={{ justifyContent: 'space-between' }}>
            <span className={k === 'REFUNDED' || k === 'DISPUTED' ? 'pill warn' : 'muted'}>
              {statusLabel(k)}
            </span>
            <strong>{v}</strong>
          </div>
        ))}
        {totalConsults === 0 ? (
          <p className="muted">Sem consultas ainda.</p>
        ) : (
          <div className="row" style={{ justifyContent: 'space-between', marginTop: 6, borderTop: '1px solid var(--border)', paddingTop: 6 }}>
            <span className="muted">Total de consultas</span>
            <strong>{totalConsults}</strong>
          </div>
        )}
      </div>

      <div className="card section">
        <h3>Saúde da operação</h3>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <span className="muted">Famílias · Crianças</span>
          <strong>{m.families} · {m.children}</strong>
        </div>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <span className="muted">Pediatras ativos</span>
          <strong>{m.pediatriciansByStatus.ACTIVE ?? 0}</strong>
        </div>
      </div>
    </div>
  );
}

const FIN_PAGE = 50;
function FinMovementsTab({ onMsg }: { onMsg: (m: string) => void }) {
  const [rows, setRows] = useState<ConsultationDto[]>([]);
  const [open, setOpen] = useState<ConsultationDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [more, setMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [busy, setBusy] = useState('');
  const [filter, setFilter] = useState<'all' | 'paid' | 'REFUNDED' | 'DISPUTED'>('all');

  async function load() {
    setLoading(true);
    try {
      const page = await Api.allConsultations(0);
      setRows(page);
      setMore(page.length >= FIN_PAGE);
    } catch (e) {
      onMsg(`Erro a carregar: ${String(e)}`);
    } finally {
      setLoading(false);
    }
  }
  async function loadMore() {
    setLoadingMore(true);
    try {
      const page = await Api.allConsultations(rows.length);
      setRows((r) => [...r, ...page]);
      setMore(page.length >= FIN_PAGE);
    } catch (e) {
      onMsg(`Erro a carregar mais: ${String(e)}`);
    } finally {
      setLoadingMore(false);
    }
  }
  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function refund(c: ConsultationDto) {
    if (!window.confirm(`Confirmar reembolso de ${euro(c.priceCents)}? Esta ação é financeira.`)) return;
    setBusy(c.id);
    try {
      await Api.refund(c.id);
      onMsg('Reembolso registado ✓');
      await load();
    } catch (e) {
      onMsg(`Erro: ${String(e)}`);
    } finally {
      setBusy('');
    }
  }

  if (open)
    return (
      <Thread consultation={open} canClose={false} canCancel={false} onChanged={() => setOpen(null)} onBack={() => setOpen(null)} onMsg={onMsg} />
    );

  const isPaid = (s: string) => s === 'ANSWERED' || s === 'CLOSED';
  const shown = rows.filter((c) =>
    filter === 'all' ? true : filter === 'paid' ? isPaid(c.status) : c.status === filter,
  );
  const volume = rows.filter((c) => c.status !== 'REFUNDED' && c.status !== 'CANCELLED').reduce((s, c) => s + c.priceCents, 0);
  const refunded = rows.filter((c) => c.status === 'REFUNDED').reduce((s, c) => s + c.priceCents, 0);

  return (
    <div className="section">
      <h2>Movimentos</h2>
      <p className="muted" style={{ marginTop: -4, fontSize: 13 }}>
        Lista de atividade recente. Os <strong>totais completos</strong> da plataforma estão na
        Tesouraria.
      </p>
      <div className="grid">
        <Kpi label="Volume carregado" value={euro(volume)} hint={`${rows.length} movimento(s)${more ? '+' : ''}`} />
        <Kpi label="Reembolsado (carregado)" value={euro(refunded)} />
        <Kpi label="Movimentos carregados" value={`${rows.length}${more ? '+' : ''}`} />
      </div>
      <div className="row" style={{ flexWrap: 'wrap', gap: 6, margin: '8px 0' }}>
        {([
          ['all', 'Todos'],
          ['paid', 'Pagas'],
          ['REFUNDED', 'Reembolsadas'],
          ['DISPUTED', 'Em disputa'],
        ] as const).map(([k, label]) => (
          <button key={k} className={`chip${filter === k ? ' active' : ''}`} onClick={() => setFilter(k)}>
            {label}
          </button>
        ))}
      </div>
      {loading ? (
        <Skeleton rows={3} />
      ) : shown.length === 0 ? (
        <EmptyState title="Sem movimentos" hint={rows.length ? 'Nenhum neste filtro.' : 'Aparecem aqui assim que houver consultas.'} />
      ) : (
        <div className="grid">
          {shown.map((c) => (
            <div key={c.id} className="card">
              <span className={statusPill(c.status)}>{statusLabel(c.status)}</span>
              <div style={{ marginTop: 4 }}>
                <strong>{svcLabel(c.type)}</strong> · {euro(c.priceCents)}
              </div>
              <div className="muted" style={{ fontSize: 13 }}>
                {c.pediatrician?.displayName ?? '—'} · {c.child?.name ?? '—'}
              </div>
              <div className="muted" style={{ fontSize: 12 }}>{when(c.scheduledAt ?? c.openedAt)}</div>
              <div className="row" style={{ marginTop: 8 }}>
                <button className="btn small secondary" onClick={() => setOpen(c)}>Ver</button>
                <button
                  className="btn small danger"
                  onClick={() => refund(c)}
                  disabled={busy === c.id || c.status === 'REFUNDED'}
                >
                  {c.status === 'REFUNDED' ? 'Reembolsada' : 'Reembolsar'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      {more && !loading ? (
        <button className="btn secondary" onClick={() => void loadMore()} disabled={loadingMore} style={{ marginTop: 12 }}>
          {loadingMore ? 'A carregar…' : 'Ver mais'}
        </button>
      ) : null}
    </div>
  );
}

// ═════════════════════════ COMPLIANCE ═════════════════════════
function ComplianceOverviewTab({ onMsg, onGoCreds }: { onMsg: (m: string) => void; onGoCreds: () => void }) {
  const [m, setM] = useState<AdminMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    Api.adminMetrics()
      .then(setM)
      .catch((e) => onMsg(`Erro: ${String(e)}`))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  if (loading) return <Skeleton rows={3} />;
  if (!m) return <EmptyState title="Sem dados" hint="Não foi possível carregar." />;

  const verified = m.pediatriciansByStatus.ACTIVE ?? 0;
  const pending = m.pediatriciansByStatus.PENDING ?? 0;
  const suspended = m.pediatriciansByStatus.SUSPENDED ?? 0;
  const totalPeds = verified + pending + suspended;

  return (
    <div className="section">
      <h2>Conformidade</h2>
      <p className="notice" style={{ fontSize: 13 }}>
        ℹ️ Ambiente de demonstração — dados fictícios, sem PII real de menores.
      </p>

      <div className="card section">
        <h3>Verificação de profissionais</h3>
        <div className="grid">
          <Kpi label="Verificados" value={String(verified)} />
          <Kpi label="Pendentes" value={String(pending)} />
          <Kpi label="Suspensos" value={String(suspended)} />
        </div>
        <p className="muted" style={{ fontSize: 13, marginTop: 6 }}>
          {totalPeds ? `${verified} de ${totalPeds} profissionais verificados.` : 'Sem profissionais registados.'}
        </p>
        {pending > 0 ? (
          <button className="btn small" onClick={onGoCreds} style={{ marginTop: 4 }}>
            ⚠️ Rever {pending} credencial(is) pendente(s) →
          </button>
        ) : null}
      </div>

      <div className="card section">
        <h3>Titulares de dados sob tratamento</h3>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <span className="muted">Famílias · Crianças</span>
          <strong>{m.families} · {m.children}</strong>
        </div>
        <p className="muted" style={{ fontSize: 12, marginTop: 4 }}>
          Dados de saúde de menores — categoria especial (art. 9.º RGPD).
        </p>
      </div>

      <div className="card section">
        <h3>Atividade de tratamento (consultas)</h3>
        {Object.entries(m.consultationsByStatus).map(([k, v]) => (
          <div key={k} className="row" style={{ justifyContent: 'space-between' }}>
            <span className="muted">{statusLabel(k)}</span>
            <strong>{v}</strong>
          </div>
        ))}
        {Object.keys(m.consultationsByStatus).length === 0 ? <p className="muted">Sem dados.</p> : null}
      </div>

      <div className="card section">
        <h3>Acessos por perfil</h3>
        {Object.entries(m.usersByRole).map(([k, v]) => (
          <div key={k} className="row" style={{ justifyContent: 'space-between' }}>
            <span className="muted">{roleLabel(k)}</span>
            <strong>{v}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

function CredentialsTab({ onMsg }: { onMsg: (m: string) => void }) {
  const [rows, setRows] = useState<AdminPedRow[]>([]);
  const [status, setStatus] = useState('PENDING');
  const [loading, setLoading] = useState(true);
  const [openDocs, setOpenDocs] = useState('');

  async function load(s = status) {
    setLoading(true);
    try {
      setRows(await Api.adminPediatricians(s || undefined));
    } catch (e) {
      onMsg(isForbidden(e) ? 'Sem permissão.' : `Erro: ${String(e)}`);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load(status);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  return (
    <div className="section">
      <h2>Revisão de credenciais</h2>
      <p className="muted" style={{ fontSize: 13 }}>
        Cédula, diploma e demais documentos. Aprovar documentos não ativa o perfil — a ativação é
        feita pela Administração.
      </p>
      <div className="row" style={{ flexWrap: 'wrap', gap: 6, margin: '8px 0' }}>
        {([
          ['PENDING', 'Pendentes'],
          ['ACTIVE', 'Verificados'],
          ['SUSPENDED', 'Suspensos'],
          ['', 'Todos'],
        ] as const).map(([k, label]) => (
          <button key={k} className={`chip${status === k ? ' active' : ''}`} onClick={() => setStatus(k)}>
            {label}
          </button>
        ))}
      </div>
      {loading ? (
        <Skeleton rows={2} />
      ) : rows.length === 0 ? (
        <EmptyState title="Fila vazia" hint="Nenhum profissional neste estado." />
      ) : (
        <div className="grid">
          {rows.map((p) => (
            <div key={p.id} className="card">
              <span className={pedStatus(p.status).pill}>{pedStatus(p.status).label}</span>
              <div style={{ marginTop: 4 }}>
                <strong>{p.displayName ?? p.user?.email ?? p.specialties[0] ?? 'Pediatra'}</strong>
              </div>
              <div className="muted" style={{ fontSize: 13 }}>
                Licença {p.licenseNumber} · ⭐ {p.ratingAvg.toFixed(1)}
              </div>
              <button
                className="btn small secondary"
                style={{ marginTop: 6 }}
                onClick={() => setOpenDocs(openDocs === p.id ? '' : p.id)}
              >
                {openDocs === p.id ? 'Ocultar documentos' : 'Documentos'}
              </button>
              {openDocs === p.id ? <CredDocsReview pediatricianId={p.id} onMsg={onMsg} /> : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CredDocsReview({ pediatricianId, onMsg }: { pediatricianId: string; onMsg: (m: string) => void }) {
  const [docs, setDocs] = useState<VerificationDoc[]>([]);
  const [busy, setBusy] = useState('');
  const [note, setNote] = useState<Record<string, string>>({});

  async function load() {
    try {
      setDocs(await Api.adminDocuments(pediatricianId));
    } catch (e) {
      onMsg(`Erro a carregar documentos: ${String(e)}`);
    }
  }
  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pediatricianId]);

  async function review(id: string, status: 'approved' | 'rejected') {
    if (status === 'rejected' && !note[id]?.trim()) {
      return onMsg('Indica uma nota a justificar a recusa.');
    }
    setBusy(id);
    try {
      await Api.reviewDocument(id, status, note[id]?.trim() || undefined);
      onMsg(status === 'approved' ? 'Documento aprovado ✓' : 'Documento recusado.');
      await load();
    } catch (e) {
      onMsg(isForbidden(e) ? 'Sem permissão para rever.' : `Erro: ${String(e)}`);
    } finally {
      setBusy('');
    }
  }

  return (
    <div style={{ marginTop: 10, borderTop: '1px solid var(--border)', paddingTop: 10 }}>
      {docs.length === 0 ? (
        <p className="muted">Sem documentos submetidos.</p>
      ) : (
        docs.map((d) => (
          <div key={d.id} style={{ marginBottom: 10 }}>
            <span className={docStatusPill(d.status)}>{docStatusLabel(d.status)}</span>{' '}
            <strong>{DOC_KINDS.find((k) => k.value === d.kind)?.label ?? d.kind}</strong>
            <div className="muted" style={{ fontSize: 13 }}>{d.fileName}</div>
            {d.status !== 'pending' && d.note ? (
              <div className="muted" style={{ fontSize: 12 }}>Nota: {d.note}</div>
            ) : null}
            {d.status === 'pending' ? (
              <>
                <input
                  placeholder="Nota (obrigatória para recusar)"
                  value={note[d.id] ?? ''}
                  onChange={(e) => setNote((n) => ({ ...n, [d.id]: e.target.value }))}
                  style={{ marginTop: 6 }}
                />
                <div className="row" style={{ marginTop: 4 }}>
                  <button className="btn small" onClick={() => review(d.id, 'approved')} disabled={busy === d.id}>
                    Aprovar
                  </button>
                  <button className="btn small danger" onClick={() => review(d.id, 'rejected')} disabled={busy === d.id}>
                    Recusar
                  </button>
                </div>
              </>
            ) : null}
          </div>
        ))
      )}
    </div>
  );
}

// ═════════════════════════ SUPPORT ═════════════════════════
const SUPPORT_ESCALATION = '🛡️ Verificar, suspender, alterar perfis ou rever documentos é feito pela Administração / Conformidade. Para escalar, copia o email/ID.';

function copyText(text: string, onMsg: (m: string) => void) {
  navigator.clipboard?.writeText(text).then(
    () => onMsg('Copiado ✓'),
    () => onMsg('Não foi possível copiar.'),
  );
}

function SupportUsersTab({ onMsg }: { onMsg: (m: string) => void }) {
  const [rows, setRows] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [role, setRole] = useState('');
  useEffect(() => {
    Api.adminUsers()
      .then(setRows)
      .catch((e) => onMsg(isForbidden(e) ? 'Sem permissão.' : `Erro: ${String(e)}`))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const roles = Array.from(new Set(rows.map((u) => u.role)));
  const needle = q.trim().toLowerCase();
  const shown = rows.filter(
    (u) => (!role || u.role === role) && (!needle || `${u.email ?? ''} ${u.id}`.toLowerCase().includes(needle)),
  );

  return (
    <div className="section">
      <h2>Procurar utilizador</h2>
      <input
        className="search"
        placeholder="Procurar por email ou ID…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <div className="row" style={{ flexWrap: 'wrap', gap: 6, margin: '8px 0' }}>
        <button className={`chip${role === '' ? ' active' : ''}`} onClick={() => setRole('')}>Todos</button>
        {roles.map((r) => (
          <button key={r} className={`chip${role === r ? ' active' : ''}`} onClick={() => setRole((c) => (c === r ? '' : r))}>
            {roleLabel(r)}
          </button>
        ))}
      </div>
      <p className="muted" style={{ fontSize: 12 }}>{SUPPORT_ESCALATION}</p>
      {loading ? (
        <Skeleton rows={3} />
      ) : shown.length === 0 ? (
        <EmptyState title="Sem resultados" hint="Tenta outro email ou limpa os filtros." />
      ) : (
        <div className="grid">
          {shown.map((u) => (
            <div key={u.id} className="card">
              <strong>{u.email ?? u.id.slice(0, 8)}</strong>
              <div style={{ marginTop: 4 }}>
                <span className="pill">{roleLabel(u.role)}</span>{' '}
                <span className={u.status === 'active' ? 'pill ok' : 'pill warn'}>{u.status}</span>
              </div>
              <div className="muted" style={{ fontSize: 12 }}>
                Conta criada a {new Date(u.createdAt).toLocaleDateString('pt-PT')}
              </div>
              <div className="row" style={{ marginTop: 6 }}>
                {u.email ? (
                  <button className="btn small secondary" onClick={() => copyText(u.email!, onMsg)}>📋 Email</button>
                ) : null}
                <button className="btn small secondary" onClick={() => copyText(u.id, onMsg)}>📋 ID</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SupportPedsTab({ onMsg }: { onMsg: (m: string) => void }) {
  const [rows, setRows] = useState<AdminPedRow[]>([]);
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [openDocs, setOpenDocs] = useState('');

  useEffect(() => {
    setLoading(true);
    Api.adminPediatricians(status || undefined)
      .then(setRows)
      .catch((e) => onMsg(isForbidden(e) ? 'Sem permissão.' : `Erro: ${String(e)}`))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const needle = q.trim().toLowerCase();
  const shown = rows.filter(
    (p) => !needle || `${p.displayName ?? ''} ${p.user?.email ?? ''} ${p.licenseNumber}`.toLowerCase().includes(needle),
  );

  return (
    <div className="section">
      <h2>Estado de pediatras</h2>
      <input className="search" placeholder="Procurar por nome, email ou licença…" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="row" style={{ flexWrap: 'wrap', gap: 6, margin: '8px 0' }}>
        {([
          ['', 'Todos'],
          ['ACTIVE', 'Verificados'],
          ['PENDING', 'Pendentes'],
          ['SUSPENDED', 'Suspensos'],
        ] as const).map(([k, label]) => (
          <button key={k} className={`chip${status === k ? ' active' : ''}`} onClick={() => setStatus(k)}>{label}</button>
        ))}
      </div>
      <p className="muted" style={{ fontSize: 12 }}>{SUPPORT_ESCALATION}</p>
      {loading ? (
        <Skeleton rows={2} />
      ) : shown.length === 0 ? (
        <EmptyState title="Sem pediatras" hint="Nenhum corresponde." />
      ) : (
        <div className="grid">
          {shown.map((p) => (
            <div key={p.id} className="card">
              <span className={pedStatus(p.status).pill}>{pedStatus(p.status).label}</span>
              <div style={{ marginTop: 4 }}>
                <strong>{p.displayName ?? p.user?.email ?? p.specialties[0] ?? 'Pediatra'}</strong>
                {p.displayName && p.user?.email ? <span className="muted"> · {p.user.email}</span> : null}
              </div>
              <div className="muted" style={{ fontSize: 13 }}>
                Licença {p.licenseNumber} · ⭐ {p.ratingAvg.toFixed(1)} · {specLabel(p.specialties[0])}
              </div>
              <button className="btn small secondary" style={{ marginTop: 6 }} onClick={() => setOpenDocs(openDocs === p.id ? '' : p.id)}>
                {openDocs === p.id ? 'Ocultar documentos' : 'Ver documentos'}
              </button>
              {openDocs === p.id ? <SupportPedDocs pediatricianId={p.id} onMsg={onMsg} /> : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SupportPedDocs({ pediatricianId, onMsg }: { pediatricianId: string; onMsg: (m: string) => void }) {
  const [docs, setDocs] = useState<VerificationDoc[]>([]);
  useEffect(() => {
    Api.adminDocuments(pediatricianId)
      .then(setDocs)
      .catch((e) => onMsg(`Erro: ${String(e)}`));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pediatricianId]);
  return (
    <div style={{ marginTop: 10, borderTop: '1px solid var(--border)', paddingTop: 10 }}>
      {docs.length === 0 ? (
        <p className="muted">Sem documentos submetidos.</p>
      ) : (
        docs.map((d) => (
          <div key={d.id} style={{ marginBottom: 6 }}>
            <span className={docStatusPill(d.status)}>{docStatusLabel(d.status)}</span>{' '}
            <strong>{DOC_KINDS.find((k) => k.value === d.kind)?.label ?? d.kind}</strong>
            <div className="muted" style={{ fontSize: 12 }}>
              {d.fileName}{d.reviewedAt ? ` · revisto ${when(d.reviewedAt)}` : ''}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function SupportOverviewTab({ onMsg }: { onMsg: (m: string) => void }) {
  const [m, setM] = useState<AdminMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    Api.adminMetrics()
      .then(setM)
      .catch((e) => onMsg(`Erro: ${String(e)}`))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  if (loading) return <Skeleton rows={3} />;
  if (!m) return <EmptyState title="Sem dados" hint="Não foi possível carregar." />;
  const totalUsers = Object.values(m.usersByRole).reduce((a, b) => a + b, 0);
  return (
    <div className="section">
      <h2>Visão de apoio</h2>
      <div className="grid">
        <Kpi label="Utilizadores" value={String(totalUsers)} />
        <Kpi label="Famílias · Crianças" value={`${m.families} · ${m.children}`} />
        <Kpi label="Reembolsos" value={String(m.refunds)} hint="Contexto p/ cobrança" />
      </div>
      <div className="card section">
        <h3>Utilizadores por perfil</h3>
        {Object.entries(m.usersByRole).map(([k, v]) => (
          <div key={k} className="row" style={{ justifyContent: 'space-between' }}>
            <span className="muted">{roleLabel(k)}</span>
            <strong>{v}</strong>
          </div>
        ))}
      </div>
      <div className="card section">
        <h3>Consultas por estado</h3>
        {Object.entries(m.consultationsByStatus).map(([k, v]) => (
          <div key={k} className="row" style={{ justifyContent: 'space-between' }}>
            <span className={k === 'REFUNDED' || k === 'DISPUTED' ? 'pill warn' : 'muted'}>{statusLabel(k)}</span>
            <strong>{v}</strong>
          </div>
        ))}
        {Object.keys(m.consultationsByStatus).length === 0 ? <p className="muted">Sem consultas ainda.</p> : null}
      </div>
      <div className="card section">
        <h3>Pediatras por estado</h3>
        {Object.entries(m.pediatriciansByStatus).map(([k, v]) => (
          <div key={k} className="row" style={{ justifyContent: 'space-between' }}>
            <span className="muted">{pedStatus(k).label}</span>
            <strong>{v}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

// ───────────────────────── Clinic (B2B) ─────────────────────────
function ClinicTab({ role, onMsg }: { role: string; onMsg: (m: string) => void }) {
  const [data, setData] = useState<ClinicDashboard | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [peds, setPeds] = useState<PediatricianCard[]>([]);
  const [email, setEmail] = useState('');
  const [srole, setSrole] = useState('CLINIC_STAFF');
  const [pedId, setPedId] = useState('');
  const [busy, setBusy] = useState(false);
  const isAdmin = role === 'CLINIC_ADMIN';

  async function load() {
    try {
      const d = await Api.myClinic();
      setData(d);
      if (isAdmin) setPeds((await Api.pediatricians()) as PediatricianCard[]);
    } catch (e) {
      onMsg(`Erro: ${String(e)}`);
    } finally {
      setLoaded(true);
    }
  }
  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function addStaff() {
    if (!data || !email) return;
    setBusy(true);
    try {
      await Api.addClinicStaff(data.clinic.id, email, srole);
      setEmail('');
      onMsg('Membro adicionado ✓');
      await load();
    } catch (e) {
      onMsg(`Erro: ${String(e)}`);
    } finally {
      setBusy(false);
    }
  }
  async function addPed() {
    if (!data || !pedId) return;
    setBusy(true);
    try {
      await Api.addClinicPediatrician(data.clinic.id, pedId);
      setPedId('');
      onMsg('Pediatra associado ✓');
      await load();
    } catch (e) {
      onMsg(`Erro: ${String(e)}`);
    } finally {
      setBusy(false);
    }
  }

  if (!loaded) return <p className="muted section">A carregar…</p>;
  if (!data)
    return (
      <div className="section">
        <p className="notice">
          Este utilizador ainda não está ligado a nenhuma clínica. (A seed cria a "Clínica Demo" com
          o admin e o staff.)
        </p>
      </div>
    );

  const linkedIds = new Set(data.pediatricians.map((p) => p.id));
  const available = peds.filter((p) => !linkedIds.has(p.id));

  return (
    <div className="section">
      <h2>{data.clinic.name}</h2>
      <p className="muted" style={{ marginTop: -4 }}>
        {isAdmin ? 'Gestão da clínica' : 'Vista da equipa'} · NIF {data.clinic.taxId ?? '—'}
      </p>
      <div className="grid">
        <Kpi label="Pediatras" value={String(data.pediatricians.length)} />
        <Kpi label="Equipa" value={String(data.members.length)} />
        <Kpi label="Consultas" value={String(data.consultations.length)} />
      </div>

      <h3 style={{ marginTop: 18 }}>Pediatras</h3>
      {data.pediatricians.length === 0 ? (
        <p className="muted">Sem pediatras associados.</p>
      ) : (
        <div className="grid">
          {data.pediatricians.map((p) => (
            <div key={p.id} className="card">
              <span className={pedStatus(p.status).pill}>{pedStatus(p.status).label}</span>
              <div style={{ marginTop: 4 }}>
                <strong>{p.email ?? p.id.slice(0, 8)}</strong>
              </div>
              <div className="muted" style={{ fontSize: 13 }}>
                ⭐ {p.ratingAvg.toFixed(1)} · partilha p/ a clínica {p.revenueSharePct}%
              </div>
            </div>
          ))}
        </div>
      )}

      <h3 style={{ marginTop: 18 }}>Equipa</h3>
      <div className="grid">
        {data.members.map((m) => (
          <div key={m.id} className="card">
            <strong>{m.email ?? m.userId.slice(0, 8)}</strong>
            <div className="muted">{roleLabel(m.role)}</div>
          </div>
        ))}
      </div>

      <h3 style={{ marginTop: 18 }}>Consultas da clínica</h3>
      {data.consultations.length === 0 ? (
        <p className="muted">Sem consultas. (Cria uma como Marta para uma pediatra da clínica.)</p>
      ) : (
        <div className="grid">
          {data.consultations.map((c) => (
            <div key={c.id} className="card">
              <span className={statusPill(c.status)}>{statusLabel(c.status)}</span>
              <div>
                <strong>{svcLabel(c.type)}</strong> · {euro(c.priceCents)}
              </div>
              <div className="muted">{when(c.openedAt)}</div>
            </div>
          ))}
        </div>
      )}

      {isAdmin ? (
        <>
          <div className="card section">
            <h3>Adicionar membro</h3>
            <input
              placeholder="email@exemplo.pt"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <select value={srole} onChange={(e) => setSrole(e.target.value)}>
              <option value="CLINIC_STAFF">Colaborador</option>
              <option value="CLINIC_ADMIN">Administrador</option>
            </select>
            <button className="btn" onClick={addStaff} disabled={busy}>
              Adicionar
            </button>
          </div>
          <div className="card section">
            <h3>Associar pediatra</h3>
            <select value={pedId} onChange={(e) => setPedId(e.target.value)}>
              <option value="">— escolher —</option>
              {available.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.specialties[0] ?? 'Pediatra'} · ⭐ {p.ratingAvg.toFixed(1)}
                </option>
              ))}
            </select>
            <button className="btn" onClick={addPed} disabled={busy || !pedId}>
              Associar
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}

// ───────────────────────── Content library (read) ─────────────────────────
// Segments for the "Saber+" library — order + emoji. Unknown categories fall
// through to a default bucket so new content never disappears.
const CONTENT_SEGMENTS: { key: string; emoji: string }[] = [
  { key: 'Urgências', emoji: '🚨' },
  { key: 'Sintomas', emoji: '🌡️' },
  { key: 'Bebé', emoji: '🍼' },
  { key: 'Alimentação', emoji: '🥣' },
  { key: 'Doenças comuns', emoji: '🤒' },
  { key: 'Desenvolvimento', emoji: '🧩' },
  { key: 'Prevenção', emoji: '🛡️' },
  { key: 'Pele', emoji: '🧴' },
];
function segEmoji(category: string): string {
  return CONTENT_SEGMENTS.find((s) => s.key === category)?.emoji ?? '📄';
}

function ContentTab({ onMsg }: { onMsg: (m: string) => void }) {
  const [items, setItems] = useState<ArticleCard[]>([]);
  const [open, setOpen] = useState<ArticleCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [cat, setCat] = useState<string>(''); // '' = todas

  useEffect(() => {
    Api.articles()
      .then(setItems)
      .catch((e) => onMsg(`Erro: ${String(e)}`))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (open) {
    const urgent = open.category === 'Urgências';
    return (
      <div className="section">
        <button className="btn secondary small" onClick={() => setOpen(null)} style={{ marginBottom: 12 }}>
          ← Voltar
        </button>
        <span className="pill muted">
          {segEmoji(open.category)} {open.category}
        </span>
        <h2>{open.title}</h2>
        <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.65 }}>{open.body}</p>
        {urgent ? (
          <p className="notice" style={{ marginTop: 12 }}>
            🚑 Em emergência ligue <strong>112</strong>. Aconselhamento: SNS 24 ·{' '}
            <strong>808 24 24 24</strong>.
          </p>
        ) : null}
        <p className="muted" style={{ fontSize: 12, marginTop: 10 }}>
          Conteúdo informativo validado · não substitui a avaliação do seu médico.
        </p>
      </div>
    );
  }

  // Categories actually present, in the curated order (plus any extras).
  const present = items.reduce<Record<string, boolean>>((m, a) => ((m[a.category] = true), m), {});
  const ordered = [
    ...CONTENT_SEGMENTS.map((s) => s.key).filter((k) => present[k]),
    ...Object.keys(present).filter((k) => !CONTENT_SEGMENTS.some((s) => s.key === k)),
  ];
  const needle = q.trim().toLowerCase();
  const matches = (a: ArticleCard) =>
    (!cat || a.category === cat) &&
    (!needle || `${a.title} ${a.body}`.toLowerCase().includes(needle));
  const filtered = items.filter(matches);

  function Card({ a }: { a: ArticleCard }) {
    const urgent = a.category === 'Urgências';
    return (
      <button
        key={a.id}
        className="card"
        onClick={() => setOpen(a)}
        style={{
          textAlign: 'left',
          cursor: 'pointer',
          ...(urgent ? { borderLeft: '3px solid #d7263d' } : {}),
        }}
      >
        <span className="pill muted">
          {segEmoji(a.category)} {a.category}
        </span>
        <h3 style={{ margin: '6px 0 4px' }}>{a.title}</h3>
        <div className="muted" style={{ fontSize: 13 }}>
          {a.body.replace(/\n+/g, ' ').slice(0, 96)}…
        </div>
      </button>
    );
  }

  return (
    <div className="section">
      <h2>Saber+ · conteúdos validados</h2>
      <p className="muted" style={{ marginTop: -4 }}>
        Informação de saúde infantil revista por pediatras, organizada por temas. Em emergência,
        ligue 112.
      </p>

      <input
        className="search"
        placeholder="Pesquisar (ex.: febre, sono, vacinas)…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />

      {/* Segment chips */}
      <div className="row" style={{ flexWrap: 'wrap', gap: 6, margin: '8px 0 4px' }}>
        <button
          className={`chip${cat === '' ? ' active' : ''}`}
          onClick={() => setCat('')}
        >
          Todos
        </button>
        {ordered.map((k) => (
          <button
            key={k}
            className={`chip${cat === k ? ' active' : ''}`}
            onClick={() => setCat((c) => (c === k ? '' : k))}
          >
            {segEmoji(k)} {k}
          </button>
        ))}
      </div>

      {loading ? (
        <Skeleton rows={3} />
      ) : items.length === 0 ? (
        <EmptyState title="Ainda sem artigos" hint="Os pediatras publicam aqui conteúdos validados." />
      ) : needle || cat ? (
        // Filtered / searched → flat list
        filtered.length === 0 ? (
          <EmptyState title="Sem resultados" hint="Tenta outra pesquisa ou tema." />
        ) : (
          <div className="grid">
            {filtered.map((a) => (
              <Card key={a.id} a={a} />
            ))}
          </div>
        )
      ) : (
        // Default → grouped by segment
        <>
          {ordered.map((k) => {
            const group = items.filter((a) => a.category === k);
            if (!group.length) return null;
            return (
              <div key={k} style={{ marginTop: 16 }}>
                <h3 style={{ margin: '0 0 8px' }}>
                  {segEmoji(k)} {k}{' '}
                  <span className="muted" style={{ fontSize: 13, fontWeight: 400 }}>
                    · {group.length}
                  </span>
                </h3>
                <div className="grid">
                  {group.map((a) => (
                    <Card key={a.id} a={a} />
                  ))}
                </div>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}

// ───────────────────────── Content authoring (pediatrician/admin) ─────────────────────────
function ContentAuthor({ onMsg }: { onMsg: (m: string) => void }) {
  const [mine, setMine] = useState<ArticleCard[]>([]);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('geral');
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      setMine(await Api.myArticles());
    } catch {
      /* ignore */
    }
  }
  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function publish() {
    if (!title || !body) return onMsg('Indica título e texto.');
    setBusy(true);
    try {
      await Api.createArticle({ title, body, category, published: true });
      setTitle('');
      setBody('');
      onMsg('Artigo publicado ✓');
      await load();
    } catch (e) {
      onMsg(`Erro: ${String(e)}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="section">
      <h3>Conteúdos</h3>
      {mine.length > 0 ? (
        <div className="grid">
          {mine.map((a) => (
            <div key={a.id} className="card">
              <span className={a.published ? 'pill ok' : 'pill muted'}>
                {a.published ? 'publicado' : 'rascunho'}
              </span>
              <strong>{a.title}</strong>
            </div>
          ))}
        </div>
      ) : null}
      <div className="card section">
        <input placeholder="Título" value={title} onChange={(e) => setTitle(e.target.value)} />
        <input placeholder="Categoria" value={category} onChange={(e) => setCategory(e.target.value)} />
        <textarea placeholder="Texto…" value={body} onChange={(e) => setBody(e.target.value)} rows={4} />
        <button className="btn" onClick={publish} disabled={busy}>
          Publicar artigo
        </button>
      </div>
    </div>
  );
}

// ───────────────────────── Onboarding / consents (first parent login) ─────────────────────────
function Onboarding({ onDone }: { onDone: () => void }) {
  const [terms, setTerms] = useState(false);
  const [privacy, setPrivacy] = useState(false);
  const [health, setHealth] = useState(false);
  const all = terms && privacy && health;
  return (
    <div className="section">
      <span className="badge">Bem-vindo à HOC — Healthcare on Call</span>
      <h1 style={{ fontSize: 28, margin: '10px 0 6px', letterSpacing: '-0.02em' }}>
        Cuidar do seu filho, com confiança.
      </h1>
      <p className="muted">
        Pediatras verificados, num espaço seguro e privado. Antes de começar, confirme os
        consentimentos.
      </p>

      <div className="card section">
        <label className="row" style={{ alignItems: 'flex-start', gap: 10 }}>
          <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} style={{ width: 'auto', marginTop: 3 }} />
          <span>
            Aceito os <strong>Termos de Utilização</strong>.
          </span>
        </label>
        <label className="row" style={{ alignItems: 'flex-start', gap: 10, marginTop: 10 }}>
          <input type="checkbox" checked={privacy} onChange={(e) => setPrivacy(e.target.checked)} style={{ width: 'auto', marginTop: 3 }} />
          <span>
            Li e aceito a <strong>Política de Privacidade</strong> (RGPD).
          </span>
        </label>
        <label className="row" style={{ alignItems: 'flex-start', gap: 10, marginTop: 10 }}>
          <input type="checkbox" checked={health} onChange={(e) => setHealth(e.target.checked)} style={{ width: 'auto', marginTop: 3 }} />
          <span>
            Autorizo o tratamento dos <strong>dados de saúde</strong> do meu filho 🔒, para a
            prestação dos cuidados.
          </span>
        </label>
      </div>

      <button className="btn" onClick={onDone} disabled={!all} style={{ width: '100%' }}>
        Começar
      </button>
      <p className="muted" style={{ fontSize: 12, textAlign: 'center', marginTop: 8 }}>
        Pode rever ou revogar consentimentos em Conta → Privacidade.
      </p>
    </div>
  );
}

// ───────────────────────── Emergency (always present) ─────────────────────────
function Emergency() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className="fab-sos" aria-label="Emergência" onClick={() => setOpen(true)}>
        SOS
      </button>
      {open ? (
        <div className="sheet-backdrop" onClick={() => setOpen(false)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-grip" />
            <h2 style={{ marginTop: 4 }}>É uma emergência?</h2>
            <p className="muted">
              Se a criança tem dificuldade a respirar, está prostrada, com convulsões ou lábios
              azulados, <strong>não espere</strong>.
            </p>
            <a className="btn danger" href="tel:112" style={{ display: 'block', textAlign: 'center' }}>
              Ligar 112 (emergência)
            </a>
            <a
              className="btn secondary"
              href="tel:808242424"
              style={{ display: 'block', textAlign: 'center', marginTop: 8 }}
            >
              Ligar SNS 24 · 808 24 24 24
            </a>
            <p className="muted" style={{ fontSize: 12, marginTop: 10 }}>
              A teleconsulta não substitui o atendimento de emergência.
            </p>
            <button
              className="btn secondary small"
              onClick={() => setOpen(false)}
              style={{ marginTop: 4 }}
            >
              Fechar
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}

// ───────────────────────── Settings ─────────────────────────
function Seg<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { v: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="seg">
      {options.map((o) => (
        <button
          key={o.v}
          className={o.v === value ? 'active' : ''}
          onClick={() => onChange(o.v)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function SettingsScreen({ profile, onClose }: { profile: Profile; onClose: () => void }) {
  const { theme, setTheme, textSize, setTextSize } = useTheme();
  const [notif, setNotif] = useState(false);
  useEffect(() => {
    setNotif(typeof window !== 'undefined' && localStorage.getItem('pedia_notif') === '1');
  }, []);
  function toggleNotif(v: boolean) {
    setNotif(v);
    if (typeof window !== 'undefined') localStorage.setItem('pedia_notif', v ? '1' : '0');
  }
  const [secNote, setSecNote] = useState('');
  function tryPasskey() {
    const supported = typeof window !== 'undefined' && 'PublicKeyCredential' in window;
    setSecNote(
      supported
        ? 'O teu dispositivo suporta passkeys/biometria. A ativação fica disponível quando o domínio tiver WEBAUTHN_RP_ID/WEBAUTHN_ORIGIN configurados (ver docs/21-integracoes.md). O backend já expõe os endpoints WebAuthn.'
        : 'Este dispositivo/navegador não suporta passkeys (WebAuthn).',
    );
  }

  return (
    <div className="section">
      <button className="btn secondary small" onClick={onClose} style={{ marginBottom: 14 }}>
        ← Voltar
      </button>
      <h2>Definições</h2>

      <div className="card section">
        <strong>Aparência</strong>
        <p className="muted" style={{ fontSize: 13, margin: '4px 0 8px' }}>
          Tema
        </p>
        <Seg<Theme>
          value={theme}
          onChange={setTheme}
          options={[
            { v: 'light', label: 'Claro' },
            { v: 'dark', label: 'Escuro' },
            { v: 'system', label: 'Sistema' },
          ]}
        />
        <p className="muted" style={{ fontSize: 13, margin: '14px 0 8px' }}>
          Tamanho do texto
        </p>
        <Seg<TextSize>
          value={textSize}
          onChange={setTextSize}
          options={[
            { v: 'normal', label: 'Normal' },
            { v: 'large', label: 'Grande' },
          ]}
        />
      </div>

      <div className="card section">
        <strong>Idioma</strong>
        <p className="muted" style={{ fontSize: 13, margin: '4px 0 8px' }}>
          A app das famílias está disponível em três idiomas.
        </p>
        <LanguageSwitcher />
      </div>

      <div className="card section">
        <strong>Segurança</strong>
        <p className="muted" style={{ fontSize: 13, margin: '4px 0 8px' }}>
          Passkey / biometria (Face ID, Touch ID) para entrar sem palavra-passe.
        </p>
        <button className="btn secondary small" onClick={tryPasskey}>
          Ativar passkey
        </button>
        {secNote ? (
          <p className="notice" style={{ marginTop: 10, fontSize: 13 }}>
            {secNote}
          </p>
        ) : null}
      </div>

      <div className="card section">
        <strong>Notificações</strong>
        <label
          className="row"
          style={{ justifyContent: 'space-between', marginTop: 8, cursor: 'pointer' }}
        >
          <span className="muted">Receber avisos da app</span>
          <input
            type="checkbox"
            checked={notif}
            onChange={(e) => toggleNotif(e.target.checked)}
            style={{ width: 'auto' }}
          />
        </label>
        <p className="muted" style={{ fontSize: 12, marginTop: 4 }}>
          Push real (FCM/APNs) requer credenciais de serviço.
        </p>
      </div>

      <div className="card section">
        <strong>Conta</strong>
        <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>
          Sessão: {profile.name} · {profile.role}
        </div>
        <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>
          Segurança (biometria/passkeys), notificações push e mais preferências chegam com as
          credenciais de dispositivo/serviço.
        </p>
      </div>

      <p className="muted" style={{ fontSize: 12, textAlign: 'center', marginTop: 8 }}>
        HOC · Healthcare on Call · uma solução DES · ambiente de demonstração
      </p>
    </div>
  );
}

// ───────────────────────── Other roles ─────────────────────────
function GenericTab({ profile, onMsg }: { profile: Profile; onMsg: (m: string) => void }) {
  const [checked, setChecked] = useState<string | null>(null);
  async function testRbac() {
    try {
      await Api.allConsultations();
      setChecked('Este perfil teve acesso (inesperado nesta demo).');
    } catch (e) {
      if (isForbidden(e)) {
        setChecked('✓ Acesso negado corretamente — o controlo de acessos (RBAC) funciona.');
      } else {
        onMsg(`Erro: ${String(e)}`);
      }
    }
  }
  return (
    <div className="section">
      <div className="card">
        <div style={{ fontSize: 28 }}>{profile.emoji}</div>
        <h2>{profile.name}</h2>
        <p className="muted">
          Sessão como <strong>{profile.role}</strong>. Este perfil ainda não tem ecrã dedicado, mas
          a sessão e as permissões são reais.
        </p>
        <button className="btn secondary" onClick={testRbac}>
          Testar permissão (deve ser negado)
        </button>
        {checked ? <p className="notice" style={{ marginTop: 12 }}>{checked}</p> : null}
      </div>
    </div>
  );
}
