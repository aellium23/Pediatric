-- The subscription inclusion becomes an amount instead of a yes/no, so a plan
-- can cover part of a consultation when the pediatrician's price is above the
-- plan's per-consultation cap.

-- 1. Consultation: coveredBySubscription (bool) -> coveredCents (int).
ALTER TABLE "Consultation" ADD COLUMN "coveredCents" INTEGER NOT NULL DEFAULT 0;
-- Backfill BEFORE dropping: an existing covered consultation was covered in
-- full, so the covered amount is its whole price.
UPDATE "Consultation" SET "coveredCents" = "priceCents" WHERE "coveredBySubscription" = true;
ALTER TABLE "Consultation" DROP COLUMN "coveredBySubscription";

-- 2. Payment: record how much of the act the platform funded.
ALTER TABLE "Payment" ADD COLUMN "subsidyCents" INTEGER NOT NULL DEFAULT 0;
-- Existing subscription-funded payments were funded in full.
UPDATE "Payment" SET "subsidyCents" = "amountCents" WHERE "psp" = 'subscription';
