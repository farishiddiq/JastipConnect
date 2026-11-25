import * as React from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Check, ChevronRight, Inbox, Package, X } from 'lucide-react';
import { toast } from 'sonner';
import type { Inquiry, InquiryStatus, Listing, User } from '@/types';
import { Button } from '@/components/ui/button';
import { Tabs } from '@/components/ui/misc';
import { Avatar, EmptyState, InquiryStatusBadge, PageHeader, PaymentBadge, RouteDisplay } from '@/components/shared/display';
import { HoldCountdown } from '@/components/orders/OrderParts';
import { useConfirm } from '@/components/shared/ConfirmProvider';
import { RequireUser } from '@/components/layout/Guards';
import { useClientRating, useDB, useMode, usePageMeta } from '@/hooks/useStore';
import { Star } from 'lucide-react';
import { acceptInquiry, declineInquiry } from '@/services/inquiryService';
import { inquiryTotals } from '@/lib/availability';
import { formatKg, formatMoneyGroups, formatRelative } from '@/lib/format';
import { cn } from '@/lib/utils';

type Tab = 'new' | 'active' | 'done' | 'closed';
const TAB_STATUSES: Record<Tab, InquiryStatus[]> = {
  new: ['pending'],
  active: ['accepted', 'handed_over', 'shipped', 'delivered'],
  done: ['completed'],
  closed: ['declined', 'cancelled', 'expired'],
};

export function OrdersPage() {
  const mode = useMode();
  usePageMeta(mode === 'provider' ? 'Request masuk' : 'Pesanan saya');
  return <RequireUser reason="Masuk untuk melihat pesanan Anda.">{(user) => <Orders me={user} mode={mode} />}</RequireUser>;
}

function Orders({ me, mode }: { me: User; mode: 'client' | 'provider' }) {
  const { inquiries, listings, users } = useDB();
  const [params, setParams] = useSearchParams();
  const provider = mode === 'provider';
  const tabParam = params.get('tab') as Tab | null;
  const tab: Tab = tabParam && tabParam in TAB_STATUSES ? tabParam : provider ? 'new' : 'active';

  const mine = React.useMemo(
    () => inquiries.filter((i) => (provider ? i.providerId === me.id : i.buyerId === me.id)).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [inquiries, provider, me.id],
  );
  const count = (t: Tab) => mine.filter((i) => TAB_STATUSES[t].includes(i.status)).length;
  const shown = mine.filter((i) => TAB_STATUSES[tab].includes(i.status));

  return (
    <div className="container max-w-4xl py-6 sm:py-10">
      <PageHeader
        title={provider ? 'Request masuk' : 'Pesanan saya'}
        description={provider ? 'Terima atau tolak request, lalu catat serah terima sampai selesai.' : 'Lacak titipan Anda dari request sampai diterima.'}
      />
      <Tabs
        label="Status order"
        value={tab}
        onChange={(t) => setParams({ tab: t }, { replace: true })}
        items={[
          { value: 'new', label: provider ? 'Baru' : 'Menunggu', count: count('new') },
          { value: 'active', label: 'Berjalan', count: count('active') },
          { value: 'done', label: 'Selesai', count: count('done') },
          { value: 'closed', label: 'Lainnya', count: count('closed') },
        ]}
        className="mb-5"
      />
      {shown.length ? (
        <ul className="space-y-3">
          {shown.map((i) => (
            <li key={i.id}>
              <OrderRow
                inquiry={i}
                listing={listings.find((l) => l.id === i.listingId)}
                other={users.find((u) => u.id === (provider ? i.buyerId : i.providerId))}
                me={me}
                provider={provider}
              />
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          icon={provider ? <Inbox /> : <Package />}
          title={tab === 'new' && provider ? 'Belum ada request baru' : 'Belum ada order di sini'}
          description={provider ? 'Bagikan trip Anda ke grup WhatsApp diaspora supaya request masuk.' : 'Cari trip bagasi lalu ajukan titipan.'}
          action={
            <Button asChild variant="accent">
              <Link to={provider ? '/my-listings' : '/explore'}>{provider ? 'Trip saya' : 'Cari trip'}</Link>
            </Button>
          }
        />
      )}
    </div>
  );
}

function OrderRow({ inquiry: i, listing, other, me, provider }: { inquiry: Inquiry; listing?: Listing; other?: User; me: User; provider: boolean }) {
  const confirm = useConfirm();
  const totals = inquiryTotals(i, listing);
  const what = listing?.type === 'weight' ? formatKg(i.handover?.weightKg ?? i.requestedKg ?? 0) : `${(i.items ?? []).reduce((s, l) => s + l.quantity, 0)} item`;

  const accept = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!(await confirm({ title: 'Terima request?', description: `${what} ditahan untuk ${other?.displayName ?? 'klien'}.`, confirmLabel: 'Terima' }))) return;
    const r = acceptInquiry(i.id, me.id);
    r.ok ? toast.success('Request diterima') : toast.error(r.error);
  };
  const decline = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!(await confirm({ title: 'Tolak request?', description: 'Klien diberi tahu dan kuota dilepas.', confirmLabel: 'Tolak', destructive: true }))) return;
    const r = declineInquiry(i.id, me.id);
    r.ok ? toast.success('Request ditolak') : toast.error(r.error);
  };

  return (
    <Link
      to={`/orders/${i.id}`}
      className="group flex flex-col gap-3 rounded-2xl border border-border bg-white p-4 shadow-card transition-colors hover:border-teal-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 sm:flex-row sm:items-center"
    >
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <Avatar user={other} size={44} />
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-navy">{other?.displayName ?? 'Pengguna'}</span>
            {provider && <ClientRatingTag clientId={i.buyerId} />}
            <InquiryStatusBadge status={i.status} />
            {typeof i.amountDue === 'number' && <PaymentBadge status={i.payment?.status ?? 'unpaid'} />}
            <HoldCountdown inquiry={i} />
          </div>
          {listing && <RouteDisplay listing={listing} size="sm" className="text-slate-600" />}
          <p className="text-[13px] text-slate-500">
            <span className="num font-semibold text-navy">{what}</span> · <span className="num">{formatMoneyGroups(totals)}</span> · {formatRelative(i.updatedAt)}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {provider && i.status === 'pending' ? (
          <>
            <Button size="sm" variant="accent" onClick={accept}>
              <Check /> Terima
            </Button>
            <Button size="sm" variant="destructive-outline" onClick={decline}>
              <X /> Tolak
            </Button>
          </>
        ) : (
          <span className={cn('flex items-center gap-1 text-[13px] font-bold text-teal-800')}>
            Lacak <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </span>
        )}
      </div>
    </Link>
  );
}

/** Providers see how other providers rated this client before accepting. */
function ClientRatingTag({ clientId }: { clientId: string }) {
  const r = useClientRating(clientId);
  if (!r.count) return <span className="text-xs text-slate-400">Klien baru</span>;
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-navy" title={`Rating dari ${r.count} penyedia`}>
      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" /> {r.average.toFixed(1)} <span className="font-normal text-slate-500">({r.count})</span>
    </span>
  );
}
