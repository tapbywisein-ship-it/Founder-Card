-- Tier 1: revenue ledger (platform fee + organizer earning per payment),
-- organizer payout accounts, and the payouts ledger.
ALTER TABLE "payments"
    ADD COLUMN "platformFee"      DECIMAL(10,2),
    ADD COLUMN "organizerEarning" DECIMAL(10,2);

ALTER TABLE "profiles"
    ADD COLUMN "payoutUpiId"         TEXT,
    ADD COLUMN "payoutAccountName"   TEXT,
    ADD COLUMN "payoutBankName"      TEXT,
    ADD COLUMN "payoutAccountNumber" TEXT,
    ADD COLUMN "payoutIfsc"          TEXT;

CREATE TYPE "PayoutStatus" AS ENUM ('PENDING', 'PAID');

CREATE TABLE "payouts" (
    "id"          TEXT NOT NULL,
    "organizerId" TEXT NOT NULL,
    "eventId"     TEXT,
    "amount"      DECIMAL(10,2) NOT NULL,
    "status"      "PayoutStatus" NOT NULL DEFAULT 'PENDING',
    "reference"   TEXT,
    "note"        TEXT,
    "paidAt"      TIMESTAMP(3),
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payouts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "payouts_organizerId_idx" ON "payouts"("organizerId");
CREATE INDEX "payouts_status_idx" ON "payouts"("status");

ALTER TABLE "payouts" ADD CONSTRAINT "payouts_organizerId_fkey"
    FOREIGN KEY ("organizerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_eventId_fkey"
    FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE SET NULL ON UPDATE CASCADE;
