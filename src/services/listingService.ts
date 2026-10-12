import type { Listing, Result } from '@/types';
import type { ListingPayload } from '@/lib/listingForm';
import { ACTIVE_STATUSES, inquiriesFor, isDeadlinePassed, reservedKg, reservedQty } from '@/lib/availability';
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

export function createListing(ownerId: string, payload: ListingPayload, publish: boolean): Result<Listing> {
  if (publish && !payload.acknowledgedRules) return fail('Setujui ketentuan barang terlarang terlebih dahulu.');
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
  const updated = {
    ...existing,
    ...payload,
    status: goingLive ? 'open' : existing.status,
    publishedAt: goingLive ? now : existing.publishedAt,
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
  const updated: Listing = { ...l, status: 'open', manuallyClosed: false, updatedAt: nowIso() };
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
