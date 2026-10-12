import type {
  AppNotification,
  Conversation,
  Inquiry,
  Listing,
  Message,
  Report,
  Review,
  Session,
  Settings,
  User,
} from '@/types';
import * as storage from './storageService';
import { STORAGE_KEYS, STORAGE_NAMESPACE, type StorageKey } from './storageService';
import { buildSeed } from '@/data/seed';

export type DBState = {
  users: User[];
  session: Session;
  listings: Listing[];
  inquiries: Inquiry[];
  conversations: Conversation[];
  messages: Message[];
  reviews: Review[];
  reports: Report[];
  notifications: AppNotification[];
  settings: Settings;
};

const DEFAULTS: DBState = {
  users: [],
  session: { currentUserId: null },
  listings: [],
  inquiries: [],
  conversations: [],
  messages: [],
  reviews: [],
  reports: [],
  notifications: [],
  settings: { seededAt: null, demoBannerDismissed: false, saved: {} },
};

const KEYS = Object.keys(DEFAULTS) as (keyof DBState)[];

function readKey<K extends keyof DBState>(key: K): DBState[K] {
  const validate = key === 'session' || key === 'settings' ? storage.isObject : storage.isArray;
  const value = storage.read<DBState[K]>(key as StorageKey, DEFAULTS[key], validate);
  if (key === 'settings') {
    const s = value as Settings;
    return { ...DEFAULTS.settings, ...s, saved: storage.isObject(s.saved) ? s.saved : {} } as DBState[K];
  }
  return value;
}

function loadAll(): DBState {
  return Object.fromEntries(KEYS.map((k) => [k, readKey(k)])) as DBState;
}

function seededMemoryState(): DBState {
  const seed = buildSeed();
  return { ...seed, settings: { ...seed.settings, seededAt: new Date().toISOString() } };
}

export let storageAvailable = true;
let state: DBState = DEFAULTS;
let initialized = false;
const listeners = new Set<() => void>();
const errorListeners = new Set<(message: string) => void>();

function emit() {
  listeners.forEach((l) => l());
}

function persist<K extends keyof DBState>(key: K, value: DBState[K]): boolean {
  try {
    storage.write(key as StorageKey, value);
    return true;
  } catch (err) {
    const msg =
      err instanceof storage.StorageWriteError && err.reason === 'quota'
        ? 'Penyimpanan browser penuh. Hapus beberapa data demo atau reset data demo.'
        : 'Perubahan tidak dapat disimpan di browser ini (localStorage tidak tersedia).';
    errorListeners.forEach((l) => l(msg));
    return false;
  }
}

/** Seeds only on first run (no settings.seededAt). Never overwrites existing user data. */
function seedIfNeeded() {
  if (readKey('settings').seededAt) return;
  const seed = buildSeed();
  for (const key of KEYS) {
    if (key === 'settings') continue;
    if (!storage.hasKey(key as StorageKey)) persist(key, seed[key]);
  }
  persist('settings', { ...readKey('settings'), seededAt: new Date().toISOString() });
}

export function initStore() {
  if (initialized) return;
  initialized = true;
  storageAvailable = storage.isAvailable();
  if (storageAvailable) {
    seedIfNeeded();
    state = loadAll();
  } else {
    state = seededMemoryState();
  }

  // Cross-tab synchronisation via the `storage` event.
  window.addEventListener('storage', (e) => {
    if (e.key === null) {
      state = loadAll();
      emit();
      return;
    }
    if (!e.key.startsWith(STORAGE_NAMESPACE)) return;
    const k = e.key.slice(STORAGE_NAMESPACE.length) as keyof DBState;
    if (!KEYS.includes(k)) return;
    state = { ...state, [k]: readKey(k) };
    emit();
  });
}

type Updaters = Partial<{ [K in keyof DBState]: (prev: DBState[K]) => DBState[K] }>;

export const store = {
  getState: () => state,
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  onError(listener: (message: string) => void) {
    errorListeners.add(listener);
    return () => {
      errorListeners.delete(listener);
    };
  },
  /** Applies one or more collection updates together. Rolls back storage if any write fails. */
  transaction(updates: Updaters): boolean {
    const keys = Object.keys(updates) as (keyof DBState)[];
    const nextState = { ...state } as Record<keyof DBState, unknown>;
    for (const key of keys) {
      const fn = updates[key] as (prev: unknown) => unknown;
      nextState[key] = fn(state[key]);
    }
    if (storageAvailable) {
      const snapshot = state;
      for (const key of keys) {
        if (!persist(key, nextState[key] as never)) {
          for (const k of keys) {
            try {
              storage.write(k as StorageKey, snapshot[k]);
            } catch {
              /* best effort */
            }
          }
          return false;
        }
      }
    }
    state = nextState as DBState;
    emit();
    return true;
  },
  set<K extends keyof DBState>(key: K, updater: (prev: DBState[K]) => DBState[K]): boolean {
    return store.transaction({ [key]: updater } as Updaters);
  },
  resetDemoData() {
    storage.clearNamespace();
    if (storageAvailable) {
      seedIfNeeded();
      state = loadAll();
    } else {
      state = seededMemoryState();
    }
    emit();
  },
};

export { STORAGE_KEYS };
