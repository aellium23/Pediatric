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
import { Role } from '@prisma/client';
import { Roles } from '../../common/security/decorators';

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
    'És o assistente de triagem de uma app de telepediatria (HOC). Recebes a ' +
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
    'És o assistente de triagem de uma app de telepediatria (HOC), a conversar ' +
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
    if (input.specialty) system += ` A especialidade sugerida até agora é: ${input.specialty}.`;
    return this.callRaw(system, msgs, 400);
  }

  /** Single-user-turn Messages call. */
  private callMessages(system: string, user: string, maxTokens: number): Promise<string> {
    return this.callRaw(system, [{ role: 'user', content: user }], maxTokens);
  }

  /** Anthropic Messages call from a full turn list, with timeout + safe logging. */
  private async callRaw(
    system: string,
    messages: { role: 'user' | 'assistant'; content: string }[],
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
}

@ApiTags('ai')
@ApiBearerAuth()
@Controller('ai')
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
}

@Module({
  controllers: [AiController],
  providers: [AiService],
  exports: [AiService],
})
export class AiModule {}
