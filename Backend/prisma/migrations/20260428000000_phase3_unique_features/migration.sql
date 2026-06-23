-- Phase 3 — FounderCard unique-value layer
-- Single additive migration unblocking:
--   * event-scoped Connection metadata (Connection.eventId)
--   * event-scoped attendee roles (EventRegistration.eventRole)
--   * NFC sticker provisioning (FounderCard.nfcTagId)
--   * self check-in via short URL (Event.checkInToken)
--   * trust+safety reports (Report)
--   * scan/tap analytics + abuse detection (EventTap)

-- ============================================================
-- 1. Enums
-- ============================================================
CREATE TYPE "EventRole"        AS ENUM ('ATTENDEE', 'VIP', 'SPEAKER', 'STAFF', 'SPONSOR');
CREATE TYPE "ReportTargetType" AS ENUM ('USER', 'EVENT', 'CONNECTION', 'COMMENT');
CREATE TYPE "ReportStatus"     AS ENUM ('OPEN', 'REVIEWING', 'ACTIONED', 'DISMISSED');
CREATE TYPE "TapMethod"        AS ENUM ('QR', 'NFC', 'MANUAL');

-- ============================================================
-- 2. Additive columns on existing tables
-- ============================================================

-- Connection.eventId — nullable, SetNull on event delete (preserve global connections)
ALTER TABLE "connections" ADD COLUMN "eventId" TEXT;
ALTER TABLE "connections"
    ADD CONSTRAINT "connections_eventId_fkey"
    FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "connections_eventId_idx" ON "connections"("eventId");

-- EventRegistration.eventRole — defaults ATTENDEE so existing rows keep current behavior
ALTER TABLE "event_registrations" ADD COLUMN "eventRole" "EventRole" NOT NULL DEFAULT 'ATTENDEE';

-- FounderCard.publicSlug — short URL slug for /c/:slug public card page
ALTER TABLE "founder_cards" ADD COLUMN "publicSlug" TEXT;
CREATE UNIQUE INDEX "founder_cards_publicSlug_key" ON "founder_cards"("publicSlug");

-- FounderCard.nfcTagId — unique, populated when user provisions a physical NFC sticker
ALTER TABLE "founder_cards" ADD COLUMN "nfcTagId" TEXT;
CREATE UNIQUE INDEX "founder_cards_nfcTagId_key" ON "founder_cards"("nfcTagId");

-- Event.checkInToken — unique short token used for /checkin/:token QR poster URL
ALTER TABLE "events" ADD COLUMN "checkInToken" TEXT;
CREATE UNIQUE INDEX "events_checkInToken_key" ON "events"("checkInToken");

-- ============================================================
-- 3. New tables
-- ============================================================

-- Report — moderation queue
CREATE TABLE "reports" (
    "id"         TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "targetType" "ReportTargetType" NOT NULL,
    "targetId"   TEXT NOT NULL,
    "category"   TEXT NOT NULL,
    "reason"     TEXT NOT NULL,
    "status"     "ReportStatus" NOT NULL DEFAULT 'OPEN',
    "reviewerId" TEXT,
    "resolution" TEXT,
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"  TIMESTAMP(3) NOT NULL,
    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "reports_status_idx"                ON "reports"("status");
CREATE INDEX "reports_targetType_targetId_idx"   ON "reports"("targetType", "targetId");
CREATE INDEX "reports_reporterId_idx"            ON "reports"("reporterId");

ALTER TABLE "reports"
    ADD CONSTRAINT "reports_reporterId_fkey"
    FOREIGN KEY ("reporterId") REFERENCES "users"("id") ON DELETE CASCADE  ON UPDATE CASCADE;
ALTER TABLE "reports"
    ADD CONSTRAINT "reports_reviewerId_fkey"
    FOREIGN KEY ("reviewerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- EventTap — every QR scan / NFC tap inside an event
CREATE TABLE "event_taps" (
    "id"                   TEXT NOT NULL,
    "eventId"              TEXT NOT NULL,
    "scannerUserId"        TEXT NOT NULL,
    "targetUserId"         TEXT NOT NULL,
    "method"               "TapMethod" NOT NULL DEFAULT 'QR',
    "resultedInConnection" BOOLEAN NOT NULL DEFAULT false,
    "createdAt"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "event_taps_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "event_taps_eventId_idx"        ON "event_taps"("eventId");
CREATE INDEX "event_taps_scannerUserId_idx"  ON "event_taps"("scannerUserId");
CREATE INDEX "event_taps_targetUserId_idx"   ON "event_taps"("targetUserId");

ALTER TABLE "event_taps"
    ADD CONSTRAINT "event_taps_eventId_fkey"
    FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "event_taps"
    ADD CONSTRAINT "event_taps_scannerUserId_fkey"
    FOREIGN KEY ("scannerUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "event_taps"
    ADD CONSTRAINT "event_taps_targetUserId_fkey"
    FOREIGN KEY ("targetUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
