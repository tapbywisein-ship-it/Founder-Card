-- Paid subscription tiers. Additive enum values; run in the Supabase SQL editor.
-- Postgres requires each ADD VALUE in its own statement, outside a txn block.
ALTER TYPE "UserTier" ADD VALUE IF NOT EXISTS 'PRO';
ALTER TYPE "UserTier" ADD VALUE IF NOT EXISTS 'ORGANIZER_LITE';
ALTER TYPE "UserTier" ADD VALUE IF NOT EXISTS 'ORGANIZER_PRO';
ALTER TYPE "UserTier" ADD VALUE IF NOT EXISTS 'ENTERPRISE';
