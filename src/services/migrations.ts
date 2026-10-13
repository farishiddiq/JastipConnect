import type { Listing, Review, ShoppingListing, WeightListing } from '@/types';

/** v2: one-way bagasi, optional belanja dates and product fields, Australia corridor, star-only reviews. */
export const SCHEMA_VERSION = 2;

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
