import type { Report, ReportStatus, Result, Review } from '@/types';
import { uuid } from '@/lib/utils';
import { store } from './store';
import { fail, makeNotification, nowIso, ok, SAVE_FAILED } from './helpers';

export const REPORT_REASONS = [
  'Barang terlarang / berbahaya',
  'Penipuan atau mencurigakan',
  'Informasi menyesatkan',
  'Spam',
  'Perilaku tidak sopan',
  'Lainnya',
];

/** Ratings go both ways after delivery: the client rates the provider, the provider rates the client. */
export const RATEABLE = ['delivered', 'completed'];

export function createReview(inquiryId: string, actorId: string, rating: number): Result<Review> {
  const { inquiries, reviews, users } = store.getState();
  const inquiry = inquiries.find((i) => i.id === inquiryId);
  if (!inquiry) return fail('Order tidak ditemukan.');
  const isBuyer = inquiry.buyerId === actorId;
  const isProvider = inquiry.providerId === actorId;
  if (!isBuyer && !isProvider) return fail('Anda bukan peserta order ini.');
  const direction = isBuyer ? 'to_provider' : 'to_client';
  if (!RATEABLE.includes(inquiry.status)) return fail('Rating bisa diberikan setelah titipan sampai.');
  if (reviews.some((r) => r.inquiryId === inquiryId && (r.direction ?? 'to_provider') === direction)) return fail('Anda sudah memberi rating untuk order ini.');
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return fail('Pilih rating 1 sampai 5 bintang.');

  const review: Review = {
    id: uuid(),
    inquiryId,
    providerId: inquiry.providerId,
    buyerId: inquiry.buyerId,
    rating,
    direction,
    createdAt: nowIso(),
  };
  const target = isBuyer ? inquiry.providerId : inquiry.buyerId;
  const actorName = users.find((u) => u.id === actorId)?.displayName ?? 'Pengguna';
  const saved = store.transaction({
    reviews: (prev) => [review, ...prev],
    notifications: (prev) => [
      makeNotification(target, 'Rating baru', `${actorName} memberi Anda rating ${rating} bintang.`, isBuyer ? `/providers/${target}` : `/orders/${inquiryId}`),
      ...prev,
    ],
  });
  return saved ? ok(review) : fail(SAVE_FAILED);
}

export function createReport(input: {
  reporterId: string;
  targetType: 'listing' | 'user';
  targetId: string;
  reason: string;
  description?: string;
}): Result<Report> {
  if (!REPORT_REASONS.includes(input.reason)) return fail('Pilih alasan laporan.');
  if ((input.description ?? '').length > 500) return fail('Deskripsi maksimal 500 karakter.');
  const { reports, listings } = store.getState();
  if (input.targetType === 'listing' && listings.find((l) => l.id === input.targetId)?.ownerId === input.reporterId)
    return fail('Anda tidak dapat melaporkan listing sendiri.');
  if (input.targetType === 'user' && input.targetId === input.reporterId) return fail('Anda tidak dapat melaporkan diri sendiri.');
  if (reports.some((r) => r.reporterId === input.reporterId && r.targetId === input.targetId && r.status === 'open'))
    return fail('Anda sudah melaporkan ini. Laporan sedang ditinjau.');

  const report: Report = {
    id: uuid(),
    reporterId: input.reporterId,
    targetType: input.targetType,
    targetId: input.targetId,
    reason: input.reason,
    description: input.description?.trim() || undefined,
    status: 'open',
    createdAt: nowIso(),
  };
  return store.set('reports', (prev) => [report, ...prev]) ? ok(report) : fail(SAVE_FAILED);
}

export function setReportStatus(reportId: string, status: ReportStatus): Result<void> {
  return store.set('reports', (prev) => prev.map((r) => (r.id === reportId ? { ...r, status } : r)))
    ? ok(undefined)
    : fail(SAVE_FAILED);
}
