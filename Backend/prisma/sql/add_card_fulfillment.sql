-- Additive: bring card_purchases in sync with the fulfillment schema.
-- Creates the FulfillmentStatus enum + shipping/tracking columns if missing.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'FulfillmentStatus') THEN
    CREATE TYPE "FulfillmentStatus" AS ENUM ('PENDING', 'DISPATCHED', 'DELIVERED');
  END IF;
END $$;

ALTER TABLE "card_purchases" ADD COLUMN IF NOT EXISTS "shippingAddress" JSONB;
ALTER TABLE "card_purchases" ADD COLUMN IF NOT EXISTS "fulfillmentStatus" "FulfillmentStatus" NOT NULL DEFAULT 'PENDING';
ALTER TABLE "card_purchases" ADD COLUMN IF NOT EXISTS "trackingId" TEXT;
ALTER TABLE "card_purchases" ADD COLUMN IF NOT EXISTS "trackingProvider" TEXT;
ALTER TABLE "card_purchases" ADD COLUMN IF NOT EXISTS "dispatchedAt" TIMESTAMP(3);
ALTER TABLE "card_purchases" ADD COLUMN IF NOT EXISTS "deliveredAt" TIMESTAMP(3);
