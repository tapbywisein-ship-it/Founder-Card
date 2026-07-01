-- Additive: creates the card_purchases table for paid NFC Tap Card purchases.
-- Safe to run against the existing production DB (touches nothing else).
CREATE TABLE IF NOT EXISTS "card_purchases" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "razorpayOrderId" TEXT NOT NULL,
  "razorpayPaymentId" TEXT,
  "razorpaySignature" TEXT,
  "amount" DECIMAL(10,2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'INR',
  "status" "PaymentStatus" NOT NULL DEFAULT 'CREATED',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "card_purchases_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "card_purchases_razorpayOrderId_key" ON "card_purchases"("razorpayOrderId");
CREATE INDEX IF NOT EXISTS "card_purchases_userId_idx" ON "card_purchases"("userId");
CREATE INDEX IF NOT EXISTS "card_purchases_razorpayOrderId_idx" ON "card_purchases"("razorpayOrderId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'card_purchases_userId_fkey'
  ) THEN
    ALTER TABLE "card_purchases"
      ADD CONSTRAINT "card_purchases_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
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
-- Additive: per-user CRM metadata (private tags + follow-up reminder) on connections.
-- Safe to run against the existing production DB (touches nothing else).
CREATE TABLE IF NOT EXISTS "connection_meta" (
  "id" TEXT NOT NULL,
  "connectionId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "tags" TEXT[] NOT NULL DEFAULT '{}',
  "followUpAt" TIMESTAMP(3),
  "followUpDone" BOOLEAN NOT NULL DEFAULT false,
  "remindedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "connection_meta_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "connection_meta_connectionId_userId_key" ON "connection_meta"("connectionId", "userId");
CREATE INDEX IF NOT EXISTS "connection_meta_userId_idx" ON "connection_meta"("userId");
CREATE INDEX IF NOT EXISTS "connection_meta_followUpAt_followUpDone_idx" ON "connection_meta"("followUpAt", "followUpDone");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'connection_meta_connectionId_fkey') THEN
    ALTER TABLE "connection_meta"
      ADD CONSTRAINT "connection_meta_connectionId_fkey"
      FOREIGN KEY ("connectionId") REFERENCES "connections"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'connection_meta_userId_fkey') THEN
    ALTER TABLE "connection_meta"
      ADD CONSTRAINT "connection_meta_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
-- Additive: live status line on profiles (e.g. "Raising a seed round", "Hiring").
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "status" TEXT;
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
-- Additive: leads captured from a public Tap Card's contact form.
CREATE TABLE IF NOT EXISTS "card_leads" (
  "id" TEXT NOT NULL,
  "ownerId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "message" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "card_leads_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "card_leads_ownerId_createdAt_idx" ON "card_leads"("ownerId", "createdAt");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'card_leads_ownerId_fkey') THEN
    ALTER TABLE "card_leads"
      ADD CONSTRAINT "card_leads_ownerId_fkey"
      FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
