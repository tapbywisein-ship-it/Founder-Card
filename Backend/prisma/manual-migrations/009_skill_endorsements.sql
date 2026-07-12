-- Skill endorsements: accepted connections vouch for a user's skills.
-- Applied manually via the Supabase SQL editor. Idempotent + guarded.

-- CreateTable
CREATE TABLE IF NOT EXISTS "skill_endorsements" (
    "id" TEXT NOT NULL,
    "endorserId" TEXT NOT NULL,
    "endorseeId" TEXT NOT NULL,
    "skill" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "skill_endorsements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "skill_endorsements_endorserId_endorseeId_skill_key"
  ON "skill_endorsements"("endorserId", "endorseeId", "skill");
CREATE INDEX IF NOT EXISTS "skill_endorsements_endorseeId_idx" ON "skill_endorsements"("endorseeId");

-- AddForeignKey (guarded — ADD CONSTRAINT has no IF NOT EXISTS)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'skill_endorsements_endorserId_fkey') THEN
    ALTER TABLE "skill_endorsements"
      ADD CONSTRAINT "skill_endorsements_endorserId_fkey"
      FOREIGN KEY ("endorserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'skill_endorsements_endorseeId_fkey') THEN
    ALTER TABLE "skill_endorsements"
      ADD CONSTRAINT "skill_endorsements_endorseeId_fkey"
      FOREIGN KEY ("endorseeId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
