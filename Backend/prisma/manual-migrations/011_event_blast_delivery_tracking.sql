-- Real delivery tracking for organizer email blasts. Previously "sent" was
-- faked (counted at enqueue time, not delivery); now it's updated as jobs
-- actually complete, via the email queue's success/failure hooks.
-- Additive + idempotent; run in the Supabase SQL editor.
ALTER TABLE "event_blasts" ADD COLUMN IF NOT EXISTS "total" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "event_blasts" ADD COLUMN IF NOT EXISTS "failed" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "event_blasts" ALTER COLUMN "status" SET DEFAULT 'sending';
-- eventId becomes nullable: sendAttendeeBlast targets users across events, not
-- one event, so those rows have no single eventId to attach to.
ALTER TABLE "event_blasts" ALTER COLUMN "eventId" DROP NOT NULL;
-- Backfill: existing rows were written with the old (enqueue-time) semantics,
-- so treat their recorded "sent" as the total and assume they finished.
UPDATE "event_blasts" SET "total" = "sent" WHERE "total" = 0 AND "sent" > 0;
