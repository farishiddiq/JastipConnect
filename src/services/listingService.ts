import type { Listing, Result } from '@/types';
import type { ListingPayload } from '@/lib/listingForm';
import { ACTIVE_STATUSES, effectiveStatus, inquiriesFor, isDeadlinePassed, reservedKg, reservedQty } from '@/lib/availability';
import { FREE_ACTIVE_TRIPS, isPro, slotCredits } from '@/lib/plans';
import { uuid } from '@/lib/utils';
import { store } from './store';
import { fail, makeNotification, nowIso, ok, SAVE_FAILED } from './helpers';

export function getListing(id: string): Listing | undefined {
  return store.getState().listings.find((l) => l.id === id);
}

function requireOwned(id: string, actorId: string): Result<Listing> {
  const listing = getListing(id);
  if (!listing) return fail('Listing tidak ditemukan.');
  if (listing.ownerId !== actorId) return fail('Hanya pemilik listing yang dapat melakukan aksi ini.');
  return ok(listing);
}

/** Server-side style invariants that must hold regardless of what the form allowed. */
function checkInventoryInvariants(existing: Listing, payload: ListingPayload): string | null {
  const { inquiries } = store.getState();
  if (existing.type !== payload.type) return 'Jenis listing tidak dapat diubah.';
  if (existing.type === 'weight' && payload.type === 'weight') {
    const reserved = reservedKg(existing, inquiries);
    if (payload.capacityKg < reserved) return `Kapasitas tidak boleh kurang dari ${reserved} kg yang sudah diterima.`;
  }
  if (existing.type === 'shopping' && payload.type === 'shopping') {
    const active = inquiriesFor(existing.id, inquiries).filter((i) => ACTIVE_STATUSES.includes(i.status));
    const lockedIds = new Set(active.flatMap((i) => (i.items ?? []).map((l) => l.productId)));
    for (const id of lockedIds) {
      const p = payload.products.find((x) => x.id === id);
      if (!p) return 'Produk yang sudah memiliki pesanan aktif tidak dapat dihapus.';
      const reserved = reservedQty(existing.id, id, inquiries);
      if (p.quantityAvailable < reserved) return `Stok "${p.name}" tidak boleh kurang dari ${reserved}.`;
    }
  }
  return null;
}

export const LIMIT_ERROR =
  'Akun gratis hanya bisa punya 1 trip aktif. Tutup trip lain, beli slot listing (Rp50.000), atau upgrade ke Jastiper Pro.';

export type PublishAllowance = { ok: true; usesCredit: boolean; pro: boolean; credits: number; freeUsed: number } | { ok: false; error: string; credits: number; freeUsed: number };

/** Free providers get one active trip. Pro is unlimited; extra trips use non-frequent flyer credits. */
export function publishAllowance(ownerId: string, excludeListingId?: string): PublishAllowance {
  const { users, listings, inquiries, purchases } = store.getState();
  const owner = users.find((u) => u.id === ownerId);
  const credits = slotCredits(purchases, listings, ownerId);
  const live = listings.filter((l) => l.ownerId === ownerId && l.id !== excludeListingId && ['open', 'full'].includes(effectiveStatus(l, inquiries)));
  const freeUsed = live.filter((l) => !l.paidSlot).length;
  if (!owner?.phoneVerifiedAt) return { ok: false, error: 'Aktifkan mode provider dan verifikasi WhatsApp sebelum posting.', credits, freeUsed };
  if (isPro(purchases, ownerId)) return { ok: true, usesCredit: false, pro: true, credits, freeUsed };
  if (freeUsed < FREE_ACTIVE_TRIPS) return { ok: true, usesCredit: false, pro: false, credits, freeUsed };
  if (credits > 0) return { ok: true, usesCredit: true, pro: false, credits, freeUsed };
  return { ok: false, error: LIMIT_ERROR, credits, freeUsed };
}

export function createListing(ownerId: string, payload: ListingPayload, publish: boolean): Result<Listing> {
  if (publish && !payload.acknowledgedRules) return fail('Setujui ketentuan barang terlarang terlebih dahulu.');
  const allowance = publish ? publishAllowance(ownerId) : null;
  if (allowance && !allowance.ok) return fail(allowance.error);
  const now = nowIso();
  const listing = {
    ...payload,
    id: uuid(),
    ownerId,
    status: publish ? 'open' : 'draft',
    viewCount: 0,
    createdAt: now,
    updatedAt: now,
    publishedAt: publish ? now : undefined,
    paidSlot: allowance?.ok && allowance.usesCredit ? true : undefined,
  } as Listing;
  return store.set('listings', (prev) => [listing, ...prev]) ? ok(listing) : fail(SAVE_FAILED);
}

export function updateListing(id: string, actorId: string, payload: ListingPayload, publish: boolean): Result<Listing> {
  const owned = requireOwned(id, actorId);
  if (!owned.ok) return owned;
  const existing = owned.data;
  if (publish && !payload.acknowledgedRules) return fail('Setujui ketentuan barang terlarang terlebih dahulu.');
  const invariant = checkInventoryInvariants(existing, payload);
  if (invariant) return fail(invariant);

  const now = nowIso();
  const goingLive = existing.status === 'draft' && publish;
  const allowance = goingLive ? publishAllowance(actorId, id) : null;
  if (allowance && !allowance.ok) return fail(allowance.error);
  const updated = {
    ...existing,
    ...payload,
    status: goingLive ? 'open' : existing.status,
    publishedAt: goingLive ? now : existing.publishedAt,
    paidSlot: existing.paidSlot || (allowance?.ok && allowance.usesCredit) || undefined,
    updatedAt: now,
  } as Listing;
  return store.set('listings', (prev) => prev.map((l) => (l.id === id ? updated : l))) ? ok(updated) : fail(SAVE_FAILED);
}

export function closeListing(id: string, actorId: string): Result<Listing> {
  const owned = requireOwned(id, actorId);
  if (!owned.ok) return owned;
  const updated: Listing = { ...owned.data, status: 'closed', manuallyClosed: true, updatedAt: nowIso() };
  return store.set('listings', (prev) => prev.map((l) => (l.id === id ? updated : l))) ? ok(updated) : fail(SAVE_FAILED);
}

export function reopenListing(id: string, actorId: string): Result<Listing> {
  const owned = requireOwned(id, actorId);
  if (!owned.ok) return owned;
  const l = owned.data;
  if (l.closedByAdmin) return fail('Listing ini ditutup oleh moderator dan tidak dapat dibuka kembali oleh pemilik.');
  if (isDeadlinePassed(l)) return fail('Batas titip/pesan sudah lewat. Edit tanggal terlebih dahulu sebelum membuka kembali.');
  const allowance = l.paidSlot ? null : publishAllowance(actorId, id);
  if (allowance && !allowance.ok) return fail(allowance.error);
  const updated: Listing = {
    ...l,
    status: 'open',
    manuallyClosed: false,
    paidSlot: l.paidSlot || (allowance?.ok && allowance.usesCredit) || undefined,
    updatedAt: nowIso(),
  };
  return store.set('listings', (prev) => prev.map((x) => (x.id === id ? updated : x))) ? ok(updated) : fail(SAVE_FAILED);
}

export function deleteDraft(id: string, actorId: string): Result<void> {
  const owned = requireOwned(id, actorId);
  if (!owned.ok) return owned;
  if (owned.data.status !== 'draft') return fail('Hanya draf yang dapat dihapus. Tutup listing yang sudah terbit.');
  return store.set('listings', (prev) => prev.filter((l) => l.id !== id)) ? ok(undefined) : fail(SAVE_FAILED);
}

/** Demo admin moderation: unpublish a listing and notify the owner. */
export function adminCloseListing(id: string, reason: string): Result<void> {
  const l = getListing(id);
  if (!l) return fail('Listing tidak ditemukan.');
  const ok1 = store.transaction({
    listings: (prev) =>
      prev.map((x) => (x.id === id ? { ...x, status: 'closed', manuallyClosed: true, closedByAdmin: true, updatedAt: nowIso() } : x)),
    notifications: (prev) => [
      makeNotification(l.ownerId, 'Listing ditutup moderator', `"${l.title}" ditutup oleh moderator demo. Alasan: ${reason}`, `/listings/${l.id}`),
      ...prev,
    ],
  });
  return ok1 ? ok(undefined) : fail(SAVE_FAILED);
}

export function adminRestoreListing(id: string): Result<void> {
  const l = getListing(id);
  if (!l) return fail('Listing tidak ditemukan.');
  const ok1 = store.set('listings', (prev) =>
    prev.map((x) => (x.id === id ? { ...x, closedByAdmin: false, updatedAt: nowIso() } : x)),
  );
  return ok1 ? ok(undefined) : fail(SAVE_FAILED);
}

/** Local demo view counter (once per page session per listing). */
const viewed = new Set<string>();
export function recordView(id: string, viewerId: string | null) {
  if (viewed.has(id)) return;
  viewed.add(id);
  const l = getListing(id);
  if (!l || l.ownerId === viewerId) return;
  store.set('listings', (prev) => prev.map((x) => (x.id === id ? { ...x, viewCount: (x.viewCount ?? 0) + 1 } : x)));
}

/** Owner uploads a ticket / boarding pass. A moderator reviews it before the badge shows. */
export function submitTicketProof(id: string, actorId: string, imageUrl: string): Result<Listing> {
  const owned = requireOwned(id, actorId);
  if (!owned.ok) return owned;
  if (!imageUrl) return fail('Pilih foto tiket atau boarding pass.');
  const updated: Listing = { ...owned.data, ticketProof: { imageUrl, uploadedAt: nowIso(), status: 'pending' }, updatedAt: nowIso() };
  const admins = store.getState().users.filter((u) => u.role === 'admin');
  const saved = store.transaction({
    listings: (prev) => prev.map((l) => (l.id === id ? updated : l)),
    notifications: (prev) => [
      ...admins.map((a) => makeNotification(a.id, 'Bukti tiket baru', `"${owned.data.title}" menunggu verifikasi tiket.`, '/admin?tab=tickets')),
      ...prev,
    ],
  });
  return saved ? ok(updated) : fail(SAVE_FAILED);
}

export function reviewTicketProof(id: string, approve: boolean, note?: string): Result<void> {
  const l = getListing(id);
  if (!l?.ticketProof) return fail('Bukti tiket tidak ditemukan.');
  const proof = { ...l.ticketProof, status: approve ? 'approved' : 'rejected', reviewedAt: nowIso(), note: note?.trim() || undefined } as const;
  const saved = store.transaction({
    listings: (prev) => prev.map((x) => (x.id === id ? { ...x, ticketProof: proof } : x)),
    notifications: (prev) => [
      makeNotification(
        l.ownerId,
        approve ? 'Trip terverifikasi' : 'Bukti tiket ditolak',
        approve ? `"${l.title}" kini memakai badge Trip terverifikasi.` : `Bukti tiket untuk "${l.title}" ditolak.${note ? ` Catatan: ${note}` : ''} Unggah ulang yang jelas.`,
        `/listings/${l.id}`,
      ),
      ...prev,
    ],
  });
  return saved ? ok(undefined) : fail(SAVE_FAILED);
}
