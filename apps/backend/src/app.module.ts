import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from 'throttler';
import configuration from './common/config/configuration';
import { PrismaModule } from './common/prisma/prisma.module';
import { CryptoModule } from './common/crypto/crypto.module';
import { SecurityModule } from './common/security/security.module';
import { InvoicingModule } from './modules/invoicing/invoicing.module';
import { JwtAuthGuard } from './common/security/jwt-auth.guard';
import { RolesGuard } from './common/security/roles.guard';
import { AuditInterceptor } from './common/audit/audit.interceptor';
import { HealthModule } from './modules/health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { ChildrenModule } from './modules/children/children.module';
import { UsersModule } from './modules/users/users.module';
import { PediatriciansModule } from './modules/pediatricians/pediatricians.module';
import { ConsultationsModule } from './modules/consultations/consultations.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { FilesModule } from './modules/files/files.module';
import { SchedulingModule } from './modules/scheduling/scheduling.module';
import { VideoModule } from './modules/video/video.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { AdminModule } from './modules/admin/admin.module';
import { ClinicsModule } from './modules/clinics/clinics.module';
import { HealthRecordsModule } from './modules/health-records/health-records.module';
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module';
import { ObservabilityModule } from './modules/observability/observability.module';
import { PrivacyModule } from './modules/privacy/privacy.module';
import { ContentModule } from './modules/content/content.module';
import { ReferralsModule } from './modules/referrals/referrals.module';
import { CatalogModule } from './modules/catalog/catalog.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),
    PrismaModule,
    CryptoModule,
    SecurityModule,
    HealthModule,
    AuthModule,
    ChildrenModule,
    UsersModule,
    PediatriciansModule,
    ConsultationsModule,
    PaymentsModule,
    InvoicingModule,
    FilesModule,
    SchedulingModule,
    VideoModule,
    NotificationsModule,
    AdminModule,
    ClinicsModule,
    HealthRecordsModule,
    SubscriptionsModule,
    ObservabilityModule,
    PrivacyModule,
    ContentModule,
    ReferralsModule,
    CatalogModule,
    AnalyticsModule,
  ],
  providers: [
    // Zero Trust: every route authenticated unless @Public; RBAC where @Roles.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
  ],
})
export class AppModule {}
