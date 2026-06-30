/**
 * Shared ticket-tier resolution used by the events + payments modules.
 * Normalizes the loosely-typed `ticketTypes` JSON column into a typed list and
 * derives whether an event offers a free entry path.
 */

export interface TicketTier {
  id: string;
  name: string;
  price: number;
  count?: number;
  benefits: string[];
  color?: string;
  isEnabled: boolean;
}

interface EventLike {
  ticketPrice?: unknown;
  ticketTypes?: unknown;
}

const toNumber = (v: unknown): number => {
  const n = Number(typeof v === 'object' && v !== null ? v.toString() : (v ?? 0));
  return Number.isFinite(n) ? n : 0;
};

/** Enabled tiers, or a single "General Admission" tier derived from ticketPrice. */
export function resolveTiers(event: EventLike): TicketTier[] {
  const raw = Array.isArray(event.ticketTypes)
    ? (event.ticketTypes as Record<string, unknown>[])
    : [];
  const tiers = raw
    .filter((t) => t && t.isEnabled !== false)
    .map((t) => ({
      id: String(t.id),
      name: String(t.name ?? 'Ticket'),
      price: toNumber(t.price),
      count: t.count != null ? toNumber(t.count) : undefined,
      benefits: Array.isArray(t.benefits) ? (t.benefits as unknown[]).map(String) : [],
      color: t.color != null ? String(t.color) : undefined,
      isEnabled: t.isEnabled !== false,
    }));
  if (tiers.length > 0) return tiers;
  return [
    {
      id: 'default',
      name: 'General Admission',
      price: toNumber(event.ticketPrice),
      benefits: [],
      isEnabled: true,
    },
  ];
}

export function findTier(event: EventLike, tierId: string): TicketTier | null {
  return resolveTiers(event).find((t) => t.id === tierId) ?? null;
}

/** True when at least one enabled tier is free (₹0) — i.e. registration needs no payment. */
export function hasFreeOption(event: EventLike): boolean {
  return resolveTiers(event).some((t) => (t.price ?? 0) <= 0);
}
