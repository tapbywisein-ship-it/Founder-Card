-- Additive: live status line on profiles (e.g. "Raising a seed round", "Hiring").
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "status" TEXT;
