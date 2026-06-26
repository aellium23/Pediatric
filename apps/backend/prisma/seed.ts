import {
  PrismaClient,
  Role,
  PediatricianStatus,
  ServiceType,
  ConsultationStatus,
  PaymentStatus,
  ConsentSubject,
} from '@prisma/client';
import { createCipheriv, randomBytes, createHash, randomUUID } from 'crypto';

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
        displayName: p.name,
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
        displayName: p.name,
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

// ── "Saber+" content library: validated, parent-friendly pediatric content,
// segmented by category. Each article follows a useful structure (what it is →
// at home → warning signs → when to seek help). Informative, never a substitute
// for medical assessment. ──
interface ArticleSpec {
  slug: string;
  title: string;
  category: string;
  body: string;
}
const ARTICLES: ArticleSpec[] = [
  // ───────────────── Sintomas ─────────────────
  {
    slug: 'febre-nas-criancas',
    title: 'Febre: o que fazer e quando preocupar',
    category: 'Sintomas',
    body: `A febre (temperatura ≥ 38 ºC) não é uma doença — é a resposta do corpo a uma infeção, quase sempre viral. O que importa mais do que o número do termómetro é o estado geral da criança.

Em casa:
• Ofereça líquidos com frequência e roupa leve.
• Antipirético (paracetamol ou ibuprofeno) só se houver mal-estar, na dose ajustada ao peso — confirme com o pediatra ou farmacêutico.
• Não tape em excesso nem dê banhos frios.

Sinais de alarme (contacte de imediato):
• Bebé com menos de 3 meses e qualquer febre.
• Prostração, dificuldade em acordar ou choro inconsolável.
• Dificuldade a respirar, lábios azulados.
• Manchas na pele que não desaparecem ao pressionar.
• Convulsão, rigidez do pescoço, vómitos persistentes.
• Febre há mais de 3 dias ou que reaparece.

Sem sinais de alarme, vigie em casa. Em dúvida, ligue SNS 24 (808 24 24 24) ou marque uma teleconsulta.`,
  },
  {
    slug: 'tosse-e-constipacao',
    title: 'Tosse e constipação: o guia prático',
    category: 'Sintomas',
    body: `As constipações são muito frequentes — uma criança pequena pode ter 6 a 10 por ano, sobretudo no inverno e na creche. São causadas por vírus, pelo que os antibióticos não ajudam.

Em casa:
• Lave o nariz com soro fisiológico, em especial antes das refeições e do sono.
• Mantenha a hidratação e eleve ligeiramente a cabeceira.
• Evite xaropes para a tosse em crianças pequenas (pouco eficazes e com riscos); o mel pode aliviar a tosse acima de 1 ano.
• Ambiente sem fumo de tabaco.

Sinais de alarme:
• Respiração rápida, difícil ou com "gemido"; adejo nasal ou afundamento das costelas.
• Lábios azulados.
• Febre alta que não cede ou que dura mais de 3 dias.
• Tosse que impede comer, beber ou dormir.

A tosse pode durar 1 a 2 semanas mesmo depois de a criança melhorar. Se houver dificuldade respiratória, procure ajuda.`,
  },
  {
    slug: 'vomitos-e-diarreia',
    title: 'Vómitos e diarreia: evitar a desidratação',
    category: 'Sintomas',
    body: `A gastroenterite (quase sempre viral) provoca vómitos e/ou diarreia. O principal objetivo é manter a criança hidratada.

Em casa:
• Ofereça líquidos em pequenas quantidades e com frequência ("golinhos"). A solução de reidratação oral (de farmácia) é a melhor opção.
• Não force a comida; retome a alimentação normal assim que tolerar — sem dietas restritivas prolongadas.
• Evite bebidas muito açucaradas (refrigerantes, sumos), que pioram a diarreia.

Sinais de desidratação (procure ajuda):
• Boca seca, choro sem lágrimas, olhos encovados.
• Fralda seca há mais de 6 horas / urina escassa.
• Prostração ou irritabilidade marcada.
• Vómitos que impedem qualquer ingestão de líquidos.
• Sangue nas fezes, dor abdominal intensa ou febre alta.

Bebés desidratam mais depressa — em caso de dúvida, contacte cedo o pediatra ou o SNS 24.`,
  },
  {
    slug: 'dor-de-garganta',
    title: 'Dor de garganta e amigdalites',
    category: 'Sintomas',
    body: `A maioria das dores de garganta é viral e melhora em poucos dias sem antibiótico. Algumas amigdalites são bacterianas (estreptococo) e podem precisar de tratamento.

Em casa:
• Líquidos, alimentos moles e frescos.
• Analgésico se houver dor importante, na dose adequada ao peso.

Pode indicar causa bacteriana:
• Febre alta, placas brancas nas amígdalas, gânglios dolorosos no pescoço, ausência de tosse.

Sinais de alarme:
• Dificuldade a respirar ou a engolir saliva (baba).
• Incapacidade de beber líquidos / sinais de desidratação.
• Pescoço muito inchado ou rígido.

O diagnóstico de amigdalite bacteriana faz-se na observação. Não use antibióticos por iniciativa própria — fale com o pediatra.`,
  },
  {
    slug: 'dor-de-ouvido-otite',
    title: 'Dor de ouvido (otite)',
    category: 'Sintomas',
    body: `A otite média é comum nas crianças pequenas, muitas vezes após uma constipação. Provoca dor (o bebé pode chorar, mexer na orelha e dormir mal) e por vezes febre.

Em casa:
• Analgésico para a dor, na dose adequada — é a medida que mais alivia.
• Mantenha a criança hidratada e confortável.

Muitas otites melhoram sozinhas em 48–72 horas. O antibiótico nem sempre é necessário e é decidido pelo pediatra após observar o ouvido.

Sinais de alarme:
• Saída de pus ou sangue pelo ouvido.
• Inchaço, vermelhidão ou dor atrás da orelha.
• Febre alta persistente, prostração, rigidez do pescoço.

Dor de ouvido com mau estado geral merece observação no próprio dia.`,
  },
  {
    slug: 'asma-na-infancia',
    title: 'Asma e sibilância: viver melhor',
    category: 'Sintomas',
    body: `A asma é uma inflamação crónica das vias respiratórias que causa tosse, pieira ("gatinhos no peito") e falta de ar, muitas vezes desencadeada por infeções, exercício, pólenes ou fumo.

Controlar bem:
• Cumpra a medicação de controlo diária, mesmo quando está bem.
• Tenha um plano de ação escrito com o pediatra (o que fazer em crise).
• Use a câmara expansora corretamente.
• Evite o fumo de tabaco e os desencadeantes conhecidos.

Sinais de crise grave (procure ajuda urgente):
• Falta de ar a falar ou em repouso.
• Afundamento das costelas, lábios azulados.
• A medicação de alívio não faz efeito ou tem de ser repetida muito cedo.

Com tratamento adequado, a grande maioria das crianças com asma tem uma vida totalmente normal.`,
  },

  // ───────────────── Bebé (0–12 meses) ─────────────────
  {
    slug: 'colicas-do-bebe',
    title: 'Cólicas do bebé: como aliviar',
    category: 'Bebé',
    body: `As cólicas são episódios de choro intenso, muitas vezes ao fim do dia, num bebé saudável e bem nutrido. Começam por volta das 2–3 semanas e costumam melhorar pelos 3–4 meses.

Pode ajudar:
• Colo, embalo suave, contacto pele a pele e som branco.
• Posição de barriga para baixo sobre o antebraço durante a crise.
• Arrotar bem durante e após as mamadas.
• Ambiente calmo; revezem-se nos cuidados para descansar.

Não há um "remédio mágico" — a maioria das soluções de farmácia tem eficácia limitada. Fale com o pediatra antes de as usar.

Procure ajuda se:
• O choro vier com febre, vómitos, recusa alimentar ou prostração.
• Houver má progressão de peso.
• O esgotamento dos pais for grande — pedir ajuda também é cuidar do bebé.`,
  },
  {
    slug: 'sono-do-bebe',
    title: 'O sono do bebé nos primeiros meses',
    category: 'Bebé',
    body: `O sono muda muito no primeiro ano e acordar à noite é normal. O mais importante é dormir em segurança.

Sono seguro (reduz o risco de morte súbita):
• Sempre de barriga para cima.
• Em colchão firme, sem almofadas, fraldas de pano soltas, peluches ou protetores de berço.
• No quarto dos pais, mas no seu próprio berço, nos primeiros 6 meses.
• Ambiente sem fumo; evitar sobreaquecimento.

Boas rotinas:
• Crie um ritual calmo e previsível ao deitar.
• Diferencie o dia (luz, ruído) da noite (penumbra, calma).
• Coloque o bebé no berço sonolento mas ainda acordado.

Fale com o pediatra se houver pausas respiratórias, ressonar marcado, ou sono que preocupa os pais.`,
  },
  {
    slug: 'regurgitacao-refluxo',
    title: 'Regurgitação e refluxo',
    category: 'Bebé',
    body: `Regurgitar pequenas quantidades de leite é muito comum e normal nos primeiros meses ("bebé feliz que regurgita"). Tende a melhorar quando o bebé se senta e come sólidos.

Pode ajudar:
• Mamadas mais pequenas e frequentes.
• Arrotar durante e após a mamada.
• Manter o bebé mais vertical algum tempo depois de comer (sem o deitar logo).

Não é preciso medicação se o bebé cresce bem e está confortável.

Procure ajuda se:
• Houver má progressão de peso.
• Vómitos em jato, com força crescente (sobretudo no 1.º mês).
• Vómito com sangue ou esverdeado.
• Choro intenso com as refeições, recusa alimentar, tosse ou engasgos frequentes.`,
  },
  {
    slug: 'amamentacao',
    title: 'Amamentação: começar bem',
    category: 'Bebé',
    body: `O leite materno é o alimento ideal e recomenda-se em exclusivo até cerca dos 6 meses, mantendo-se depois com a diversificação. Os primeiros dias são de aprendizagem — para o bebé e para a mãe.

Boa pega e ritmo:
• Boca bem aberta, abocanhando a aréola (não só o mamilo).
• Em livre demanda, reconhecendo os sinais de fome (procura, mãos à boca) antes do choro.
• 8 a 12 mamadas por dia nas primeiras semanas é normal.

Sinais de que está a correr bem:
• Fraldas molhadas e dejeções regulares.
• Boa progressão de peso.

Procure apoio se:
• Mamilos muito dolorosos ou gretados, mama vermelha e quente com febre (possível mastite).
• Dúvidas sobre quantidade de leite ou peso.

Pedir ajuda cedo (pediatra, conselheira de amamentação) evita muitos problemas.`,
  },
  {
    slug: 'choro-do-bebe',
    title: 'Decifrar o choro do bebé',
    category: 'Bebé',
    body: `O choro é a forma de comunicar do bebé. Na maioria das vezes tem uma causa simples: fome, fralda suja, sono, calor/frio, necessidade de colo ou excesso de estímulos.

O que tentar, por etapas:
• Verifique fome e fralda.
• Ofereça colo, embalo e contacto pele a pele.
• Reduza estímulos: luz mais fraca, ambiente calmo.
• Som branco ou um passeio podem acalmar.

Nunca abane o bebé. Abanar pode causar lesões cerebrais graves. Se estiver no limite, pouse o bebé em segurança no berço e respire alguns minutos — pedir ajuda é o mais sensato.

Procure avaliação se o choro for diferente do habitual e vier com febre, vómitos, recusa alimentar, prostração ou se o bebé estiver "mole".`,
  },

  // ───────────────── Alimentação ─────────────────
  {
    slug: 'diversificacao-alimentar',
    title: 'Introdução alimentar (diversificação)',
    category: 'Alimentação',
    body: `A introdução de novos alimentos começa por volta dos 6 meses, quando o bebé se senta com apoio, tem bom controlo da cabeça e mostra interesse pela comida. Até lá, leite (de preferência materno).

Como fazer:
• Introduza um alimento novo de cada vez, em texturas progressivas (puré → esmagado → pedaços moles).
• Ofereça variedade: legumes, fruta, cereais, carne, peixe, ovo e leguminosas.
• Não adicione sal nem açúcar. Evite mel no 1.º ano (risco de botulismo).
• Deixe o bebé explorar; recusar um alimento é normal — repita noutro dia, sem forçar.

Alergénios (ovo, peixe, frutos secos bem triturados) podem e devem ser introduzidos cedo, um de cada vez.

Vigie sinais de alergia (ver artigo dedicado). Em dúvidas sobre quantidades ou alimentos, fale com o pediatra.`,
  },
  {
    slug: 'alergias-alimentares',
    title: 'Alergias alimentares: o essencial',
    category: 'Alimentação',
    body: `Uma alergia alimentar é uma reação do sistema imunitário a um alimento. Os mais frequentes na infância são leite de vaca, ovo, frutos secos, peixe e marisco.

Reações ligeiras:
• Manchas/urticária, vermelhidão à volta da boca, vómitos ou diarreia após o alimento.

Reação grave — anafilaxia (112 imediatamente):
• Dificuldade a respirar, pieira, inchaço dos lábios/língua, voz alterada.
• Palidez, prostração, perda de consciência.
• Se a criança tem caneta de adrenalina prescrita, use-a já e ligue 112.

O que fazer:
• Registe o alimento suspeito e o tipo de reação.
• Evite o alimento até observação.
• A confirmação faz-se com o pediatra/imunoalergologia — não restrinja a dieta sem orientação, para não comprometer a nutrição.

Guarde no perfil da criança as alergias conhecidas — a app alerta para conflitos com medicação.`,
  },
  {
    slug: 'ferro-e-vitamina-d',
    title: 'Ferro e vitamina D',
    category: 'Alimentação',
    body: `Dois nutrientes merecem atenção especial nos primeiros anos.

Vitamina D:
• Recomenda-se suplemento diário a todos os bebés no 1.º ano (e por vezes depois), pois o leite e o sol não chegam para as necessidades. Siga a indicação do pediatra.

Ferro:
• Importante para o desenvolvimento e para prevenir anemia.
• A partir dos 6 meses, ofereça alimentos ricos em ferro: carne, peixe, ovo, leguminosas e cereais enriquecidos.
• O leite de vaca não deve ser a bebida principal antes do 1 ano.

Sinais que podem sugerir anemia: palidez, cansaço, irritabilidade, pouco apetite. Confirma-se com análise, pedida pelo pediatra.`,
  },
  {
    slug: 'acucar-e-habitos-saudaveis',
    title: 'Açúcar e hábitos alimentares saudáveis',
    category: 'Alimentação',
    body: `Os hábitos alimentares formam-se cedo e duram a vida toda. Quanto mais tarde a criança conhecer o açúcar e os ultraprocessados, melhor.

Boas práticas:
• Água como bebida de eleição; evite refrigerantes e sumos (mesmo "naturais", em excesso).
• Fruta e legumes todos os dias; a criança aprende pelo exemplo da família.
• Refeições em família, sem ecrãs, com horários regulares.
• Não use a comida como prémio ou castigo.
• Respeite os sinais de fome e saciedade — não obrigue a "acabar o prato".

Recusar alimentos novos é normal nesta idade; a exposição repetida e sem pressão é a chave. Em dúvidas sobre peso ou apetite, fale com o pediatra.`,
  },

  // ───────────────── Desenvolvimento ─────────────────
  {
    slug: 'marcos-do-desenvolvimento',
    title: 'Marcos do desenvolvimento',
    category: 'Desenvolvimento',
    body: `Cada criança tem o seu ritmo, mas há marcos que ajudam a acompanhar o desenvolvimento. Servem de referência, não de exame.

Alguns marcos (idades aproximadas):
• 2 meses: sorri, segue objetos com o olhar.
• 6 meses: senta-se com apoio, leva objetos à boca, balbucia.
• 9–12 meses: gatinha, faz "pinça", diz "mamã/papá".
• 12–18 meses: anda, primeiras palavras com sentido.
• 2 anos: junta 2 palavras, corre, aponta partes do corpo.

Vale a pena falar com o pediatra se notar:
• Perda de competências já adquiridas.
• Aos 12 meses não reage ao nome nem aponta/aponta interesse.
• Ausência de palavras aos 18 meses ou de frases aos 2–3 anos.
• Não faz contacto visual ou não procura interação.

A deteção precoce permite apoiar a tempo — na dúvida, valorize a sua observação.`,
  },
  {
    slug: 'birras',
    title: 'Birras: como lidar com calma',
    category: 'Desenvolvimento',
    body: `As birras são normais entre o 1 e os 4 anos. A criança ainda não sabe gerir a frustração nem nomear o que sente — e o cérebro emocional "fica ao comando".

Durante a birra:
• Mantenha a calma; o seu sossego ajuda a criança a regular-se.
• Garanta segurança e espere que a tempestade passe; evite discutir ou ceder no momento.
• Nomeie a emoção: "estás zangado porque querias...".

Prevenir:
• Rotinas previsíveis, sono e refeições em dia.
• Avise as transições ("daqui a 5 minutos guardamos").
• Ofereça escolhas simples para dar sentido de controlo.
• Valorize o bom comportamento com atenção positiva.

Fale com o pediatra se as birras forem muito intensas, frequentes, com agressividade marcada ou auto-agressão, ou se afetarem muito o dia a dia.`,
  },
  {
    slug: 'deixar-a-fralda',
    title: 'Deixar a fralda (controlo dos esfíncteres)',
    category: 'Desenvolvimento',
    body: `O treino do bacio costuma começar entre os 2 e os 3 anos, quando a criança mostra prontidão — não há idade fixa.

Sinais de prontidão:
• Fralda seca durante mais tempo.
• Mostra interesse e incomoda-se com a fralda suja.
• Consegue sentar-se e levantar-se, segue instruções simples.

Como ajudar:
• Escolha uma fase calma (evite mudanças grandes em simultâneo).
• Roupa fácil de despir; bacio acessível.
• Reforce com elogios; nunca castigue os "acidentes" — fazem parte.
• Comece pelo dia; a noite vem depois, ao seu tempo.

Os escapes noturnos podem durar até mais tarde e são normais. Fale com o pediatra se houver dor a urinar, prisão de ventre marcada, ou recuo após já ter controlo.`,
  },
  {
    slug: 'ecras-e-criancas',
    title: 'Ecrãs e crianças: uso saudável',
    category: 'Desenvolvimento',
    body: `O tempo de ecrã compete com o sono, o brincar e a interação — que são o "motor" do desenvolvimento nos primeiros anos.

Recomendações gerais:
• Antes dos 2 anos: evitar ecrãs (exceto videochamada com família).
• 2 a 5 anos: no máximo cerca de 1 hora por dia, com conteúdos de qualidade e acompanhamento de um adulto.
• Sem ecrãs às refeições e na hora antes de dormir.
• Quarto sem televisão/tablet.

Dicas:
• Combine regras claras e dê o exemplo.
• Prefira brincadeira livre, livros e tempo ao ar livre.

O excesso de ecrãs associa-se a pior sono, menos atividade física e atrasos na linguagem. Em caso de dúvidas sobre desenvolvimento, fale com o pediatra.`,
  },

  // ───────────────── Prevenção ─────────────────
  {
    slug: 'vacinacao-em-dia',
    title: 'Vacinação em dia (PNV)',
    category: 'Prevenção',
    body: `O Programa Nacional de Vacinação (PNV) é gratuito e protege contra doenças graves como o sarampo, a tosse convulsa, a meningite e outras. A vacinação em grupo protege também quem não se pode vacinar.

Boas práticas:
• Cumpra o calendário e leve o Boletim de Vacinas às consultas.
• Registe as vacinas no perfil de saúde da criança (a app sinaliza vacinas em atraso).
• Atrasos podem ser recuperados — fale com o seu profissional de saúde.

É seguro vacinar com constipação ligeira ou febrícula. Reações ligeiras (dor no local, febre baixa) são comuns e passageiras (ver artigo "Febre depois da vacina").

Em caso de dúvidas sobre vacinas extra-PNV (ex.: rotavírus, meningococo B), fale com o pediatra.`,
  },
  {
    slug: 'febre-depois-da-vacina',
    title: 'Febre depois da vacina',
    category: 'Prevenção',
    body: `É comum surgir febre baixa e mal-estar nas 24–48 horas após algumas vacinas. É sinal de que o sistema imunitário está a responder e costuma passar sozinho.

Em casa:
• Líquidos e roupa leve.
• Antipirético só se houver desconforto, na dose adequada — não dê "para prevenir" antes da vacina.
• Pode aplicar compressa fresca no local dorido; mexa suavemente o braço/perna.

Reações locais (vermelhidão, inchaço, dor) são frequentes e melhoram em 1–2 dias.

Procure ajuda se:
• Febre alta que dura mais de 48 horas.
• Choro inconsolável e prolongado, prostração.
• Inchaço muito grande ou sinais de infeção no local.
• Qualquer sinal de reação alérgica grave (raro): inchaço da boca, dificuldade a respirar → 112.`,
  },
  {
    slug: 'prevencao-de-acidentes',
    title: 'Prevenção de acidentes em casa',
    category: 'Prevenção',
    body: `Os acidentes são uma das principais causas de ida à urgência — e muitos são evitáveis. À medida que a criança ganha mobilidade, antecipe os riscos.

Em casa:
• Quedas: barreiras nas escadas, não deixar o bebé sozinho em superfícies altas, janelas seguras.
• Queimaduras: cabos das panelas virados para dentro, água do banho < 37 ºC, fora do alcance líquidos quentes.
• Asfixia/engasgo: sem objetos pequenos ao alcance; alimentos cortados pequenos.
• Intoxicações: medicamentos e produtos de limpeza fechados e fora do alcance.
• Afogamento: nunca deixar sozinha no banho ou perto de água, mesmo pouca.

No carro:
• Sistema de retenção (cadeira) adequado ao peso/altura, sempre.

Tenha à mão os contactos: 112 (emergência) e Centro de Informação Antivenenos (CIAV) 800 250 250.`,
  },
  {
    slug: 'protecao-solar',
    title: 'Proteção solar nas crianças',
    category: 'Prevenção',
    body: `A pele das crianças é mais sensível e os escaldões na infância aumentam o risco de problemas de pele no futuro.

Boas práticas:
• Bebés com menos de 6 meses: evitar a exposição direta; sombra e roupa.
• Evitar o sol entre as 11h e as 17h.
• Protetor solar (FPS 50+) nas zonas expostas, reaplicado a cada 2 horas e após o banho.
• Chapéu, óculos de sol e roupa com proteção UV.
• Reforçar a hidratação com água.

Atenção também ao calor:
• Sinais de golpe de calor: pele quente, irritabilidade ou prostração, febre sem infeção. Arrefeça, hidrate e procure ajuda se não melhorar.

Um escaldão com bolhas extensas, febre ou muito mal-estar deve ser avaliado.`,
  },

  // ───────────────── Doenças comuns ─────────────────
  {
    slug: 'gastroenterite-aguda',
    title: 'Gastroenterite aguda',
    category: 'Doenças comuns',
    body: `Infeção do tubo digestivo, quase sempre viral, com diarreia e/ou vómitos, por vezes febre e dor abdominal. Muito contagiosa — reforce a lavagem das mãos.

Em casa:
• Reidratação oral é o tratamento principal: líquidos em pequenas quantidades e frequentes.
• Retome a alimentação normal assim que tolerar; evite bebidas açucaradas.
• Não dê medicamentos para "travar" a diarreia sem indicação médica.

Sinais de desidratação / alarme:
• Fralda seca > 6 horas, choro sem lágrimas, olhos encovados, prostração.
• Vómitos que impedem beber, sangue nas fezes, dor abdominal intensa.
• Febre alta persistente; bebé pequeno.

Prevenção: lavagem das mãos, e existe vacina contra o rotavírus (fale com o pediatra). Em dúvida, contacte cedo.`,
  },
  {
    slug: 'bronquiolite',
    title: 'Bronquiolite',
    category: 'Doenças comuns',
    body: `Infeção viral das pequenas vias respiratórias, frequente no inverno em bebés com menos de 2 anos. Começa como uma constipação e pode evoluir com tosse, pieira e dificuldade a respirar.

Em casa:
• Lavagem nasal com soro fisiológico, sobretudo antes de comer e dormir.
• Refeições mais pequenas e frequentes para manter a hidratação.
• Ambiente sem fumo; vigilância apertada nos primeiros dias (costuma agravar pelo 3.º–5.º dia).

Sinais de alarme (procure ajuda):
• Respiração rápida ou difícil; afundamento das costelas, adejo nasal.
• Pausas na respiração, lábios azulados.
• Recusa alimentar / sinais de desidratação.
• Bebé muito pequeno ou prematuro, ou prostração.

Os antibióticos não tratam a bronquiolite. O essencial é hidratar, desobstruir o nariz e vigiar a respiração.`,
  },
  {
    slug: 'varicela',
    title: 'Varicela',
    category: 'Doenças comuns',
    body: `Infeção viral muito contagiosa, com erupção de "borbulhas" que evoluem para vesículas e crostas, em diferentes fases ao mesmo tempo, frequentemente com febre e comichão.

Em casa:
• Unhas curtas e mãos limpas para evitar infetar as lesões ao coçar.
• Banhos frescos; pode aliviar a comichão com medidas indicadas pelo pediatra.
• Não dê ácido acetilsalicílico (aspirina) a crianças.
• Contagiosa até todas as lesões estarem em crosta — evite contacto com grávidas, recém-nascidos e pessoas imunodeprimidas.

Procure ajuda se:
• Lesões muito vermelhas, quentes, com pus (possível infeção da pele).
• Febre alta que reaparece ou prostração.
• Dificuldade a respirar, vómitos persistentes, dor de cabeça intensa ou desequilíbrio.

Existe vacina contra a varicela — fale com o pediatra.`,
  },
  {
    slug: 'conjuntivite',
    title: 'Conjuntivite',
    category: 'Doenças comuns',
    body: `Inflamação da conjuntiva (olho vermelho), que pode ser viral, bacteriana ou alérgica. As infeciosas são contagiosas.

Em casa:
• Limpe as secreções com soro fisiológico, do canto interno para o externo, com compressa diferente em cada olho.
• Lavagem frequente das mãos; toalhas e almofadas individuais.
• Não partilhe colírios nem leve as mãos aos olhos.

Pode sugerir causa alérgica: comichão marcada, ambos os olhos, com espirros/nariz a pingar.

Procure ajuda se:
• Dor intensa no olho, alteração da visão, sensibilidade à luz.
• Vermelhidão e inchaço à volta do olho (pálpebra muito inchada/quente).
• Secreção purulenta abundante que não melhora.
• Recém-nascido com olho remelento — deve ser sempre avaliado.`,
  },

  // ───────────────── Urgências e segurança ─────────────────
  {
    slug: 'sinais-de-alarme',
    title: 'Sinais de alarme: quando ir à urgência',
    category: 'Urgências',
    body: `A maioria das doenças da infância é ligeira, mas há sinais que exigem avaliação imediata. Confie no seu instinto: se a criança "não está bem", procure ajuda.

Ligue 112 ou vá à urgência se houver:
• Dificuldade a respirar: respiração rápida, afundamento das costelas, lábios azulados, pausas respiratórias.
• Prostração extrema, dificuldade em acordar, ou choro inconsolável e diferente.
• Manchas na pele que não desaparecem ao pressionar (teste do copo).
• Convulsão, ou rigidez do pescoço com febre.
• Sinais de desidratação importante (sem urina, sem lágrimas, boca seca).
• Bebé com menos de 3 meses com febre.
• Vómitos persistentes, vómito esverdeado ou com sangue.
• Dor intensa que não acalma.

Em dúvida e sem sinais graves, ligue SNS 24 (808 24 24 24) ou marque uma teleconsulta. A teleconsulta não substitui a urgência em situações graves.`,
  },
  {
    slug: 'engasgamento-primeiros-socorros',
    title: 'Engasgamento: primeiros socorros',
    category: 'Urgências',
    body: `Se a criança tosse com força, deixe-a tossir — é a forma mais eficaz de expulsar o objeto. Atue apenas se ela não conseguir tossir, chorar ou respirar.

Bebé (< 1 ano):
• 5 pancadas interescapulares (entre as omoplatas), com o bebé de barriga para baixo sobre o antebraço, cabeça mais baixa.
• Vire-o e faça 5 compressões no peito (com 2 dedos, no centro).
• Alterne até desobstruir ou chegar ajuda.

Criança (> 1 ano):
• 5 pancadas nas costas.
• 5 manobras de Heimlich (compressões abdominais) por trás.
• Alterne até resolver.

Ligue 112 de imediato. Se a criança ficar inconsciente, inicie reanimação (compressões) e siga as indicações do 112.

Aprender suporte básico de vida pediátrico salva vidas — vale muito a pena fazer uma formação.`,
  },
  {
    slug: 'quedas-e-traumatismo-da-cabeca',
    title: 'Quedas e pancadas na cabeça',
    category: 'Urgências',
    body: `As quedas são muito frequentes. A maioria das pancadas na cabeça é ligeira, mas é importante vigiar nas horas seguintes.

Em casa (pancada ligeira, criança bem):
• Aplique frio no local (galo) durante alguns minutos.
• Vigie o comportamento durante 24–48 horas, incluindo o sono (pode dormir; verifique que acorda normal).

Procure ajuda urgente / 112 se:
• Perda de consciência, mesmo breve.
• Vómitos repetidos, sonolência excessiva ou irritabilidade marcada.
• Dor de cabeça intensa e crescente.
• Saída de sangue ou líquido pelo nariz/ouvidos.
• Convulsão, desequilíbrio, fala arrastada, pupilas diferentes.
• Bebé pequeno, queda de altura considerável ou afundamento visível do crânio.

Em caso de dúvida, especialmente em bebés, é mais seguro pedir avaliação.`,
  },

  // ───────────────── Pele ─────────────────
  {
    slug: 'dermatite-atopica',
    title: 'Dermatite atópica (eczema)',
    category: 'Pele',
    body: `O eczema atópico é uma pele seca e inflamada, com comichão e períodos de agravamento ("crises"). É frequente e costuma melhorar com a idade.

Cuidados diários (a base do tratamento):
• Hidratante (emoliente) generoso, 1–2x por dia e após o banho, mesmo sem lesões.
• Banhos curtos, água morna, sabão suave sem perfume.
• Roupa de algodão; evite lã e tecidos ásperos.
• Identifique e reduza desencadeantes (calor, suor, certos sabões).

Nas crises:
• O pediatra pode indicar um creme anti-inflamatório por curtos períodos — use conforme prescrito, sem receio quando bem indicado.

Procure ajuda se:
• Lesões com pus, crostas cor de mel, muito vermelhas e quentes (infeção).
• Eczema extenso que não melhora ou afeta muito o sono.`,
  },
  {
    slug: 'assaduras-da-fralda',
    title: 'Assaduras da fralda',
    category: 'Pele',
    body: `A dermatite da fralda é a vermelhidão na zona coberta pela fralda, causada pela humidade e atrito. É muito comum e quase sempre fácil de tratar.

Em casa:
• Mude a fralda com frequência, logo que esteja suja.
• Limpe com água ou toalhitas suaves sem álcool/perfume; seque bem.
• Aplique creme barreira (com óxido de zinco) em camada espessa.
• Deixe a pele "ao ar" sempre que possível.

Procure ajuda se:
• Não melhora em poucos dias.
• Lesões muito vermelhas com pontos satélite, ou na prega (pode ser fungo — Candida).
• Bolhas, pus, crostas, febre ou pele em carne viva.

Assaduras de repetição podem relacionar-se com diarreia ou início de novos alimentos.`,
  },
  {
    slug: 'picadas-de-inseto',
    title: 'Picadas de inseto',
    category: 'Pele',
    body: `A maioria das picadas provoca uma reação local — borbulha vermelha com comichão — que melhora em poucos dias.

Em casa:
• Lave com água e sabão; aplique frio para aliviar.
• Unhas curtas para evitar feridas e infeção ao coçar.
• O pediatra/farmacêutico pode indicar medidas para a comichão.

Prevenção:
• Repelentes adequados à idade, roupa que cubra ao entardecer, redes mosquiteiras.

Procure ajuda se:
• Sinais de reação alérgica grave (112): inchaço da boca/língua, dificuldade a respirar, prostração.
• Vermelhidão que aumenta, quente e dolorosa, com pus ou febre (infeção da pele).
• Picada de carraça: retire-a cedo, por completo, e vigie a pele e o estado geral nas semanas seguintes.`,
  },
];

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

      // A scheduled video consultation for today (+45 min) with a live room —
      // log in as Dra. Inês (ines@demo.pedia) to join and simulate the call.
      const videoAt = new Date(Date.now() + 45 * 60 * 1000);
      const videoConsult = await prisma.consultation.create({
        data: {
          familyId: silva.id,
          childId: tomas.id,
          pediatricianId: inesPed.pedId,
          type: ServiceType.VIDEO,
          status: ConsultationStatus.OPEN,
          priceCents: 4500,
          openedAt: ago(1),
          scheduledAt: videoAt,
          slaDueAt: videoAt,
        },
      });
      await prisma.videoSession.create({
        data: {
          consultationId: videoConsult.id,
          roomId: randomUUID(),
          scheduledAt: videoAt,
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

  // ── Content library "Saber+" (idempotent by slug; segmented by category) ──
  const inesUser = inesPed?.userId;
  for (const a of ARTICLES) {
    await prisma.article.upsert({
      where: { slug: a.slug },
      update: { title: a.title, body: a.body, category: a.category, published: true },
      create: { ...a, published: true, authorUserId: inesUser ?? marta.id },
    });
  }

  // eslint-disable-next-line no-console
  console.log(`Seeded ${PEDS.length} pediatricians, 4 families/5 children with clinical data, consultations + clinic + ${ARTICLES.length} articles.`);
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
