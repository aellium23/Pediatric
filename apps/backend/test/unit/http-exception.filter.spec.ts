import { BadRequestException, ForbiddenException, HttpStatus } from '@nestjs/common';
import { AllExceptionsFilter } from '../../src/common/filters/http-exception.filter';

function ctxFor(exception: unknown) {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const host: any = {
    switchToHttp: () => ({
      getResponse: () => ({ status }),
      getRequest: () => ({ method: 'POST', url: '/api/x' }),
    }),
  };
  const filter = new AllExceptionsFilter();
  filter.catch(exception, host);
  return { status, json, body: () => json.mock.calls[0]?.[0] };
}

describe('AllExceptionsFilter', () => {
  it('passes HttpException status through', () => {
    const { status, body } = ctxFor(new ForbiddenException('nope'));
    expect(status).toHaveBeenCalledWith(HttpStatus.FORBIDDEN);
    expect(body().statusCode).toBe(HttpStatus.FORBIDDEN);
  });

  it('maps Prisma P2025 (record not found) to 404', () => {
    const { status, body } = ctxFor({ code: 'P2025', message: 'Record to update not found.' });
    expect(status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    expect(body().error).toBe('Not found');
    // Must not leak the raw Prisma message.
    expect(body().error).not.toContain('Record to update');
  });

  it('maps Prisma P2002 (unique clash) to 409', () => {
    const { status } = ctxFor({ code: 'P2002', message: 'Unique constraint failed' });
    expect(status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
  });

  it('falls back to 500 for unknown errors and hides internals', () => {
    const { status, body } = ctxFor(new Error('kaboom with secrets'));
    expect(status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(body().error).toBe('Internal server error');
  });

  it('does not treat an HttpException with a stray code as Prisma', () => {
    const { status } = ctxFor(new BadRequestException('bad'));
    expect(status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
  });

  // An oversized chat upload is rejected by body-parser before any handler
  // runs; the parent must get an actionable 413, not a generic 500.
  it('maps body-parser entity.too.large to 413 with an actionable message', () => {
    const err = Object.assign(new Error('request entity too large'), {
      type: 'entity.too.large',
      status: 413,
    });
    const { status, body } = ctxFor(err);
    expect(status).toHaveBeenCalledWith(HttpStatus.PAYLOAD_TOO_LARGE);
    expect(body().error).toMatch(/demasiado grande/i);
  });

  it('maps malformed JSON to 400', () => {
    const err = Object.assign(new Error('Unexpected token'), {
      type: 'entity.parse.failed',
      status: 400,
    });
    const { status } = ctxFor(err);
    expect(status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
  });

  // Nest re-wraps the parser failure as its own BadRequestException, and V8's
  // message quotes the bytes it choked on — so without scrubbing, the reply
  // echoes a slice of the request body (possibly clinical text) back out.
  it('does not echo the request body when Nest re-wraps a JSON parse failure', () => {
    const nestWrapped = new BadRequestException(
      'Unexpected token \'b\', "{"queixa": febre alta da Rita" is not valid JSON',
    );
    const { status, body } = ctxFor(nestWrapped);
    expect(status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(body().error).toBe('Pedido inválido (JSON malformado).');
    expect(JSON.stringify(body())).not.toMatch(/Rita|febre/);
  });

  it('leaves a genuine validation 400 untouched', () => {
    const { body } = ctxFor(new BadRequestException('Dados inválidos nos campos: email.'));
    expect(body().error).toBe('Dados inválidos nos campos: email.');
  });

  it('never downgrades a 5xx-flavoured error via the body-parser path', () => {
    const err = Object.assign(new Error('boom'), { type: 'entity.too.large', status: 500 });
    const { status, body } = ctxFor(err);
    expect(status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(body().error).toBe('Internal server error');
  });
});
