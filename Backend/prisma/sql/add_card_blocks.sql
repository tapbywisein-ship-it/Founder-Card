-- Additive: rich content blocks shown on a user's Tap Card.
CREATE TABLE IF NOT EXISTS "card_blocks" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "type" TEXT NOT NULL DEFAULT 'link',
  "label" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "card_blocks_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "card_blocks_userId_sortOrder_idx" ON "card_blocks"("userId", "sortOrder");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'card_blocks_userId_fkey') THEN
    ALTER TABLE "card_blocks"
      ADD CONSTRAINT "card_blocks_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
