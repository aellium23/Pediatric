import {
  PrismaClient,
  Role,
  PediatricianStatus,
  ServiceType,
  ConsultationStatus,
  PaymentStatus,
  ConsentSubject,
} from '@prisma/client';
import { createCipheriv, randomBytes, createHash } from 'crypto';

const prisma = new PrismaClient();

// ── Field encryption (must match EncryptionService so the app can decrypt) ──
const KEY = createHash('sha256')
  .update(process.env.FIELD_ENCRYPTION_KEY ?? 'dev_32byte_key_dev_32byte_key_xx')
  .digest();
function enc(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', KEY, iv, { authTagLength: 16 });
  const e = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  return `${iv.toString('base64')}.${cipher.getAuthTag().toString('base64')}.${e.toString('base64')}`;
}

const d = (s: string) => new Date(s);
const ago = (days: number) => new Date(Date.now() - days * 86_400_000);

async function upsertUser(email: string, role: Role, extra: Record<string, unknown> = {}) {
  return prisma.user.upsert({
    where: { email },
    update: { role, ...extra },
    create: { email, emailVerified: true, role, ...extra },
  });
}

// ── Pediatricians: specialties + region (continental + ilhas) + 24h coverage ──
interface PedSpec {
  email: string;
  name: string;
  license: string;
  region: string;
  specialties: string[];
  languages: string[];
  experienceYears: number;
  rating: number;
  bio: string;
  // availability band: [startMinute, endMinute] and weekdays covered
  band: [number, number];
  days: number[];
}

const NIGHT: [number, number] = [0, 480]; // 00:00–08:00
const DAY: [number, number] = [480, 960]; // 08:00–16:00
const EVE: [number, number] = [960, 1440]; // 16:00–24:00
const WEEK = [1, 2, 3, 4, 5];
const ALLWEEK = [0, 1, 2, 3, 4, 5, 6];

const PEDS: PedSpec[] = [
  { email: 'ines@demo.pedia', name: 'Dra. Inês Rocha', license: 'OM-12345', region: 'Lisboa', specialties: ['general'], languages: ['pt', 'en'], experienceYears: 15, rating: 4.9, bio: 'Pediatria geral, 15 anos de experiência. Lisboa.', band: DAY, days: [1, 2, 3, 4, 5, 6] },
  { email: 'miguel@demo.pedia', name: 'Dr. Miguel Santos', license: 'OM-20011', region: 'Porto', specialties: ['pulmonology', 'general'], languages: ['pt', 'en'], experienceYears: 12, rating: 4.8, bio: 'Pneumologia pediátrica (asma, sibilância). Porto.', band: EVE, days: [1, 2, 3, 4, 5, 6] },
  { email: 'carla@demo.pedia', name: 'Dra. Carla Nunes', license: 'OM-20022', region: 'Coimbra', specialties: ['allergology'], languages: ['pt'], experienceYears: 10, rating: 4.7, bio: 'Alergologia pediátrica. Coimbra.', band: DAY, days: WEEK },
  { email: 'tiago@demo.pedia', name: 'Dr. Tiago Ferreira', license: 'OM-20033', region: 'Faro', specialties: ['general'], languages: ['pt', 'en'], experienceYears: 8, rating: 4.6, bio: 'Pediatria geral. Algarve.', band: EVE, days: ALLWEEK },
  { email: 'ana@demo.pedia', name: 'Dra. Ana Lima', license: 'OM-20044', region: 'Braga', specialties: ['neonatology'], languages: ['pt'], experienceYears: 18, rating: 4.9, bio: 'Neonatologia e seguimento do recém-nascido. Braga.', band: DAY, days: [1, 2, 3, 4, 5, 6] },
  { email: 'rui@demo.pedia', name: 'Dr. Rui Tavares', license: 'OM-20055', region: 'Funchal (Madeira)', specialties: ['cardiology'], languages: ['pt'], experienceYears: 14, rating: 4.8, bio: 'Cardiologia pediátrica. Madeira.', band: DAY, days: WEEK },
  { email: 'sofiap@demo.pedia', name: 'Dra. Sofia Pereira', license: 'OM-20066', region: 'Ponta Delgada (Açores)', specialties: ['gastroenterology'], languages: ['pt', 'en'], experienceYears: 11, rating: 4.7, bio: 'Gastroenterologia pediátrica. Açores (São Miguel).', band: NIGHT, days: ALLWEEK },
  { email: 'pedro@demo.pedia', name: 'Dr. Pedro Almeida', license: 'OM-20077', region: 'Angra do Heroísmo (Açores)', specialties: ['general'], languages: ['pt'], experienceYears: 9, rating: 4.6, bio: 'Pediatria geral e urgência. Açores (Terceira).', band: NIGHT, days: ALLWEEK },
  { email: 'martas@demo.pedia', name: 'Dra. Marta Sousa', license: 'OM-20088', region: 'Lisboa', specialties: ['dermatology'], languages: ['pt', 'es'], experienceYears: 13, rating: 4.8, bio: 'Dermatologia pediátrica (eczema, dermatites). Lisboa.', band: EVE, days: WEEK },
  { email: 'joaom@demo.pedia', name: 'Dr. João Mendes', license: 'OM-20099', region: 'Porto', specialties: ['neurology'], languages: ['pt', 'en'], experienceYears: 16, rating: 4.9, bio: 'Neurologia pediátrica (convulsões, desenvolvimento). Porto.', band: NIGHT, days: ALLWEEK },
];

async function seedPediatricians() {
  const byEmail: Record<string, { pedId: string; userId: string }> = {};
  for (const p of PEDS) {
    const user = await upsertUser(p.email, Role.PEDIATRICIAN, { mfaEnabled: true });
    const ped = await prisma.pediatrician.upsert({
      where: { userId: user.id },
      update: {
        licenseVerifiedAt: new Date(),
        bio: p.bio,
        experienceYears: p.experienceYears,
        languages: p.languages,
        specialties: p.specialties,
        region: p.region,
        status: PediatricianStatus.ACTIVE,
        ratingAvg: p.rating,
      },
      create: {
        userId: user.id,
        licenseNumber: p.license,
        licenseVerifiedAt: new Date(),
        bio: p.bio,
        experienceYears: p.experienceYears,
        languages: p.languages,
        specialties: p.specialties,
        region: p.region,
        status: PediatricianStatus.ACTIVE,
        ratingAvg: p.rating,
      },
    });
    byEmail[p.email] = { pedId: ped.id, userId: user.id };

    // Services (idempotent: clear then recreate).
    await prisma.pediatricianService.deleteMany({ where: { pediatricianId: ped.id } });
    await prisma.pediatricianService.createMany({
      data: [
        { pediatricianId: ped.id, type: ServiceType.MESSAGE, priceCents: 1800, slaHours: 4, scopeText: '1 questão + esclarecimentos' },
        { pediatricianId: ped.id, type: ServiceType.VIDEO, priceCents: 4500, slaHours: 24 },
      ],
    });

    // Availability covering the pediatrician's band on its weekdays (24h is
    // covered collectively: night by Açores + neuro, day/evening by the rest).
    await prisma.availability.deleteMany({ where: { pediatricianId: ped.id } });
    await prisma.availability.createMany({
      data: p.days.map((wd) => ({
        pediatricianId: ped.id,
        weekday: wd,
        startMinute: p.band[0],
        endMinute: p.band[1],
        slotMinutes: 20,
      })),
    });
  }
  return byEmail;
}

// ── Families, children and rich clinical data (demonstrates every feature) ──
interface ClinicalSpec {
  growth: { at: Date; heightCm?: number; weightKg?: number; headCm?: number }[];
  vaccines: { name: string; at: Date; pnvAbbr?: string; cvx?: string }[];
  meds: { name: string; dose?: string; atc?: string; route?: string; freq?: string; active?: boolean; startedAt?: Date }[];
  episodes: { title: string; summary?: string; icpc2?: string; icd10?: string; status?: string; closedAt?: Date }[];
  allergies: { label: string; code?: string; category?: string }[];
  vitals: { at: Date; temperatureC?: number; heartRateBpm?: number; respRateBpm?: number; spo2Pct?: number }[];
}

async function seedChild(
  familyId: string,
  name: string,
  birthDate: Date,
  sex: string,
  userId: string,
  clin: ClinicalSpec,
) {
  const existingChild = await prisma.child.findFirst({ where: { familyId, name } });
  const child = existingChild ?? (await prisma.child.create({ data: { familyId, name, birthDate, sex } }));

  const consent = await prisma.consent.findFirst({
    where: { childId: child.id, subject: ConsentSubject.HEALTH_DATA, revokedAt: null },
  });
  if (!consent) {
    await prisma.consent.create({
      data: { userId, childId: child.id, subject: ConsentSubject.HEALTH_DATA, version: '1.0' },
    });
  }

  // Clinical records: clear then recreate so re-seeds stay idempotent.
  await prisma.growthMeasurement.deleteMany({ where: { childId: child.id } });
  await prisma.vaccination.deleteMany({ where: { childId: child.id } });
  await prisma.medication.deleteMany({ where: { childId: child.id } });
  await prisma.episode.deleteMany({ where: { childId: child.id } });
  await prisma.allergy.deleteMany({ where: { childId: child.id } });
  await prisma.vital.deleteMany({ where: { childId: child.id } });

  if (clin.growth.length)
    await prisma.growthMeasurement.createMany({
      data: clin.growth.map((g) => ({ childId: child!.id, measuredAt: g.at, heightCm: g.heightCm ?? null, weightKg: g.weightKg ?? null, headCm: g.headCm ?? null })),
    });
  for (const v of clin.vaccines)
    await prisma.vaccination.create({ data: { childId: child.id, name: enc(v.name), date: v.at, pnvAbbr: v.pnvAbbr, cvx: v.cvx } });
  for (const m of clin.meds)
    await prisma.medication.create({ data: { childId: child.id, name: enc(m.name), dose: m.dose ? enc(m.dose) : null, atcCode: m.atc, route: m.route, frequency: m.freq, active: m.active ?? true, startedAt: m.startedAt ?? null } });
  for (const e of clin.episodes)
    await prisma.episode.create({ data: { childId: child.id, title: enc(e.title), summary: e.summary ? enc(e.summary) : null, icpc2Code: e.icpc2, icd10Code: e.icd10, status: e.status ?? 'OPEN', closedAt: e.closedAt ?? null } });
  for (const a of clin.allergies)
    await prisma.allergy.create({ data: { childId: child.id, label: enc(a.label), code: a.code, category: a.category } });
  if (clin.vitals.length)
    await prisma.vital.createMany({ data: clin.vitals.map((v) => ({ childId: child!.id, measuredAt: v.at, temperatureC: v.temperatureC ?? null, heartRateBpm: v.heartRateBpm ?? null, respRateBpm: v.respRateBpm ?? null, spo2Pct: v.spo2Pct ?? null })) });

  return child;
}

async function ensureFamily(user: { id: string }, familyName: string) {
  let family = await prisma.family.findFirst({ where: { primaryUserId: user.id } });
  family ??= await prisma.family.create({ data: { name: familyName, primaryUserId: user.id } });
  await prisma.familyMember.upsert({
    where: { familyId_userId: { familyId: family.id, userId: user.id } },
    create: { familyId: family.id, userId: user.id, relationship: 'guardian' },
    update: {},
  });
  return family;
}

async function main(): Promise<void> {
  const peds = await seedPediatricians();
  const inesPed = peds['ines@demo.pedia'];

  // Base demo users for every profile (sign in with POST /auth/dev-login).
  const roleUsers: { email: string; role: Role }[] = [
    { email: 'marta@demo.pedia', role: Role.PARENT },
    { email: 'joao@demo.pedia', role: Role.PARENT },
    { email: 'sofia@demo.pedia', role: Role.PARENT },
    { email: 'ricardo@demo.pedia', role: Role.PARENT },
    { email: 'clinica.admin@demo.pedia', role: Role.CLINIC_ADMIN },
    { email: 'clinica.staff@demo.pedia', role: Role.CLINIC_STAFF },
    { email: 'admin@demo.pedia', role: Role.PLATFORM_ADMIN },
    { email: 'suporte@demo.pedia', role: Role.SUPPORT },
    { email: 'financas@demo.pedia', role: Role.FINANCE },
    { email: 'compliance@demo.pedia', role: Role.COMPLIANCE },
  ];
  for (const u of roleUsers) await upsertUser(u.email, u.role);

  // ── Family Silva (Marta) — Tomás: normal growth, up-to-date ──
  const marta = await prisma.user.findUniqueOrThrow({ where: { email: 'marta@demo.pedia' } });
  const silva = await ensureFamily(marta, 'Família Silva');
  const tomas = await seedChild(silva.id, 'Tomás', d('2021-06-01'), 'M', marta.id, {
    growth: [
      { at: d('2021-12-01'), heightCm: 67, weightKg: 8.0 },
      { at: d('2022-06-01'), heightCm: 76, weightKg: 9.6 },
      { at: d('2023-06-01'), heightCm: 87, weightKg: 12.2 },
      { at: d('2024-06-01'), heightCm: 96, weightKg: 14.3 },
      { at: d('2025-06-01'), heightCm: 103, weightKg: 16.3 },
    ],
    vaccines: [
      { name: 'Hexavalente (DTPa+VIP+Hib+VHB)', at: d('2021-08-01'), pnvAbbr: 'Hexavalente' },
      { name: 'Pneumocócica conjugada 13', at: d('2021-08-01'), pnvAbbr: 'Pn13', cvx: '133' },
      { name: 'VASPR', at: d('2022-06-01'), pnvAbbr: 'VASPR', cvx: '03' },
      { name: 'MenC', at: d('2022-06-01'), pnvAbbr: 'MenC' },
    ],
    meds: [{ name: 'Colecalciferol (vitamina D)', dose: '400 UI/dia', atc: 'A11CC05', route: 'oral', active: true, startedAt: d('2021-06-15') }],
    episodes: [{ title: 'Otite média aguda', summary: 'Resolvida com amoxicilina.', icpc2: 'H71', icd10: 'H66.9', status: 'CLOSED', closedAt: d('2024-02-20') }],
    allergies: [],
    vitals: [{ at: ago(40), temperatureC: 36.8, heartRateBpm: 98, respRateBpm: 24, spo2Pct: 99 }],
  });

  // ── Family Costa (João) — Beatriz (asma) + Rodrigo (lactente saudável) ──
  const joao = await prisma.user.findUniqueOrThrow({ where: { email: 'joao@demo.pedia' } });
  const costa = await ensureFamily(joao, 'Família Costa');
  await seedChild(costa.id, 'Beatriz', d('2021-03-15'), 'F', joao.id, {
    growth: [
      { at: d('2021-09-15'), heightCm: 65, weightKg: 7.2 },
      { at: d('2022-03-15'), heightCm: 74, weightKg: 9.0 },
      { at: d('2023-03-15'), heightCm: 85, weightKg: 11.4 },
      { at: d('2024-09-15'), heightCm: 96, weightKg: 14.0 },
      { at: d('2025-09-15'), heightCm: 104, weightKg: 16.2 },
    ],
    vaccines: [
      { name: 'Hexavalente (DTPa+VIP+Hib+VHB)', at: d('2021-05-15'), pnvAbbr: 'Hexavalente' },
      { name: 'VASPR', at: d('2022-03-15'), pnvAbbr: 'VASPR', cvx: '03' },
    ],
    meds: [
      { name: 'Salbutamol', dose: '100 mcg SOS', atc: 'R03AC02', route: 'inalada', freq: 'SOS', active: true, startedAt: d('2024-11-01') },
      { name: 'Fluticasona (inalada)', dose: '50 mcg 2x/dia', atc: 'R03BA05', route: 'inalada', freq: '12/12h', active: true, startedAt: d('2025-01-10') },
    ],
    episodes: [{ title: 'Asma / sibilância recorrente', summary: 'Crises associadas a IVAS e pólenes. Plano de ação entregue.', icpc2: 'R96', icd10: 'J45.9', status: 'OPEN' }],
    allergies: [{ label: 'Pólenes (gramíneas)', code: 'ENV_POLLEN', category: 'ambiental' }],
    vitals: [{ at: ago(20), temperatureC: 37.0, heartRateBpm: 104, respRateBpm: 28, spo2Pct: 97 }],
  });
  await seedChild(costa.id, 'Rodrigo', d('2024-12-01'), 'M', joao.id, {
    growth: [
      { at: d('2025-02-01'), heightCm: 58, weightKg: 5.5, headCm: 39 },
      { at: d('2025-04-01'), heightCm: 64, weightKg: 7.0, headCm: 41 },
      { at: d('2025-06-01'), heightCm: 68, weightKg: 8.0, headCm: 43 },
    ],
    vaccines: [
      { name: 'VHB (ao nascer)', at: d('2024-12-01'), pnvAbbr: 'VHB', cvx: '08' },
      { name: 'Hexavalente (2 meses)', at: d('2025-02-01'), pnvAbbr: 'Hexavalente' },
      { name: 'Pneumocócica conjugada 13', at: d('2025-02-01'), pnvAbbr: 'Pn13', cvx: '133' },
    ],
    meds: [],
    episodes: [],
    allergies: [],
    vitals: [{ at: ago(10), temperatureC: 36.6, heartRateBpm: 120, respRateBpm: 34, spo2Pct: 99 }],
  });

  // ── Family Mendes (Sofia) — Leonor: excesso de peso + alergia a penicilina ──
  const sofia = await prisma.user.findUniqueOrThrow({ where: { email: 'sofia@demo.pedia' } });
  const mendes = await ensureFamily(sofia, 'Família Mendes');
  await seedChild(mendes.id, 'Leonor', d('2022-01-01'), 'F', sofia.id, {
    growth: [
      { at: d('2023-01-01'), heightCm: 76, weightKg: 11.0 },
      { at: d('2024-01-01'), heightCm: 88, weightKg: 15.0 },
      { at: d('2025-01-01'), heightCm: 98, weightKg: 19.5 },
      { at: d('2025-12-01'), heightCm: 105, weightKg: 23.0 },
    ],
    vaccines: [
      { name: 'Hexavalente (DTPa+VIP+Hib+VHB)', at: d('2022-03-01'), pnvAbbr: 'Hexavalente' },
      { name: 'VASPR', at: d('2023-01-01'), pnvAbbr: 'VASPR', cvx: '03' },
    ],
    meds: [],
    episodes: [{ title: 'Excesso de peso — aconselhamento alimentar', icpc2: 'T83', icd10: 'E66.3', status: 'OPEN' }],
    allergies: [{ label: 'Penicilinas', code: 'DRUG_PENICILLIN', category: 'farmaco' }],
    vitals: [{ at: ago(15), temperatureC: 36.7, heartRateBpm: 95, respRateBpm: 22, spo2Pct: 99 }],
  });

  // ── Family Rocha (Ricardo) — Afonso: crescimento insuficiente + vacinas em atraso ──
  const ricardo = await prisma.user.findUniqueOrThrow({ where: { email: 'ricardo@demo.pedia' } });
  const rocha = await ensureFamily(ricardo, 'Família Rocha');
  await seedChild(rocha.id, 'Afonso', d('2023-12-01'), 'M', ricardo.id, {
    growth: [
      { at: d('2024-06-01'), heightCm: 65, weightKg: 7.0 },
      { at: d('2024-12-01'), heightCm: 71, weightKg: 8.0 },
      { at: d('2025-06-01'), heightCm: 76, weightKg: 8.4 },
      { at: d('2025-12-01'), heightCm: 82, weightKg: 9.2 },
    ],
    // Only the early doses given → 12-month doses overdue at ~2.5y.
    vaccines: [
      { name: 'VHB (ao nascer)', at: d('2023-12-01'), pnvAbbr: 'VHB', cvx: '08' },
      { name: 'Hexavalente (2 meses)', at: d('2024-02-01'), pnvAbbr: 'Hexavalente' },
    ],
    meds: [],
    episodes: [{ title: 'Crescimento insuficiente — investigar', icpc2: 'T82', status: 'OPEN' }],
    allergies: [],
    vitals: [{ at: ago(30), temperatureC: 36.5, heartRateBpm: 110, respRateBpm: 26, spo2Pct: 98 }],
  });

  // ── Demo consultations (Inês ↔ Tomás) for history + finance, idempotent ──
  if (inesPed) {
    const existing = await prisma.consultation.findFirst({ where: { childId: tomas.id } });
    if (!existing) {
      // A closed, paid, reviewed message consultation.
      const c1 = await prisma.consultation.create({
        data: {
          familyId: silva.id,
          childId: tomas.id,
          pediatricianId: inesPed.pedId,
          type: ServiceType.MESSAGE,
          status: ConsultationStatus.CLOSED,
          priceCents: 1800,
          openedAt: ago(35),
          answeredAt: ago(35),
          closedAt: ago(34),
          summary: enc('S: Febre 38.5ºC há 2 dias, sem sinais de alarme.\nO: Bom estado geral.\nA: Virose.\nP: Hidratação, antipirético, reavaliar se persistir.'),
        },
      });
      await prisma.message.createMany({
        data: [
          { consultationId: c1.id, senderUserId: marta.id, body: enc('Boa tarde, o Tomás tem febre há 2 dias. O que devo fazer?') },
          { consultationId: c1.id, senderUserId: inesPed.userId, body: enc('Olá Marta. Mantenha hidratação e antipirético. Se a febre passar de 3 dias ou houver prostração, recorra à urgência.') },
        ],
      });
      const pay = await prisma.payment.create({
        data: { consultationId: c1.id, amountCents: 1800, status: PaymentStatus.CAPTURED, psp: 'demo', pspRef: `demo_${c1.id}`, capturedAt: ago(34) },
      });
      await prisma.split.create({ data: { paymentId: pay.id, platformFeeCents: 360, pediatricianAmount: 1440 } });
      await prisma.review.create({
        data: { consultationId: c1.id, familyId: silva.id, pediatricianId: inesPed.pedId, rating: 5, comment: 'Resposta rápida e tranquilizadora. Recomendo!' },
      });

      // An open video consultation (shows in the inbox).
      await prisma.consultation.create({
        data: {
          familyId: silva.id,
          childId: tomas.id,
          pediatricianId: inesPed.pedId,
          type: ServiceType.VIDEO,
          status: ConsultationStatus.OPEN,
          priceCents: 4500,
          openedAt: ago(1),
          slaDueAt: new Date(Date.now() + 23 * 3600 * 1000),
        },
      });
    }
  }

  // ── Demo clinic linking the clinic users + Dra. Inês (idempotent) ──
  const clinicAdmin = await prisma.user.findUnique({ where: { email: 'clinica.admin@demo.pedia' } });
  const clinicStaff = await prisma.user.findUnique({ where: { email: 'clinica.staff@demo.pedia' } });
  if (clinicAdmin && clinicStaff && inesPed) {
    let clinic = await prisma.clinic.findFirst({ where: { name: 'Clínica Demo' } });
    clinic ??= await prisma.clinic.create({ data: { name: 'Clínica Demo', taxId: '500000000' } });
    for (const cm of [
      { id: clinicAdmin.id, role: Role.CLINIC_ADMIN },
      { id: clinicStaff.id, role: Role.CLINIC_STAFF },
    ]) {
      await prisma.clinicMember.upsert({
        where: { clinicId_userId: { clinicId: clinic.id, userId: cm.id } },
        create: { clinicId: clinic.id, userId: cm.id, role: cm.role },
        update: { role: cm.role },
      });
    }
    await prisma.clinicPediatrician.upsert({
      where: { clinicId_pediatricianId: { clinicId: clinic.id, pediatricianId: inesPed.pedId } },
      create: { clinicId: clinic.id, pediatricianId: inesPed.pedId, revenueSharePct: 20 },
      update: {},
    });
  }

  // ── Content library (idempotent by slug) ──
  const articles = [
    { slug: 'febre-nas-criancas', title: 'Febre nas crianças: o que fazer', category: 'sintomas', body: 'A febre é uma resposta natural do organismo. Mantém a criança hidratada, vigia o estado geral e contacta o pediatra se a febre durar mais de 3 dias, se houver prostração ou dificuldade respiratória.' },
    { slug: 'sono-do-bebe', title: 'O sono do bebé nos primeiros meses', category: 'desenvolvimento', body: 'Os padrões de sono mudam muito no primeiro ano. Cria uma rotina calma, coloca o bebé de costas para dormir e evita ecrãs antes de deitar.' },
    { slug: 'vacinacao-em-dia', title: 'Manter a vacinação em dia', category: 'prevenção', body: 'O plano nacional de vacinação protege contra várias doenças graves. Regista as vacinas no perfil de saúde da criança e fala com o pediatra sobre reforços.' },
    { slug: 'asma-na-infancia', title: 'Asma na infância: viver melhor', category: 'sintomas', body: 'Com um plano de ação, medicação de controlo e evicção de fatores desencadeantes (pólenes, fumo), a maioria das crianças com asma tem uma vida normal.' },
  ];
  const inesUser = inesPed?.userId;
  for (const a of articles) {
    await prisma.article.upsert({
      where: { slug: a.slug },
      update: {},
      create: { ...a, published: true, authorUserId: inesUser ?? marta.id },
    });
  }

  // eslint-disable-next-line no-console
  console.log(`Seeded ${PEDS.length} pediatricians, 4 families/5 children with clinical data, consultations + clinic + content.`);
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
