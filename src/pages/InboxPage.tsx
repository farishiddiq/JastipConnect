import * as React from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, CheckCheck, Check, Info, Lock, MessageCircle, Repeat, Send, X } from 'lucide-react';
import { toast } from 'sonner';
import type { Conversation, Inquiry, InquiryStatus, Listing, Message, User } from '@/types';
import { Button } from '@/components/ui/button';
import { Tabs } from '@/components/ui/misc';
import { Avatar, EmptyState, InquiryStatusBadge } from '@/components/shared/display';
import { RequireUser } from '@/components/layout/Guards';
import { InquiryPanel } from '@/components/messaging/InquiryPanel';
import { useDB, usePageMeta } from '@/hooks/useStore';
import { markConversationRead, MAX_MESSAGE_LENGTH, sendMessage } from '@/services/messagingService';
import { switchAccount } from '@/services/userService';
import { formatDate, formatRelative, formatTime } from '@/lib/format';
import { toDateKey } from '@/lib/dates';
import { cn } from '@/lib/utils';

type TabKey = 'all' | 'pending' | 'accepted' | 'completed';
const TAB_FILTER: Record<TabKey, (s: InquiryStatus) => boolean> = {
  all: () => true,
  pending: (s) => s === 'pending',
  accepted: (s) => s === 'accepted',
  completed: (s) => s === 'completed',
};

type Thread = {
  conversation: Conversation;
  inquiry?: Inquiry;
  listing?: Listing;
  other?: User;
  last?: Message;
  unread: number;
  role: 'buyer' | 'provider';
};

export function InboxPage() {
  usePageMeta('Inbox');
  return <RequireUser reason="Pilih akun demo untuk membuka inbox.">{(user) => <Inbox me={user} />}</RequireUser>;
}

function useThreads(me: User): Thread[] {
  const { conversations, inquiries, listings, users, messages } = useDB();
  return React.useMemo(() => {
    const byConv = new Map<string, Message[]>();
    for (const m of messages) {
      const arr = byConv.get(m.conversationId);
      arr ? arr.push(m) : byConv.set(m.conversationId, [m]);
    }
    return conversations
      .filter((c) => c.participantIds.includes(me.id))
      .map((c) => {
        const inquiry = inquiries.find((i) => i.id === c.inquiryId);
        const msgs = byConv.get(c.id) ?? [];
        return {
          conversation: c,
          inquiry,
          listing: listings.find((l) => l.id === inquiry?.listingId),
          other: users.find((u) => u.id === c.participantIds.find((p) => p !== me.id)),
          last: msgs.reduce<Message | undefined>((a, b) => (!a || b.createdAt > a.createdAt ? b : a), undefined),
          unread: msgs.filter((m) => !m.readByIds.includes(me.id)).length,
          role: inquiry?.providerId === me.id ? 'provider' : 'buyer',
        } satisfies Thread;
      })
      .sort((a, b) => (b.last?.createdAt ?? b.conversation.createdAt).localeCompare(a.last?.createdAt ?? a.conversation.createdAt));
  }, [conversations, inquiries, listings, users, messages, me.id]);
}

function Inbox({ me }: { me: User }) {
  const { conversationId } = useParams();
  const [params, setParams] = useSearchParams();
  const tab = (params.get('tab') as TabKey) in TAB_FILTER ? (params.get('tab') as TabKey) : 'all';
  const listingFilter = params.get('listing');
  const threads = useThreads(me);
  const { listings } = useDB();
  const filterListing = listings.find((l) => l.id === listingFilter);

  const scoped = threads.filter((t) => !listingFilter || t.listing?.id === listingFilter);
  const shown = scoped.filter((t) => t.inquiry && TAB_FILTER[tab](t.inquiry.status));
  const count = (k: TabKey) => scoped.filter((t) => t.inquiry && TAB_FILTER[k](t.inquiry.status)).length;
  const active = threads.find((t) => t.conversation.id === conversationId);
  const qs = params.toString() ? `?${params.toString()}` : '';

  const setParam = (k: string, v: string | null) => {
    const next = new URLSearchParams(params);
    v ? next.set(k, v) : next.delete(k);
    setParams(next, { replace: true });
  };

  return (
    <div className="mx-auto flex h-full max-w-[1280px] md:px-4 md:py-4">
      <div className="flex h-full w-full overflow-hidden bg-white md:rounded-3xl md:border md:border-border md:shadow-card">
        {/* List */}
        <aside
          className={cn('flex h-full w-full flex-col border-border md:w-[360px] md:shrink-0 md:border-r', conversationId && 'hidden md:flex')}
          aria-label="Daftar percakapan"
        >
          <div className="space-y-3 border-b border-border p-4">
            <h1 className="text-xl font-bold text-navy">Inbox</h1>
            {filterListing && (
              <div className="flex items-center gap-2 rounded-xl bg-teal-50 py-1.5 pl-3 pr-1 text-[13px] text-teal-900 ring-1 ring-teal-200">
                <span className="min-w-0 flex-1 truncate">
                  Listing: <b>{filterListing.title}</b>
                </span>
                <button
                  type="button"
                  onClick={() => setParam('listing', null)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-teal-100"
                  aria-label="Hapus filter listing"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
            <Tabs
              label="Filter status inquiry"
              value={tab}
              onChange={(v) => setParam('tab', v === 'all' ? null : v)}
              items={[
                { value: 'all', label: 'Semua' },
                { value: 'pending', label: 'Menunggu', count: count('pending') },
                { value: 'accepted', label: 'Diterima', count: count('accepted') },
                { value: 'completed', label: 'Selesai' },
              ]}
            />
          </div>
          <ul className="min-h-0 flex-1 overflow-y-auto p-2" role="list">
            {shown.length === 0 ? (
              <li className="p-4">
                <EmptyState
                  icon={<MessageCircle />}
                  title="Belum ada percakapan"
                  description={tab === 'all' ? 'Inquiry Anda muncul di sini.' : 'Tidak ada inquiry dengan status ini.'}
                  action={
                    <Button asChild variant="outline" size="sm">
                      <Link to="/explore">Jelajahi listing</Link>
                    </Button>
                  }
                  className="border-0 py-8"
                />
              </li>
            ) : (
              shown.map((t) => <ThreadItem key={t.conversation.id} thread={t} active={t.conversation.id === conversationId} href={`/inbox/${t.conversation.id}${qs}`} />)
            )}
          </ul>
        </aside>

        {/* Thread */}
        <section className={cn('h-full min-w-0 flex-1 flex-col', conversationId ? 'flex' : 'hidden md:flex')}>
          {conversationId ? (
            active ? (
              <ThreadView key={active.conversation.id} thread={active} me={me} backHref={`/inbox${qs}`} />
            ) : (
              <NoAccess backHref={`/inbox${qs}`} />
            )
          ) : (
            <div className="flex h-full items-center justify-center p-8">
              <EmptyState icon={<MessageCircle />} title="Pilih percakapan" description="Percakapan terhubung ke satu inquiry." className="max-w-sm border-0" />
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function ThreadItem({ thread: t, active, href }: { thread: Thread; active: boolean; href: string }) {
  const preview = t.last ? (t.last.senderId === 'system' ? `Info: ${t.last.body}` : t.last.body) : 'Belum ada pesan';
  return (
    <li>
      <Link
        to={href}
        aria-current={active ? 'page' : undefined}
        className={cn(
          'flex gap-3 rounded-2xl p-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal-500',
          active ? 'bg-teal-50' : 'hover:bg-slate-50',
        )}
      >
        <Avatar user={t.other} size={44} />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <p className={cn('truncate text-sm text-navy', t.unread ? 'font-extrabold' : 'font-semibold')}>{t.other?.displayName ?? 'Pengguna'}</p>
            <span className="shrink-0 text-[11px] text-slate-400">{t.last ? formatRelative(t.last.createdAt) : ''}</span>
          </div>
          <p className="truncate text-xs text-slate-500">
            {t.role === 'provider' ? 'Penitip' : 'Penyedia'} · {t.listing?.title ?? 'Listing dihapus'}
          </p>
          <div className="mt-1 flex items-center gap-2">
            {t.inquiry && <InquiryStatusBadge status={t.inquiry.status} />}
            <p className={cn('min-w-0 flex-1 truncate text-[13px]', t.unread ? 'font-semibold text-navy' : 'text-slate-500')}>{preview}</p>
            {t.unread > 0 && (
              <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-teal-700 px-1.5 text-[11px] font-bold text-white" aria-label={`${t.unread} belum dibaca`}>
                {t.unread}
              </span>
            )}
          </div>
        </div>
      </Link>
    </li>
  );
}

function NoAccess({ backHref }: { backHref: string }) {
  return (
    <div className="flex h-full items-center justify-center p-6">
      <EmptyState
        icon={<Lock />}
        title="Percakapan tidak tersedia"
        description="Bukan peserta percakapan ini. Ganti akun demo."
        action={
          <Button asChild variant="outline">
            <Link to={backHref}>Kembali ke inbox</Link>
          </Button>
        }
        className="max-w-sm border-0"
      />
    </div>
  );
}

function ThreadView({ thread: t, me, backHref }: { thread: Thread; me: User; backHref: string }) {
  const { messages, users } = useDB();
  const navigate = useNavigate();
  const msgs = React.useMemo(
    () => messages.filter((m) => m.conversationId === t.conversation.id).sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [messages, t.conversation.id],
  );
  const [draft, setDraft] = React.useState('');
  const endRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLTextAreaElement>(null);

  usePageMeta(`Chat dengan ${t.other?.displayName ?? 'pengguna'}`);

  // Simulated read receipts whenever the thread is open and new messages arrive.
  React.useEffect(() => {
    markConversationRead(t.conversation.id, me.id);
  }, [t.conversation.id, me.id, msgs.length]);

  React.useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [msgs.length]);

  const send = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!draft.trim()) return;
    const r = sendMessage(t.conversation.id, me.id, draft);
    if (!r.ok) return toast.error(r.error);
    setDraft('');
    inputRef.current?.focus();
  };

  const switchToOther = () => {
    if (!t.other) return;
    switchAccount(t.other.id);
    toast.success(`Sekarang sebagai ${t.other.displayName} (demo)`);
  };

  const groups = React.useMemo(() => {
    const out: { day: string; items: Message[] }[] = [];
    for (const m of msgs) {
      const day = toDateKey(new Date(m.createdAt));
      const g = out[out.length - 1];
      g && g.day === day ? g.items.push(m) : out.push({ day, items: [m] });
    }
    return out;
  }, [msgs]);

  return (
    <>
      <header className="flex items-center gap-3 border-b border-border px-2 py-2 md:px-4">
        <Button variant="ghost" size="icon" className="md:hidden" onClick={() => navigate(backHref)} aria-label="Kembali ke daftar percakapan">
          <ArrowLeft className="!size-5" />
        </Button>
        <Link to={`/providers/${t.other?.id}`} className="flex min-w-0 flex-1 items-center gap-3 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500">
          <Avatar user={t.other} size={40} />
          <div className="min-w-0">
            <p className="truncate font-bold text-navy">{t.other?.displayName ?? 'Pengguna'}</p>
            <p className="truncate text-xs text-slate-500">{t.role === 'provider' ? 'Penitip / pembeli' : 'Penyedia'} · {t.other?.city ?? '-'}</p>
          </div>
        </Link>
        <Button variant="outline" size="sm" onClick={switchToOther} title="Mode demo: beralih ke akun lawan bicara untuk membalas">
          <Repeat /> <span className="hidden sm:inline">Balas sebagai</span> {t.other?.displayName.split(' ')[0]}
        </Button>
      </header>

      {t.inquiry && <InquiryPanel inquiry={t.inquiry} listing={t.listing} me={me} other={t.other} />}

      <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50 px-3 py-4 sm:px-6" aria-live="polite" aria-label="Pesan">
        {groups.map((g) => (
          <div key={g.day} className="space-y-2">
            <p className="my-3 text-center">
              <span className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-slate-500 shadow-sm">{formatDate(g.day)}</span>
            </p>
            {g.items.map((m) => (
              <Bubble key={m.id} m={m} mine={m.senderId === me.id} sender={users.find((u) => u.id === m.senderId)} otherId={t.other?.id} />
            ))}
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <form onSubmit={send} className="flex items-end gap-2 border-t border-border bg-white p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <label htmlFor="composer" className="sr-only">
          Tulis pesan
        </label>
        <textarea
          id="composer"
          ref={inputRef}
          value={draft}
          rows={1}
          maxLength={MAX_MESSAGE_LENGTH}
          onChange={(e) => {
            setDraft(e.target.value);
            e.target.style.height = 'auto';
            e.target.style.height = `${Math.min(e.target.scrollHeight, 140)}px`;
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              send();
            }
          }}
          placeholder="Tulis pesan…"
          className="max-h-[140px] min-h-[44px] flex-1 resize-none rounded-2xl border border-border bg-slate-50 px-4 py-2.5 text-[15px] leading-snug focus-visible:border-teal-500 focus-visible:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/30"
        />
        <Button type="submit" variant="accent" size="icon" className="rounded-full" disabled={!draft.trim()} aria-label="Kirim pesan">
          <Send className="!size-5" />
        </Button>
      </form>
      <p className="flex items-center justify-center gap-1 bg-white px-3 pb-2 text-center text-[11px] text-slate-400">
        <Info className="h-3 w-3" /> Pesan disimpan lokal di browser ini.
      </p>
    </>
  );
}

function Bubble({ m, mine, sender, otherId }: { m: Message; mine: boolean; sender?: User; otherId?: string }) {
  if (m.senderId === 'system') {
    return (
      <p className="mx-auto my-2 max-w-md rounded-xl bg-navy-50 px-3 py-2 text-center text-xs font-medium text-navy-600 ring-1 ring-navy-100">{m.body}</p>
    );
  }
  const readByOther = otherId ? m.readByIds.includes(otherId) : false;
  return (
    <div className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[85%] rounded-2xl px-3.5 py-2 text-[15px] leading-snug shadow-sm sm:max-w-[70%]',
          mine ? 'rounded-br-md bg-teal-700 text-white' : 'rounded-bl-md bg-white text-navy',
        )}
      >
        {!mine && <p className="mb-0.5 text-xs font-bold text-teal-700">{sender?.displayName ?? 'Pengguna'}</p>}
        <p className="whitespace-pre-line break-words">{m.body}</p>
        <p className={cn('mt-1 flex items-center justify-end gap-1 text-[11px]', mine ? 'text-white/80' : 'text-slate-400')}>
          {formatTime(m.createdAt)}
          {mine &&
            (readByOther ? (
              <CheckCheck className="h-3.5 w-3.5" aria-label="Dibaca" />
            ) : (
              <Check className="h-3.5 w-3.5" aria-label="Terkirim" />
            ))}
        </p>
      </div>
    </div>
  );
}
