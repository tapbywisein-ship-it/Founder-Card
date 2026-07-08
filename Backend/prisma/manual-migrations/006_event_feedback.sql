-- Post-event feedback + NPS (roadmap #8): one row per (event, attendee).
-- Applied manually via the Supabase SQL editor. Idempotent + guarded.

-- CreateTable
CREATE TABLE IF NOT EXISTS "event_feedback" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "nps" INTEGER,
    "comment" VARCHAR(2000),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_feedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "event_feedback_eventId_userId_key" ON "event_feedback"("eventId", "userId");
CREATE INDEX IF NOT EXISTS "event_feedback_eventId_idx" ON "event_feedback"("eventId");

-- AddForeignKey (guarded — ADD CONSTRAINT has no IF NOT EXISTS)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'event_feedback_eventId_fkey') THEN
    ALTER TABLE "event_feedback"
      ADD CONSTRAINT "event_feedback_eventId_fkey"
      FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'event_feedback_userId_fkey') THEN
    ALTER TABLE "event_feedback"
      ADD CONSTRAINT "event_feedback_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
