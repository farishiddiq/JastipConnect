import type { Conversation, Inquiry, InquiryLine, Message, Result, ShoppingListing, WeightListing } from '@/types';
import { effectiveStatus, remainingKg, remainingQty, round1 } from '@/lib/availability';
import { formatKg } from '@/lib/format';
import { uuid } from '@/lib/utils';
import { store } from './store';
import { fail, makeNotification, makeSystemMessage, nowIso, ok, SAVE_FAILED } from './helpers';

function nameOf(userId: string) {
  return store.getState().users.find((u) => u.id === userId)?.displayName ?? 'Pengguna';
}

function conversationFor(inquiryId: string): Conversation | undefined {
  return store.getState().conversations.find((c) => c.inquiryId === inquiryId);
}

const STATUS_BLOCK_MESSAGE: Record<string, string> = {
  closed: 'Listing ini sudah ditutup oleh penyedia.',
  full: 'Kuota/stok listing ini sudah habis.',
  expired: 'Batas waktu titip/pesan untuk listing ini sudah lewat.',
  draft: 'Listing ini belum diterbitkan.',
};

type CreateResult = Result<{ inquiry: Inquiry; conversationId: string }>;

function persistNewInquiry(inquiry: Inquiry, openingMessage: string, notifyTitle: string, notifyBody: string): CreateResult {
  const conversation: Conversation = {
    id: uuid(),
    inquiryId: inquiry.id,
    participantIds: [inquiry.buyerId, inquiry.providerId],
    createdAt: inquiry.createdAt,
  };
  const message: Message = {
    id: uuid(),
    conversationId: conversation.id,
    senderId: inquiry.buyerId,
    body: openingMessage,
    createdAt: inquiry.createdAt,
    readByIds: [inquiry.buyerId],
  };
  const saved = store.transaction({
    inquiries: (prev) => [inquiry, ...prev],
    conversations: (prev) => [conversation, ...prev],
    messages: (prev) => [...prev, message],
    notifications: (prev) => [makeNotification(inquiry.providerId, notifyTitle, notifyBody, `/inbox/${conversation.id}`), ...prev],
  });
  return saved ? ok({ inquiry, conversationId: conversation.id }) : fail(SAVE_FAILED);
}

export function createWeightInquiry(
  buyerId: string,
  listingId: string,
  input: { requestedKg: number; itemDescription: string; note?: string },
): CreateResult {
  const { listings, inquiries } = store.getState();
  const listing = listings.find((l) => l.id === listingId);
  if (!listing || listing.type !== 'weight') return fail('Listing tidak ditemukan.');
  if (listing.ownerId === buyerId) return fail('Anda tidak dapat mengajukan inquiry ke listing sendiri.');
  const status = effectiveStatus(listing, inquiries);
  if (status !== 'open') return fail(STATUS_BLOCK_MESSAGE[status] ?? 'Listing tidak menerima inquiry.');
  const kg = round1(input.requestedKg);
  if (!(kg > 0)) return fail('Berat titipan harus lebih dari 0 kg.');
  const remaining = remainingKg(listing, inquiries);
  if (kg > remaining) return fail(`Sisa kuota hanya ${formatKg(remaining)}.`);
  if (input.itemDescription.trim().length < 3) return fail('Jelaskan barang yang ingin dititipkan.');

  const now = nowIso();
  const inquiry: Inquiry = {
    id: uuid(),
    listingId,
    buyerId,
    providerId: listing.ownerId,
    status: 'pending',
    requestedKg: kg,
    itemDescription: input.itemDescription.trim(),
    note: input.note?.trim() || undefined,
    createdAt: now,
    updatedAt: now,
  };
  const opening = [
    `Halo, saya ingin titip ${formatKg(kg)}.`,
    `Barang: ${inquiry.itemDescription}`,
    inquiry.note ? `Catatan: ${inquiry.note}` : '',
  ]
    .filter(Boolean)
    .join('\n');
  return persistNewInquiry(inquiry, opening, 'Inquiry baru', `${nameOf(buyerId)} ingin titip ${formatKg(kg)} di "${listing.title}".`);
}

export function createShoppingInquiry(
  buyerId: string,
  listingId: string,
  input: { items: { productId: string; quantity: number }[]; note?: string },
): CreateResult {
  const { listings, inquiries } = store.getState();
  const listing = listings.find((l) => l.id === listingId);
  if (!listing || listing.type !== 'shopping') return fail('Listing tidak ditemukan.');
  if (listing.ownerId === buyerId) return fail('Anda tidak dapat memesan dari listing sendiri.');
  const status = effectiveStatus(listing, inquiries);
  if (status !== 'open') return fail(STATUS_BLOCK_MESSAGE[status] ?? 'Listing tidak menerima pesanan.');

  const lines: InquiryLine[] = [];
  for (const { productId, quantity } of input.items) {
    if (quantity <= 0) continue;
    const p = listing.products.find((x) => x.id === productId);
    if (!p) return fail('Produk tidak ditemukan.');
    if (!Number.isInteger(quantity)) return fail('Jumlah harus bilangan bulat.');
    const rem = remainingQty(listing.id, p, inquiries);
    if (quantity > rem) return fail(`Stok "${p.name}" tersisa ${rem}.`);
    lines.push({ productId, quantity, unitPriceSnapshot: p.unitPrice });
  }
  if (!lines.length) return fail('Pilih minimal satu produk.');

  const now = nowIso();
  const inquiry: Inquiry = {
    id: uuid(),
    listingId,
    buyerId,
    providerId: listing.ownerId,
    status: 'pending',
    items: lines,
    note: input.note?.trim() || undefined,
    createdAt: now,
    updatedAt: now,
  };
  const itemsText = lines
    .map((l) => `• ${listing.products.find((p) => p.id === l.productId)?.name} × ${l.quantity}`)
    .join('\n');
  const opening = ['Halo, saya ingin memesan:', itemsText, inquiry.note ? `Catatan: ${inquiry.note}` : '']
    .filter(Boolean)
    .join('\n');
  return persistNewInquiry(
    inquiry,
    opening,
    'Pesanan baru',
    `${nameOf(buyerId)} memesan ${lines.length} produk di "${listing.title}".`,
  );
}

function transition(
  inquiryId: string,
  patch: Partial<Inquiry>,
  systemText: string,
  notify: { userId: string; title: string; body: string } | null,
): Result<Inquiry> {
  const inquiry = store.getState().inquiries.find((i) => i.id === inquiryId);
  if (!inquiry) return fail('Inquiry tidak ditemukan.');
  const conv = conversationFor(inquiryId);
  const updated: Inquiry = { ...inquiry, ...patch, updatedAt: nowIso() };
  const saved = store.transaction({
    inquiries: (prev) => prev.map((i) => (i.id === inquiryId ? updated : i)),
    ...(conv ? { messages: (prev: Message[]) => [...prev, makeSystemMessage(conv.id, systemText)] } : {}),
    ...(notify
      ? {
          notifications: (prev) => [
            makeNotification(notify.userId, notify.title, notify.body, conv ? `/inbox/${conv.id}` : '/inbox'),
            ...prev,
          ],
        }
      : {}),
  });
  return saved ? ok(updated) : fail(SAVE_FAILED);
}

/**
 * Accepting re-checks capacity/stock against the latest state and reserves it in the same
 * synchronous update, so two accepts can never oversell within this browser.
 */
export function acceptInquiry(inquiryId: string, actorId: string): Result<Inquiry> {
  const { inquiries, listings } = store.getState();
  const inquiry = inquiries.find((i) => i.id === inquiryId);
  if (!inquiry) return fail('Inquiry tidak ditemukan.');
  if (inquiry.providerId !== actorId) return fail('Hanya penyedia yang dapat menerima inquiry.');
  if (inquiry.status !== 'pending') return fail('Inquiry ini sudah diproses.');
  const listing = listings.find((l) => l.id === inquiry.listingId);
  if (!listing) return fail('Listing tidak ditemukan.');

  let summary = '';
  if (listing.type === 'weight') {
    const rem = remainingKg(listing as WeightListing, inquiries);
    const kg = inquiry.requestedKg ?? 0;
    if (kg > rem) return fail(`Kuota tidak cukup. Diminta ${formatKg(kg)}, sisa ${formatKg(rem)}.`);
    summary = `${formatKg(kg)} sudah direservasi.`;
  } else {
    const shop = listing as ShoppingListing;
    for (const line of inquiry.items ?? []) {
      const p = shop.products.find((x) => x.id === line.productId);
      if (!p) return fail('Salah satu produk sudah dihapus dari listing.');
      const rem = remainingQty(shop.id, p, inquiries);
      if (line.quantity > rem) return fail(`Stok "${p.name}" tidak cukup. Diminta ${line.quantity}, sisa ${rem}.`);
    }
    summary = 'Stok produk sudah direservasi.';
  }
  return transition(inquiryId, { status: 'accepted' }, `Inquiry diterima oleh penyedia. ${summary}`, {
    userId: inquiry.buyerId,
    title: 'Inquiry diterima',
    body: `${nameOf(actorId)} menerima inquiry Anda untuk "${listing.title}".`,
  });
}

export function declineInquiry(inquiryId: string, actorId: string): Result<Inquiry> {
  const inquiry = store.getState().inquiries.find((i) => i.id === inquiryId);
  if (!inquiry) return fail('Inquiry tidak ditemukan.');
  if (inquiry.providerId !== actorId) return fail('Hanya penyedia yang dapat menolak inquiry.');
  if (inquiry.status !== 'pending') return fail('Hanya inquiry yang menunggu yang dapat ditolak.');
  return transition(inquiryId, { status: 'declined' }, 'Inquiry ditolak oleh penyedia.', {
    userId: inquiry.buyerId,
    title: 'Inquiry ditolak',
    body: `${nameOf(actorId)} menolak inquiry Anda.`,
  });
}

export function cancelInquiry(inquiryId: string, actorId: string): Result<Inquiry> {
  const inquiry = store.getState().inquiries.find((i) => i.id === inquiryId);
  if (!inquiry) return fail('Inquiry tidak ditemukan.');
  if (inquiry.buyerId !== actorId) return fail('Hanya pembeli yang dapat membatalkan inquiry.');
  if (inquiry.status !== 'pending' && inquiry.status !== 'accepted')
    return fail('Inquiry ini tidak dapat dibatalkan lagi.');
  const released = inquiry.status === 'accepted' ? ' Kuota/stok yang direservasi telah dilepas.' : '';
  return transition(inquiryId, { status: 'cancelled' }, `Inquiry dibatalkan oleh pembeli.${released}`, {
    userId: inquiry.providerId,
    title: 'Inquiry dibatalkan',
    body: `${nameOf(actorId)} membatalkan inquiry.`,
  });
}

/** Completion needs confirmation from both buyer and provider. */
export function confirmCompletion(inquiryId: string, actorId: string): Result<Inquiry> {
  const inquiry = store.getState().inquiries.find((i) => i.id === inquiryId);
  if (!inquiry) return fail('Inquiry tidak ditemukan.');
  if (inquiry.status !== 'accepted') return fail('Hanya inquiry yang diterima yang dapat diselesaikan.');
  const isBuyer = inquiry.buyerId === actorId;
  const isProvider = inquiry.providerId === actorId;
  if (!isBuyer && !isProvider) return fail('Anda bukan peserta inquiry ini.');
  if ((isBuyer && inquiry.buyerConfirmedComplete) || (isProvider && inquiry.providerConfirmedComplete))
    return fail('Anda sudah mengonfirmasi. Menunggu pihak lain.');

  const patch: Partial<Inquiry> = isBuyer ? { buyerConfirmedComplete: true } : { providerConfirmedComplete: true };
  const bothDone = (isBuyer || inquiry.buyerConfirmedComplete) && (isProvider || inquiry.providerConfirmedComplete);
  const other = isBuyer ? inquiry.providerId : inquiry.buyerId;
  if (bothDone) {
    return transition(inquiryId, { ...patch, status: 'completed' }, 'Kedua pihak telah mengonfirmasi. Transaksi selesai.', {
      userId: other,
      title: 'Transaksi selesai',
      body: isProvider ? 'Transaksi selesai. Yuk beri ulasan untuk penyedia!' : 'Pembeli mengonfirmasi transaksi selesai.',
    });
  }
  return transition(
    inquiryId,
    patch,
    `${nameOf(actorId)} mengonfirmasi transaksi selesai. Menunggu konfirmasi ${isBuyer ? 'penyedia' : 'pembeli'}.`,
    { userId: other, title: 'Konfirmasi selesai', body: `${nameOf(actorId)} menandai transaksi selesai. Mohon konfirmasi.` },
  );
}
