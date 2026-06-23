-- Founder Key — initial schema migration
-- Generated 2026-04-27 to bootstrap the Supabase Postgres for project
-- "Founder-key-new" (zbkpsxzbyylbwvnsbcgq).
--
-- HOW TO APPLY:
--   Option A (recommended) — Prisma manages history:
--     1. cd founder-key-backend
--     2. cp .env.example .env  (and fill in YOUR-DB-PASSWORD + service-role key)
--     3. npx prisma migrate deploy
--
--   Option B — paste this file straight into Supabase SQL editor:
--     https://supabase.com/dashboard/project/zbkpsxzbyylbwvnsbcgq/sql
--
-- The DROP statements at the top remove tables left over from a previous
-- (unrelated) app's use of this Postgres. They are intentional.

-- ============================================================
-- 1. Drop legacy tables from a different application
-- ============================================================
DROP TABLE IF EXISTS public.agent_logs CASCADE;
DROP TABLE IF EXISTS public.processing_jobs CASCADE;
DROP TABLE IF EXISTS public.tone_alerts CASCADE;
DROP TABLE IF EXISTS public.summaries CASCADE;
DROP TABLE IF EXISTS public.transcripts CASCADE;
DROP TABLE IF EXISTS public.meetings CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.organizations CASCADE;

-- ============================================================
-- 2. Enums
-- ============================================================
CREATE TYPE "Role"               AS ENUM ('ATTENDEE', 'ORGANIZER', 'ADMIN');
CREATE TYPE "UserTier"           AS ENUM ('FREE', 'FOUNDER');
CREATE TYPE "CardStatus"         AS ENUM ('PENDING', 'ACTIVE', 'DEACTIVATED', 'REJECTED');
CREATE TYPE "ConnectionStatus"   AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');
CREATE TYPE "EventStatus"        AS ENUM ('DRAFT', 'PUBLISHED', 'CANCELLED', 'COMPLETED');
CREATE TYPE "EventType"          AS ENUM ('IN_PERSON', 'VIRTUAL', 'HYBRID');
CREATE TYPE "EventVisibility"    AS ENUM ('PUBLIC', 'PRIVATE', 'UNLISTED');
CREATE TYPE "RegistrationStatus" AS ENUM ('REGISTERED', 'ATTENDED', 'CANCELLED', 'WAITLISTED');
CREATE TYPE "NotificationType"   AS ENUM ('CONNECTION_REQUEST', 'CONNECTION_ACCEPTED', 'EVENT_REMINDER', 'FOUNDER_CARD_APPROVED', 'FOUNDER_CARD_REJECTED', 'NEW_EVENT', 'BADGE_EARNED', 'LEVEL_UP', 'SYSTEM');
CREATE TYPE "LeadStatus"         AS ENUM ('NEW', 'CONTACTED', 'QUALIFIED', 'CONVERTED', 'ARCHIVED');

-- ============================================================
-- 3. Tables
-- ============================================================
CREATE TABLE "users" (
    "id"              TEXT NOT NULL,
    "email"           TEXT NOT NULL,
    "password"        TEXT,
    "googleId"        TEXT,
    "authProvider"    TEXT NOT NULL DEFAULT 'email',
    "role"            "Role" NOT NULL DEFAULT 'ATTENDEE',
    "tier"            "UserTier" NOT NULL DEFAULT 'FREE',
    "isActive"        BOOLEAN NOT NULL DEFAULT true,
    "isEmailVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"       TIMESTAMP(3) NOT NULL,
    "deletedAt"       TIMESTAMP(3),
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "profiles" (
    "id"         TEXT NOT NULL,
    "userId"     TEXT NOT NULL,
    "firstName"  TEXT NOT NULL,
    "lastName"   TEXT NOT NULL,
    "bio"        TEXT,
    "company"    TEXT,
    "position"   TEXT,
    "location"   TEXT,
    "avatar"     TEXT,
    "skills"     TEXT[],
    "interests"  TEXT[],
    "lookingFor" TEXT[],
    "phone"      TEXT,
    "twitter"    TEXT,
    "linkedin"   TEXT,
    "website"    TEXT,
    "instagram"  TEXT,
    "email"      TEXT,
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"  TIMESTAMP(3) NOT NULL,
    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "refresh_tokens" (
    "id"        TEXT NOT NULL,
    "userId"    TEXT NOT NULL,
    "token"     TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "founder_cards" (
    "id"         TEXT NOT NULL,
    "userId"     TEXT NOT NULL,
    "status"     "CardStatus" NOT NULL DEFAULT 'PENDING',
    "qrCode"     TEXT,
    "qrCodeUrl"  TEXT,
    "message"    TEXT,
    "reason"     TEXT,
    "appliedAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,
    "updatedAt"  TIMESTAMP(3) NOT NULL,
    CONSTRAINT "founder_cards_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "connections" (
    "id"          TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "receiverId"  TEXT NOT NULL,
    "status"      "ConnectionStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL,
    CONSTRAINT "connections_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "events" (
    "id"               TEXT NOT NULL,
    "organizerId"      TEXT NOT NULL,
    "title"            TEXT NOT NULL,
    "description"      TEXT NOT NULL,
    "startDate"        TIMESTAMP(3) NOT NULL,
    "endDate"          TIMESTAMP(3) NOT NULL,
    "locationType"     "EventType" NOT NULL DEFAULT 'IN_PERSON',
    "address"          TEXT,
    "city"             TEXT,
    "country"          TEXT,
    "meetingUrl"       TEXT,
    "capacity"         INTEGER NOT NULL DEFAULT 100,
    "ticketPrice"      DECIMAL(10,2),
    "coverImage"       TEXT,
    "tags"             TEXT[],
    "status"           "EventStatus" NOT NULL DEFAULT 'DRAFT',
    "category"         TEXT,
    "theme"            TEXT DEFAULT 'default',
    "slug"             TEXT,
    "requiresApproval" BOOLEAN NOT NULL DEFAULT false,
    "waitlistEnabled"  BOOLEAN NOT NULL DEFAULT true,
    "visibility"       "EventVisibility" NOT NULL DEFAULT 'PUBLIC',
    "timezone"         TEXT DEFAULT 'UTC',
    "ticketTypes"      JSONB,
    "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"        TIMESTAMP(3) NOT NULL,
    "deletedAt"        TIMESTAMP(3),
    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "event_registrations" (
    "id"           TEXT NOT NULL,
    "eventId"      TEXT NOT NULL,
    "userId"       TEXT NOT NULL,
    "status"       "RegistrationStatus" NOT NULL DEFAULT 'REGISTERED',
    "checkedIn"    BOOLEAN NOT NULL DEFAULT false,
    "checkedInAt"  TIMESTAMP(3),
    "registeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"    TIMESTAMP(3) NOT NULL,
    CONSTRAINT "event_registrations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "gamification" (
    "id"        TEXT NOT NULL,
    "userId"    TEXT NOT NULL,
    "fkScore"   INTEGER NOT NULL DEFAULT 0,
    "level"     INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "gamification_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "score_history" (
    "id"        TEXT NOT NULL,
    "userId"    TEXT NOT NULL,
    "action"    TEXT NOT NULL,
    "points"    INTEGER NOT NULL,
    "metadata"  JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "score_history_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "badges" (
    "id"          TEXT NOT NULL,
    "name"        TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "icon"        TEXT NOT NULL,
    "condition"   JSONB NOT NULL,
    "points"      INTEGER NOT NULL DEFAULT 0,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "badges_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "user_badges" (
    "id"       TEXT NOT NULL,
    "userId"   TEXT NOT NULL,
    "badgeId"  TEXT NOT NULL,
    "earnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "user_badges_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "notifications" (
    "id"        TEXT NOT NULL,
    "userId"    TEXT NOT NULL,
    "type"      "NotificationType" NOT NULL,
    "title"     TEXT NOT NULL,
    "message"   TEXT NOT NULL,
    "data"      JSONB,
    "isRead"    BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "leads" (
    "id"          TEXT NOT NULL,
    "eventId"     TEXT NOT NULL,
    "attendeeId"  TEXT NOT NULL,
    "organizerId" TEXT NOT NULL,
    "status"      "LeadStatus" NOT NULL DEFAULT 'NEW',
    "notes"       TEXT,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL,
    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "platform_settings" (
    "id"        TEXT NOT NULL,
    "key"       TEXT NOT NULL,
    "value"     TEXT NOT NULL,
    "type"      TEXT NOT NULL DEFAULT 'string',
    "label"     TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "platform_settings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "audit_logs" (
    "id"         TEXT NOT NULL,
    "userId"     TEXT,
    "action"     TEXT NOT NULL,
    "resource"   TEXT NOT NULL,
    "resourceId" TEXT,
    "metadata"   JSONB,
    "ip"         TEXT,
    "userAgent"  TEXT,
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "event_messages" (
    "id"        TEXT NOT NULL,
    "eventId"   TEXT NOT NULL,
    "userId"    TEXT NOT NULL,
    "content"   TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "event_messages_pkey" PRIMARY KEY ("id")
);

-- ============================================================
-- 4. Indexes & unique constraints
-- ============================================================
CREATE UNIQUE INDEX "users_email_key"    ON "users"("email");
CREATE UNIQUE INDEX "users_googleId_key" ON "users"("googleId");
CREATE INDEX "users_email_idx"           ON "users"("email");
CREATE INDEX "users_googleId_idx"        ON "users"("googleId");
CREATE INDEX "users_role_idx"            ON "users"("role");
CREATE INDEX "users_isActive_idx"        ON "users"("isActive");

CREATE UNIQUE INDEX "profiles_userId_key" ON "profiles"("userId");
CREATE INDEX "profiles_userId_idx"        ON "profiles"("userId");

CREATE UNIQUE INDEX "refresh_tokens_token_key" ON "refresh_tokens"("token");
CREATE INDEX "refresh_tokens_userId_idx"       ON "refresh_tokens"("userId");
CREATE INDEX "refresh_tokens_token_idx"        ON "refresh_tokens"("token");

CREATE UNIQUE INDEX "founder_cards_userId_key" ON "founder_cards"("userId");
CREATE INDEX "founder_cards_userId_idx"        ON "founder_cards"("userId");
CREATE INDEX "founder_cards_status_idx"        ON "founder_cards"("status");

CREATE UNIQUE INDEX "connections_requesterId_receiverId_key" ON "connections"("requesterId", "receiverId");
CREATE INDEX "connections_requesterId_idx"                   ON "connections"("requesterId");
CREATE INDEX "connections_receiverId_idx"                    ON "connections"("receiverId");
CREATE INDEX "connections_status_idx"                        ON "connections"("status");

CREATE UNIQUE INDEX "events_slug_key"   ON "events"("slug");
CREATE INDEX "events_organizerId_idx"   ON "events"("organizerId");
CREATE INDEX "events_status_idx"        ON "events"("status");
CREATE INDEX "events_startDate_idx"     ON "events"("startDate");
CREATE INDEX "events_category_idx"      ON "events"("category");

CREATE UNIQUE INDEX "event_registrations_eventId_userId_key" ON "event_registrations"("eventId", "userId");
CREATE INDEX "event_registrations_eventId_idx"               ON "event_registrations"("eventId");
CREATE INDEX "event_registrations_userId_idx"                ON "event_registrations"("userId");

CREATE UNIQUE INDEX "gamification_userId_key" ON "gamification"("userId");
CREATE INDEX "gamification_fkScore_idx"       ON "gamification"("fkScore");

CREATE INDEX "score_history_userId_idx"    ON "score_history"("userId");
CREATE INDEX "score_history_createdAt_idx" ON "score_history"("createdAt");

CREATE UNIQUE INDEX "badges_name_key" ON "badges"("name");

CREATE UNIQUE INDEX "user_badges_userId_badgeId_key" ON "user_badges"("userId", "badgeId");
CREATE INDEX "user_badges_userId_idx"                ON "user_badges"("userId");

CREATE INDEX "notifications_userId_idx"    ON "notifications"("userId");
CREATE INDEX "notifications_isRead_idx"    ON "notifications"("isRead");
CREATE INDEX "notifications_createdAt_idx" ON "notifications"("createdAt");

CREATE UNIQUE INDEX "leads_eventId_attendeeId_key" ON "leads"("eventId", "attendeeId");
CREATE INDEX "leads_organizerId_idx"               ON "leads"("organizerId");
CREATE INDEX "leads_status_idx"                    ON "leads"("status");

CREATE UNIQUE INDEX "platform_settings_key_key" ON "platform_settings"("key");

CREATE INDEX "audit_logs_userId_idx"    ON "audit_logs"("userId");
CREATE INDEX "audit_logs_action_idx"    ON "audit_logs"("action");
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

CREATE INDEX "event_messages_eventId_idx"   ON "event_messages"("eventId");
CREATE INDEX "event_messages_createdAt_idx" ON "event_messages"("createdAt");

-- ============================================================
-- 5. Foreign keys
-- ============================================================
ALTER TABLE "profiles"            ADD CONSTRAINT "profiles_userId_fkey"            FOREIGN KEY ("userId")      REFERENCES "users"("id")  ON DELETE CASCADE   ON UPDATE CASCADE;
ALTER TABLE "refresh_tokens"      ADD CONSTRAINT "refresh_tokens_userId_fkey"      FOREIGN KEY ("userId")      REFERENCES "users"("id")  ON DELETE CASCADE   ON UPDATE CASCADE;
ALTER TABLE "founder_cards"       ADD CONSTRAINT "founder_cards_userId_fkey"       FOREIGN KEY ("userId")      REFERENCES "users"("id")  ON DELETE CASCADE   ON UPDATE CASCADE;
ALTER TABLE "connections"         ADD CONSTRAINT "connections_requesterId_fkey"    FOREIGN KEY ("requesterId") REFERENCES "users"("id")  ON DELETE CASCADE   ON UPDATE CASCADE;
ALTER TABLE "connections"         ADD CONSTRAINT "connections_receiverId_fkey"     FOREIGN KEY ("receiverId")  REFERENCES "users"("id")  ON DELETE CASCADE   ON UPDATE CASCADE;
ALTER TABLE "events"              ADD CONSTRAINT "events_organizerId_fkey"         FOREIGN KEY ("organizerId") REFERENCES "users"("id")  ON DELETE NO ACTION ON UPDATE CASCADE;
ALTER TABLE "event_registrations" ADD CONSTRAINT "event_registrations_eventId_fkey" FOREIGN KEY ("eventId")    REFERENCES "events"("id") ON DELETE CASCADE   ON UPDATE CASCADE;
ALTER TABLE "event_registrations" ADD CONSTRAINT "event_registrations_userId_fkey"  FOREIGN KEY ("userId")     REFERENCES "users"("id")  ON DELETE CASCADE   ON UPDATE CASCADE;
ALTER TABLE "gamification"        ADD CONSTRAINT "gamification_userId_fkey"        FOREIGN KEY ("userId")      REFERENCES "users"("id")  ON DELETE CASCADE   ON UPDATE CASCADE;
ALTER TABLE "score_history"       ADD CONSTRAINT "score_history_userId_fkey"       FOREIGN KEY ("userId")      REFERENCES "users"("id")  ON DELETE CASCADE   ON UPDATE CASCADE;
ALTER TABLE "user_badges"         ADD CONSTRAINT "user_badges_userId_fkey"         FOREIGN KEY ("userId")      REFERENCES "users"("id")  ON DELETE CASCADE   ON UPDATE CASCADE;
ALTER TABLE "user_badges"         ADD CONSTRAINT "user_badges_badgeId_fkey"        FOREIGN KEY ("badgeId")     REFERENCES "badges"("id") ON DELETE NO ACTION ON UPDATE CASCADE;
ALTER TABLE "notifications"       ADD CONSTRAINT "notifications_userId_fkey"       FOREIGN KEY ("userId")      REFERENCES "users"("id")  ON DELETE CASCADE   ON UPDATE CASCADE;
ALTER TABLE "leads"               ADD CONSTRAINT "leads_eventId_fkey"              FOREIGN KEY ("eventId")     REFERENCES "events"("id") ON DELETE NO ACTION ON UPDATE CASCADE;
ALTER TABLE "leads"               ADD CONSTRAINT "leads_attendeeId_fkey"           FOREIGN KEY ("attendeeId")  REFERENCES "users"("id")  ON DELETE NO ACTION ON UPDATE CASCADE;
ALTER TABLE "audit_logs"          ADD CONSTRAINT "audit_logs_userId_fkey"          FOREIGN KEY ("userId")      REFERENCES "users"("id")  ON DELETE SET NULL  ON UPDATE CASCADE;
ALTER TABLE "event_messages"      ADD CONSTRAINT "event_messages_eventId_fkey"     FOREIGN KEY ("eventId")     REFERENCES "events"("id") ON DELETE CASCADE   ON UPDATE CASCADE;
ALTER TABLE "event_messages"      ADD CONSTRAINT "event_messages_userId_fkey"      FOREIGN KEY ("userId")      REFERENCES "users"("id")  ON DELETE CASCADE   ON UPDATE CASCADE;
