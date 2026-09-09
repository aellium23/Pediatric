import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Writes an append-only audit entry for mutating requests (POST/PUT/PATCH/DELETE).
 * Clinical reads are audited explicitly in their services for finer context.
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest();
    const mutating = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method);

    return next.handle().pipe(
      tap(() => {
        if (!mutating) return;
        // Fire-and-forget; never block the response on audit write.
        void this.prisma.auditLog
          .create({
            data: {
              actorUserId: req.user?.userId ?? null,
              action: `${req.method} ${req.route?.path ?? req.url}`,
              entityType: (req.baseUrl ?? req.path ?? '').split('/')[2] ?? 'unknown',
              ip: req.ip,
              userAgent: req.headers['user-agent'],
            },
          })
          .catch(() => undefined);
      }),
    );
  }
}
