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
  // Malformed id / value for the column type (e.g. a non-UUID id in the URL):
  // a client mistake → 400, not a 500 with a raw Prisma string.
  P2023: { status: HttpStatus.BAD_REQUEST, error: 'Invalid identifier' },
  P2014: { status: HttpStatus.BAD_REQUEST, error: 'Invalid relation' },
};

function prismaCode(exception: unknown): string | undefined {
  const code = (exception as { code?: unknown })?.code;
  return typeof code === 'string' && /^P\d{4}$/.test(code) ? code : undefined;
}

/**
 * body-parser (Express) rejects a request BEFORE it reaches a handler, and its
 * errors are plain Errors — not HttpExceptions — so without this they'd surface
 * as a bogus 500. The common one is an oversized upload (chat photos): the
 * parent must read "too big", not "server error".
 */
const BODY_PARSER_STATUS: Record<string, { status: number; error: string }> = {
  'entity.too.large': {
    status: HttpStatus.PAYLOAD_TOO_LARGE,
    error: 'Pedido demasiado grande. Envia menos fotos ou de menor tamanho.',
  },
  'entity.parse.failed': {
    status: HttpStatus.BAD_REQUEST,
    error: 'Pedido inválido (JSON malformado).',
  },
};

/**
 * Nest re-wraps body-parser's JSON failure as its own BadRequestException, and
 * V8's parse error quotes the offending bytes — so the reply would echo a slice
 * of the request body back to the caller. Harmless with your own typo, less so
 * when the body carried clinical text, and it is gratuitous detail either way
 * (OWASP ASVS V7.4.1: say what happened, not what the server saw). Matched on
 * the message because the `type` marker is lost in the re-wrapping.
 */
const JSON_PARSE_SIGNATURE =
  /is not valid JSON|Unexpected token|Unexpected end of JSON input|JSON at position/i;

function isJsonParseFailure(status: number, message: unknown): boolean {
  if (status !== HttpStatus.BAD_REQUEST) return false;
  const text = typeof message === 'string' ? message : (message as { message?: unknown })?.message;
  return typeof text === 'string' && JSON_PARSE_SIGNATURE.test(text);
}

function bodyParserError(exception: unknown): { status: number; error: string } | undefined {
  const e = exception as { type?: unknown; status?: unknown; statusCode?: unknown };
  const raw = typeof e?.status === 'number' ? e.status : e?.statusCode;
  // Only trust these when the error also carries a 4xx status, so we never
  // downgrade a genuine server fault into a client error.
  if (typeof raw !== 'number' || raw < 400 || raw >= 500) return undefined;
  return typeof e.type === 'string' ? BODY_PARSER_STATUS[e.type] : undefined;
}

/** Uniform error envelope; never leaks internals or PII. */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Exception');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse();
    const req = ctx.getRequest();

    const mapped = !(exception instanceof HttpException)
      ? PRISMA_STATUS[prismaCode(exception) ?? ''] ?? bodyParserError(exception)
      : undefined;

    const status = exception instanceof HttpException
      ? exception.getStatus()
      : mapped?.status ?? HttpStatus.INTERNAL_SERVER_ERROR;

    const raw = exception instanceof HttpException
      ? exception.getResponse()
      : mapped?.error ?? 'Internal server error';

    const message = isJsonParseFailure(status, raw)
      ? BODY_PARSER_STATUS['entity.parse.failed'].error
      : raw;

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
