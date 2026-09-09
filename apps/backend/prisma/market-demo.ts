/**
 * Pure, deterministic generator for the synthetic market-history demo
 * dataset (the "mkt." namespace) — cohort math only, no database access, so
 * it can be exercised dry (no DB). Persistence lives in prisma/seed.ts →
 * seedMarketHistory().
 *
 * Determinism: a seeded PRNG (mulberry32, fixed seed) — every boot in the
 * same calendar month regenerates identical data. The project window is
 * January of the CURRENT year through the CURRENT month, computed at runtime.
 *
 * The story baked in (so /admin/market and /admin/finance/series answer the
 * founder's questions):
 * - Lisboa: large, steady demand — well supplied (3 demo peds + curated).
 * - Porto: medium demand — adequately supplied.
 * - Braga: fast-accelerating demand — under-supplied (2nd ped only from May).
 * - Faro: growing demand, 1 ped — long video lead times.
 * - Açores/Madeira: near-zero penetration despite seeded supply → the
 *   "invest marketing here" story.
 * - dermatology: demand explodes from March, single demo ped → very high
 *   consultations/ped and ~90–140h video leads → "reforçar dermatologia".
 * - allergology: demand grows from April, single ped → 2nd reinforcement.
 * - sleep/pulmonology: moderate demand, one ped each — balanced.
 */

export type MktServiceType = 'MESSAGE' | 'VIDEO' | 'FOLLOW_UP';
export type MktConsultStatus = 'OPEN' | 'ANSWERED' | 'CLOSED';

export interface MktPed {
  slug: string;
  displayName: string;
  bio: string;
  region: string;
  specialties: string[];
  /** 0-based month index from January (already clamped to the window). */
  joinMonth: number;
  createdAt: Date;
  licenseNumber: string;
  experienceYears: number;
  ratingAvg: number;
  msgPriceCents: number;
  videoPriceCents: number;
  weekdays: number[];
  startMinute: number;
  endMinute: number;
  /** [min, max] hours between openedAt and scheduledAt for VIDEO. */
  videoLeadHours: [number, number];
}

export interface MktChild {
  name: string;
  birthDate: Date;
  sex: string;
}

export interface MktFamily {
  email: string;
  guardianName: string;
  familyName: string;
  region: string | null;
  createdAt: Date;
  /** 0-based cohort month (January = 0). */
  cohortMonth: number;
  children: MktChild[];
}

export interface MktPayment {
  status: 'CAPTURED' | 'REFUNDED';
  amountCents: number;
  capturedAt: Date;
  /** Set only for REFUNDED payments. */
  refundAt: Date | null;
}

export interface MktConsultation {
  familyIndex: number;
  childIndex: number;
  pedIndex: number;
  month: number;
  type: MktServiceType;
  status: MktConsultStatus;
  priceCents: number;
  openedAt: Date;
  answeredAt: Date | null;
  closedAt: Date | null;
  scheduledAt: Date | null;
  slaDueAt: Date | null;
  payment: MktPayment | null;
}

export interface MktDataset {
  year: number;
  monthCount: number;
  peds: MktPed[];
  families: MktFamily[];
  consultations: MktConsultation[];
}

/** Small seeded PRNG — deterministic across boots (never Math.random). */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const HOUR = 3_600_000;
const addHours = (d: Date, h: number) => new Date(d.getTime() + h * HOUR);

// ── Synthetic pediatricians (join staggered over the window) ──
interface PedBase {
  slug: string;
  name: string;
  bio: string;
  region: string;
  specialties: string[];
  joinMonth: number;
  weekdays: number[];
  startMinute: number;
  endMinute: number;
  msg: number;
  video: number;
  lead: [number, number];
}

const WEEKDAYS = [1, 2, 3, 4, 5];
const WEEKDAYS_SAT = [1, 2, 3, 4, 5, 6];

const MKT_PED_BASE: PedBase[] = [
  { slug: 'helena.matos', name: 'Dra. Helena Matos (demo)', bio: 'Pediatria geral. Lisboa.', region: 'Lisboa', specialties: ['general'], joinMonth: 0, weekdays: WEEKDAYS, startMinute: 540, endMinute: 960, msg: 1800, video: 4500, lead: [12, 36] },
  { slug: 'vasco.pinheiro', name: 'Dr. Vasco Pinheiro (demo)', bio: 'Pediatria geral. Lisboa.', region: 'Lisboa', specialties: ['general'], joinMonth: 0, weekdays: WEEKDAYS_SAT, startMinute: 480, endMinute: 840, msg: 1700, video: 4300, lead: [12, 36] },
  { slug: 'raquel.antunes', name: 'Dra. Raquel Antunes (demo)', bio: 'Pediatria geral e do desenvolvimento. Lisboa.', region: 'Lisboa', specialties: ['general'], joinMonth: 1, weekdays: WEEKDAYS, startMinute: 600, endMinute: 1080, msg: 1900, video: 4700, lead: [12, 36] },
  { slug: 'duarte.melo', name: 'Dr. Duarte Melo (demo)', bio: 'Pediatria geral. Porto.', region: 'Porto', specialties: ['general'], joinMonth: 0, weekdays: WEEKDAYS, startMinute: 540, endMinute: 960, msg: 1800, video: 4500, lead: [12, 36] },
  { slug: 'catarina.veiga', name: 'Dra. Catarina Veiga (demo)', bio: 'Pediatria geral. Porto.', region: 'Porto', specialties: ['general'], joinMonth: 2, weekdays: WEEKDAYS_SAT, startMinute: 480, endMinute: 780, msg: 1600, video: 4200, lead: [12, 36] },
  { slug: 'goncalo.freitas', name: 'Dr. Gonçalo Freitas (demo)', bio: 'Pediatria geral. Braga.', region: 'Braga', specialties: ['general'], joinMonth: 0, weekdays: WEEKDAYS, startMinute: 540, endMinute: 900, msg: 1800, video: 4500, lead: [18, 48] },
  { slug: 'teresa.aguiar', name: 'Dra. Teresa Aguiar (demo)', bio: 'Pediatria geral. Braga.', region: 'Braga', specialties: ['general'], joinMonth: 4, weekdays: WEEKDAYS, startMinute: 540, endMinute: 840, msg: 1900, video: 4600, lead: [18, 48] },
  { slug: 'paulo.cabral', name: 'Dr. Paulo Cabral (demo)', bio: 'Pediatria geral. Algarve.', region: 'Faro', specialties: ['general'], joinMonth: 1, weekdays: WEEKDAYS, startMinute: 600, endMinute: 840, msg: 2000, video: 4800, lead: [72, 160] },
  { slug: 'marina.reis', name: 'Dra. Marina Reis (demo)', bio: 'Dermatologia pediátrica (eczema, dermatites). Lisboa.', region: 'Lisboa', specialties: ['dermatology'], joinMonth: 1, weekdays: WEEKDAYS, startMinute: 960, endMinute: 1200, msg: 2200, video: 5200, lead: [90, 140] },
  { slug: 'andre.brito', name: 'Dr. André Brito (demo)', bio: 'Alergologia pediátrica. Porto.', region: 'Porto', specialties: ['allergology'], joinMonth: 2, weekdays: WEEKDAYS, startMinute: 540, endMinute: 840, msg: 2100, video: 5000, lead: [72, 160] },
  { slug: 'sonia.faria', name: 'Dra. Sónia Faria (demo)', bio: 'Sono pediátrico. Lisboa.', region: 'Lisboa', specialties: ['sleep'], joinMonth: 1, weekdays: WEEKDAYS_SAT, startMinute: 480, endMinute: 840, msg: 1900, video: 4600, lead: [12, 36] },
  { slug: 'nuno.vidal', name: 'Dr. Nuno Vidal (demo)', bio: 'Pneumologia pediátrica. Porto.', region: 'Porto', specialties: ['pulmonology'], joinMonth: 2, weekdays: WEEKDAYS, startMinute: 540, endMinute: 900, msg: 1900, video: 4600, lead: [12, 36] },
];

// ── Name pools (ASCII so emails slug cleanly) ──
const FIRST_NAMES = ['Ana', 'Bruno', 'Carla', 'Daniel', 'Eva', 'Filipe', 'Gabriela', 'Hugo', 'Ines', 'Jorge', 'Lara', 'Manuel', 'Nadia', 'Otavio', 'Paula', 'Raul', 'Rita', 'Sergio', 'Tania', 'Vitor'];
const SURNAMES = ['Abreu', 'Amaral', 'Andrade', 'Azevedo', 'Barbosa', 'Batista', 'Borges', 'Brandao', 'Camacho', 'Cardoso', 'Carvalho', 'Coelho', 'Correia', 'Cruz', 'Cunha', 'Dias', 'Domingues', 'Esteves', 'Faria', 'Fernandes', 'Figueiredo', 'Fonseca', 'Garcia', 'Gaspar', 'Gomes', 'Goncalves', 'Guerreiro', 'Henriques', 'Leal', 'Leite', 'Macedo', 'Machado', 'Magalhaes', 'Marques', 'Martins', 'Matias', 'Miranda', 'Monteiro', 'Morais', 'Moreira', 'Mota', 'Neves', 'Nogueira', 'Oliveira', 'Pacheco', 'Paiva', 'Pires', 'Queiros', 'Ramos', 'Raposo', 'Reis', 'Ribeiro', 'Salgado', 'Sampaio', 'Saraiva', 'Serra', 'Simoes', 'Soares', 'Teixeira', 'Torres', 'Valente', 'Vaz', 'Vicente', 'Vieira'];
const CHILD_NAMES = ['Alice', 'Artur', 'Benedita', 'Carlota', 'Dinis', 'Duarte', 'Emma', 'Francisca', 'Gaspar', 'Gil', 'Joana', 'Lia', 'Lucas', 'Mafalda', 'Mia', 'Noa', 'Pilar', 'Rafael', 'Salvador', 'Vera', 'Xavier', 'Zoe'];

/**
 * New families per region per month (0-based month from January). Lisboa is
 * large & steady; Porto medium; Braga accelerates; Faro grows; islands are
 * near-zero (low penetration); a trickle has no region (realism).
 */
function newFamiliesPlan(monthCount: number): Array<{ region: string | null; counts: number[] }> {
  const per = (f: (m: number) => number) => Array.from({ length: monthCount }, (_, m) => f(m));
  return [
    { region: 'Lisboa', counts: per((m) => (m === 0 ? 8 : 6)) },
    { region: 'Porto', counts: per((m) => (m === 0 ? 5 : 4)) },
    { region: 'Braga', counts: per((m) => Math.min(2 + Math.round(m * 1.4), 10)) },
    { region: 'Faro', counts: per((m) => (m === 0 ? 2 : 3)) },
    { region: 'Açores', counts: per((m) => (m % 2 === 0 ? 1 : 0)) },
    { region: 'Madeira', counts: per((m) => (m % 2 === 1 ? 1 : 0)) },
    { region: null, counts: per(() => 2) },
  ];
}

/**
 * Monthly demand share per non-general specialty (only applied once the
 * matching ped has joined). Dermatology explodes from March; allergology
 * grows from April; sleep/pulmonology stay moderate.
 */
function specialtyWeights(m: number): Record<string, number> {
  return {
    dermatology: m <= 0 ? 0.02 : m === 1 ? 0.04 : Math.min(0.1 + 0.03 * (m - 2), 0.24),
    allergology: m < 2 ? 0 : m === 2 ? 0.02 : Math.min(0.08 + 0.02 * (m - 3), 0.16),
    sleep: 0.05,
    pulmonology: 0.05,
  };
}

export function buildMarketDataset(now: Date = new Date()): MktDataset {
  const rand = mulberry32(0x0134_2026);
  const year = now.getFullYear();
  const monthCount = now.getMonth() + 1; // Jan..current month
  const lastMonth = monthCount - 1;
  const todayInMonth = now.getDate();

  const daysInMonth = (m: number) => new Date(year, m + 1, 0).getDate();
  // Never generate timestamps in the future: the current month only uses
  // days up to "today".
  const maxDayOf = (m: number) => (m === lastMonth ? Math.max(1, Math.min(todayInMonth, daysInMonth(m))) : daysInMonth(m));

  // ── Pediatricians ──
  const peds: MktPed[] = MKT_PED_BASE.map((p, i) => {
    const joinMonth = Math.min(p.joinMonth, lastMonth);
    return {
      slug: p.slug,
      displayName: p.name,
      bio: `${p.bio} (demo)`,
      region: p.region,
      specialties: p.specialties,
      joinMonth,
      createdAt: new Date(year, joinMonth, Math.min(2 + i, maxDayOf(joinMonth)), 9, 0, 0),
      licenseNumber: `MKT-${i + 1}`,
      experienceYears: 5 + ((i * 3) % 16),
      ratingAvg: Math.round((4.5 + (i % 5) * 0.1) * 10) / 10,
      msgPriceCents: p.msg,
      videoPriceCents: p.video,
      weekdays: p.weekdays,
      startMinute: p.startMinute,
      endMinute: p.endMinute,
      videoLeadHours: p.lead,
    };
  });

  // ── Families (monthly cohorts per region, scaled to the volume guardrail) ──
  const plan = newFamiliesPlan(monthCount);
  const rawTotal = plan.reduce((s, r) => s + r.counts.reduce((a, b) => a + b, 0), 0);
  const famScale = Math.min(1, 205 / rawTotal);

  const families: MktFamily[] = [];
  for (let m = 0; m < monthCount; m++) {
    for (const r of plan) {
      const count = Math.round(r.counts[m] * famScale);
      for (let k = 0; k < count; k++) {
        const i = families.length;
        const first = FIRST_NAMES[Math.floor(rand() * FIRST_NAMES.length)];
        const surname = SURNAMES[i % SURNAMES.length];
        const createdDay = 1 + Math.floor(rand() * Math.min(6, maxDayOf(m)));
        let createdAt = new Date(year, m, createdDay, 8 + Math.floor(rand() * 12), Math.floor(rand() * 60), 0);
        if (createdAt > now) createdAt = new Date(now.getTime() - HOUR); // today, but never in the future
        const childCount = rand() < 0.45 ? 2 : 1;
        const firstChildIdx = Math.floor(rand() * CHILD_NAMES.length);
        const children: MktChild[] = [];
        for (let c = 0; c < childCount; c++) {
          const nameIdx = (firstChildIdx + c * (1 + Math.floor(rand() * (CHILD_NAMES.length - 1)))) % CHILD_NAMES.length;
          const ageDays = 30 + Math.floor(rand() * 14 * 365);
          children.push({
            name: CHILD_NAMES[nameIdx],
            birthDate: new Date(now.getTime() - ageDays * 86_400_000),
            sex: rand() < 0.5 ? 'F' : 'M',
          });
        }
        families.push({
          email: `mkt.${first.toLowerCase()}.${surname.toLowerCase()}${i}@demo.pedia`,
          guardianName: `${first} ${surname}`,
          familyName: `Família ${surname} (demo)`,
          region: r.region,
          createdAt,
          cohortMonth: m,
          children,
        });
      }
    }
  }

  // ── Consultations (volume follows the family base; capped ≤ ~550) ──
  const familyMonths = families.reduce((s, f) => s + (monthCount - f.cohortMonth), 0);
  const baseP = 0.62;
  const secondP = 0.16;
  const pScale = Math.min(1, 540 / (familyMonths * (baseP + secondP)));
  const p1 = baseP * pScale;
  const p2 = secondP * pScale;

  const generalPeds = peds.map((p, i) => ({ p, i })).filter((x) => x.p.specialties[0] === 'general');
  const specialistIndex: Record<string, number> = {};
  peds.forEach((p, i) => {
    if (p.specialties[0] !== 'general') specialistIndex[p.specialties[0]] = i;
  });

  const pickPed = (m: number, familyRegion: string | null): number => {
    // Specialty routing first (only for specialists who already joined) …
    const weights = specialtyWeights(m);
    let r = rand();
    for (const [spec, w] of Object.entries(weights)) {
      const idx = specialistIndex[spec];
      if (idx === undefined || peds[idx].joinMonth > m) continue;
      if (r < w) return idx;
      r -= w;
    }
    // … remainder goes to general pediatrics, with loose regional affinity.
    const joined = generalPeds.filter((x) => x.p.joinMonth <= m);
    const local = joined.filter((x) => x.p.region === familyRegion);
    const pool = local.length > 0 && rand() < 0.6 ? local : joined;
    return pool[Math.floor(rand() * pool.length)].i;
  };

  const consultations: MktConsultation[] = [];
  for (let m = 0; m < monthCount; m++) {
    const isCurrent = m === lastMonth;
    const maxDay = maxDayOf(m);
    families.forEach((f, familyIndex) => {
      if (f.cohortMonth > m || consultations.length >= 600) return; // hard guardrail
      const draws = (rand() < p1 ? 1 : 0) + (rand() < p2 ? 1 : 0);
      for (let n = 0; n < draws && consultations.length < 600; n++) {
        const pedIndex = pickPed(m, f.region);
        const ped = peds[pedIndex];
        const tr = rand();
        const type: MktServiceType = tr < 0.7 ? 'MESSAGE' : tr < 0.95 ? 'VIDEO' : 'FOLLOW_UP';
        const priceCents = type === 'MESSAGE' ? ped.msgPriceCents : type === 'VIDEO' ? ped.videoPriceCents : 1200;

        const minDay = f.cohortMonth === m ? Math.min(f.createdAt.getDate(), maxDay) : 1;
        const day = minDay + Math.floor(rand() * (maxDay - minDay + 1));
        let openedAt = new Date(year, m, day, 8 + Math.floor(rand() * 13), Math.floor(rand() * 60), 0);
        if (openedAt > now) openedAt = new Date(now.getTime() - 2 * HOUR); // today, never in the future

        const scheduledAt =
          type === 'VIDEO'
            ? addHours(openedAt, ped.videoLeadHours[0] + rand() * (ped.videoLeadHours[1] - ped.videoLeadHours[0]))
            : null;

        // Past months close everything; the current month is a live mix.
        let status: MktConsultStatus;
        if (!isCurrent) status = 'CLOSED';
        else {
          const sr = rand();
          status = sr < 0.5 ? 'CLOSED' : sr < 0.8 ? 'ANSWERED' : 'OPEN';
        }
        let answeredAt: Date | null = null;
        let closedAt: Date | null = null;
        if (status !== 'OPEN') {
          answeredAt = addHours(openedAt, 1 + rand() * 5);
          if (answeredAt > now) {
            status = 'OPEN';
            answeredAt = null;
          }
        }
        if (status === 'CLOSED') {
          closedAt = addHours(answeredAt as Date, 1 + rand() * 24); // 2–30h after open
          if (closedAt > now) {
            status = 'ANSWERED';
            closedAt = null;
          }
        }
        const slaDueAt = status === 'OPEN' ? addHours(openedAt, 24) : null;

        let payment: MktPayment | null = null;
        if (status === 'CLOSED' && closedAt) {
          const refunded = rand() < 0.03;
          const refundAt = refunded ? new Date(Math.min(addHours(closedAt, 4 + rand() * 40).getTime(), now.getTime())) : null;
          payment = { status: refunded ? 'REFUNDED' : 'CAPTURED', amountCents: priceCents, capturedAt: closedAt, refundAt };
        }

        consultations.push({
          familyIndex,
          childIndex: Math.floor(rand() * f.children.length),
          pedIndex,
          month: m,
          type,
          status,
          priceCents,
          openedAt,
          answeredAt,
          closedAt,
          scheduledAt,
          slaDueAt,
          payment,
        });
      }
    });
  }

  return { year, monthCount, peds, families, consultations };
}

/** Per-month totals for dry-run verification (no DB needed). */
export function summarizeMarketDataset(ds: MktDataset): string {
  const lines: string[] = [];
  const monthName = (m: number) => `${ds.year}-${String(m + 1).padStart(2, '0')}`;
  for (let m = 0; m < ds.monthCount; m++) {
    const fams = ds.families.filter((f) => f.cohortMonth === m);
    const byRegion = new Map<string, number>();
    for (const f of fams) byRegion.set(f.region ?? 'Sem região', (byRegion.get(f.region ?? 'Sem região') ?? 0) + 1);
    const cons = ds.consultations.filter((c) => c.month === m);
    const bySpec = new Map<string, number>();
    for (const c of cons) {
      const spec = ds.peds[c.pedIndex].specialties[0];
      bySpec.set(spec, (bySpec.get(spec) ?? 0) + 1);
    }
    const captured = cons.filter((c) => c.payment).length;
    const refunded = cons.filter((c) => c.payment?.status === 'REFUNDED').length;
    const fmt = (mp: Map<string, number>) => [...mp.entries()].map(([k, v]) => `${k}=${v}`).join(' ');
    lines.push(
      `${monthName(m)}: +${fams.length} familias [${fmt(byRegion)}] | ${cons.length} consultas [${fmt(bySpec)}] | pagamentos=${captured} reembolsos=${refunded}`,
    );
  }
  const leadBySpec = new Map<string, { sum: number; n: number }>();
  for (const c of ds.consultations) {
    if (c.type !== 'VIDEO' || !c.scheduledAt) continue;
    const spec = ds.peds[c.pedIndex].specialties[0];
    const acc = leadBySpec.get(spec) ?? { sum: 0, n: 0 };
    acc.sum += (c.scheduledAt.getTime() - c.openedAt.getTime()) / HOUR;
    acc.n += 1;
    leadBySpec.set(spec, acc);
  }
  lines.push(
    `video lead (h): ${[...leadBySpec.entries()].map(([k, v]) => `${k}=${Math.round(v.sum / v.n)}`).join(' ')}`,
  );
  lines.push(
    `totais: peds=${ds.peds.length} familias=${ds.families.length} criancas=${ds.families.reduce((s, f) => s + f.children.length, 0)} consultas=${ds.consultations.length}`,
  );
  return lines.join('\n');
}
