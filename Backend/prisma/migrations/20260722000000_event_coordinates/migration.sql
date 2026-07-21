-- Add Google Places coordinates to events.
-- IF NOT EXISTS: some columns may already exist from an earlier db push.
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "latitude" DOUBLE PRECISION;
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "longitude" DOUBLE PRECISION;
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "placeId" TEXT;
