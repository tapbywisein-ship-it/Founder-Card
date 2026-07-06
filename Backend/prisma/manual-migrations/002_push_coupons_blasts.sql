-- Adds push_subscriptions (web push), coupons (per-event discounts), and
-- event_blasts (campaign/scheduled blast history), plus event/registration
-- columns. Applied manually via the Supabase SQL editor (out-of-band, like the
-- other manual migrations here).
-- Idempotent + guarded: safe to re-run and safe if some columns/tables already
-- exist (registrationDeadline/couponCode/guestNote may already be live from the
-- earlier out-of-band card_features apply).

-- AlterTable
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "registrationDeadline" TIMESTAMP(3);
ALTER TABLE "event_registrations" ADD COLUMN IF NOT EXISTS "couponCode" TEXT;
ALTER TABLE "event_registrations" ADD COLUMN IF NOT EXISTS "guestNote" TEXT;

-- CreateTable
CREATE TABLE IF NOT EXISTS "push_subscriptions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "push_subscriptions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "coupons" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "discountPct" INTEGER NOT NULL,
    "maxUses" INTEGER,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "coupons_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "event_blasts" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "organizerId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "audience" TEXT NOT NULL DEFAULT 'all',
    "sent" INTEGER NOT NULL DEFAULT 0,
    "scheduledAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'sent',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_blasts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "push_subscriptions_endpoint_key" ON "push_subscriptions"("endpoint");
CREATE INDEX IF NOT EXISTS "push_subscriptions_userId_idx" ON "push_subscriptions"("userId");
CREATE INDEX IF NOT EXISTS "coupons_eventId_idx" ON "coupons"("eventId");
CREATE UNIQUE INDEX IF NOT EXISTS "coupons_eventId_code_key" ON "coupons"("eventId", "code");
CREATE INDEX IF NOT EXISTS "event_blasts_eventId_createdAt_idx" ON "event_blasts"("eventId", "createdAt");
CREATE INDEX IF NOT EXISTS "event_blasts_organizerId_idx" ON "event_blasts"("organizerId");
CREATE INDEX IF NOT EXISTS "event_blasts_scheduledAt_status_idx" ON "event_blasts"("scheduledAt", "status");

-- AddForeignKey (guarded — ADD CONSTRAINT has no IF NOT EXISTS)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'push_subscriptions_userId_fkey') THEN
    ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'coupons_eventId_fkey') THEN
    ALTER TABLE "coupons" ADD CONSTRAINT "coupons_eventId_fkey"
      FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'event_blasts_eventId_fkey') THEN
    ALTER TABLE "event_blasts" ADD CONSTRAINT "event_blasts_eventId_fkey"
      FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'event_blasts_organizerId_fkey') THEN
    ALTER TABLE "event_blasts" ADD CONSTRAINT "event_blasts_organizerId_fkey"
      FOREIGN KEY ("organizerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
