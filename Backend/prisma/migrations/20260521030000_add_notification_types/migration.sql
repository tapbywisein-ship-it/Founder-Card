-- New in-app notification types: card-view alerts + registration approvals.
-- ADD VALUE is idempotent so re-runs are safe.
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'CARD_VIEWED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'REGISTRATION_APPROVED';
