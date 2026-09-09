import {
  Body,
  Controller,
  Injectable,
  Logger,
  Module,
  Post,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiProperty, ApiTags } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString, MaxLength } from 'class-validator';
import { Throttle } from 'throttler';
import { Role } from '@prisma/client';
import { Roles } from '../../common/security/decorators';

/**
 * These routes spend real money on every call (Anthropic), so they must NOT sit
 * in the generic 100 req/min bucket that protects cheap reads. 20/min still
 * covers the most talkative parent — an assistant conversation is a handful of
 * turns — while capping what a runaway client or a stolen token can burn.
 */
const AI_RATE_LIMIT = { default: { limit: 20, ttl: 60_000 } };

/**
 * Anthropic Claude helper. Two uses, both server-side only (the API key never
 * reaches the browser) and both degrading to a clear 503 when ANTHROPIC_API_KEY
 * is absent (demo mode):
 *  1) structureClinicalNote — clean a dictated pediatrician note into SOAP.
 *  2) assistGuidance — rephrase the parent-Home assistant's SAFE, rule-derived
 *     guidance in a warmer, conversational tone. It NEVER decides urgency: the
 *     red-flag detection and 112/SNS 24 escalation stay deterministic on the
 *     client (lib/assist) and never reach this call.
 * Uses raw HTTPS (global fetch) to avoid a heavy SDK dependency.
 */
/** Anthropic message content blocks we actually send. */
export type ContentBlock =
  | { type: 'text'; text: string }
  | {
      type: 'image' | 'document';
      source: { type: 'base64'; media_type: string; data: string };
    };

/** Structured candidates read off a document. Nothing here is saved until a
 *  human confirms it — these are proposals, not facts. */
export interface DocumentReading {
  allergies: { label: string }[];
  vaccines: { name: string; date?: string }[];
  medications: { name: string; dose?: string }[];
  summary?: string;
}

const MAX_ITEMS = 12;
const clean = (v: unknown, max = 140): string | undefined => {
  if (typeof v !== 'string') return undefined;
  const t = v.trim().slice(0, max);
  return t || undefined;
};
const isIsoDate = (v: unknown): v is string =>
  typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v));

/**
 * Parse the model's JSON defensively. A model asked for JSON will occasionally
 * wrap it in prose or a code fence, and will occasionally return a shape that
 * is nearly right — so every field is checked and clamped rather than trusted.
 * Anything unparseable becomes an empty reading, never an exception: a failed
 * extraction should look like "found nothing", not like a broken app.
 */
export function parseDocumentReading(raw: string): DocumentReading {
  const empty: DocumentReading = { allergies: [], vaccines: [], medications: [] };
  if (!raw) return empty;
  // Tolerate ```json fences and stray prose around the object.
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start < 0 || end <= start) return empty;

  let obj: Record<string, unknown>;
  try {
    obj = JSON.parse(raw.slice(start, end + 1)) as Record<string, unknown>;
  } catch {
    return empty;
  }
  const list = (v: unknown): Record<string, unknown>[] =>
    Array.isArray(v) ? (v.filter((x) => x && typeof x === 'object') as Record<string, unknown>[]) : [];

  // flatMap rather than map+filter: an entry without a usable name is dropped
  // outright, so nothing half-read reaches the parent's review list.
  return {
    allergies: list(obj.allergies)
      .flatMap((a) => {
        const label = clean(a.label);
        return label ? [{ label }] : [];
      })
      .slice(0, MAX_ITEMS),
    vaccines: list(obj.vaccines)
      .flatMap((v) => {
        const name = clean(v.name);
        if (!name) return [];
        return [isIsoDate(v.date) ? { name, date: v.date } : { name }];
      })
      .slice(0, MAX_ITEMS),
    medications: list(obj.medications)
      .flatMap((m) => {
        const name = clean(m.name);
        if (!name) return [];
        const dose = clean(m.dose, 80);
        return [dose ? { name, dose } : { name }];
      })
      .slice(0, MAX_ITEMS),
    summary: clean(obj.summary, 300),
  };
}

@Injectable()
export class AiService {
  private readonly logger = new Logger('AI');
  private readonly apiKey = process.env.ANTHROPIC_API_KEY ?? '';
  private readonly model = process.env.ANTHROPIC_MODEL ?? 'claude-haiku-4-5';

  private static readonly SYSTEM =
    'És um assistente de documentação clínica pediátrica. Recebes uma nota ' +
    'ditada por um pediatra, possivelmente com erros de transcrição de voz. ' +
    'Corrige os termos médicos a partir do contexto e organiza a nota em ' +
    'formato SOAP (Subjetivo, Objetivo, Avaliação, Plano), em português de ' +
    'Portugal, claro e conciso. REGRAS: não inventes factos, sintomas, ' +
    'diagnósticos, doses, valores ou datas que não estejam na nota; se algo ' +
    'estiver ambíguo, mantém como o médico escreveu; não acrescentes ' +
    'aconselhamento que o médico não deu. Devolve APENAS a nota estruturada, ' +
    'sem preâmbulos nem comentários.';

  // The assistant is a triage/routing helper, NOT a diagnostic tool. It only
  // rephrases guidance that was already deemed safe by the deterministic layer.
  private static readonly ASSIST_SYSTEM =
    'És o assistente de orientação de uma app de telepediatria (HOC). Recebes a ' +
    'mensagem de um pai/mãe, a especialidade pediátrica sugerida e um ' +
    'texto-base de orientação que já foi validado como seguro. A tua tarefa é ' +
    'REESCREVER esse texto-base num tom calmo, empático e conversacional, na ' +
    'mesma língua da mensagem do pai (português, inglês ou espanhol), em 2 a 3 ' +
    'frases curtas. REGRAS ABSOLUTAS: não diagnostiques; não indiques ' +
    'medicamentos, doses nem tratamentos; não prometas resultados; não ' +
    'contradigas nem retires o conselho de falar com um pediatra; e se ' +
    'surgirem sinais graves indica sempre procurar ajuda urgente (112 ou ' +
    'SNS 24). Devolve APENAS o texto reescrito, sem preâmbulos.';

  // Multi-turn variant: the assistant may ask ONE short clarifying question at
  // a time, then guide and route. Same safety rules as ASSIST_SYSTEM.
  private static readonly ASSIST_CHAT_SYSTEM =
    'És o assistente de orientação de uma app de telepediatria (HOC), a conversar ' +
    'com um pai/mãe. Objetivo: perceber a preocupação, dar orientação geral ' +
    'segura e encaminhar para o pediatra certo. Podes fazer NO MÁXIMO uma ' +
    'pergunta breve de cada vez para clarificar; assim que tiveres o essencial, ' +
    'dá uma orientação curta e sugere falar com um pediatra. Responde SEMPRE na ' +
    'língua do pai (português, inglês ou espanhol), em 2 a 3 frases curtas, com ' +
    'tom calmo e empático. REGRAS ABSOLUTAS: não diagnostiques; não indiques ' +
    'medicamentos, doses nem tratamentos; não prometas resultados; mantém sempre ' +
    'a indicação de falar com um pediatra; se surgirem sinais graves ' +
    '(dificuldade a respirar, convulsões, lábios azulados, prostração, ' +
    'traumatismo importante) diz para procurar ajuda urgente (112 ou SNS 24). ' +
    'Devolve APENAS a tua resposta, sem preâmbulos.';

  // Turn the conversation into a short handover the parent effectively sends to
  // the pediatrician, so they have context before the consultation.
  private static readonly SUMMARY_SYSTEM =
    'És o assistente de orientação de uma app de telepediatria (HOC). Recebes a ' +
    'conversa entre um pai/mãe e o assistente. Escreve, na mesma língua do pai ' +
    '(português, inglês ou espanhol), uma mensagem CURTA (2 a 4 frases) na ' +
    'primeira pessoa do ponto de vista do pai, para enviar ao pediatra como ' +
    'enquadramento: motivo do contacto, sintomas, desde quando e o que já foi ' +
    'observado. Sê factual; não diagnostiques nem sugiras tratamento. Devolve ' +
    'APENAS a mensagem, sem preâmbulos.';

  /**
   * Extraction prompt. Deliberately narrow: transcribe what is written, do not
   * interpret, do not infer, and leave a field out rather than guess it — a
   * plausible invention in a child's allergy list is worse than a gap.
   */
  private static readonly DOCUMENT_SYSTEM =
    'Recebes um documento de saúde de uma criança (relatório, análises, receita ' +
    'ou boletim de vacinas). Extrai APENAS o que está literalmente escrito, em ' +
    'JSON e nada mais, com esta forma exata: ' +
    '{"allergies":[{"label":""}],"vaccines":[{"name":"","date":"AAAA-MM-DD"}],' +
    '"medications":[{"name":"","dose":""}],"summary":""}. ' +
    'REGRAS ABSOLUTAS: não interpretes, não diagnostiques, não infiras nada que ' +
    'não esteja escrito; se um campo não estiver no documento, omite-o em vez de ' +
    'o inventar; se não reconheceres nada, devolve as listas vazias. O "summary" ' +
    'é uma frase factual sobre o que o documento é, sem opinião clínica. ' +
    'Devolve só o JSON, sem preâmbulo e sem blocos de código.';

  /** Whether a real Anthropic key is configured. */
  get enabled(): boolean {
    return this.apiKey.length > 0;
  }

  /** Structure/clean a raw clinical note into SOAP. */
  async structureClinicalNote(rawText: string): Promise<string> {
    const text = (rawText ?? '').trim();
    if (!text) return '';
    const out = await this.callMessages(AiService.SYSTEM, text, 1024);
    return out || text;
  }

  /**
   * Rephrase safe, rule-derived first-guidance conversationally. `baseGuidance`
   * is the deterministic copy the client already computed; the model only
   * warms the tone. Returns the base text untouched if the call yields nothing.
   */
  async assistGuidance(input: {
    message: string;
    baseGuidance: string;
    specialty?: string | null;
  }): Promise<string> {
    const base = (input.baseGuidance ?? '').trim();
    const message = (input.message ?? '').trim();
    // Best-effort enhancement: with nothing to rephrase, or in demo mode (no
    // key), return the safe base text unchanged — never an error to the parent.
    if (!base || !message || !this.enabled) return base;
    const user =
      `Mensagem do pai/mãe: """${message}"""\n` +
      `Especialidade sugerida: ${input.specialty || 'pediatria geral'}\n` +
      `Texto-base de orientação (reescreve no mesmo sentido): """${base}"""`;
    const out = await this.callMessages(AiService.ASSIST_SYSTEM, user, 400);
    return out || base;
  }

  /**
   * Multi-turn Home assistant. `messages` is the running conversation. Detects
   * nothing itself — the client's deterministic layer handles red-flag
   * escalation; this only carries the empathetic dialogue. Returns '' in demo
   * mode (no key) or when the last turn isn't the parent's, so the client can
   * fall back to its deterministic reply.
   */
  async assistChat(input: {
    messages: { role: string; text: string }[];
    specialty?: string | null;
    child?: string | null;
  }): Promise<string> {
    const raw = Array.isArray(input.messages) ? input.messages : [];
    const msgs = raw
      .filter((m) => m && typeof m.text === 'string' && m.text.trim())
      .slice(-12) // bound the context window
      .map((m) => ({
        role: m.role === 'assistant' ? ('assistant' as const) : ('user' as const),
        content: m.text.trim().slice(0, 1000),
      }));
    if (!this.enabled || !msgs.length || msgs[msgs.length - 1].role !== 'user') return '';
    let system = AiService.ASSIST_CHAT_SYSTEM;
    if (input.child) system += ` A criança em questão é: ${String(input.child).slice(0, 120)}.`;
    if (input.specialty) system += ` A especialidade sugerida até agora é: ${input.specialty}.`;
    return this.callRaw(system, msgs, 400);
  }

  /**
   * Summarize the assistant conversation into a short first-person handover the
   * parent sends to the pediatrician. Returns '' in demo mode (no key) so the
   * client falls back to the parent's raw messages.
   */
  async summarizeForHandover(
    messages: { role: string; text: string }[],
    child?: string | null,
  ): Promise<string> {
    const raw = Array.isArray(messages) ? messages : [];
    const turns = raw.filter((m) => m && typeof m.text === 'string' && m.text.trim()).slice(-16);
    if (!this.enabled || !turns.length) return '';
    const header = child ? `Criança: ${String(child).slice(0, 120)}\n` : '';
    const transcript =
      header +
      turns
        .map((m) => `${m.role === 'assistant' ? 'Assistente' : 'Pai/Mãe'}: ${m.text.trim().slice(0, 1000)}`)
        .join('\n');
    return this.callMessages(AiService.SUMMARY_SYSTEM, transcript, 300);
  }

  /**
   * Read a clinical document (PDF or photo) and PROPOSE structured entries.
   *
   * This never writes anything: it returns candidates for a human to confirm.
   * That is a hard rule, not a phase — nothing a model reads off a scan belongs
   * in a child's clinical record without a person saying yes.
   *
   * Returns null in demo mode (no key) so the caller can say "not available"
   * rather than pretend the document was read and found nothing.
   */
  async readDocument(input: {
    mime: string;
    base64: string;
    title?: string;
  }): Promise<DocumentReading | null> {
    if (!this.enabled) return null;
    const block: ContentBlock =
      input.mime === 'application/pdf'
        ? { type: 'document', source: { type: 'base64', media_type: input.mime, data: input.base64 } }
        : { type: 'image', source: { type: 'base64', media_type: input.mime, data: input.base64 } };

    const raw = await this.callRaw(
      AiService.DOCUMENT_SYSTEM,
      [
        {
          role: 'user',
          content: [
            block,
            {
              type: 'text',
              text: input.title
                ? `O documento chama-se "${String(input.title).slice(0, 140)}". Extrai o que conseguires.`
                : 'Extrai o que conseguires.',
            },
          ],
        },
      ],
      800,
    );
    return parseDocumentReading(raw);
  }

  /** Single-user-turn Messages call. */
  private callMessages(system: string, user: string, maxTokens: number): Promise<string> {
    return this.callRaw(system, [{ role: 'user', content: user }], maxTokens);
  }

  /** Anthropic Messages call from a full turn list, with timeout + safe logging. */
  private async callRaw(
    system: string,
    messages: { role: 'user' | 'assistant'; content: string | ContentBlock[] }[],
    maxTokens: number,
  ): Promise<string> {
    if (!this.enabled) {
      throw new ServiceUnavailableException('AI not configured (set ANTHROPIC_API_KEY)');
    }
    const fetchFn = (globalThis as { fetch?: (...args: unknown[]) => Promise<unknown> }).fetch;
    if (!fetchFn) throw new ServiceUnavailableException('fetch unavailable in this runtime');

    // Bound the upstream call so a hung connection can't tie up the request.
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30_000);
    let res: { ok: boolean; status: number; text(): Promise<string>; json(): Promise<unknown> };
    try {
      res = (await fetchFn('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'content-type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: maxTokens,
          system,
          messages,
        }),
      })) as { ok: boolean; status: number; text(): Promise<string>; json(): Promise<unknown> };
    } catch (err) {
      this.logger.warn(`Anthropic request error: ${(err as Error).name}`);
      throw new ServiceUnavailableException('AI request failed (network/timeout)');
    } finally {
      clearTimeout(timer);
    }

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      let detail = `HTTP ${res.status}`;
      try {
        const j = JSON.parse(body) as { error?: { message?: string } };
        if (j.error?.message) detail = `${res.status}: ${j.error.message}`;
      } catch {
        /* non-JSON body */
      }
      // Log status + Anthropic's own error message only — never the raw body.
      this.logger.warn(`Anthropic ${detail}`);
      throw new ServiceUnavailableException(`AI request failed (${detail})`);
    }

    const data = (await res.json()) as { content?: { type: string; text?: string }[] };
    return (data.content ?? [])
      .filter((b) => b.type === 'text' && typeof b.text === 'string')
      .map((b) => b.text as string)
      .join('')
      .trim();
  }
}

class AssistDto {
  @ApiProperty({ description: "Parent's free-text message" })
  @IsString()
  @MaxLength(1000)
  message!: string;

  @ApiProperty({ description: 'Deterministic safe guidance to rephrase' })
  @IsString()
  @MaxLength(2000)
  baseGuidance!: string;

  @ApiProperty({ required: false, description: 'Suggested specialty label' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  specialty?: string;
}

class AssistChatDto {
  @ApiProperty({ description: 'Running conversation ({ role, text })' })
  @IsArray()
  messages!: { role: string; text: string }[];

  @ApiProperty({ required: false, description: 'Suggested specialty label' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  specialty?: string;

  @ApiProperty({ required: false, description: 'Child context (name, age)' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  child?: string;
}

@ApiTags('ai')
@ApiBearerAuth()
@Controller('ai')
@Throttle(AI_RATE_LIMIT)
class AiController {
  constructor(private readonly ai: AiService) {}

  /**
   * Warm the parent-Home assistant's guidance. Parent-only. In demo mode (no
   * key) it returns the deterministic base text unchanged — never a failure.
   */
  @Post('assist')
  @Roles(Role.PARENT)
  async assist(@Body() dto: AssistDto): Promise<{ text: string }> {
    const text = await this.ai.assistGuidance(dto);
    return { text };
  }

  /**
   * Multi-turn Home assistant. Parent-only. Returns { text: '' } in demo mode
   * (no key) so the client falls back to its deterministic reply.
   */
  @Post('assist-chat')
  @Roles(Role.PARENT)
  async assistChat(@Body() dto: AssistChatDto): Promise<{ text: string }> {
    const text = await this.ai.assistChat(dto);
    return { text };
  }

  /**
   * Summarize the conversation as a handover for the pediatrician. Parent-only.
   * Returns { text: '' } in demo mode so the client uses the raw messages.
   */
  @Post('assist-summary')
  @Roles(Role.PARENT)
  async assistSummary(@Body() dto: AssistChatDto): Promise<{ text: string }> {
    const text = await this.ai.summarizeForHandover(dto.messages, dto.child);
    return { text };
  }
}

@Module({
  controllers: [AiController],
  providers: [AiService],
  exports: [AiService],
})
export class AiModule {}
