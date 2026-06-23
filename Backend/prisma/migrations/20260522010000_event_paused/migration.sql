-- Allow temporarily hiding an event without deleting it (admin Pause action).
ALTER TYPE "EventStatus" ADD VALUE IF NOT EXISTS 'PAUSED';
