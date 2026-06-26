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
});
