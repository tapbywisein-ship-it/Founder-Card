-- Additive: creates the card_purchases table for paid NFC Tap Card purchases.
-- Safe to run against the existing production DB (touches nothing else).
CREATE TABLE IF NOT EXISTS "card_purchases" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "razorpayOrderId" TEXT NOT NULL,
  "razorpayPaymentId" TEXT,
  "razorpaySignature" TEXT,
  "amount" DECIMAL(10,2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'INR',
  "status" "PaymentStatus" NOT NULL DEFAULT 'CREATED',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "card_purchases_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "card_purchases_razorpayOrderId_key" ON "card_purchases"("razorpayOrderId");
CREATE INDEX IF NOT EXISTS "card_purchases_userId_idx" ON "card_purchases"("userId");
CREATE INDEX IF NOT EXISTS "card_purchases_razorpayOrderId_idx" ON "card_purchases"("razorpayOrderId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'card_purchases_userId_fkey'
  ) THEN
    ALTER TABLE "card_purchases"
      ADD CONSTRAINT "card_purchases_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
