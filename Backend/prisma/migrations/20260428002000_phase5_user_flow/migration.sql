-- Phase 5 — user-flow + features

ALTER TABLE "events" ADD COLUMN "recapSentAt" TIMESTAMP(3);
ALTER TYPE "RegistrationStatus" ADD VALUE 'PENDING_APPROVAL';

CREATE TABLE "connection_notes" (
    "id"           TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "authorId"     TEXT NOT NULL,
    "body"         TEXT NOT NULL,
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"    TIMESTAMP(3) NOT NULL,
    CONSTRAINT "connection_notes_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "connection_notes_connectionId_idx" ON "connection_notes"("connectionId");
CREATE INDEX "connection_notes_authorId_idx"     ON "connection_notes"("authorId");
ALTER TABLE "connection_notes" ADD CONSTRAINT "connection_notes_connectionId_fkey"
  FOREIGN KEY ("connectionId") REFERENCES "connections"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "connection_notes" ADD CONSTRAINT "connection_notes_authorId_fkey"
  FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "saved_events" (
    "id"        TEXT NOT NULL,
    "userId"    TEXT NOT NULL,
    "eventId"   TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "saved_events_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "saved_events_userId_eventId_key" ON "saved_events"("userId", "eventId");
CREATE INDEX "saved_events_userId_idx" ON "saved_events"("userId");
ALTER TABLE "saved_events" ADD CONSTRAINT "saved_events_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "saved_events" ADD CONSTRAINT "saved_events_eventId_fkey"
  FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "conversations" (
    "id"            TEXT NOT NULL,
    "userAId"       TEXT NOT NULL,
    "userBId"       TEXT NOT NULL,
    "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "conversations_userAId_userBId_key" ON "conversations"("userAId", "userBId");
CREATE INDEX "conversations_userAId_idx" ON "conversations"("userAId");
CREATE INDEX "conversations_userBId_idx" ON "conversations"("userBId");
CREATE INDEX "conversations_lastMessageAt_idx" ON "conversations"("lastMessageAt");
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_userAId_fkey"
  FOREIGN KEY ("userAId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_userBId_fkey"
  FOREIGN KEY ("userBId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "messages" (
    "id"             TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "senderId"       TEXT NOT NULL,
    "body"           TEXT NOT NULL,
    "readAt"         TIMESTAMP(3),
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "messages_conversationId_idx" ON "messages"("conversationId");
CREATE INDEX "messages_senderId_idx"       ON "messages"("senderId");
CREATE INDEX "messages_createdAt_idx"      ON "messages"("createdAt");
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversationId_fkey"
  FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "messages" ADD CONSTRAINT "messages_senderId_fkey"
  FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "event_questions" (
    "id"        TEXT NOT NULL,
    "eventId"   TEXT NOT NULL,
    "prompt"    TEXT NOT NULL,
    "type"      TEXT NOT NULL DEFAULT 'TEXT',
    "options"   JSONB,
    "required"  BOOLEAN NOT NULL DEFAULT false,
    "position"  INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "event_questions_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "event_questions_eventId_idx" ON "event_questions"("eventId");
ALTER TABLE "event_questions" ADD CONSTRAINT "event_questions_eventId_fkey"
  FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "registration_answers" (
    "id"             TEXT NOT NULL,
    "registrationId" TEXT NOT NULL,
    "questionId"     TEXT NOT NULL,
    "answer"         TEXT NOT NULL,
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "registration_answers_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "registration_answers_registrationId_questionId_key"
  ON "registration_answers"("registrationId", "questionId");
ALTER TABLE "registration_answers" ADD CONSTRAINT "registration_answers_registrationId_fkey"
  FOREIGN KEY ("registrationId") REFERENCES "event_registrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "registration_answers" ADD CONSTRAINT "registration_answers_questionId_fkey"
  FOREIGN KEY ("questionId") REFERENCES "event_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "event_speakers" (
    "id"        TEXT NOT NULL,
    "eventId"   TEXT NOT NULL,
    "name"      TEXT NOT NULL,
    "title"     TEXT,
    "company"   TEXT,
    "bio"       TEXT,
    "avatar"    TEXT,
    "position"  INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "event_speakers_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "event_speakers_eventId_idx" ON "event_speakers"("eventId");
ALTER TABLE "event_speakers" ADD CONSTRAINT "event_speakers_eventId_fkey"
  FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "event_agenda_items" (
    "id"          TEXT NOT NULL,
    "eventId"     TEXT NOT NULL,
    "startsAt"    TIMESTAMP(3) NOT NULL,
    "endsAt"      TIMESTAMP(3),
    "title"       TEXT NOT NULL,
    "description" TEXT,
    "speakerId"   TEXT,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "event_agenda_items_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "event_agenda_items_eventId_idx"  ON "event_agenda_items"("eventId");
CREATE INDEX "event_agenda_items_startsAt_idx" ON "event_agenda_items"("startsAt");
ALTER TABLE "event_agenda_items" ADD CONSTRAINT "event_agenda_items_eventId_fkey"
  FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "event_agenda_items" ADD CONSTRAINT "event_agenda_items_speakerId_fkey"
  FOREIGN KEY ("speakerId") REFERENCES "event_speakers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "event_coorganizers" (
    "id"        TEXT NOT NULL,
    "eventId"   TEXT NOT NULL,
    "userId"    TEXT NOT NULL,
    "role"      TEXT NOT NULL DEFAULT 'COHOST',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "event_coorganizers_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "event_coorganizers_eventId_userId_key" ON "event_coorganizers"("eventId", "userId");
CREATE INDEX "event_coorganizers_userId_idx" ON "event_coorganizers"("userId");
ALTER TABLE "event_coorganizers" ADD CONSTRAINT "event_coorganizers_eventId_fkey"
  FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "event_coorganizers" ADD CONSTRAINT "event_coorganizers_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
