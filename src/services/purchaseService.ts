import type { PartnerLead, PaymentMethod, PlanKind, Purchase, Result } from '@/types';
import { nextExpiry, PLANS } from '@/lib/plans';
import { effectiveStatus } from '@/lib/availability';
import { formatMoney } from '@/lib/format';
import { uuid } from '@/lib/utils';
import { store } from './store';
import { fail, makeNotification, nowIso, ok, SAVE_FAILED } from './helpers';

/** Simulated checkout: records the plan and activates it. No money moves and nothing is charged. */
export function purchasePlan(userId: string, kind: PlanKind, method: PaymentMethod, listingId?: string): Result<Purchase> {
  const { users, listings, inquiries, purchases } = store.getState();
  const user = users.find((u) => u.id === userId);
  if (!user) return fail('Masuk dulu untuk membeli paket.');
  if (!user.phoneVerifiedAt) return fail('Paket hanya untuk akun provider. Aktifkan mode provider dulu.');
  const plan = PLANS[kind];
  if (!plan) return fail('Paket tidak dikenal.');
  if (plan.needsListing) {
    const l = listings.find((x) => x.id === listingId);
    if (!l || l.ownerId !== userId) return fail('Pilih trip milik Anda yang ingin di-boost.');
    if (effectiveStatus(l, inquiries) !== 'open') return fail('Hanya trip yang sedang buka yang bisa di-boost.');
  }
  const purchase: Purchase = {
    id: uuid(),
    userId,
    kind,
    listingId: plan.needsListing ? listingId : undefined,
    amountIdr: plan.priceIdr,
    method,
    createdAt: nowIso(),
    expiresAt: nextExpiry(purchases, userId, kind, listingId),
    credits: plan.credits,
  };
  const saved = store.transaction({
    purchases: (prev) => [purchase, ...prev],
    notifications: (prev) => [
      makeNotification(userId, `${plan.name} aktif`, `Pembayaran simulasi ${formatMoney(plan.priceIdr, 'IDR')} berhasil. Tidak ada tagihan sungguhan.`, '/profile#paket'),
      ...prev,
    ],
  });
  return saved ? ok(purchase) : fail(SAVE_FAILED);
}

export function submitPartnerLead(input: { userId?: string; name: string; brand: string; contact: string; message: string }): Result<PartnerLead> {
  if (input.name.trim().length < 2) return fail('Isi nama Anda.');
  if (input.brand.trim().length < 2) return fail('Isi nama brand atau perusahaan.');
  if (input.contact.trim().length < 5) return fail('Isi email atau nomor yang bisa dihubungi.');
  if (input.message.trim().length < 10) return fail('Ceritakan singkat rencana kerja samanya.');
  const lead: PartnerLead = {
    id: uuid(),
    userId: input.userId,
    name: input.name.trim(),
    brand: input.brand.trim(),
    contact: input.contact.trim(),
    message: input.message.trim().slice(0, 800),
    status: 'new',
    createdAt: nowIso(),
  };
  return store.set('leads', (prev) => [lead, ...prev]) ? ok(lead) : fail(SAVE_FAILED);
}

export function markLeadContacted(id: string): Result<void> {
  return store.set('leads', (prev) => prev.map((l) => (l.id === id ? { ...l, status: 'contacted' as const } : l))) ? ok(undefined) : fail(SAVE_FAILED);
}
