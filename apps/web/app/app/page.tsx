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
  type MyBookingDto,
  type AffectedConsultation,
  type NotificationDto,
  type AdminMetrics,
  type FinanceSeriesDto,
  type FinanceSeriesMonth,
  type StatementEntry,
  type AdminPedRow,
  type AdminUserRow,
  type AdminUserDetail,
  type AuditRow,
  type UserMeDto,
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
  type FamilyMeDto,
  type MarketDto,
  type MarketMonthRow,
} from '@/lib/client';
import type { PediatricianCard, PediatricianDetail, MessageWindow } from '@/lib/types';
import { useT, LanguageSwitcher, appLocale, trs } from '@/lib/i18n';
import { useTheme, type Theme, type TextSize } from '@/lib/theme';
import { assess, wantsPediatrician, type AssistResult } from '@/lib/assist';

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
  return new Intl.NumberFormat(appLocale(), { style: 'currency', currency: 'EUR' }).format(cents / 100);
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
/** Search-normalize: lowercase + strip accents, so "Ines" matches "Inês". */
function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

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
  return new Date(iso).toLocaleString(appLocale(), { dateStyle: 'short', timeStyle: 'short' });
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
// Canonical PT regions (18 districts + 2 autonomous regions) — mirrors the
// backend PT_REGIONS list the /families/me/region endpoint validates against.
const PT_REGIONS = [
  'Aveiro',
  'Beja',
  'Braga',
  'Bragança',
  'Castelo Branco',
  'Coimbra',
  'Évora',
  'Faro',
  'Guarda',
  'Leiria',
  'Lisboa',
  'Portalegre',
  'Porto',
  'Santarém',
  'Setúbal',
  'Viana do Castelo',
  'Vila Real',
  'Viseu',
  'Açores',
  'Madeira',
] as const;

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
/** "9h" / "9h30" — compact hour label for message-window summaries. */
function fmtHourShort(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`;
}
/**
 * Compact weekly summary of message windows, e.g. "seg–sex 9h–19h". Groups
 * weekdays (Monday-first) that share the exact same time range and compresses
 * consecutive runs of 3+ days into "first–last"; otherwise lists the days.
 * `t` translates the weekday abbreviations (WEEKDAYS keys are in the dicts).
 */
function messageWindowsSummary(windows: MessageWindow[] | undefined, t: (s: string) => string): string | null {
  if (!windows || windows.length === 0) return null;
  const MON_FIRST = [1, 2, 3, 4, 5, 6, 0];
  const day = (i: number) => t(WEEKDAYS[MON_FIRST[i]]).toLowerCase();
  const byRange = new Map<string, number[]>(); // "start-end" → Monday-first indexes
  for (const w of windows) {
    const k = `${w.startMinute}-${w.endMinute}`;
    const idx = MON_FIRST.indexOf(w.weekday);
    if (idx < 0) continue;
    const arr = byRange.get(k) ?? [];
    if (!arr.includes(idx)) arr.push(idx);
    byRange.set(k, arr);
  }
  const parts: { first: number; text: string }[] = [];
  for (const [k, idxs] of byRange) {
    idxs.sort((a, b) => a - b);
    const runs: number[][] = [];
    for (const i of idxs) {
      const last = runs[runs.length - 1];
      if (last && i === last[last.length - 1] + 1) last.push(i);
      else runs.push([i]);
    }
    const days = runs
      .map((r) => (r.length >= 3 ? `${day(r[0])}–${day(r[r.length - 1])}` : r.map(day).join(', ')))
      .join(', ');
    const [s, e] = k.split('-').map(Number);
    parts.push({ first: idxs[0], text: `${days} ${fmtHourShort(s)}–${fmtHourShort(e)}` });
  }
  return parts
    .sort((a, b) => a.first - b.first)
    .map((p) => p.text)
    .join(' · ');
}

/** IANA timezone of this device — what every family-facing time renders in. */
const deviceTZ = () => Intl.DateTimeFormat().resolvedOptions().timeZone;
/** PT names for the zones families actually see; anything else falls back to the raw segment. */
const TZ_CITY_PT: Record<string, string> = {
  Lisbon: 'Lisboa',
  Azores: 'Açores',
  Madeira: 'Madeira',
  Madrid: 'Madrid',
  Luanda: 'Luanda',
};
/** Human city label for an IANA zone id: 'Europe/Lisbon' → 'Lisboa'. */
function tzCity(tz: string): string {
  const seg = tz.split('/').pop() ?? tz;
  return TZ_CITY_PT[seg] ?? seg.replace(/_/g, ' ');
}
/**
 * "13:00 em Lisboa" — the instant on the doctor's wall clock, for the moments
 * where the family commits to a time. Null when the device already shares the
 * doctor's timezone (or the zone id is unknown) — a hint must never break booking.
 */
function tzHint(pedTz: string | undefined, instantISO: string): string | null {
  if (!pedTz || deviceTZ() === pedTz) return null;
  try {
    const t = new Date(instantISO).toLocaleTimeString(appLocale(), {
      timeZone: pedTz,
      hour: '2-digit',
      minute: '2-digit',
    });
    return `${t} ${trs('em')} ${tzCity(pedTz)}`;
  } catch {
    return null;
  }
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
        ? d.toLocaleDateString(appLocale(), { month: 'long' })
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
  const { tr } = useT();
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
        {label} — {tr('percentis WHO (P3·P15·P50·P85·P97)')}
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
  const { tr } = useT();
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
      <strong>{tr('⚠️ Possível crescimento insuficiente')}</strong>
      <div className="muted" style={{ marginTop: 4 }}>
        {lowNow ? `${tr('Peso para a idade abaixo do percentil 3 (P3).')} ` : ''}
        {crossedDown ? `${tr('Descida de percentil entre medições.')} ` : ''}
        {tr('Vale a pena avaliar (alimentação, alguma doença, ou a própria medição) — isto é um sinal, não um diagnóstico. Fala com o pediatra.')}
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
 * Reads a picked image and downscales it client-side (canvas) to ≤256×256
 * JPEG, returning a data URL small enough for the API's payload limit. If the
 * first encode is still large (photographic noise), re-encode at lower quality.
 */
async function downscalePhoto(file: File): Promise<string> {
  const raw: string = await new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error('read-failed'));
    r.readAsDataURL(file);
  });
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const im = new Image();
    im.onload = () => resolve(im);
    im.onerror = () => reject(new Error('decode-failed'));
    im.src = raw;
  });
  const scale = Math.min(1, 256 / Math.max(img.width, img.height, 1));
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas-unavailable');
  ctx.drawImage(img, 0, 0, w, h);
  let out = canvas.toDataURL('image/jpeg', 0.82);
  if (out.length > 250_000) out = canvas.toDataURL('image/jpeg', 0.6);
  return out;
}

/**
 * Chat photo downscale — clinical detail matters (rashes, lesions), so keep a
 * much larger long edge than avatar photos: ≤1280px, JPEG q0.8, re-encoded at
 * q0.6 if the data URL still exceeds ~500k chars (API payload limit).
 */
async function downscaleClinicalPhoto(file: File): Promise<string> {
  const raw: string = await new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error('read-failed'));
    r.readAsDataURL(file);
  });
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const im = new Image();
    im.onload = () => resolve(im);
    im.onerror = () => reject(new Error('decode-failed'));
    im.src = raw;
  });
  const scale = Math.min(1, 1280 / Math.max(img.width, img.height, 1));
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas-unavailable');
  ctx.drawImage(img, 0, 0, w, h);
  let out = canvas.toDataURL('image/jpeg', 0.8);
  if (out.length > 500_000) out = canvas.toDataURL('image/jpeg', 0.6);
  return out;
}

/**
 * Round profile-photo picker (family-facing): tap the avatar (or "Alterar
 * foto") to pick/take a photo; it is downscaled client-side and handed to
 * onSave as a data URL. Shows a fallback icon when there is no photo yet.
 */
function AvatarPicker({
  photoUrl,
  fallback,
  size = 72,
  onSave,
  onRemove,
}: {
  photoUrl?: string | null;
  fallback: React.ReactNode;
  size?: number;
  onSave: (dataUrl: string) => Promise<void>;
  onRemove?: () => Promise<void>;
}) {
  const { tr } = useT();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-picking the same file
    if (!file) return;
    setBusy(true);
    try {
      await onSave(await downscalePhoto(file));
    } catch {
      // onSave surfaces its own error message; decode failures stay silent
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <button
        type="button"
        aria-label={tr('Alterar foto')}
        onClick={() => inputRef.current?.click()}
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          border: '1px solid var(--border)',
          background: 'var(--surface-2)',
          padding: 0,
          overflow: 'hidden',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flex: 'none',
        }}
      >
        {photoUrl ? (
          <img
            src={photoUrl}
            alt=""
            style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
          />
        ) : (
          fallback
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="user"
        style={{ display: 'none' }}
        onChange={(e) => void onPick(e)}
      />
      <div className="row" style={{ gap: 6 }}>
        <button
          className="btn small secondary"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
        >
          {busy ? tr('A guardar…') : tr('Alterar foto')}
        </button>
        {photoUrl && onRemove ? (
          <button className="btn small secondary" onClick={() => void onRemove()} disabled={busy}>
            {tr('Remover')}
          </button>
        ) : null}
      </div>
    </div>
  );
}

/** Small round child photo with the usual emoji fallback (list rows, chips). */
function ChildAvatar({ photoUrl, size = 36 }: { photoUrl?: string | null; size?: number }) {
  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt=""
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          objectFit: 'cover',
          flex: 'none',
          verticalAlign: 'middle',
        }}
      />
    );
  }
  return (
    <span aria-hidden style={{ fontSize: Math.round(size * 0.62), lineHeight: 1 }}>
      🧒
    </span>
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
  const { t, tr } = useT();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [tab, setTab] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [onboarding, setOnboarding] = useState(false);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  // Cross-tab deep link: "open this consultation" (from Início, Avisos or a
  // just-created consultation) — consumed by MyConsultsTab/InboxTab on mount.
  const [focusConsult, setFocusConsult] = useState<string | null>(null);
  // Specialty pre-selected + question pre-filled by the Home assistant when
  // routing to "Consultar" (so the parent doesn't re-type what they described).
  const [consultSpec, setConsultSpec] = useState<string | undefined>(undefined);
  const [consultPrefill, setConsultPrefill] = useState<string | undefined>(undefined);
  // Unread-notifications badge on the header bell; refreshed on each tab
  // change (cheap, role-scoped endpoint) so it reacts to reads and new events.
  const [unread, setUnread] = useState(0);
  // Per-page help guide (bottom sheet for the active tab).
  const [helpOpen, setHelpOpen] = useState(false);
  useEffect(() => {
    setHelpOpen(false);
  }, [tab]);
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
      setMsg(trs('A sessão expirou. Entra novamente.'));
    };
    window.addEventListener('hoc:logout', onLogout);
    return () => window.removeEventListener('hoc:logout', onLogout);
  }, []);

  async function enter(p: Profile) {
    setBusy(true);
    if (!hasApi) {
      setMsg(tr('Backend não configurado (NEXT_PUBLIC_API_BASE).'));
      setBusy(false);
      return;
    }
    setMsg(tr('A ligar ao servidor… (pode demorar até ~1 min na primeira utilização)'));
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
      setMsg(`${tr('Não foi possível entrar')}: ${String(e)}`);
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
        <h1 style={{ textAlign: 'center', fontSize: 22 }}>{tr('Bem-vindo à HOC')}</h1>
        <p className="muted" style={{ textAlign: 'center' }}>
          {tr('A saúde do teu filho num só lugar — e um pediatra à distância de uma mensagem.')}
        </p>
        {!hasApi ? (
          <p className="notice">
            {tr('⚠️ Backend não ligado. Sem dados reais — usa a')} <a href="/demo">/demo</a> {tr('(modo local).')}
          </p>
        ) : null}
        {msg ? <p className="notice">{msg}</p> : null}
        <div className="list">{mainProfiles.map(profileRow)}</div>
        {teamProfiles.length ? (
          <details style={{ marginTop: 14 }}>
            <summary className="muted" style={{ cursor: 'pointer', padding: '6px 2px' }}>
              {tr('Perfis de equipa (demonstração)')}
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
              {tr(roleLabel(profile.role))}
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <HelpButton tab={tab} onOpen={() => setHelpOpen(true)} />
          <button
            className="iconbtn"
            aria-label={unread > 0 ? `${tr('Avisos')} — ${unread} ${tr('por ler')}` : tr('Avisos')}
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
            aria-label={tr('Definições')}
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
            onGoConsult={(spec, prefill) => {
              setConsultSpec(spec);
              setConsultPrefill(prefill);
              setMsg('');
              setTab('consult');
            }}
            onOpenConsultation={openConsultation}
          />
        ) : null}
        {tab === 'children' ? <ChildrenTab onMsg={setMsg} /> : null}
        {tab === 'consult' ? (
          <ConsultTab
            onMsg={setMsg}
            onOpenConsultation={openConsultation}
            initialSpecialty={consultSpec}
            initialQuestion={consultPrefill}
            onSpecialtyConsumed={() => {
              setConsultSpec(undefined);
              setConsultPrefill(undefined);
            }}
          />
        ) : null}
        {tab === 'myconsults' ? (
          <MyConsultsTab
            onMsg={setMsg}
            focusId={focusConsult}
            onFocusConsumed={() => setFocusConsult(null)}
            onGoConsults={() => {
              setMsg('');
              setTab('consult');
            }}
          />
        ) : null}
        {tab === 'myaccount' ? (
          <div className="section">
            <h2>{tr('A minha conta')}</h2>
            <AccountProfileCards onMsg={setMsg} />
            <h3>{tr('Plano')}</h3>
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
        {tab === 'agenda' ? <AgendaTab onMsg={setMsg} onOpenConsultation={openConsultation} /> : null}
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

      {helpOpen && HELP[tab] ? (
        <HelpSheet
          tabKey={tab}
          onClose={() => setHelpOpen(false)}
          onGo={(k) => {
            setSettingsOpen(false);
            setMsg('');
            setTab(k);
          }}
        />
      ) : null}

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
    help: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M9.4 9.3a2.6 2.6 0 1 1 3.9 2.3c-.9.5-1.3 1-1.3 2" />
        <path d="M12 16.8h.01" />
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
    ];
  if (role === 'CLINIC_ADMIN' || role === 'CLINIC_STAFF') return [{ key: 'clinic', label: 'Clínica' }];
  return [{ key: 'account', label: 'Conta' }];
}

// ───────────────────────── Per-page help guide ─────────────────────────
// Keyed by tab key (see tabsFor). PT strings here are the translation keys;
// they are tr()-wrapped at render time in HelpSheet.
interface HelpItem {
  icon: string;
  title: string;
  desc: string;
  go?: string;
}
const HELP: Record<string, { title: string; intro: string; items: HelpItem[] }> = {
  // Parent tabs
  home: {
    title: 'Início',
    intro: 'O essencial da saúde dos teus filhos, num só ecrã.',
    items: [
      { icon: '💬', title: 'Falar com um pediatra', desc: 'Envia uma questão ou marca uma videoconsulta.', go: 'consult' },
      { icon: '📅', title: 'Próxima videoconsulta', desc: 'Se tiveres uma marcada, aparece em "A seguir".' },
      { icon: '✉️', title: 'Resposta nova', desc: 'Quando o pediatra responde, surge aqui um cartão para leres.' },
      { icon: '🧒', title: 'As crianças', desc: 'Vacinas, crescimento e histórico de cada criança.', go: 'children' },
      { icon: '🔔', title: 'Avisos no sino', desc: 'O ponto vermelho no sino indica novidades por ler.' },
      { icon: '🆘', title: 'Botão SOS', desc: 'Numa emergência, liga de imediato ao 112 ou SNS 24.' },
    ],
  },
  consult: {
    title: 'Consultar',
    intro: 'Escolhe um pediatra verificado e envia a tua questão.',
    items: [
      { icon: '🩺', title: 'Escolher pediatra', desc: 'Compara especialidade, avaliações e preços de cada um.' },
      { icon: '📝', title: 'Triagem rápida', desc: 'Diz-nos como está a criança; sinais graves são destacados.' },
      { icon: '💬', title: 'Enviar questão', desc: 'Escreve a dúvida e recebes resposta dentro do prazo.' },
      { icon: '🎥', title: 'Marcar videoconsulta', desc: 'Escolhe um horário livre na agenda do pediatra.' },
      { icon: '📂', title: 'Acompanhar resposta', desc: 'Segue a conversa na lista de consultas.', go: 'myconsults' },
    ],
  },
  myconsults: {
    title: 'Consultas',
    intro: 'Todas as tuas consultas, das mais recentes às antigas.',
    items: [
      { icon: '💬', title: 'Abrir uma consulta', desc: 'Toca num cartão para ler e continuar a conversa.' },
      { icon: '🎥', title: 'Entrar no vídeo', desc: 'À hora marcada, o botão da chamada aparece na consulta.' },
      { icon: '📄', title: 'Resumo do pediatra', desc: 'No fim, o pediatra deixa uma nota clínica para a família.' },
      { icon: '⭐', title: 'Avaliar', desc: 'Depois de fechada, avalia a consulta e o pediatra.' },
      { icon: '➕', title: 'Nova questão', desc: 'Precisas de falar de novo? Começa outra consulta.', go: 'consult' },
    ],
  },
  children: {
    title: 'Crianças',
    intro: 'O boletim de saúde digital de cada criança, sempre à mão.',
    items: [
      { icon: '👶', title: 'Adicionar criança', desc: 'Nome e data de nascimento chegam para começar.' },
      { icon: '📈', title: 'Crescimento', desc: 'Regista peso e altura e acompanha as curvas.' },
      { icon: '💉', title: 'Vacinas', desc: 'Acompanha o plano de vacinação da criança.' },
      { icon: '💊', title: 'Alergias e medicação', desc: 'Mantém a lista atualizada — o pediatra vê-a na consulta.' },
      { icon: '🗓️', title: 'Linha do tempo', desc: 'Histórico de episódios, sinais do dia e consultas.' },
    ],
  },
  myaccount: {
    title: 'Conta',
    intro: 'Os teus dados, o plano e a privacidade da família.',
    items: [
      { icon: '👤', title: 'O teu perfil', desc: 'Atualiza o nome e os dados de contacto.' },
      { icon: '💳', title: 'Plano', desc: 'Vê, muda ou cancela a tua subscrição.' },
      { icon: '🧾', title: 'Faturas', desc: 'Consulta as faturas das consultas e do plano.' },
      { icon: '🔒', title: 'Privacidade (RGPD)', desc: 'Gere consentimentos, exporta dados ou apaga a conta.' },
    ],
  },
  // Pediatrician tabs
  inbox: {
    title: 'Caixa',
    intro: 'As consultas das famílias chegam aqui, prontas a responder.',
    items: [
      { icon: '⚠️', title: 'Sinais de alarme primeiro', desc: 'Casos com sinais graves ficam destacados no topo.' },
      { icon: '🎥', title: 'Vídeos de hoje', desc: 'As videoconsultas marcadas para hoje aparecem em destaque.' },
      { icon: '⏱️', title: 'Prazo de resposta', desc: 'Cada questão mostra o limite (SLA) para responderes.' },
      { icon: '💬', title: 'Responder e fechar', desc: 'Abre o cartão, responde e fecha quando terminares.' },
      { icon: '✅', title: 'Respondidas à parte', desc: 'As que aguardam a família ficam numa lista separada.' },
      { icon: '📆', title: 'Filtros de data', desc: 'Filtra por Hoje, 7 dias, 30 dias ou Tudo.' },
    ],
  },
  patients: {
    title: 'Doentes',
    intro: 'As crianças que já acompanhaste, com o processo completo.',
    items: [
      { icon: '🧒', title: 'Lista de doentes', desc: 'Todas as crianças das tuas consultas, por família.' },
      { icon: '📄', title: 'Processo clínico', desc: 'Alergias, medicação, vacinas e crescimento partilhados.' },
      { icon: '🕐', title: 'Histórico de consultas', desc: 'Revê conversas e resumos anteriores de cada criança.' },
    ],
  },
  agenda: {
    title: 'Agenda',
    intro: 'Define quando estás disponível para videoconsultas.',
    items: [
      { icon: '🗓️', title: 'Blocos semanais', desc: 'Cria blocos de disponibilidade por dia da semana.' },
      { icon: '➕', title: 'Adicionar horas', desc: 'Toca numa hora livre para a abrir às famílias.' },
      { icon: '🎥', title: 'Marcações', desc: 'As famílias só marcam dentro dos teus blocos.' },
      { icon: '🗑️', title: 'Remover blocos', desc: 'Fecha horários que já não queres oferecer.' },
    ],
  },
  profile: {
    title: 'Perfil',
    intro: 'O teu cartão público e as ferramentas de trabalho.',
    items: [
      { icon: '👤', title: 'Bio e especialidade', desc: 'O que as famílias veem ao escolher-te.' },
      { icon: '💶', title: 'Serviços e preços', desc: 'Define tipos de consulta, preço e prazo (SLA).' },
      { icon: '📎', title: 'Documentos', desc: 'Envia a cédula e credenciais para verificação.' },
      { icon: '📚', title: 'Publicar no Saber+', desc: 'Escreve artigos; são revistos antes de publicar.' },
      { icon: '🔒', title: 'Subscrição e privacidade', desc: 'Gere o plano, as faturas e os teus dados.' },
    ],
  },
  finance: {
    title: 'Ganhos',
    intro: 'O que recebes das consultas, sem surpresas.',
    items: [
      { icon: '💶', title: 'Líquido recebido', desc: 'O teu valor após a comissão da plataforma.' },
      { icon: '🧾', title: 'Extrato', desc: 'Movimento a movimento, consulta a consulta.' },
      { icon: '📆', title: 'Períodos', desc: 'Filtra por hoje, mês, trimestre ou ano.' },
    ],
  },
  referrals: {
    title: '2ª opinião',
    intro: 'Pede ou dá pareceres a colegas sobre casos teus.',
    items: [
      { icon: '📥', title: 'Recebidos', desc: 'Pedidos de colegas: aceita e dá a tua opinião.' },
      { icon: '📤', title: 'Enviados', desc: 'Acompanha os pareceres que pediste.' },
      { icon: '➕', title: 'Pedir parecer', desc: 'Escolhe uma consulta tua, o colega e o contexto.' },
      { icon: '🔒', title: 'Confidencial', desc: 'O contexto clínico é cifrado e fica entre médicos.' },
    ],
  },
  // Admin tabs
  overview: {
    title: 'Visão da plataforma',
    intro: 'O estado geral do negócio num só ecrã: pessoas, dinheiro e mercado.',
    items: [
      { icon: '📊', title: 'Indicadores no topo', desc: 'Utilizadores, famílias, receita e comissões acumuladas.' },
      { icon: '📝', title: 'Revisão de conteúdos', desc: 'Artigos submetidos por pediatras à espera de aprovação.' },
      { icon: '🗺️', title: 'Mercado', desc: 'Procura vs. oferta por região e especialidade — onde reforçar.' },
      { icon: '📈', title: 'Tendência mensal', desc: 'Consultas e novas famílias mês a mês; passa o rato para valores.' },
      { icon: '👥', title: 'Repartições', desc: 'Utilizadores por perfil, consultas por estado, pediatras por estado.' },
    ],
  },
  verify: {
    title: 'Pediatras',
    intro: 'Verifica as credenciais dos pediatras antes de aparecerem às famílias.',
    items: [
      { icon: '⏳', title: 'Fila de verificação', desc: 'Pediatras pendentes, com os documentos que enviaram.' },
      { icon: '📎', title: 'Ver documentos', desc: 'Abre a cédula e credenciais para confirmar.' },
      { icon: '✅', title: 'Aprovar', desc: 'Depois de verificar, ativa o pediatra no marketplace.' },
      { icon: '⛔', title: 'Suspender', desc: 'Retira um pediatra se algo não estiver conforme.' },
    ],
  },
  admin: {
    title: 'Consultas',
    intro: 'Todas as consultas da plataforma, para supervisão e reembolsos.',
    items: [
      { icon: '🔎', title: 'Ver consultas', desc: 'Estado, tipo, valor e as partes envolvidas.' },
      { icon: '↩️', title: 'Reembolsar', desc: 'Emite um reembolso com motivo — é uma ação financeira.' },
      { icon: '🕐', title: 'Histórico', desc: 'Acompanha a evolução de cada caso ao longo do tempo.' },
    ],
  },
  users: {
    title: 'Utilizadores',
    intro: 'Encontra qualquer conta, muda perfis e ativa ou desativa contas.',
    items: [
      { icon: '🔎', title: 'Pesquisar', desc: 'Escreve nome, email ou telefone para filtrar a lista.' },
      { icon: '🔵', title: 'Filtrar por estado', desc: 'Vê só contas ativas, inativas ou todas.' },
      { icon: '🎚️', title: 'Mudar perfil', desc: 'Altera o papel de um utilizador (só Admin).' },
      { icon: '⛔', title: 'Desativar / reativar', desc: 'Desativar corta o acesso de imediato; reativar devolve-o.' },
    ],
  },
};

function HelpSheet({
  tabKey,
  onClose,
  onGo,
}: {
  tabKey: string;
  onClose: () => void;
  onGo: (k: string) => void;
}) {
  const { tr } = useT();
  const closeRef = useRef<HTMLButtonElement>(null);
  const guide = HELP[tabKey];
  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  if (!guide) return null;
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-label={tr('Guia desta página')}
        onClick={(e) => e.stopPropagation()}
        style={{ maxHeight: '70vh', overflowY: 'auto' }}
      >
        <div className="sheet-grip" />
        <h2 style={{ marginTop: 4 }}>
          {tr('Guia desta página')} · {tr(guide.title)}
        </h2>
        <p className="muted">{tr(guide.intro)}</p>
        <div className="list" style={{ marginTop: 10 }}>
          {guide.items.map((it) => {
            const inner = (
              <>
                <span className="avatar sm" aria-hidden style={{ fontSize: 16 }}>
                  {it.icon}
                </span>
                <span className="lrow-main">
                  <strong>{tr(it.title)}</strong>
                  <span className="muted">{tr(it.desc)}</span>
                </span>
                {it.go ? <span className="chev">›</span> : null}
              </>
            );
            return it.go ? (
              <button
                key={it.title}
                className="lrow"
                onClick={() => {
                  onGo(it.go!);
                  onClose();
                }}
              >
                {inner}
              </button>
            ) : (
              <div key={it.title} className="lrow" style={{ cursor: 'default' }}>
                {inner}
              </div>
            );
          })}
        </div>
        <button
          ref={closeRef}
          className="btn secondary small"
          onClick={onClose}
          style={{ marginTop: 12 }}
        >
          {tr('Fechar')}
        </button>
      </div>
    </div>
  );
}

// "?" header button — only for tabs that have a guide. Shows a red dot until
// the guide is opened once (same localStorage pattern as 'pedia_onboarded').
function HelpButton({ tab, onOpen }: { tab: string; onOpen: () => void }) {
  const { tr } = useT();
  const [seen, setSeen] = useState(true);
  useEffect(() => {
    setSeen(localStorage.getItem('pedia_help_seen') === '1');
  }, []);
  if (!HELP[tab]) return null;
  return (
    <button
      className="iconbtn"
      aria-label={tr('Guia desta página')}
      style={{ position: 'relative' }}
      onClick={() => {
        localStorage.setItem('pedia_help_seen', '1');
        setSeen(true);
        onOpen();
      }}
    >
      <TabIcon name="help" />
      {!seen ? <span className="dot-badge" aria-hidden /> : null}
    </button>
  );
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
  const { tr } = useT();
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
        {open ? '▾' : '▸'} {tr('Ficha da criança')}
      </button>
      {open ? (
        !d ? (
          <span className="muted">{tr('A carregar…')}</span>
        ) : (
          <div style={{ fontSize: 14, marginTop: 6, display: 'grid', gap: 4 }}>
            <div>
              <strong>{tr('Problemas ativos')}:</strong>{' '}
              {problems.length ? problems.map((p) => p.title ?? '—').join(', ') : '—'}
            </div>
            <div>
              <strong>{tr('Medicação')}:</strong>{' '}
              {meds.length
                ? meds.map((m) => `${m.name ?? '—'}${m.dose ? ` (${m.dose})` : ''}`).join(', ')
                : '—'}
            </div>
            <div>
              <strong>{tr('Alergias')}:</strong>{' '}
              {(d.allergies ?? []).length
                ? (d.allergies ?? []).map((a) => a.label ?? '—').join(', ')
                : tr('nenhuma registada')}
            </div>
            <div>
              <strong>{tr('Vacinas')}:</strong> {vaccines.length}{' '}
              {vaccines.length === 1 ? tr('registada') : tr('registadas')}
            </div>
            <div>
              <strong>{tr('Peso recente')}:</strong> {lastWeight != null ? `${lastWeight} kg` : '—'}
            </div>
            {(d.vitals ?? [])[0] ? (
              <div>
                <strong>{tr('Últimos vitais')}:</strong>{' '}
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
  onNewConsultation,
}: {
  consultation: ConsultationDto;
  canClose: boolean;
  canCancel: boolean;
  onChanged: () => void;
  onBack: () => void;
  onMsg: (m: string) => void;
  /** Parent side only: start a new consultation with this pediatrician (CLOSED CTA). */
  onNewConsultation?: () => void;
}) {
  const { tr } = useT();
  const [messages, setMessages] = useState<MessageDto[]>([]);
  const [draft, setDraft] = useState('');
  const [photos, setPhotos] = useState<string[]>([]); // pending attachments (data URLs)
  const [viewer, setViewer] = useState<string | null>(null); // fullscreen image
  const fileRef = useRef<HTMLInputElement | null>(null);
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
      onMsg(tr('Resumo guardado ✓'));
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
      .map((k) => tr(RED_FLAGS.find((f) => f.key === k)?.label ?? k))
      .filter(Boolean);
    const motivo = flagLabels.length
      ? `${tr('Triagem assinalou:')} ${flagLabels.join('; ')}.`
      : tr('Sem sinais de alarme assinalados na triagem.');
    const urgencia = triage.severe ? `\n${tr('⚠️ Triagem indicou sinais graves — avaliar prioridade.')}` : '';
    const tpl =
      `${tr('Motivo / queixa:')}\n${motivo}${urgencia}\n\n` +
      `${tr('Avaliação:')}\n- \n\n` +
      `${tr('Orientação / plano:')}\n- \n\n` +
      `${tr('Sinais de alarme a vigiar:')}\n- ${tr('Recorrer a urgência se agravamento, febre persistente, recusa alimentar ou prostração.')}\n\n` +
      `${tr('Seguimento:')}\n- `;
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
      onMsg(tr('Este browser não suporta ditado por voz (tenta o Chrome).'));
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
      onMsg(`${tr('Ditado')}: ${e.error}`);
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
      onMsg(tr('Escreve ou dita a nota primeiro.'));
      return;
    }
    setBusy(true);
    try {
      const r = await Api.structureSummary(consultation.id, sumDraft);
      setSumDraft(r.text);
      setEditSum(true);
      onMsg(tr('Nota estruturada com IA — revê antes de guardar.'));
    } catch (e) {
      onMsg(`${tr('IA indisponível:')} ${String(e)} ${tr('(precisa de ANTHROPIC_API_KEY no backend)')}`);
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
    if (!draft.trim() && photos.length === 0) return;
    setBusy(true);
    try {
      await Api.sendMessage(consultation.id, draft.trim(), photos.length ? photos : undefined);
      setDraft('');
      setPhotos([]);
      await load();
    } catch (e) {
      onMsg(`Erro ao enviar: ${String(e)}`);
    } finally {
      setBusy(false);
    }
  }

  /** Pick chat photos: images only, ≤3 per message, downscaled client-side. */
  async function pickPhotos(files: FileList | null) {
    if (!files || files.length === 0) return;
    const list = Array.from(files);
    if (fileRef.current) fileRef.current.value = ''; // allow re-picking the same file
    const room = 3 - photos.length;
    if (list.length > room) onMsg(tr('Máximo de 3 fotos por mensagem.'));
    for (const f of list.slice(0, Math.max(0, room))) {
      if (!f.type.startsWith('image/')) {
        onMsg(tr('Só são permitidas imagens.'));
        continue;
      }
      try {
        const url = await downscaleClinicalPhoto(f);
        setPhotos((p) => (p.length >= 3 ? p : [...p, url]));
      } catch {
        onMsg(tr('Não foi possível ler a imagem.'));
      }
    }
  }

  // Fullscreen viewer closes on Escape (and on backdrop tap / ✕).
  useEffect(() => {
    if (!viewer) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setViewer(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [viewer]);
  async function close() {
    setBusy(true);
    try {
      await Api.closeConsultation(consultation.id);
      onMsg(tr('Consulta fechada ✓'));
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
      onMsg(tr('Consulta cancelada e reembolsada ✓'));
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
        {tr('← Voltar')}
      </button>
      <div className="card">
        <span className={statusPill(consultation.status)}>{tr(statusLabel(consultation.status))}</span>{' '}
        <strong>{tr(svcLabel(consultation.type))}</strong>
        {canCancel && consultation.status === 'ANSWERED' ? (
          <span className="pill ok" style={{ marginLeft: 6 }}>
            {tr('Pago')} · {euro(consultation.priceCents)} — {tr('seguimento incluído')}
          </span>
        ) : null}
        <div className="muted">
          {euro(consultation.priceCents)} · {tr('aberta')} {when(consultation.openedAt)}
        </div>
        {consultation.status === 'REFUNDED' &&
        consultation.refundReason === 'pediatrician_unavailable' ? (
          <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>
            {tr('Cancelada por indisponibilidade do pediatra · valor reembolsado')}
          </div>
        ) : null}
        {canCancel &&
        consultation.expectedReplyAt &&
        (consultation.status === 'OPEN' || consultation.status === 'TRIAGE') ? (
          <div style={{ color: 'var(--info)', fontSize: 13, marginTop: 4 }}>
            ⏱️ {tr('Resposta prevista até')} {when(consultation.expectedReplyAt)}
          </div>
        ) : null}
        {consultation.type === 'VIDEO' && consultation.status !== 'CLOSED' ? (
          <button className="btn small" onClick={joinVideo} disabled={busy} style={{ marginTop: 8 }}>
            {tr('Entrar na videochamada')}
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
              {tr('Triagem da família')}{tri.severe ? ` ${tr('— sinais graves assinalados ⚠️')}` : ''}
            </strong>
            <div className="row" style={{ flexWrap: 'wrap', gap: 6 }}>
              {tri.redFlags.map((k) => (
                <span key={k} className="pill warn">
                  {tr(RED_FLAGS.find((f) => f.key === k)?.label ?? k)}
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
          <strong>{tr('Resumo do pediatra')}</strong>
          <p style={{ whiteSpace: 'pre-wrap', margin: '6px 0 0' }}>{summary}</p>
          {canClose ? (
            <button className="btn secondary small" onClick={() => setEditSum(true)} style={{ marginTop: 8 }}>
              {tr('Editar resumo')}
            </button>
          ) : null}
        </div>
      ) : null}
      {canClose && (editSum || !summary) ? (
        <div className="card section">
          <strong>{tr('Resumo / nota clínica')}</strong>
          <textarea
            placeholder={tr('Resumo da consulta para a família…')}
            value={sumDraft}
            onChange={(e) => setSumDraft(e.target.value)}
            rows={6}
          />
          <div className="row" style={{ marginTop: 8 }}>
            <button className="btn small secondary" onClick={genDraft} disabled={busy} title={tr('Pré-preenche um esqueleto a partir da triagem')}>
              {tr('Gerar rascunho')}
            </button>
            {speechSupported ? (
              <button
                className={dictating ? 'btn small danger' : 'btn small secondary'}
                onClick={toggleDictation}
                disabled={busy}
                title={tr('Dita a nota clínica por voz (transcrição no browser)')}
              >
                {dictating ? tr('Parar ditado') : tr('Ditar nota')}
              </button>
            ) : null}
            <button
              className="btn small secondary"
              onClick={structureWithAi}
              disabled={busy || !sumDraft.trim()}
              title={tr('Corrige e organiza a nota em SOAP com IA (revê antes de guardar)')}
            >
              {tr('Estruturar com IA')}
            </button>
            <button className="btn small" onClick={saveSummary} disabled={busy || !sumDraft.trim()}>
              {tr('Guardar resumo')}
            </button>
          </div>
          {dictating ? (
            <p className="muted" style={{ fontSize: 12, marginTop: 6 }}>
              {tr('A ouvir… fala a tua nota. (A transcrição é feita pelo serviço de voz do browser.)')}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="chat">
        {(() => {
          // Episode timeline: messages + state events (opened/answered/closed)
          // in one chronological stream, with day separators between days.
          type ChatItem =
            | { key: string; at: string; kind: 'msg'; m: MessageDto }
            | { key: string; at: string; kind: 'sys'; label: string };
          const sys: { at: string | null; label: string }[] = [
            { at: consultation.openedAt, label: tr('Consulta aberta') },
            { at: consultation.answeredAt, label: tr('Pediatra respondeu') },
            { at: consultation.closedAt, label: tr('Consulta encerrada') },
          ];
          const items: ChatItem[] = [
            ...messages.map((m): ChatItem => ({ key: m.id, at: m.createdAt, kind: 'msg', m })),
            ...sys
              .filter((s): s is { at: string; label: string } => !!s.at)
              .map((s, i): ChatItem => ({ key: `sys-${i}`, at: s.at, kind: 'sys', label: s.label })),
          ].sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
          let lastDay = '';
          const out = items.map((it) => {
            const dayKey = new Date(it.at).toDateString();
            const sep =
              dayKey !== lastDay ? (
                <div key={`day-${it.key}`} style={{ textAlign: 'center', margin: '10px 0 4px' }}>
                  <span className="pill" style={{ fontSize: 11 }}>
                    {new Date(it.at).toLocaleDateString(appLocale(), {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'long',
                    })}
                  </span>
                </div>
              ) : null;
            lastDay = dayKey;
            if (it.kind === 'sys') {
              return (
                <Fragment key={it.key}>
                  {sep}
                  <div
                    className="muted"
                    style={{ textAlign: 'center', fontSize: 12, margin: '4px 0' }}
                  >
                    {it.label}
                  </div>
                </Fragment>
              );
            }
            const m = it.m;
            const mine = !!myId && m.senderUserId === myId;
            return (
              <Fragment key={it.key}>
                {sep}
                <div className={mine ? 'bubble me' : 'bubble them'}>
                  {m.attachments?.length ? (
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: m.attachments.length > 1 ? '1fr 1fr' : '1fr',
                        gap: 4,
                        marginBottom: m.body ? 6 : 0,
                      }}
                    >
                      {m.attachments.map((a, i) => (
                        <button
                          key={i}
                          type="button"
                          aria-label={tr('Ampliar imagem')}
                          onClick={() => setViewer(a)}
                          style={{ padding: 0, border: 0, background: 'none', cursor: 'zoom-in' }}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={a}
                            alt={tr('Foto enviada na conversa')}
                            style={{ maxWidth: 140, width: '100%', borderRadius: 8, display: 'block' }}
                          />
                        </button>
                      ))}
                    </div>
                  ) : null}
                  {m.body ? <span>{m.body}</span> : null}
                  <span className="bubble-time">{when(m.createdAt)}</span>
                </div>
              </Fragment>
            );
          });
          return (
            <>
              {out}
              {messages.length === 0 ? <p className="muted">{tr('Ainda sem mensagens.')}</p> : null}
            </>
          );
        })()}
      </div>

      {consultation.status !== 'CLOSED' && consultation.status !== 'REFUNDED' ? (
        <div className="card section">
          {photos.length ? (
            <div className="row" style={{ gap: 10, marginBottom: 8 }}>
              {photos.map((p, i) => (
                <span key={i} style={{ position: 'relative', display: 'inline-block' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p}
                    alt={`${tr('Foto')} ${i + 1}`}
                    style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 8, display: 'block' }}
                  />
                  <button
                    type="button"
                    aria-label={tr('Remover foto')}
                    onClick={() => setPhotos((arr) => arr.filter((_, j) => j !== i))}
                    style={{
                      position: 'absolute',
                      top: -6,
                      right: -6,
                      width: 20,
                      height: 20,
                      borderRadius: 10,
                      border: 0,
                      padding: 0,
                      background: 'var(--danger)',
                      color: '#fff',
                      fontSize: 11,
                      lineHeight: '20px',
                      cursor: 'pointer',
                    }}
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>
          ) : null}
          <textarea
            placeholder={tr('Escrever mensagem…')}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={2}
          />
          <div className="row" style={{ marginTop: 8 }}>
            <button
              className="btn"
              onClick={send}
              disabled={busy || (!draft.trim() && photos.length === 0)}
            >
              {tr('Enviar')}
            </button>
            {/* No capture attr: iOS then offers both camera and photo library. */}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={(e) => void pickPhotos(e.target.files)}
            />
            <button
              type="button"
              className="btn secondary"
              aria-label={tr('Adicionar fotos')}
              title={tr('Adicionar fotos')}
              onClick={() => fileRef.current?.click()}
              disabled={busy || photos.length >= 3}
            >
              📷
            </button>
            {canClose ? (
              <button className="btn secondary" onClick={close} disabled={busy}>
                {tr('Fechar consulta')}
              </button>
            ) : null}
            {canCancel && (consultation.status === 'OPEN' || consultation.status === 'TRIAGE') ? (
              <button className="btn danger" onClick={cancel} disabled={busy}>
                {tr('Cancelar (reembolso)')}
              </button>
            ) : null}
          </div>
          {canCancel && consultation.type !== 'VIDEO' ? (
            <p className="muted" style={{ fontSize: 12, margin: '6px 0 0' }}>
              {tr('Incluído nesta consulta')}
            </p>
          ) : null}
        </div>
      ) : null}

      {/* Episode end: explicit terminal block instead of a silently missing composer. */}
      {consultation.status === 'CLOSED' ? (
        <div style={{ textAlign: 'center', marginTop: 14 }}>
          <div className="muted" style={{ fontSize: 13 }}>
            — {tr('Consulta encerrada')}
            {consultation.closedAt
              ? ` · ${new Date(consultation.closedAt).toLocaleDateString(appLocale(), {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}`
              : ''}{' '}
            —
          </div>
          {canCancel && onNewConsultation ? (
            <button className="btn" style={{ marginTop: 10 }} onClick={onNewConsultation}>
              {tr('Nova consulta')} · {euro(consultation.priceCents)}
            </button>
          ) : null}
        </div>
      ) : null}

      {/* Fullscreen photo viewer — native pinch/scroll zoom, ✕ or Escape closes. */}
      {viewer ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={tr('Imagem em ecrã inteiro')}
          onClick={() => setViewer(null)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            background: 'rgba(8, 10, 18, 0.92)',
            overflow: 'auto',
            touchAction: 'pinch-zoom',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
        >
          <button
            type="button"
            aria-label={tr('Fechar imagem')}
            onClick={() => setViewer(null)}
            style={{
              position: 'fixed',
              top: 12,
              right: 12,
              width: 44,
              height: 44,
              borderRadius: 22,
              border: 0,
              background: 'rgba(255, 255, 255, 0.18)',
              color: '#fff',
              fontSize: 20,
              cursor: 'pointer',
            }}
          >
            ✕
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={viewer}
            alt={tr('Foto ampliada')}
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '100%', maxHeight: '100%', borderRadius: 8 }}
          />
        </div>
      ) : null}
    </div>
  );
}

// ───────────────────────── Parent: Início (home) ─────────────────────────
/** Answers "what should I do now?": primary action, what's happening,
 *  the children, and a taste of Saber+ — no forms, no jargon. */
// First-help copy per assistant topic — safe, general, NON-diagnostic. PT keys
// are tr()-wrapped at render; every card also shows the shared disclaimer.
const ASSIST_COPY: Record<string, string> = {
  emergency:
    'Se há sinais graves, não esperes. Liga já 112. Para aconselhamento imediato, liga SNS 24 (808 24 24 24).',
  fever:
    'Mantém a criança hidratada e vestida de forma leve e vigia a temperatura. Se a febre passar dos 3 dias, ou surgir prostração, dificuldade a respirar ou manchas na pele, procura ajuda com urgência.',
  highfever:
    'Febre há vários dias merece avaliação. Mantém a hidratação e vigia sinais de alarme. O melhor é falares com um pediatra ainda hoje.',
  dehydration:
    'Oferece líquidos em pequenas quantidades e com frequência. Se não urina há muitas horas, está muito prostrado ou sem lágrimas, procura ajuda hoje.',
  persistentvomit:
    'Oferece líquidos aos golos. Vómitos que não param, com sangue, ou sem urinar merecem avaliação hoje.',
  severepain: 'Dor intensa merece avaliação. Um pediatra pode orientar-te ainda hoje.',
  skin:
    'Muitas erupções da pele são benignas. Evita coçar e mantém a pele limpa e hidratada. Um dermatologista pediátrico pode avaliar por vídeo ou mensagem.',
  allergy:
    'Sintomas de alergia (espirros, comichão, olhos a lacrimejar) aliviam evitando o desencadeante. Um alergologista ajuda a confirmar e tratar.',
  respiratory:
    'Tosse e pieira devem ser vigiadas. Se houver dificuldade a respirar, lábios azulados ou adejo nasal, é urgente. Caso contrário, um pneumologista pediátrico pode avaliar.',
  digestive:
    'Em queixas digestivas, mantém a hidratação e uma alimentação leve. Se houver sangue, vómitos persistentes ou dor intensa, procura ajuda. Um gastroenterologista pode orientar.',
  neuro:
    'Dores de cabeça frequentes merecem avaliação. Se forem súbitas e muito intensas, ou com vómitos e sonolência, procura ajuda urgente.',
  cardiac:
    'Sopros e palpitações devem ser avaliados por um cardiologista pediátrico. Se houver falta de ar ou lábios azulados, é urgente.',
  newborn:
    'Nos recém-nascidos, qualquer febre ou recusa alimentar merece avaliação rápida. Um neonatologista ou pediatra pode orientar-te.',
  sleep:
    'Rotinas de sono consistentes ajudam. Se o sono estiver muito perturbado, um pediatra pode aconselhar-te.',
  cold:
    'As constipações melhoram com repouso e hidratação. Vigia a febre e a respiração. Um pediatra ajuda se os sintomas persistirem.',
  vaccine: 'Posso ajudar a esclarecer o plano de vacinas. Um pediatra confirma o que falta e quando.',
  growth:
    'Para dúvidas de crescimento, o registo de peso e altura ajuda. Vê as curvas na ficha da criança; um pediatra interpreta contigo.',
  fall:
    'Numa queda, vigia se bateu com a cabeça, se vomitou, se está muito sonolento ou com dor que não passa — nesses casos procura ajuda com urgência. Se está bem e ativo, vigia nas próximas horas. Um pediatra pode orientar-te.',
  general:
    'Conta-me um pouco mais — o que se passa e há quanto tempo. A partir daí encaminho-te para o pediatra certo.',
};

// Quick-start chips: label shown, fill submitted as if typed.
const ASSIST_CHIPS: { label: string; fill: string }[] = [
  { label: 'Febre', fill: 'Tem febre' },
  { label: 'Erupção na pele', fill: 'Tem uma erupção na pele com comichão' },
  { label: 'Tosse', fill: 'Está com tosse' },
  { label: 'Dor de barriga', fill: 'Tem dor de barriga e vómitos' },
  { label: 'Não dorme', fill: 'Não dorme bem à noite' },
];

// Parent Home — an AI-style assistant box ("Em que posso ajudar?"). Deliberately
// minimal: the parent describes the problem in natural language, gets safe first
// guidance + red-flag escalation, and is routed to the right pediatrician. All
// other surfaces live in the bottom tab bar. Analysis is fully client-side
// (lib/assist) so it works offline / without an AI key and nothing clinical
// leaves the device until a consultation is actually started.
// Parent Home — a conversational AI assistant ("Em que posso ajudar?"). The
// parent describes the problem in natural language and can keep talking: the
// assistant answers, may ask a short follow-up, and routes to the right
// pediatrician when ready. Safety stays deterministic: every parent turn runs
// through lib/assist, and any red flag shows the 112/SNS 24 escalation
// immediately (never via the LLM). The LLM (server-side, only with a key) just
// carries the empathetic dialogue; in demo mode it falls back to deterministic
// guidance. Fully client-driven — nothing clinical leaves the device until a
// consultation is actually started.
type ChatMsg = { role: 'user' | 'assistant'; text: string };
const SEV_RANK: Record<string, number> = { info: 0, caution: 1, emergency: 2 };

function HomeTab({
  profile,
  onGo,
  onGoConsult,
  onOpenConsultation,
}: {
  profile: Profile;
  onMsg: (m: string) => void;
  onGo: (tab: string) => void;
  onGoConsult: (specialty?: string, prefill?: string) => void;
  onOpenConsultation: (id: string) => void;
}) {
  const { tr } = useT();
  const [consults, setConsults] = useState<ConsultationDto[]>([]);
  const [msgs, setMsgs] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [spec, setSpec] = useState<string | null>(null);
  const [severity, setSeverity] = useState<'info' | 'caution' | 'emergency' | null>(null);
  // Parent asked to reach a pediatrician → surface the routing card inline.
  const [showRoute, setShowRoute] = useState(false);
  // Generating the AI handover summary right before routing.
  const [routing, setRouting] = useState(false);
  const askSeq = useRef(0);
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    Api.myConsultations().then(setConsults).catch(() => {});
  }, []);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [msgs, busy]);

  const answered = consults.filter((c) => c.status === 'ANSWERED');
  const firstName = (profile.name || '').split(' ')[0];
  const started = msgs.length > 0;
  const prefill = msgs.filter((m) => m.role === 'user').map((m) => m.text).join('. ');

  function send(raw: string) {
    const t = raw.trim();
    if (!t || busy) return;
    const det = assess(t);
    const nextSpec = det.specialty ?? spec;
    const worse =
      !severity || SEV_RANK[det.severity] > SEV_RANK[severity] ? det.severity : severity;
    const history: ChatMsg[] = [...msgs, { role: 'user', text: t }];
    setMsgs(history);
    setInput('');
    setSpec(nextSpec);
    setSeverity(worse);
    // If the parent signals they want a pediatrician, surface the routing card.
    if (wantsPediatrician(t)) setShowRoute(true);
    // Emergencies are handled deterministically — the red card renders from
    // `severity`; never route them through the LLM.
    if (det.severity === 'emergency') return;
    setBusy(true);
    const seq = ++askSeq.current;
    const fallback = tr(ASSIST_COPY[det.topic] ?? ASSIST_COPY.general);
    Api.aiAssistChat(history, nextSpec ? tr(specLabel(nextSpec)) : undefined)
      .then((res) => {
        if (askSeq.current !== seq) return;
        const text = (res.text || '').trim();
        setMsgs((h) => [...h, { role: 'assistant', text: text || fallback }]);
      })
      .catch(() => {
        if (askSeq.current !== seq) return;
        setMsgs((h) => [...h, { role: 'assistant', text: fallback }]);
      })
      .finally(() => {
        if (askSeq.current === seq) setBusy(false);
      });
  }

  function restart() {
    askSeq.current++;
    setMsgs([]);
    setInput('');
    setSpec(null);
    setSeverity(null);
    setShowRoute(false);
    setBusy(false);
  }

  // Route to the marketplace (pick pediatrician → message or video). Before
  // navigating, ask the AI to summarize the conversation as a handover for the
  // pediatrician; in demo mode (no key) it returns '' and we fall back to the
  // parent's own words. Either way the triage question arrives pre-filled.
  async function goToConsult() {
    if (routing) return;
    if (!msgs.length) {
      onGoConsult(spec ?? undefined, undefined);
      return;
    }
    setRouting(true);
    let handover = prefill;
    try {
      const res = await Api.aiAssistSummary(msgs);
      if (res.text && res.text.trim()) handover = res.text.trim();
    } catch {
      /* keep the raw messages */
    }
    onGoConsult(spec ?? undefined, handover);
  }

  return (
    <div className="section">
      {!started && answered.length > 0 ? (
        <button
          className="card"
          onClick={() => onOpenConsultation(answered[0].id)}
          style={{ display: 'block', width: '100%', textAlign: 'left', marginBottom: 12 }}
        >
          <span className="pill ok">{tr('Resposta nova')}</span>
          <strong style={{ display: 'block', marginTop: 6 }}>
            {tr('O pediatra respondeu')}
            {answered[0].child?.name ? ` ${tr('sobre')} ${answered[0].child.name}` : ''}
          </strong>
          <span className="muted">{tr('Toca para ler a resposta.')}</span>
        </button>
      ) : null}

      {!started ? (
        <div style={{ textAlign: 'center', marginTop: '5vh' }}>
          <div className="muted" style={{ fontSize: 13 }}>{tr('Assistente HOC')}</div>
          <h1 style={{ fontSize: 26, margin: '6px 0 4px', lineHeight: 1.2 }}>
            {firstName ? `${tr('Olá')}, ${firstName}. ` : ''}
            {tr('Em que posso ajudar?')}
          </h1>
          <p className="muted" style={{ margin: '0 auto 16px', maxWidth: 460 }}>
            {tr('Descreve o que se passa com o teu filho. Dou-te uma primeira orientação e encaminho-te para o pediatra certo.')}
          </p>
        </div>
      ) : null}

      {/* Conversation thread. */}
      {started ? (
        <div style={{ maxWidth: 640, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {msgs.map((m, i) =>
            m.role === 'user' ? (
              <div
                key={i}
                style={{
                  alignSelf: 'flex-end',
                  maxWidth: '85%',
                  background: 'var(--accent)',
                  color: '#fff',
                  borderRadius: '14px 14px 4px 14px',
                  padding: '9px 12px',
                }}
              >
                {m.text}
              </div>
            ) : (
              <div
                key={i}
                className="card"
                style={{ alignSelf: 'flex-start', maxWidth: '90%', borderRadius: '14px 14px 14px 4px', margin: 0 }}
              >
                {m.text}
              </div>
            ),
          )}
          {busy ? (
            <div className="card muted" style={{ alignSelf: 'flex-start', borderRadius: '14px 14px 14px 4px', margin: 0 }}>
              {tr('A escrever…')}
            </div>
          ) : null}

          {severity === 'emergency' ? (
            <div className="card" style={{ borderColor: '#f0b8be', background: '#fde4e7', color: '#3d0f14', margin: 0 }}>
              <strong style={{ fontSize: 16 }}>{tr('Isto pode ser urgente')}</strong>
              <p style={{ margin: '6px 0 10px' }}>{tr(ASSIST_COPY.emergency)}</p>
              <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
                <a
                  className="btn"
                  href="tel:112"
                  style={{ background: '#c0392b', display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }}
                >
                  {tr('Ligar 112')}
                </a>
                <a
                  className="btn secondary"
                  href="tel:808242424"
                  style={{ display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }}
                >
                  {tr('Ligar SNS 24')}
                </a>
              </div>
            </div>
          ) : null}

          {/* Surfaced when the parent asks to reach a pediatrician. */}
          {showRoute && severity !== 'emergency' ? (
            <div className="card" style={{ borderColor: 'var(--accent)', margin: 0 }}>
              <strong>{tr('Vamos falar com um pediatra')}</strong>
              <p className="muted" style={{ margin: '4px 0 10px', fontSize: 13 }}>
                {tr('Escolhe o pediatra e inicia por mensagem ou vídeo. Levo um resumo da vossa conversa para o pediatra ter contexto.')}
              </p>
              <button type="button" className="btn" onClick={goToConsult} disabled={routing}>
                {routing ? tr('A preparar resumo…') : tr('Escolher pediatra')}
              </button>
            </div>
          ) : null}
          <div ref={endRef} />
        </div>
      ) : null}

      {/* Composer — always present, so the conversation can continue. */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        style={{ maxWidth: 640, margin: started ? '12px auto 0' : '0 auto' }}
      >
        <div style={{ position: 'relative' }}>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            placeholder={started ? tr('Escreve a tua resposta…') : tr('Ex.: febre há 2 dias, 3 anos, e está muito queixoso')}
            rows={2}
            style={{ width: '100%', borderRadius: 16, padding: '14px 54px 14px 16px', resize: 'none', fontSize: 16 }}
          />
          <button
            type="submit"
            className="btn"
            aria-label={tr('Perguntar')}
            disabled={busy || !input.trim()}
            style={{ position: 'absolute', right: 8, bottom: 10, borderRadius: 12, padding: '8px 13px', fontSize: 17 }}
          >
            →
          </button>
        </div>
      </form>

      {/* Routing + secondary actions. */}
      <div className="row" style={{ justifyContent: 'center', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
        <button
          type="button"
          className={started ? 'btn' : 'btn secondary'}
          onClick={goToConsult}
          disabled={routing}
        >
          {routing ? tr('A preparar resumo…') : tr('Falar com um pediatra')}
        </button>
        {started ? (
          <button type="button" className="btn secondary" onClick={restart} disabled={routing}>
            {tr('Recomeçar')}
          </button>
        ) : null}
      </div>

      {!started ? (
        <div className="row" style={{ flexWrap: 'wrap', gap: 6, justifyContent: 'center', marginTop: 10 }}>
          {ASSIST_CHIPS.map((c) => (
            <button key={c.label} type="button" className="chip" onClick={() => send(tr(c.fill))}>
              {tr(c.label)}
            </button>
          ))}
        </div>
      ) : null}

      {started ? (
        <p className="muted" style={{ fontSize: 12, textAlign: 'center', margin: '10px auto 0', maxWidth: 640 }}>
          {tr('Isto é uma orientação geral e não substitui uma avaliação médica.')}
        </p>
      ) : null}

      <p className="muted" style={{ textAlign: 'center', fontSize: 12, marginTop: 24 }}>
        {tr('Emergência?')} <a href="tel:112">112</a> · {tr('SNS 24')}{' '}
        <a href="tel:808242424">808 24 24 24</a>
      </p>
    </div>
  );
}

// ───────────────────────── Parent: Children ─────────────────────────
function ChildrenTab({ onMsg }: { onMsg: (m: string) => void }) {
  const { tr } = useT();
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
    if (!name || !birthDate) return onMsg(tr('Indica nome e data de nascimento.'));
    if (!consent) return onMsg(tr('Tens de autorizar o tratamento de dados de saúde.'));
    setBusy(true);
    try {
      await Api.addChild({ name, birthDate, sex: sex || undefined, healthDataConsent: true });
      setName('');
      setBirthDate('');
      setSex('');
      setConsent(false);
      onMsg(tr('Criança adicionada ✓'));
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
      <h2>{tr('As crianças')}</h2>
      {children.length === 0 ? (
        <p className="muted">{tr('Vamos começar pelo teu filho — adiciona-o para guardar vacinas, crescimento e consultas num só sítio.')}</p>
      ) : (
        <div className="grid">
          {children.map((c) => (
            <button
              key={c.id}
              className="card"
              onClick={() => setOpen(c)}
              style={{ textAlign: 'left', cursor: 'pointer' }}
            >
              <div className="row" style={{ alignItems: 'center', gap: 10, flexWrap: 'nowrap' }}>
                <ChildAvatar photoUrl={c.photoUrl} size={40} />
                <div style={{ minWidth: 0 }}>
                  <strong>{c.name}</strong>
                  <div className="muted">
                    {new Date(c.birthDate).toLocaleDateString(appLocale())} · {tr('ver saúde →')}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
      <div className="card section">
        <h3>{tr('Adicionar criança')}</h3>
        <input placeholder={tr('Nome')} value={name} onChange={(e) => setName(e.target.value)} />
        <input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
        <select value={sex} onChange={(e) => setSex(e.target.value)} style={{ display: 'block', margin: '8px 0' }}>
          <option value="">{tr('Sexo — para as curvas de crescimento certas…')}</option>
          <option value="M">{tr('Masculino')}</option>
          <option value="F">{tr('Feminino')}</option>
        </select>
        <label className="muted" style={{ display: 'block', margin: '8px 0' }}>
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            style={{ width: 'auto', marginRight: 8 }}
          />
          {tr('Autorizo o tratamento dos dados de saúde do meu filho 🔒')}
        </label>
        <button className="btn" onClick={add} disabled={busy}>
          {tr('Adicionar')}
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
  const { tr } = useT();
  const [d, setD] = useState<HealthOverview | null>(null);
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState<'main' | 'timeline' | 'boletim'>('main');
  const [photo, setPhoto] = useState<string | null>(child.photoUrl ?? null);
  // SNS/utente number — comes from the child DETAIL fetch (lists never carry it).
  const [sns, setSns] = useState<string | null>(null);
  const [snsEdit, setSnsEdit] = useState(false);
  const [snsInput, setSnsInput] = useState('');
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
    // Decrypted SNS number lives on the child detail only — older backends
    // don't have the endpoint, so the row just stays in its "add" state.
    Api.childDetail(child.id)
      .then((c) => setSns(c.snsNumber ?? null))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [child.id]);

  async function saveSns(value: string | null) {
    setBusy(true);
    try {
      await Api.setChildSns(child.id, value);
      setSns(value);
      setSnsEdit(false);
      setSnsInput('');
      onMsg(value ? tr('Número SNS guardado ✓') : tr('Número SNS removido ✓'));
    } catch (e) {
      onMsg(`Erro: ${String(e)}`);
    } finally {
      setBusy(false);
    }
  }

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
    return <BoletimView child={child} d={d} snsNumber={sns} onBack={() => setView('main')} />;
  }

  return (
    <div className="section">
      <button className="btn secondary small" onClick={onBack} style={{ marginBottom: 12 }}>
        {tr('← Voltar')}
      </button>
      <div className="row" style={{ alignItems: 'center', gap: 12 }}>
        <AvatarPicker
          size={56}
          photoUrl={photo}
          fallback={
            <span aria-hidden style={{ fontSize: 26, lineHeight: 1 }}>
              🧒
            </span>
          }
          onSave={async (dataUrl) => {
            try {
              await Api.setChildPhoto(child.id, dataUrl);
              setPhoto(dataUrl);
              onMsg(tr('Foto atualizada ✓'));
            } catch (e) {
              onMsg(`Erro: ${String(e)}`);
            }
          }}
        />
        <h2 style={{ margin: 0 }}>{child.name}</h2>
      </div>
      <p className="muted">
        {new Date(child.birthDate).toLocaleDateString(appLocale())} · {tr('os dados de saúde do teu filho, guardados em segurança 🔒')}
      </p>
      <div className="row" style={{ alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 2 }}>
        <strong style={{ fontSize: 13 }}>{tr('SNS')}</strong>
        {snsEdit ? (
          <>
            <input
              inputMode="numeric"
              maxLength={12}
              placeholder={tr('N.º de utente')}
              value={snsInput}
              onChange={(e) => setSnsInput(e.target.value.replace(/\D/g, '').slice(0, 12))}
              style={{ width: 140 }}
            />
            <button
              className="btn small"
              disabled={busy || !snsInput}
              onClick={() => void saveSns(snsInput)}
            >
              {tr('Guardar')}
            </button>
            <button
              className="btn small secondary"
              onClick={() => {
                setSnsEdit(false);
                setSnsInput('');
              }}
            >
              {tr('Cancelar')}
            </button>
            {sns ? (
              <button className="btn small danger" disabled={busy} onClick={() => void saveSns(null)}>
                {tr('Remover')}
              </button>
            ) : null}
          </>
        ) : sns ? (
          <>
            <span>{sns}</span>
            <button
              className="btn small secondary"
              onClick={() => {
                setSnsInput(sns);
                setSnsEdit(true);
              }}
            >
              {tr('Editar')}
            </button>
          </>
        ) : (
          <button className="btn small secondary" onClick={() => setSnsEdit(true)}>
            {tr('+ Adicionar')}
          </button>
        )}
      </div>
      <p className="muted" style={{ fontSize: 12, marginTop: 2 }}>
        {tr('Número de utente (SNS) — opcional. Facilita a referenciação ao SNS. Guardado cifrado.')}
      </p>
      <div className="row" style={{ marginBottom: 4 }}>
        <button className="btn small secondary" onClick={() => setView('timeline')}>
          {tr('🕒 Linha do tempo')}
        </button>
        <button className="btn small secondary" disabled={!d} onClick={() => setView('boletim')}>
          {tr('📄 Boletim (PDF)')}
        </button>
      </div>
      {!d ? (
        <p className="muted">{tr('A carregar…')}</p>
      ) : (
        <>
          {/* Growth */}
          <GrowthAlert growth={d.growth} />
          <section className="hsec">
          <div className="hsec-head">
            <span className="hsec-ico" aria-hidden>📏</span>
            <h3>{tr('Crescimento')}</h3>
            <span className="pill muted">{d.growth.length}</span>
          </div>
          {d.whoBands && d.who ? (
            <>
              <WhoGrowthChart
                label={tr('Peso (kg)')}
                unit=" kg"
                bands={d.whoBands.wfa}
                child={d.growth
                  .filter((g) => g.weightKg != null && g.ageDays != null)
                  .map((g) => ({ ageDays: g.ageDays as number, value: g.weightKg as number }))}
              />
              <WhoGrowthChart
                label={tr('Comprimento/Estatura (cm)')}
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
                label={tr('Altura (cm)')}
                unit=" cm"
                points={d.growth
                  .filter((g) => g.heightCm != null)
                  .map((g) => ({ x: new Date(g.measuredAt).getTime(), y: g.heightCm as number }))}
              />
              <GrowthChart
                label={tr('Peso (kg)')}
                unit=" kg"
                points={d.growth
                  .filter((g) => g.weightKg != null)
                  .map((g) => ({ x: new Date(g.measuredAt).getTime(), y: g.weightKg as number }))}
              />
            </>
          )}
          {!d.who ? (
            <p className="muted" style={{ fontSize: 12 }}>
              {tr('Define o sexo da criança para ver os percentis WHO (0–5 anos).')}
            </p>
          ) : null}
          {d.growth.length === 0 ? (
            <p className="muted">{tr('Sem medições.')}</p>
          ) : (
            <div className="grid">
              {d.growth.map((g) => (
                <div key={g.id} className="card">
                  <strong>{new Date(g.measuredAt).toLocaleDateString(appLocale())}</strong>
                  <div className="muted">
                    {g.heightCm ? `${g.heightCm} cm` : ''} {g.weightKg ? `· ${g.weightKg} kg` : ''}
                    {g.bmi ? ` · ${tr('IMC')} ${g.bmi}` : ''}
                  </div>
                  {g.weightP != null || g.heightP != null || g.bmiP != null ? (
                    <div className="muted" style={{ fontSize: 12 }}>
                      {g.weightP != null ? `${tr('Peso')} P${g.weightP}` : ''}
                      {g.heightP != null ? ` · ${tr('Estatura')} P${g.heightP}` : ''}
                      {g.bmiP != null ? ` · ${tr('IMC')} P${g.bmiP}` : ''}
                      {g.bmiClass ? ` (${g.bmiClass})` : ''}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
          <Reg label={tr('+ Registar peso e altura')}>
            <div className="row">
              <input type="date" value={gDate} onChange={(e) => setGDate(e.target.value)} style={{ width: 150 }} />
              <input placeholder={tr('Altura cm')} value={gH} onChange={(e) => setGH(e.target.value)} style={{ width: 100 }} />
              <input placeholder={tr('Peso kg')} value={gW} onChange={(e) => setGW(e.target.value)} style={{ width: 100 }} />
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
                  tr('Medição adicionada ✓'),
                )
              }
            >
              {tr('Adicionar medição')}
            </button>
          </Reg>
          </section>

          {/* Vital signs */}
          <section className="hsec">
          <div className="hsec-head">
            <span className="hsec-ico" aria-hidden>🌡️</span>
            <h3>{tr('Sinais do dia')}</h3>
            <span className="pill muted">{(d.vitals ?? []).length}</span>
          </div>
          {(d.vitals ?? []).length === 0 ? (
            <p className="muted">{tr('Sem registos.')}</p>
          ) : (
            <div className="grid">
              {(d.vitals ?? []).slice(0, 6).map((v) => (
                <div key={v.id} className="card">
                  <strong>{new Date(v.measuredAt).toLocaleDateString(appLocale())}</strong>
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
          <Reg label={tr('+ Registar sinais do dia')}>
            <div className="row">
              <input placeholder={tr('Tª ºC')} value={vtTemp} onChange={(e) => setVtTemp(e.target.value)} style={{ width: 80 }} />
              <input placeholder={tr('Batimentos (bpm)')} value={vtHr} onChange={(e) => setVtHr(e.target.value)} style={{ width: 150 }} />
              <input placeholder={tr('Respiração (por min.)')} value={vtRr} onChange={(e) => setVtRr(e.target.value)} style={{ width: 170 }} />
              <input placeholder={tr('Oxigénio (%)')} value={vtSpo2} onChange={(e) => setVtSpo2(e.target.value)} style={{ width: 130 }} />
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
                  tr('Sinais vitais registados ✓'),
                )
              }
            >
              {tr('Registar sinais vitais')}
            </button>
          </Reg>
          </section>

          {/* Vaccines */}
          <section className="hsec">
          <div className="hsec-head">
            <span className="hsec-ico" aria-hidden>💉</span>
            <h3>{tr('Vacinas')}</h3>
            <span className="pill muted">{d.vaccines.length}</span>
          </div>
          {d.vaccines.length === 0 ? (
            <p className="muted">{tr('Sem vacinas registadas.')}</p>
          ) : (
            d.vaccines.map((v) => (
              <div key={v.id} className="card" style={{ marginBottom: 8 }}>
                <strong>{v.name}</strong>
                <div className="muted">{new Date(v.date).toLocaleDateString(appLocale())}</div>
              </div>
            ))
          )}
          <Reg label={tr('+ Registar vacina')}>
            <div className="row">
              <Autocomplete
                placeholder={tr('Vacina (ex.: VASPR)')}
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
                  tr('Vacina adicionada ✓'),
                )
              }
            >
              {tr('Adicionar vacina')}
            </button>
          </Reg>
          </section>

          {/* Allergies */}
          <section className="hsec">
          <div className="hsec-head">
            <span className="hsec-ico" aria-hidden>⚠️</span>
            <h3>{tr('Alergias')}</h3>
            <span className="pill muted">{(d.allergies ?? []).length}</span>
          </div>
          {(d.allergies ?? []).length === 0 ? (
            <p className="muted">{tr('Sem alergias registadas.')}</p>
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
                      onClick={() => run(() => Api.removeAllergy(child.id, a.id), tr('Removida ✓'))}
                    >
                      {tr('Remover')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <Reg label={tr('+ Registar alergia')}>
            <Autocomplete
              placeholder={tr('Alergia (ex.: penicilina, ovo)')}
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
                  tr('Alergia adicionada ✓'),
                )
              }
            >
              {tr('Adicionar alergia')}
            </button>
          </Reg>
          </section>

          {/* Medications */}
          <section className="hsec">
          <div className="hsec-head">
            <span className="hsec-ico" aria-hidden>💊</span>
            <h3>{tr('Medicação')}</h3>
            <span className="pill muted">{d.medications.length}</span>
          </div>
          {d.medications.length === 0 ? (
            <p className="muted">{tr('Sem medicação.')}</p>
          ) : (
            d.medications.map((m) => (
              <div key={m.id} className="card" style={{ marginBottom: 8 }}>
                <span className={m.active ? 'pill ok' : 'pill muted'}>
                  {m.active ? tr('ativa') : tr('parada')}
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
                        tr('Atualizado ✓'),
                      )
                    }
                  >
                    {m.active ? tr('Marcar parada') : tr('Reativar')}
                  </button>
                </div>
              </div>
            ))
          )}
          <Reg label={tr('+ Registar medicação')}>
            <div className="row">
              <Autocomplete
                placeholder={tr('Medicamento (ex.: amox)')}
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
                        setDoseHint(`${tr('Sugerido p/')} ${latestWeightKg} kg: ${dose.note ?? ''} — ${tr('rever')}`);
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
                          `${tr('⚠️ Alergia registada pode contraindicar este fármaco')}${hits.some((h) => h.cross) ? ` ${tr('(reatividade cruzada)')}` : ''} — ${tr('confirmar antes de prescrever.')}`,
                        );
                      }
                    } catch {
                      /* ignore */
                    }
                  }
                }}
                render={(m) => `${m.dci} (${m.atc})`}
              />
              <input placeholder={tr('Dose')} value={mDose} onChange={(e) => setMDose(e.target.value)} style={{ width: 120 }} />
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
                  tr('Medicação adicionada ✓'),
                )
              }
            >
              {tr('Adicionar medicação')}
            </button>
          </Reg>
          </section>

          {/* Episodes */}
          <section className="hsec">
          <div className="hsec-head">
            <span className="hsec-ico" aria-hidden>🤒</span>
            <h3>{tr('Problemas de saúde')}</h3>
            <span className="pill muted">{d.episodes.length}</span>
          </div>
          {d.episodes.length === 0 ? (
            <p className="muted">{tr('Sem episódios.')}</p>
          ) : (
            d.episodes.map((ep) => (
              <div key={ep.id} className="card" style={{ marginBottom: 8 }}>
                <span className={ep.status === 'OPEN' ? 'pill' : 'pill ok'}>
                  {ep.status === 'OPEN' ? tr('aberto') : tr('fechado')}
                </span>{' '}
                <strong>{ep.title}</strong>
                {ep.summary ? <div className="muted">{ep.summary}</div> : null}
                {ep.status === 'OPEN' ? (
                  <button
                    className="btn small secondary"
                    disabled={busy}
                    onClick={() => run(() => Api.closeEpisode(child.id, ep.id), tr('Episódio fechado ✓'))}
                  >
                    {tr('Fechar')}
                  </button>
                ) : null}
              </div>
            ))
          )}
          <Reg label={tr('+ Registar problema de saúde')}>
            <Autocomplete
              placeholder={tr('Diagnóstico / episódio (ex.: otite)')}
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
            <textarea placeholder={tr('Resumo (opcional)')} value={eSummary} onChange={(e) => setESummary(e.target.value)} rows={2} />
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
                  tr('Episódio criado ✓'),
                )
              }
            >
              {tr('Criar episódio')}
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
  const { tr } = useT();
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
    new Date(iso).toLocaleDateString(appLocale(), { month: 'long', year: 'numeric' });
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
        {tr('← Voltar')}
      </button>
      <h2>{tr('Linha do tempo')} · {child.name}</h2>
      <p className="muted" style={{ marginTop: -4, fontSize: 13 }}>
        {tr('Tudo o que aconteceu na saúde da criança, por ordem cronológica.')}
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
            {tr(label)}
          </button>
        ))}
      </div>
      {!data ? (
        <Skeleton rows={4} />
      ) : events.length === 0 ? (
        <EmptyState
          title={tr('Sem eventos')}
          hint={tr('Regista consultas, vacinas ou medições para veres aqui a história da criança.')}
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
                    {new Date(ev.at).toLocaleDateString(appLocale(), {
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
  snsNumber,
  onBack,
}: {
  child: ChildDto;
  d: HealthOverview;
  /** Decrypted SNS number from the child detail (ChildHealth passes it down). */
  snsNumber?: string | null;
  onBack: () => void;
}) {
  const { tr } = useT();
  const fmt = (iso: string | null | undefined) =>
    iso ? new Date(iso).toLocaleDateString(appLocale()) : '—';
  const ageLabel = (() => {
    const months = Math.floor(
      (Date.now() - new Date(child.birthDate).getTime()) / (30.44 * 86_400_000),
    );
    return months < 24 ? `${months} ${tr('meses')}` : `${Math.floor(months / 12)} ${tr('anos')}`;
  })();
  const activeMeds = d.medications.filter((m) => m.active);
  const lastGrowth = d.growth.length ? d.growth[d.growth.length - 1] : null;

  return (
    <div className="section print-report">
      <div className="row no-print" style={{ marginBottom: 12 }}>
        <button className="btn secondary small" onClick={onBack}>
          {tr('← Voltar')}
        </button>
        <button className="btn small" onClick={() => window.print()}>
          {tr('🖨️ Imprimir / Guardar PDF')}
        </button>
      </div>

      <h2 style={{ marginBottom: 2 }}>{tr('Boletim de saúde')} — {child.name}</h2>
      <p className="muted" style={{ marginTop: 0 }}>
        {tr('Nascimento:')} {fmt(child.birthDate)} · {tr('Idade:')} {ageLabel}
        {snsNumber ? ` · ${tr('SNS')} ${snsNumber}` : ''} · {tr('Emitido em')}{' '}
        {new Date().toLocaleDateString(appLocale())} · HOC — Healthcare on Call
      </p>

      <h3>{tr('Alergias')}</h3>
      {d.allergies && d.allergies.length ? (
        <table>
          <thead>
            <tr>
              <th>{tr('Alergia')}</th>
              <th>{tr('Categoria')}</th>
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
        <p className="muted">{tr('Sem alergias registadas.')}</p>
      )}

      <h3>{tr('Medicação ativa')}</h3>
      {activeMeds.length ? (
        <table>
          <thead>
            <tr>
              <th>{tr('Medicamento')}</th>
              <th>{tr('Dose')}</th>
              <th>{tr('Frequência')}</th>
              <th>{tr('Início')}</th>
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
        <p className="muted">{tr('Sem medicação ativa.')}</p>
      )}

      <h3>{tr('Vacinas')}</h3>
      {d.vaccines.length ? (
        <table>
          <thead>
            <tr>
              <th>{tr('Vacina')}</th>
              <th>PNV</th>
              <th>{tr('Data')}</th>
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
        <p className="muted">{tr('Sem vacinas registadas.')}</p>
      )}

      <h3>{tr('Crescimento')}</h3>
      {lastGrowth ? (
        <p style={{ margin: '2px 0 6px' }}>
          {tr('Última medição')} ({fmt(lastGrowth.measuredAt)}):{' '}
          {lastGrowth.heightCm ? `${lastGrowth.heightCm} cm` : ''}
          {lastGrowth.heightCm && lastGrowth.weightKg ? ' · ' : ''}
          {lastGrowth.weightKg ? `${lastGrowth.weightKg} kg` : ''}
          {lastGrowth.heightP != null ? ` · ${tr('estatura')} P${Math.round(lastGrowth.heightP)}` : ''}
          {lastGrowth.weightP != null ? ` · ${tr('peso')} P${Math.round(lastGrowth.weightP)}` : ''}
        </p>
      ) : null}
      {d.growth.length ? (
        <table>
          <thead>
            <tr>
              <th>{tr('Data')}</th>
              <th>{tr('Estatura (cm)')}</th>
              <th>{tr('Peso (kg)')}</th>
              <th>{tr('IMC')}</th>
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
        <p className="muted">{tr('Sem medições registadas.')}</p>
      )}

      <h3>{tr('Episódios clínicos')}</h3>
      {d.episodes.length ? (
        <table>
          <thead>
            <tr>
              <th>{tr('Episódio')}</th>
              <th>{tr('Estado')}</th>
              <th>{tr('Início')}</th>
              <th>{tr('Fim')}</th>
            </tr>
          </thead>
          <tbody>
            {d.episodes.map((e) => (
              <tr key={e.id}>
                <td>{e.title ?? '—'}</td>
                <td>{e.status === 'CLOSED' ? tr('Resolvido') : tr('Em curso')}</td>
                <td>{fmt(e.createdAt)}</td>
                <td>{fmt(e.closedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="muted">{tr('Sem episódios registados.')}</p>
      )}

      <p className="muted" style={{ fontSize: 11, marginTop: 16 }}>
        {tr('Documento informativo gerado pela família na app HOC. Não substitui o Boletim de Saúde Infantil e Juvenil oficial nem o registo clínico do médico assistente.')}
      </p>
    </div>
  );
}

// ───────────────────────── Parent: Consult (message + video) ─────────────────────────
function ConsultTab({
  onMsg,
  onOpenConsultation,
  initialSpecialty,
  initialQuestion,
  onSpecialtyConsumed,
}: {
  onMsg: (m: string) => void;
  onOpenConsultation?: (id: string) => void;
  // Pre-selected specialty + pre-filled question when arriving from the Home
  // assistant's routing (so the parent doesn't re-type what they described).
  initialSpecialty?: string;
  initialQuestion?: string;
  onSpecialtyConsumed?: () => void;
}) {
  const { tr } = useT();
  const [children, setChildren] = useState<ChildDto[]>([]);
  const [peds, setPeds] = useState<PediatricianCard[]>([]);
  const [favIds, setFavIds] = useState<Set<string>>(new Set());
  const [child, setChild] = useState('');
  const [booking, setBooking] = useState<PediatricianCard | null>(null);
  const [detail, setDetail] = useState<PediatricianCard | null>(null);
  const [triageFor, setTriageFor] = useState<PediatricianCard | null>(null);
  const [triageServiceId, setTriageServiceId] = useState('');
  // Captured once so it survives past the parent clearing the routing intent;
  // seeds the triage question for whichever pediatrician the parent picks.
  const [prefillQuestion] = useState(initialQuestion ?? '');
  const [busy, setBusy] = useState(false);
  // filters — specialty is a tap-to-filter chip set (parents don't know
  // specialty names, so we show the ones that actually exist, translated).
  const [fSpec, setFSpec] = useState(initialSpecialty ?? '');
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
    void load(initialSpecialty || undefined);
    if (initialSpecialty) onSpecialtyConsumed?.();
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
    if (!child) return onMsg(tr('Seleciona uma criança.'));
    setDetail(null);
    setTriageServiceId(serviceId);
    setTriageFor(p);
  }
  function startMessage(p: PediatricianCard) {
    const svc = p.services.find((s) => s.type === 'MESSAGE');
    if (!svc) return onMsg(tr('Sem serviço de mensagem.'));
    startService(p, svc.id);
  }

  if (triageFor) {
    return (
      <TriageDialog
        childId={child}
        serviceId={triageServiceId}
        pedId={triageFor.id}
        initialQuestion={prefillQuestion}
        onCancel={() => setTriageFor(null)}
        onDone={(consultationId) => {
          setTriageFor(null);
          onMsg(tr('Pergunta enviada! Um pediatra vai responder — já a abrimos para ti.'));
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
          onMsg(tr('Videoconsulta marcada ✓'));
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

  const q = norm(search.trim());
  // Live as-you-type filter over what a parent would actually type: the
  // doctor's NAME first, then translated specialty, region, language, bio.
  // Accent/case-insensitive: "ines" finds "Inês".
  const shown = (onlyFav ? peds.filter((p) => favIds.has(p.id)) : peds).filter(
    (p) =>
      !q ||
      norm(
        `${p.displayName ?? ''} ${p.specialties.map((s) => tr(specLabel(s))).join(' ')} ${p.region ?? ''} ${p.languages.join(' ')} ${p.bio ?? ''}`,
      ).includes(q),
  );

  return (
    <div className="section">
      <h2>{tr('Escolher pediatra')}</h2>
      <input
        className="search"
        placeholder={tr('Pesquisar pediatra por nome…')}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      {children.length === 0 ? (
        <p className="notice">{tr('Adiciona uma criança no separador "Crianças" primeiro.')}</p>
      ) : (
        <label className="muted" style={{ display: 'block' }}>
          {tr('Criança:')}
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
        <span className="muted" style={{ fontSize: 12, fontWeight: 600 }}>{tr('Especialidade')}</span>
        <div className="row" style={{ flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
          <button className={`chip${fSpec === '' ? ' active' : ''}`} onClick={() => pickSpec('')}>
            {tr('Todas')}
          </button>
          {allSpecs.map((s) => (
            <button
              key={s}
              className={`chip${fSpec === s ? ' active' : ''}`}
              aria-pressed={fSpec === s}
              onClick={() => pickSpec(s)}
            >
              {tr(specLabel(s))}
            </button>
          ))}
        </div>
        {fSpec && specDesc(fSpec) ? (
          <p className="muted" style={{ fontSize: 13, margin: '8px 0 0' }}>
            <strong>{tr(specLabel(fSpec))}</strong> — {tr(specDesc(fSpec) ?? '')}
          </p>
        ) : null}
        <div className="row" style={{ marginTop: 10 }}>
          <input
            placeholder={tr('Preço máx €')}
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
            {tr('❤️ Só favoritos')}
          </label>
        </div>
      </div>

      {loading ? (
        <Skeleton rows={3} />
      ) : shown.length === 0 ? (
        <EmptyState
          title={tr('Sem pediatras')}
          hint={tr('Nenhum corresponde aos filtros. Tenta limpar a pesquisa.')}
        />
      ) : (
        <div className="grid">
          {shown.map((p) => {
            const msgSvc = p.services.find((s) => s.type === 'MESSAGE');
            const vidSvc = p.services.find((s) => s.type === 'VIDEO');
            return (
              <article key={p.id} className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="pill ok">{tr('✓ Verificado')}</span>
                  <button
                    type="button"
                    aria-label={favIds.has(p.id) ? tr('Remover dos favoritos') : tr('Adicionar aos favoritos')}
                    aria-pressed={favIds.has(p.id)}
                    disabled={busy}
                    style={{ cursor: 'pointer', fontSize: 18, background: 'none', border: 'none', padding: 0, width: 44, minHeight: 44 }}
                    onClick={() => toggleFav(p)}
                  >
                    {favIds.has(p.id) ? '❤️' : '🤍'}
                  </button>
                </div>
                <h3 style={{ margin: '6px 0 2px' }}>{p.displayName ?? tr(specLabel(p.specialties[0]))}</h3>
                <p className="muted" style={{ margin: 0 }}>
                  {tr(specLabel(p.specialties[0]))}
                  {p.region ? ` · 📍 ${p.region}` : ''}
                </p>
                <p className="muted" style={{ margin: '2px 0 0' }}>
                  {p.languages.join(' · ')} · ⭐ {p.ratingAvg.toFixed(1)}
                </p>
                {availabilityLabel(p.availableWeekdays) ? (
                  <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--brand)' }}>
                    📅 {tr('Disponível')} · {tr(availabilityLabel(p.availableWeekdays) ?? '')}
                  </p>
                ) : null}
                <button
                  className="btn small secondary"
                  onClick={() => setDetail(p)}
                  style={{ marginTop: 6 }}
                >
                  {tr('Ver perfil e avaliações')}
                </button>
                <div className="row" style={{ marginTop: 6 }}>
                  {msgSvc ? (
                    <button className="btn small" onClick={() => startMessage(p)} disabled={busy}>
                      {tr('Mensagem')} · {euro(msgSvc.priceCents)}
                    </button>
                  ) : null}
                  {vidSvc ? (
                    <button
                      className="btn small secondary"
                      onClick={() => setBooking(p)}
                      disabled={busy || !child}
                    >
                      {tr('Vídeo')} · {euro(vidSvc.priceCents)}
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
  const { tr } = useT();
  const [reviews, setReviews] = useState<
    { id: string; rating: number; comment: string | null; createdAt: string }[]
  >([]);
  // Doctor's timezone (public detail) — the message-window hours are the
  // DOCTOR's wall clock, so families elsewhere get "(hora de Lisboa)".
  const [pedTz, setPedTz] = useState<string | undefined>(
    (ped as PediatricianDetail).timezone,
  );

  useEffect(() => {
    Api.reviews(ped.id)
      .then((r) => setReviews(r as typeof reviews))
      .catch((e) => onMsg(`Erro: ${String(e)}`));
    (Api.pedDetail(ped.id) as Promise<PediatricianDetail>)
      .then((d) => setPedTz(d.timezone))
      .catch(() => {}); // hint only — the card renders fine without it
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ped.id]);

  return (
    <div className="section">
      <button className="btn secondary small" onClick={onBack} style={{ marginBottom: 12 }}>
        {tr('← Voltar')}
      </button>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>{ped.displayName ?? tr(specLabel(ped.specialties[0]))}</h2>
        <button
          type="button"
          aria-label={isFav ? tr('Remover dos favoritos') : tr('Adicionar aos favoritos')}
          aria-pressed={isFav}
          style={{ cursor: 'pointer', fontSize: 22, background: 'none', border: 'none', padding: 0, width: 44, minHeight: 44 }}
          onClick={onToggleFav}
        >
          {isFav ? '❤️' : '🤍'}
        </button>
      </div>
      <p className="muted" style={{ marginBottom: 2 }}>{tr(specLabel(ped.specialties[0]))}</p>
      {specDesc(ped.specialties[0]) ? (
        <p className="muted" style={{ fontSize: 13, margin: '0 0 4px' }}>
          {tr(specDesc(ped.specialties[0]) ?? '')}
        </p>
      ) : null}
      <p className="muted">
        {ped.region ? `📍 ${ped.region} · ` : ''}⭐ {ped.ratingAvg.toFixed(1)} ·{' '}
        {ped.experienceYears ?? 0} {tr('anos')} · {ped.languages.join(' · ')}
      </p>
      {availabilityLabel(ped.availableWeekdays) ? (
        <p style={{ margin: '0 0 4px', fontSize: 13, color: 'var(--brand)' }}>
          📅 {tr('Disponível')} · {tr(availabilityLabel(ped.availableWeekdays) ?? '')}
        </p>
      ) : null}
      {ped.bio ? <p>{ped.bio}</p> : null}

      <h3 style={{ marginTop: 14 }}>{tr('Serviços')}</h3>
      <div className="row">
        {ped.services.map((s) =>
          s.type === 'VIDEO' ? (
            <button
              key={s.id}
              className="btn small secondary"
              onClick={onVideo}
              disabled={!canBook}
            >
              {tr('Vídeo')} · {euro(s.priceCents)}
            </button>
          ) : (
            <button key={s.id} className="btn small" onClick={() => onStartService(s.id)}>
              {tr(svcFullLabel(s.type))} · {euro(s.priceCents)}
            </button>
          ),
        )}
      </div>
      {/* Honest reply expectation for the async (message) service: aspiration
          inside message hours, the weekly windows, and the refund guarantee. */}
      {(() => {
        const msgSvc = ped.services.find((s) => s.type === 'MESSAGE');
        if (!msgSvc) return null;
        const winSum = messageWindowsSummary(ped.messageWindows, tr);
        // Window hours are the doctor's wall clock — flag it when the family
        // is in another timezone (e.g. "seg–sex 9h–19h (hora de Lisboa)").
        const tzSuffix =
          winSum && pedTz && pedTz !== deviceTZ() ? ` (${tr('hora de')} ${tzCity(pedTz)})` : '';
        return (
          <div className="muted" style={{ fontSize: 13, marginTop: 8, display: 'grid', gap: 2 }}>
            {msgSvc.targetHours ? (
              <span>
                💬 {tr('Responde em')} ~{msgSvc.targetHours}h {tr('em horário de mensagens')}
                {winSum ? ` · ${winSum}${tzSuffix}` : ''}
              </span>
            ) : winSum ? (
              <span>💬 {winSum}{tzSuffix}</span>
            ) : null}
            <span>
              ✅ {tr('Garantia')}: {msgSvc.slaHours}h {tr('ou reembolso')}
            </span>
          </div>
        );
      })()}

      <h3 style={{ marginTop: 18 }}>{tr('Avaliações')}</h3>
      {reviews.length === 0 ? (
        <p className="muted">{tr('Ainda sem avaliações.')}</p>
      ) : (
        reviews.map((r) => (
          <div key={r.id} className="card" style={{ marginBottom: 8 }}>
            <div>{'⭐'.repeat(r.rating)}</div>
            {r.comment ? <div>{r.comment}</div> : null}
            <div className="muted" style={{ fontSize: 12 }}>
              {new Date(r.createdAt).toLocaleDateString(appLocale())}
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
  pedId,
  initialQuestion,
  onCancel,
  onDone,
  onMsg,
}: {
  childId: string;
  serviceId: string;
  pedId: string;
  // Pre-filled from the Home assistant so the parent doesn't re-type.
  initialQuestion?: string;
  onCancel: () => void;
  onDone: (consultationId?: string) => void;
  onMsg: (m: string) => void;
}) {
  const { tr } = useT();
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  const [question, setQuestion] = useState(initialQuestion ?? '');
  const [episodes, setEpisodes] = useState<{ id: string; title: string | null; status: string }[]>(
    [],
  );
  const [episodeId, setEpisodeId] = useState('');
  const [ack, setAck] = useState(false);
  const [busy, setBusy] = useState(false);
  // Honest expectation at the purchase moment: price + reply preview (server-
  // computed from the doctor's message windows, already capped at the SLA).
  const [svcInfo, setSvcInfo] = useState<{
    priceCents: number;
    slaHours: number;
    targetHours?: number;
    preview: string | null;
  } | null>(null);
  const severe = RED_FLAGS.some((f) => f.severe && flags[f.key]);

  useEffect(() => {
    Api.childHealth(childId)
      .then((d) => setEpisodes(d.episodes.filter((e) => e.status === 'OPEN')))
      .catch(() => {});
  }, [childId]);

  useEffect(() => {
    let live = true;
    (Api.pedDetail(pedId) as Promise<PediatricianDetail>)
      .then((d) => {
        if (!live) return;
        const svc = d.services.find((s) => s.id === serviceId);
        if (svc)
          setSvcInfo({
            priceCents: svc.priceCents,
            slaHours: svc.slaHours,
            targetHours: svc.targetHours,
            preview: d.expectedReplyPreview ?? null,
          });
      })
      .catch(() => {}); // purely informative — the dialog works without it
    return () => {
      live = false;
    };
  }, [pedId, serviceId]);

  async function submit() {
    if (!serviceId) return onMsg(tr('Sem serviço de mensagem.'));
    if (severe && !ack) return onMsg(tr('Confirma o aviso de urgência para continuar.'));
    setBusy(true);
    try {
      const created = (await Api.startConsultation({
        childId,
        serviceId,
        question: question || tr('Olá, tenho uma dúvida sobre o meu filho.'),
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
        {tr('← Voltar')}
      </button>
      <h2>{tr('Como está o teu filho agora?')}</h2>
      <p className="muted">{tr('Assinala o que se aplica — ajuda o pediatra a avaliar a urgência:')}</p>
      <div className="card">
        {RED_FLAGS.map((f) => (
          <label key={f.key} style={{ display: 'block', margin: '6px 0' }}>
            <input
              type="checkbox"
              checked={!!flags[f.key]}
              onChange={(e) => setFlags((p) => ({ ...p, [f.key]: e.target.checked }))}
              style={{ width: 'auto', marginRight: 8 }}
            />
            {tr(f.label)}
          </label>
        ))}
      </div>

      {severe ? (
        <div
          className="card"
          style={{ borderColor: '#f0b8be', background: '#fde4e7', color: '#3d0f14', marginTop: 12 }}
        >
          <strong style={{ color: '#d7263d' }}>{tr('⚠️ Sinais de alarme')}</strong>
          <p style={{ margin: '6px 0' }}>
            {tr('Estes sintomas podem ser urgentes. Liga')} <strong>112</strong>{' '}
            {tr('ou recorre à urgência. A teleconsulta')} <em>{tr('não substitui')}</em> {tr('emergência.')}
          </p>
          <label className="muted">
            <input
              type="checkbox"
              checked={ack}
              onChange={(e) => setAck(e.target.checked)}
              style={{ width: 'auto', marginRight: 8 }}
            />
            {tr('Compreendi; quero ainda assim contactar o pediatra.')}
          </label>
        </div>
      ) : null}

      <div className="card section">
        <h3>{tr('A tua questão')}</h3>
        <textarea
          placeholder={tr('Descreve a dúvida…')}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          rows={3}
        />
        {episodes.length > 0 ? (
          <label className="muted" style={{ display: 'block', marginTop: 8 }}>
            {tr('Associar a episódio:')}
            <select
              value={episodeId}
              onChange={(e) => setEpisodeId(e.target.value)}
              style={{ marginLeft: 8 }}
            >
              <option value="">{tr('— nenhum —')}</option>
              {episodes.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.title ?? tr('Episódio')}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>

      {/* When to expect the reply — off-hours sends get the 🌙 heads-up. */}
      {svcInfo ? (
        <div className="card" style={{ marginTop: 12, borderColor: 'var(--info)' }}>
          {svcInfo.preview ? (
            new Date(svcInfo.preview).getTime() >
            Date.now() + ((svcInfo.targetHours ?? 0) + 0.5) * 3_600_000 ? (
              <div>
                🌙 {tr('Fora do horário de mensagens')} · {tr('resposta prevista até')}{' '}
                <strong>{when(svcInfo.preview)}</strong>
              </div>
            ) : (
              <div>
                {tr('Resposta prevista até')} <strong>{when(svcInfo.preview)}</strong>
              </div>
            )
          ) : null}
          <div className="muted" style={{ fontSize: 13, marginTop: svcInfo.preview ? 4 : 0 }}>
            ✅ {tr('Garantia: resposta em')} {svcInfo.slaHours}h {tr('ou reembolso total')}
          </div>
        </div>
      ) : null}

      <button className="btn" onClick={submit} disabled={busy} style={{ marginTop: 12 }}>
        {svcInfo
          ? `${tr('Enviar pergunta')} · ${euro(svcInfo.priceCents)}`
          : tr('Enviar pergunta ao pediatra')}
      </button>
      <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>
        {tr('Pagas uma vez por consulta. Perguntas de seguimento até ao encerramento estão incluídas.')}{' '}
        {tr('Só cobramos quando o pediatra responde — sem resposta dentro da garantia, reembolso automático.')}
      </p>
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
  const { tr } = useT();
  const [days, setDays] = useState<{ date: string; slots: string[] }[]>([]);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  // Two safe taps: pick a slot → review the summary (who/when/price + consent)
  // → confirm. A stray tap never books.
  const [pendingSlot, setPendingSlot] = useState<string | null>(null);
  // Doctor's IANA timezone (public detail) — hint-only, so the parent knows
  // "10:00 for you" may be "13:00 for the doctor". The list card doesn't carry
  // it, so it is fetched alongside the slots; failures just hide the hint.
  const [pedTz, setPedTz] = useState<string | undefined>(
    (ped as PediatricianDetail).timezone,
  );
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
    (Api.pedDetail(ped.id) as Promise<PediatricianDetail>)
      .then((d) => {
        if (live) setPedTz(d.timezone);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ped.id]);

  async function confirmBooking() {
    if (!vidSvc || !pendingSlot || busy) return;
    if (!consent) return onMsg(tr('Para marcar, confirma o consentimento no resumo.'));
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
    const hint = tzHint(pedTz, pendingSlot);
    return (
      <div className="section">
        <button
          className="btn secondary small"
          onClick={() => setPendingSlot(null)}
          style={{ marginBottom: 12 }}
        >
          {tr('← Escolher outro horário')}
        </button>
        <h2>{tr('Confirmar marcação')}</h2>
        <div className="card accent" style={{ marginTop: 10 }}>
          <strong style={{ fontSize: 17, display: 'block' }}>
            {ped.displayName ?? tr(specLabel(ped.specialties[0]))}
          </strong>
          <span className="muted">{tr(specLabel(ped.specialties[0]))}</span>
          <p style={{ margin: '10px 0 4px', textTransform: 'capitalize' }}>
            📅{' '}
            {when.toLocaleDateString(appLocale(), { weekday: 'long', day: 'numeric', month: 'long' })} ·{' '}
            {when.toLocaleTimeString(appLocale(), { hour: '2-digit', minute: '2-digit' })}
            {hint ? (
              <span className="muted" style={{ textTransform: 'none' }}> ({hint})</span>
            ) : null}
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
            {tr('Aceito a videoconsulta e o tratamento dos dados de saúde da criança.')}
          </label>
          <button className="btn" disabled={busy || !consent} onClick={() => void confirmBooking()}>
            {vidSvc ? `${tr('Confirmar marcação')} · ${euro(vidSvc.priceCents)}` : tr('Confirmar marcação')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="section">
      <button className="btn secondary small" onClick={onBack} style={{ marginBottom: 12 }}>
        {tr('← Voltar')}
      </button>
      <h2>{tr('Marcar videoconsulta')}</h2>
      <p className="muted" style={{ marginBottom: 2 }}>
        {ped.displayName ?? tr(specLabel(ped.specialties[0]))}
      </p>
      <p className="muted">
        {tr(specLabel(ped.specialties[0]))} · {vidSvc ? euro(vidSvc.priceCents) : ''}
      </p>
      <h3 style={{ marginTop: 14 }}>{tr('Próximos horários disponíveis')}</h3>
      <p className="muted" style={{ fontSize: 13, marginTop: 2 }}>
        {tr('Escolhe um horário — confirmas os detalhes no passo seguinte.')}
      </p>
      {pedTz && pedTz !== deviceTZ() ? (
        <p className="muted" style={{ fontSize: 13, marginTop: 4 }}>
          🕐 {tr('Horários no teu fuso horário')} · {tr('o pediatra está em')} {tzCity(pedTz)}
        </p>
      ) : null}
      {loading ? (
        <Skeleton rows={2} />
      ) : days.length === 0 ? (
        <p className="muted" style={{ fontSize: 13, marginTop: 10 }}>
          {tr('Sem horários nos próximos dias. Este pediatra ainda não tem agenda aberta.')}
        </p>
      ) : (
        days.map((d) => (
          <div key={d.date} style={{ marginTop: 10 }}>
            <strong style={{ fontSize: 14, textTransform: 'capitalize' }}>
              {new Date(`${d.date}T00:00:00`).toLocaleDateString(appLocale(), {
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
                  {new Date(s).toLocaleTimeString(appLocale(), { hour: '2-digit', minute: '2-digit' })}
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
  onGoConsults,
}: {
  onMsg: (m: string) => void;
  focusId?: string | null;
  onFocusConsumed?: () => void;
  /** Navigate to the "Consultar" tab (choose another pediatrician after a cancellation). */
  onGoConsults?: () => void;
}) {
  const { tr } = useT();
  const [rows, setRows] = useState<ConsultationDto[]>([]);
  const [open, setOpen] = useState<ConsultationDto | null>(null);
  const [reviewing, setReviewing] = useState<ConsultationDto | null>(null);
  // "Nova consulta" from a closed thread: triage for the same doctor + child.
  const [again, setAgain] = useState<{ childId: string; serviceId: string; pedId: string } | null>(
    null,
  );
  // Rebook after a doctor-side cancellation: video booking with the same doctor + child.
  const [rebook, setRebook] = useState<{ ped: PediatricianDetail; childId: string } | null>(null);
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

  /** Start a fresh consultation with the same pediatrician (message service). */
  async function startFollowUp(c: ConsultationDto) {
    if (!c.pediatricianId || !c.childId) return onMsg(tr('Sem serviço de mensagem.'));
    try {
      const d = (await Api.pedDetail(c.pediatricianId)) as PediatricianDetail;
      const svc = d.services.find((s) => s.type === 'MESSAGE');
      if (!svc) return onMsg(tr('Sem serviço de mensagem.'));
      setOpen(null);
      setAgain({ childId: c.childId, serviceId: svc.id, pedId: c.pediatricianId });
    } catch (e) {
      onMsg(`Erro: ${String(e)}`);
    }
  }

  /** "Remarcar": open the booking flow for the same pediatrician + child. */
  async function startRebook(c: ConsultationDto) {
    if (!c.pediatricianId || !c.childId) return onGoConsults?.();
    try {
      const d = (await Api.pedDetail(c.pediatricianId)) as PediatricianDetail;
      if (!d.services.some((s) => s.type === 'VIDEO')) {
        onMsg(tr('Sem horários nos próximos dias. Este pediatra ainda não tem agenda aberta.'));
        return onGoConsults?.();
      }
      setOpen(null);
      setRebook({ ped: d, childId: c.childId });
    } catch (e) {
      onMsg(`Erro: ${String(e)}`);
    }
  }

  /** Cancelled by the doctor's availability change — refunded, invite to rebook. */
  const pedUnavailable = (c: ConsultationDto) =>
    c.status === 'REFUNDED' && c.refundReason === 'pediatrician_unavailable';

  if (rebook)
    return (
      <BookVideo
        ped={rebook.ped}
        childId={rebook.childId}
        onBack={() => setRebook(null)}
        onDone={(consultationId) => {
          setRebook(null);
          onMsg(tr('Videoconsulta marcada ✓'));
          void (async () => {
            try {
              const list = await Api.myConsultations();
              setRows(list);
              const target = consultationId ? list.find((c) => c.id === consultationId) : undefined;
              if (target) setOpen(target);
            } catch {
              /* best-effort refresh */
            }
          })();
        }}
        onMsg={onMsg}
      />
    );

  if (again)
    return (
      <TriageDialog
        childId={again.childId}
        serviceId={again.serviceId}
        pedId={again.pedId}
        onCancel={() => setAgain(null)}
        onDone={(consultationId) => {
          setAgain(null);
          onMsg(tr('Pergunta enviada! Um pediatra vai responder — já a abrimos para ti.'));
          void (async () => {
            try {
              const list = await Api.myConsultations();
              setRows(list);
              const target = consultationId ? list.find((c) => c.id === consultationId) : undefined;
              if (target) setOpen(target);
            } catch {
              /* best-effort refresh */
            }
          })();
        }}
        onMsg={onMsg}
      />
    );

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
        onNewConsultation={() => void startFollowUp(open)}
      />
    );
  if (reviewing)
    return (
      <ReviewForm
        consultation={reviewing}
        onBack={() => setReviewing(null)}
        onDone={() => {
          setReviewing(null);
          onMsg(tr('Avaliação enviada ✓ obrigado!'));
        }}
        onMsg={onMsg}
      />
    );

  return (
    <div className="section">
      <h2>{tr('As minhas consultas')}</h2>
      {loading ? (
        <Skeleton rows={2} />
      ) : rows.length === 0 ? (
        <EmptyState title={tr('Ainda sem consultas')} hint={tr('Inicia uma no separador Consultar.')} />
      ) : (
        (() => {
          const card = (c: ConsultationDto) => (
            <div key={c.id} className="card">
              <span className={statusPill(c.status)}>{tr(statusLabel(c.status))}</span>
              {c.type === 'VIDEO' ? (
                <span className="pill" style={{ marginLeft: 6 }}>🎥 {tr('Vídeo')}</span>
              ) : null}
              <div style={{ marginTop: 4 }}>
                <strong>{c.pediatrician?.displayName ?? tr(specLabel(c.pediatrician?.specialties?.[0]))}</strong>
                {c.child?.name ? ` · ${c.child.name}` : ''}
              </div>
              <div className="muted">
                {tr(svcLabel(c.type))} · {euro(c.priceCents)}
              </div>
              {c.type === 'VIDEO' && c.scheduledAt ? (
                <div style={{ color: 'var(--brand)', fontSize: 13 }}>📅 {when(c.scheduledAt)}</div>
              ) : (
                <div className="muted">{when(c.openedAt)}</div>
              )}
              {pedUnavailable(c) ? (
                <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>
                  {tr('Cancelada por indisponibilidade do pediatra · valor reembolsado')}
                </div>
              ) : null}
              <div className="row" style={{ marginTop: 8, flexWrap: 'wrap' }}>
                <button className="btn small" onClick={() => setOpen(c)}>
                  {tr('Abrir')}
                </button>
                {c.status === 'CLOSED' ? (
                  <button className="btn small secondary" onClick={() => setReviewing(c)}>
                    {tr('⭐ Avaliar')}
                  </button>
                ) : null}
                {pedUnavailable(c) ? (
                  <>
                    {c.pediatricianId && c.childId ? (
                      <button className="btn small" onClick={() => void startRebook(c)}>
                        {tr('Remarcar')}
                      </button>
                    ) : null}
                    {onGoConsults ? (
                      <button className="btn small secondary" onClick={onGoConsults}>
                        {tr('Escolher outro pediatra')}
                      </button>
                    ) : null}
                  </>
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
  const { tr } = useT();
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
        {tr('← Voltar')}
      </button>
      <h2>{tr('Avaliar consulta')}</h2>
      <div className="row" role="radiogroup" aria-label={tr('Classificação')} style={{ fontSize: 28 }}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={n === rating}
            aria-label={`${n} ${n === 1 ? tr('estrela') : tr('estrelas')}`}
            style={{ cursor: 'pointer', background: 'none', border: 'none', padding: 0, width: 44, minHeight: 44, fontSize: 28 }}
            onClick={() => setRating(n)}
          >
            {n <= rating ? '⭐' : '☆'}
          </button>
        ))}
      </div>
      <textarea
        placeholder={tr('Comentário (opcional)')}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={3}
      />
      <button className="btn" onClick={submit} disabled={busy}>
        {tr('Enviar avaliação')}
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
  const { tr } = useT();
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
    if (!toId || reason.trim().length < 3) return onMsg(tr('Escolhe o colega e descreve o contexto.'));
    setBusy(true);
    try {
      await Api.createReferral({ consultationId, toPediatricianId: toId, reason: reason.trim() });
      onMsg(tr('Pedido de 2ª opinião enviado ✓ — acompanha em “2ª opinião”.'));
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
        {tr('✓ 2ª opinião pedida sobre este doente — acompanha em “2ª opinião”.')}
      </p>
    );
  if (!open)
    return (
      <button className="btn secondary small" onClick={() => void start()} style={{ marginTop: 8 }}>
        {tr('🤝 Pedir 2ª opinião sobre este doente')}
      </button>
    );
  return (
    <div className="card section">
      <strong>{tr('Pedir 2ª opinião a um colega')}</strong>
      <p className="muted" style={{ fontSize: 12, margin: '2px 0 6px' }}>
        {tr('Sobre esta consulta. O contexto clínico é cifrado e enviado ao colega.')}
      </p>
      <label className="muted">{tr('Colega')}</label>
      <select className="search" value={toId} onChange={(e) => setToId(e.target.value)}>
        <option value="">{tr('Escolhe um pediatra…')}</option>
        {colleagues.map((p) => (
          <option key={p.id} value={p.id}>
            {p.displayName ?? tr(specLabel(p.specialties?.[0]))}
            {p.specialties && p.specialties.length ? ` · ${tr(specLabel(p.specialties[0]))}` : ''}
          </option>
        ))}
      </select>
      <label className="muted">{tr('Contexto clínico (cifrado)')}</label>
      <textarea
        className="search"
        rows={4}
        placeholder={tr('Descreve o caso e a questão para o colega…')}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
      />
      <div className="row" style={{ marginTop: 6 }}>
        <button className="btn small" onClick={() => void send()} disabled={busy}>
          {tr('Enviar pedido')}
        </button>
        <button className="btn secondary small" onClick={() => setOpen(false)}>
          {tr('Cancelar')}
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
  const { tr } = useT();
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
      onMsg(tr('Escolhe a consulta, o colega e descreve o contexto.'));
      return;
    }
    setBusy(true);
    try {
      await Api.createReferral({ consultationId: consultId, toPediatricianId: toId, reason: reason.trim() });
      onMsg(tr('Pedido de 2ª opinião enviado.'));
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
      onMsg(tr('Escreve a tua opinião.'));
      return;
    }
    setBusy(true);
    try {
      await Api.submitReferralOpinion(id, text);
      onMsg(tr('Opinião enviada ao colega.'));
      await load();
    } catch (e) {
      onMsg(`Erro a enviar: ${String(e)}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="section">
      <h2>{tr('Segunda opinião')}</h2>
      <p className="muted" style={{ marginTop: -4, fontSize: 13 }}>
        {tr('Consulta entre médicos: pede o parecer de um colega sobre um caso teu, ou responde a quem te pede. O contexto clínico é cifrado e o pedido parte sempre de uma das tuas consultas (do doente) — em')}{' '}
        <strong>{tr('Pedir')}</strong>{tr(', escolhe a consulta e o colega.')}
      </p>
      <div className="seg" role="tablist">
        <button className={view === 'incoming' ? 'active' : ''} onClick={() => setView('incoming')}>
          {tr('Recebidos')}{incoming.length ? ` (${incoming.length})` : ''}
        </button>
        <button className={view === 'outgoing' ? 'active' : ''} onClick={() => setView('outgoing')}>
          {tr('Enviados')}{outgoing.length ? ` (${outgoing.length})` : ''}
        </button>
        <button className={view === 'new' ? 'active' : ''} onClick={() => void openNew()}>
          {tr('Pedir')}
        </button>
      </div>

      {loading ? <Skeleton rows={2} /> : null}

      {!loading && view === 'incoming' ? (
        incoming.length === 0 ? (
          <EmptyState title={tr('Sem pedidos')} hint={tr('Quando um colega te pedir uma opinião aparece aqui.')} />
        ) : (
          <div className="grid">
            {incoming.map((r) => (
              <div key={r.id} className="card">
                <span className={statusPill(r.status === 'COMPLETED' ? 'CLOSED' : 'OPEN')}>
                  {tr(refStatusLabel(r.status))}
                </span>
                <p style={{ whiteSpace: 'pre-wrap' }}>{r.reason}</p>
                {r.status === 'PENDING' ? (
                  <div className="row">
                    <button className="btn" disabled={busy} onClick={() => void respond(r.id, true)}>
                      {tr('Aceitar')}
                    </button>
                    <button className="btn secondary" disabled={busy} onClick={() => void respond(r.id, false)}>
                      {tr('Recusar')}
                    </button>
                  </div>
                ) : null}
                {r.status === 'ACCEPTED' ? (
                  <div>
                    <textarea
                      className="search"
                      rows={4}
                      placeholder={tr('A tua opinião clínica…')}
                      value={opinions[r.id] ?? ''}
                      onChange={(e) => setOpinions((o) => ({ ...o, [r.id]: e.target.value }))}
                    />
                    <button className="btn" disabled={busy} onClick={() => void submitOpinion(r.id)}>
                      {tr('Enviar opinião')}
                    </button>
                  </div>
                ) : null}
                {r.status === 'COMPLETED' && r.opinion ? (
                  <div className="notice" style={{ whiteSpace: 'pre-wrap' }}>
                    <strong>{tr('A tua opinião:')}</strong> {r.opinion}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )
      ) : null}

      {!loading && view === 'outgoing' ? (
        outgoing.length === 0 ? (
          <EmptyState title={tr('Nada enviado')} hint={tr('Pede uma 2ª opinião a um colega no separador “Pedir”.')} />
        ) : (
          <div className="grid">
            {outgoing.map((r) => (
              <div key={r.id} className="card">
                <span className={statusPill(r.status === 'COMPLETED' ? 'CLOSED' : 'OPEN')}>
                  {tr(refStatusLabel(r.status))}
                </span>
                <p style={{ whiteSpace: 'pre-wrap' }} className="muted">
                  {r.reason}
                </p>
                {r.opinion ? (
                  <div className="notice" style={{ whiteSpace: 'pre-wrap' }}>
                    <strong>{tr('Opinião do colega:')}</strong> {r.opinion}
                  </div>
                ) : (
                  <div className="muted">{tr('A aguardar resposta…')}</div>
                )}
              </div>
            ))}
          </div>
        )
      ) : null}

      {view === 'new' ? (
        <div className="card">
          <label className="muted">{tr('Doente / consulta')}</label>
          <select className="search" value={consultId} onChange={(e) => setConsultId(e.target.value)}>
            <option value="">{tr('Escolhe o doente / consulta…')}</option>
            {myConsults.map((c) => (
              <option key={c.id} value={c.id}>
                {c.child?.name ? `${c.child.name} · ` : ''}
                {tr(svcLabel(c.type))} · {tr(statusLabel(c.status))}
              </option>
            ))}
          </select>
          <label className="muted">{tr('Colega')}</label>
          <select className="search" value={toId} onChange={(e) => setToId(e.target.value)}>
            <option value="">{tr('Escolhe um pediatra…')}</option>
            {colleagues.map((p) => (
              <option key={p.id} value={p.id}>
                {p.displayName ?? tr(specLabel(p.specialties?.[0]))}
                {p.specialties && p.specialties.length ? ` · ${tr(specLabel(p.specialties[0]))}` : ''}
              </option>
            ))}
          </select>
          <label className="muted">{tr('Contexto clínico (cifrado)')}</label>
          <textarea
            className="search"
            rows={5}
            placeholder={tr('Descreve o caso e a questão para o colega…')}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <button className="btn" disabled={busy} onClick={() => void send()}>
            {tr('Enviar pedido')}
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
  const { tr } = useT();
  const [rows, setRows] = useState<ConsultationDto[]>([]);
  const [recent, setRecent] = useState<ConsultationDto[]>([]);
  const [view, setView] = useState<'todo' | 'recent'>('todo');
  const [period, setPeriod] = useState<'today' | '7d' | '30d' | 'all'>('all');
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
  // "Por responder" = still waiting for the pediatrician's first reply.
  const isUnanswered = (c: ConsultationDto) =>
    (c.status === 'OPEN' || c.status === 'TRIAGE') && c.answeredAt == null;
  const byUrgency = (a: ConsultationDto, b: ConsultationDto) => {
    if (isSevere(a) !== isSevere(b)) return isSevere(a) ? -1 : 1;
    return new Date(a.slaDueAt ?? '2999-01-01').getTime() - new Date(b.slaDueAt ?? '2999-01-01').getTime();
  };
  const today = new Date().toDateString();
  // Date filter — questions by openedAt, video consultations by scheduledAt.
  const refDate = (c: ConsultationDto) =>
    c.type === 'VIDEO' && c.scheduledAt ? c.scheduledAt : c.openedAt;
  const inPeriod = (c: ConsultationDto) => {
    if (period === 'all') return true;
    const d = new Date(refDate(c));
    if (period === 'today') return d.toDateString() === today;
    const days = period === '7d' ? 7 : 30;
    return d.getTime() >= Date.now() - days * 86_400_000;
  };
  const shownRows = rows.filter(inPeriod);
  const shownRecent = recent.filter(inPeriod);
  const videosToday = shownRows
    .filter((c) => c.type === 'VIDEO' && c.scheduledAt && new Date(c.scheduledAt).toDateString() === today)
    .sort((a, b) => new Date(a.scheduledAt!).getTime() - new Date(b.scheduledAt!).getTime());
  // Founder feedback: answered consultations (awaiting the family or closure)
  // were mixed with the truly-unanswered ones — keep them in separate boxes.
  const rest = shownRows.filter((c) => !videosToday.includes(c));
  const toAnswer = rest.filter(isUnanswered).sort(byUrgency);
  const answered = rest
    .filter((c) => !isUnanswered(c))
    .sort((a, b) => new Date(b.answeredAt ?? b.openedAt).getTime() - new Date(a.answeredAt ?? a.openedAt).getTime());
  const todoCount = rows.filter(isUnanswered).length;

  const consultCard = (c: ConsultationDto, answeredNote = false) => (
    <button
      key={c.id}
      className={`card${isSevere(c) ? ' accent' : ''}`}
      onClick={() => setOpen(c)}
      style={{
        textAlign: 'left',
        cursor: 'pointer',
        // Unread/unanswered highlight; severe cards keep their red accent and
        // only gain the left bar (background stays the danger treatment).
        ...(isUnanswered(c)
          ? {
              borderLeft: '4px solid var(--accent)',
              ...(isSevere(c) ? {} : { background: 'var(--warn-bg)' }),
            }
          : {}),
      }}
    >
      {isSevere(c) ? (
        <span className="pill" style={{ background: 'var(--danger-bg)', color: 'var(--danger)', marginRight: 6 }}>
          {tr('⚠️ Sinais de alarme')}
        </span>
      ) : null}
      {isUnanswered(c) ? (
        <span className="pill warn" style={{ marginRight: 6 }}>
          {tr('Novo · por responder')}
        </span>
      ) : null}
      <span className={statusPill(c.status)}>{tr(statusLabel(c.status))}</span>
      {c.type === 'VIDEO' ? (
        <span className="pill" style={{ marginLeft: 6 }}>🎥 {tr('Vídeo')}</span>
      ) : null}
      <div style={{ marginTop: 4 }}>
        <strong>{c.child?.name ?? tr('Doente')}</strong>
        {c.child?.birthDate ? <span className="muted"> · {ageLabel(c.child.birthDate)}</span> : null} ·{' '}
        {euro(c.priceCents)}
      </div>
      {c.type === 'VIDEO' && c.scheduledAt ? (
        <div style={{ color: 'var(--brand)', fontSize: 13 }}>
          📅{' '}
          {new Date(c.scheduledAt).toLocaleTimeString(appLocale(), { hour: '2-digit', minute: '2-digit' })}
          {' · '}
          {new Date(c.scheduledAt).toLocaleDateString(appLocale(), { day: 'numeric', month: 'short' })}
        </div>
      ) : c.slaDueAt && !answeredNote ? (
        <div className="muted">
          {tr('Responder até')}{' '}
          {new Date(c.slaDueAt).toLocaleString(appLocale(), {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
          })}
          {/* Aspirational target (message windows) — the SLA stays the guarantee. */}
          {c.expectedReplyAt ? (
            <span className="pill" style={{ marginLeft: 6, fontSize: 11 }}>
              {tr('meta')}:{' '}
              {new Date(c.expectedReplyAt).toLocaleString(appLocale(), {
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          ) : null}
        </div>
      ) : null}
      {answeredNote ? (
        <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
          {tr('Respondida · a aguardar família ou fecho')}
        </div>
      ) : null}
    </button>
  );

  return (
    <div className="section">
      <h2>{tr('Caixa de entrada')}</h2>
      <div className="seg" role="tablist" style={{ margin: '8px 0' }}>
        <button className={view === 'todo' ? 'active' : ''} onClick={() => setView('todo')}>
          {tr('A responder')}{todoCount ? ` (${todoCount})` : ''}
        </button>
        <button className={view === 'recent' ? 'active' : ''} onClick={() => setView('recent')}>
          {tr('Recentes')}
        </button>
      </div>
      <div className="row" style={{ flexWrap: 'wrap', gap: 6, margin: '0 0 8px' }}>
        {([
          ['today', 'Hoje'],
          ['7d', '7 dias'],
          ['30d', '30 dias'],
          ['all', 'Tudo'],
        ] as const).map(([k, label]) => (
          <button key={k} className={`chip${period === k ? ' active' : ''}`} onClick={() => setPeriod(k)}>
            {tr(label)}
          </button>
        ))}
      </div>
      {loading ? (
        <Skeleton rows={2} />
      ) : view === 'recent' ? (
        shownRecent.length === 0 ? (
          <EmptyState
            title={tr('Sem consultas anteriores')}
            hint={recent.length ? tr('Nenhuma neste período.') : tr('O histórico aparece aqui.')}
          />
        ) : shownRecent.length <= 6 ? (
          <div className="grid">{shownRecent.map((c) => consultCard(c))}</div>
        ) : (
          groupByPeriod(shownRecent, (c) => c.openedAt).map((g) => (
            <Fragment key={g.label}>
              <h3 style={{ margin: '16px 0 4px', textTransform: 'capitalize' }}>{g.label}</h3>
              <div className="grid">{g.items.map((c) => consultCard(c))}</div>
            </Fragment>
          ))
        )
      ) : shownRows.length === 0 ? (
        <EmptyState
          title={rows.length ? tr('Sem consultas neste período') : tr('Tudo em dia')}
          hint={
            rows.length
              ? tr('Escolhe outro período para veres mais.')
              : tr('Assim que uma família enviar uma questão ou marcar uma consulta, aparece aqui.')
          }
        />
      ) : (
        <>
          {videosToday.length ? (
            <>
              <h3 style={{ marginTop: 8 }}>{tr('Videoconsultas de hoje')}</h3>
              <div className="grid">{videosToday.map((c) => consultCard(c))}</div>
            </>
          ) : null}
          {toAnswer.length ? (
            <>
              <h3 style={{ marginTop: videosToday.length ? 16 : 8 }}>
                {tr('A responder')} ({toAnswer.length})
              </h3>
              <div className="grid">{toAnswer.map((c) => consultCard(c))}</div>
            </>
          ) : null}
          {answered.length ? (
            <>
              <h3 style={{ marginTop: 16 }}>
                {tr('Respondidas · a aguardar')} ({answered.length})
              </h3>
              <div className="grid">{answered.map((c) => consultCard(c, true))}</div>
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
  if (y === 0) return `${m} ${m === 1 ? trs('mês') : trs('meses')}`;
  return m === 0 ? `${y} ${y === 1 ? trs('ano') : trs('anos')}` : `${y}${trs('a')} ${m}m`;
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
  const { tr } = useT();
  const [history, setHistory] = useState<ChildHistory | null>(null);
  const [health, setHealth] = useState<HealthOverview | null>(null);
  const [dueVax, setDueVax] = useState<{ abbr: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  // Read-only clinical views the family already has — the pediatrician sees
  // the same timeline/boletim (backend authorizes via the consultation link).
  const [view, setView] = useState<'chart' | 'timeline' | 'boletim'>('chart');

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

  const childRef: ChildDto = { id: childId, name: childName, birthDate };
  if (view === 'timeline') {
    return <ChildTimelineView child={childRef} onBack={() => setView('chart')} onMsg={onMsg} />;
  }
  if (view === 'boletim' && health) {
    return <BoletimView child={childRef} d={health} onBack={() => setView('chart')} />;
  }

  return (
    <div className="section">
      <button className="link" onClick={onBack}>
        ← {tr('Doentes')}
      </button>
      <h2 style={{ marginTop: 8 }}>
        {childName} <span className="muted">· {ageLabel(birthDate)}</span>
      </h2>
      {!loading ? (
        <div className="row" style={{ flexWrap: 'wrap', gap: 6, margin: '4px 0 8px' }}>
          <button className="chip" onClick={() => setView('timeline')}>
            {tr('🕒 Linha do tempo')}
          </button>
          {health ? (
            <button className="chip" onClick={() => setView('boletim')}>
              {tr('📄 Boletim (PDF)')}
            </button>
          ) : null}
        </div>
      ) : null}

      {loading ? (
        <Skeleton rows={3} />
      ) : (
        <>
          {overdueVax.length > 0 ? (
            <div className="card" style={{ borderColor: 'var(--warn, #b26a00)' }}>
              <strong>{tr('⚠️ Vacinas possivelmente em atraso')}</strong>
              <div className="muted" style={{ marginTop: 4 }}>
                {tr('Para a idade')} ({ageLabel(birthDate)}),{' '}
                {tr('sem registo destas vacinas do PNV — confirmar com o boletim:')}
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
            <strong>{tr('Problemas ativos')}</strong>
            {openProblems.length === 0 ? (
              <div className="muted">{tr('Sem problemas em aberto.')}</div>
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
            <strong>{tr('Medicação ativa')}</strong>
            {activeMeds.length === 0 ? (
              <div className="muted">{tr('Nenhuma.')}</div>
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
              <strong>{tr('Peso (kg)')}</strong>
              <GrowthChart points={growthPts} label={tr('Peso')} unit="kg" />
            </div>
          ) : null}

          <div className="card">
            <strong>{tr('Vacinas registadas')}</strong>
            {(health?.vaccines ?? []).length === 0 ? (
              <div className="muted">{tr('Nenhuma.')}</div>
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

          <h3 style={{ marginTop: 16 }}>{tr('Histórico de consultas')}</h3>
          {(history?.consultations ?? []).length === 0 ? (
            <EmptyState title={tr('Sem consultas registadas')} />
          ) : (
            <div className="grid">
              {(history?.consultations ?? []).map((c) => (
                <div key={c.id} className="card">
                  <span className={statusPill(c.status)}>{tr(statusLabel(c.status))}</span>
                  <div>
                    <strong>{tr(svcLabel(c.type))}</strong> · {euro(c.priceCents)}
                  </div>
                  <div className="muted">{tr('Aberta')}: {when(c.openedAt)}</div>
                  {c.closedAt ? <div className="muted">{tr('Fechada')}: {when(c.closedAt)}</div> : null}
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
  const { tr } = useT();
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
      <h2>{tr('Os meus doentes')}</h2>
      <p className="muted">{tr('Agrupados por família — irmãos juntos. Toca numa criança para o registo.')}</p>
      {loading ? (
        <Skeleton rows={2} />
      ) : families.length === 0 ? (
        <EmptyState title={tr('Ainda sem doentes')} hint={tr('Aparecem aqui as crianças que já consultaste.')} />
      ) : (
        families.map((fam) => (
          <div key={fam.id} className="card" style={{ marginBottom: 12 }}>
            <strong>{fam.name}</strong>
            {fam.guardians && fam.guardians.length > 0 ? (
              <div className="muted" style={{ fontSize: 13, marginTop: 2 }}>
                {fam.guardians.map((g) => `${tr(guardianLabel(g.relationship))} ${g.name}`).join(' · ')}
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
                    {c.consultationCount} {c.consultationCount === 1 ? tr('consulta') : tr('consultas')} · {tr('última')}{' '}
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
// Real availability calendar (month / week / day), Google Calendar-inspired.
// All date math is UTC to match the backend: blocks are UTC-minute-based and a
// day's key is the UTC date string YYYY-MM-DD. Effective availability for a day:
// dated blocks win; otherwise the weekly-template blocks for that weekday apply.
const AGC_START_H = 7;
const AGC_END_H = 22;
const AGC_DAYS = [1, 2, 3, 4, 5, 6, 0]; // Monday-first week
const AGC_SPAN = (AGC_END_H - AGC_START_H) * 60;
const DAY_MS = 86_400_000;
function utcToday(): number {
  const n = new Date();
  return Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate());
}
const isoDay = (t: number) => new Date(t).toISOString().slice(0, 10);
const mondayOf = (t: number) => t - ((new Date(t).getUTCDay() + 6) % 7) * DAY_MS;
const fmtUTC = (t: number, opts: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat(appLocale(), { ...opts, timeZone: 'UTC' }).format(t);

/** Local-day key of an instant, in the DEVICE timezone (v1: the doctor's device
 *  is assumed to be on their working timezone — good enough to place bookings). */
function localDayKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
/** Minutes since local midnight (device timezone) of an instant. */
function localMinutes(iso: string): number {
  const d = new Date(iso);
  return d.getHours() * 60 + d.getMinutes();
}

function AgendaTab({
  onMsg,
  onOpenConsultation,
}: {
  onMsg: (m: string) => void;
  onOpenConsultation?: (id: string) => void;
}) {
  const { tr } = useT();
  const [rows, setRows] = useState<AvailabilityDto[]>([]);
  const [view, setView] = useState<'month' | 'week' | 'day'>('week');
  const [cursor, setCursor] = useState(utcToday); // UTC midnight of the focused day
  const [sel, setSel] = useState<{ id: string; t: number } | null>(null);
  const [qa, setQa] = useState<number | null>(null); // quick-add: UTC day, or null
  const [start, setStart] = useState('09:00');
  const [end, setEnd] = useState('13:00');
  const [repeat, setRepeat] = useState(1);
  const [kind, setKind] = useState<'VIDEO' | 'MESSAGES'>('VIDEO'); // quick-add block kind
  const [twd, setTwd] = useState(1); // legacy weekly-template form
  const [tStart, setTStart] = useState('09:00');
  const [tEnd, setTEnd] = useState('13:00');
  const [tKind, setTKind] = useState<'VIDEO' | 'MESSAGES'>('VIDEO');
  const [busy, setBusy] = useState(false);
  // Inline edit of the selected block (pre-filled from it when opened).
  const [edit, setEdit] = useState(false);
  const [eStart, setEStart] = useState('09:00');
  const [eEnd, setEEnd] = useState('13:00');
  const [eKind, setEKind] = useState<'VIDEO' | 'MESSAGES'>('VIDEO');
  const [eScope, setEScope] = useState<'all' | 'day'>('all'); // recurring blocks only
  // 409 from edit/remove: consultations the change would cancel — the doctor
  // must explicitly confirm (families are then refunded + invited to rebook).
  const [conflict, setConflict] = useState<{
    affected: AffectedConsultation[];
    retry: () => void;
  } | null>(null);
  // Kind filter for month/week (day always shows everything — it's the
  // editing surface). Persisted like the other pedia_* preferences.
  const [agKind, setAgKind] = useState<'all' | 'VIDEO' | 'MESSAGES'>('all');
  // My working timezone (profile) — the grid's hours are wall clock in it.
  const [myTz, setMyTz] = useState<string | undefined>(undefined);
  // Booked VIDEO consultations overlaid on the calendar (fetched per visible range).
  const [bookings, setBookings] = useState<MyBookingDto[]>([]);
  const [selBk, setSelBk] = useState<MyBookingDto | null>(null);
  // Vacation (unavailability) inline form.
  const [vac, setVac] = useState(false);
  const [vacFrom, setVacFrom] = useState('');
  const [vacTo, setVacTo] = useState('');
  // Desktop drag-to-create (week view): day + start/end minutes while dragging.
  const [drag, setDrag] = useState<{ t: number; a: number; b: number } | null>(null);
  const dragged = useRef(false); // swallow the cell click that follows a drag
  const today = utcToday();

  useEffect(() => {
    Api.me()
      .then((m) => setMyTz(m.timezone))
      .catch(() => {}); // label only — the agenda works without it
  }, []);

  useEffect(() => {
    const saved = typeof window !== 'undefined' && localStorage.getItem('pedia_ag_kind');
    if (saved === 'VIDEO' || saved === 'MESSAGES' || saved === 'all') setAgKind(saved);
  }, []);
  function pickAgKind(k: 'all' | 'VIDEO' | 'MESSAGES') {
    setAgKind(k);
    setSel(null);
    if (typeof window !== 'undefined') localStorage.setItem('pedia_ag_kind', k);
  }

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
  // Selecting a different block (or clearing) always leaves edit mode.
  useEffect(() => {
    setEdit(false);
  }, [sel]);

  /** Visible date range [from, to] (UTC days) for the current view. */
  function visibleRange(): [number, number] {
    if (view === 'week') {
      const w0 = mondayOf(cursor);
      return [w0, w0 + 6 * DAY_MS];
    }
    if (view === 'month') {
      const c = new Date(cursor);
      const g0 = mondayOf(Date.UTC(c.getUTCFullYear(), c.getUTCMonth(), 1));
      const nm = Date.UTC(c.getUTCFullYear(), c.getUTCMonth() + 1, 1);
      const cells = Math.ceil((nm - g0) / DAY_MS / 7) * 7;
      return [g0, g0 + (cells - 1) * DAY_MS]; // ≤ 42 days — under the API's 62-day cap
    }
    return [cursor, cursor];
  }
  /** Fetch the booked consultations for the visible range (overlay only). */
  function refreshBookings() {
    const [f, t] = visibleRange();
    Api.myBookings(isoDay(f), isoDay(t))
      .then(setBookings)
      .catch(() => {}); // overlay only — the agenda still works without it
  }
  useEffect(() => {
    refreshBookings();
    setSelBk(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, cursor]);
  /** Bookings on a UTC calendar day (matched by the device-local date). */
  const bookingsOn = (t: number) =>
    bookings
      .filter((b) => localDayKey(b.scheduledAt) === isoDay(t))
      .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
  const bkTime = (b: MyBookingDto) =>
    new Date(b.scheduledAt).toLocaleTimeString(appLocale(), { hour: '2-digit', minute: '2-digit' });

  async function add(data: { date?: string; repeatWeeks?: number; weekday?: number; startMinute: number; endMinute: number; kind?: 'VIDEO' | 'MESSAGES' }) {
    setBusy(true);
    try {
      await Api.addAvailability({ ...data, slotMinutes: 20 });
      onMsg(tr('Disponibilidade adicionada ✓'));
      setQa(null);
      await load();
    } catch (e) {
      onMsg(`Erro: ${String(e)}`);
    } finally {
      setBusy(false);
    }
  }
  async function del(id: string, confirm = false) {
    setBusy(true);
    try {
      await Api.deleteAvailability(id, confirm);
      if (confirm) onMsg(tr('Alteração aplicada — famílias notificadas e reembolsadas ✓'));
      setConflict(null);
      setSel(null);
      setEdit(false);
      await load();
    } catch (e) {
      const affected = (e as { affected?: AffectedConsultation[] }).affected;
      if (affected?.length) setConflict({ affected, retry: () => void del(id, true) });
      else onMsg(`Erro: ${String(e)}`);
    } finally {
      setBusy(false);
    }
  }

  /** Open the inline edit form pre-filled with the selected block. */
  function openEdit(a: AvailabilityDto) {
    setEStart(hhmm(a.startMinute));
    setEEnd(hhmm(a.endMinute));
    setEKind(a.kind ?? 'VIDEO');
    setEScope('all');
    setEdit(true);
  }

  async function saveEdit(id: string, t: number, recurring: boolean, confirm = false) {
    setBusy(true);
    try {
      await Api.updateAvailability(id, {
        startMinute: toMin(eStart),
        endMinute: toMin(eEnd),
        kind: eKind,
        // Scope only applies to recurring blocks: 'day' materializes just the
        // selected date; dated blocks are edited directly.
        ...(recurring
          ? { scope: eScope, ...(eScope === 'day' ? { date: isoDay(t) } : {}) }
          : {}),
        ...(confirm ? { confirm: true } : {}),
      });
      onMsg(
        confirm
          ? tr('Alteração aplicada — famílias notificadas e reembolsadas ✓')
          : tr('Bloco atualizado ✓'),
      );
      setConflict(null);
      setEdit(false);
      setSel(null);
      await load();
    } catch (e) {
      const affected = (e as { affected?: AffectedConsultation[] }).affected;
      if (affected?.length)
        setConflict({ affected, retry: () => void saveEdit(id, t, recurring, true) });
      else onMsg(`Erro: ${String(e)}`);
    } finally {
      setBusy(false);
    }
  }

  /** Rows default to VIDEO — older backends may omit the kind entirely. */
  const isMsg = (a: AvailabilityDto) => (a.kind ?? 'VIDEO') === 'MESSAGES';
  const kindLabel = (a: AvailabilityDto) => (isMsg(a) ? `💬 ${tr('Mensagens')}` : `🎥 ${tr('Vídeo')}`);
  const visBlocks = (blocks: AvailabilityDto[]) =>
    agKind === 'all' ? blocks : blocks.filter((b) => (isMsg(b) ? 'MESSAGES' : 'VIDEO') === agKind);

  /**
   * Effective blocks for a UTC day. The dated-override rule is applied PER
   * KIND (matching the backend): a dated video block replaces only the video
   * template that day — the message windows keep their own template.
   * Whether a block is recurring is intrinsic: `!a.date`.
   */
  function effective(t: number): { blocks: AvailabilityDto[] } {
    const key = isoDay(t);
    const wd = new Date(t).getUTCDay();
    const pick = (msg: boolean) => {
      const dated = rows.filter((r) => isMsg(r) === msg && r.date && r.date.slice(0, 10) === key);
      if (dated.length) return dated;
      return rows.filter((r) => isMsg(r) === msg && !r.date && r.weekday === wd);
    };
    return {
      blocks: [...pick(false), ...pick(true)].sort((a, b) => a.startMinute - b.startMinute),
    };
  }
  function openQuickAdd(t: number, s: number, e: number) {
    setQa(t);
    setStart(hhmm(s));
    setEnd(hhmm(e));
    setRepeat(1);
    setSel(null);
    setVac(false);
    if (agKind !== 'all') setKind(agKind); // the active filter is the likely intent
  }

  // ── Vacation (closed days) ──
  /** Dated closed rows (vacation markers) for a UTC day. */
  const closedRowsOn = (t: number) =>
    rows.filter((r) => r.closed && r.date && r.date.slice(0, 10) === isoDay(t));
  /** Fully closed day: both kinds (video AND messages) have a closed row. */
  function dayClosed(t: number): boolean {
    const cr = closedRowsOn(t);
    return cr.some((r) => !isMsg(r)) && cr.some((r) => isMsg(r));
  }
  function openVac() {
    setVacFrom(isoDay(today));
    setVacTo(isoDay(today + 7 * DAY_MS));
    setVac(true);
    setQa(null);
    setSel(null);
  }
  async function markVacation(confirm = false) {
    setBusy(true);
    try {
      const r = await Api.markUnavailability(vacFrom, vacTo, confirm);
      onMsg(
        tr('Período marcado como indisponível ✓') +
          (r.cancelled > 0 ? ` · ${r.cancelled} ${tr('cancelamentos')}` : ''),
      );
      setConflict(null);
      setVac(false);
      await load();
      refreshBookings();
    } catch (e) {
      const affected = (e as { affected?: AffectedConsultation[] }).affected;
      if (affected?.length) setConflict({ affected, retry: () => void markVacation(true) });
      else onMsg(`Erro: ${String(e)}`);
    } finally {
      setBusy(false);
    }
  }
  /** Reopen a closed day: delete its closed rows (free — no bookings on them). */
  async function reopenDay(t: number) {
    setBusy(true);
    try {
      for (const r of closedRowsOn(t)) await Api.deleteAvailability(r.id);
      onMsg(tr('Dia reaberto ✓'));
      await load();
    } catch (e) {
      onMsg(`Erro: ${String(e)}`);
    } finally {
      setBusy(false);
    }
  }

  // ── Duplicate last week (week view) ──
  /** Copy every effective block of the previous week onto the visible week as dated blocks. */
  async function copyPrevWeek() {
    setBusy(true);
    try {
      for (let i = 0; i < 7; i++) {
        const src = effective(week0 - 7 * DAY_MS + i * DAY_MS).blocks.filter((b) => !b.closed);
        for (const b of src) {
          await Api.addAvailability({
            date: isoDay(week0 + i * DAY_MS),
            kind: b.kind ?? 'VIDEO',
            startMinute: b.startMinute,
            endMinute: b.endMinute,
            slotMinutes: b.slotMinutes || 20,
          });
        }
      }
      onMsg(tr('Semana copiada ✓'));
      await load();
    } catch (e) {
      onMsg(`Erro: ${String(e)}`);
    } finally {
      setBusy(false);
    }
  }

  // ── Desktop drag-to-create (≥900px, week view) ──
  /** Minute-of-day under the pointer, snapped to 30 min, clamped to the grid. */
  function colMinute(e: React.MouseEvent, el: HTMLElement): number {
    const r = el.getBoundingClientRect();
    const frac = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
    return Math.round((AGC_START_H * 60 + frac * AGC_SPAN) / 30) * 30;
  }
  function dragStart(t: number, e: React.MouseEvent<HTMLDivElement>) {
    if (typeof window === 'undefined' || !window.matchMedia('(min-width: 900px)').matches) return;
    // Blocks and booking chips keep their own click behavior.
    if ((e.target as HTMLElement).closest('.agcal-block, .agcal-bk')) return;
    const m = colMinute(e, e.currentTarget);
    setDrag({ t, a: m, b: m });
  }
  function dragMove(t: number, e: React.MouseEvent<HTMLDivElement>) {
    if (!drag || drag.t !== t) return;
    const m = colMinute(e, e.currentTarget);
    if (m !== drag.b) setDrag({ ...drag, b: m });
    if (m !== drag.a) dragged.current = true;
  }
  function dragEnd() {
    if (!drag) return;
    const s = Math.min(drag.a, drag.b);
    const e = Math.max(drag.a, drag.b);
    setDrag(null);
    if (e > s) openQuickAdd(drag.t, s, e); // else: plain click — the cell handles it
    // The click that follows this mouseup may land on a cell (swallowed there)
    // or on the column (cross-cell drags) — either way, clear the flag after it.
    setTimeout(() => {
      dragged.current = false;
    }, 0);
  }
  function nav(dir: -1 | 1) {
    setSel(null);
    if (view === 'month') {
      const d = new Date(cursor);
      setCursor(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + dir, 1));
    } else setCursor(cursor + dir * (view === 'week' ? 7 : 1) * DAY_MS);
  }

  const hours = Array.from({ length: AGC_END_H - AGC_START_H }, (_, i) => AGC_START_H + i);
  const week0 = mondayOf(cursor);
  const weekDays = Array.from({ length: 7 }, (_, i) => week0 + i * DAY_MS);
  const cur = new Date(cursor);
  const gridStart = mondayOf(Date.UTC(cur.getUTCFullYear(), cur.getUTCMonth(), 1));
  const nextMonth = Date.UTC(cur.getUTCFullYear(), cur.getUTCMonth() + 1, 1);
  const monthCells = Array.from(
    { length: Math.ceil((nextMonth - gridStart) / DAY_MS / 7) * 7 },
    (_, i) => gridStart + i * DAY_MS,
  );
  const narrow = Array.from({ length: 7 }, (_, i) => fmtUTC(Date.UTC(2024, 0, 1 + i), { weekday: 'narrow' }));
  const wkEnd = week0 + 6 * DAY_MS;
  const period =
    view === 'month'
      ? fmtUTC(cursor, { month: 'long', year: 'numeric' })
      : view === 'week'
        ? new Date(week0).getUTCMonth() === new Date(wkEnd).getUTCMonth()
          ? `${new Date(week0).getUTCDate()}–${fmtUTC(wkEnd, { day: 'numeric', month: 'short', year: 'numeric' })}`
          : `${fmtUTC(week0, { day: 'numeric', month: 'short' })} – ${fmtUTC(wkEnd, { day: 'numeric', month: 'short', year: 'numeric' })}`
        : fmtUTC(cursor, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  const selRow = sel ? (rows.find((r) => r.id === sel.id) ?? null) : null;
  const dayEff = effective(cursor);
  // "Copy last week" heuristic: the visible week is fully empty and the
  // previous one has (non-closed) effective blocks worth copying.
  const weekEmpty = weekDays.every((t) => effective(t).blocks.length === 0);
  const prevWeekHas = weekDays.some((t) =>
    effective(t - 7 * DAY_MS).blocks.some((b) => !b.closed),
  );
  // Tapped booking chip/card → small details card with a jump to the inbox.
  const bkDetails = selBk ? (
    <div className="card" style={{ marginTop: 10 }}>
      <strong>🎥 {tr('Videoconsulta')}</strong> · {when(selBk.scheduledAt)}
      <div style={{ marginTop: 2 }}>{selBk.childName}</div>
      <div className="muted">{tr(statusLabel(selBk.status))}</div>
      <div className="row" style={{ marginTop: 8 }}>
        {onOpenConsultation ? (
          <button className="btn small" onClick={() => onOpenConsultation(selBk.consultationId)}>
            {tr('Abrir na caixa')}
          </button>
        ) : null}
        <button className="btn secondary small" onClick={() => setSelBk(null)}>
          {tr('Fechar')}
        </button>
      </div>
    </div>
  ) : null;
  const tmplRows = rows
    .filter((r) => !r.date)
    .sort((a, b) => ((a.weekday + 6) % 7) - ((b.weekday + 6) % 7) || a.startMinute - b.startMinute);

  const details =
    selRow && sel ? (
      edit ? (
        <div className="card section" style={{ marginTop: 10 }}>
          <h3>{tr('Editar bloco')}</h3>
          <p style={{ margin: '4px 0' }}>
            <strong>{fmtUTC(sel.t, { weekday: 'long', day: 'numeric', month: 'long' })}</strong>
          </p>
          <div className="seg" role="radiogroup" aria-label={tr('Tipo de bloco')} style={{ marginTop: 8 }}>
            <button
              role="radio"
              aria-checked={eKind === 'VIDEO'}
              className={eKind === 'VIDEO' ? 'active' : ''}
              onClick={() => setEKind('VIDEO')}
            >
              🎥 {tr('Vídeo')}
            </button>
            <button
              role="radio"
              aria-checked={eKind === 'MESSAGES'}
              className={eKind === 'MESSAGES' ? 'active' : ''}
              onClick={() => setEKind('MESSAGES')}
            >
              💬 {tr('Mensagens')}
            </button>
          </div>
          <div className="row" style={{ marginTop: 8 }}>
            <label className="muted">
              {tr('Início')} <input type="time" value={eStart} onChange={(e) => setEStart(e.target.value)} />
            </label>
            <label className="muted">
              {tr('Fim')} <input type="time" value={eEnd} onChange={(e) => setEEnd(e.target.value)} />
            </label>
          </div>
          {!selRow.date ? (
            <div className="seg" role="radiogroup" aria-label={tr('Aplicar a')} style={{ marginTop: 8 }}>
              <button
                role="radio"
                aria-checked={eScope === 'all'}
                className={eScope === 'all' ? 'active' : ''}
                onClick={() => setEScope('all')}
              >
                {tr('Todas as semanas')}
              </button>
              <button
                role="radio"
                aria-checked={eScope === 'day'}
                className={eScope === 'day' ? 'active' : ''}
                onClick={() => setEScope('day')}
              >
                {tr('Só este dia')}
              </button>
            </div>
          ) : null}
          <div className="row" style={{ marginTop: 8 }}>
            <button
              className="btn small"
              onClick={() => void saveEdit(selRow.id, sel.t, !selRow.date)}
              disabled={busy}
            >
              {tr('Guardar')}
            </button>
            <button className="btn secondary small" onClick={() => setEdit(false)} disabled={busy}>
              {tr('Cancelar')}
            </button>
          </div>
        </div>
      ) : (
        <div className="card" style={{ marginTop: 10 }}>
          <strong>{fmtUTC(sel.t, { weekday: 'long', day: 'numeric', month: 'long' })}</strong> ·{' '}
          {hhmm(selRow.startMinute)}–{hhmm(selRow.endMinute)}
          <div style={{ marginTop: 2 }}>{kindLabel(selRow)}</div>
          <div className="muted">
            {selRow.date ? tr('Dia específico') : tr('Recorrente (semana-tipo)')}
            {isMsg(selRow) ? '' : ` · ${tr('slots')} ${selRow.slotMinutes} min`}
          </div>
          {!selRow.date ? (
            <p className="muted" style={{ fontSize: 12, margin: '6px 0 0' }}>
              ⚠️ {tr('Bloco semanal recorrente — remover apaga-o em TODAS as semanas.')}
            </p>
          ) : null}
          <div className="row" style={{ marginTop: 8 }}>
            <button className="btn secondary small" onClick={() => openEdit(selRow)} disabled={busy}>
              {tr('Editar')}
            </button>
            <button className="btn danger small" onClick={() => del(selRow.id)} disabled={busy}>
              {tr('Remover')}
            </button>
            <button className="btn secondary small" onClick={() => setSel(null)}>
              {tr('Fechar')}
            </button>
          </div>
        </div>
      )
    ) : null;

  return (
    <div className="section">
      <h2>{tr('Agenda de disponibilidade')}</h2>
      {/* Shared by edit & remove: the change would cancel booked consultations —
          the doctor confirms explicitly, families get refunded + rebook invites. */}
      {conflict ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={tr('Esta alteração afeta consultas marcadas')}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            background: 'rgba(8, 10, 18, 0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
        >
          <div className="card" style={{ maxWidth: 420, width: '100%' }}>
            <strong>⚠️ {tr('Esta alteração afeta consultas marcadas')}</strong>
            <div style={{ margin: '8px 0' }}>
              {conflict.affected.map((a) => (
                <div key={a.consultationId} className="row" style={{ padding: '3px 0', gap: 8 }}>
                  <span className="pill">{a.childInitials}</span>
                  <span>{when(a.scheduledAt)}</span>
                </div>
              ))}
            </div>
            <p className="muted" style={{ fontSize: 13, margin: '0 0 8px' }}>
              {tr('As famílias serão reembolsadas na totalidade e convidadas a remarcar — com o mesmo pediatra noutro horário ou com outro.')}
            </p>
            <div className="row">
              <button className="btn danger small" onClick={() => conflict.retry()} disabled={busy}>
                {tr('Confirmar indisponibilidade')}
              </button>
              <button className="btn secondary small" onClick={() => setConflict(null)} disabled={busy}>
                {tr('Cancelar')}
              </button>
            </div>
          </div>
        </div>
      ) : null}
      <div className="agcal-toolbar">
        <div className="seg" role="tablist">
          {(['month', 'week', 'day'] as const).map((v) => (
            <button key={v} className={view === v ? 'active' : ''} onClick={() => { setView(v); setSel(null); }}>
              {tr(v === 'month' ? 'Mês' : v === 'week' ? 'Semana' : 'Dia')}
            </button>
          ))}
        </div>
        <div className="row" style={{ gap: 4 }}>
          <button className="btn secondary small" aria-label={tr('Anterior')} onClick={() => nav(-1)}>
            ‹
          </button>
          <button className="btn secondary small" onClick={() => { setCursor(today); setSel(null); }}>
            {tr('Hoje')}
          </button>
          <button className="btn secondary small" aria-label={tr('Seguinte')} onClick={() => nav(1)}>
            ›
          </button>
        </div>
        <strong className="agcal-period">{period}</strong>
      </div>
      <p className="muted" style={{ fontSize: 12, margin: '0 0 8px' }}>
        🕐 {tr('Horas no teu fuso de trabalho')}
        {myTz ? ` (${tzCity(myTz)})` : ''}.
      </p>
      <div className="row" style={{ gap: 6, flexWrap: 'wrap', margin: '0 0 8px' }}>
        <div className="seg" role="radiogroup" aria-label={tr('Tipo de bloco')}>
          <button
            role="radio"
            aria-checked={agKind === 'all'}
            className={agKind === 'all' ? 'active' : ''}
            onClick={() => pickAgKind('all')}
          >
            {tr('Tudo')}
          </button>
          <button
            role="radio"
            aria-checked={agKind === 'VIDEO'}
            className={`agseg-v${agKind === 'VIDEO' ? ' active' : ''}`}
            onClick={() => pickAgKind('VIDEO')}
          >
            {tr('Vídeo')}
          </button>
          <button
            role="radio"
            aria-checked={agKind === 'MESSAGES'}
            className={`agseg-m${agKind === 'MESSAGES' ? ' active' : ''}`}
            onClick={() => pickAgKind('MESSAGES')}
          >
            {tr('Mensagens')}
          </button>
        </div>
        <button
          className="btn secondary small"
          onClick={() => openQuickAdd(view === 'week' && today >= week0 && today <= wkEnd ? today : view === 'week' ? week0 : cursor, 9 * 60, 13 * 60)}
        >
          ＋ {tr('Adicionar')}
        </button>
        <button className="btn secondary small" onClick={openVac} disabled={busy}>
          {tr('🏖️ Férias')}
        </button>
        {view === 'week' && weekEmpty && prevWeekHas ? (
          <button className="btn secondary small" onClick={() => void copyPrevWeek()} disabled={busy}>
            {tr('Copiar semana anterior')}
          </button>
        ) : null}
      </div>

      {vac ? (
        <div className="card section">
          <h3>{tr('🏖️ Férias')}</h3>
          <div className="row" style={{ marginTop: 8, flexWrap: 'wrap' }}>
            <label className="muted">
              {tr('De')} <input type="date" value={vacFrom} onChange={(e) => setVacFrom(e.target.value)} />
            </label>
            <label className="muted">
              {tr('Até')} <input type="date" value={vacTo} onChange={(e) => setVacTo(e.target.value)} />
            </label>
          </div>
          <p className="muted" style={{ fontSize: 12, margin: '6px 0 0' }}>
            {tr('Os dias ficam indisponíveis para vídeo e mensagens. Consultas já marcadas terão de ser canceladas e reembolsadas.')}
          </p>
          <div className="row" style={{ marginTop: 8 }}>
            <button className="btn" onClick={() => void markVacation()} disabled={busy || !vacFrom || !vacTo}>
              {tr('Marcar indisponibilidade')}
            </button>
            <button className="btn secondary" onClick={() => setVac(false)} disabled={busy}>
              {tr('Cancelar')}
            </button>
          </div>
        </div>
      ) : null}

      {rows.length === 0 && qa === null ? (
        <div className="card" style={{ margin: '8px 0' }}>
          <p className="muted" style={{ marginTop: 0 }}>
            {tr('Ainda sem disponibilidade. Toca num dia ou numa hora vazia do calendário para adicionar os teus horários.')}
          </p>
          <button className="btn" onClick={() => openQuickAdd(today, 9 * 60, 13 * 60)}>
            ＋ {tr('Adicionar disponibilidade')}
          </button>
        </div>
      ) : null}

      {view === 'month' ? (
        <div className="agcal-month">
          {narrow.map((n, i) => (
            <span key={i} className="agcal-mwd" aria-hidden="true">
              {n}
            </span>
          ))}
          {monthCells.map((t) => {
            const eff = effective(t);
            const out = new Date(t).getUTCMonth() !== cur.getUTCMonth();
            const open = visBlocks(eff.blocks.filter((b) => !b.closed));
            const nBk = bookingsOn(t).length;
            const closed = dayClosed(t);
            return (
              <button
                key={t}
                type="button"
                className={`agcal-mday${out ? ' out' : ''}${t < today ? ' past' : ''}${t === today ? ' today' : ''}`}
                aria-label={fmtUTC(t, { weekday: 'long', day: 'numeric', month: 'long' })}
                onClick={() => { setCursor(t); setView('day'); setSel(null); }}
              >
                <span className="num">{new Date(t).getUTCDate()}</span>
                {nBk > 0 ? (
                  <span className="agcal-mcount" aria-hidden="true">
                    {nBk}🎥
                  </span>
                ) : null}
                {closed ? (
                  <span className="agcal-mvac" aria-hidden="true">
                    🏖️
                  </span>
                ) : (
                  <>
                    {open.slice(0, 3).map((b) => (
                      <span key={b.id} className={`agcal-mbar${isMsg(b) ? ' msg' : ''}`} />
                    ))}
                    {open.length > 3 ? <span className="agcal-mmore">+{open.length - 3}</span> : null}
                  </>
                )}
              </button>
            );
          })}
        </div>
      ) : null}

      {view === 'week' ? (
        <>
          <div className="agcal-head">
            <span className="agcal-axislbl" aria-hidden="true" />
            {weekDays.map((t) => (
              <button
                key={t}
                type="button"
                className={`agcal-daylbl${t === today ? ' today' : ''}`}
                aria-label={`${fmtUTC(t, { weekday: 'long', day: 'numeric', month: 'long' })} · ${tr('Dia')}`}
                onClick={() => { setCursor(t); setView('day'); setSel(null); }}
              >
                {fmtUTC(t, { weekday: 'short', day: 'numeric' })}
                {dayClosed(t) ? ' 🏖️' : ''}
              </button>
            ))}
          </div>
          <div className="agcal-grid">
            <div className="agcal-axis" aria-hidden="true">
              {hours.map((h) => (
                <span key={h} style={{ top: `${(((h - AGC_START_H) * 60) / AGC_SPAN) * 100}%` }}>
                  {hhmm(h * 60)}
                </span>
              ))}
            </div>
            {weekDays.map((t) => {
              const eff = effective(t);
              const dLbl = fmtUTC(t, { weekday: 'short', day: 'numeric' });
              return (
                <div
                  key={t}
                  className={`agcal-col${t === today ? ' today' : ''}${t < today ? ' past' : ''}${dayClosed(t) ? ' closed' : ''}`}
                  onMouseDown={(e) => dragStart(t, e)}
                  onMouseMove={(e) => dragMove(t, e)}
                  onMouseUp={dragEnd}
                  onMouseLeave={() => {
                    if (drag?.t === t) {
                      setDrag(null);
                      dragged.current = false;
                    }
                  }}
                >
                  {hours.map((h) => (
                    <button
                      key={h}
                      type="button"
                      className="agcal-cell"
                      disabled={busy}
                      aria-label={`${tr('Adicionar disponibilidade')} · ${dLbl} ${hhmm(h * 60)}–${hhmm((h + 1) * 60)}`}
                      onClick={() => {
                        // A completed drag already opened quick-add — swallow
                        // the click the mouseup also produced on this cell.
                        if (dragged.current) {
                          dragged.current = false;
                          return;
                        }
                        openQuickAdd(t, h * 60, (h + 1) * 60);
                      }}
                    />
                  ))}
                  {drag && drag.t === t && drag.a !== drag.b ? (
                    <div
                      className="agcal-dragsel"
                      aria-hidden="true"
                      style={{
                        top: `${((Math.min(drag.a, drag.b) - AGC_START_H * 60) / AGC_SPAN) * 100}%`,
                        height: `${(Math.abs(drag.b - drag.a) / AGC_SPAN) * 100}%`,
                      }}
                    />
                  ) : null}
                  {(() => {
                    // Week view optimizes scanning, not per-block labels: solid
                    // fills, side-by-side lanes when both kinds share hours, and
                    // no in-block text in "Tudo" (color/position carry it).
                    const blocks = visBlocks(eff.blocks.filter((b) => !b.closed));
                    const lanes =
                      blocks.some((b) => isMsg(b)) && blocks.some((b) => !isMsg(b));
                    return blocks.map((a) => {
                      const s = Math.max(a.startMinute, AGC_START_H * 60);
                      const e = Math.min(a.endMinute, AGC_END_H * 60);
                      if (e <= s) return null;
                      const isSel = sel?.id === a.id && sel.t === t;
                      return (
                        <button
                          key={a.id}
                          type="button"
                          className={`agcal-block${a.date ? ' dated' : ''}${isMsg(a) ? ' msg' : ''}${isSel ? ' selected' : ''}`}
                          style={{
                            top: `${((s - AGC_START_H * 60) / AGC_SPAN) * 100}%`,
                            height: `${((e - s) / AGC_SPAN) * 100}%`,
                            ...(lanes
                              ? isMsg(a)
                                ? { left: '51%', right: 2 }
                                : { left: 2, right: '51%' }
                              : {}),
                          }}
                          aria-label={`${dLbl} ${hhmm(a.startMinute)}–${hhmm(a.endMinute)} · ${isMsg(a) ? tr('Mensagens') : tr('Vídeo')}${a.date ? '' : ` · ${tr('recorrente')}`}`}
                          onClick={() => setSel(isSel ? null : { id: a.id, t })}
                        >
                          {agKind !== 'all' ? hhmm(a.startMinute) : null}
                        </button>
                      );
                    });
                  })()}
                  {bookingsOn(t).map((b) => {
                    // Booked consultations sit ABOVE availability fills, placed
                    // by device-local time (assumed = working timezone, v1).
                    const m = localMinutes(b.scheduledAt);
                    const s = Math.max(m, AGC_START_H * 60);
                    const e = Math.min(m + 20, AGC_END_H * 60);
                    if (e <= s) return null;
                    const isSel = selBk?.consultationId === b.consultationId;
                    return (
                      <button
                        key={b.consultationId}
                        type="button"
                        className={`agcal-bk${isSel ? ' selected' : ''}`}
                        style={{
                          top: `${((s - AGC_START_H * 60) / AGC_SPAN) * 100}%`,
                          height: `${((e - s) / AGC_SPAN) * 100}%`,
                        }}
                        aria-label={`${tr('Videoconsulta')} · ${dLbl} ${bkTime(b)} · ${b.childName}`}
                        onClick={() => setSelBk(isSel ? null : b)}
                      >
                        🎥 {bkTime(b)}
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
          {agKind !== 'all' &&
          rows.length > 0 &&
          weekDays.every((t) => visBlocks(effective(t).blocks).length === 0) ? (
            <div className="row" style={{ alignItems: 'center', gap: 8, marginTop: 6 }}>
              <span className="muted" style={{ fontSize: 12 }}>
                {agKind === 'VIDEO'
                  ? tr('Sem blocos de vídeo nesta semana.')
                  : tr('Sem blocos de mensagens nesta semana.')}
              </span>
              <button className="chip" onClick={() => pickAgKind('all')}>
                {tr('Mostrar tudo')}
              </button>
            </div>
          ) : null}
          {bkDetails}
          {details ??
            (bkDetails ? null : rows.length ? (
              <p className="muted" style={{ fontSize: 12, marginTop: 6 }}>
                {tr('Toca num bloco para ver detalhes, ou numa hora vazia para adicionar.')}
              </p>
            ) : null)}
        </>
      ) : null}

      {view === 'day' ? (
        <>
          {dayClosed(cursor) ? (
            <div className="card" style={{ margin: '8px 0' }}>
              <strong>🏖️ {tr('Dia marcado como indisponível')}</strong>
              <div className="row" style={{ marginTop: 8 }}>
                <button className="btn secondary small" onClick={() => void reopenDay(cursor)} disabled={busy}>
                  {tr('Reabrir dia')}
                </button>
              </div>
            </div>
          ) : null}
          {bookingsOn(cursor).length ? (
            <div className="grid" style={{ marginBottom: 8 }}>
              {bookingsOn(cursor).map((b) => {
                const isSel = selBk?.consultationId === b.consultationId;
                return (
                  <button
                    key={b.consultationId}
                    type="button"
                    className={`card agcal-bkcard${isSel ? ' selected' : ''}`}
                    onClick={() => setSelBk(isSel ? null : b)}
                  >
                    <strong>🎥 {bkTime(b)}</strong> {b.childName}
                    <div className="muted">
                      {tr('Videoconsulta')} · {tr(statusLabel(b.status))}
                    </div>
                  </button>
                );
              })}
            </div>
          ) : null}
          {dayEff.blocks.filter((b) => !b.closed).length ? (
            <div className="grid">
              {dayEff.blocks.filter((b) => !b.closed).map((a) => {
                const isSel = sel?.id === a.id && sel.t === cursor;
                return (
                  <button
                    key={a.id}
                    type="button"
                    className={`card agcal-daycard${a.date ? '' : ' tmpl'}${isMsg(a) ? ' msg' : ''}${isSel ? ' selected' : ''}`}
                    onClick={() => setSel(isSel ? null : { id: a.id, t: cursor })}
                  >
                    <strong>
                      {hhmm(a.startMinute)}–{hhmm(a.endMinute)}
                    </strong>{' '}
                    {kindLabel(a)}
                    <div className="muted">
                      {a.date ? tr('Dia específico') : tr('recorrente')}
                      {isMsg(a) ? '' : ` · ${tr('slots')} ${a.slotMinutes} min`}
                    </div>
                  </button>
                );
              })}
            </div>
          ) : dayClosed(cursor) ? null : (
            <p className="muted">{tr('Sem blocos neste dia.')}</p>
          )}
          {bkDetails}
          {details}
          {dayClosed(cursor) ? null : (
            <>
              <h3 style={{ marginTop: 12 }}>{tr('Horas livres — toca para adicionar')}</h3>
              <div className="agcal-freelist">
                {hours
                  .filter(
                    (h) =>
                      !dayEff.blocks.some(
                        (a) => !a.closed && a.startMinute < (h + 1) * 60 && a.endMinute > h * 60,
                      ),
                  )
                  .map((h) => (
                    <button
                      key={h}
                      type="button"
                      className="agcal-freerow"
                      disabled={busy}
                      onClick={() => openQuickAdd(cursor, h * 60, (h + 1) * 60)}
                    >
                      + {hhmm(h * 60)}–{hhmm((h + 1) * 60)}
                    </button>
                  ))}
              </div>
            </>
          )}
        </>
      ) : null}

      {qa !== null ? (
        <div className="card section">
          <h3>{tr('Adicionar disponibilidade')}</h3>
          <p style={{ margin: '4px 0' }}>
            <strong>{fmtUTC(qa, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</strong>
          </p>
          <div className="seg" role="radiogroup" aria-label={tr('Tipo de bloco')} style={{ marginTop: 8 }}>
            <button
              role="radio"
              aria-checked={kind === 'VIDEO'}
              className={kind === 'VIDEO' ? 'active' : ''}
              onClick={() => setKind('VIDEO')}
            >
              🎥 {tr('Vídeo')}
            </button>
            <button
              role="radio"
              aria-checked={kind === 'MESSAGES'}
              className={kind === 'MESSAGES' ? 'active' : ''}
              onClick={() => setKind('MESSAGES')}
            >
              💬 {tr('Mensagens')}
            </button>
          </div>
          {/* Founder ask: períodos como atalho — precisão continua nos campos. */}
          <div className="row" style={{ flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
            {([
              ['Manhã', 9 * 60, 13 * 60],
              ['Tarde', 14 * 60, 19 * 60],
              ['Noite', 19 * 60, 22 * 60],
            ] as const).map(([label, s, e]) => (
              <button
                key={label}
                type="button"
                className={`chip${start === hhmm(s) && end === hhmm(e) ? ' active' : ''}`}
                onClick={() => { setStart(hhmm(s)); setEnd(hhmm(e)); }}
              >
                {tr(label)} {hhmm(s)}–{hhmm(e)}
              </button>
            ))}
          </div>
          <div className="row" style={{ marginTop: 8 }}>
            <label className="muted">
              {tr('Início')} <input type="time" value={start} onChange={(e) => setStart(e.target.value)} />
            </label>
            <label className="muted">
              {tr('Fim')} <input type="time" value={end} onChange={(e) => setEnd(e.target.value)} />
            </label>
          </div>
          <label className="muted" style={{ display: 'block', marginTop: 8 }}>
            {tr('Repetir')}:
            <select value={repeat} onChange={(e) => setRepeat(Number(e.target.value))} style={{ marginLeft: 8 }}>
              <option value={1}>{tr('Só este dia')}</option>
              <option value={2}>{tr('2 semanas')}</option>
              <option value={4}>{tr('4 semanas')}</option>
              <option value={8}>{tr('8 semanas')}</option>
              <option value={12}>{tr('12 semanas')}</option>
            </select>
          </label>
          <p className="muted" style={{ fontSize: 12, margin: '6px 0 0' }}>
            {kind === 'MESSAGES'
              ? tr('Horário de mensagens — sem marcações; as famílias veem quando costumas responder.')
              : tr('Consultas em slots de 20 min.')}
          </p>
          <div className="row" style={{ marginTop: 8 }}>
            <button
              className="btn"
              onClick={() => add({ date: isoDay(qa), repeatWeeks: repeat, startMinute: toMin(start), endMinute: toMin(end), kind })}
              disabled={busy}
            >
              {tr('Adicionar disponibilidade')}
            </button>
            <button className="btn secondary" onClick={() => setQa(null)} disabled={busy}>
              {tr('Cancelar')}
            </button>
          </div>
        </div>
      ) : null}

      <details className="card agcal-tmplsec">
        <summary>{tr('Semana-tipo (recorrente)')}</summary>
        <p className="muted" style={{ fontSize: 12 }}>
          {tr('Blocos que se repetem todas as semanas. Num dia com blocos específicos, só esses contam.')}
        </p>
        {tmplRows.length ? (
          tmplRows.map((a) => (
            <div key={a.id} className="row" style={{ justifyContent: 'space-between', alignItems: 'center', padding: '4px 0' }}>
              <span>
                {tr(WEEKDAYS[a.weekday])} · {hhmm(a.startMinute)}–{hhmm(a.endMinute)} · {kindLabel(a)}
              </span>
              <button className="btn danger small" onClick={() => del(a.id)} disabled={busy}>
                {tr('Remover')}
              </button>
            </div>
          ))
        ) : (
          <p className="muted">{tr('Sem blocos recorrentes.')}</p>
        )}
        <div className="row" style={{ marginTop: 8, flexWrap: 'wrap' }}>
          <label className="muted">
            {tr('Dia')}:
            <select value={twd} onChange={(e) => setTwd(Number(e.target.value))} style={{ marginLeft: 8 }}>
              {AGC_DAYS.map((i) => (
                <option key={i} value={i}>
                  {tr(WEEKDAYS[i])}
                </option>
              ))}
            </select>
          </label>
          <label className="muted">
            {tr('Início')} <input type="time" value={tStart} onChange={(e) => setTStart(e.target.value)} />
          </label>
          <label className="muted">
            {tr('Fim')} <input type="time" value={tEnd} onChange={(e) => setTEnd(e.target.value)} />
          </label>
          <label className="muted">
            {tr('Tipo')}:
            <select
              value={tKind}
              onChange={(e) => setTKind(e.target.value as 'VIDEO' | 'MESSAGES')}
              style={{ marginLeft: 8 }}
            >
              <option value="VIDEO">🎥 {tr('Vídeo')}</option>
              <option value="MESSAGES">💬 {tr('Mensagens')}</option>
            </select>
          </label>
          <button
            className="btn secondary small"
            onClick={() => add({ weekday: twd, startMinute: toMin(tStart), endMinute: toMin(tEnd), kind: tKind })}
            disabled={busy}
          >
            {tr('Adicionar bloco')}
          </button>
        </div>
      </details>
    </div>
  );
}

// ───────────────────────── Pediatrician: Profile + services ─────────────────────────
/** Timezones the platform's doctors actually work from (PT + ES + AO). */
const COMMON_TZS = [
  'Europe/Lisbon',
  'Atlantic/Azores',
  'Atlantic/Madeira',
  'Europe/Madrid',
  'Africa/Luanda',
];

function PedProfileTab({ onMsg, onLeave }: { onMsg: (m: string) => void; onLeave: () => void }) {
  const { tr } = useT();
  const [me, setMe] = useState<PedMeDto | null>(null);
  const [bio, setBio] = useState('');
  const [busy, setBusy] = useState(false);
  const [stype, setStype] = useState('MESSAGE');
  const [sprice, setSprice] = useState('18');
  const [ssla, setSsla] = useState('4');
  const [tz, setTz] = useState('');

  async function load() {
    try {
      const m = await Api.me();
      setMe(m);
      setBio(m.bio ?? '');
      setTz(m.timezone ?? '');
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
      onMsg(tr('Perfil atualizado ✓'));
      await load();
    } catch (e) {
      onMsg(`Erro: ${String(e)}`);
    } finally {
      setBusy(false);
    }
  }
  async function saveTz(next?: string) {
    const value = next ?? tz;
    if (!value) return;
    setBusy(true);
    try {
      await Api.updateMe({ timezone: value });
      setTz(value);
      onMsg(tr('Fuso horário atualizado ✓'));
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
      onMsg(tr('Serviço adicionado ✓'));
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

  if (!me) return <p className="muted section">{tr('A carregar…')}</p>;

  return (
    <div className="section">
      <h2>{tr('O meu perfil')}</h2>
      <div className="card">
        {me.displayName ? <strong>{me.displayName}</strong> : null}
        <div style={{ marginTop: me.displayName ? 4 : 0 }}>
          <span className="pill ok">{me.status}</span> · ⭐ {me.ratingAvg.toFixed(1)} ·{' '}
          {me.experienceYears ?? 0} {tr('anos')}
        </div>
        <div className="muted">
          {tr(specLabel(me.specialties?.[0]))} · {me.languages.join(' · ')}
        </div>
      </div>
      <div className="card section">
        <h3>Bio</h3>
        <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} />
        <button className="btn" onClick={saveBio} disabled={busy}>
          {tr('Guardar')}
        </button>
      </div>
      <div className="card section">
        <h3>{tr('Fuso horário')}</h3>
        <p className="muted" style={{ fontSize: 13 }}>
          {tr('A agenda e o horário de mensagens seguem este fuso — as famílias veem as horas convertidas para o delas.')}
        </p>
        {(() => {
          // The select always contains: the common zones, the saved zone (even
          // if exotic), and the device zone when it isn't listed yet.
          const dev = deviceTZ();
          const options = [...COMMON_TZS];
          if (tz && !options.includes(tz)) options.push(tz);
          if (dev && !options.includes(dev)) options.push(dev);
          return (
            <div className="row" style={{ alignItems: 'center', flexWrap: 'wrap' }}>
              <select value={tz} onChange={(e) => setTz(e.target.value)}>
                {!tz ? <option value="">—</option> : null}
                {options.map((o) => (
                  <option key={o} value={o}>
                    {tzCity(o)} · {o}
                    {o === dev && !COMMON_TZS.includes(o) ? ` (${tr('detetado no dispositivo')})` : ''}
                  </option>
                ))}
              </select>
              <button
                className="btn small"
                onClick={() => void saveTz()}
                disabled={busy || !tz || tz === (me.timezone ?? '')}
              >
                {tr('Guardar')}
              </button>
            </div>
          );
        })()}
        {me.timezone && me.timezone !== deviceTZ() ? (
          <p className="muted" style={{ fontSize: 13, margin: '8px 0 0' }}>
            {tr('O teu dispositivo está em')} {tzCity(deviceTZ())}.{' '}
            <button
              className="btn secondary small"
              onClick={() => void saveTz(deviceTZ())}
              disabled={busy}
            >
              {tr('Usar este')}
            </button>
          </p>
        ) : null}
      </div>

      <h3 style={{ marginTop: 20 }}>{tr('Serviços')}</h3>
      <div className="grid">
        {me.services.map((s: ServiceDto) => (
          <div key={s.id} className="card">
            <strong>{tr(svcLabel(s.type))}</strong> · {euro(s.priceCents)}
            <div className="muted">SLA {s.slaHours}h{s.active === false ? ` · ${tr('inativo')}` : ''}</div>
            <button className="btn danger small" onClick={() => delService(s.id)} disabled={busy}>
              {tr('Remover')}
            </button>
          </div>
        ))}
      </div>
      <div className="card section">
        <h3>{tr('Adicionar serviço')}</h3>
        <label className="muted">
          {tr('Tipo')}:
          <select value={stype} onChange={(e) => setStype(e.target.value)} style={{ marginLeft: 8 }}>
            <option value="MESSAGE">{tr('Mensagem')}</option>
            <option value="VIDEO">{tr('Vídeo')}</option>
            <option value="SECOND_OPINION">{tr('Segunda opinião')}</option>
            <option value="FOLLOW_UP">{tr('Seguimento')}</option>
          </select>
        </label>
        <div className="row" style={{ marginTop: 8 }}>
          <label className="muted">
            {tr('Preço €')}
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
          {tr('Adicionar serviço')}
        </button>
      </div>

      <DocumentsSection onMsg={onMsg} />

      <ContentAuthor onMsg={onMsg} />

      <h3 style={{ marginTop: 20 }}>{tr('Subscrição')}</h3>
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
  const { tr } = useT();
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
      onMsg(tr('Indica o nome do ficheiro.'));
      return;
    }
    setBusy(true);
    try {
      await Api.submitDocument({ kind, fileName: fileName.trim() });
      onMsg(tr('Documento submetido para verificação ✓'));
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
      <h3>{tr('Documentos de verificação')}</h3>
      <p className="muted">
        {tr('Submete a cédula profissional e outros comprovativos. A equipa de compliance analisa e aprova. (O upload do ficheiro em si fica disponível quando o armazenamento seguro estiver ativo.)')}
      </p>
      {docs.length > 0 ? (
        <div className="grid" style={{ marginBottom: 12 }}>
          {docs.map((d) => (
            <div key={d.id} className="card">
              <span className={docStatusPill(d.status)}>{tr(docStatusLabel(d.status))}</span>
              <div>
                <strong>{tr(DOC_KINDS.find((k) => k.value === d.kind)?.label ?? d.kind)}</strong>
              </div>
              <div className="muted">{d.fileName}</div>
              {d.note ? <div className="muted">{tr('Nota')}: {d.note}</div> : null}
            </div>
          ))}
        </div>
      ) : (
        <p className="muted">{tr('Ainda não submeteste documentos.')}</p>
      )}
      <label className="muted">
        {tr('Tipo')}
        <select value={kind} onChange={(e) => setKind(e.target.value)} style={{ marginLeft: 8 }}>
          {DOC_KINDS.map((k) => (
            <option key={k.value} value={k.value}>
              {tr(k.label)}
            </option>
          ))}
        </select>
      </label>
      <input
        className="search"
        placeholder={tr('Nome do ficheiro (ex.: cedula-12345.pdf)')}
        value={fileName}
        onChange={(e) => setFileName(e.target.value)}
        style={{ marginTop: 8 }}
      />
      <button className="btn" onClick={submit} disabled={busy} style={{ marginTop: 8 }}>
        {tr('Submeter documento')}
      </button>
    </div>
  );
}

// ───────────────────────── Subscriptions (parent + pediatrician) ─────────────────────────
// "A minha conta" → profile photo + preferred payment method (family-facing).
const PAYMENT_OPTIONS: { key: string; icon: string; name: string; brand: boolean }[] = [
  { key: 'card', icon: '💳', name: 'Cartão de crédito/débito', brand: false },
  { key: 'mbway', icon: 'Ⓜ️', name: 'MB WAY', brand: true },
  { key: 'apple_pay', icon: '🍎', name: 'Apple Pay', brand: true },
  { key: 'google_pay', icon: 'G', name: 'Google Pay', brand: true },
];

function AccountProfileCards({ onMsg }: { onMsg: (m: string) => void }) {
  const { tr } = useT();
  const [me, setMe] = useState<UserMeDto | null>(null);
  // Billing card (NIF + family region)
  const [nifInput, setNifInput] = useState('');
  const [region, setRegion] = useState('');
  const [postal, setPostal] = useState('');
  const [billingBusy, setBillingBusy] = useState(false);

  useEffect(() => {
    Api.userMe()
      .then(setMe)
      .catch(() => {}); // older backend — cards degrade gracefully
    Api.familyMe()
      .then((f: FamilyMeDto | null) => {
        if (f) {
          setRegion(f.region ?? '');
          setPostal(f.postalCode ?? '');
        }
      })
      .catch(() => {}); // non-parent or older backend — row keeps its defaults
  }, []);

  async function saveNif(value: string | null) {
    setBillingBusy(true);
    try {
      await Api.setBilling(value);
      setMe((m) => (m ? { ...m, nif: value } : m));
      setNifInput('');
      onMsg(value ? tr('NIF guardado ✓') : tr('NIF removido ✓'));
    } catch (e) {
      // Surface the backend message as-is (e.g. 400 "NIF inválido.").
      onMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setBillingBusy(false);
    }
  }
  async function saveRegion() {
    setBillingBusy(true);
    try {
      await Api.setFamilyRegion(region, postal || undefined);
      onMsg(tr('Região guardada ✓'));
    } catch (e) {
      onMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setBillingBusy(false);
    }
  }

  async function savePhoto(dataUrl: string) {
    try {
      await Api.setMyPhoto(dataUrl);
      setMe((m) => (m ? { ...m, photoUrl: dataUrl } : m));
      onMsg(tr('Foto atualizada ✓'));
    } catch (e) {
      onMsg(`Erro: ${String(e)}`);
    }
  }
  async function removePhoto() {
    try {
      await Api.removeMyPhoto();
      setMe((m) => (m ? { ...m, photoUrl: null } : m));
      onMsg(tr('Foto removida ✓'));
    } catch (e) {
      onMsg(`Erro: ${String(e)}`);
    }
  }
  async function pickPayment(method: string) {
    const prev = me?.preferredPayment ?? null;
    if (prev === method) return;
    setMe((m) => (m ? { ...m, preferredPayment: method } : m)); // optimistic
    try {
      await Api.setPaymentMethod(method);
      onMsg(tr('Método de pagamento atualizado ✓'));
    } catch (e) {
      setMe((m) => (m ? { ...m, preferredPayment: prev } : m));
      onMsg(`Erro: ${String(e)}`);
    }
  }

  return (
    <>
      <div className="card" style={{ marginTop: 8 }}>
        <h3 style={{ marginTop: 0 }}>{tr('O meu perfil')}</h3>
        <div className="row" style={{ alignItems: 'center', gap: 16 }}>
          <AvatarPicker
            photoUrl={me?.photoUrl}
            fallback={
              <span style={{ color: 'var(--muted)' }}>
                <TabIcon name="person" />
              </span>
            }
            onSave={savePhoto}
            onRemove={removePhoto}
          />
          <div style={{ minWidth: 0 }}>
            <strong style={{ display: 'block' }}>{me?.name ?? ''}</strong>
            <span className="muted" style={{ fontSize: 13, overflowWrap: 'anywhere' }}>
              {me?.email ?? ''}
            </span>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <h3 style={{ marginTop: 0 }}>{tr('Pagamento')}</h3>
        <div className="list" style={{ marginTop: 8 }}>
          {PAYMENT_OPTIONS.map((p) => {
            const selected = me?.preferredPayment === p.key;
            return (
              <button key={p.key} className="lrow" onClick={() => void pickPayment(p.key)}>
                <span
                  aria-hidden
                  style={{
                    width: 28,
                    textAlign: 'center',
                    fontWeight: p.key === 'google_pay' ? 700 : undefined,
                    fontSize: 18,
                    flex: 'none',
                  }}
                >
                  {p.icon}
                </span>
                <span className="lrow-main">
                  <strong>{p.brand ? p.name : tr(p.name)}</strong>
                </span>
                {selected ? <span className="pill ok">✓ {tr('Predefinido')}</span> : null}
              </button>
            );
          })}
        </div>
        <p className="muted" style={{ fontSize: 12, marginBottom: 0 }}>
          {tr('O método predefinido será usado nas consultas. A cobrança real é ativada com a ligação ao processador de pagamentos.')}
        </p>
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <h3 style={{ marginTop: 0 }}>{tr('Faturação')}</h3>
        {/* NIF */}
        <strong style={{ fontSize: 13 }}>{tr('NIF')}</strong>
        {me?.nif ? (
          <div className="row" style={{ alignItems: 'center', gap: 8, marginTop: 4 }}>
            <strong>{me.nif}</strong>
            <button
              className="btn small secondary"
              onClick={() => void saveNif(null)}
              disabled={billingBusy}
            >
              {tr('Remover')}
            </button>
          </div>
        ) : (
          <p className="muted" style={{ margin: '4px 0' }}>
            {tr('Sem NIF — as faturas são emitidas como consumidor final.')}
          </p>
        )}
        <div className="row" style={{ marginTop: 6 }}>
          <input
            inputMode="numeric"
            maxLength={9}
            placeholder={tr('NIF (9 dígitos)')}
            value={nifInput}
            onChange={(e) => setNifInput(e.target.value.replace(/\D/g, '').slice(0, 9))}
            style={{ width: 150 }}
          />
          <button
            className="btn small"
            disabled={billingBusy || nifInput.length !== 9}
            onClick={() => void saveNif(nifInput)}
          >
            {tr('Guardar')}
          </button>
        </div>
        <p className="muted" style={{ fontSize: 12 }}>
          {tr('Adiciona o NIF se quiseres faturas com número de contribuinte (dedução no IRS).')}
        </p>

        {/* Family region (market-coverage signal) */}
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 10 }}>
          <strong style={{ fontSize: 13 }}>{tr('Região')}</strong>
          <div className="row" style={{ marginTop: 6, flexWrap: 'wrap' }}>
            <select value={region} onChange={(e) => setRegion(e.target.value)}>
              <option value="">{tr('— escolher —')}</option>
              {PT_REGIONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            <input
              inputMode="numeric"
              maxLength={4}
              placeholder={tr('Código postal (4 dígitos)')}
              value={postal}
              onChange={(e) => setPostal(e.target.value.replace(/\D/g, '').slice(0, 4))}
              style={{ width: 190 }}
            />
            <button
              className="btn small"
              disabled={billingBusy || !region || (postal.length > 0 && postal.length !== 4)}
              onClick={() => void saveRegion()}
            >
              {tr('Guardar')}
            </button>
          </div>
          <p className="muted" style={{ fontSize: 12, marginBottom: 0 }}>
            {tr('Ajuda-nos a perceber onde reforçar a rede de pediatras. Não guardamos a tua morada.')}
          </p>
        </div>
      </div>
    </>
  );
}

function SubscriptionSection({ onMsg }: { onMsg: (m: string) => void }) {
  const { tr } = useT();
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
      onMsg(tr('Subscrição ativada ✓'));
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
      onMsg(tr('Subscrição cancelada.'));
      await load();
    } catch (e) {
      onMsg(`Erro: ${String(e)}`);
    } finally {
      setBusy(false);
    }
  }

  if (!loaded) return <p className="muted">{tr('A carregar…')}</p>;

  if (sub) {
    return (
      <div className="card">
        <span className="pill ok">{tr('Ativo')}</span>
        <h3 style={{ margin: '6px 0' }}>{sub.catalog.name}</h3>
        <div className="muted">{euro(sub.priceCents)} / {tr('mês')}</div>
        <ul>
          {sub.catalog.perks.map((p) => (
            <li key={p} className="muted">
              {p}
            </li>
          ))}
        </ul>
        <button className="btn danger small" onClick={cancel} disabled={busy}>
          {tr('Cancelar plano')}
        </button>
      </div>
    );
  }

  return (
    <div className="grid">
      {plans.map((p) => (
        <div key={p.plan} className="card">
          <h3 style={{ margin: '0 0 4px' }}>{p.name}</h3>
          <div className="muted">{euro(p.priceCents)} / {tr('mês')}</div>
          <ul>
            {p.perks.map((perk) => (
              <li key={perk} className="muted">
                {perk}
              </li>
            ))}
          </ul>
          <button className="btn small" onClick={() => subscribe(p.plan)} disabled={busy}>
            {tr('Subscrever')}
          </button>
        </div>
      ))}
      <p className="muted" style={{ fontSize: 13 }}>
        {tr('Sem Stripe configurado, a subscrição ativa-se em modo demonstração (sem cobrança real).')}
      </p>
    </div>
  );
}

// ───────────────────────── Invoices (parent + pediatrician) ─────────────────────────
function InvoicesSection({ onMsg }: { onMsg: (m: string) => void }) {
  const { tr } = useT();
  const [d, setD] = useState<InvoicesDto | null>(null);
  useEffect(() => {
    Api.invoices()
      .then(setD)
      .catch((e) => onMsg(`Erro: ${String(e)}`));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  if (!d) return null;
  const all = [
    ...d.medical.map((i) => ({ ...i, kind: tr('Ato médico') })),
    ...d.commission.map((i) => ({ ...i, kind: tr('Comissão') })),
  ];
  return (
    <div className="section">
      <h3>{tr('Faturas')}</h3>
      {all.length === 0 ? (
        <p className="muted">{tr('Sem faturas. (São emitidas quando uma consulta é paga e fechada.)')}</p>
      ) : (
        all.map((i) => (
          <div key={i.id} className="card" style={{ marginBottom: 8 }}>
            <strong>{euro(i.amountCents)}</strong> <span className="muted">· {i.kind}</span>
            <div className="muted" style={{ fontSize: 12 }}>
              {tr('IVA')} {euro(i.vatCents)} ({i.vatRegime}) · {i.atcud ?? tr('ATCUD pendente')} ·{' '}
              {new Date(i.issuedAt).toLocaleDateString(appLocale())}
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
  const { tr } = useT();
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
      onMsg(tr('Consentimento revogado.'));
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
      onMsg(tr('Exportação concluída ✓ (ficheiro descarregado).'));
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
      onMsg(tr('Conta anonimizada. Sessão terminada.'));
      onLeave();
    } catch (e) {
      onMsg(`Erro: ${String(e)}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="section">
      <h3>{tr('Privacidade (RGPD)')}</h3>
      <div className="card">
        <strong>{tr('Consentimentos')}</strong>
        {consents.length === 0 ? (
          <p className="muted">{tr('Sem consentimentos registados.')}</p>
        ) : (
          consents.map((c) => (
            <div key={c.id} className="row" style={{ justifyContent: 'space-between', marginTop: 6 }}>
              <span>
                {tr(CONSENT_PT[c.subject] ?? c.subject)}{' '}
                <span className={c.revokedAt ? 'pill muted' : 'pill ok'}>
                  {c.revokedAt ? tr('revogado') : tr('ativo')}
                </span>
              </span>
              {!c.revokedAt ? (
                <button className="btn small secondary" onClick={() => revoke(c.id)} disabled={busy}>
                  {tr('Revogar')}
                </button>
              ) : null}
            </div>
          ))
        )}
      </div>

      <div className="card section">
        <strong>{tr('Os teus dados')}</strong>
        <p className="muted" style={{ fontSize: 13 }}>
          {tr('Direito de acesso e portabilidade — descarrega uma cópia em JSON.')}
        </p>
        <button className="btn small" onClick={exportData} disabled={busy}>
          {tr('Exportar os meus dados')}
        </button>
      </div>

      <div className="card section" style={{ borderColor: '#f0b8be' }}>
        <strong style={{ color: '#d7263d' }}>{tr('Apagar conta')}</strong>
        <p className="muted" style={{ fontSize: 13 }}>
          {tr('Direito ao esquecimento — anonimiza a conta (registos legais/contabilísticos são retidos pelo prazo obrigatório).')}
        </p>
        {!confirmDel ? (
          <button className="btn small danger" onClick={() => setConfirmDel(true)}>
            {tr('Apagar a minha conta')}
          </button>
        ) : (
          <div className="row">
            <button className="btn small danger" onClick={del} disabled={busy}>
              {tr('Confirmar apagar')}
            </button>
            <button className="btn small secondary" onClick={() => setConfirmDel(false)}>
              {tr('Cancelar')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ───────────────────────── Pediatrician: Finance ─────────────────────────
/** Start of a "Ganhos" period filter — the fiscal year in PT is the calendar year. */
function finPeriodStart(p: FinPeriod): Date | null {
  if (p === 'all') return null;
  const now = new Date();
  if (p === 'today') return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (p === 'month') return new Date(now.getFullYear(), now.getMonth(), 1);
  if (p === 'quarter') return new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
  return new Date(now.getFullYear(), 0, 1); // year
}

const STMT_PAGE = 30;

function FinanceTab({ onMsg }: { onMsg: (m: string) => void }) {
  const { tr } = useT();
  const [f, setF] = useState<FinanceDto | null>(null);
  const [period, setPeriod] = useState<FinPeriod>('all');
  const [shown, setShown] = useState(STMT_PAGE);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let live = true;
    setLoading(true);
    const from = finPeriodStart(period);
    Api.finance(from ? { from: from.toISOString() } : undefined)
      .then((d) => {
        if (!live) return;
        setF(d);
        setShown(STMT_PAGE);
      })
      .catch((e) => onMsg(`Erro: ${String(e)}`))
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  const stmt = [...(f?.statement ?? [])].sort(
    (a, b) => new Date(b.capturedAt).getTime() - new Date(a.capturedAt).getTime(),
  );

  return (
    <div className="section">
      <h2>{tr('Ganhos')}</h2>
      <div className="row" style={{ flexWrap: 'wrap', gap: 6, margin: '8px 0' }}>
        {([
          ['today', 'Hoje'],
          ['month', 'Este mês'],
          ['quarter', 'Este trimestre'],
          ['year', 'Este ano'],
          ['all', 'Tudo'],
        ] as const).map(([k, label]) => (
          <button key={k} className={`chip${period === k ? ' active' : ''}`} onClick={() => setPeriod(k)}>
            {tr(label)}
          </button>
        ))}
      </div>
      {!f ? (
        <p className="muted">{tr('A carregar…')}</p>
      ) : (
        // Hold the previous render at reduced opacity while refetching — no flash.
        <div style={{ opacity: loading ? 0.6 : 1 }}>
          {/* Uber-style framing (founder decision): the headline is what the
              doctor EARNED. Commission stays in the statement and in the
              commission invoices — where accounting needs it — not as a KPI. */}
          <div className="grid">
            <div className="card accent">
              <div className="muted">{tr('Os teus ganhos')}</div>
              <strong style={{ fontSize: 26 }}>{euro(f.netCents)}</strong>
            </div>
            <div className="card">
              <div className="muted">{tr('Consultas liquidadas')}</div>
              <strong style={{ fontSize: 22 }}>{f.consultationsSettled}</strong>
            </div>
          </div>
          <p className="muted" style={{ fontSize: 12, margin: '6px 0 0' }}>
            {tr('O detalhe por consulta (incluindo a comissão de serviço, dedutível) está no extrato e nas faturas de comissão.')}
          </p>
          <p className="muted" style={{ fontSize: 13 }}>
            {tr('Os valores ficam a zero até existir')} <code>STRIPE_SECRET_KEY</code>{' '}
            {tr('e a consulta ser fechada com pagamento.')}
          </p>
          <h3 style={{ marginTop: 16 }}>{tr('Extrato')}</h3>
          {stmt.length === 0 ? (
            <p className="muted">{tr('Sem movimentos neste período.')}</p>
          ) : (
            <>
              <p className="muted" style={{ fontSize: 12, margin: '0 0 6px' }}>
                {tr('Bruto − comissão = líquido')}
              </p>
              <div className="card" style={{ padding: 0 }}>
                {stmt.slice(0, shown).map((s: StatementEntry, i: number) => (
                  <div
                    key={`${s.consultationId}-${s.capturedAt}`}
                    className="row"
                    style={{
                      justifyContent: 'space-between',
                      gap: 8,
                      flexWrap: 'wrap',
                      padding: '8px 12px',
                      borderTop: i ? '1px solid var(--border)' : 'none',
                    }}
                  >
                    <span>
                      <strong>{tr(svcLabel(s.type))}</strong>
                      <span className="muted" style={{ marginLeft: 6, fontSize: 12 }}>
                        {when(s.capturedAt)}
                      </span>
                    </span>
                    <span style={{ textAlign: 'right' }}>
                      {euro(s.grossCents)}
                      <span className="muted" style={{ margin: '0 6px', fontSize: 12 }}>
                        −{euro(s.feeCents)}
                      </span>
                      <strong>{euro(s.netCents)}</strong>
                    </span>
                  </div>
                ))}
              </div>
              {stmt.length > shown ? (
                <button className="btn secondary" style={{ marginTop: 8 }} onClick={() => setShown((n) => n + STMT_PAGE)}>
                  {tr('Mostrar mais')} ({stmt.length - shown})
                </button>
              ) : null}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ───────────────────────── Admin / Finance ─────────────────────────
function AdminTab({ onMsg }: { onMsg: (m: string) => void }) {
  const { tr } = useT();
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
      onMsg(tr('Reembolso registado ✓'));
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
      <h2>{tr('Consultas (plataforma)')}</h2>
      {rows.length === 0 ? (
        <p className="muted">{tr('Sem consultas.')}</p>
      ) : (
        <div className="grid">
          {rows.map((c) => (
            <div key={c.id} className="card">
              <span className={statusPill(c.status)}>{tr(statusLabel(c.status))}</span>
              <div>
                <strong>{tr(svcLabel(c.type))}</strong> · {euro(c.priceCents)}
              </div>
              <div className="muted">{when(c.openedAt)}</div>
              <div className="row" style={{ marginTop: 8 }}>
                <button className="btn small secondary" onClick={() => setOpen(c)}>
                  {tr('Ver')}
                </button>
                <button
                  className="btn small danger"
                  onClick={() => refund(c.id)}
                  disabled={busy === c.id || c.status === 'REFUNDED'}
                >
                  {c.status === 'REFUNDED' ? tr('Reembolsada') : tr('Reembolsar')}
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
  const { tr } = useT();
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
      <h2>{tr('Avisos')}</h2>
      {rows.length === 0 ? (
        <p className="muted">{tr('Sem avisos. As notificações aparecem ao criar/fechar consultas.')}</p>
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
            {!n.read ? <span className="pill" style={{ marginLeft: 6 }}>{tr('novo')}</span> : null}
            <div className="muted">{n.body}</div>
            <div className="muted" style={{ fontSize: 12 }}>
              {when(n.createdAt)} · {n.refId ? tr('toca para abrir a consulta') : tr('toca para ver as consultas')}
            </div>
          </button>
        ))
      )}
    </div>
  );
}

// ───────────────────────── Admin: Overview (metrics) ─────────────────────────
function OverviewTab({ onMsg }: { onMsg: (m: string) => void }) {
  const { tr } = useT();
  const [m, setM] = useState<AdminMetrics | null>(null);
  useEffect(() => {
    Api.adminMetrics()
      .then(setM)
      .catch((e) => onMsg(`Erro: ${String(e)}`));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  if (!m) return <p className="muted section">{tr('A carregar…')}</p>;
  const totalUsers = Object.values(m.usersByRole).reduce((a, b) => a + b, 0);
  return (
    <div className="section">
      <h2>{tr('Visão da plataforma')}</h2>
      <div className="grid">
        <div className="card">
          <div className="muted">{tr('Utilizadores')}</div>
          <strong style={{ fontSize: 22 }}>{totalUsers}</strong>
        </div>
        <div className="card">
          <div className="muted">{tr('Famílias · Crianças')}</div>
          <strong style={{ fontSize: 22 }}>
            {m.families} · {m.children}
          </strong>
        </div>
        <div className="card">
          <div className="muted">{tr('Receita bruta')}</div>
          <strong style={{ fontSize: 22 }}>{euro(m.grossCents)}</strong>
        </div>
        <div className="card">
          <div className="muted">{tr('Comissão · Reembolsos')}</div>
          <strong style={{ fontSize: 22 }}>
            {euro(m.commissionCents)} · {m.refunds}
          </strong>
        </div>
      </div>
      <ContentReviewQueue onMsg={onMsg} />
      <MarketSection />
      <div className="card section">
        <h3>{tr('Utilizadores por perfil')}</h3>
        {Object.entries(m.usersByRole).map(([k, v]) => (
          <div key={k} className="row" style={{ justifyContent: 'space-between' }}>
            <span className="muted">{tr(roleLabel(k))}</span>
            <strong>{v}</strong>
          </div>
        ))}
      </div>
      <div className="card section">
        <h3>{tr('Consultas por estado')}</h3>
        {Object.entries(m.consultationsByStatus).map(([k, v]) => (
          <div key={k} className="row" style={{ justifyContent: 'space-between' }}>
            <span className="muted">{tr(statusLabel(k))}</span>
            <strong>{v}</strong>
          </div>
        ))}
        {Object.keys(m.consultationsByStatus).length === 0 ? (
          <p className="muted">{tr('Sem consultas ainda.')}</p>
        ) : null}
      </div>
      <div className="card section">
        <h3>{tr('Pediatras por estado')}</h3>
        {Object.entries(m.pediatriciansByStatus).map(([k, v]) => (
          <div key={k} className="row" style={{ justifyContent: 'space-between' }}>
            <span className="muted">{tr(pedStatus(k).label)}</span>
            <strong>{v}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

// ───────────────────────── Admin: Market analytics ─────────────────────────
// Compact-table cell styles (numbers right-aligned, tabular figures so the
// columns line up vertically).
const mktTh = {
  textAlign: 'left',
  padding: '4px 12px 4px 0',
  fontSize: 12,
  color: 'var(--muted)',
  fontWeight: 600,
  whiteSpace: 'nowrap',
  borderBottom: '1px solid var(--border)',
} as const;
const mktThNum = { ...mktTh, textAlign: 'right' } as const;
const mktTd = {
  padding: '5px 12px 5px 0',
  fontSize: 13,
  whiteSpace: 'nowrap',
  borderBottom: '1px solid var(--border)',
} as const;
const mktTdNum = { ...mktTd, textAlign: 'right', fontVariantNumeric: 'tabular-nums' } as const;

/**
 * Monthly market trend: consultations per month as bars + new families as a
 * 2px line — both are counts, so ONE shared axis. Colors come from the design
 * system (var(--accent) bars, var(--info) line) and were run through the
 * dataviz palette validator on both themes: CVD separation ΔE 72.7 (light) /
 * 61.4 (dark) against a target of 12; the chroma floor sits below target
 * because the whole HOC ramp is deliberately muted, so series identity is
 * reinforced by mark FORM (bar vs. line), the legend and the tooltip, and the
 * light-mode bar-contrast WARN is relieved by the axis ticks, the direct
 * end-label and the tables beside the chart.
 */
function MarketTrendChart({ monthly }: { monthly: MarketMonthRow[] }) {
  const { tr } = useT();
  if (monthly.length === 0 || monthly.every((m) => m.consultations === 0 && m.newFamilies === 0)) {
    return (
      <p className="muted">
        {tr('Ainda sem atividade neste período — o gráfico aparece com as primeiras consultas.')}
      </p>
    );
  }
  const w = 340;
  const h = 170;
  const padL = 34;
  const padR = 8;
  const padT = 14;
  const padB = 18;
  const plotW = w - padL - padR;
  const plotH = h - padT - padB;
  const baseline = padT + plotH;
  const maxRaw = Math.max(...monthly.map((m) => Math.max(m.consultations, m.newFamilies)), 1);
  // Round the axis top up to a clean step (1 / 2 / 2.5 / 5 × 10^k).
  const pow = Math.pow(10, Math.floor(Math.log10(maxRaw)));
  const niceMax = [1, 2, 2.5, 5, 10].map((f) => f * pow).find((v) => v >= maxRaw) ?? maxRaw;
  const x = (i: number) => padL + (plotW / monthly.length) * (i + 0.5);
  const y = (v: number) => padT + plotH - (v / niceMax) * plotH;
  const barW = Math.min(18, (plotW / monthly.length) * 0.55);
  const fmtN = (v: number) =>
    new Intl.NumberFormat(appLocale(), { notation: 'compact', maximumFractionDigits: 1 }).format(v);
  const monthLabel = (m: string) =>
    new Date(`${m}-01T00:00:00`).toLocaleDateString(appLocale(), { month: 'short' });
  // Column with a 4px-rounded data-end and a square baseline.
  const barPath = (i: number, v: number) => {
    const top = y(v);
    const r = Math.min(3.5, barW / 2, baseline - top);
    const x0 = x(i) - barW / 2;
    const x1 = x(i) + barW / 2;
    return `M${x0} ${baseline} L${x0} ${top + r} Q${x0} ${top} ${x0 + r} ${top} L${x1 - r} ${top} Q${x1} ${top} ${x1} ${top + r} L${x1} ${baseline} Z`;
  };
  const linePath = monthly
    .map((m, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(m.newFamilies).toFixed(1)}`)
    .join(' ');
  const last = monthly[monthly.length - 1];
  const totConsults = monthly.reduce((s, m) => s + m.consultations, 0);
  const totFamilies = monthly.reduce((s, m) => s + m.newFamilies, 0);
  const ticks = [0, niceMax / 2, niceMax];
  const colW = plotW / monthly.length;
  return (
    <MarketTrendChartView
      w={w}
      h={h}
      padL={padL}
      padR={padR}
      baseline={baseline}
      padT={padT}
      colW={colW}
      x={x}
      y={y}
      ticks={ticks}
      fmtN={fmtN}
      monthLabel={monthLabel}
      barPath={barPath}
      linePath={linePath}
      monthly={monthly}
      last={last}
      totConsults={totConsults}
      totFamilies={totFamilies}
    />
  );
}

// Presentational layer for MarketTrendChart, with an interactive hover tooltip
// (full-height hit areas per month; the hovered column is highlighted and a
// value card follows the cursor's column). Split out so the hover useState
// lives below the early "no activity" return of MarketTrendChart.
function MarketTrendChartView(props: {
  w: number; h: number; padL: number; padR: number; baseline: number; padT: number;
  colW: number;
  x: (i: number) => number; y: (v: number) => number;
  ticks: number[]; fmtN: (v: number) => string; monthLabel: (m: string) => string;
  barPath: (i: number, v: number) => string; linePath: string;
  monthly: MarketMonthRow[]; last: MarketMonthRow; totConsults: number; totFamilies: number;
}) {
  const { tr } = useT();
  const {
    w, h, padL, padR, baseline, padT, colW, x, y, ticks, fmtN, monthLabel,
    barPath, linePath, monthly, last, totConsults, totFamilies,
  } = props;
  const [hover, setHover] = useState<number | null>(null);
  const hv = hover != null ? monthly[hover] : null;
  const leftPct = hover != null ? Math.min(86, Math.max(14, (x(hover) / w) * 100)) : 50;

  return (
    <div>
      <div className="row" style={{ gap: 14, flexWrap: 'wrap', fontSize: 12, marginBottom: 4 }}>
        <span className="muted" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span
            aria-hidden="true"
            style={{ width: 10, height: 10, borderRadius: 3, background: 'var(--accent)', display: 'inline-block' }}
          />
          {tr('Consultas')}
        </span>
        <span className="muted" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span
            aria-hidden="true"
            style={{ width: 14, borderTop: '2px solid var(--info)', display: 'inline-block' }}
          />
          {tr('Novas famílias')}
        </span>
      </div>
      <div style={{ position: 'relative' }}>
        <svg
          viewBox={`0 0 ${w} ${h}`}
          width="100%"
          role="img"
          aria-label={`${tr('Tendência mensal: consultas em barras e novas famílias em linha.')} ${tr('Consultas')} ${totConsults} · ${tr('Novas famílias')} ${totFamilies}`}
          style={{ display: 'block' }}
        >
          {ticks.map((t) => (
            <g key={t}>
              <line x1={padL} x2={w - padR} y1={y(t)} y2={y(t)} stroke="var(--border)" strokeWidth="1" />
              <text x={padL - 5} y={y(t) + 3} textAnchor="end" fontSize="9" fill="var(--muted)">
                {fmtN(t)}
              </text>
            </g>
          ))}
          {/* Vertical guide on the hovered column. */}
          {hover != null ? (
            <line
              x1={x(hover)}
              x2={x(hover)}
              y1={padT}
              y2={baseline}
              stroke="var(--accent)"
              strokeWidth="1"
              strokeDasharray="3 3"
              opacity="0.5"
            />
          ) : null}
          {monthly.map((m, i) => (
            <g key={m.month}>
              {m.consultations > 0 ? (
                <path
                  d={barPath(i, m.consultations)}
                  fill="var(--accent)"
                  opacity={hover == null || hover === i ? 1 : 0.4}
                  style={{ transition: 'opacity .12s' }}
                />
              ) : null}
              <text x={x(i)} y={h - 5} textAnchor="middle" fontSize="9" fill="var(--muted)">
                {monthLabel(m.month)}
              </text>
            </g>
          ))}
          <path
            d={linePath}
            fill="none"
            stroke="var(--info)"
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {monthly.map((m, i) => (
            <g key={m.month} aria-hidden="true">
              <circle cx={x(i)} cy={y(m.newFamilies)} r={hover === i ? 6.5 : 5.5} fill="var(--surface)" style={{ transition: 'r .12s' }} />
              <circle cx={x(i)} cy={y(m.newFamilies)} r={hover === i ? 5 : 4} fill="var(--info)" style={{ transition: 'r .12s' }} />
            </g>
          ))}
          {last.consultations > 0 && hover == null ? (
            <text
              x={x(monthly.length - 1)}
              y={y(last.consultations) - 4}
              textAnchor="middle"
              fontSize="9"
              fill="var(--text-2)"
            >
              {last.consultations}
            </text>
          ) : null}
          {/* Full-height transparent hit areas — one per month. */}
          {monthly.map((m, i) => (
            <rect
              key={m.month}
              x={x(i) - colW / 2}
              y={padT}
              width={colW}
              height={baseline - padT}
              fill="transparent"
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover((cur) => (cur === i ? null : cur))}
              style={{ cursor: 'pointer' }}
            >
              <title>
                {`${monthLabel(m.month)} · ${tr('Consultas')} ${m.consultations} · ${tr('Novas famílias')} ${m.newFamilies}`}
              </title>
            </rect>
          ))}
        </svg>
        {hv ? (
          <div
            role="status"
            style={{
              position: 'absolute',
              top: 0,
              left: `${leftPct}%`,
              transform: 'translateX(-50%)',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 10,
              boxShadow: '0 6px 20px rgba(0,0,0,.14)',
              padding: '8px 10px',
              pointerEvents: 'none',
              zIndex: 3,
              minWidth: 132,
              fontSize: 12,
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: 4, textTransform: 'capitalize' }}>
              {monthLabel(hv.month)}
            </div>
            <div className="row" style={{ justifyContent: 'space-between', gap: 10 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--accent)' }} />
                {tr('Consultas')}
              </span>
              <strong style={{ fontVariantNumeric: 'tabular-nums' }}>{hv.consultations}</strong>
            </div>
            {Object.entries(hv.byServiceType).length > 0 ? (
              <div className="muted" style={{ fontSize: 11, margin: '1px 0 4px 13px' }}>
                {Object.entries(hv.byServiceType).map(([k, v]) => `${tr(svcLabel(k))} ${v}`).join(' · ')}
              </div>
            ) : null}
            <div className="row" style={{ justifyContent: 'space-between', gap: 10 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <span aria-hidden="true" style={{ width: 10, borderTop: '2px solid var(--info)' }} />
                {tr('Novas famílias')}
              </span>
              <strong style={{ fontVariantNumeric: 'tabular-nums' }}>{hv.newFamilies}</strong>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

// Demand vs. supply per region/specialty + the monthly trend (PLATFORM_ADMIN).
function MarketSection() {
  const { tr } = useT();
  const [market, setMarket] = useState<MarketDto | null | undefined>(undefined);
  const [months, setMonths] = useState(6);
  const [refetching, setRefetching] = useState(false);

  useEffect(() => {
    setRefetching(true);
    Api.adminMarket(months)
      .then(setMarket)
      .catch(() => setMarket((m) => m ?? null)) // older backend — section degrades
      .finally(() => setRefetching(false));
  }, [months]);

  if (market === undefined) return <p className="muted section">{tr('A carregar…')}</p>;
  if (market === null) {
    return (
      <div className="section">
        <h3>{tr('Mercado')}</h3>
        <p className="muted">{tr('Não foi possível carregar os dados de mercado.')}</p>
      </div>
    );
  }

  const regions = [...market.regions].sort((a, b) => b.consultations - a.consultations);
  return (
    <div className="section">
      <h3>{tr('Mercado')}</h3>
      <p className="muted" style={{ fontSize: 13, margin: '0 0 8px' }}>
        {tr('Penetração e equilíbrio entre procura e oferta, por região e por especialidade. Ajuda a decidir onde reforçar pediatras.')}
      </p>
      <div className="row" style={{ gap: 6, marginBottom: 8 }}>
        {[6, 12].map((n) => (
          <button
            key={n}
            className={`btn small ${months === n ? '' : 'secondary'}`}
            aria-pressed={months === n}
            onClick={() => setMonths(n)}
          >
            {n} {tr('meses')}
          </button>
        ))}
      </div>
      {/* Hold the previous render at reduced opacity while refetching — no skeleton flash. */}
      <div style={{ opacity: refetching ? 0.6 : 1 }}>
        <div className="card" style={{ overflowX: 'auto' }}>
          <h4 style={{ margin: '0 0 2px' }}>{tr('Por região')}</h4>
          <p className="muted" style={{ fontSize: 12, margin: '0 0 6px' }}>
            {tr('Procura (famílias, crianças, consultas) vs. oferta (pediatras e horas/semana disponíveis) por distrito. Muitas consultas com poucas horas = falta de oferta.')}
          </p>
          <table style={{ borderCollapse: 'collapse', width: '100%' }}>
            <thead>
              <tr>
                <th style={mktTh}>{tr('Região')}</th>
                <th style={mktThNum}>{tr('Famílias')}</th>
                <th style={mktThNum}>{tr('Crianças')}</th>
                <th style={mktThNum}>{tr('Consultas')}</th>
                <th style={mktThNum}>{tr('Pediatras')}</th>
                <th style={mktThNum}>{tr('Horas/sem')}</th>
              </tr>
            </thead>
            <tbody>
              {regions.map((r) => (
                <tr key={r.region}>
                  <td style={mktTd}>{r.region === 'Sem região' ? tr('Sem região') : r.region}</td>
                  <td style={mktTdNum}>{r.families}</td>
                  <td style={mktTdNum}>{r.children}</td>
                  <td style={mktTdNum}>{r.consultations}</td>
                  <td style={mktTdNum}>{r.activePediatricians}</td>
                  <td style={mktTdNum}>{Math.round(r.offeredHoursWeek)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {regions.length === 0 ? <p className="muted">{tr('Sem dados por região ainda.')}</p> : null}
        </div>

        <div className="card" style={{ overflowX: 'auto', marginTop: 10 }}>
          <h4 style={{ margin: '0 0 2px' }}>{tr('Por especialidade')}</h4>
          <p className="muted" style={{ fontSize: 12, margin: '0 0 6px' }}>
            {tr('Consultas e pediatras ativos por especialidade, com a espera média para vídeo (h). Espera alta indica procura acima da oferta.')}
          </p>
          <table style={{ borderCollapse: 'collapse', width: '100%' }}>
            <thead>
              <tr>
                <th style={mktTh}>{tr('Especialidade')}</th>
                <th style={mktThNum}>{tr('Consultas')}</th>
                <th style={mktThNum}>{tr('Pediatras')}</th>
                <th style={mktThNum}>{tr('Espera vídeo (h)')}</th>
              </tr>
            </thead>
            <tbody>
              {market.specialties.map((s) => (
                <tr key={s.specialty}>
                  <td style={mktTd}>{tr(specLabel(s.specialty))}</td>
                  <td style={mktTdNum}>{s.consultations}</td>
                  <td style={mktTdNum}>{s.activePediatricians}</td>
                  <td style={mktTdNum}>
                    {s.avgVideoLeadHours != null ? s.avgVideoLeadHours.toFixed(1) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {market.specialties.length === 0 ? (
            <p className="muted">{tr('Sem dados por especialidade ainda.')}</p>
          ) : null}
        </div>

        <div className="card" style={{ marginTop: 10 }}>
          <h4 style={{ margin: '0 0 2px' }}>{tr('Tendência mensal')}</h4>
          <p className="muted" style={{ fontSize: 12, margin: '0 0 6px' }}>
            {tr('Consultas realizadas (barras) e novas famílias (linha) mês a mês. Passa o rato numa coluna para ver os valores.')}
          </p>
          <MarketTrendChart monthly={market.monthly} />
        </div>
      </div>
    </div>
  );
}

// ───────────────────────── Admin: Verify pediatricians ─────────────────────────
function VerifyTab({ onMsg }: { onMsg: (m: string) => void }) {
  const { tr } = useT();
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
      onMsg(kind === 'verify' ? tr('Pediatra verificado ✓') : tr('Pediatra suspenso.'));
      await load();
    } catch (e) {
      onMsg(`Erro: ${String(e)}`);
    } finally {
      setBusy('');
    }
  }

  return (
    <div className="section">
      <h2>{tr('Verificação de pediatras')}</h2>
      {rows.length === 0 ? (
        <p className="muted">{tr('Sem pediatras.')}</p>
      ) : (
        <div className="grid">
          {rows.map((p) => (
            <div key={p.id} className="card">
              <span className={p.status === 'ACTIVE' ? 'pill ok' : 'pill warn'}>{p.status}</span>
              <div>
                <strong>{p.displayName ?? p.user?.email ?? p.specialties[0] ?? tr('Pediatra')}</strong>
                {p.displayName && p.user?.email ? (
                  <span className="muted"> · {p.user.email}</span>
                ) : null}
              </div>
              <div className="muted">
                {tr('Licença')} {p.licenseNumber} · ⭐ {p.ratingAvg.toFixed(1)}
              </div>
              <div className="row" style={{ marginTop: 8 }}>
                {p.status !== 'ACTIVE' ? (
                  <button className="btn small" onClick={() => act(p.id, 'verify')} disabled={busy === p.id}>
                    {tr('Verificar')}
                  </button>
                ) : null}
                {p.status !== 'SUSPENDED' ? (
                  <button
                    className="btn small danger"
                    onClick={() => act(p.id, 'suspend')}
                    disabled={busy === p.id}
                  >
                    {tr('Suspender')}
                  </button>
                ) : null}
                <button
                  className="btn small secondary"
                  onClick={() => setOpenDocs(openDocs === p.id ? '' : p.id)}
                >
                  {openDocs === p.id ? tr('Fechar documentos') : tr('Documentos')}
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
  const { tr } = useT();
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
      onMsg(status === 'approved' ? tr('Documento aprovado ✓') : tr('Documento recusado.'));
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
        <p className="muted">{tr('Sem documentos submetidos.')}</p>
      ) : (
        docs.map((d) => (
          <div key={d.id} style={{ marginBottom: 8 }}>
            <span className={docStatusPill(d.status)}>{tr(docStatusLabel(d.status))}</span>{' '}
            <strong>{tr(DOC_KINDS.find((k) => k.value === d.kind)?.label ?? d.kind)}</strong>
            <div className="muted">{d.fileName}</div>
            {d.status === 'pending' ? (
              <div className="row" style={{ marginTop: 4 }}>
                <button className="btn small" onClick={() => review(d.id, 'approved')} disabled={busy === d.id}>
                  {tr('Aprovar')}
                </button>
                <button
                  className="btn small danger"
                  onClick={() => review(d.id, 'rejected')}
                  disabled={busy === d.id}
                >
                  {tr('Recusar')}
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
  const { tr } = useT();
  const [rows, setRows] = useState<AdminUserRow[]>([]);
  const [busy, setBusy] = useState('');
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'disabled'>('all');
  const [loading, setLoading] = useState(true);
  const meId = currentUserId();

  async function load(query?: string) {
    setLoading(true);
    try {
      setRows(await Api.adminUsers(query?.trim() || undefined));
    } catch (e) {
      onMsg(`Erro: ${String(e)}`);
    } finally {
      setLoading(false);
    }
  }
  // Debounced server-side search (name / email / phone / id).
  useEffect(() => {
    const t = setTimeout(() => void load(q), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  async function setRole(id: string, role: string) {
    setBusy(id);
    try {
      await Api.changeUserRole(id, role);
      onMsg(tr('Perfil atualizado ✓'));
      await load(q);
    } catch (e) {
      onMsg(isForbidden(e) ? tr('Sem permissão para alterar perfis (só Admin).') : `Erro: ${String(e)}`);
    } finally {
      setBusy('');
    }
  }

  async function toggleStatus(u: AdminUserRow) {
    const disable = u.status !== 'disabled';
    if (disable && u.id === meId) {
      onMsg(tr('Não podes desativar a tua própria conta.'));
      return;
    }
    const who = u.name || u.email || u.id.slice(0, 8);
    if (
      disable &&
      !window.confirm(`${tr('Desativar')} ${who}? ${tr('A conta perde acesso imediato e não consegue entrar.')}`)
    )
      return;
    setBusy(u.id);
    try {
      await Api.setUserStatus(u.id, disable ? 'disabled' : 'active');
      onMsg(disable ? tr('Conta desativada ✓') : tr('Conta reativada ✓'));
      await load(q);
    } catch (e) {
      onMsg(isForbidden(e) ? tr('Sem permissão (só Admin).') : `Erro: ${String(e)}`);
    } finally {
      setBusy('');
    }
  }

  const shown = rows.filter((u) => filter === 'all' || (u.status ?? 'active') === filter);
  const counts = {
    all: rows.length,
    active: rows.filter((u) => (u.status ?? 'active') !== 'disabled').length,
    disabled: rows.filter((u) => (u.status ?? 'active') === 'disabled').length,
  };
  const filters: { key: 'all' | 'active' | 'disabled'; label: string }[] = [
    { key: 'all', label: 'Todos' },
    { key: 'active', label: 'Ativos' },
    { key: 'disabled', label: 'Inativos' },
  ];

  return (
    <div className="section">
      <h2>{tr('Utilizadores')}</h2>
      <p className="muted" style={{ fontSize: 13, margin: '0 0 8px' }}>
        {tr('Pesquisa por nome, email ou telefone, filtra por estado e ativa ou desativa contas. Desativar remove o acesso de imediato.')}
      </p>
      <input
        className="search"
        placeholder={tr('Procurar por nome, email ou telefone…')}
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <div className="row" style={{ flexWrap: 'wrap', gap: 6, margin: '8px 0' }}>
        {filters.map((f) => (
          <button
            key={f.key}
            className={`chip${filter === f.key ? ' active' : ''}`}
            onClick={() => setFilter(f.key)}
          >
            {tr(f.label)} · {counts[f.key]}
          </button>
        ))}
      </div>
      {loading ? (
        <p className="muted">{tr('A carregar…')}</p>
      ) : shown.length === 0 ? (
        <p className="muted">{q.trim() ? tr('Sem resultados para esta pesquisa.') : tr('Sem utilizadores.')}</p>
      ) : (
        <div className="grid">
          {shown.map((u) => {
            const disabled = (u.status ?? 'active') === 'disabled';
            return (
              <div key={u.id} className="card" style={{ opacity: disabled ? 0.72 : 1 }}>
                <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                  <div style={{ minWidth: 0 }}>
                    <strong style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {u.name || u.email || u.id.slice(0, 8)}
                    </strong>
                    {u.name && u.email ? (
                      <div className="muted" style={{ fontSize: 12 }}>{u.email}</div>
                    ) : null}
                  </div>
                  <span
                    className="pill"
                    style={{
                      background: disabled ? 'var(--danger-bg, rgba(200,60,60,.12))' : 'var(--ok-bg, rgba(40,140,90,.12))',
                      color: disabled ? 'var(--danger, #c0392b)' : 'var(--ok, #1e824c)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {disabled ? tr('Inativo') : tr('Ativo')}
                  </span>
                </div>
                <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
                  {tr('Desde')} {new Date(u.createdAt).toLocaleDateString(appLocale())}
                </div>
                <select
                  value={u.role}
                  onChange={(e) => setRole(u.id, e.target.value)}
                  disabled={busy === u.id}
                  style={{ marginTop: 8, width: '100%' }}
                >
                  {ALL_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {tr(roleLabel(r))}
                    </option>
                  ))}
                </select>
                <button
                  className={`btn small ${disabled ? '' : 'secondary'}`}
                  onClick={() => toggleStatus(u)}
                  disabled={busy === u.id || (!disabled && u.id === meId)}
                  style={{ marginTop: 8, width: '100%' }}
                >
                  {disabled ? tr('Reativar conta') : tr('Desativar conta')}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ───────────────────────── Compliance: Audit log (filterable) ─────────────────────────
const AUDIT_PAGE = 100;
function AuditTab({ onMsg }: { onMsg: (m: string) => void }) {
  const { tr } = useT();
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
      <h2>{tr('Registo de auditoria')}</h2>
      <p className="muted" style={{ fontSize: 13 }}>
        {tr('Trilho imutável de ações (RGPD / responsabilização).')} {rows.length} {tr('eventos.')}
      </p>
      <input
        className="search"
        placeholder={tr('Procurar (ação, entidade, email)…')}
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      {actions.length > 1 ? (
        <div className="row" style={{ flexWrap: 'wrap', gap: 6, margin: '8px 0' }}>
          <button className={`chip${act === '' ? ' active' : ''}`} onClick={() => setAct('')}>
            {tr('Todas')}
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
        <EmptyState title={tr('Sem registos')} hint={rows.length ? tr('Nenhum evento corresponde ao filtro.') : tr('Sem ações registadas ainda.')} />
      ) : (
        shown.map((a) => (
          <div key={a.id} className="card" style={{ marginBottom: 8 }}>
            <strong>{a.action}</strong> · <span className="muted">{a.entityType}</span>
            {a.entityId ? <span className="muted"> · {a.entityId.slice(0, 8)}</span> : null}
            <div className="muted" style={{ fontSize: 12 }}>
              {a.actor?.email ?? tr('sistema')}
              {a.actor?.role ? ` · ${tr(roleLabel(a.actor.role))}` : ''} · {when(a.createdAt)}
            </div>
          </div>
        ))
      )}
      {more && !loading && !needle && !act ? (
        <button className="btn secondary" onClick={() => void loadMore()} disabled={loadingMore} style={{ marginTop: 8 }}>
          {loadingMore ? tr('A carregar…') : tr('Ver mais')}
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

/**
 * Monthly evolution chart (Tesouraria): gross billing as bars + HOC commission
 * as a 2px line with ringed markers — same unit (€), one shared axis. Colors
 * come from the design system (var(--brand-2) bars, var(--accent-press) line)
 * and were run through the dataviz palette validator in both themes: CVD
 * separation ΔE ≥ 58 (target 12) and mark contrast ≥ 3:1 pass; the chroma
 * floor sits below target because the whole HOC ramp is deliberately muted,
 * so series identity is reinforced by mark FORM (bar vs. line), the legend
 * and selective direct labels rather than hue alone.
 */
function FinanceEvolutionChart({ months }: { months: FinanceSeriesMonth[] }) {
  const { tr } = useT();
  if (months.length === 0 || months.every((m) => m.grossCents === 0 && m.platformCents === 0)) {
    return (
      <p className="muted">
        {tr('Ainda sem faturação neste período — o gráfico aparece com os primeiros pagamentos.')}
      </p>
    );
  }
  const w = 340;
  const h = 170;
  const padL = 42;
  const padR = 8;
  const padT = 14;
  const padB = 18;
  const plotW = w - padL - padR;
  const plotH = h - padT - padB;
  const baseline = padT + plotH;
  const maxRaw = Math.max(...months.map((m) => m.grossCents), 1);
  // Round the axis top up to a clean step (1 / 2 / 2.5 / 5 × 10^k).
  const pow = Math.pow(10, Math.floor(Math.log10(maxRaw)));
  const niceMax = [1, 2, 2.5, 5, 10].map((f) => f * pow).find((v) => v >= maxRaw) ?? maxRaw;
  const x = (i: number) => padL + (plotW / months.length) * (i + 0.5);
  const y = (v: number) => padT + plotH - (v / niceMax) * plotH;
  const barW = Math.min(18, (plotW / months.length) * 0.55);
  const fmt = (cents: number) =>
    new Intl.NumberFormat(appLocale(), {
      style: 'currency',
      currency: 'EUR',
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(cents / 100);
  const monthLabel = (m: string) =>
    new Date(`${m}-01T00:00:00`).toLocaleDateString(appLocale(), { month: 'short' });
  // Column with a 4px-rounded data-end and a square baseline.
  const barPath = (i: number, v: number) => {
    const top = y(v);
    const r = Math.min(3.5, barW / 2, baseline - top);
    const x0 = x(i) - barW / 2;
    const x1 = x(i) + barW / 2;
    return `M${x0} ${baseline} L${x0} ${top + r} Q${x0} ${top} ${x0 + r} ${top} L${x1 - r} ${top} Q${x1} ${top} ${x1} ${top + r} L${x1} ${baseline} Z`;
  };
  const linePath = months
    .map((m, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(m.platformCents).toFixed(1)}`)
    .join(' ');
  const last = months[months.length - 1];
  const totGross = months.reduce((s, m) => s + m.grossCents, 0);
  const totPlat = months.reduce((s, m) => s + m.platformCents, 0);
  const ticks = [0, niceMax / 2, niceMax];
  const colW = plotW / months.length;
  return (
    <FinanceEvolutionChartView
      w={w}
      h={h}
      padL={padL}
      padR={padR}
      padT={padT}
      baseline={baseline}
      colW={colW}
      x={x}
      y={y}
      ticks={ticks}
      fmt={fmt}
      monthLabel={monthLabel}
      barPath={barPath}
      linePath={linePath}
      months={months}
      last={last}
      totGross={totGross}
      totPlat={totPlat}
    />
  );
}

// Presentational layer for FinanceEvolutionChart, with the same interactive
// hover tooltip as the market chart. Split out so the hover useState lives
// below the early "no billing yet" return.
function FinanceEvolutionChartView(props: {
  w: number; h: number; padL: number; padR: number; padT: number; baseline: number;
  colW: number;
  x: (i: number) => number; y: (v: number) => number;
  ticks: number[]; fmt: (cents: number) => string; monthLabel: (m: string) => string;
  barPath: (i: number, v: number) => string; linePath: string;
  months: FinanceSeriesMonth[]; last: FinanceSeriesMonth; totGross: number; totPlat: number;
}) {
  const { tr } = useT();
  const {
    w, h, padL, padR, padT, baseline, colW, x, y, ticks, fmt, monthLabel,
    barPath, linePath, months, last, totGross, totPlat,
  } = props;
  const [hover, setHover] = useState<number | null>(null);
  const hv = hover != null ? months[hover] : null;
  const leftPct = hover != null ? Math.min(86, Math.max(14, (x(hover) / w) * 100)) : 50;

  return (
    <div>
      <div className="row" style={{ gap: 14, flexWrap: 'wrap', fontSize: 12, marginBottom: 4 }}>
        <span className="muted" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span
            aria-hidden="true"
            style={{ width: 10, height: 10, borderRadius: 3, background: 'var(--brand-2)', display: 'inline-block' }}
          />
          {tr('Faturação bruta')}
        </span>
        <span className="muted" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span
            aria-hidden="true"
            style={{ width: 14, borderTop: '2px solid var(--accent-press)', display: 'inline-block' }}
          />
          {tr('Comissão HOC')}
        </span>
      </div>
      <div style={{ position: 'relative' }}>
        <svg
          viewBox={`0 0 ${w} ${h}`}
          width="100%"
          role="img"
          aria-label={`${tr('Evolução mensal: faturação bruta em barras e comissão HOC em linha.')} ${tr('Total bruto')} ${euro(totGross)} · ${tr('Comissão HOC')} ${euro(totPlat)}`}
          style={{ display: 'block' }}
        >
          {ticks.map((t) => (
            <g key={t}>
              <line x1={padL} x2={w - padR} y1={y(t)} y2={y(t)} stroke="var(--border)" strokeWidth="1" />
              <text x={padL - 5} y={y(t) + 3} textAnchor="end" fontSize="9" fill="var(--muted)">
                {fmt(t)}
              </text>
            </g>
          ))}
          {hover != null ? (
            <line
              x1={x(hover)}
              x2={x(hover)}
              y1={padT}
              y2={baseline}
              stroke="var(--brand-2)"
              strokeWidth="1"
              strokeDasharray="3 3"
              opacity="0.5"
            />
          ) : null}
          {months.map((m, i) => (
            <g key={m.month}>
              {m.grossCents > 0 ? (
                <path
                  d={barPath(i, m.grossCents)}
                  fill="var(--brand-2)"
                  opacity={hover == null || hover === i ? 1 : 0.4}
                  style={{ transition: 'opacity .12s' }}
                />
              ) : null}
              <text x={x(i)} y={h - 5} textAnchor="middle" fontSize="9" fill="var(--muted)">
                {monthLabel(m.month)}
              </text>
            </g>
          ))}
          <path
            d={linePath}
            fill="none"
            stroke="var(--accent-press)"
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {months.map((m, i) => (
            <g key={m.month} aria-hidden="true">
              <circle cx={x(i)} cy={y(m.platformCents)} r={hover === i ? 6.5 : 5.5} fill="var(--surface)" style={{ transition: 'r .12s' }} />
              <circle cx={x(i)} cy={y(m.platformCents)} r={hover === i ? 5 : 4} fill="var(--accent-press)" style={{ transition: 'r .12s' }} />
            </g>
          ))}
          {last.grossCents > 0 && hover == null ? (
            <text
              x={x(months.length - 1)}
              y={y(last.grossCents) - 4}
              textAnchor="middle"
              fontSize="9"
              fill="var(--text-2)"
            >
              {fmt(last.grossCents)}
            </text>
          ) : null}
          {months.map((m, i) => (
            <rect
              key={m.month}
              x={x(i) - colW / 2}
              y={padT}
              width={colW}
              height={baseline - padT}
              fill="transparent"
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover((cur) => (cur === i ? null : cur))}
              style={{ cursor: 'pointer' }}
            >
              <title>
                {`${monthLabel(m.month)} · ${tr('Bruto')} ${euro(m.grossCents)} · ${tr('Comissão')} ${euro(m.platformCents)}`}
              </title>
            </rect>
          ))}
        </svg>
        {hv ? (
          <div
            role="status"
            style={{
              position: 'absolute',
              top: 0,
              left: `${leftPct}%`,
              transform: 'translateX(-50%)',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 10,
              boxShadow: '0 6px 20px rgba(0,0,0,.14)',
              padding: '8px 10px',
              pointerEvents: 'none',
              zIndex: 3,
              minWidth: 140,
              fontSize: 12,
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: 4, textTransform: 'capitalize' }}>{monthLabel(hv.month)}</div>
            <div className="row" style={{ justifyContent: 'space-between', gap: 10 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--brand-2)' }} />
                {tr('Bruto')}
              </span>
              <strong style={{ fontVariantNumeric: 'tabular-nums' }}>{euro(hv.grossCents)}</strong>
            </div>
            <div className="row" style={{ justifyContent: 'space-between', gap: 10 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <span aria-hidden="true" style={{ width: 10, borderTop: '2px solid var(--accent-press)' }} />
                {tr('Comissão')}
              </span>
              <strong style={{ fontVariantNumeric: 'tabular-nums' }}>{euro(hv.platformCents)}</strong>
            </div>
            {hv.refundedCents ? (
              <div className="row" style={{ justifyContent: 'space-between', gap: 10 }}>
                <span className="muted">{tr('Reembolsos')}</span>
                <strong style={{ fontVariantNumeric: 'tabular-nums' }}>{euro(hv.refundedCents)}</strong>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function FinTreasuryTab({ onMsg }: { onMsg: (m: string) => void }) {
  const { tr } = useT();
  const [m, setM] = useState<AdminMetrics | null>(null);
  const [series, setSeries] = useState<FinanceSeriesDto | null | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    Api.adminMetrics()
      .then(setM)
      .catch((e) => onMsg(`Erro: ${String(e)}`))
      .finally(() => setLoading(false));
    Api.adminFinanceSeries(12)
      .then(setSeries)
      .catch(() => setSeries(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  if (loading) return <Skeleton rows={3} />;
  if (!m) return <EmptyState title={tr('Sem dados')} hint={tr('Não foi possível carregar a tesouraria.')} />;

  const payout = m.grossCents - m.commissionCents;
  const paidCount = (m.consultationsByStatus.ANSWERED ?? 0) + (m.consultationsByStatus.CLOSED ?? 0);
  const avgTicket = paidCount > 0 ? m.grossCents / paidCount : null;
  const effRate = m.grossCents > 0 ? (m.commissionCents / m.grossCents) * 100 : null;
  const totalConsults = Object.values(m.consultationsByStatus).reduce((a, b) => a + b, 0);

  return (
    <div className="section">
      <h2>{tr('Tesouraria HOC')}</h2>
      <p className="muted" style={{ marginTop: -4 }}>{tr('Valores acumulados da plataforma')} · {m.currency}</p>
      {m.grossCents === 0 ? (
        <p className="notice">
          {tr('Sem pagamentos liquidados ainda. Os valores ficam a zero até existir')}{' '}
          <code>STRIPE_SECRET_KEY</code> {tr('no backend e consultas fechadas com pagamento.')}
        </p>
      ) : null}

      <div className="grid">
        <Kpi label={tr('Receita bruta')} value={euro(m.grossCents)} hint={tr('Total cobrado às famílias')} />
        <Kpi label={tr('Comissão da plataforma')} value={euro(m.commissionCents)} hint={tr('Receita HOC (intermediação)')} />
        <Kpi label={tr('A pagar aos pediatras')} value={euro(payout)} hint={tr('Bruto − comissão (payout estimado)')} />
      </div>
      <div className="grid" style={{ marginTop: 10 }}>
        <Kpi label={tr('Reembolsos')} value={String(m.refunds)} hint={tr('Pagamentos reembolsados')} />
        <Kpi label={tr('Ticket médio')} value={avgTicket != null ? euro(avgTicket) : '—'} hint={tr('Receita ÷ consultas pagas')} />
        <Kpi label={tr('Taxa de comissão')} value={effRate != null ? `${effRate.toFixed(1)}%` : '—'} hint={tr('Comissão ÷ bruto')} />
      </div>

      <div className="card section">
        <h3>{tr('Evolução (12 meses)')}</h3>
        {series === undefined ? (
          <p className="muted">{tr('A carregar…')}</p>
        ) : series === null ? (
          <p className="muted">{tr('Não foi possível carregar a evolução.')}</p>
        ) : (
          <>
            <FinanceEvolutionChart months={series.months} />
            {series.months.some((mo) => mo.refundedCents > 0) ? (
              <p className="muted" style={{ fontSize: 12, margin: '6px 0 0' }}>
                {tr('Reembolsado no período')}:{' '}
                {euro(series.months.reduce((s, mo) => s + mo.refundedCents, 0))}
              </p>
            ) : null}
          </>
        )}
      </div>

      <div className="card section">
        <h3>{tr('Consultas por estado')}</h3>
        {Object.entries(m.consultationsByStatus).map(([k, v]) => (
          <div key={k} className="row" style={{ justifyContent: 'space-between' }}>
            <span className={k === 'REFUNDED' || k === 'DISPUTED' ? 'pill warn' : 'muted'}>
              {tr(statusLabel(k))}
            </span>
            <strong>{v}</strong>
          </div>
        ))}
        {totalConsults === 0 ? (
          <p className="muted">{tr('Sem consultas ainda.')}</p>
        ) : (
          <div className="row" style={{ justifyContent: 'space-between', marginTop: 6, borderTop: '1px solid var(--border)', paddingTop: 6 }}>
            <span className="muted">{tr('Total de consultas')}</span>
            <strong>{totalConsults}</strong>
          </div>
        )}
      </div>

      <div className="card section">
        <h3>{tr('Saúde da operação')}</h3>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <span className="muted">{tr('Famílias · Crianças')}</span>
          <strong>{m.families} · {m.children}</strong>
        </div>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <span className="muted">{tr('Pediatras ativos')}</span>
          <strong>{m.pediatriciansByStatus.ACTIVE ?? 0}</strong>
        </div>
      </div>
    </div>
  );
}

const FIN_PAGE = 50;
type FinPeriod = 'today' | 'month' | 'quarter' | 'year' | 'all';
/** Period predicate — fiscal year in PT is the calendar year. */
function inFinPeriod(iso: string, p: FinPeriod): boolean {
  if (p === 'all') return true;
  const d = new Date(iso);
  const now = new Date();
  if (p === 'today') return d.toDateString() === now.toDateString();
  if (d.getFullYear() !== now.getFullYear()) return false;
  if (p === 'year') return true;
  if (p === 'quarter') return Math.floor(d.getMonth() / 3) === Math.floor(now.getMonth() / 3);
  return d.getMonth() === now.getMonth(); // month
}

function FinMovementsTab({ onMsg }: { onMsg: (m: string) => void }) {
  const { tr } = useT();
  const [rows, setRows] = useState<ConsultationDto[]>([]);
  const [open, setOpen] = useState<ConsultationDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [more, setMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [busy, setBusy] = useState('');
  const [filter, setFilter] = useState<'all' | 'paid' | 'REFUNDED' | 'DISPUTED'>('all');
  const [period, setPeriod] = useState<FinPeriod>('all');

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
    if (!window.confirm(`${tr('Confirmar reembolso de')} ${euro(c.priceCents)}? ${tr('Esta ação é financeira.')}`)) return;
    setBusy(c.id);
    try {
      await Api.refund(c.id);
      onMsg(tr('Reembolso registado ✓'));
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
  // Period first (movement date = scheduled slot for video, opening otherwise),
  // then status; the loaded-volume KPIs follow the chosen period.
  const inRange = rows.filter((c) => inFinPeriod(c.scheduledAt ?? c.openedAt, period));
  const shown = inRange.filter((c) =>
    filter === 'all' ? true : filter === 'paid' ? isPaid(c.status) : c.status === filter,
  );
  const volume = inRange.filter((c) => c.status !== 'REFUNDED' && c.status !== 'CANCELLED').reduce((s, c) => s + c.priceCents, 0);
  const refunded = inRange.filter((c) => c.status === 'REFUNDED').reduce((s, c) => s + c.priceCents, 0);

  return (
    <div className="section">
      <h2>{tr('Movimentos')}</h2>
      <p className="muted" style={{ marginTop: -4, fontSize: 13 }}>
        {tr('Lista de atividade recente. Os')} <strong>{tr('totais completos')}</strong>{' '}
        {tr('da plataforma estão na Tesouraria.')}
      </p>
      <div className="grid">
        <Kpi label={tr('Volume carregado')} value={euro(volume)} hint={`${inRange.length} ${tr('movimento(s)')}${more ? '+' : ''}`} />
        <Kpi label={tr('Reembolsado (carregado)')} value={euro(refunded)} />
        <Kpi label={tr('Movimentos carregados')} value={`${rows.length}${more ? '+' : ''}`} />
      </div>
      <div className="row" style={{ flexWrap: 'wrap', gap: 6, margin: '8px 0 0' }}>
        {([
          ['today', 'Hoje'],
          ['month', 'Este mês'],
          ['quarter', 'Este trimestre'],
          ['year', 'Ano fiscal'],
          ['all', 'Tudo'],
        ] as const).map(([k, label]) => (
          <button key={k} className={`chip${period === k ? ' active' : ''}`} onClick={() => setPeriod(k)}>
            {tr(label)}
          </button>
        ))}
      </div>
      <div className="row" style={{ flexWrap: 'wrap', gap: 6, margin: '8px 0' }}>
        {([
          ['all', 'Todos'],
          ['paid', 'Pagas'],
          ['REFUNDED', 'Reembolsadas'],
          ['DISPUTED', 'Em disputa'],
        ] as const).map(([k, label]) => (
          <button key={k} className={`chip${filter === k ? ' active' : ''}`} onClick={() => setFilter(k)}>
            {tr(label)}
          </button>
        ))}
      </div>
      {loading ? (
        <Skeleton rows={3} />
      ) : shown.length === 0 ? (
        <EmptyState title={tr('Sem movimentos')} hint={rows.length ? tr('Nenhum neste filtro.') : tr('Aparecem aqui assim que houver consultas.')} />
      ) : (
        <div className="grid">
          {shown.map((c) => (
            <div key={c.id} className="card">
              <span className={statusPill(c.status)}>{tr(statusLabel(c.status))}</span>
              <div style={{ marginTop: 4 }}>
                <strong>{tr(svcLabel(c.type))}</strong> · {euro(c.priceCents)}
              </div>
              <div className="muted" style={{ fontSize: 13 }}>
                {c.pediatrician?.displayName ?? '—'} · {c.child?.name ?? '—'}
              </div>
              <div className="muted" style={{ fontSize: 12 }}>{when(c.scheduledAt ?? c.openedAt)}</div>
              <div className="row" style={{ marginTop: 8 }}>
                <button className="btn small secondary" onClick={() => setOpen(c)}>{tr('Ver')}</button>
                <button
                  className="btn small danger"
                  onClick={() => refund(c)}
                  disabled={busy === c.id || c.status === 'REFUNDED'}
                >
                  {c.status === 'REFUNDED' ? tr('Reembolsada') : tr('Reembolsar')}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      {more && !loading ? (
        <button className="btn secondary" onClick={() => void loadMore()} disabled={loadingMore} style={{ marginTop: 12 }}>
          {loadingMore ? tr('A carregar…') : tr('Ver mais')}
        </button>
      ) : null}
    </div>
  );
}

// ═════════════════════════ COMPLIANCE ═════════════════════════
function ComplianceOverviewTab({ onMsg, onGoCreds }: { onMsg: (m: string) => void; onGoCreds: () => void }) {
  const { tr } = useT();
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
  if (!m) return <EmptyState title={tr('Sem dados')} hint={tr('Não foi possível carregar.')} />;

  const verified = m.pediatriciansByStatus.ACTIVE ?? 0;
  const pending = m.pediatriciansByStatus.PENDING ?? 0;
  const suspended = m.pediatriciansByStatus.SUSPENDED ?? 0;
  const totalPeds = verified + pending + suspended;

  return (
    <div className="section">
      <h2>{tr('Conformidade')}</h2>
      <p className="notice" style={{ fontSize: 13 }}>
        {tr('ℹ️ Ambiente de demonstração — dados fictícios, sem PII real de menores.')}
      </p>

      <div className="card section">
        <h3>{tr('Verificação de profissionais')}</h3>
        <div className="grid">
          <Kpi label={tr('Verificados')} value={String(verified)} />
          <Kpi label={tr('Pendentes')} value={String(pending)} />
          <Kpi label={tr('Suspensos')} value={String(suspended)} />
        </div>
        <p className="muted" style={{ fontSize: 13, marginTop: 6 }}>
          {totalPeds ? `${verified} ${tr('de')} ${totalPeds} ${tr('profissionais verificados.')}` : tr('Sem profissionais registados.')}
        </p>
        {pending > 0 ? (
          <button className="btn small" onClick={onGoCreds} style={{ marginTop: 4 }}>
            ⚠️ {tr('Rever')} {pending} {tr('credencial(is) pendente(s)')} →
          </button>
        ) : null}
      </div>

      <div className="card section">
        <h3>{tr('Titulares de dados sob tratamento')}</h3>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <span className="muted">{tr('Famílias · Crianças')}</span>
          <strong>{m.families} · {m.children}</strong>
        </div>
        <p className="muted" style={{ fontSize: 12, marginTop: 4 }}>
          {tr('Dados de saúde de menores — categoria especial (art. 9.º RGPD).')}
        </p>
      </div>

      <div className="card section">
        <h3>{tr('Atividade de tratamento (consultas)')}</h3>
        {Object.entries(m.consultationsByStatus).map(([k, v]) => (
          <div key={k} className="row" style={{ justifyContent: 'space-between' }}>
            <span className="muted">{tr(statusLabel(k))}</span>
            <strong>{v}</strong>
          </div>
        ))}
        {Object.keys(m.consultationsByStatus).length === 0 ? <p className="muted">{tr('Sem dados.')}</p> : null}
      </div>

      <div className="card section">
        <h3>{tr('Acessos por perfil')}</h3>
        {Object.entries(m.usersByRole).map(([k, v]) => (
          <div key={k} className="row" style={{ justifyContent: 'space-between' }}>
            <span className="muted">{tr(roleLabel(k))}</span>
            <strong>{v}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

function CredentialsTab({ onMsg }: { onMsg: (m: string) => void }) {
  const { tr } = useT();
  const [rows, setRows] = useState<AdminPedRow[]>([]);
  const [status, setStatus] = useState('PENDING');
  const [loading, setLoading] = useState(true);
  const [openDocs, setOpenDocs] = useState('');

  async function load(s = status) {
    setLoading(true);
    try {
      setRows(await Api.adminPediatricians(s || undefined));
    } catch (e) {
      onMsg(isForbidden(e) ? tr('Sem permissão.') : `Erro: ${String(e)}`);
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
      <h2>{tr('Revisão de credenciais')}</h2>
      <p className="muted" style={{ fontSize: 13 }}>
        {tr('Cédula, diploma e demais documentos. Aprovar documentos não ativa o perfil — a ativação é feita pela Administração.')}
      </p>
      <div className="row" style={{ flexWrap: 'wrap', gap: 6, margin: '8px 0' }}>
        {([
          ['PENDING', 'Pendentes'],
          ['ACTIVE', 'Verificados'],
          ['SUSPENDED', 'Suspensos'],
          ['', 'Todos'],
        ] as const).map(([k, label]) => (
          <button key={k} className={`chip${status === k ? ' active' : ''}`} onClick={() => setStatus(k)}>
            {tr(label)}
          </button>
        ))}
      </div>
      {loading ? (
        <Skeleton rows={2} />
      ) : rows.length === 0 ? (
        <EmptyState title={tr('Fila vazia')} hint={tr('Nenhum profissional neste estado.')} />
      ) : (
        <div className="grid">
          {rows.map((p) => (
            <div key={p.id} className="card">
              <span className={pedStatus(p.status).pill}>{tr(pedStatus(p.status).label)}</span>
              <div style={{ marginTop: 4 }}>
                <strong>{p.displayName ?? p.user?.email ?? p.specialties[0] ?? tr('Pediatra')}</strong>
              </div>
              <div className="muted" style={{ fontSize: 13 }}>
                {tr('Licença')} {p.licenseNumber} · ⭐ {p.ratingAvg.toFixed(1)}
              </div>
              <button
                className="btn small secondary"
                style={{ marginTop: 6 }}
                onClick={() => setOpenDocs(openDocs === p.id ? '' : p.id)}
              >
                {openDocs === p.id ? tr('Ocultar documentos') : tr('Documentos')}
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
  const { tr } = useT();
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
      return onMsg(tr('Indica uma nota a justificar a recusa.'));
    }
    setBusy(id);
    try {
      await Api.reviewDocument(id, status, note[id]?.trim() || undefined);
      onMsg(status === 'approved' ? tr('Documento aprovado ✓') : tr('Documento recusado.'));
      await load();
    } catch (e) {
      onMsg(isForbidden(e) ? tr('Sem permissão para rever.') : `Erro: ${String(e)}`);
    } finally {
      setBusy('');
    }
  }

  return (
    <div style={{ marginTop: 10, borderTop: '1px solid var(--border)', paddingTop: 10 }}>
      {docs.length === 0 ? (
        <p className="muted">{tr('Sem documentos submetidos.')}</p>
      ) : (
        docs.map((d) => (
          <div key={d.id} style={{ marginBottom: 10 }}>
            <span className={docStatusPill(d.status)}>{tr(docStatusLabel(d.status))}</span>{' '}
            <strong>{tr(DOC_KINDS.find((k) => k.value === d.kind)?.label ?? d.kind)}</strong>
            <div className="muted" style={{ fontSize: 13 }}>{d.fileName}</div>
            {d.status !== 'pending' && d.note ? (
              <div className="muted" style={{ fontSize: 12 }}>{tr('Nota')}: {d.note}</div>
            ) : null}
            {d.status === 'pending' ? (
              <>
                <input
                  placeholder={tr('Nota (obrigatória para recusar)')}
                  value={note[d.id] ?? ''}
                  onChange={(e) => setNote((n) => ({ ...n, [d.id]: e.target.value }))}
                  style={{ marginTop: 6 }}
                />
                <div className="row" style={{ marginTop: 4 }}>
                  <button className="btn small" onClick={() => review(d.id, 'approved')} disabled={busy === d.id}>
                    {tr('Aprovar')}
                  </button>
                  <button className="btn small danger" onClick={() => review(d.id, 'rejected')} disabled={busy === d.id}>
                    {tr('Recusar')}
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
    () => onMsg(trs('Copiado ✓')),
    () => onMsg(trs('Não foi possível copiar.')),
  );
}

function SupportUsersTab({ onMsg }: { onMsg: (m: string) => void }) {
  const { tr } = useT();
  const [rows, setRows] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [role, setRole] = useState('');
  const [openUser, setOpenUser] = useState<AdminUserRow | null>(null);
  const [detail, setDetail] = useState<AdminUserDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Server-side search (?q= matches id/email/name/phone), debounced 300 ms.
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      setLoading(true);
      Api.adminUsers(q.trim() || undefined)
        .then((r) => {
          if (!cancelled) setRows(r);
        })
        .catch((e) => onMsg(isForbidden(e) ? tr('Sem permissão.') : `Erro: ${String(e)}`))
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  function openDetail(u: AdminUserRow) {
    setOpenUser(u);
    setDetail(null);
    setDetailLoading(true);
    Api.adminUserDetail(u.id)
      .then(setDetail)
      .catch((e) => onMsg(isForbidden(e) ? tr('Sem permissão.') : `Erro: ${String(e)}`))
      .finally(() => setDetailLoading(false));
  }

  // ── User-360 detail view ──
  if (openUser) {
    const u = detail?.user;
    return (
      <div className="section">
        <button
          className="btn secondary small"
          onClick={() => {
            setOpenUser(null);
            setDetail(null);
          }}
          style={{ marginBottom: 12 }}
        >
          {tr('← Voltar')}
        </button>
        <h2>{openUser.name ?? openUser.email ?? openUser.id.slice(0, 8)}</h2>
        <p className="muted" style={{ fontSize: 12 }}>{tr(SUPPORT_ESCALATION)}</p>
        {detailLoading ? (
          <Skeleton rows={3} />
        ) : !u ? (
          <EmptyState title={tr('Sem dados')} hint={tr('Não foi possível carregar o utilizador.')} />
        ) : (
          <>
            <div className="card">
              <div style={{ marginBottom: 4 }}>
                <span className="pill">{tr(roleLabel(u.role))}</span>{' '}
                <span className={u.status === 'active' ? 'pill ok' : 'pill warn'}>{u.status}</span>
              </div>
              {u.name ? <div><strong>{u.name}</strong></div> : null}
              <div className="muted" style={{ fontSize: 13 }}>
                {u.email ?? '—'}
                {u.phone ? ` · 📞 ${u.phone}` : ''}
              </div>
              <div className="muted" style={{ fontSize: 12 }}>
                {tr('Conta criada a')} {new Date(u.createdAt).toLocaleDateString(appLocale())}
              </div>
              <div className="row" style={{ marginTop: 8 }}>
                {u.email ? (
                  <button className="btn small secondary" onClick={() => copyText(u.email!, onMsg)}>📋 Email</button>
                ) : null}
                <button className="btn small secondary" onClick={() => copyText(u.id, onMsg)}>📋 ID</button>
              </div>
            </div>

            <h3 style={{ marginTop: 18 }}>
              {tr('Consultas')} ({detail!.consultations.length})
            </h3>
            {detail!.consultations.length === 0 ? (
              <p className="muted">{tr('Sem consultas associadas a este utilizador.')}</p>
            ) : (
              <div className="grid">
                {detail!.consultations.map((c) => (
                  <div key={c.id} className="card">
                    <span className={statusPill(c.status)}>{tr(statusLabel(c.status))}</span>{' '}
                    <strong>{tr(svcLabel(c.type))}</strong>
                    {c.child?.name ? <span className="muted"> · {c.child.name}</span> : null}
                    <div className="muted" style={{ fontSize: 13 }}>
                      {c.pediatrician?.displayName ?? '—'}
                    </div>
                    <div className="muted" style={{ fontSize: 12 }}>
                      {c.scheduledAt
                        ? `📅 ${new Date(c.scheduledAt).toLocaleString(appLocale(), { dateStyle: 'short', timeStyle: 'short' })}`
                        : `${tr('Aberta a')} ${new Date(c.openedAt).toLocaleString(appLocale(), { dateStyle: 'short', timeStyle: 'short' })}`}
                      {c.closedAt
                        ? ` · ${tr('fechada a')} ${new Date(c.closedAt).toLocaleDateString(appLocale())}`
                        : ''}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  const roles = Array.from(new Set(rows.map((u) => u.role)));
  const shown = rows.filter((u) => !role || u.role === role);

  return (
    <div className="section">
      <h2>{tr('Procurar utilizador')}</h2>
      <input
        className="search"
        placeholder={tr('Procurar por nome, email, telefone ou ID…')}
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <div className="row" style={{ flexWrap: 'wrap', gap: 6, margin: '8px 0' }}>
        <button className={`chip${role === '' ? ' active' : ''}`} onClick={() => setRole('')}>{tr('Todos')}</button>
        {roles.map((r) => (
          <button key={r} className={`chip${role === r ? ' active' : ''}`} onClick={() => setRole((c) => (c === r ? '' : r))}>
            {tr(roleLabel(r))}
          </button>
        ))}
      </div>
      <p className="muted" style={{ fontSize: 12 }}>{tr(SUPPORT_ESCALATION)}</p>
      {loading ? (
        <Skeleton rows={3} />
      ) : shown.length === 0 ? (
        <EmptyState title={tr('Sem resultados')} hint={tr('Tenta outro email ou limpa os filtros.')} />
      ) : (
        <div className="grid">
          {shown.map((u) => (
            <button
              key={u.id}
              className="card"
              onClick={() => openDetail(u)}
              style={{ textAlign: 'left', cursor: 'pointer' }}
            >
              <strong>{u.name ?? u.email ?? u.id.slice(0, 8)}</strong>
              <div style={{ marginTop: 4 }}>
                <span className="pill">{tr(roleLabel(u.role))}</span>{' '}
                <span className={u.status === 'active' ? 'pill ok' : 'pill warn'}>{u.status}</span>
              </div>
              <div className="muted" style={{ fontSize: 13 }}>
                {u.email ?? '—'}
                {u.phone ? ` · 📞 ${u.phone}` : ''}
              </div>
              <div className="muted" style={{ fontSize: 12 }}>
                {tr('Conta criada a')} {new Date(u.createdAt).toLocaleDateString(appLocale())} · {tr('toca para abrir a ficha →')}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function SupportPedsTab({ onMsg }: { onMsg: (m: string) => void }) {
  const { tr } = useT();
  const [rows, setRows] = useState<AdminPedRow[]>([]);
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [openDocs, setOpenDocs] = useState('');

  useEffect(() => {
    setLoading(true);
    Api.adminPediatricians(status || undefined)
      .then(setRows)
      .catch((e) => onMsg(isForbidden(e) ? tr('Sem permissão.') : `Erro: ${String(e)}`))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const needle = norm(q.trim());
  const shown = rows.filter(
    (p) => !needle || norm(`${p.displayName ?? ''} ${p.user?.email ?? ''} ${p.licenseNumber}`).includes(needle),
  );

  return (
    <div className="section">
      <h2>{tr('Estado de pediatras')}</h2>
      <input className="search" placeholder={tr('Procurar por nome, email ou licença…')} value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="row" style={{ flexWrap: 'wrap', gap: 6, margin: '8px 0' }}>
        {([
          ['', 'Todos'],
          ['ACTIVE', 'Verificados'],
          ['PENDING', 'Pendentes'],
          ['SUSPENDED', 'Suspensos'],
        ] as const).map(([k, label]) => (
          <button key={k} className={`chip${status === k ? ' active' : ''}`} onClick={() => setStatus(k)}>{tr(label)}</button>
        ))}
      </div>
      <p className="muted" style={{ fontSize: 12 }}>{tr(SUPPORT_ESCALATION)}</p>
      {loading ? (
        <Skeleton rows={2} />
      ) : shown.length === 0 ? (
        <EmptyState title={tr('Sem pediatras')} hint={tr('Nenhum corresponde.')} />
      ) : (
        <div className="grid">
          {shown.map((p) => (
            <div key={p.id} className="card">
              <span className={pedStatus(p.status).pill}>{tr(pedStatus(p.status).label)}</span>
              <div style={{ marginTop: 4 }}>
                <strong>{p.displayName ?? p.user?.email ?? p.specialties[0] ?? tr('Pediatra')}</strong>
                {p.displayName && p.user?.email ? <span className="muted"> · {p.user.email}</span> : null}
              </div>
              <div className="muted" style={{ fontSize: 13 }}>
                {tr('Licença')} {p.licenseNumber} · ⭐ {p.ratingAvg.toFixed(1)} · {tr(specLabel(p.specialties[0]))}
              </div>
              <button className="btn small secondary" style={{ marginTop: 6 }} onClick={() => setOpenDocs(openDocs === p.id ? '' : p.id)}>
                {openDocs === p.id ? tr('Ocultar documentos') : tr('Ver documentos')}
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
  const { tr } = useT();
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
        <p className="muted">{tr('Sem documentos submetidos.')}</p>
      ) : (
        docs.map((d) => (
          <div key={d.id} style={{ marginBottom: 6 }}>
            <span className={docStatusPill(d.status)}>{tr(docStatusLabel(d.status))}</span>{' '}
            <strong>{tr(DOC_KINDS.find((k) => k.value === d.kind)?.label ?? d.kind)}</strong>
            <div className="muted" style={{ fontSize: 12 }}>
              {d.fileName}{d.reviewedAt ? ` · ${tr('revisto')} ${when(d.reviewedAt)}` : ''}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

// ───────────────────────── Clinic (B2B) ─────────────────────────
function ClinicTab({ role, onMsg }: { role: string; onMsg: (m: string) => void }) {
  const { tr } = useT();
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
      onMsg(tr('Membro adicionado ✓'));
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
      onMsg(tr('Pediatra associado ✓'));
      await load();
    } catch (e) {
      onMsg(`Erro: ${String(e)}`);
    } finally {
      setBusy(false);
    }
  }

  if (!loaded) return <p className="muted section">{tr('A carregar…')}</p>;
  if (!data)
    return (
      <div className="section">
        <p className="notice">
          {tr('Este utilizador ainda não está ligado a nenhuma clínica. (A seed cria a "Clínica Demo" com o admin e o staff.)')}
        </p>
      </div>
    );

  const linkedIds = new Set(data.pediatricians.map((p) => p.id));
  const available = peds.filter((p) => !linkedIds.has(p.id));

  return (
    <div className="section">
      <h2>{data.clinic.name}</h2>
      <p className="muted" style={{ marginTop: -4 }}>
        {isAdmin ? tr('Gestão da clínica') : tr('Vista da equipa')} · NIF {data.clinic.taxId ?? '—'}
      </p>
      <div className="grid">
        <Kpi label={tr('Pediatras')} value={String(data.pediatricians.length)} />
        <Kpi label={tr('Equipa')} value={String(data.members.length)} />
        <Kpi label={tr('Consultas')} value={String(data.consultations.length)} />
      </div>
      {data.finance ? (
        <div className="grid" style={{ marginTop: 10 }}>
          <Kpi
            label={tr('Receita da clínica')}
            value={euro(data.finance.clinicEarnedCents)}
            hint={`${tr('de')} ${euro(data.finance.pedsGrossCents)} ${tr('gerados')} · ${data.finance.capturedCount} ${tr('consultas cobradas')}`}
          />
        </div>
      ) : null}

      {isAdmin ? <ContentReviewQueue onMsg={onMsg} /> : null}

      <h3 style={{ marginTop: 18 }}>{tr('Pediatras')}</h3>
      {data.pediatricians.length === 0 ? (
        <p className="muted">{tr('Sem pediatras associados.')}</p>
      ) : (
        <div className="grid">
          {data.pediatricians.map((p) => (
            <div key={p.id} className="card">
              <span className={pedStatus(p.status).pill}>{tr(pedStatus(p.status).label)}</span>
              <div style={{ marginTop: 4 }}>
                <strong>{p.email ?? p.id.slice(0, 8)}</strong>
              </div>
              <div className="muted" style={{ fontSize: 13 }}>
                ⭐ {p.ratingAvg.toFixed(1)} · {tr('partilha p/ a clínica')} {p.revenueSharePct}%
              </div>
            </div>
          ))}
        </div>
      )}

      <h3 style={{ marginTop: 18 }}>{tr('Equipa')}</h3>
      <div className="grid">
        {data.members.map((m) => (
          <div key={m.id} className="card">
            <strong>{m.email ?? m.userId.slice(0, 8)}</strong>
            <div className="muted">{tr(roleLabel(m.role))}</div>
          </div>
        ))}
      </div>

      <h3 style={{ marginTop: 18 }}>{tr('Consultas da clínica')}</h3>
      {data.consultations.length === 0 ? (
        <p className="muted">{tr('Sem consultas. (Cria uma como Marta para uma pediatra da clínica.)')}</p>
      ) : (
        <div className="grid">
          {data.consultations.map((c) => (
            <div key={c.id} className="card">
              <span className={statusPill(c.status)}>{tr(statusLabel(c.status))}</span>
              <div>
                <strong>{tr(svcLabel(c.type))}</strong> · {euro(c.priceCents)}
              </div>
              <div className="muted">{when(c.openedAt)}</div>
            </div>
          ))}
        </div>
      )}

      {isAdmin ? (
        <>
          <div className="card section">
            <h3>{tr('Adicionar membro')}</h3>
            <input
              placeholder="email@exemplo.pt"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <select value={srole} onChange={(e) => setSrole(e.target.value)}>
              <option value="CLINIC_STAFF">{tr('Colaborador')}</option>
              <option value="CLINIC_ADMIN">{tr('Administrador')}</option>
            </select>
            <button className="btn" onClick={addStaff} disabled={busy}>
              {tr('Adicionar')}
            </button>
          </div>
          <div className="card section">
            <h3>{tr('Associar pediatra')}</h3>
            <select value={pedId} onChange={(e) => setPedId(e.target.value)}>
              <option value="">{tr('— escolher —')}</option>
              {available.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.specialties[0] ?? tr('Pediatra')} · ⭐ {p.ratingAvg.toFixed(1)}
                </option>
              ))}
            </select>
            <button className="btn" onClick={addPed} disabled={busy || !pedId}>
              {tr('Associar')}
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
  const needle = norm(q.trim());
  const matches = (a: ArticleCard) =>
    (!cat || a.category === cat) &&
    (!needle || norm(`${a.title} ${a.body}`).includes(needle));
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
// Editorial states of a Saber+ article (fallback for articles created before
// the review flow: published → PUBLISHED, otherwise DRAFT).
const ARTICLE_STATUS_PT: Record<string, { label: string; pill: string }> = {
  DRAFT: { label: 'rascunho', pill: 'pill muted' },
  PENDING_REVIEW: { label: 'em revisão', pill: 'pill' },
  PUBLISHED: { label: 'publicado', pill: 'pill ok' },
  REJECTED: { label: 'rejeitado', pill: 'pill danger' },
};
function articleStatus(a: ArticleCard): { label: string; pill: string } {
  const s = a.status ?? (a.published ? 'PUBLISHED' : 'DRAFT');
  return ARTICLE_STATUS_PT[s] ?? { label: s, pill: 'pill muted' };
}

function ContentAuthor({ onMsg }: { onMsg: (m: string) => void }) {
  const { tr } = useT();
  const [mine, setMine] = useState<ArticleCard[]>([]);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('geral');
  const [body, setBody] = useState('');
  // When set, we are re-editing a rejected article: submit PATCHes it back
  // into review instead of creating a new one.
  const [editId, setEditId] = useState<string | null>(null);
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

  function clearForm() {
    setTitle('');
    setCategory('geral');
    setBody('');
    setEditId(null);
  }

  async function submit() {
    if (!title || !body) return onMsg(tr('Indica título e texto.'));
    setBusy(true);
    try {
      if (editId) await Api.updateArticle(editId, { title, body, category, published: true });
      else await Api.createArticle({ title, body, category, published: true });
      clearForm();
      onMsg(tr('Artigo submetido para revisão ✓'));
      await load();
    } catch (e) {
      onMsg(`Erro: ${String(e)}`);
    } finally {
      setBusy(false);
    }
  }

  function startEdit(a: ArticleCard) {
    setEditId(a.id);
    setTitle(a.title);
    setCategory(a.category);
    setBody(a.body);
  }

  return (
    <div className="section" id="publicar-saber">
      <h3>{tr('Publicar no Saber+')}</h3>
      <p className="muted" style={{ marginTop: -4, fontSize: 13 }}>
        {tr('Os artigos são revistos pela equipa clínica antes de ficarem disponíveis no Saber+.')}
      </p>
      {mine.length > 0 ? (
        <div className="grid">
          {mine.map((a) => {
            const st = articleStatus(a);
            return (
              <div key={a.id} className="card">
                <span className={st.pill}>{tr(st.label)}</span>
                <div style={{ marginTop: 4 }}>
                  <strong>{a.title}</strong>
                </div>
                {a.status === 'REJECTED' && a.reviewNote ? (
                  <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>
                    {tr('Nota da revisão')}: {a.reviewNote}
                  </div>
                ) : null}
                {a.status === 'REJECTED' ? (
                  <button
                    className="btn secondary small"
                    style={{ marginTop: 6 }}
                    onClick={() => startEdit(a)}
                    disabled={busy}
                  >
                    {tr('Reeditar e resubmeter')}
                  </button>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}
      <div className="card section">
        {editId ? (
          <p className="muted" style={{ fontSize: 13, margin: '0 0 6px' }}>
            {tr('A reeditar um artigo rejeitado — ao submeter volta para revisão.')}
          </p>
        ) : null}
        <input placeholder={tr('Título')} value={title} onChange={(e) => setTitle(e.target.value)} />
        <input placeholder={tr('Categoria')} value={category} onChange={(e) => setCategory(e.target.value)} />
        <textarea placeholder={tr('Texto…')} value={body} onChange={(e) => setBody(e.target.value)} rows={4} />
        <div className="row">
          <button className="btn" onClick={submit} disabled={busy}>
            {tr('Submeter para revisão')}
          </button>
          {editId ? (
            <button className="btn secondary" onClick={clearForm} disabled={busy}>
              {tr('Cancelar')}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

// ───────────────────────── Editorial review queue (clinic/platform admins) ─────────────────────────
function ContentReviewQueue({ onMsg }: { onMsg: (m: string) => void }) {
  const { tr } = useT();
  const [pending, setPending] = useState<ArticleCard[]>([]);
  const [loaded, setLoaded] = useState(false);
  // Keep the section visible (with an empty note) once it had items this
  // session, so approving the last article doesn't make the heading vanish.
  const [hadItems, setHadItems] = useState(false);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState('');

  async function load() {
    try {
      const rows = await Api.contentPending();
      setPending(rows);
      if (rows.length > 0) setHadItems(true);
    } catch {
      /* sem permissão ou erro — a secção fica escondida */
    } finally {
      setLoaded(true);
    }
  }
  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function approve(id: string) {
    setBusy(id);
    try {
      await Api.approveArticle(id);
      onMsg(tr('Artigo aprovado e publicado ✓'));
      await load();
    } catch (e) {
      onMsg(`Erro: ${String(e)}`);
    } finally {
      setBusy('');
    }
  }
  async function reject(id: string) {
    setBusy(id);
    try {
      await Api.rejectArticle(id, note.trim() || undefined);
      onMsg(tr('Artigo rejeitado.'));
      setRejectingId(null);
      setNote('');
      await load();
    } catch (e) {
      onMsg(`Erro: ${String(e)}`);
    } finally {
      setBusy('');
    }
  }

  if (!loaded || (pending.length === 0 && !hadItems)) return null;
  return (
    <div className="section">
      <h3>
        {tr('Conteúdos para revisão')}{' '}
        <span className={pending.length ? 'pill warn' : 'pill muted'}>{pending.length}</span>
      </h3>
      {pending.length === 0 ? (
        <p className="muted">{tr('Sem conteúdos por rever')}</p>
      ) : (
        <div className="grid">
          {pending.map((a) => (
            <div key={a.id} className="card">
              <span className="pill">{a.category}</span>
              <div style={{ marginTop: 4 }}>
                <strong>{a.title}</strong>
              </div>
              <div className="muted" style={{ fontSize: 13 }}>
                {tr('Submetido a')}{' '}
                {new Date(a.createdAt).toLocaleDateString(appLocale(), {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </div>
              <details style={{ marginTop: 6 }}>
                <summary className="muted" style={{ cursor: 'pointer' }}>{tr('Ver texto')}</summary>
                <p style={{ whiteSpace: 'pre-wrap', fontSize: 14, marginTop: 6 }}>{a.body}</p>
              </details>
              {rejectingId === a.id ? (
                <div style={{ marginTop: 8 }}>
                  <input
                    placeholder={tr('Nota para o autor (opcional)')}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                  />
                  <div className="row" style={{ marginTop: 6 }}>
                    <button
                      className="btn danger small"
                      onClick={() => void reject(a.id)}
                      disabled={busy === a.id}
                    >
                      {tr('Confirmar rejeição')}
                    </button>
                    <button
                      className="btn secondary small"
                      onClick={() => {
                        setRejectingId(null);
                        setNote('');
                      }}
                      disabled={busy === a.id}
                    >
                      {tr('Cancelar')}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="row" style={{ marginTop: 8 }}>
                  <button className="btn small" onClick={() => void approve(a.id)} disabled={busy === a.id}>
                    {tr('Aprovar')}
                  </button>
                  <button
                    className="btn danger small"
                    onClick={() => {
                      setRejectingId(a.id);
                      setNote('');
                    }}
                    disabled={busy === a.id}
                  >
                    {tr('Rejeitar')}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ───────────────────────── Onboarding / consents (first parent login) ─────────────────────────
function Onboarding({ onDone }: { onDone: () => void }) {
  const { tr } = useT();
  const [terms, setTerms] = useState(false);
  const [privacy, setPrivacy] = useState(false);
  const [health, setHealth] = useState(false);
  const all = terms && privacy && health;
  return (
    <div className="section">
      <span className="badge">{tr('Bem-vindo à HOC — Healthcare on Call')}</span>
      <h1 style={{ fontSize: 28, margin: '10px 0 6px', letterSpacing: '-0.02em' }}>
        {tr('Cuidar do seu filho, com confiança.')}
      </h1>
      <p className="muted">
        {tr('Pediatras verificados, num espaço seguro e privado. Antes de começar, confirme os consentimentos.')}
      </p>

      <div className="card section">
        <label className="row" style={{ alignItems: 'flex-start', gap: 10 }}>
          <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} style={{ width: 'auto', marginTop: 3 }} />
          <span>
            {tr('Aceito os')} <strong>{tr('Termos de Utilização')}</strong>.
          </span>
        </label>
        <label className="row" style={{ alignItems: 'flex-start', gap: 10, marginTop: 10 }}>
          <input type="checkbox" checked={privacy} onChange={(e) => setPrivacy(e.target.checked)} style={{ width: 'auto', marginTop: 3 }} />
          <span>
            {tr('Li e aceito a')} <strong>{tr('Política de Privacidade')}</strong> {tr('(RGPD).')}
          </span>
        </label>
        <label className="row" style={{ alignItems: 'flex-start', gap: 10, marginTop: 10 }}>
          <input type="checkbox" checked={health} onChange={(e) => setHealth(e.target.checked)} style={{ width: 'auto', marginTop: 3 }} />
          <span>
            {tr('Autorizo o tratamento dos')} <strong>{tr('dados de saúde')}</strong>{' '}
            {tr('do meu filho 🔒, para a prestação dos cuidados.')}
          </span>
        </label>
      </div>

      <button className="btn" onClick={onDone} disabled={!all} style={{ width: '100%' }}>
        {tr('Começar')}
      </button>
      <p className="muted" style={{ fontSize: 12, textAlign: 'center', marginTop: 8 }}>
        {tr('Pode rever ou revogar consentimentos em Conta → Privacidade.')}
      </p>
    </div>
  );
}

// ───────────────────────── Emergency (always present) ─────────────────────────
function Emergency() {
  const { tr } = useT();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className="fab-sos" aria-label={tr('Emergência')} onClick={() => setOpen(true)}>
        SOS
      </button>
      {open ? (
        <div className="sheet-backdrop" onClick={() => setOpen(false)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-grip" />
            <h2 style={{ marginTop: 4 }}>{tr('É uma emergência?')}</h2>
            <p className="muted">
              {tr('Se a criança tem dificuldade a respirar, está prostrada, com convulsões ou lábios azulados,')}{' '}
              <strong>{tr('não espere')}</strong>.
            </p>
            <a className="btn danger" href="tel:112" style={{ display: 'block', textAlign: 'center' }}>
              {tr('Ligar 112 (emergência)')}
            </a>
            <a
              className="btn secondary"
              href="tel:808242424"
              style={{ display: 'block', textAlign: 'center', marginTop: 8 }}
            >
              {tr('Ligar SNS 24 · 808 24 24 24')}
            </a>
            <p className="muted" style={{ fontSize: 12, marginTop: 10 }}>
              {tr('A teleconsulta não substitui o atendimento de emergência.')}
            </p>
            <button
              className="btn secondary small"
              onClick={() => setOpen(false)}
              style={{ marginTop: 4 }}
            >
              {tr('Fechar')}
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
  const { tr } = useT();
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
        ? tr('O teu dispositivo suporta passkeys/biometria. A ativação fica disponível quando o domínio tiver WEBAUTHN_RP_ID/WEBAUTHN_ORIGIN configurados (ver docs/21-integracoes.md). O backend já expõe os endpoints WebAuthn.')
        : tr('Este dispositivo/navegador não suporta passkeys (WebAuthn).'),
    );
  }

  return (
    <div className="section">
      <button className="btn secondary small" onClick={onClose} style={{ marginBottom: 14 }}>
        {tr('← Voltar')}
      </button>
      <h2>{tr('Definições')}</h2>

      <div className="card section">
        <strong>{tr('Aparência')}</strong>
        <p className="muted" style={{ fontSize: 13, margin: '4px 0 8px' }}>
          {tr('Tema')}
        </p>
        <Seg<Theme>
          value={theme}
          onChange={setTheme}
          options={[
            { v: 'light', label: tr('Claro') },
            { v: 'dark', label: tr('Escuro') },
            { v: 'system', label: tr('Sistema') },
          ]}
        />
        <p className="muted" style={{ fontSize: 13, margin: '14px 0 8px' }}>
          {tr('Tamanho do texto')}
        </p>
        <Seg<TextSize>
          value={textSize}
          onChange={setTextSize}
          options={[
            { v: 'normal', label: tr('Normal') },
            { v: 'large', label: tr('Grande') },
          ]}
        />
      </div>

      <div className="card section">
        <strong>{tr('Idioma')}</strong>
        <p className="muted" style={{ fontSize: 13, margin: '4px 0 8px' }}>
          {tr('A app das famílias está disponível em três idiomas.')}
        </p>
        <LanguageSwitcher />
      </div>

      <div className="card section">
        <strong>{tr('Segurança')}</strong>
        <p className="muted" style={{ fontSize: 13, margin: '4px 0 8px' }}>
          {tr('Passkey / biometria (Face ID, Touch ID) para entrar sem palavra-passe.')}
        </p>
        <button className="btn secondary small" onClick={tryPasskey}>
          {tr('Ativar passkey')}
        </button>
        {secNote ? (
          <p className="notice" style={{ marginTop: 10, fontSize: 13 }}>
            {secNote}
          </p>
        ) : null}
      </div>

      <div className="card section">
        <strong>{tr('Notificações')}</strong>
        <label
          className="row"
          style={{ justifyContent: 'space-between', marginTop: 8, cursor: 'pointer' }}
        >
          <span className="muted">{tr('Receber avisos da app')}</span>
          <input
            type="checkbox"
            checked={notif}
            onChange={(e) => toggleNotif(e.target.checked)}
            style={{ width: 'auto' }}
          />
        </label>
        <p className="muted" style={{ fontSize: 12, marginTop: 4 }}>
          {tr('Push real (FCM/APNs) requer credenciais de serviço.')}
        </p>
      </div>

      <div className="card section">
        <strong>{tr('Conta')}</strong>
        <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>
          {tr('Sessão:')} {profile.name} · {profile.role}
        </div>
        <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>
          {tr('Segurança (biometria/passkeys), notificações push e mais preferências chegam com as credenciais de dispositivo/serviço.')}
        </p>
      </div>

      <p className="muted" style={{ fontSize: 12, textAlign: 'center', marginTop: 8 }}>
        {tr('HOC · Healthcare on Call · uma solução DES · ambiente de demonstração')}
      </p>
    </div>
  );
}

// ───────────────────────── Other roles ─────────────────────────
function GenericTab({ profile, onMsg }: { profile: Profile; onMsg: (m: string) => void }) {
  const { tr } = useT();
  const [checked, setChecked] = useState<string | null>(null);
  async function testRbac() {
    try {
      await Api.allConsultations();
      setChecked(tr('Este perfil teve acesso (inesperado nesta demo).'));
    } catch (e) {
      if (isForbidden(e)) {
        setChecked(tr('✓ Acesso negado corretamente — o controlo de acessos (RBAC) funciona.'));
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
          {tr('Sessão como')} <strong>{profile.role}</strong>.{' '}
          {tr('Este perfil ainda não tem ecrã dedicado, mas a sessão e as permissões são reais.')}
        </p>
        <button className="btn secondary" onClick={testRbac}>
          {tr('Testar permissão (deve ser negado)')}
        </button>
        {checked ? <p className="notice" style={{ marginTop: 12 }}>{checked}</p> : null}
      </div>
    </div>
  );
}
