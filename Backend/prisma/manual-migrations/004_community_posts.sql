-- Community feed: posts + comments. Announcements are pinned posts with
-- isAnnouncement=true that also fan out notifications to members.
-- Applied manually via the Supabase SQL editor (out-of-band, like the other
-- manual migrations here). Idempotent + guarded so it is safe to re-run.

-- CreateTable
CREATE TABLE IF NOT EXISTS "community_posts" (
    "id" TEXT NOT NULL,
    "communityId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" VARCHAR(4000) NOT NULL,
    "imageUrl" TEXT,
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "isAnnouncement" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "community_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "community_post_comments" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" VARCHAR(2000) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "community_post_comments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "community_posts_communityId_pinned_createdAt_idx"
  ON "community_posts"("communityId", "pinned", "createdAt");
CREATE INDEX IF NOT EXISTS "community_posts_authorId_idx"
  ON "community_posts"("authorId");
CREATE INDEX IF NOT EXISTS "community_post_comments_postId_createdAt_idx"
  ON "community_post_comments"("postId", "createdAt");
CREATE INDEX IF NOT EXISTS "community_post_comments_authorId_idx"
  ON "community_post_comments"("authorId");

-- AddForeignKey (guarded — ADD CONSTRAINT has no IF NOT EXISTS)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'community_posts_communityId_fkey') THEN
    ALTER TABLE "community_posts"
      ADD CONSTRAINT "community_posts_communityId_fkey"
      FOREIGN KEY ("communityId") REFERENCES "communities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'community_posts_authorId_fkey') THEN
    ALTER TABLE "community_posts"
      ADD CONSTRAINT "community_posts_authorId_fkey"
      FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'community_post_comments_postId_fkey') THEN
    ALTER TABLE "community_post_comments"
      ADD CONSTRAINT "community_post_comments_postId_fkey"
      FOREIGN KEY ("postId") REFERENCES "community_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'community_post_comments_authorId_fkey') THEN
    ALTER TABLE "community_post_comments"
      ADD CONSTRAINT "community_post_comments_authorId_fkey"
      FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
