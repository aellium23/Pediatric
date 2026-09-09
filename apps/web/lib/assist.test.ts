import { describe, it, expect } from 'vitest';
import { assess, wantsPediatrician } from './assist';

/**
 * The Home assistant's SAFETY SPINE. This layer — not the LLM — decides whether
 * a parent sees the 112 / SNS 24 escalation, so it is the one piece that must
 * never silently regress.
 *
 * The phrasings below are how worried parents actually write, not textbook
 * terms: an earlier substring-only matcher missed "o meu filho não está a
 * respirar" because it only looked for the contiguous "nao respira".
 */
describe('assess — red flags that MUST escalate', () => {
  const EMERGENCIES = [
    'o meu filho não está a respirar',
    'está com muita dificuldade em respirar',
    'não respira',
    'dificuldade a respirar',
    'engasgou-se com uma moeda',
    'teve uma convulsão',
    'está a convulsionar',
    'os lábios dele estão azuis',
    'lábios roxos',
    'ficou roxo',
    'não acorda',
    'está inconsciente',
    'desmaiou',
    'está muito prostrado e não reage',
    'a garganta está a inchar',
    'tem uma reação alérgica grave',
    'não para de sangrar',
    'bateu com a cabeça e vomitou',
    // EN / ES — the app is trilingual.
    'my son is not breathing',
    'he had a seizure',
    'blue lips',
    'no respira bien',
    'tuvo una convulsión',
  ];

  it.each(EMERGENCIES)('escalates: %s', (phrase) => {
    const r = assess(phrase);
    expect(r.severity).toBe('emergency');
    expect(r.redFlags.length).toBeGreaterThan(0);
  });
});

describe('assess — must NOT cry wolf', () => {
  // Each contains an alarming word but is benign; false alarms destroy trust
  // and train parents to ignore the real escalation.
  const BENIGN = [
    'caiu e ficou com uma nódoa negra roxa no joelho',
    'tem uma marca roxa no braço de ontem',
    'tem uma mancha azul na perna',
    'está com uma pisadura roxa',
    'respira bem, só está com o nariz entupido',
    'tem dor de garganta há dois dias',
    'a garganta está vermelha mas come bem',
    'sangrou um bocadinho do nariz e já parou',
    'acorda bem disposto de manhã',
    'bateu com o pé na mesa',
    'tem febre baixa desde ontem',
    'está com tosse seca',
    'tem uma borbulha no braço',
    'quero marcar consulta de rotina',
  ];

  it.each(BENIGN)('does not escalate: %s', (phrase) => {
    expect(assess(phrase).severity).not.toBe('emergency');
  });
});

describe('assess — caution tier', () => {
  it('flags a multi-day fever as caution, not emergency', () => {
    const r = assess('febre alta há 3 dias');
    expect(r.severity).toBe('caution');
    expect(r.cautions).toContain('highfever');
  });

  it('flags dehydration signs', () => {
    expect(assess('não bebe nada e não urina desde manhã').severity).toBe('caution');
  });
});

describe('assess — specialty routing', () => {
  it.each([
    ['erupção na pele com comichão', 'dermatology'],
    ['tosse e pieira à noite', 'pulmonology'],
    ['dor de barriga e vómitos', 'gastroenterology'],
    ['não dorme à noite', 'sleep'],
    ['sopro no coração', 'cardiology'],
  ])('routes %s → %s', (phrase, specialty) => {
    expect(assess(phrase).specialty).toBe(specialty);
  });

  it('falls back to general paediatrics with a topic', () => {
    const r = assess('quero a vacina dos 5 anos');
    expect(r.specialty).toBeNull();
    expect(r.topic).toBe('vaccine');
  });

  // Regression: "vómitos" contains the Spanish "tos" (cough) and used to be
  // mis-routed to pulmonology.
  it('does not mistake "vómitos" for a cough', () => {
    expect(assess('dor de barriga e vómitos').specialty).toBe('gastroenterology');
  });

  it('is accent- and case-insensitive', () => {
    expect(assess('ERUPCAO NA PELE').specialty).toBe('dermatology');
  });
});

describe('wantsPediatrician', () => {
  it.each([
    'quero contactar a minha pediatra',
    'quero marcar consulta',
    'gostava de falar com um pediatra',
    'I want to book an appointment',
  ])('detects intent: %s', (phrase) => {
    expect(wantsPediatrician(phrase)).toBe(true);
  });

  it('does not fire on a plain symptom description', () => {
    expect(wantsPediatrician('tem febre desde ontem')).toBe(false);
  });
});
