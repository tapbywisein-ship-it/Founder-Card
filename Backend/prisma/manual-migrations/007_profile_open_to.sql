-- "Open to" badges on the public card (HIRING / INVESTING / COFOUNDER / MENTORING).
-- Additive + idempotent; run in the Supabase SQL editor.
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "openTo" TEXT[] NOT NULL DEFAULT '{}';
