import type { Conversation, Currency, DeclaredItem, Inquiry, InquiryLine, Message, Result, ShoppingListing, WeightListing } from '@/types';
import {
  effectiveStatus,
  inquiryTotals,
  orderKg,
  PENDING_HOLD_HOURS,
  remainingKg,
  remainingQty,
  round1,
  round2,
} from '@/lib/availability';
import { daysUntil } from '@/lib/dates';
import { formatKg, formatMoney } from '@/lib/format';
import { uuid } from '@/lib/utils';
import { store } from './store';
import { fail, makeNotification, makeSystemMessage, nowIso, ok, SAVE_FAILED } from './helpers';

function nameOf(userId: string) {
  return store.getState().users.find((u) => u.id === userId)?.displayName ?? 'Pengguna';
}

function conversationFor(inquiryId: string): Conversation | undefined {
  return store.getState().conversations.find((c) => c.inquiryId === inquiryId);
}

export const orderLink = (inquiryId: string) => `/orders/${inquiryId}`;

const STATUS_BLOCK_MESSAGE: Record<string, string> = {
  closed: 'Listing ini sudah ditutup oleh penyedia.',
  full: 'Kuota/stok listing ini sudah habis.',
  expired: 'Batas waktu titip/pesan untuk listing ini sudah lewat.',
  draft: 'Listing ini belum diterbitkan.',
};

const holdUntil = () => new Date(Date.now() + PENDING_HOLD_HOURS * 3_600_000).toISOString();

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
  const holdNote = makeSystemMessage(conversation.id, `Request masuk. Kuota ditahan ${PENDING_HOLD_HOURS} jam sambil menunggu jawaban penyedia.`);
  const saved = store.transaction({
    inquiries: (prev) => [inquiry, ...prev],
    conversations: (prev) => [conversation, ...prev],
    messages: (prev) => [...prev, message, holdNote],
    notifications: (prev) => [makeNotification(inquiry.providerId, notifyTitle, notifyBody, orderLink(inquiry.id)), ...prev],
  });
  return saved ? ok({ inquiry, conversationId: conversation.id }) : fail(SAVE_FAILED);
}

export function createWeightInquiry(
  buyerId: string,
  listingId: string,
  input: { requestedKg: number; items: DeclaredItem[]; declaredValue?: number; prohibitedAck: boolean; note?: string },
): CreateResult {
  const { listings, inquiries } = store.getState();
  const listing = listings.find((l) => l.id === listingId);
  if (!listing || listing.type !== 'weight') return fail('Listing tidak ditemukan.');
  if (listing.ownerId === buyerId) return fail('Anda tidak dapat mengajukan request ke trip sendiri.');
  const status = effectiveStatus(listing, inquiries);
  if (status !== 'open') return fail(STATUS_BLOCK_MESSAGE[status] ?? 'Listing tidak menerima request.');
  const kg = round1(input.requestedKg);
  if (!(kg > 0)) return fail('Berat titipan harus lebih dari 0 kg.');
  const remaining = remainingKg(listing, inquiries);
  if (kg > remaining) return fail(`Sisa kuota hanya ${formatKg(remaining)}.`);
  const items = input.items
    .map((x) => ({ name: x.name.trim(), category: x.category, qty: Math.floor(x.qty) }))
    .filter((x) => x.name);
  if (!items.length) return fail('Tambahkan minimal satu barang.');
  if (items.some((x) => x.name.length < 2 || !(x.qty >= 1))) return fail('Setiap barang perlu nama dan jumlah minimal 1.');
  if (!input.prohibitedAck) return fail('Konfirmasi bahwa titipan tidak berisi barang terlarang.');
  if (input.declaredValue !== undefined && !(input.declaredValue >= 0)) return fail('Perkiraan nilai tidak valid.');
  const itemDescription = items.map((x) => `${x.name} ×${x.qty}`).join(', ');

  const now = nowIso();
  const inquiry: Inquiry = {
    id: uuid(),
    listingId,
    buyerId,
    providerId: listing.ownerId,
    status: 'pending',
    requestedKg: kg,
    itemDescription,
    declaredItems: items,
    declaredValue: input.declaredValue,
    prohibitedAck: true,
    note: input.note?.trim() || undefined,
    holdExpiresAt: holdUntil(),
    payment: { status: 'unpaid' },
    createdAt: now,
    updatedAt: now,
  };
  const opening = [
    `Halo, saya ingin titip ${formatKg(kg)}.`,
    'Barang:',
    ...items.map((x) => `• ${x.name} × ${x.qty} (${x.category})`),
    input.declaredValue ? `Perkiraan nilai: ${formatMoney(input.declaredValue, listing.currency)}` : '',
    inquiry.note ? `Catatan: ${inquiry.note}` : '',
  ]
    .filter(Boolean)
    .join('\n');
  return persistNewInquiry(inquiry, opening, 'Request baru', `${nameOf(buyerId)} ingin titip ${formatKg(kg)} di "${listing.title}".`);
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
    holdExpiresAt: holdUntil(),
    payment: { status: 'unpaid' },
    createdAt: now,
    updatedAt: now,
  };
  const itemsText = lines
    .map((l) => `• ${listing.products.find((p) => p.id === l.productId)?.name} × ${l.quantity}`)
    .join('\n');
  const opening = ['Halo, saya ingin memesan:', itemsText, inquiry.note ? `Catatan: ${inquiry.note}` : '']
    .filter(Boolean)
    .join('\n');
  return persistNewInquiry(inquiry, opening, 'Pre-order baru', `${nameOf(buyerId)} memesan ${lines.length} produk di "${listing.title}".`);
}

function transition(
  inquiryId: string,
  patch: Partial<Inquiry>,
  systemText: string,
  notify: { userId: string; title: string; body: string } | null,
): Result<Inquiry> {
  const inquiry = store.getState().inquiries.find((i) => i.id === inquiryId);
  if (!inquiry) return fail('Order tidak ditemukan.');
  const conv = conversationFor(inquiryId);
  const updated: Inquiry = { ...inquiry, ...patch, updatedAt: nowIso() };
  const saved = store.transaction({
    inquiries: (prev) => prev.map((i) => (i.id === inquiryId ? updated : i)),
    ...(conv ? { messages: (prev: Message[]) => [...prev, makeSystemMessage(conv.id, systemText)] } : {}),
    ...(notify
      ? { notifications: (prev) => [makeNotification(notify.userId, notify.title, notify.body, orderLink(inquiryId)), ...prev] }
      : {}),
  });
  return saved ? ok(updated) : fail(SAVE_FAILED);
}

function load(inquiryId: string) {
  const { inquiries, listings } = store.getState();
  const inquiry = inquiries.find((i) => i.id === inquiryId);
  return { inquiry, listing: inquiry ? listings.find((l) => l.id === inquiry.listingId) : undefined, inquiries };
}

/**
 * Accepting re-checks capacity/stock against the latest state. The request's own hold is
 * excluded from the check, so it never blocks itself.
 */
export function acceptInquiry(inquiryId: string, actorId: string): Result<Inquiry> {
  const { inquiry, listing, inquiries } = load(inquiryId);
  if (!inquiry) return fail('Order tidak ditemukan.');
  if (inquiry.providerId !== actorId) return fail('Hanya penyedia yang dapat menerima request.');
  if (inquiry.status !== 'pending') return fail('Request ini sudah diproses.');
  if (!listing) return fail('Listing tidak ditemukan.');
  const others = inquiries.filter((i) => i.id !== inquiry.id);

  let summary = '';
  if (listing.type === 'weight') {
    const rem = remainingKg(listing as WeightListing, others);
    const kg = inquiry.requestedKg ?? 0;
    if (kg > rem) return fail(`Kuota tidak cukup. Diminta ${formatKg(kg)}, sisa ${formatKg(rem)}.`);
    summary = `${formatKg(kg)} ditahan sampai batas drop-off.`;
  } else {
    const shop = listing as ShoppingListing;
    for (const line of inquiry.items ?? []) {
      const p = shop.products.find((x) => x.id === line.productId);
      if (!p) return fail('Salah satu produk sudah dihapus dari listing.');
      const rem = remainingQty(shop.id, p, others);
      if (line.quantity > rem) return fail(`Stok "${p.name}" tidak cukup. Diminta ${line.quantity}, sisa ${rem}.`);
    }
    summary = 'Stok produk sudah direservasi.';
  }
  return transition(inquiryId, { status: 'accepted', acceptedAt: nowIso(), holdExpiresAt: undefined }, `Request diterima penyedia. ${summary}`, {
    userId: inquiry.buyerId,
    title: 'Request diterima',
    body: `${nameOf(actorId)} menerima request Anda untuk "${listing.title}".`,
  });
}

export function declineInquiry(inquiryId: string, actorId: string, reason?: string): Result<Inquiry> {
  const { inquiry } = load(inquiryId);
  if (!inquiry) return fail('Order tidak ditemukan.');
  if (inquiry.providerId !== actorId) return fail('Hanya penyedia yang dapat menolak request.');
  if (inquiry.status !== 'pending') return fail('Hanya request yang menunggu yang dapat ditolak.');
  const why = reason?.trim();
  return transition(inquiryId, { status: 'declined', closedReason: why || undefined }, `Request ditolak penyedia.${why ? ` Alasan: ${why}` : ''} Kuota dilepas.`, {
    userId: inquiry.buyerId,
    title: 'Request ditolak',
    body: `${nameOf(actorId)} menolak request Anda.${why ? ` Alasan: ${why}` : ''}`,
  });
}

export function cancelInquiry(inquiryId: string, actorId: string): Result<Inquiry> {
  const { inquiry } = load(inquiryId);
  if (!inquiry) return fail('Order tidak ditemukan.');
  if (inquiry.buyerId !== actorId) return fail('Hanya klien yang dapat membatalkan request.');
  if (inquiry.status !== 'pending' && inquiry.status !== 'accepted') return fail('Order yang sudah diserahkan tidak dapat dibatalkan lagi.');
  return transition(inquiryId, { status: 'cancelled' }, 'Request dibatalkan klien. Kuota yang ditahan sudah dilepas.', {
    userId: inquiry.providerId,
    title: 'Request dibatalkan',
    body: `${nameOf(actorId)} membatalkan request.`,
  });
}

/** Provider records the handover: weighed kilos and a photo. This also sets the amount due. */
export function recordHandover(
  inquiryId: string,
  actorId: string,
  input: { weightKg?: number; photoUrl?: string; note?: string; amountDue: number; currency: Currency },
): Result<Inquiry> {
  const { inquiry, listing, inquiries } = load(inquiryId);
  if (!inquiry || !listing) return fail('Order tidak ditemukan.');
  if (inquiry.providerId !== actorId) return fail('Hanya penyedia yang mencatat serah terima.');
  if (inquiry.status !== 'accepted') return fail('Serah terima dicatat setelah request diterima.');
  let weight: number | undefined;
  if (listing.type === 'weight') {
    weight = round1(input.weightKg ?? 0);
    if (!(weight > 0)) return fail('Isi berat hasil timbang.');
    const room = remainingKg(listing, inquiries.filter((i) => i.id !== inquiry.id));
    if (weight > room) return fail(`Berat melebihi sisa kuota. Maksimal ${formatKg(room)}.`);
  } else if (input.weightKg) {
    weight = round1(input.weightKg);
  }
  if (!input.photoUrl) return fail('Tambahkan foto barang saat serah terima.');
  const amount = round2(input.amountDue);
  if (!(amount > 0)) return fail('Isi jumlah tagihan.');
  const at = nowIso();
  return transition(
    inquiryId,
    {
      status: 'handed_over',
      handover: { weightKg: weight, photoUrl: input.photoUrl, note: input.note?.trim() || undefined, at },
      amountDue: amount,
      amountCurrency: input.currency,
      payment: inquiry.payment?.status === 'paid' ? inquiry.payment : { status: 'unpaid' },
    },
    `Serah terima dicatat${weight ? `: ${formatKg(weight)}` : ''}. Tagihan ${formatMoney(amount, input.currency)}.`,
    {
      userId: inquiry.buyerId,
      title: 'Tagihan siap',
      body: `Serah terima${weight ? ` ${formatKg(weight)}` : ''} dicatat. Tagihan ${formatMoney(amount, input.currency)}, unggah bukti bayar.`,
    },
  );
}

const PAYABLE = ['handed_over', 'shipped', 'delivered'];

export function uploadPaymentProof(inquiryId: string, actorId: string, proofUrl: string, note?: string): Result<Inquiry> {
  const { inquiry } = load(inquiryId);
  if (!inquiry) return fail('Order tidak ditemukan.');
  if (inquiry.buyerId !== actorId) return fail('Hanya klien yang mengunggah bukti bayar.');
  if (!PAYABLE.includes(inquiry.status)) return fail('Bukti bayar diunggah setelah tagihan keluar.');
  if (inquiry.payment?.status === 'paid') return fail('Pembayaran sudah ditandai lunas.');
  if (!proofUrl) return fail('Pilih foto bukti transfer.');
  return transition(
    inquiryId,
    { payment: { status: 'proof_uploaded', proofUrl, proofAt: nowIso(), note: note?.trim() || undefined } },
    'Klien mengunggah bukti bayar. Menunggu dicek penyedia.',
    { userId: inquiry.providerId, title: 'Bukti bayar masuk', body: `${nameOf(actorId)} mengunggah bukti bayar. Cek lalu tandai lunas.` },
  );
}

/** Payment tracker is records only: the provider confirms money received outside the platform. */
export function markPaid(inquiryId: string, actorId: string): Result<Inquiry> {
  const { inquiry } = load(inquiryId);
  if (!inquiry) return fail('Order tidak ditemukan.');
  if (inquiry.providerId !== actorId) return fail('Hanya penyedia yang menandai lunas.');
  if (!PAYABLE.includes(inquiry.status)) return fail('Tagihan belum keluar.');
  if (inquiry.payment?.status === 'paid') return fail('Sudah lunas.');
  return transition(
    inquiryId,
    { payment: { ...(inquiry.payment ?? {}), status: 'paid', paidAt: nowIso() } },
    'Pembayaran ditandai lunas oleh penyedia.',
    { userId: inquiry.buyerId, title: 'Pembayaran dikonfirmasi', body: `${nameOf(actorId)} mengonfirmasi pembayaran Anda.` },
  );
}

export function markShipped(inquiryId: string, actorId: string): Result<Inquiry> {
  const { inquiry } = load(inquiryId);
  if (!inquiry) return fail('Order tidak ditemukan.');
  if (inquiry.providerId !== actorId) return fail('Hanya penyedia yang menandai dikirim.');
  if (inquiry.status !== 'handed_over') return fail('Tandai dikirim setelah serah terima.');
  return transition(inquiryId, { status: 'shipped', shippedAt: nowIso() }, 'Titipan sudah dikirim / dalam perjalanan.', {
    userId: inquiry.buyerId,
    title: 'Titipan dikirim',
    body: `${nameOf(actorId)} sudah berangkat membawa titipan Anda.`,
  });
}

export function markDelivered(inquiryId: string, actorId: string): Result<Inquiry> {
  const { inquiry } = load(inquiryId);
  if (!inquiry) return fail('Order tidak ditemukan.');
  if (inquiry.providerId !== actorId) return fail('Hanya penyedia yang menandai sampai.');
  if (inquiry.status !== 'shipped') return fail('Tandai sampai setelah dikirim.');
  return transition(inquiryId, { status: 'delivered', deliveredAt: nowIso() }, 'Titipan sudah sampai tujuan. Mohon konfirmasi penerimaan.', {
    userId: inquiry.buyerId,
    title: 'Titipan sampai',
    body: `${nameOf(actorId)} menandai titipan Anda sudah sampai. Konfirmasi dan beri rating.`,
  });
}

export function confirmReceived(inquiryId: string, actorId: string): Result<Inquiry> {
  const { inquiry } = load(inquiryId);
  if (!inquiry) return fail('Order tidak ditemukan.');
  if (inquiry.buyerId !== actorId) return fail('Hanya klien yang mengonfirmasi penerimaan.');
  if (inquiry.status !== 'delivered' && inquiry.status !== 'shipped') return fail('Titipan belum dikirim.');
  return transition(
    inquiryId,
    { status: 'completed', deliveredAt: inquiry.deliveredAt ?? nowIso(), completedAt: nowIso() },
    'Klien mengonfirmasi titipan diterima. Order selesai.',
    { userId: inquiry.providerId, title: 'Order selesai', body: `${nameOf(actorId)} sudah menerima titipan.` },
  );
}

/**
 * Releases expired holds: pending requests unanswered after 24 hours, and accepted bagasi
 * requests that were not handed over by the drop-off deadline. Safe to call repeatedly.
 */
export function sweepExpiredHolds(now = Date.now()): number {
  const { inquiries, listings } = store.getState();
  const expired: { inquiry: Inquiry; reason: string }[] = [];
  for (const i of inquiries) {
    if (i.status === 'pending' && i.holdExpiresAt && new Date(i.holdExpiresAt).getTime() <= now) {
      expired.push({ inquiry: i, reason: `Penyedia tidak merespons dalam ${PENDING_HOLD_HOURS} jam.` });
    } else if (i.status === 'accepted') {
      const l = listings.find((x) => x.id === i.listingId);
      if (l?.type === 'weight' && l.orderDeadline && daysUntil(l.orderDeadline) < 0) {
        expired.push({ inquiry: i, reason: 'Barang tidak diserahkan sebelum batas drop-off.' });
      }
    }
  }
  if (!expired.length) return 0;
  const ids = new Map(expired.map((e) => [e.inquiry.id, e.reason]));
  const convs = store.getState().conversations;
  const at = nowIso();
  store.transaction({
    inquiries: (prev) => prev.map((i) => (ids.has(i.id) ? { ...i, status: 'expired', closedReason: ids.get(i.id), updatedAt: at } : i)),
    messages: (prev) => [
      ...prev,
      ...expired.flatMap((e) => {
        const c = convs.find((x) => x.inquiryId === e.inquiry.id);
        return c ? [makeSystemMessage(c.id, `Hold kedaluwarsa. ${e.reason} Kuota dilepas.`)] : [];
      }),
    ],
    notifications: (prev) => [
      ...expired.flatMap((e) => [
        makeNotification(e.inquiry.buyerId, 'Hold kedaluwarsa', e.reason, orderLink(e.inquiry.id)),
        makeNotification(e.inquiry.providerId, 'Hold kedaluwarsa', e.reason, orderLink(e.inquiry.id)),
      ]),
      ...prev,
    ],
  });
  return expired.length;
}

/** Amount the client owes, using the recorded amount or the estimate from the listing. */
export function amountFor(inquiry: Inquiry) {
  const listing = store.getState().listings.find((l) => l.id === inquiry.listingId);
  return inquiryTotals(inquiry, listing);
}

export { orderKg };
