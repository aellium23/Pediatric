import {
  CallHandler,
  Controller,
  ExecutionContext,
  Get,
  Injectable,
  Logger,
  Module,
  NestInterceptor,
} from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { OnEvent } from '@nestjs/event-emitter';
import { ApiTags } from '@nestjs/swagger';
import { randomUUID } from 'crypto';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Public } from '../../common/security/decorators';

/** In-memory counters exposed in Prometheus text format at /metrics. */
@Injectable()
export class MetricsService {
  private readonly counters: Record<string, number> = {
    http_requests_total: 0,
    http_errors_total: 0,
    consultations_closed_total: 0,
    consultations_expired_total: 0,
    payments_captured_total: 0,
    messages_total: 0,
  };

  inc(name: keyof MetricsService['counters'] | string, by = 1): void {
    this.counters[name] = (this.counters[name] ?? 0) + by;
  }

  @OnEvent('consultation.closed')
  onClosed(): void {
    this.inc('consultations_closed_total');
  }
  @OnEvent('consultation.expired')
  onExpired(): void {
    this.inc('consultations_expired_total');
  }
  @OnEvent('payment.captured')
  onCaptured(): void {
    this.inc('payments_captured_total');
  }
  @OnEvent('message.created')
  onMessage(): void {
    this.inc('messages_total');
  }

  render(): string {
    return Object.entries(this.counters)
      .map(([k, v]) => `# TYPE pedia_${k} counter\npedia_${k} ${v}`)
      .join('\n');
  }
}

/** Structured per-request log (JSON) with a request id + duration, and HTTP counters. */
@Injectable()
class ObservabilityInterceptor implements NestInterceptor {
  private readonly logger = new Logger('http');
  constructor(private readonly metrics: MetricsService) {}

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = ctx.switchToHttp();
    const req = http.getRequest();
    const reqId = req.headers['x-request-id'] ?? randomUUID();
    const start = Date.now();
    this.metrics.inc('http_requests_total');

    const done = (status: number, error?: unknown) => {
      if (status >= 500 || error) this.metrics.inc('http_errors_total');
      const ms = Date.now() - start;
      this.logger.log(
        JSON.stringify({
          reqId,
          method: req.method,
          url: req.url,
          status,
          ms,
          role: req.user?.role,
        }),
      );
    };

    return next.handle().pipe(
      tap({
        next: () => done(http.getResponse().statusCode ?? 200),
        error: (err) => done(err?.status ?? 500, err),
      }),
    );
  }
}

@ApiTags('observability')
@Controller()
class MetricsController {
  constructor(private readonly service: MetricsService) {}

  /** Prometheus scrape endpoint. */
  @Public()
  @Get('metrics')
  metrics(): string {
    return this.service.render();
  }
}

@Module({
  controllers: [MetricsController],
  providers: [
    MetricsService,
    { provide: APP_INTERCEPTOR, useClass: ObservabilityInterceptor },
  ],
  exports: [MetricsService],
})
export class ObservabilityModule {}
