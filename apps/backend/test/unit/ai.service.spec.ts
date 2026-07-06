import { ServiceUnavailableException } from '@nestjs/common';
import { AiService } from '../../src/modules/ai/ai.module';

// apiKey/model are read in field initializers, so set env BEFORE constructing.
const OLD = process.env;

function withKey(key: string | undefined): AiService {
  process.env = { ...OLD };
  if (key === undefined) delete process.env.ANTHROPIC_API_KEY;
  else process.env.ANTHROPIC_API_KEY = key;
  return new AiService();
}

afterEach(() => {
  process.env = OLD;
  (globalThis as any).fetch = undefined;
});

describe('AiService', () => {
  describe('gating', () => {
    it('is disabled and 503s without an API key', async () => {
      const ai = withKey(undefined);
      expect(ai.enabled).toBe(false);
      await expect(ai.structureClinicalNote('nota')).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      );
    });

    it('is enabled with a key and short-circuits empty input without calling out', async () => {
      const ai = withKey('sk-ant-test');
      const fetchMock = jest.fn();
      (globalThis as any).fetch = fetchMock;
      expect(ai.enabled).toBe(true);
      expect(await ai.structureClinicalNote('   ')).toBe('');
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  describe('structureClinicalNote (enabled)', () => {
    it('calls Anthropic with the model, SOAP system prompt, and key header, and returns the text', async () => {
      const ai = withKey('sk-ant-test');
      const fetchMock = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ content: [{ type: 'text', text: 'S: ...\nO: ...' }] }),
        text: async () => '',
      });
      (globalThis as any).fetch = fetchMock;

      const out = await ai.structureClinicalNote('febre ha 2 dias');
      expect(out).toBe('S: ...\nO: ...');

      const [url, opts] = fetchMock.mock.calls[0];
      expect(url).toBe('https://api.anthropic.com/v1/messages');
      expect(opts.headers['x-api-key']).toBe('sk-ant-test');
      expect(opts.headers['anthropic-version']).toBe('2023-06-01');
      const body = JSON.parse(opts.body);
      expect(body.system).toContain('SOAP');
      expect(body.messages).toEqual([{ role: 'user', content: 'febre ha 2 dias' }]);
    });

    it('surfaces the upstream status + Anthropic message on an error response', async () => {
      const ai = withKey('sk-ant-test');
      (globalThis as any).fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 400,
        text: async () => JSON.stringify({ error: { message: 'credit balance too low' } }),
        json: async () => ({}),
      });
      // This is exactly the 503 the founder saw — it must carry the real reason.
      await expect(ai.structureClinicalNote('nota')).rejects.toMatchObject({
        message: expect.stringContaining('credit balance too low'),
      });
    });

    it('maps a network/timeout failure to a clear 503', async () => {
      const ai = withKey('sk-ant-test');
      (globalThis as any).fetch = jest.fn().mockRejectedValue(
        Object.assign(new Error('aborted'), { name: 'AbortError' }),
      );
      await expect(ai.structureClinicalNote('nota')).rejects.toMatchObject({
        message: expect.stringContaining('network/timeout'),
      });
    });

    it('falls back to the original text when the model returns no text block', async () => {
      const ai = withKey('sk-ant-test');
      (globalThis as any).fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ content: [] }),
        text: async () => '',
      });
      expect(await ai.structureClinicalNote('nota original')).toBe('nota original');
    });
  });

  describe('assistGuidance (parent Home)', () => {
    it('rephrases the base guidance with the triage system prompt when enabled', async () => {
      const ai = withKey('sk-ant-test');
      const fetchMock = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ content: [{ type: 'text', text: 'Percebo a tua preocupação. Mantém-no hidratado e fala com um pediatra hoje.' }] }),
        text: async () => '',
      });
      (globalThis as any).fetch = fetchMock;

      const out = await ai.assistGuidance({
        message: 'febre alta há 3 dias',
        baseGuidance: 'Mantém a hidratação e fala com um pediatra hoje.',
        specialty: 'Pediatria geral',
      });
      expect(out).toContain('pediatra');

      const body = JSON.parse(fetchMock.mock.calls[0][1].body);
      // Safety rules must be present in the system prompt.
      expect(body.system).toContain('não diagnostiques');
      expect(body.system).toMatch(/112|SNS 24/);
      // The parent's message and base guidance are both handed to the model.
      expect(body.messages[0].content).toContain('febre alta há 3 dias');
      expect(body.messages[0].content).toContain('Mantém a hidratação');
    });

    it('returns the base guidance untouched when disabled (demo mode) — never 503', async () => {
      const ai = withKey(undefined);
      const out = await ai.assistGuidance({
        message: 'tosse',
        baseGuidance: 'Base segura.',
      });
      expect(out).toBe('Base segura.');
    });

    it('short-circuits without calling out when message or base is empty', async () => {
      const ai = withKey('sk-ant-test');
      const fetchMock = jest.fn();
      (globalThis as any).fetch = fetchMock;
      // Empty message → nothing to rephrase → base returned unchanged.
      expect(await ai.assistGuidance({ message: '', baseGuidance: 'x' })).toBe('x');
      // Empty base → nothing to return.
      expect(await ai.assistGuidance({ message: 'x', baseGuidance: '  ' })).toBe('');
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('keeps the base guidance if the model yields no usable text', async () => {
      const ai = withKey('sk-ant-test');
      (globalThis as any).fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ content: [] }),
        text: async () => '',
      });
      const out = await ai.assistGuidance({ message: 'tosse', baseGuidance: 'Orientação base.' });
      expect(out).toBe('Orientação base.');
    });
  });

  describe('assistChat (multi-turn Home)', () => {
    it('sends the full conversation with the chat system prompt when enabled', async () => {
      const ai = withKey('sk-ant-test');
      const fetchMock = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ content: [{ type: 'text', text: 'Como é que ele caiu?' }] }),
        text: async () => '',
      });
      (globalThis as any).fetch = fetchMock;

      const out = await ai.assistChat({
        messages: [
          { role: 'user', text: 'o meu filho caiu' },
          { role: 'assistant', text: 'Conta-me mais.' },
          { role: 'user', text: 'bateu o braço' },
        ],
        specialty: 'Pediatria geral',
      });
      expect(out).toBe('Como é que ele caiu?');

      const body = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(body.system).toContain('conversar');
      expect(body.system).toContain('Pediatria geral'); // specialty context appended
      expect(body.messages).toEqual([
        { role: 'user', content: 'o meu filho caiu' },
        { role: 'assistant', content: 'Conta-me mais.' },
        { role: 'user', content: 'bateu o braço' },
      ]);
    });

    it('returns empty in demo mode (no key) so the client falls back', async () => {
      const ai = withKey(undefined);
      const fetchMock = jest.fn();
      (globalThis as any).fetch = fetchMock;
      const out = await ai.assistChat({ messages: [{ role: 'user', text: 'tosse' }] });
      expect(out).toBe('');
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('does not call out when the last turn is the assistant, not the parent', async () => {
      const ai = withKey('sk-ant-test');
      const fetchMock = jest.fn();
      (globalThis as any).fetch = fetchMock;
      const out = await ai.assistChat({
        messages: [
          { role: 'user', text: 'olá' },
          { role: 'assistant', text: 'Em que posso ajudar?' },
        ],
      });
      expect(out).toBe('');
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  describe('summarizeForHandover', () => {
    it('summarizes the transcript with the handover prompt when enabled', async () => {
      const ai = withKey('sk-ant-test');
      const fetchMock = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ content: [{ type: 'text', text: 'O meu filho caiu há 1 hora, sem bater com a cabeça, está bem e ativo.' }] }),
        text: async () => '',
      });
      (globalThis as any).fetch = fetchMock;

      const out = await ai.summarizeForHandover([
        { role: 'user', text: 'o meu filho caiu' },
        { role: 'assistant', text: 'Bateu com a cabeça?' },
        { role: 'user', text: 'não, caiu de pé' },
      ]);
      expect(out).toContain('caiu');

      const body = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(body.system).toContain('primeira pessoa');
      // The whole transcript is folded into a single user turn.
      expect(body.messages).toHaveLength(1);
      expect(body.messages[0].content).toContain('Pai/Mãe: o meu filho caiu');
      expect(body.messages[0].content).toContain('Assistente: Bateu com a cabeça?');
    });

    it('returns empty in demo mode so the client uses the raw messages', async () => {
      const ai = withKey(undefined);
      const fetchMock = jest.fn();
      (globalThis as any).fetch = fetchMock;
      expect(await ai.summarizeForHandover([{ role: 'user', text: 'febre' }])).toBe('');
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });
});
