import type { Currency, Inquiry, InquiryStatus, Listing, ListingStatus, Product, ShoppingListing, WeightListing } from '@/types';
import { daysUntil } from './dates';

/** Inquiry states that consume capacity / stock. Pending does not reserve. */
export const RESERVING_STATUSES: InquiryStatus[] = ['accepted', 'completed'];
/** Inquiry states that are still "in flight" and block destructive edits. */
export const ACTIVE_STATUSES: InquiryStatus[] = ['pending', 'accepted', 'completed'];

const reserves = (i: Inquiry) => RESERVING_STATUSES.includes(i.status);

export function inquiriesFor(listingId: string, inquiries: Inquiry[]): Inquiry[] {
  return inquiries.filter((i) => i.listingId === listingId);
}

export function reservedKg(listing: WeightListing, inquiries: Inquiry[]): number {
  return inquiriesFor(listing.id, inquiries)
    .filter(reserves)
    .reduce((sum, i) => sum + (i.requestedKg ?? 0), 0);
}

export function remainingKg(listing: WeightListing, inquiries: Inquiry[]): number {
  return Math.max(0, round1(listing.capacityKg - reservedKg(listing, inquiries)));
}

export function reservedQty(listingId: string, productId: string, inquiries: Inquiry[]): number {
  return inquiriesFor(listingId, inquiries)
    .filter(reserves)
    .flatMap((i) => i.items ?? [])
    .filter((l) => l.productId === productId)
    .reduce((s, l) => s + l.quantity, 0);
}

export function remainingQty(listingId: string, product: Product, inquiries: Inquiry[]): number {
  return Math.max(0, product.quantityAvailable - reservedQty(listingId, product.id, inquiries));
}

export type ProductAvailability = { product: Product; reserved: number; remaining: number };

export function productAvailability(listing: ShoppingListing, inquiries: Inquiry[]): ProductAvailability[] {
  return listing.products.map((p) => {
    const reserved = reservedQty(listing.id, p.id, inquiries);
    return { product: p, reserved, remaining: Math.max(0, p.quantityAvailable - reserved) };
  });
}

export function isSoldOut(listing: ShoppingListing, inquiries: Inquiry[]): boolean {
  return productAvailability(listing, inquiries).every((a) => a.remaining <= 0);
}

export function isDeadlinePassed(listing: Listing): boolean {
  return daysUntil(listing.orderDeadline) < 0;
}

/**
 * Effective status, derived from stored base status + inquiries + dates.
 * Precedence: draft > closed > expired > full > open.
 * A manually closed listing is never silently reopened.
 */
export function effectiveStatus(listing: Listing, inquiries: Inquiry[]): ListingStatus {
  if (listing.status === 'draft') return 'draft';
  if (listing.status === 'closed' || listing.manuallyClosed) return 'closed';
  if (isDeadlinePassed(listing)) return 'expired';
  if (listing.type === 'weight' && remainingKg(listing, inquiries) <= 0) return 'full';
  if (listing.type === 'shopping' && isSoldOut(listing, inquiries)) return 'full';
  return 'open';
}

export type AvailabilitySummary =
  | { type: 'weight'; total: number; reserved: number; remaining: number; ratio: number }
  | { type: 'shopping'; total: number; reserved: number; remaining: number; ratio: number; productsLeft: number };

export function availabilitySummary(listing: Listing, inquiries: Inquiry[]): AvailabilitySummary {
  if (listing.type === 'weight') {
    const reserved = reservedKg(listing, inquiries);
    const remaining = remainingKg(listing, inquiries);
    return { type: 'weight', total: listing.capacityKg, reserved, remaining, ratio: listing.capacityKg ? reserved / listing.capacityKg : 0 };
  }
  const av = productAvailability(listing, inquiries);
  const total = av.reduce((s, a) => s + a.product.quantityAvailable, 0);
  const reserved = av.reduce((s, a) => s + Math.min(a.reserved, a.product.quantityAvailable), 0);
  return {
    type: 'shopping',
    total,
    reserved,
    remaining: av.reduce((s, a) => s + a.remaining, 0),
    ratio: total ? reserved / total : 0,
    productsLeft: av.filter((a) => a.remaining > 0).length,
  };
}

/** Reference price for sorting/filtering: fee per kg, or the cheapest product in listing currency. */
export function referencePrice(listing: Listing): { amount: number; currency: Currency } {
  if (listing.type === 'weight') return { amount: listing.pricePerKg, currency: listing.currency };
  const sameCur = listing.products.filter((p) => p.currency === listing.currency);
  const pool = sameCur.length ? sameCur : listing.products;
  if (!pool.length) return { amount: 0, currency: listing.currency };
  const min = pool.reduce((a, b) => (a.unitPrice <= b.unitPrice ? a : b));
  return { amount: min.unitPrice, currency: min.currency };
}

export function inquiryTotals(inquiry: Inquiry, listing: Listing | undefined): Partial<Record<Currency, number>> {
  if (!listing) return {};
  if (listing.type === 'weight') {
    return { [listing.currency]: round2((inquiry.requestedKg ?? 0) * listing.pricePerKg) };
  }
  const totals: Partial<Record<Currency, number>> = {};
  for (const line of inquiry.items ?? []) {
    const p = listing.products.find((x) => x.id === line.productId);
    const cur = p?.currency ?? listing.currency;
    totals[cur] = round2((totals[cur] ?? 0) + line.quantity * line.unitPriceSnapshot);
  }
  return totals;
}

export const round1 = (n: number) => Math.round(n * 10) / 10;
export const round2 = (n: number) => Math.round(n * 100) / 100;
