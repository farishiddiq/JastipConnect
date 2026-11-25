import { useEffect, useMemo, useSyncExternalStore } from 'react';
import type { AppMode, Listing, ListingStatus, Review, User } from '@/types';
import { store, type DBState } from '@/services/store';
import { availabilitySummary, effectiveStatus, type AvailabilitySummary } from '@/lib/availability';
import { featuredUntil, isPro, isPromoted, slotCredits } from '@/lib/plans';
import { computeTrust, type TrustScore } from '@/lib/trust';

/** Subscribe to the whole DB snapshot. Selectors should be memoised by callers. */
export function useDB(): DBState {
  return useSyncExternalStore(store.subscribe, store.getState, store.getState);
}

export function useCurrentUser(): User | null {
  const { users, session } = useDB();
  return useMemo(() => users.find((u) => u.id === session.currentUserId) ?? null, [users, session.currentUserId]);
}

/** Active mode. Users without a verified WhatsApp number are always clients. */
export function useMode(): AppMode {
  const { session } = useDB();
  const user = useCurrentUser();
  if (!user?.phoneVerifiedAt) return 'client';
  return session.mode ?? 'provider';
}

export function isProviderUser(user: User | null | undefined): boolean {
  return !!user?.phoneVerifiedAt;
}

export function useUser(id: string | undefined): User | undefined {
  const { users } = useDB();
  return useMemo(() => users.find((u) => u.id === id), [users, id]);
}

export type ListingView = {
  listing: Listing;
  status: ListingStatus;
  availability: AvailabilitySummary;
  owner?: User;
  /** Boosted (Featured trip) until this moment. */
  featuredUntil?: string;
  ownerPro: boolean;
  ownerPromoted: boolean;
  tripVerified: boolean;
};

/** All listings enriched with derived status, availability and owner. */
export function useListingViews(): ListingView[] {
  const { listings, inquiries, users, purchases } = useDB();
  return useMemo(() => {
    const now = Date.now();
    return listings.map((listing) => ({
      listing,
      status: effectiveStatus(listing, inquiries),
      availability: availabilitySummary(listing, inquiries),
      owner: users.find((u) => u.id === listing.ownerId),
      featuredUntil: featuredUntil(purchases, listing.id, now),
      ownerPro: isPro(purchases, listing.ownerId, now),
      ownerPromoted: isPromoted(purchases, listing.ownerId, now),
      tripVerified: listing.ticketProof?.status === 'approved',
    }));
  }, [listings, inquiries, users, purchases]);
}

export function useListingView(id: string | undefined): ListingView | undefined {
  const views = useListingViews();
  return useMemo(() => views.find((v) => v.listing.id === id), [views, id]);
}

export type RatingSummary = { average: number; count: number; reviews: Review[] };

export function useProviderRating(providerId: string | undefined): RatingSummary {
  const { reviews } = useDB();
  return useMemo(() => {
    const list = reviews
      .filter((r) => r.providerId === providerId && (r.direction ?? 'to_provider') === 'to_provider')
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const average = list.length ? list.reduce((s, r) => s + r.rating, 0) / list.length : 0;
    return { average, count: list.length, reviews: list };
  }, [reviews, providerId]);
}

export function useTrust(user: User | undefined | null): TrustScore | null {
  const { reviews, inquiries, listings, reports } = useDB();
  return useMemo(() => (user ? computeTrust(user, { reviews, inquiries, listings, reports }) : null), [user, reviews, inquiries, listings, reports]);
}

export type PlanState = { pro?: string; promoted?: string; credits: number };

export function usePlanState(userId: string | undefined): PlanState {
  const { purchases, listings } = useDB();
  return useMemo(() => {
    if (!userId) return { credits: 0 };
    const now = Date.now();
    const until = (kind: 'pro' | 'promoted') =>
      purchases
        .filter((p) => p.userId === userId && p.kind === kind && p.expiresAt && new Date(p.expiresAt).getTime() > now)
        .map((p) => p.expiresAt!)
        .sort()
        .pop();
    return { pro: until('pro'), promoted: until('promoted'), credits: slotCredits(purchases, listings, userId) };
  }, [purchases, listings, userId]);
}

export { isPro, isPromoted };

/** How providers rated this client (two-way ratings). */
export function useClientRating(clientId: string | undefined): RatingSummary {
  const { reviews } = useDB();
  return useMemo(() => {
    const list = reviews.filter((r) => r.buyerId === clientId && r.direction === 'to_client').sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const average = list.length ? list.reduce((s, r) => s + r.rating, 0) / list.length : 0;
    return { average, count: list.length, reviews: list };
  }, [reviews, clientId]);
}

export function useCompletedCount(providerId: string | undefined): number {
  const { inquiries } = useDB();
  return useMemo(() => inquiries.filter((i) => i.providerId === providerId && i.status === 'completed').length, [inquiries, providerId]);
}

export function useSavedIds(): string[] {
  const { settings, session } = useDB();
  return useMemo(
    () => (session.currentUserId ? settings.saved[session.currentUserId] ?? [] : []),
    [settings.saved, session.currentUserId],
  );
}

export function useUnreadMessageCount(): number {
  const { messages, conversations, session, inquiries } = useDB();
  const mode = useMode();
  return useMemo(() => {
    const uid = session.currentUserId;
    if (!uid) return 0;
    const myConvs = new Set(
      conversations
        .filter((c) => c.participantIds.includes(uid))
        .filter((c) => {
          const inq = inquiries.find((i) => i.id === c.inquiryId);
          return !inq || (mode === 'provider' ? inq.providerId === uid : inq.buyerId === uid);
        })
        .map((c) => c.id),
    );
    const convsWithUnread = new Set(
      messages.filter((m) => myConvs.has(m.conversationId) && !m.readByIds.includes(uid)).map((m) => m.conversationId),
    );
    return convsWithUnread.size;
  }, [messages, conversations, session.currentUserId, inquiries, mode]);
}

const SITE = 'JastipConnect';
const DEFAULT_DESC = 'Marketplace jastip bagasi untuk diaspora Indonesia. Titip oleh-oleh lewat bagasi traveler Saudi dan Australia.';

/** Sets document title + meta description for SPA routes. */
export function usePageMeta(title?: string, description?: string) {
  useEffect(() => {
    document.title = title ? `${title} · ${SITE}` : `${SITE}: Jastip Bagasi untuk Diaspora`;
    let meta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'description';
      document.head.appendChild(meta);
    }
    meta.content = description ?? DEFAULT_DESC;
  }, [title, description]);
}
