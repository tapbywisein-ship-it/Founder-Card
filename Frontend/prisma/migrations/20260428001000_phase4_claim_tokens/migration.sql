-- Phase 4 — claim tokens for CSV-imported user stubs
CREATE TABLE "claim_tokens" (
    "id"        TEXT NOT NULL,
    "userId"    TEXT NOT NULL,
    "token"     TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt"    TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "claim_tokens_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "claim_tokens_token_key" ON "claim_tokens"("token");
CREATE INDEX "claim_tokens_userId_idx" ON "claim_tokens"("userId");
CREATE INDEX "claim_tokens_token_idx"  ON "claim_tokens"("token");
ALTER TABLE "claim_tokens" ADD CONSTRAINT "claim_tokens_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
