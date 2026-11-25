import type { Inquiry, Listing, Review, ShoppingListing, User, WeightListing } from '@/types';

/**
 * v2: one-way bagasi, optional belanja dates and product fields, Australia corridor, star-only reviews.
 * v3: order lifecycle with holds, handover and payment records; provider verification; plans.
 * v4: new demo dataset (5 providers, 10 clients, one month of activity); older data is re-seeded once.
 * v5: two-way ratings and structured Bagasi requests in the seed (same one-time re-seed).
 */
export const SCHEMA_VERSION = 5;

/** Seed records added in v2. Merged into older data by id, never overwriting anything. */
export const V2_SEED_USER_IDS = ['u-dewi', 'u-andi'];
export const V2_SEED_LISTING_IDS = ['l-w9', 'l-w10', 'l-w11', 'l-s7'];

type Loose = Record<string, unknown>;

const isObj = (v: unknown): v is Loose => typeof v === 'object' && v !== null && !Array.isArray(v);
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/** Idempotent. Drops round-trip fields and makes belanja fields optional without losing user data. */
export function migrateListing(raw: Listing): Listing {
  if (!isObj(raw)) return raw;
  const l = { ...(raw as unknown as Loose) };
  delete l.returnDate;
  delete l.returnLegDropOff;
  if (l.type === 'shopping') {
    const s = l as unknown as ShoppingListing & Loose;
    if (!s.arrivalDate && typeof s.departureDate === 'string') s.arrivalDate = s.departureDate;
    s.products = (Array.isArray(s.products) ? s.products : []).map((p) => {
      const q = { ...(p as unknown as Loose) };
      if (!isNum(q.unitPrice) || q.unitPrice <= 0) delete q.unitPrice;
      if (typeof q.currency !== 'string' || !q.currency) delete q.currency;
      return q as unknown as ShoppingListing['products'][number];
    });
    return s as ShoppingListing;
  }
  return l as unknown as WeightListing;
}

/** Idempotent. Keeps valid star values and discards any free-text comment. */
export function migrateReview(raw: Review): Review | null {
  if (!isObj(raw)) return null;
  const r = { ...(raw as unknown as Loose) };
  delete r.comment;
  if (!Number.isInteger(r.rating) || (r.rating as number) < 1 || (r.rating as number) > 5) return null;
  return r as unknown as Review;
}

/** Idempotent. Gives v2 pending requests a fresh 24-hour hold instead of expiring them on upgrade. */
export function migrateInquiry(raw: Inquiry): Inquiry {
  if (!isObj(raw)) return raw;
  if (raw.status === 'pending' && !raw.holdExpiresAt) {
    return { ...raw, holdExpiresAt: new Date(Date.now() + 24 * 3_600_000).toISOString() };
  }
  if (raw.status === 'completed' && !raw.completedAt) return { ...raw, completedAt: raw.updatedAt };
  return raw;
}

/** Adds v3 seed fields (email, verified WhatsApp) to an existing seed user without overwriting edits. */
export function mergeSeedUser(user: User, seed: User | undefined): User {
  if (!seed) return user;
  return {
    ...user,
    email: user.email ?? seed.email,
    termsAcceptedAt: user.termsAcceptedAt ?? seed.termsAcceptedAt,
    phone: user.phone ?? seed.phone,
    phoneVerifiedAt: user.phoneVerifiedAt ?? seed.phoneVerifiedAt,
    providerSince: user.providerSince ?? seed.providerSince,
  };
}
