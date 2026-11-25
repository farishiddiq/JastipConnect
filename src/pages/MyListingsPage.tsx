import * as React from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CalendarDays, Eye, FileSpreadsheet, Inbox, LayoutList, MoreHorizontal, Pencil, PlusCircle, Repeat, Sparkles, Trash2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge, Tabs } from '@/components/ui/misc';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { EmptyState, FeaturedBadge, ListingCover, ListingStatusBadge, PageHeader, RouteDisplay, TypeBadge } from '@/components/shared/display';
import { ShareTripButton } from '@/components/listings/ShareTripCard';
import { TicketProofButton } from '@/components/listings/TicketProof';
import { useCheckout } from '@/components/plans/Checkout';
import { OPEN_ORDER_STATUSES } from '@/lib/availability';
import { useConfirm } from '@/components/shared/ConfirmProvider';
import { RequireProvider } from '@/components/layout/Guards';
import { AvailabilityMeter } from '@/components/listings/ListingCard';
import { PromotePanel } from '@/components/listings/PromotePanel';
import { useDB, useListingViews, usePageMeta, type ListingView } from '@/hooks/useStore';
import { closeListing, deleteDraft, reopenListing } from '@/services/listingService';
import { formatDate, formatKg, listingTitle } from '@/lib/format';
import type { User } from '@/types';

type Tab = 'active' | 'full' | 'closed' | 'draft';
const TAB_STATUS: Record<Tab, string[]> = { active: ['open'], full: ['full'], closed: ['closed', 'expired'], draft: ['draft'] };

export function MyListingsPage() {
  usePageMeta('Trip saya');
  return <RequireProvider reason="Masuk sebagai provider untuk mengelola trip Anda.">{(user) => <MyListings user={user} />}</RequireProvider>;
}

function MyListings({ user }: { user: User }) {
  const [params, setParams] = useSearchParams();
  const tabParam = params.get('tab') as Tab | null;
  const tab: Tab = tabParam && tabParam in TAB_STATUS ? tabParam : 'active';
  const views = useListingViews();
  const mine = React.useMemo(() => views.filter((v) => v.listing.ownerId === user.id), [views, user.id]);
  const shown = mine
    .filter((v) => TAB_STATUS[tab].includes(v.status))
    .sort((a, b) => b.listing.updatedAt.localeCompare(a.listing.updatedAt));
  const count = (t: Tab) => mine.filter((v) => TAB_STATUS[t].includes(v.status)).length;
  const activeFree = mine.filter((v) => ['open', 'full'].includes(v.status) && !v.listing.paidSlot).length;

  return (
    <div className="container py-6 sm:py-10">
      <PageHeader
        title="Trip saya"
        description="Kelola trip bagasi dan pre-order Anda. Order per trip tidak dibatasi."
        actions={
          <>
            <Button asChild variant="outline">
              <Link to="/orders">
                <Inbox /> Request masuk
              </Link>
            </Button>
            <Button asChild variant="accent">
              <Link to="/post">
                <PlusCircle /> Pasang trip
              </Link>
            </Button>
          </>
        }
      />
      <Tabs
        label="Status listing"
        value={tab}
        onChange={(t) => setParams({ tab: t }, { replace: true })}
        items={[
          { value: 'active', label: 'Aktif', count: count('active') },
          { value: 'full', label: 'Penuh', count: count('full') },
          { value: 'closed', label: 'Ditutup', count: count('closed') },
          { value: 'draft', label: 'Draf', count: count('draft') },
        ]}
        className="mb-6 sm:max-w-xl"
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div role="tabpanel" className="min-w-0">
          {shown.length ? (
            <ul className="space-y-3">
              {shown.map((v) => (
                <li key={v.listing.id}>
                  <MyListingRow view={v} userId={user.id} />
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              icon={<LayoutList />}
              title={tab === 'draft' ? 'Belum ada draf' : tab === 'active' ? 'Belum ada listing aktif' : 'Tidak ada listing di sini'}
              description={tab === 'active' ? 'Pasang trip pertama Anda. Gratis untuk 1 trip aktif.' : undefined}
              action={
                <Button asChild variant="accent">
                  <Link to="/post">
                    <PlusCircle /> Pasang trip
                  </Link>
                </Button>
              }
            />
          )}
        </div>
        <aside>
          <PromotePanel activeFree={activeFree} className="lg:sticky lg:top-24" />
        </aside>
      </div>
    </div>
  );
}

function MyListingRow({ view, userId }: { view: ListingView; userId: string }) {
  const { listing: l, status, availability: a } = view;
  const { inquiries } = useDB();
  const confirm = useConfirm();
  const its = inquiries.filter((i) => i.listingId === l.id);
  const pending = its.filter((i) => i.status === 'pending').length;
  const running = its.filter((i) => OPEN_ORDER_STATUSES.includes(i.status) && i.status !== 'pending').length;
  const { startCheckout } = useCheckout();

  const close = async () => {
    if (!(await confirm({ title: 'Tutup trip?', description: 'Trip tidak menerima request baru. Order yang berjalan tetap bisa diselesaikan.', confirmLabel: 'Tutup', destructive: true }))) return;
    const r = closeListing(l.id, userId);
    r.ok ? toast.success('Listing ditutup') : toast.error(r.error);
  };
  const reopen = () => {
    const r = reopenListing(l.id, userId);
    r.ok ? toast.success('Listing dibuka kembali') : toast.error(r.error);
  };
  const remove = async () => {
    if (!(await confirm({ title: 'Hapus draf?', description: 'Draf akan dihapus permanen dari browser ini.', confirmLabel: 'Hapus', destructive: true }))) return;
    const r = deleteDraft(l.id, userId);
    r.ok ? toast.success('Draf dihapus') : toast.error(r.error);
  };

  return (
    <article className="flex flex-col gap-4 rounded-2xl border border-border bg-white p-4 shadow-card sm:flex-row">
      <Link to={`/listings/${l.id}`} className="block aspect-[16/9] w-full shrink-0 overflow-hidden rounded-xl sm:aspect-square sm:w-32" aria-hidden tabIndex={-1}>
        <ListingCover listing={l} compact />
      </Link>
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <TypeBadge type={l.type} />
          <ListingStatusBadge status={status} type={l.type} />
          {view.featuredUntil && status === 'open' && <FeaturedBadge />}
          {pending > 0 && <Badge tone="amber">{pending} request baru</Badge>}
          {running > 0 && <Badge tone="teal">{running} berjalan</Badge>}
          {l.paidSlot && <Badge tone="muted">Slot berbayar</Badge>}
        </div>
        <h2 className="font-bold leading-snug text-navy">
          <Link to={`/listings/${l.id}`} className="hover:text-teal-700">
            {listingTitle(l)}
          </Link>
        </h2>
        <RouteDisplay listing={l} size="sm" className="text-slate-600" />
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <CalendarDays className="h-3.5 w-3.5" /> {l.departureDate ? formatDate(l.departureDate) : '-'}
          </span>
          <span className="flex items-center gap-1">
            <Eye className="h-3.5 w-3.5" /> {l.viewCount} dilihat
          </span>
          <span className="flex items-center gap-1">
            <Inbox className="h-3.5 w-3.5" /> {its.length} order
          </span>
          <span>{l.publishedAt ? `Terbit ${formatDate(l.publishedAt.slice(0, 10))}` : 'Belum terbit'}</span>
        </div>
        {status !== 'draft' && (
          <div className="max-w-sm">
            <AvailabilityMeter view={view} />
            <p className="mt-1 text-xs text-slate-500">
              {a.type === 'weight' ? `Terpakai ${formatKg(a.reserved)} · sisa ${formatKg(a.remaining)}` : `Terjual/direservasi ${a.reserved} dari ${a.total} item`}
            </p>
          </div>
        )}
        {status !== 'draft' && (
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <ShareTripButton view={view} size="sm" label="Bagikan" />
            {l.type === 'weight' && <TicketProofButton listing={l} actorId={userId} />}
            {status === 'open' && !view.featuredUntil && (
              <Button size="sm" variant="ghost" onClick={() => startCheckout('boost', l.id)}>
                <Sparkles /> Boost
              </Button>
            )}
          </div>
        )}
      </div>
      <div className="flex shrink-0 items-start gap-2 sm:flex-col sm:items-end">
        {status === 'draft' ? (
          <Button asChild size="sm" variant="accent">
            <Link to={`/listings/${l.id}/edit`}>Lanjutkan</Link>
          </Button>
        ) : (
          <Button asChild size="sm" variant="accent">
            <Link to={`/my-listings/${l.id}/orders`}>
              <FileSpreadsheet /> Order sheet
            </Link>
          </Button>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="icon-sm" variant="ghost" aria-label={`Aksi lain untuk ${l.title}`}>
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link to={`/listings/${l.id}`}>
                <Eye /> Lihat
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to={`/inbox?listing=${l.id}`}>
                <Inbox /> Chat request
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to={`/listings/${l.id}/edit`}>
                <Pencil /> Edit
              </Link>
            </DropdownMenuItem>
            {status === 'draft' ? (
              <DropdownMenuItem onSelect={remove} className="text-red-600">
                <Trash2 className="!text-red-500" /> Hapus draf
              </DropdownMenuItem>
            ) : status === 'closed' ? (
              <DropdownMenuItem onSelect={reopen} disabled={!!l.closedByAdmin}>
                <Repeat /> Buka kembali
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onSelect={close} className="text-red-600">
                <XCircle className="!text-red-500" /> Tutup listing
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </article>
  );
}
