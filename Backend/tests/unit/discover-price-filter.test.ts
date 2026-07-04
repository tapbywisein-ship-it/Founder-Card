import { describe, it, expect } from '@jest/globals';
import { resolveTiers } from '../../src/utils/ticketPricing';

/**
 * Guards the Discover free/paid filter. The bug: the filter only checked the
 * scalar `ticketPrice` column, so multi-tier paid events (price stored inside
 * the `ticketTypes` JSON) were invisible under "Paid" and wrongly shown under
 * "Free". The fix classifies an event as paid iff any resolved tier costs > 0 —
 * the same shared `resolveTiers` logic the UI + payments use. This test locks
 * that predicate against the event shapes seen on the live Discover page.
 */

// Mirrors the service's inline predicate.
const isPaid = (e: { ticketPrice?: unknown; ticketTypes?: unknown }) =>
  resolveTiers(e).some((t) => t.price > 0);

describe('Discover free/paid classification', () => {
  it('classifies a multi-tier event (price in ticketTypes, ticketPrice null) as PAID', () => {
    // The regression case: cards show ₹500 (min positive tier) but ticketPrice is null.
    const event = {
      ticketPrice: null,
      ticketTypes: [
        { id: 'premium', name: 'Premium', price: 5000, isEnabled: true },
        { id: 'silver', name: 'Silver', price: 2000, isEnabled: true },
        { id: 'basic', name: 'Basic', price: 500, isEnabled: true },
      ],
    };
    expect(isPaid(event)).toBe(true);
  });

  it('classifies a single-price paid event (ticketPrice > 0, no tiers) as PAID', () => {
    expect(isPaid({ ticketPrice: 500, ticketTypes: null })).toBe(true);
  });

  it('classifies a free event (ticketPrice null/0, no tiers) as FREE', () => {
    expect(isPaid({ ticketPrice: null, ticketTypes: null })).toBe(false);
    expect(isPaid({ ticketPrice: 0, ticketTypes: [] })).toBe(false);
  });

  it('classifies an all-zero-tier event as FREE', () => {
    const event = {
      ticketPrice: null,
      ticketTypes: [{ id: 'ga', name: 'General', price: 0, isEnabled: true }],
    };
    expect(isPaid(event)).toBe(false);
  });

  it('ignores disabled tiers when deciding paid', () => {
    // Only the paid tier is disabled → the event is effectively free.
    const event = {
      ticketPrice: null,
      ticketTypes: [
        { id: 'ga', name: 'General', price: 0, isEnabled: true },
        { id: 'vip', name: 'VIP', price: 999, isEnabled: false },
      ],
    };
    expect(isPaid(event)).toBe(false);
  });

  it('handles Prisma Decimal-like string ticketPrice', () => {
    // Prisma returns Decimal for ticketPrice; resolveTiers coerces via Number().
    expect(isPaid({ ticketPrice: '500.00', ticketTypes: null })).toBe(true);
    expect(isPaid({ ticketPrice: '0.00', ticketTypes: null })).toBe(false);
  });
});
