-- Add optional unique username to users for vanity card URLs (/card/:username).
-- Nullable + unique => Postgres allows multiple NULLs.
ALTER TABLE "users" ADD COLUMN "username" TEXT;
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");
CREATE INDEX "users_username_idx" ON "users"("username");
