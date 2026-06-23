/**
 * One-shot backfill: ensure every active user holds an ACTIVE Founder Card with
 * a human-readable member ID (FK-XXXXX), a public slug, and a QR code. Run once
 * after applying the `add_founder_member_id` migration:
 *
 *   npm run backfill:cards
 *   # or: ts-node -r tsconfig-paths/register scripts/backfill-founder-cards.ts
 *
 * Idempotent — re-running only fills in whatever is still missing.
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { cardIdToSlug } from '../src/utils/slug';
import { generateQRCode } from '../src/utils/qrcode';

const prisma = new PrismaClient();

const memberIdFromSeq = (n: number): string => `FK-${String(n).padStart(5, '0')}`;

async function nextMemberId(): Promise<string> {
  const rows = await prisma.$queryRaw<{ nextval: bigint }[]>`SELECT nextval('founder_member_seq') AS nextval`;
  return memberIdFromSeq(Number(rows[0].nextval));
}

async function main(): Promise<void> {
  const users = await prisma.user.findMany({
    where: { isActive: true, deletedAt: null },
    select: {
      id: true,
      tier: true,
      founderCard: {
        select: { id: true, memberId: true, publicSlug: true, qrCode: true, status: true },
      },
    },
  });

  let created = 0;
  let healed = 0;

  for (const u of users) {
    let card = u.founderCard;
    if (!card) {
      const newCard = await prisma.founderCard.create({
        data: { userId: u.id, status: 'ACTIVE', reviewedAt: new Date() },
      });
      card = { id: newCard.id, memberId: null, publicSlug: null, qrCode: null, status: 'ACTIVE' };
      created++;
    }

    const data: Record<string, unknown> = {};
    if (!card.memberId) data.memberId = await nextMemberId();
    if (!card.publicSlug) data.publicSlug = cardIdToSlug(card.id);
    if (!card.qrCode) {
      const qrPayload = Buffer.from(
        JSON.stringify({ userId: u.id, type: 'founder_card', timestamp: Date.now() })
      ).toString('base64');
      const qr = await generateQRCode(qrPayload);
      data.qrCode = qr;
      data.qrCodeUrl = qr;
    }
    if (card.status !== 'ACTIVE') {
      data.status = 'ACTIVE';
      data.reviewedAt = new Date();
    }
    if (Object.keys(data).length > 0) {
      await prisma.founderCard.update({ where: { id: card.id }, data });
      if (u.founderCard) healed++;
    }
    if (u.tier !== 'FOUNDER') {
      await prisma.user.update({ where: { id: u.id }, data: { tier: 'FOUNDER' } });
    }
  }

  console.log(
    `Backfill complete. Created ${created} new cards, healed ${healed} existing cards. Processed ${users.length} users.`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => void prisma.$disconnect());
