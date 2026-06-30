-- Performance: composite indexes matching hot-path query shapes (equality + sort),
-- turning filter-then-sort scans into single index scans.

-- "My registrations filtered by status"
CREATE INDEX IF NOT EXISTS "event_registrations_userId_status_idx" ON "event_registrations"("userId", "status");

-- Chat history: one conversation's messages in time order
CREATE INDEX IF NOT EXISTS "messages_conversationId_createdAt_idx" ON "messages"("conversationId", "createdAt");

-- Notifications feed: one user's notifications, newest first
CREATE INDEX IF NOT EXISTS "notifications_userId_createdAt_idx" ON "notifications"("userId", "createdAt");

-- Unread-count badge: one user's unread rows
CREATE INDEX IF NOT EXISTS "notifications_userId_isRead_idx" ON "notifications"("userId", "isRead");

-- Route-transfer retry cron: PAID payments still pending transfer
CREATE INDEX IF NOT EXISTS "payments_status_transferStatus_idx" ON "payments"("status", "transferStatus");

-- Score-history feed: one user's entries, newest first
CREATE INDEX IF NOT EXISTS "score_history_userId_createdAt_idx" ON "score_history"("userId", "createdAt");
