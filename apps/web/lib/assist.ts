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

// Severe red flags → immediate emergency. Keys mirror the triage RED_FLAGS
// where they overlap so downstream code can reuse the same labels.
const SEVERE: { key: string; terms: string[] }[] = [
  { key: 'breathing', terms: ['nao respira', 'dificuldade a respirar', 'dificuldade respirar', 'falta de ar', 'nao consegue respirar', 'respiracao muito rapida', 'asfixia', 'engasg', 'sufoc', "can't breathe", 'cant breathe', 'trouble breathing', 'no respira', 'dificultad para respirar', 'ahog'] },
  { key: 'seizure', terms: ['convuls', 'ataque epilep', 'seizure', 'convulsion'] },
  { key: 'bluish', terms: ['labios roxos', 'labios azuis', 'labios azulados', 'pele azulada', 'roxo', 'azulad', 'blue lips', 'bluish', 'labios morados', 'morado'] },
  { key: 'unresponsive', terms: ['nao acorda', 'nao responde', 'prostrad', 'desmai', 'inconsciente', 'sem reacao', 'muito molinho', 'unconscious', 'unresponsive', 'wont wake', "won't wake", 'no despierta', 'no responde', 'desmayo'] },
  { key: 'anaphylaxis', terms: ['anafila', 'inchaco na garganta', 'garganta a fechar', 'lingua inchada', 'reacao alergica grave', 'swelling throat', 'throat closing', 'anaphyla', 'hinchazon garganta'] },
  { key: 'bleeding', terms: ['hemorragia', 'sangra muito', 'sangue abundante', 'nao para de sangrar', 'heavy bleeding', 'wont stop bleeding', 'hemorragia', 'sangra mucho'] },
  { key: 'headtrauma', terms: ['traumatismo craniano', 'bateu com a cabeca', 'queda da cabeca', 'pancada na cabeca com', 'head injury', 'head trauma', 'golpe en la cabeza'] },
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

export function assess(textRaw: string): AssistResult {
  const t = norm(textRaw || '');
  const redFlags = SEVERE.filter((r) => anyTerm(t, r.terms)).map((r) => r.key);
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
