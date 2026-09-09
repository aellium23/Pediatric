import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { rawBody: true });
  // Raise the body limit above the default 100 kB: a chat message can carry up
  // to 3 client-downscaled clinical photos (≤600 kB each as data URLs), so the
  // whole request can reach ~2 MB. useBodyParser keeps the Stripe webhook's
  // rawBody capture working.
  app.useBodyParser('json', { limit: '6mb' });
  app.useBodyParser('urlencoded', { limit: '6mb', extended: true });
  const config = app.get(ConfigService);

  // ── Security middleware (Secure by Default) ──
  app.use(helmet());
  // Explicit allow-list (Secure by Default). In the demo environment
  // (ENABLE_DEV_LOGIN=true) we ALWAYS reflect the request origin so the hosted
  // web client can call the API with bearer tokens (no cookies) regardless of
  // any CORS_ORIGINS value — this avoids a misconfigured list silently blocking
  // the browser. In real production, a strict allow-list is enforced.
  const corsOrigins = (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  const demoEnv = process.env.ENABLE_DEV_LOGIN === 'true';
  app.enableCors({
    origin: demoEnv ? true : corsOrigins.length > 0 ? corsOrigins : false,
    credentials: !demoEnv && corsOrigins.length > 0,
  });
  app.setGlobalPrefix('api', { exclude: ['health', 'health/ready', 'metrics'] });

  // Production safety: dev-login must never be on in a real production deploy.
  if (process.env.NODE_ENV === 'production' && process.env.ENABLE_DEV_LOGIN === 'true') {
    // eslint-disable-next-line no-console
    console.warn(
      '[SECURITY] ENABLE_DEV_LOGIN is true in production — this is a DEMO setting. ' +
        'Disable it before serving real users.',
    );
  }

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      // class-validator's default messages are English; the web app surfaces
      // 400 bodies verbatim, so return a Portuguese summary of the bad fields
      // instead of "email must be an email"-style strings.
      exceptionFactory: (errors) => {
        const fields = [...new Set(errors.map((e) => e.property))].join(', ');
        return new BadRequestException(
          fields ? `Dados inválidos nos campos: ${fields}.` : 'Dados inválidos.',
        );
      },
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());

  // ── OpenAPI ──
  // Published everywhere except a real production deploy: an anonymous, fully
  // browsable map of every route and DTO is free reconnaissance (OWASP ASVS
  // V14.3 — attack-surface reduction). The demo keeps it, because there the
  // API surface is the point; `SWAGGER_PUBLIC=true` forces it back on.
  const realProduction = process.env.NODE_ENV === 'production' && !demoEnv;
  if (!realProduction || process.env.SWAGGER_PUBLIC === 'true') {
    const swagger = new DocumentBuilder()
      .setTitle('HOC API')
      .setDescription('Telepediatrics platform API (MVP)')
      .setVersion('0.1.0')
      .addBearerAuth()
      .build();
    SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, swagger));
  }

  const port = config.get<number>('port') ?? 3000;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(
    `HOC API listening on :${port}` +
      (realProduction && process.env.SWAGGER_PUBLIC !== 'true' ? '' : ' (OpenAPI at /docs)'),
  );
}

void bootstrap();
