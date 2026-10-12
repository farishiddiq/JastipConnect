import type { AppNotification, Message, Result } from '@/types';
import { uuid } from '@/lib/utils';

export const nowIso = () => new Date().toISOString();

export const ok = <T>(data: T): Result<T> => ({ ok: true, data });
export const fail = <T = never>(error: string): Result<T> => ({ ok: false, error });

export const SAVE_FAILED = 'Gagal menyimpan perubahan di browser. Coba lagi.';

export function makeNotification(userId: string, title: string, body: string, link?: string): AppNotification {
  return { id: uuid(), userId, title, body, link, read: false, createdAt: nowIso() };
}

export function makeSystemMessage(conversationId: string, body: string): Message {
  return { id: uuid(), conversationId, senderId: 'system', body, createdAt: nowIso(), readByIds: [] };
}
