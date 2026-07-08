-- Pitch spotlight on the public card: startup name, one-liner, stage, demo/deck link.
-- Additive + idempotent; run in the Supabase SQL editor.
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "pitchName" TEXT;
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "pitchTagline" TEXT;
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "pitchStage" TEXT;
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "pitchUrl" TEXT;
