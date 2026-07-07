-- Intro requests: "ask a mutual to introduce you" (roadmap #3 who-to-meet).
-- Applied manually via the Supabase SQL editor. Idempotent + guarded.

-- CreateTable
CREATE TABLE IF NOT EXISTS "intro_requests" (
    "id" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "viaId" TEXT NOT NULL,
    "eventId" TEXT,
    "message" VARCHAR(1000),
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "intro_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "intro_requests_viaId_status_idx" ON "intro_requests"("viaId", "status");
CREATE INDEX IF NOT EXISTS "intro_requests_requesterId_idx" ON "intro_requests"("requesterId");

-- AddForeignKey (guarded — ADD CONSTRAINT has no IF NOT EXISTS)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'intro_requests_requesterId_fkey') THEN
    ALTER TABLE "intro_requests"
      ADD CONSTRAINT "intro_requests_requesterId_fkey"
      FOREIGN KEY ("requesterId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'intro_requests_targetId_fkey') THEN
    ALTER TABLE "intro_requests"
      ADD CONSTRAINT "intro_requests_targetId_fkey"
      FOREIGN KEY ("targetId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'intro_requests_viaId_fkey') THEN
    ALTER TABLE "intro_requests"
      ADD CONSTRAINT "intro_requests_viaId_fkey"
      FOREIGN KEY ("viaId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
