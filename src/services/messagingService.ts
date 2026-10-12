import type { Message, Result } from '@/types';
import { uuid } from '@/lib/utils';
import { store } from './store';
import { fail, makeNotification, nowIso, ok, SAVE_FAILED } from './helpers';

export const MAX_MESSAGE_LENGTH = 1000;

export function sendMessage(conversationId: string, senderId: string, body: string): Result<Message> {
  const { conversations, users } = store.getState();
  const conv = conversations.find((c) => c.id === conversationId);
  if (!conv) return fail('Percakapan tidak ditemukan.');
  if (!conv.participantIds.includes(senderId)) return fail('Anda bukan peserta percakapan ini.');
  const text = body.trim();
  if (!text) return fail('Pesan tidak boleh kosong.');
  if (text.length > MAX_MESSAGE_LENGTH) return fail(`Pesan maksimal ${MAX_MESSAGE_LENGTH} karakter.`);

  const message: Message = { id: uuid(), conversationId, senderId, body: text, createdAt: nowIso(), readByIds: [senderId] };
  const recipient = conv.participantIds.find((id) => id !== senderId)!;
  const senderName = users.find((u) => u.id === senderId)?.displayName ?? 'Pengguna';
  const saved = store.transaction({
    messages: (prev) => [...prev, message],
    notifications: (prev) => {
      // Collapse repeated unread message notifications for the same thread.
      const link = `/inbox/${conversationId}`;
      const rest = prev.filter((n) => !(n.userId === recipient && n.link === link && !n.read && n.title === 'Pesan baru'));
      return [makeNotification(recipient, 'Pesan baru', `${senderName}: ${text.slice(0, 80)}`, link), ...rest];
    },
  });
  return saved ? ok(message) : fail(SAVE_FAILED);
}

/** Simulated read receipts: mark every message in the thread as read by `userId`. */
export function markConversationRead(conversationId: string, userId: string) {
  const { messages, notifications } = store.getState();
  const needsUpdate = messages.some((m) => m.conversationId === conversationId && !m.readByIds.includes(userId));
  const link = `/inbox/${conversationId}`;
  const notifUpdate = notifications.some((n) => n.userId === userId && n.link === link && !n.read);
  if (!needsUpdate && !notifUpdate) return;
  store.transaction({
    messages: (prev) =>
      prev.map((m) =>
        m.conversationId === conversationId && !m.readByIds.includes(userId) ? { ...m, readByIds: [...m.readByIds, userId] } : m,
      ),
    notifications: (prev) => prev.map((n) => (n.userId === userId && n.link === link ? { ...n, read: true } : n)),
  });
}
