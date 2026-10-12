/**
 * Thin, defensive wrapper around window.localStorage.
 * All keys live under a versioned namespace so future schema changes can migrate safely.
 */
export const STORAGE_NAMESPACE = 'jc:v1:';

export const STORAGE_KEYS = {
  users: 'users',
  session: 'session',
  listings: 'listings',
  inquiries: 'inquiries',
  conversations: 'conversations',
  messages: 'messages',
  reviews: 'reviews',
  reports: 'reports',
  notifications: 'notifications',
  settings: 'settings',
} as const;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];

export class StorageWriteError extends Error {
  constructor(public readonly reason: 'quota' | 'unavailable' | 'unknown') {
    super(reason === 'quota' ? 'Penyimpanan browser penuh.' : 'Penyimpanan browser tidak tersedia.');
  }
}

function getStorage(): Storage | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    return window.localStorage;
  } catch {
    return null; // e.g. private mode or blocked site data
  }
}

export const fullKey = (key: StorageKey) => STORAGE_NAMESPACE + key;

export function isAvailable(): boolean {
  const s = getStorage();
  if (!s) return false;
  try {
    const probe = STORAGE_NAMESPACE + '__probe';
    s.setItem(probe, '1');
    s.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}

export function hasKey(key: StorageKey): boolean {
  try {
    return getStorage()?.getItem(fullKey(key)) != null;
  } catch {
    return false;
  }
}

/**
 * Reads and parses a key. Falls back to `fallback` when missing, unparsable,
 * or when the optional `validate` guard rejects the shape.
 */
export function read<T>(key: StorageKey, fallback: T, validate?: (value: unknown) => boolean): T {
  const s = getStorage();
  if (!s) return fallback;
  try {
    const raw = s.getItem(fullKey(key));
    if (raw == null) return fallback;
    const parsed: unknown = JSON.parse(raw);
    if (validate && !validate(parsed)) {
      console.warn(`[storage] Data tidak valid untuk ${key}, memakai nilai default.`);
      return fallback;
    }
    return parsed as T;
  } catch (err) {
    console.warn(`[storage] Gagal membaca ${key}`, err);
    return fallback;
  }
}

/** Writes a key. Throws StorageWriteError so callers can surface a friendly message. */
export function write<T>(key: StorageKey, value: T): void {
  const s = getStorage();
  if (!s) throw new StorageWriteError('unavailable');
  try {
    s.setItem(fullKey(key), JSON.stringify(value));
  } catch (err) {
    const isQuota =
      err instanceof DOMException &&
      (err.name === 'QuotaExceededError' || err.name === 'NS_ERROR_DOM_QUOTA_REACHED' || err.code === 22);
    throw new StorageWriteError(isQuota ? 'quota' : 'unknown');
  }
}

/** Removes every key in this app's namespace (used by Reset Demo Data). */
export function clearNamespace(): void {
  const s = getStorage();
  if (!s) return;
  const toRemove: string[] = [];
  for (let i = 0; i < s.length; i++) {
    const k = s.key(i);
    if (k?.startsWith(STORAGE_NAMESPACE)) toRemove.push(k);
  }
  toRemove.forEach((k) => s.removeItem(k));
}

export const isArray = (v: unknown): boolean => Array.isArray(v);
export const isObject = (v: unknown): boolean => typeof v === 'object' && v !== null && !Array.isArray(v);
