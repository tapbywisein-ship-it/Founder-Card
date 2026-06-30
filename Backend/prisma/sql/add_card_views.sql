-- Additive: creates the card_views table for Tap Card view analytics.
-- Safe to run against the existing production DB (touches nothing else).
CREATE TABLE IF NOT EXISTS "card_views" (
  "id" TEXT NOT NULL,
  "ownerId" TEXT NOT NULL,
  "viewerId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "card_views_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "card_views_ownerId_createdAt_idx" ON "card_views"("ownerId", "createdAt");
CREATE INDEX IF NOT EXISTS "card_views_viewerId_idx" ON "card_views"("viewerId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'card_views_ownerId_fkey') THEN
    ALTER TABLE "card_views"
      ADD CONSTRAINT "card_views_ownerId_fkey"
      FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'card_views_viewerId_fkey') THEN
    ALTER TABLE "card_views"
      ADD CONSTRAINT "card_views_viewerId_fkey"
      FOREIGN KEY ("viewerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
