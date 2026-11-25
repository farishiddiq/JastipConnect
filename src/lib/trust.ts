import type { Inquiry, Listing, Report, Review, User } from '@/types';

export type TrustFactor = { label: string; points: number; max: number };
export type TrustLevel = 'Baru' | 'Cukup' | 'Baik' | 'Sangat baik';
export type TrustScore = { score: number; level: TrustLevel; factors: TrustFactor[]; warning?: string };

/**
 * Simple, explainable trust score (0 to 100) from signals the app already records.
 * It helps buyers skim scammers; it is not a guarantee.
 */
export function computeTrust(
  user: User,
  data: { reviews: Review[]; inquiries: Inquiry[]; listings: Listing[]; reports: Report[] },
  now = Date.now(),
): TrustScore {
  const mine = data.reviews.filter((r) => r.providerId === user.id && (r.direction ?? 'to_provider') === 'to_provider');
  const avg = mine.length ? mine.reduce((s, r) => s + r.rating, 0) / mine.length : 0;
  // Ratings count fully from 5 reviews; one 5-star review alone is not enough.
  const ratingPts = mine.length ? Math.round((avg / 5) * 35 * Math.min(1, mine.length / 5)) : 0;
  const completed = data.inquiries.filter((i) => i.providerId === user.id && i.status === 'completed').length;
  const verifiedTrips = data.listings.filter((l) => l.ownerId === user.id && l.ticketProof?.status === 'approved').length;
  const months = Math.max(0, (now - new Date(user.joinedAt).getTime()) / (30 * 86_400_000));
  const against = data.reports.filter((r) => r.targetId === user.id || data.listings.some((l) => l.id === r.targetId && l.ownerId === user.id));
  const upheld = against.filter((r) => r.status === 'resolved').length;
  const open = against.filter((r) => r.status === 'open').length;

  const factors: TrustFactor[] = [
    { label: 'WhatsApp terverifikasi', points: user.phoneVerifiedAt ? 20 : 0, max: 20 },
    { label: `Rating ${mine.length ? avg.toFixed(1) : '-'} dari ${mine.length} ulasan`, points: ratingPts, max: 35 },
    { label: `${completed} order selesai`, points: Math.min(20, completed * 4), max: 20 },
    { label: `${verifiedTrips} trip dengan tiket terverifikasi`, points: Math.min(15, verifiedTrips * 5), max: 15 },
    { label: `Bergabung ${Math.floor(months)} bulan`, points: Math.min(10, Math.floor(months)), max: 10 },
  ];
  const penalty = upheld * 20 + open * 5;
  if (penalty) factors.push({ label: `${upheld + open} laporan (${upheld} terbukti)`, points: -penalty, max: 0 });

  const score = Math.max(0, Math.min(100, factors.reduce((s, f) => s + f.points, 0)));
  const level: TrustLevel = score >= 75 ? 'Sangat baik' : score >= 50 ? 'Baik' : score >= 25 ? 'Cukup' : 'Baru';
  return {
    score,
    level,
    factors,
    warning: upheld ? 'Pernah ada laporan yang terbukti terhadap akun ini.' : open ? 'Ada laporan yang sedang ditinjau moderator.' : undefined,
  };
}
