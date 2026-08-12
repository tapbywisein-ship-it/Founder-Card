-- Ambassador reward fulfillment (physical swag shipped per level reached).

DO $$ BEGIN
  CREATE TYPE "AmbassadorRewardLevel" AS ENUM ('INSIDER', 'AMBASSADOR', 'LEADER', 'ELITE');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS "ambassador_rewards" (
  "id" TEXT NOT NULL,
  "ambassadorId" TEXT NOT NULL,
  "level" "AmbassadorRewardLevel" NOT NULL,
  "shippingAddress" JSONB,
  "fulfillmentStatus" "FulfillmentStatus" NOT NULL DEFAULT 'PENDING',
  "trackingId" TEXT,
  "trackingProvider" TEXT,
  "dispatchedAt" TIMESTAMP(3),
  "deliveredAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ambassador_rewards_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ambassador_rewards_ambassadorId_level_key" ON "ambassador_rewards"("ambassadorId", "level");
CREATE INDEX IF NOT EXISTS "ambassador_rewards_fulfillmentStatus_idx" ON "ambassador_rewards"("fulfillmentStatus");

DO $$ BEGIN
  ALTER TABLE "ambassador_rewards" ADD CONSTRAINT "ambassador_rewards_ambassadorId_fkey"
    FOREIGN KEY ("ambassadorId") REFERENCES "ambassadors"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
