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
