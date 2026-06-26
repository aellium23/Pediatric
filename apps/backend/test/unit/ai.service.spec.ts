import { ServiceUnavailableException } from '@nestjs/common';
import { AiService } from '../../src/modules/ai/ai.module';

describe('AiService', () => {
  const original = process.env.ANTHROPIC_API_KEY;
  afterEach(() => {
    if (original === undefined) delete process.env.ANTHROPIC_API_KEY;
    else process.env.ANTHROPIC_API_KEY = original;
  });

  it('is disabled and throws 503 without an API key', async () => {
    delete process.env.ANTHROPIC_API_KEY;
    const svc = new AiService();
    expect(svc.enabled).toBe(false);
    await expect(svc.structureClinicalNote('nota')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('reports enabled when a key is present', () => {
    process.env.ANTHROPIC_API_KEY = 'sk-ant-test';
    expect(new AiService().enabled).toBe(true);
  });
});
