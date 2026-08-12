-- Ambassador referral tracking + level ladder (Insider/Ambassador/Leader/Elite).

ALTER TABLE "ambassadors" ADD COLUMN IF NOT EXISTS "referralCode" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "ambassadors_referralCode_key" ON "ambassadors"("referralCode");

ALTER TABLE "event_registrations" ADD COLUMN IF NOT EXISTS "referredByAmbassadorId" TEXT;
CREATE INDEX IF NOT EXISTS "event_registrations_referredByAmbassadorId_status_idx"
  ON "event_registrations"("referredByAmbassadorId", "status");

DO $$ BEGIN
  ALTER TABLE "event_registrations" ADD CONSTRAINT "event_registrations_referredByAmbassadorId_fkey"
    FOREIGN KEY ("referredByAmbassadorId") REFERENCES "ambassadors"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "referredByAmbassadorId" TEXT;
