import type { Listing, PaymentMethod, PlanKind, Purchase } from '@/types';

export type PlanMeta = {
  kind: PlanKind;
  name: string;
  priceIdr: number;
  unit: string;
  /** Days the plan stays active, if it expires. */
  days?: number;
  /** Extra listing slots granted (non-frequent flyer). */
  credits?: number;
  needsListing?: boolean;
  summary: string;
  perks: string[];
};

export const FREE_ACTIVE_TRIPS = 1;

export const PLANS: Record<PlanKind, PlanMeta> = {
  boost: {
    kind: 'boost',
    name: 'Featured trip',
    priceIdr: 25_000,
    unit: 'per listing',
    days: 7,
    needsListing: true,
    summary: 'Naikkan satu trip ke urutan teratas selama 7 hari.',
    perks: ['Urutan teratas di Jelajahi dan beranda', 'Badge "Unggulan" di kartu trip', 'Aktif 7 hari'],
  },
  nff_single: {
    kind: 'nff_single',
    name: 'Slot listing',
    priceIdr: 50_000,
    unit: 'per listing',
    credits: 1,
    summary: 'Untuk yang jarang terbang: tambah 1 trip aktif tanpa langganan.',
    perks: ['1 trip aktif tambahan', 'Tidak kedaluwarsa sampai dipakai', 'Order tetap tanpa batas'],
  },
  nff_block: {
    kind: 'nff_block',
    name: 'Blok 5 listing',
    priceIdr: 200_000,
    unit: '5 listing',
    credits: 5,
    summary: 'Hemat Rp50.000 untuk 5 slot trip tambahan.',
    perks: ['5 trip aktif tambahan', 'Rp40.000 per listing', 'Tidak kedaluwarsa sampai dipakai'],
  },
  pro: {
    kind: 'pro',
    name: 'Jastiper Pro',
    priceIdr: 99_000,
    unit: 'per bulan',
    days: 30,
    summary: 'Trip aktif tanpa batas untuk jastiper rutin.',
    perks: ['Trip aktif tanpa batas', 'Badge Pro di profil dan trip', 'Statistik listing dan order'],
  },
  promoted: {
    kind: 'promoted',
    name: 'Promoted jastiper',
    priceIdr: 150_000,
    unit: 'per bulan',
    days: 30,
    summary: 'Profil Anda tampil di "Jastiper Pilihan" di beranda.',
    perks: ['Tampil di section Jastiper Pilihan', 'Prioritas urutan di Jelajahi', 'Aktif 30 hari'],
  },
};

export const PLAN_ORDER: PlanKind[] = ['boost', 'nff_single', 'nff_block', 'pro', 'promoted'];

export const PAYMENT_METHODS: { value: PaymentMethod; label: string; hint: string }[] = [
  { value: 'qris', label: 'QRIS', hint: 'GoPay, OVO, DANA, m-banking' },
  { value: 'va', label: 'Virtual Account', hint: 'BCA, Mandiri, BNI, BRI' },
  { value: 'card', label: 'Kartu kredit/debit', hint: 'Visa, Mastercard' },
];

const active = (p: Purchase, now: number) => !p.expiresAt || new Date(p.expiresAt).getTime() > now;

export function activePurchase(purchases: Purchase[], userId: string, kind: PlanKind, now = Date.now()): Purchase | undefined {
  return purchases
    .filter((p) => p.userId === userId && p.kind === kind && active(p, now))
    .sort((a, b) => (b.expiresAt ?? '').localeCompare(a.expiresAt ?? ''))[0];
}

export const isPro = (purchases: Purchase[], userId: string, now = Date.now()) => !!activePurchase(purchases, userId, 'pro', now);
export const isPromoted = (purchases: Purchase[], userId: string, now = Date.now()) => !!activePurchase(purchases, userId, 'promoted', now);

export function featuredUntil(purchases: Purchase[], listingId: string, now = Date.now()): string | undefined {
  return purchases
    .filter((p) => p.kind === 'boost' && p.listingId === listingId && active(p, now))
    .map((p) => p.expiresAt!)
    .sort()
    .pop();
}

/** Slot credits bought minus slots already used by listings. */
export function slotCredits(purchases: Purchase[], listings: Listing[], userId: string): number {
  const bought = purchases.filter((p) => p.userId === userId && p.credits).reduce((s, p) => s + (p.credits ?? 0), 0);
  const used = listings.filter((l) => l.ownerId === userId && l.paidSlot).length;
  return Math.max(0, bought - used);
}

/** Expiry for a new purchase, extending an active plan of the same kind instead of overlapping it. */
export function nextExpiry(purchases: Purchase[], userId: string, kind: PlanKind, listingId?: string, now = Date.now()): string | undefined {
  const days = PLANS[kind].days;
  if (!days) return undefined;
  const current =
    kind === 'boost' ? featuredUntil(purchases, listingId ?? '', now) : activePurchase(purchases, userId, kind, now)?.expiresAt;
  const start = current ? Math.max(now, new Date(current).getTime()) : now;
  return new Date(start + days * 86_400_000).toISOString();
}
