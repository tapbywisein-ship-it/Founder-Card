-- EventPageView: tracks visitors to public event pages (registered or anonymous).
-- Dedupe by (eventId, sessionId) so repeat views from same session no-op.
CREATE TABLE "event_page_views" (
    "id"        TEXT NOT NULL,
    "eventId"   TEXT NOT NULL,
    "userId"    TEXT,
    "sessionId" TEXT NOT NULL,
    "ipHash"    TEXT,
    "userAgent" TEXT,
    "referrer"  TEXT,
    "isBot"     BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_page_views_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "event_page_views_eventId_sessionId_key"
    ON "event_page_views"("eventId", "sessionId");

CREATE INDEX "event_page_views_eventId_createdAt_idx"
    ON "event_page_views"("eventId", "createdAt");

CREATE INDEX "event_page_views_userId_idx"
    ON "event_page_views"("userId");

ALTER TABLE "event_page_views" ADD CONSTRAINT "event_page_views_eventId_fkey"
    FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "event_page_views" ADD CONSTRAINT "event_page_views_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
