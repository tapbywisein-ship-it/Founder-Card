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
