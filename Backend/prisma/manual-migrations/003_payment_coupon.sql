-- Records the coupon code applied to a paid ticket so the discount and usage
-- count can be reconciled at payment verification. Applied manually via the
-- Supabase SQL editor. Additive + idempotent.

ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "couponCode" TEXT;
