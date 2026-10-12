import type { Result, ThemePreference, User } from '@/types';
import { uuid } from '@/lib/utils';
import { store } from './store';
import { fail, nowIso, ok, SAVE_FAILED } from './helpers';

export function switchAccount(userId: string | null): Result<void> {
  if (userId && !store.getState().users.some((u) => u.id === userId)) return fail('Akun demo tidak ditemukan.');
  return store.set('session', () => ({ currentUserId: userId })) ? ok(undefined) : fail(SAVE_FAILED);
}

export function validateProfile(input: { displayName: string; city?: string; bio?: string; avatarUrl?: string }) {
  const e: Record<string, string> = {};
  const name = input.displayName.trim();
  if (name.length < 2) e.displayName = 'Nama tampilan minimal 2 karakter.';
  else if (name.length > 40) e.displayName = 'Nama tampilan maksimal 40 karakter.';
  if ((input.bio ?? '').length > 300) e.bio = 'Bio maksimal 300 karakter.';
  if (input.avatarUrl && input.avatarUrl.trim() && !/^https?:\/\/\S+$/i.test(input.avatarUrl.trim()))
    e.avatarUrl = 'URL foto harus diawali http:// atau https://';
  return e;
}

/** Creates a local-only demo profile. No password or personal data is requested or stored. */
export function createLocalProfile(input: { displayName: string; city: string }): Result<User> {
  const errors = validateProfile(input);
  if (Object.keys(errors).length) return fail(Object.values(errors)[0]!);
  const user: User = {
    id: uuid(),
    displayName: input.displayName.trim(),
    city: input.city.trim() || undefined,
    role: 'member',
    joinedAt: nowIso(),
    demoTagline: 'Profil lokal baru',
  };
  const saved = store.transaction({
    users: (prev) => [...prev, user],
    session: () => ({ currentUserId: user.id }),
  });
  return saved ? ok(user) : fail(SAVE_FAILED);
}

export function updateProfile(userId: string, patch: Pick<User, 'displayName' | 'city' | 'bio' | 'avatarUrl'>): Result<void> {
  const errors = validateProfile({ ...patch, displayName: patch.displayName });
  if (Object.keys(errors).length) return fail(Object.values(errors)[0]!);
  const clean = {
    displayName: patch.displayName.trim(),
    city: patch.city?.trim() || undefined,
    bio: patch.bio?.trim() || undefined,
    avatarUrl: patch.avatarUrl?.trim() || undefined,
  };
  return store.set('users', (prev) => prev.map((u) => (u.id === userId ? { ...u, ...clean } : u)))
    ? ok(undefined)
    : fail(SAVE_FAILED);
}

export function toggleSaved(userId: string, listingId: string): Result<boolean> {
  const current = store.getState().settings.saved[userId] ?? [];
  const isSaved = current.includes(listingId);
  const next = isSaved ? current.filter((id) => id !== listingId) : [listingId, ...current];
  const saved = store.set('settings', (prev) => ({ ...prev, saved: { ...prev.saved, [userId]: next } }));
  return saved ? ok(!isSaved) : fail(SAVE_FAILED);
}

export function dismissDemoBanner() {
  store.set('settings', (prev) => ({ ...prev, demoBannerDismissed: true }));
}

export function markNotificationsRead(userId: string) {
  store.set('notifications', (prev) => prev.map((n) => (n.userId === userId ? { ...n, read: true } : n)));
}

export function markNotificationRead(id: string) {
  store.set('notifications', (prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
}

export function setTheme(theme: ThemePreference) {
  store.set('settings', (prev) => ({ ...prev, theme }));
}
