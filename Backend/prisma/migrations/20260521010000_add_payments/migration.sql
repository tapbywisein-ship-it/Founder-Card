-- Razorpay payment tracking + payment fields on registrations.
CREATE TYPE "PaymentStatus" AS ENUM ('CREATED', 'PAID', 'FAILED', 'REFUNDED');

ALTER TABLE "event_registrations"
    ADD COLUMN "amountPaid"     DECIMAL(10,2),
    ADD COLUMN "paymentStatus"  "PaymentStatus",
    ADD COLUMN "ticketTierId"   TEXT,
    ADD COLUMN "ticketTierName" TEXT;

CREATE TABLE "payments" (
    "id"                TEXT NOT NULL,
    "userId"            TEXT NOT NULL,
    "eventId"           TEXT NOT NULL,
    "registrationId"    TEXT,
    "razorpayOrderId"   TEXT NOT NULL,
    "razorpayPaymentId" TEXT,
    "razorpaySignature" TEXT,
    "amount"            DECIMAL(10,2) NOT NULL,
    "currency"          TEXT NOT NULL DEFAULT 'INR',
    "ticketTierId"      TEXT,
    "ticketTierName"    TEXT,
    "status"            "PaymentStatus" NOT NULL DEFAULT 'CREATED',
    "notes"             JSONB,
    "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"         TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "payments_razorpayOrderId_key" ON "payments"("razorpayOrderId");
CREATE INDEX "payments_userId_idx" ON "payments"("userId");
CREATE INDEX "payments_eventId_idx" ON "payments"("eventId");
CREATE INDEX "payments_razorpayOrderId_idx" ON "payments"("razorpayOrderId");

ALTER TABLE "payments" ADD CONSTRAINT "payments_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "payments" ADD CONSTRAINT "payments_eventId_fkey"
    FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "payments" ADD CONSTRAINT "payments_registrationId_fkey"
    FOREIGN KEY ("registrationId") REFERENCES "event_registrations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
