-- Adds Communities: a Community owned by an organizer, CommunityMember join
-- rows, and an optional Event.communityId link. Applied manually via the
-- Supabase SQL editor (out-of-band, like the other manual migrations here).
-- Idempotent + guarded so it is safe to re-run or apply after a partial run.

-- CreateEnum (guarded — CREATE TYPE has no IF NOT EXISTS)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CommunityMemberRole') THEN
    CREATE TYPE "CommunityMemberRole" AS ENUM ('MEMBER', 'MODERATOR');
  END IF;
END $$;

-- AlterTable
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "communityId" TEXT;

-- CreateTable
CREATE TABLE IF NOT EXISTS "communities" (
    "id" TEXT NOT NULL,
    "organizerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "avatar" TEXT,
    "coverImage" TEXT,
    "category" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "communities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "community_members" (
    "id" TEXT NOT NULL,
    "communityId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "CommunityMemberRole" NOT NULL DEFAULT 'MEMBER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "community_members_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "communities_slug_key" ON "communities"("slug");
CREATE INDEX IF NOT EXISTS "communities_organizerId_idx" ON "communities"("organizerId");
CREATE INDEX IF NOT EXISTS "communities_slug_idx" ON "communities"("slug");
CREATE INDEX IF NOT EXISTS "community_members_userId_idx" ON "community_members"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "community_members_communityId_userId_key" ON "community_members"("communityId", "userId");
CREATE INDEX IF NOT EXISTS "events_communityId_idx" ON "events"("communityId");

-- AddForeignKey (guarded — ADD CONSTRAINT has no IF NOT EXISTS)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'events_communityId_fkey') THEN
    ALTER TABLE "events" ADD CONSTRAINT "events_communityId_fkey"
      FOREIGN KEY ("communityId") REFERENCES "communities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'communities_organizerId_fkey') THEN
    ALTER TABLE "communities" ADD CONSTRAINT "communities_organizerId_fkey"
      FOREIGN KEY ("organizerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'community_members_communityId_fkey') THEN
    ALTER TABLE "community_members" ADD CONSTRAINT "community_members_communityId_fkey"
      FOREIGN KEY ("communityId") REFERENCES "communities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'community_members_userId_fkey') THEN
    ALTER TABLE "community_members" ADD CONSTRAINT "community_members_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
