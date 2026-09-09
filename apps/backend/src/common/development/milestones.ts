/**
 * Developmental milestones — the catalogue, and the rules for reading it.
 *
 * ── WHAT THIS IS ─────────────────────────────────────
 * A static, versioned list of things most children do by a given age, adapted
 * from the CDC's "Learn the Signs. Act Early." milestones (2022 revision,
 * Zubler et al., *Pediatrics*). Those milestones are set at the level ~75% of
 * children reach by that age — deliberately, so that a child who has not
 * reached one is worth a conversation rather than an alarm.
 *
 * ── WHAT THIS IS NOT ─────────────────────────────────
 * **Not a screening test.** There is no score, no cut-off, no risk level and
 * no condition named anywhere in this file or in anything built on it. M-CHAT-R,
 * ASQ-3, SDQ and EPDS all produce a screening result, and a screening result is
 * what turns software into a medical device under MDR Rule 11. Building one is
 * a decision to enter the MDR on purpose — see
 * `docs/compliance/03-marcos-desenvolvimento.md`.
 *
 * The shape this follows is the one the growth chart already uses: plot what
 * the family recorded against a published reference, and when something stands
 * out, say "worth talking to your paediatrician" — never why, in clinical
 * terms.
 *
 * ── ⚠️ NOT YET CLINICALLY VERIFIED ───────────────────
 * The Portuguese wording and the age band of every item below were written by
 * engineering from the published CDC list. They are OUR rendering, not an
 * official translation, and **have not been checked by a paediatrician**. A
 * milestone in the wrong band worries a parent whose child is fine, or
 * reassures one whose child needs to be seen. This is a launch gate, tracked in
 * `LAUNCH_READY.md` § E.
 */

export const CATALOGUE = {
  source: 'CDC · Learn the Signs. Act Early. (revisão de 2022)',
  version: '2026-09-09',
  /** Set to the reviewing clinician and date once § E of LAUNCH_READY is closed. */
  clinicallyReviewed: null as { by: string; at: string } | null,
};

export type MilestoneDomain = 'social' | 'linguagem' | 'cognitivo' | 'motor';

export interface Milestone {
  /** Stable key: band in months, domain, index. Never renumber a shipped code. */
  code: string;
  /** Age band, in months, this milestone belongs to. */
  months: number;
  domain: MilestoneDomain;
  /** Parent-facing wording, in the second person, as the family would say it. */
  pt: string;
}

/**
 * Numbering is per domain, not per band, so `m12-motor-1` is the first motor
 * item at 12 months and stays that even if a social item is added above it.
 * Never renumber a shipped code: it is the key written into a child's record.
 */
const band = (months: number, items: [MilestoneDomain, string][]): Milestone[] => {
  const seen: Partial<Record<MilestoneDomain, number>> = {};
  return items.map(([domain, pt]) => {
    const n = (seen[domain] = (seen[domain] ?? 0) + 1);
    return { code: `m${months}-${domain}-${n}`, months, domain, pt };
  });
};

export const MILESTONES: Milestone[] = [
  ...band(2, [
    ['social', 'Acalma-se quando lhe falas ou o pegas ao colo'],
    ['social', 'Olha para a tua cara'],
    ['social', 'Sorri quando falas ou sorris para ele'],
    ['linguagem', 'Faz sons que não são choro'],
    ['linguagem', 'Reage a sons altos'],
    ['cognitivo', 'Segue-te com os olhos quando te mexes'],
    ['motor', 'Levanta a cabeça quando está de barriga para baixo'],
    ['motor', 'Mexe os dois braços e as duas pernas'],
  ]),
  ...band(4, [
    ['social', 'Sorri sozinho para chamar a tua atenção'],
    ['social', 'Ri-se quando tentas fazê-lo rir'],
    ['linguagem', 'Faz sons como "ooo" e "aah"'],
    ['linguagem', 'Responde com sons quando falas com ele'],
    ['linguagem', 'Vira a cabeça para o som da tua voz'],
    ['cognitivo', 'Abre a boca quando vê a mama ou o biberão'],
    ['cognitivo', 'Olha para as próprias mãos com interesse'],
    ['motor', 'Mantém a cabeça firme, sem apoio, quando o tens ao colo'],
    ['motor', 'Segura um brinquedo que lhe pões na mão'],
    ['motor', 'Leva as mãos à boca'],
    ['motor', 'Apoia-se nos antebraços quando está de barriga para baixo'],
  ]),
  ...band(6, [
    ['social', 'Reconhece as pessoas de casa'],
    ['social', 'Gosta de se ver ao espelho'],
    ['social', 'Ri à gargalhada'],
    ['linguagem', 'Faz sons à vez contigo, como numa conversa'],
    ['linguagem', 'Faz "prrr" com os lábios'],
    ['linguagem', 'Guincha'],
    ['cognitivo', 'Leva as coisas à boca para as explorar'],
    ['cognitivo', 'Estica-se para agarrar um brinquedo que quer'],
    ['motor', 'Rola de barriga para baixo para barriga para cima'],
    ['motor', 'Faz força com os braços esticados quando está de barriga para baixo'],
    ['motor', 'Apoia-se nas mãos para se aguentar sentado'],
  ]),
  ...band(9, [
    ['social', 'Fica tímido ou agarrado a ti com desconhecidos'],
    ['social', 'Faz várias expressões diferentes na cara'],
    ['social', 'Olha quando o chamas pelo nome'],
    ['social', 'Ri quando brincam às escondidas'],
    ['linguagem', 'Faz muitos sons diferentes, como "mamama" e "bababa"'],
    ['linguagem', 'Levanta os braços para lhe pegares'],
    ['cognitivo', 'Procura as coisas quando as deixa cair'],
    ['cognitivo', 'Bate dois objetos um contra o outro'],
    ['motor', 'Senta-se sozinho'],
    ['motor', 'Aguenta-se sentado sem apoio'],
    ['motor', 'Passa as coisas de uma mão para a outra'],
  ]),
  ...band(12, [
    ['social', 'Brinca contigo a jogos como as palminhas'],
    ['linguagem', 'Diz adeus com a mão'],
    ['linguagem', 'Chama "mamã" ou "papá" (ou outro nome só teu)'],
    ['linguagem', 'Percebe o "não"'],
    ['cognitivo', 'Põe coisas dentro de um recipiente'],
    ['cognitivo', 'Procura as coisas que te viu esconder'],
    ['motor', 'Põe-se de pé agarrado a alguma coisa'],
    ['motor', 'Anda agarrado aos móveis'],
    ['motor', 'Bebe por um copo sem tampa, com a tua ajuda'],
    ['motor', 'Apanha coisas pequenas entre o polegar e o indicador'],
  ]),
  ...band(15, [
    ['social', 'Imita outras crianças a brincar'],
    ['social', 'Mostra-te uma coisa de que gosta'],
    ['social', 'Bate palmas quando está entusiasmado'],
    ['social', 'Dá-te abraços e mimos'],
    ['linguagem', 'Tenta dizer uma ou duas palavras além de "mamã" e "papá"'],
    ['linguagem', 'Olha para um objeto conhecido quando lhe dizes o nome'],
    ['linguagem', 'Aponta para pedir alguma coisa ou pedir ajuda'],
    ['cognitivo', 'Tenta usar as coisas para o que servem (telemóvel, copo, livro)'],
    ['cognitivo', 'Empilha pelo menos dois objetos pequenos'],
    ['motor', 'Dá alguns passos sozinho'],
    ['motor', 'Come alguma comida com os dedos'],
  ]),
  ...band(18, [
    ['social', 'Afasta-se de ti mas olha para trás para ver se estás perto'],
    ['social', 'Aponta para te mostrar alguma coisa interessante'],
    ['social', 'Estica as mãos para lhas lavares'],
    ['social', 'Ajuda-te a vesti-lo'],
    ['linguagem', 'Tenta dizer três ou mais palavras além de "mamã" e "papá"'],
    ['linguagem', 'Cumpre uma ordem simples sem precisar de gestos'],
    ['cognitivo', 'Imita-te a fazer as tarefas da casa'],
    ['cognitivo', 'Brinca com os brinquedos de forma simples'],
    ['motor', 'Anda sozinho, sem se agarrar a nada'],
    ['motor', 'Rabisca'],
    ['motor', 'Bebe por um copo sem tampa'],
    ['motor', 'Tenta comer com a colher'],
    ['motor', 'Sobe e desce sozinho de um sofá ou cadeira'],
  ]),
  ...band(24, [
    ['social', 'Repara quando alguém se magoa ou está triste'],
    ['social', 'Olha para a tua cara para saber como reagir a uma situação nova'],
    ['linguagem', 'Aponta para coisas num livro quando lhe perguntas'],
    ['linguagem', 'Junta pelo menos duas palavras, como "mais leite"'],
    ['linguagem', 'Aponta para pelo menos duas partes do corpo quando pedes'],
    ['cognitivo', 'Segura uma coisa numa mão enquanto usa a outra'],
    ['cognitivo', 'Tenta usar botões e interruptores de um brinquedo'],
    ['cognitivo', 'Brinca com mais do que um brinquedo ao mesmo tempo'],
    ['motor', 'Dá um pontapé numa bola'],
    ['motor', 'Corre'],
    ['motor', 'Sobe alguns degraus a andar, com ou sem ajuda'],
    ['motor', 'Come com a colher'],
  ]),
  ...band(30, [
    ['social', 'Brinca ao lado de outras crianças e às vezes com elas'],
    ['social', 'Mostra-te o que sabe fazer: "Olha para mim!"'],
    ['social', 'Segue rotinas simples quando lhe dizes'],
    ['linguagem', 'Diz cerca de 50 palavras'],
    ['linguagem', 'Junta duas ou mais palavras com uma delas a indicar ação'],
    ['linguagem', 'Diz o nome das coisas num livro quando aponta e perguntas'],
    ['linguagem', 'Usa palavras como "eu", "mim" ou "nós"'],
    ['cognitivo', 'Usa as coisas para fazer de conta'],
    ['cognitivo', 'Cumpre uma instrução com dois passos'],
    ['cognitivo', 'Conhece pelo menos uma cor'],
    ['motor', 'Usa as mãos para desenroscar coisas'],
    ['motor', 'Tira sozinho alguma roupa'],
    ['motor', 'Salta com os dois pés ao mesmo tempo'],
    ['motor', 'Vira as páginas de um livro uma a uma'],
  ]),
  ...band(36, [
    ['social', 'Acalma-se em poucos minutos depois de te ires embora'],
    ['social', 'Repara nas outras crianças e junta-se a elas para brincar'],
    ['linguagem', 'Conversa contigo com pelo menos duas trocas de vez'],
    ['linguagem', 'Faz perguntas de "quem", "o quê", "onde" ou "porquê"'],
    ['linguagem', 'Diz o que está a acontecer numa imagem'],
    ['linguagem', 'Diz o primeiro nome quando perguntas'],
    ['linguagem', 'Fala de forma percetível para outras pessoas na maior parte do tempo'],
    ['cognitivo', 'Desenha um círculo depois de lhe mostrares como'],
    ['cognitivo', 'Evita tocar em coisas quentes quando o avisas'],
    ['motor', 'Enfia contas grandes num fio'],
    ['motor', 'Veste sozinho alguma roupa'],
    ['motor', 'Come com o garfo'],
  ]),
  ...band(48, [
    ['social', 'Faz de conta que é outra coisa quando brinca'],
    ['social', 'Pede para ir brincar com outras crianças'],
    ['social', 'Consola quem está magoado ou triste'],
    ['social', 'Evita o perigo'],
    ['social', 'Gosta de ajudar'],
    ['linguagem', 'Diz frases com quatro ou mais palavras'],
    ['linguagem', 'Repete partes de uma canção, história ou lengalenga'],
    ['linguagem', 'Conta pelo menos uma coisa que lhe aconteceu durante o dia'],
    ['linguagem', 'Responde a perguntas simples'],
    ['cognitivo', 'Diz o nome de algumas cores'],
    ['cognitivo', 'Diz o que vem a seguir numa história que conhece'],
    ['cognitivo', 'Desenha uma pessoa com três ou mais partes do corpo'],
    ['motor', 'Apanha uma bola grande quase sempre'],
    ['motor', 'Serve-se de comida ou deita água, com um adulto por perto'],
    ['motor', 'Desaperta alguns botões'],
    ['motor', 'Pega no lápis entre os dedos e o polegar, não com o punho fechado'],
  ]),
  ...band(60, [
    ['social', 'Cumpre as regras e espera pela vez em jogos com outras crianças'],
    ['social', 'Canta, dança ou representa para ti'],
    ['social', 'Faz tarefas simples em casa'],
    ['linguagem', 'Conta uma história com pelo menos dois acontecimentos'],
    ['linguagem', 'Responde a perguntas simples sobre um livro ou uma história'],
    ['linguagem', 'Mantém uma conversa com mais de três trocas de vez'],
    ['linguagem', 'Usa ou reconhece rimas simples'],
    ['cognitivo', 'Conta até 10'],
    ['cognitivo', 'Diz o nome de alguns números entre 1 e 5 quando apontas'],
    ['cognitivo', 'Usa palavras sobre tempo (ontem, amanhã, logo)'],
    ['cognitivo', 'Escreve algumas letras do próprio nome'],
    ['motor', 'Aperta alguns botões'],
    ['motor', 'Salta ao pé-coxinho'],
  ]),
];

/** The distinct age bands, ascending. */
export const BANDS: number[] = [...new Set(MILESTONES.map((m) => m.months))].sort((a, b) => a - b);

export const DOMAIN_PT: Record<MilestoneDomain, string> = {
  social: 'Social e emocional',
  linguagem: 'Linguagem e comunicação',
  cognitivo: 'Aprender e pensar',
  motor: 'Movimento',
};

/** Whole months between two dates, never negative. */
export function ageInMonths(birthDate: Date | string, at: Date | string = new Date()): number {
  const b = new Date(birthDate);
  const now = new Date(at);
  if (Number.isNaN(b.getTime()) || Number.isNaN(now.getTime())) return 0;
  let months = (now.getFullYear() - b.getFullYear()) * 12 + (now.getMonth() - b.getMonth());
  if (now.getDate() < b.getDate()) months -= 1;
  return Math.max(0, months);
}

/**
 * The band a child of this age is working on: the highest band already reached.
 * Below the first band there is nothing to show yet; above the last one the
 * catalogue simply ends (it covers 0–5 years, like the WHO growth curves).
 */
export function currentBand(months: number): number | null {
  let band: number | null = null;
  for (const b of BANDS) if (months >= b) band = b;
  return band;
}

/**
 * Bands old enough to be worth asking about.
 *
 * A band only counts once the child is past the NEXT band's age. The CDC
 * milestones are set where ~75% of children are, so one in four children has
 * not reached a given item on the day they hit that age — prompting then would
 * mean worrying a quarter of families about a child who is fine. Waiting one
 * full band trades a little sensitivity for a lot fewer false alarms, which is
 * the right trade for something a parent reads alone at night.
 */
export function overdueBands(months: number): number[] {
  return BANDS.filter((b, i) => {
    const next = BANDS[i + 1];
    return next !== undefined && months >= next;
  });
}

/**
 * Milestones from bands the child is past that the family has not ticked.
 *
 * Note what this does NOT return: a count, a proportion, a severity, or any
 * grouping that could be read as a result. It is the subset of a published
 * checklist that has no tick against it — the same information the paper
 * version of the checklist would show, and nothing more.
 */
export function pendingMilestones(months: number, achieved: Iterable<string>): Milestone[] {
  const done = new Set(achieved);
  const bands = new Set(overdueBands(months));
  return MILESTONES.filter((m) => bands.has(m.months) && !done.has(m.code));
}

/** Catalogue lookup, for validating what a client sends back. */
const BY_CODE = new Map(MILESTONES.map((m) => [m.code, m]));
export const findMilestone = (code: string): Milestone | undefined => BY_CODE.get(code);
