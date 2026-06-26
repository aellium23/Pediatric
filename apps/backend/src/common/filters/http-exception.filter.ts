import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';

// Map the Prisma error codes we surface to clients to sane HTTP statuses, so a
// missing record reads as 404 (not 500) and a unique clash as 409. Matched by
// code string to stay decoupled from the generated client's class identity.
const PRISMA_STATUS: Record<string, { status: number; error: string }> = {
  P2025: { status: HttpStatus.NOT_FOUND, error: 'Not found' },
  P2002: { status: HttpStatus.CONFLICT, error: 'Already exists' },
  P2003: { status: HttpStatus.BAD_REQUEST, error: 'Invalid reference' },
};

function prismaCode(exception: unknown): string | undefined {
  const code = (exception as { code?: unknown })?.code;
  return typeof code === 'string' && /^P\d{4}$/.test(code) ? code : undefined;
}

/** Uniform error envelope; never leaks internals or PII. */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Exception');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse();
    const req = ctx.getRequest();

    const prisma = !(exception instanceof HttpException)
      ? PRISMA_STATUS[prismaCode(exception) ?? '']
      : undefined;

    const status = exception instanceof HttpException
      ? exception.getStatus()
      : prisma?.status ?? HttpStatus.INTERNAL_SERVER_ERROR;

    const message = exception instanceof HttpException
      ? exception.getResponse()
      : prisma?.error ?? 'Internal server error';

    if (status >= 500) {
      this.logger.error(`${req.method} ${req.url}`, exception as Error);
    }

    res.status(status).json({
      statusCode: status,
      error: typeof message === 'string' ? message : (message as any).message ?? message,
      timestamp: new Date().toISOString(),
      path: req.url,
    });
  }
}
