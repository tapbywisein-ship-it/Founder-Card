-- Ambassador / Community Lead program.
DO $$ BEGIN
  CREATE TYPE "AmbassadorStatus" AS ENUM ('APPLIED', 'INTERVIEW', 'ACTIVE', 'REJECTED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS "ambassadors" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "city" TEXT NOT NULL,
  "region" TEXT,
  "motivation" TEXT NOT NULL,
  "status" "AmbassadorStatus" NOT NULL DEFAULT 'APPLIED',
  "reviewedBy" TEXT,
  "reviewNote" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ambassadors_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ambassadors_userId_key" ON "ambassadors"("userId");
CREATE INDEX IF NOT EXISTS "ambassadors_status_idx" ON "ambassadors"("status");
CREATE INDEX IF NOT EXISTS "ambassadors_city_idx" ON "ambassadors"("city");

DO $$ BEGIN
  ALTER TABLE "ambassadors" ADD CONSTRAINT "ambassadors_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
