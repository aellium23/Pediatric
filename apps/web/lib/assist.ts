/**
 * Parent Home "Em que posso ajudar?" assistant — the deterministic safety and
 * routing core. It is intentionally NOT a diagnostic tool: it detects red
 * flags (→ emergency escalation), classifies the concern into a paediatric
 * specialty for routing, and picks a copy topic for safe general guidance.
 *
 * This layer runs ALWAYS (no API key, no network), so a distressed parent
 * never hits a dead screen. An LLM can later refine the phrasing on top, but
 * the red-flag detection and routing must stay rules-based and auditable.
 *
 * Matching is accent- and case-insensitive and covers PT/EN/ES vocabulary.
 */

export type AssistSeverity = 'emergency' | 'caution' | 'info';

export interface AssistResult {
  severity: AssistSeverity;
  /** Severe red-flag keys detected (drive the 112/SNS24 escalation). */
  redFlags: string[];
  /** Non-severe but "see a doctor soon" signals. */
  cautions: string[];
  /** Suggested specialty code for routing, or null → general paediatrics. */
  specialty: string | null;
  /** Copy topic key for the localized first-help note. */
  topic: string;
}

/** Strip accents and lowercase for robust keyword matching ("febre"→"febre"). */
export function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * A rule matches when ANY of its contiguous `terms` appears, OR when every
 * group in `all` contributes at least one term (co-occurrence, order-free).
 *
 * The co-occurrence form exists because parents don't write textbook phrases:
 * "o meu filho NÃO ESTÁ A RESPIRAR" never contains the literal "nao respira".
 * Matching ["respir"] together with a negation/difficulty word catches the
 * real phrasings without needing to enumerate every sentence shape.
 */
interface Rule {
  key: string;
  terms?: string[];
  all?: string[][];
  /** Vetoes the match — e.g. a "roxo" that is plainly a bruise, not cyanosis. */
  not?: string[];
}

// Words that turn a body-function mention into an alarm ("não respira",
// "dificuldade em respirar", "not breathing").
const NEG = ['nao ', 'nao,', 'nao.', 'sem ', 'dificuldade', 'dificil', 'custa', 'falta', 'mal ',
  'not ', "n't", 'cant', 'trouble', 'hard ', 'without', 'no ', 'dificultad', 'apenas consegue'];

// Severe red flags → immediate emergency. Keys mirror the triage RED_FLAGS
// where they overlap so downstream code can reuse the same labels.
const SEVERE: Rule[] = [
  {
    key: 'breathing',
    terms: ['falta de ar', 'asfixia', 'engasg', 'sufoc', 'respiracao muito rapida',
      "can't breathe", 'cant breathe', 'trouble breathing', 'ahog', 'adejo nasal'],
    all: [['respir', 'breath'], NEG],
  },
  { key: 'seizure', terms: ['convuls', 'ataque epilep', 'seizure'] },
  {
    key: 'bluish',
    terms: ['pele azulada', 'blue lips', 'bluish', 'cianos', 'arroxead'],
    // Localized cyanosis. Only lips/mouth/nails/face — a blue mark elsewhere on
    // the skin is a bruise. "azu" (not "azul") also covers the plural "azuis".
    all: [['labio', 'lips', 'boca', 'mouth', 'unhas', 'cara', 'face'],
      ['azu', 'roxo', 'roxa', 'morad', 'blue', 'purple']],
  },
  {
    key: 'bluish',
    // Generalized cyanosis: "ficou roxo", "está todo azul". Vetoed when the
    // sentence is plainly describing a bruise.
    all: [['roxo', 'roxa', 'morad', 'azu'],
      ['ficou', 'ficar', 'fica ', 'todo', 'toda', 'turned', 'se puso', 'esta ']],
    not: ['nodoa', 'marca', 'mancha', 'hematoma', 'pisadura', 'bruise', 'moreton'],
  },
  {
    key: 'unresponsive',
    terms: ['prostrad', 'desmai', 'inconsciente', 'sem reacao', 'muito molinho',
      'unconscious', 'unresponsive', 'desmayo', 'letargic'],
    all: [['acorda', 'acordar', 'reage', 'reagir', 'responde', 'wake', 'respond', 'despierta'], NEG],
  },
  {
    key: 'anaphylaxis',
    terms: ['anafila', 'anaphyla', 'reacao alergica grave', 'choque alergico'],
    all: [['garganta', 'lingua', 'throat', 'tongue', 'cara', 'face', 'labios'],
      ['inch', 'incha', 'swell', 'fecha', 'fechar', 'hinchaz', 'closing']],
  },
  {
    key: 'bleeding',
    terms: ['hemorragia', 'sangue abundante', 'heavy bleeding'],
    all: [['sangra', 'sangue', 'bleed', 'sangr'], ['muito', 'nao para', 'wont stop', "won't stop", 'abundante', 'mucho', 'jorra']],
  },
  {
    key: 'headtrauma',
    terms: ['traumatismo craniano', 'head injury', 'head trauma', 'golpe en la cabeza'],
    all: [['cabeca', 'head', 'craniano', 'cranio'], ['bateu', 'pancada', 'queda', 'caiu', 'embate', 'hit', 'struck', 'golpe']],
  },
];

// Non-severe cautions → "see a paediatrician soon".
const CAUTION: { key: string; terms: string[] }[] = [
  { key: 'highfever', terms: ['febre alta', 'febre ha 3 dias', 'febre ha mais de 3', 'febre que nao passa', 'febre persistente', '40 graus', '39 graus', 'high fever', 'fiebre alta', 'fiebre persistente'] },
  { key: 'dehydration', terms: ['nao bebe', 'sem urinar', 'nao urina', 'sem chichi', 'desidrat', 'boca seca', 'sem lagrimas', 'not drinking', 'no wet diaper', 'dehydrat', 'no bebe', 'no orina', 'deshidrat'] },
  { key: 'persistentvomit', terms: ['vomita tudo', 'vomitos persistentes', 'nao para de vomitar', 'vomita muito', 'keeps vomiting', 'vomita todo'] },
  { key: 'severepain', terms: ['dor intensa', 'dor forte', 'muitas dores', 'chora de dor', 'severe pain', 'dolor intenso', 'dolor fuerte'] },
];

// Symptom → specialty routing. Order matters: earlier entries win ties.
const ROUTING: { specialty: string; topic: string; terms: string[] }[] = [
  { specialty: 'dermatology', topic: 'skin', terms: ['pele', 'erupca', 'borbulh', 'mancha na pele', 'eczema', 'urticaria', 'brotoeja', 'assadura', 'dermatite', 'comichao na pele', 'rash', 'skin', 'hives', 'piel', 'sarpullido', 'erupcion', 'ronchas'] },
  { specialty: 'allergology', topic: 'allergy', terms: ['alergi', 'alergic', 'espirr', 'rinite', 'comichao', 'olhos a lacrimejar', 'reacao a', 'allergy', 'allergic', 'sneez', 'itch', 'estornud', 'picazon', 'alergia'] },
  { specialty: 'pulmonology', topic: 'respiratory', terms: ['tosse', 'pieira', 'sibil', 'bronqui', 'asma', 'ronco no peito', 'expectora', 'cough', 'wheeze', 'asthma', 'bronchi', 'silbid'] },
  { specialty: 'gastroenterology', topic: 'digestive', terms: ['barriga', 'dor de barriga', 'vomit', 'diarrei', 'prisao de ventre', 'obstip', 'colica', 'nausea', 'refluxo', 'stomach', 'belly', 'diarrh', 'constipation', 'reflux', 'vientre', 'diarrea', 'estrenimiento'] },
  // Development and behaviour. The product had no route for "he doesn't talk
  // yet" or "she bites at nursery": those landed in neurology or nowhere, and
  // it is the fastest-growing part of paediatric telehealth. Placed ABOVE
  // neurology on purpose — "atraso no desenvolvimento" belongs here now.
  // Terms are matched as plain substrings, so every one of these is a phrase
  // specific enough not to hijack an unrelated question ('atencao' and
  // 'creche' were tried and dropped for exactly that reason).
  { specialty: 'development', topic: 'development', terms: ['desenvolvimento', 'nao fala', 'ainda nao fala', 'nao diz palavras', 'atraso na fala', 'atraso de fala', 'gaguez', 'gagueja', 'ainda nao anda', 'nao anda ainda', 'birras', 'comportamento', 'agressiv', 'hiperativ', 'nao se concentra', 'nao presta atencao', 'ansiedade', 'ansios', 'autis', 'nao brinca com outras', 'speech delay', 'developmental', 'tantrum', 'anxiety', 'behaviour', 'behavior', 'no habla', 'retraso en el habla', 'rabietas', 'comportamiento', 'ansiedad'] },
  { specialty: 'neurology', topic: 'neuro', terms: ['dor de cabeca', 'enxaqueca', 'cefalei', 'tremor', 'epilep', 'atraso no desenvolvimento', 'headache', 'migraine', 'dolor de cabeza', 'tics'] },
  { specialty: 'cardiology', topic: 'cardiac', terms: ['coracao', 'sopro', 'palpitac', 'bate muito depressa', 'heart', 'murmur', 'palpitat', 'corazon', 'soplo'] },
  { specialty: 'neonatology', topic: 'newborn', terms: ['recem-nascido', 'recem nascido', 'bebe de dias', 'bebe recem', 'newborn', 'recien nacido'] },
  { specialty: 'sleep', topic: 'sleep', terms: ['sono', 'nao dorme', 'dificuldade a dormir', 'insonia', 'acorda a noite', 'sleep', 'insomnia', 'sueno', 'no duerme'] },
  { specialty: 'general', topic: 'fall', terms: ['caiu', 'queda', 'tombo', 'levou uma queda', 'bateu', 'fell', 'fall down', 'se cayo', 'caida', 'golpe'] },
  { specialty: 'general', topic: 'fever', terms: ['febre', 'temperatura', 'fever', 'fiebre'] },
  { specialty: 'general', topic: 'cold', terms: ['constipa', 'gripe', 'nariz entupido', 'garganta', 'cold', 'flu', 'sore throat', 'resfriad', 'gripa', 'garganta'] },
  { specialty: 'general', topic: 'vaccine', terms: ['vacina', 'vacinac', 'boletim de vacinas', 'vaccine', 'vacuna'] },
  { specialty: 'general', topic: 'growth', terms: ['crescimento', 'peso', 'altura', 'nao ganha peso', 'percentil', 'growth', 'weight', 'crecimiento', 'peso'] },
];

function anyTerm(hay: string, terms: string[]): boolean {
  return terms.some((t) => hay.includes(t));
}

/** A rule fires on a contiguous phrase OR on all of its co-occurrence groups. */
function ruleMatches(hay: string, rule: Rule): boolean {
  if (rule.not && anyTerm(hay, rule.not)) return false;
  if (rule.terms && anyTerm(hay, rule.terms)) return true;
  return !!rule.all && rule.all.every((group) => anyTerm(hay, group));
}

// The parent signalling they want to reach a pediatrician now (→ surface the
// "choose a pediatrician / start message or video" action inline).
const CONTACT_INTENT = [
  'contactar', 'falar com a pediatra', 'falar com o pediatra', 'falar com um pediatra',
  'falar com a medica', 'falar com o medico', 'quero falar com', 'marcar consulta',
  'marcar uma consulta', 'marcar video', 'marcar uma video', 'marcar mensagem',
  'quero consulta', 'quero uma consulta', 'ver a pediatra', 'ver o pediatra',
  'ver um pediatra', 'agendar', 'quero marcar', 'iniciar consulta',
  'contact', 'book', 'appointment', 'talk to a', 'see a pediatric', 'see a doctor',
  'quiero hablar', 'quiero una consulta', 'contactar a', 'agendar cita', 'ver a un pediatra',
];

export function wantsPediatrician(textRaw: string): boolean {
  return anyTerm(norm(textRaw || ''), CONTACT_INTENT);
}

export function assess(textRaw: string): AssistResult {
  const t = norm(textRaw || '');
  // A flag can be expressed by more than one rule (e.g. localized vs
  // generalized cyanosis) — report each key once.
  const redFlags = [...new Set(SEVERE.filter((r) => ruleMatches(t, r)).map((r) => r.key))];
  const cautions = CAUTION.filter((c) => anyTerm(t, c.terms)).map((c) => c.key);

  let specialty: string | null = null;
  let topic = 'general';
  for (const r of ROUTING) {
    if (anyTerm(t, r.terms)) {
      specialty = r.specialty === 'general' ? null : r.specialty;
      topic = r.topic;
      break;
    }
  }

  const severity: AssistSeverity = redFlags.length
    ? 'emergency'
    : cautions.length
      ? 'caution'
      : 'info';

  // On emergency, the copy topic becomes the red-flag itself (guidance focuses
  // on getting help now, not on the routed specialty).
  if (severity === 'emergency') topic = 'emergency';
  else if (severity === 'caution' && topic === 'general') topic = cautions[0];

  return { severity, redFlags, cautions, specialty, topic };
}
