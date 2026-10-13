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

export function createReview(inquiryId: string, buyerId: string, rating: number): Result<Review> {
  const { inquiries, reviews } = store.getState();
  const inquiry = inquiries.find((i) => i.id === inquiryId);
  if (!inquiry) return fail('Inquiry tidak ditemukan.');
  if (inquiry.buyerId !== buyerId) return fail('Hanya pembeli yang dapat memberi ulasan.');
  if (inquiry.status !== 'completed') return fail('Ulasan hanya bisa diberikan setelah transaksi selesai.');
  if (reviews.some((r) => r.inquiryId === inquiryId)) return fail('Anda sudah memberi ulasan untuk transaksi ini.');
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return fail('Pilih rating 1 sampai 5 bintang.');

  const review: Review = {
    id: uuid(),
    inquiryId,
    providerId: inquiry.providerId,
    buyerId,
    rating,
    createdAt: nowIso(),
  };
  const saved = store.transaction({
    reviews: (prev) => [review, ...prev],
    notifications: (prev) => [
      makeNotification(inquiry.providerId, 'Ulasan baru', `Anda menerima ulasan ${rating} bintang.`, `/providers/${inquiry.providerId}`),
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
