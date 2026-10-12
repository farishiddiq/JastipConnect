import { useEffect, useMemo, useSyncExternalStore } from 'react';
import type { Listing, ListingStatus, Review, User } from '@/types';
import { store, type DBState } from '@/services/store';
import { availabilitySummary, effectiveStatus, type AvailabilitySummary } from '@/lib/availability';

/** Subscribe to the whole DB snapshot. Selectors should be memoised by callers. */
export function useDB(): DBState {
  return useSyncExternalStore(store.subscribe, store.getState, store.getState);
}

export function useCurrentUser(): User | null {
  const { users, session } = useDB();
  return useMemo(() => users.find((u) => u.id === session.currentUserId) ?? null, [users, session.currentUserId]);
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
};

/** All listings enriched with derived status, availability and owner. */
export function useListingViews(): ListingView[] {
  const { listings, inquiries, users } = useDB();
  return useMemo(
    () =>
      listings.map((listing) => ({
        listing,
        status: effectiveStatus(listing, inquiries),
        availability: availabilitySummary(listing, inquiries),
        owner: users.find((u) => u.id === listing.ownerId),
      })),
    [listings, inquiries, users],
  );
}

export function useListingView(id: string | undefined): ListingView | undefined {
  const views = useListingViews();
  return useMemo(() => views.find((v) => v.listing.id === id), [views, id]);
}

export type RatingSummary = { average: number; count: number; reviews: Review[] };

export function useProviderRating(providerId: string | undefined): RatingSummary {
  const { reviews } = useDB();
  return useMemo(() => {
    const list = reviews.filter((r) => r.providerId === providerId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const average = list.length ? list.reduce((s, r) => s + r.rating, 0) / list.length : 0;
    return { average, count: list.length, reviews: list };
  }, [reviews, providerId]);
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
  const { messages, conversations, session } = useDB();
  return useMemo(() => {
    const uid = session.currentUserId;
    if (!uid) return 0;
    const myConvs = new Set(conversations.filter((c) => c.participantIds.includes(uid)).map((c) => c.id));
    const convsWithUnread = new Set(
      messages.filter((m) => myConvs.has(m.conversationId) && !m.readByIds.includes(uid)).map((m) => m.conversationId),
    );
    return convsWithUnread.size;
  }, [messages, conversations, session.currentUserId]);
}

const SITE = 'JastipConnect';
const DEFAULT_DESC = 'Titip barang, temukan perjalanan, terhubung dengan diaspora Indonesia di Arab Saudi.';

/** Sets document title + meta description for SPA routes. */
export function usePageMeta(title?: string, description?: string) {
  useEffect(() => {
    document.title = title ? `${title} · ${SITE}` : `${SITE}: Jastip Diaspora Saudi ↔ Indonesia`;
    let meta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'description';
      document.head.appendChild(meta);
    }
    meta.content = description ?? DEFAULT_DESC;
  }, [title, description]);
}
