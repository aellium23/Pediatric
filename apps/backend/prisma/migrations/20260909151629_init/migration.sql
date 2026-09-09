-- CreateEnum
CREATE TYPE "Role" AS ENUM ('PARENT', 'PEDIATRICIAN', 'CLINIC_STAFF', 'CLINIC_ADMIN', 'PLATFORM_ADMIN', 'SUPPORT', 'FINANCE', 'COMPLIANCE');

-- CreateEnum
CREATE TYPE "AuthProvider" AS ENUM ('PASSWORDLESS', 'APPLE', 'GOOGLE', 'PASSKEY');

-- CreateEnum
CREATE TYPE "ConsentSubject" AS ENUM ('HEALTH_DATA', 'TELECONSULT', 'TERMS', 'PRIVACY', 'MARKETING');

-- CreateEnum
CREATE TYPE "PediatricianStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "ServiceType" AS ENUM ('MESSAGE', 'ASYNC', 'VIDEO', 'SECOND_OPINION', 'PRESCRIPTION_RENEWAL', 'FOLLOW_UP');

-- CreateEnum
CREATE TYPE "ConsultationStatus" AS ENUM ('OPEN', 'TRIAGE', 'ANSWERED', 'CLOSED', 'ARCHIVED', 'EXPIRED', 'REFUNDED', 'DISPUTED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('CREATED', 'AUTHORIZED', 'CAPTURED', 'REFUNDED', 'FAILED', 'CHARGED_BACK');

-- CreateEnum
CREATE TYPE "AvailabilityKind" AS ENUM ('VIDEO', 'MESSAGES');

-- CreateEnum
CREATE TYPE "DocumentKind" AS ENUM ('REPORT', 'LAB', 'IMAGING', 'PRESCRIPTION', 'VACCINE', 'OTHER');

-- CreateEnum
CREATE TYPE "SubscriptionPlan" AS ENUM ('FAMILY', 'PED_PRO');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ArticleStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'PUBLISHED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ReferralStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'COMPLETED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'PARENT',
    "name" TEXT,
    "email" TEXT,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "phone" TEXT,
    "phoneVerified" BOOLEAN NOT NULL DEFAULT false,
    "authProvider" "AuthProvider" NOT NULL DEFAULT 'PASSWORDLESS',
    "appleSub" TEXT,
    "googleSub" TEXT,
    "mfaEnabled" BOOLEAN NOT NULL DEFAULT false,
    "photoUrl" TEXT,
    "preferredPayment" TEXT,
    "nif" TEXT,
    "locale" TEXT NOT NULL DEFAULT 'pt-PT',
    "countryCode" TEXT NOT NULL DEFAULT 'PT',
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebAuthnCredential" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "credentialId" TEXT NOT NULL,
    "publicKey" BYTEA NOT NULL,
    "counter" BIGINT NOT NULL DEFAULT 0,
    "transports" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "deviceLabel" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebAuthnCredential_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "revoked" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Consent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "childId" TEXT,
    "subject" "ConsentSubject" NOT NULL,
    "version" TEXT NOT NULL,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "evidence" JSONB,

    CONSTRAINT "Consent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Family" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "primaryUserId" TEXT NOT NULL,
    "countryCode" TEXT NOT NULL DEFAULT 'PT',
    "region" TEXT,
    "postalCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Family_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FamilyMember" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "relationship" TEXT NOT NULL DEFAULT 'guardian',
    "permissions" TEXT[] DEFAULT ARRAY['read', 'write']::TEXT[],

    CONSTRAINT "FamilyMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Child" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "birthDate" TIMESTAMP(3) NOT NULL,
    "sex" TEXT,
    "usualDoctor" TEXT,
    "photoUrl" TEXT,
    "healthProfile" TEXT,
    "snsNumber" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Child_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pediatrician" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "licenseNumber" TEXT NOT NULL,
    "licenseVerifiedAt" TIMESTAMP(3),
    "displayName" TEXT,
    "bio" TEXT,
    "experienceYears" INTEGER,
    "languages" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "specialties" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "PediatricianStatus" NOT NULL DEFAULT 'PENDING',
    "ratingAvg" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "region" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'Europe/Lisbon',
    "stripeAccountId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Pediatrician_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationDocument" (
    "id" TEXT NOT NULL,
    "pediatricianId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "storageKey" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "VerificationDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PediatricianService" (
    "id" TEXT NOT NULL,
    "pediatricianId" TEXT NOT NULL,
    "type" "ServiceType" NOT NULL,
    "priceCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "slaHours" INTEGER NOT NULL DEFAULT 24,
    "targetHours" INTEGER NOT NULL DEFAULT 4,
    "scopeText" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "PediatricianService_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Consultation" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "pediatricianId" TEXT NOT NULL,
    "type" "ServiceType" NOT NULL,
    "status" "ConsultationStatus" NOT NULL DEFAULT 'OPEN',
    "scopeSnapshot" TEXT,
    "priceCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "slaDueAt" TIMESTAMP(3),
    "expectedReplyAt" TIMESTAMP(3),
    "scheduledAt" TIMESTAMP(3),
    "triage" JSONB,
    "episodeId" TEXT,
    "summary" TEXT,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "answeredAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),

    CONSTRAINT "Consultation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "consultationId" TEXT NOT NULL,
    "senderUserId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "attachments" JSONB,
    "aiGenerated" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FileAsset" (
    "id" TEXT NOT NULL,
    "ownerUserId" TEXT NOT NULL,
    "childId" TEXT,
    "consultationId" TEXT,
    "type" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "checksum" TEXT,
    "scanStatus" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FileAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "consultationId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "method" TEXT NOT NULL DEFAULT 'card',
    "psp" TEXT NOT NULL DEFAULT 'stripe',
    "pspRef" TEXT,
    "status" "PaymentStatus" NOT NULL DEFAULT 'CREATED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "capturedAt" TIMESTAMP(3),

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Split" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "platformFeeCents" INTEGER NOT NULL,
    "pediatricianAmount" INTEGER NOT NULL,
    "feeModel" TEXT NOT NULL DEFAULT 'pct',

    CONSTRAINT "Split_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Refund" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "reason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Refund_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "consultationId" TEXT NOT NULL,
    "issuer" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "vatCents" INTEGER NOT NULL DEFAULT 0,
    "vatRegime" TEXT NOT NULL DEFAULT 'exempt',
    "atcud" TEXT,
    "partnerDocId" TEXT,
    "pdfUrl" TEXT,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommissionInvoice" (
    "id" TEXT NOT NULL,
    "pediatricianId" TEXT NOT NULL,
    "consultationId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "vatCents" INTEGER NOT NULL DEFAULT 0,
    "vatRegime" TEXT NOT NULL DEFAULT 'standard',
    "atcud" TEXT,
    "partnerDocId" TEXT,
    "pdfUrl" TEXT,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommissionInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "consultationId" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "pediatricianId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Availability" (
    "id" TEXT NOT NULL,
    "pediatricianId" TEXT NOT NULL,
    "kind" "AvailabilityKind" NOT NULL DEFAULT 'VIDEO',
    "weekday" INTEGER NOT NULL,
    "startMinute" INTEGER NOT NULL,
    "endMinute" INTEGER NOT NULL,
    "slotMinutes" INTEGER NOT NULL DEFAULT 20,
    "date" TIMESTAMP(3),
    "closed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Availability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VideoSession" (
    "id" TEXT NOT NULL,
    "consultationId" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'livekit',
    "roomId" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "consentId" TEXT,
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VideoSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'push',
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "refId" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeviceToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeviceToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorUserId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "ip" TEXT,
    "userAgent" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChildDocument" (
    "id" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "uploadedByUserId" TEXT,
    "title" TEXT NOT NULL,
    "kind" "DocumentKind" NOT NULL DEFAULT 'OTHER',
    "mime" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "issuedAt" TIMESTAMP(3),
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChildDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalyticsEvent" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "Role",
    "userId" TEXT,
    "consultationId" TEXT,
    "pediatricianId" TEXT,
    "specialty" TEXT,
    "value" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalyticsEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Clinic" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "taxId" TEXT,
    "ersRegistration" TEXT,
    "countryCode" TEXT NOT NULL DEFAULT 'PT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Clinic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClinicMember" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClinicMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClinicPediatrician" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "pediatricianId" TEXT NOT NULL,
    "revenueSharePct" INTEGER NOT NULL DEFAULT 20,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClinicPediatrician_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GrowthMeasurement" (
    "id" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "measuredAt" TIMESTAMP(3) NOT NULL,
    "heightCm" DOUBLE PRECISION,
    "weightKg" DOUBLE PRECISION,
    "headCm" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GrowthMeasurement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Allergy" (
    "id" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "code" TEXT,
    "label" TEXT NOT NULL,
    "category" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Allergy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vital" (
    "id" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "measuredAt" TIMESTAMP(3) NOT NULL,
    "temperatureC" DOUBLE PRECISION,
    "heartRateBpm" INTEGER,
    "respRateBpm" INTEGER,
    "spo2Pct" INTEGER,
    "systolicMmHg" INTEGER,
    "diastolicMmHg" INTEGER,
    "consultationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Vital_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vaccination" (
    "id" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "pnvAbbr" TEXT,
    "cvx" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Vaccination_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Medication" (
    "id" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "dose" TEXT,
    "atcCode" TEXT,
    "route" TEXT,
    "frequency" TEXT,
    "durationDays" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "startedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Medication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Episode" (
    "id" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "icpc2Code" TEXT,
    "icd10Code" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),

    CONSTRAINT "Episode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "plan" "SubscriptionPlan" NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "priceCents" INTEGER NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cancelledAt" TIMESTAMP(3),

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Favorite" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "pediatricianId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Favorite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Article" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'geral',
    "body" TEXT NOT NULL,
    "authorUserId" TEXT,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "status" "ArticleStatus" NOT NULL DEFAULT 'DRAFT',
    "reviewNote" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Article_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Referral" (
    "id" TEXT NOT NULL,
    "consultationId" TEXT NOT NULL,
    "fromPediatricianId" TEXT NOT NULL,
    "toPediatricianId" TEXT NOT NULL,
    "status" "ReferralStatus" NOT NULL DEFAULT 'PENDING',
    "reason" TEXT NOT NULL,
    "opinion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "Referral_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "User_appleSub_key" ON "User"("appleSub");

-- CreateIndex
CREATE UNIQUE INDEX "User_googleSub_key" ON "User"("googleSub");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE UNIQUE INDEX "WebAuthnCredential_credentialId_key" ON "WebAuthnCredential"("credentialId");

-- CreateIndex
CREATE INDEX "WebAuthnCredential_userId_idx" ON "WebAuthnCredential"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_tokenHash_key" ON "RefreshToken"("tokenHash");

-- CreateIndex
CREATE INDEX "RefreshToken_userId_idx" ON "RefreshToken"("userId");

-- CreateIndex
CREATE INDEX "Consent_userId_subject_idx" ON "Consent"("userId", "subject");

-- CreateIndex
CREATE UNIQUE INDEX "FamilyMember_familyId_userId_key" ON "FamilyMember"("familyId", "userId");

-- CreateIndex
CREATE INDEX "Child_familyId_idx" ON "Child"("familyId");

-- CreateIndex
CREATE UNIQUE INDEX "Pediatrician_userId_key" ON "Pediatrician"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Pediatrician_licenseNumber_key" ON "Pediatrician"("licenseNumber");

-- CreateIndex
CREATE INDEX "Pediatrician_status_idx" ON "Pediatrician"("status");

-- CreateIndex
CREATE INDEX "VerificationDocument_pediatricianId_idx" ON "VerificationDocument"("pediatricianId");

-- CreateIndex
CREATE INDEX "PediatricianService_pediatricianId_idx" ON "PediatricianService"("pediatricianId");

-- CreateIndex
CREATE INDEX "Consultation_pediatricianId_status_idx" ON "Consultation"("pediatricianId", "status");

-- CreateIndex
CREATE INDEX "Consultation_familyId_idx" ON "Consultation"("familyId");

-- CreateIndex
CREATE INDEX "Consultation_episodeId_idx" ON "Consultation"("episodeId");

-- CreateIndex
CREATE INDEX "Message_consultationId_idx" ON "Message"("consultationId");

-- CreateIndex
CREATE INDEX "FileAsset_childId_idx" ON "FileAsset"("childId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_consultationId_key" ON "Payment"("consultationId");

-- CreateIndex
CREATE UNIQUE INDEX "Split_paymentId_key" ON "Split"("paymentId");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_consultationId_key" ON "Invoice"("consultationId");

-- CreateIndex
CREATE UNIQUE INDEX "CommissionInvoice_consultationId_key" ON "CommissionInvoice"("consultationId");

-- CreateIndex
CREATE INDEX "CommissionInvoice_pediatricianId_idx" ON "CommissionInvoice"("pediatricianId");

-- CreateIndex
CREATE UNIQUE INDEX "Review_consultationId_key" ON "Review"("consultationId");

-- CreateIndex
CREATE INDEX "Review_pediatricianId_idx" ON "Review"("pediatricianId");

-- CreateIndex
CREATE INDEX "Availability_pediatricianId_weekday_idx" ON "Availability"("pediatricianId", "weekday");

-- CreateIndex
CREATE INDEX "Availability_pediatricianId_date_idx" ON "Availability"("pediatricianId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "VideoSession_consultationId_key" ON "VideoSession"("consultationId");

-- CreateIndex
CREATE INDEX "VideoSession_scheduledAt_idx" ON "VideoSession"("scheduledAt");

-- CreateIndex
CREATE INDEX "Notification_userId_read_idx" ON "Notification"("userId", "read");

-- CreateIndex
CREATE UNIQUE INDEX "DeviceToken_token_key" ON "DeviceToken"("token");

-- CreateIndex
CREATE INDEX "DeviceToken_userId_idx" ON "DeviceToken"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_actorUserId_idx" ON "AuditLog"("actorUserId");

-- CreateIndex
CREATE INDEX "ChildDocument_childId_createdAt_idx" ON "ChildDocument"("childId", "createdAt");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_name_createdAt_idx" ON "AnalyticsEvent"("name", "createdAt");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_userId_createdAt_idx" ON "AnalyticsEvent"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_createdAt_idx" ON "AnalyticsEvent"("createdAt");

-- CreateIndex
CREATE INDEX "ClinicMember_userId_idx" ON "ClinicMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ClinicMember_clinicId_userId_key" ON "ClinicMember"("clinicId", "userId");

-- CreateIndex
CREATE INDEX "ClinicPediatrician_pediatricianId_idx" ON "ClinicPediatrician"("pediatricianId");

-- CreateIndex
CREATE UNIQUE INDEX "ClinicPediatrician_clinicId_pediatricianId_key" ON "ClinicPediatrician"("clinicId", "pediatricianId");

-- CreateIndex
CREATE INDEX "GrowthMeasurement_childId_idx" ON "GrowthMeasurement"("childId");

-- CreateIndex
CREATE INDEX "Allergy_childId_idx" ON "Allergy"("childId");

-- CreateIndex
CREATE INDEX "Vital_childId_idx" ON "Vital"("childId");

-- CreateIndex
CREATE INDEX "Vaccination_childId_idx" ON "Vaccination"("childId");

-- CreateIndex
CREATE INDEX "Medication_childId_idx" ON "Medication"("childId");

-- CreateIndex
CREATE INDEX "Episode_childId_idx" ON "Episode"("childId");

-- CreateIndex
CREATE INDEX "Subscription_userId_idx" ON "Subscription"("userId");

-- CreateIndex
CREATE INDEX "Favorite_userId_idx" ON "Favorite"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Favorite_userId_pediatricianId_key" ON "Favorite"("userId", "pediatricianId");

-- CreateIndex
CREATE UNIQUE INDEX "Article_slug_key" ON "Article"("slug");

-- CreateIndex
CREATE INDEX "Article_published_idx" ON "Article"("published");

-- CreateIndex
CREATE INDEX "Article_status_idx" ON "Article"("status");

-- CreateIndex
CREATE INDEX "Referral_toPediatricianId_status_idx" ON "Referral"("toPediatricianId", "status");

-- CreateIndex
CREATE INDEX "Referral_fromPediatricianId_idx" ON "Referral"("fromPediatricianId");

-- CreateIndex
CREATE INDEX "Referral_consultationId_idx" ON "Referral"("consultationId");

-- AddForeignKey
ALTER TABLE "WebAuthnCredential" ADD CONSTRAINT "WebAuthnCredential_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Consent" ADD CONSTRAINT "Consent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FamilyMember" ADD CONSTRAINT "FamilyMember_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FamilyMember" ADD CONSTRAINT "FamilyMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Child" ADD CONSTRAINT "Child_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pediatrician" ADD CONSTRAINT "Pediatrician_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerificationDocument" ADD CONSTRAINT "VerificationDocument_pediatricianId_fkey" FOREIGN KEY ("pediatricianId") REFERENCES "Pediatrician"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PediatricianService" ADD CONSTRAINT "PediatricianService_pediatricianId_fkey" FOREIGN KEY ("pediatricianId") REFERENCES "Pediatrician"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Consultation" ADD CONSTRAINT "Consultation_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Consultation" ADD CONSTRAINT "Consultation_pediatricianId_fkey" FOREIGN KEY ("pediatricianId") REFERENCES "Pediatrician"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_consultationId_fkey" FOREIGN KEY ("consultationId") REFERENCES "Consultation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FileAsset" ADD CONSTRAINT "FileAsset_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FileAsset" ADD CONSTRAINT "FileAsset_consultationId_fkey" FOREIGN KEY ("consultationId") REFERENCES "Consultation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_consultationId_fkey" FOREIGN KEY ("consultationId") REFERENCES "Consultation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Split" ADD CONSTRAINT "Split_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_consultationId_fkey" FOREIGN KEY ("consultationId") REFERENCES "Consultation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoSession" ADD CONSTRAINT "VideoSession_consultationId_fkey" FOREIGN KEY ("consultationId") REFERENCES "Consultation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChildDocument" ADD CONSTRAINT "ChildDocument_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalyticsEvent" ADD CONSTRAINT "AnalyticsEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicMember" ADD CONSTRAINT "ClinicMember_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicPediatrician" ADD CONSTRAINT "ClinicPediatrician_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_consultationId_fkey" FOREIGN KEY ("consultationId") REFERENCES "Consultation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_fromPediatricianId_fkey" FOREIGN KEY ("fromPediatricianId") REFERENCES "Pediatrician"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_toPediatricianId_fkey" FOREIGN KEY ("toPediatricianId") REFERENCES "Pediatrician"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
