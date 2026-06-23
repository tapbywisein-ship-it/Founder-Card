-- Founder Card human-readable member ID (FK-XXXXX). A dedicated sequence
-- guarantees monotonically increasing, collision-free member numbers.
CREATE SEQUENCE IF NOT EXISTS "founder_member_seq" START 1;

ALTER TABLE "founder_cards" ADD COLUMN "memberId" TEXT;

CREATE UNIQUE INDEX "founder_cards_memberId_key" ON "founder_cards"("memberId");
