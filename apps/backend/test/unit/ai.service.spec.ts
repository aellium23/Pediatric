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
});
