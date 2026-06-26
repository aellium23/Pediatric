import { Injectable, Logger, Module, ServiceUnavailableException } from '@nestjs/common';

/**
 * Clinical-documentation assistant (Anthropic Claude). Cleans up a dictated /
 * transcribed note and structures it as SOAP, correcting transcription errors
 * from context — WITHOUT inventing facts. Called server-side only; the API key
 * never reaches the browser. Degrades to a clear 503 when ANTHROPIC_API_KEY is
 * absent (demo mode). Uses raw HTTPS (global fetch) to avoid a heavy SDK
 * dependency for a single Messages API call.
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

  /** Whether a real Anthropic key is configured. */
  get enabled(): boolean {
    return this.apiKey.length > 0;
  }

  /** Structure/clean a raw clinical note into SOAP. */
  async structureClinicalNote(rawText: string): Promise<string> {
    if (!this.enabled) {
      throw new ServiceUnavailableException('AI not configured (set ANTHROPIC_API_KEY)');
    }
    const text = (rawText ?? '').trim();
    if (!text) return '';

    const fetchFn = (globalThis as { fetch?: (...args: unknown[]) => Promise<unknown> }).fetch;
    if (!fetchFn) throw new ServiceUnavailableException('fetch unavailable in this runtime');

    const res = (await fetchFn('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: 1024,
        system: AiService.SYSTEM,
        messages: [{ role: 'user', content: text }],
      }),
    })) as { ok: boolean; status: number; text(): Promise<string>; json(): Promise<unknown> };

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      this.logger.warn(`Anthropic ${res.status}: ${body.slice(0, 300)}`);
      let detail = `HTTP ${res.status}`;
      try {
        const j = JSON.parse(body) as { error?: { message?: string } };
        if (j.error?.message) detail = `${res.status}: ${j.error.message}`;
      } catch {
        /* non-JSON body */
      }
      throw new ServiceUnavailableException(`AI request failed (${detail})`);
    }

    const data = (await res.json()) as { content?: { type: string; text?: string }[] };
    const out = (data.content ?? [])
      .filter((b) => b.type === 'text' && typeof b.text === 'string')
      .map((b) => b.text as string)
      .join('')
      .trim();
    return out || text;
  }
}

@Module({
  providers: [AiService],
  exports: [AiService],
})
export class AiModule {}
