import { UserTier } from '@prisma/client';
import prisma from './database';
import { env } from './env';
import { MembershipRequiredError } from '@utils/errors';

/** What each tier unlocks. Numbers use Infinity for "unlimited". */
export interface Entitlements {
  leadCapture: boolean;
  customBlocks: boolean;
  crmNotes: boolean;
  contactExport: boolean;
  impactReports: boolean;
  canHost: boolean;
  matchmaking: boolean;
  maxActiveEvents: number;
  maxAttendeesPerEvent: number;
  monthlyProfileViews: number;
}

export type BooleanEntitlement = {
  [K in keyof Entitlements]: Entitlements[K] extends boolean ? K : never;
}[keyof Entitlements];

const proCard = {
  leadCapture: true,
  customBlocks: true,
  crmNotes: true,
  contactExport: true,
  impactReports: true,
} as const;

const TABLE: Record<UserTier, Entitlements> = {
  FREE: {
    leadCapture: false,
    customBlocks: false,
    crmNotes: false,
    contactExport: false,
    impactReports: false,
    canHost: false,
    matchmaking: false,
    maxActiveEvents: 0,
    maxAttendeesPerEvent: 0,
    monthlyProfileViews: 100,
  },
  PRO: {
    ...proCard,
    canHost: false,
    matchmaking: false,
    maxActiveEvents: 0,
    maxAttendeesPerEvent: 0,
    monthlyProfileViews: Infinity,
  },
  ORGANIZER_LITE: {
    ...proCard,
    canHost: true,
    matchmaking: false,
    maxActiveEvents: 2,
    maxAttendeesPerEvent: 200,
    monthlyProfileViews: Infinity,
  },
  ORGANIZER_PRO: {
    ...proCard,
    canHost: true,
    matchmaking: true,
    maxActiveEvents: Infinity,
    maxAttendeesPerEvent: Infinity,
    monthlyProfileViews: Infinity,
  },
  ENTERPRISE: {
    ...proCard,
    canHost: true,
    matchmaking: true,
    maxActiveEvents: Infinity,
    maxAttendeesPerEvent: Infinity,
    monthlyProfileViews: Infinity,
  },
  // Legacy tier from the old free-Founder era — treat as PRO.
  FOUNDER: {
    ...proCard,
    canHost: false,
    matchmaking: false,
    maxActiveEvents: 0,
    maxAttendeesPerEvent: 0,
    monthlyProfileViews: Infinity,
  },
};

export function entitlements(tier: UserTier): Entitlements {
  return TABLE[tier] ?? TABLE.FREE;
}

/**
 * Throw unless the tier has the boolean entitlement. No-op while
 * BILLING_ENABLED is off, so pre-billing everything stays free.
 */
export function requireEntitlement(tier: UserTier, key: BooleanEntitlement): void {
  if (!env.BILLING_ENABLED) return;
  if (!entitlements(tier)[key]) {
    throw new MembershipRequiredError('Upgrade your plan to use this feature');
  }
}

/** Load the user's tier and enforce. No DB hit while billing is off. */
export async function assertEntitled(userId: string, key: BooleanEntitlement): Promise<void> {
  if (!env.BILLING_ENABLED) return;
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { tier: true } });
  requireEntitlement(u?.tier ?? 'FREE', key);
}

// ponytail: self-check the tier ladder — run with `tsx entitlements.ts`.
if (require.main === module) {
  const assert = (c: boolean, m: string) => {
    if (!c) throw new Error(m);
  };
  assert(!entitlements('FREE').leadCapture, 'free must not have lead capture');
  assert(entitlements('PRO').leadCapture, 'pro must have lead capture');
  assert(!entitlements('PRO').canHost, 'pro is individual, cannot host');
  assert(entitlements('ORGANIZER_LITE').canHost, 'org lite can host');
  assert(entitlements('ORGANIZER_LITE').maxActiveEvents === 2, 'org lite caps at 2 events');
  assert(entitlements('ORGANIZER_PRO').maxActiveEvents === Infinity, 'org pro unlimited');
  assert(entitlements('FOUNDER').leadCapture, 'legacy founder == pro');
  // eslint-disable-next-line no-console
  console.log('entitlements ladder OK');
}
