import type { AppMode, Result, ThemePreference, User } from '@/types';
import { uuid } from '@/lib/utils';
import { store } from './store';
import { fail, nowIso, ok, SAVE_FAILED } from './helpers';

export function switchAccount(userId: string | null, mode?: AppMode): Result<void> {
  const user = store.getState().users.find((u) => u.id === userId);
  if (userId && !user) return fail('Akun demo tidak ditemukan.');
  const nextMode: AppMode = mode ?? (user?.phoneVerifiedAt && user.providerSince ? 'provider' : 'client');
  return store.set('session', () => ({ currentUserId: userId, mode: userId ? nextMode : undefined })) ? ok(undefined) : fail(SAVE_FAILED);
}

export const logout = () => switchAccount(null);

/** Switches between client and provider mode. Provider mode needs a verified WhatsApp number. */
export function setMode(mode: AppMode): Result<void> {
  const { session, users } = store.getState();
  const user = users.find((u) => u.id === session.currentUserId);
  if (!user) return fail('Masuk dulu.');
  if (mode === 'provider' && !user.phoneVerifiedAt) return fail('Aktifkan mode provider dulu.');
  return store.set('session', (prev) => ({ ...prev, mode })) ? ok(undefined) : fail(SAVE_FAILED);
}

/* ---------- Simulated magic link ---------- */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const magicLinks = new Map<string, { email: string; expires: number }>();

export function validateEmail(email: string): string | null {
  return EMAIL_RE.test(email.trim()) ? null : 'Masukkan email yang valid.';
}

/** Returns a one-time token. In a real app this is emailed; here the UI shows a simulated inbox. */
export function sendMagicLink(email: string): Result<{ token: string; existing: boolean }> {
  const err = validateEmail(email);
  if (err) return fail(err);
  const clean = email.trim().toLowerCase();
  const token = uuid();
  magicLinks.set(token, { email: clean, expires: Date.now() + 15 * 60_000 });
  const existing = store.getState().users.some((u) => u.email?.toLowerCase() === clean);
  return ok({ token, existing });
}

/** Opens the link: logs an existing user in, or tells the caller to collect a profile. */
export function openMagicLink(token: string): Result<{ email: string; user?: User }> {
  const link = magicLinks.get(token);
  if (!link || link.expires < Date.now()) return fail('Link sudah kedaluwarsa. Kirim ulang link masuk.');
  const user = store.getState().users.find((u) => u.email?.toLowerCase() === link.email);
  if (user) {
    magicLinks.delete(token);
    const res = switchAccount(user.id);
    if (!res.ok) return res;
  }
  return ok({ email: link.email, user });
}

export function signUpWithMagicLink(token: string, input: { displayName: string; city: string; acceptTerms: boolean }): Result<User> {
  const link = magicLinks.get(token);
  if (!link || link.expires < Date.now()) return fail('Link sudah kedaluwarsa. Kirim ulang link masuk.');
  if (!input.acceptTerms) return fail('Setujui Syarat & Ketentuan dan Kebijakan Privasi untuk melanjutkan.');
  const errors = validateProfile(input);
  if (Object.keys(errors).length) return fail(Object.values(errors)[0]!);
  const now = nowIso();
  const user: User = {
    id: uuid(),
    displayName: input.displayName.trim(),
    city: input.city.trim() || undefined,
    role: 'member',
    joinedAt: now,
    email: link.email,
    termsAcceptedAt: now,
    demoTagline: 'Akun baru',
  };
  const saved = store.transaction({
    users: (prev) => [...prev, user],
    session: () => ({ currentUserId: user.id, mode: 'client' }),
  });
  if (saved) magicLinks.delete(token);
  return saved ? ok(user) : fail(SAVE_FAILED);
}

/* ---------- Provider activation: simulated WhatsApp OTP ---------- */

const otps = new Map<string, { phone: string; code: string; expires: number }>();

export function normalisePhone(raw: string): string | null {
  const digits = raw.replace(/[^\d+]/g, '');
  const n = digits.startsWith('+') ? digits : digits.startsWith('0') ? `+62${digits.slice(1)}` : `+${digits}`;
  return /^\+\d{9,15}$/.test(n) ? n : null;
}

/** Returns the demo code so the UI can show it. A real app sends it over WhatsApp. */
export function requestOtp(userId: string, phone: string): Result<{ code: string; phone: string }> {
  const n = normalisePhone(phone);
  if (!n) return fail('Nomor WhatsApp tidak valid. Sertakan kode negara, cth. +62 812 3456 7890.');
  if (store.getState().users.some((u) => u.id !== userId && u.phone === n && u.phoneVerifiedAt))
    return fail('Nomor ini sudah dipakai akun provider lain.');
  const code = String(Math.floor(100000 + Math.random() * 900000));
  otps.set(userId, { phone: n, code, expires: Date.now() + 5 * 60_000 });
  return ok({ code, phone: n });
}

export function activateProvider(userId: string, input: { code: string; acceptProviderTerms: boolean }): Result<User> {
  const otp = otps.get(userId);
  if (!otp || otp.expires < Date.now()) return fail('Kode kedaluwarsa. Minta kode baru.');
  if (otp.code !== input.code.trim()) return fail('Kode OTP salah.');
  if (!input.acceptProviderTerms) return fail('Setujui ketentuan khusus provider.');
  const user = store.getState().users.find((u) => u.id === userId);
  if (!user) return fail('Akun tidak ditemukan.');
  const now = nowIso();
  const updated: User = { ...user, phone: otp.phone, phoneVerifiedAt: now, providerSince: user.providerSince ?? now };
  const saved = store.transaction({
    users: (prev) => prev.map((u) => (u.id === userId ? updated : u)),
    session: (prev) => ({ ...prev, mode: 'provider' }),
  });
  if (saved) otps.delete(userId);
  return saved ? ok(updated) : fail(SAVE_FAILED);
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
    termsAcceptedAt: nowIso(),
    demoTagline: 'Profil lokal baru',
  };
  const saved = store.transaction({
    users: (prev) => [...prev, user],
    session: () => ({ currentUserId: user.id, mode: 'client' }),
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
