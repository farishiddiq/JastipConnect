import * as React from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CalendarDays, Eye, Inbox, LayoutList, MoreHorizontal, Pencil, PlusCircle, Repeat, Trash2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Tabs } from '@/components/ui/misc';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { EmptyState, ListingCover, ListingStatusBadge, PageHeader, RouteDisplay, TypeBadge } from '@/components/shared/display';
import { useConfirm } from '@/components/shared/ConfirmProvider';
import { RequireUser } from '@/components/layout/Guards';
import { AvailabilityMeter } from '@/components/listings/ListingCard';
import { PromotePanel } from '@/components/listings/PromotePanel';
import { useDB, useListingViews, usePageMeta, type ListingView } from '@/hooks/useStore';
import { closeListing, deleteDraft, reopenListing } from '@/services/listingService';
import { formatDate, formatKg } from '@/lib/format';
import type { User } from '@/types';

type Tab = 'active' | 'full' | 'closed' | 'draft';
const TAB_STATUS: Record<Tab, string[]> = { active: ['open'], full: ['full'], closed: ['closed', 'expired'], draft: ['draft'] };

export function MyListingsPage() {
  usePageMeta('Listing Saya');
  return <RequireUser reason="Pilih akun demo untuk melihat listing Anda.">{(user) => <MyListings user={user} />}</RequireUser>;
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

  return (
    <div className="container py-6 sm:py-10">
      <PageHeader
        title="Listing Saya"
        description="Kelola perjalanan dan PO Anda."
        actions={
          <Button asChild variant="accent">
            <Link to="/post">
              <PlusCircle /> Buat Listing
            </Link>
          </Button>
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
              description={tab === 'active' ? 'Pasang perjalanan atau PO pertama Anda.' : undefined}
              action={
                <Button asChild variant="accent">
                  <Link to="/post">
                    <PlusCircle /> Buat Listing
                  </Link>
                </Button>
              }
            />
          )}
        </div>
        <aside>
          <PromotePanel compact />
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

  const close = async () => {
    if (!(await confirm({ title: 'Tutup listing?', description: 'Listing tidak akan menerima inquiry baru.', confirmLabel: 'Tutup', destructive: true }))) return;
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
          {pending > 0 && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800">{pending} menunggu</span>}
        </div>
        <h2 className="font-bold leading-snug text-navy">
          <Link to={`/listings/${l.id}`} className="hover:text-teal-700">
            {l.title}
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
            <Inbox className="h-3.5 w-3.5" /> {its.length} inquiry
          </span>
          <span>{l.publishedAt ? `Terbit ${formatDate(l.publishedAt.slice(0, 10))}` : 'Belum terbit'}</span>
        </div>
        {status !== 'draft' && (
          <div className="max-w-sm">
            <AvailabilityMeter view={view} />
            <p className="mt-1 text-xs text-slate-500">
              {a.type === 'weight' ? `Diterima ${formatKg(a.reserved)} · sisa ${formatKg(a.remaining)}` : `Terjual/direservasi ${a.reserved} dari ${a.total} item`}
            </p>
          </div>
        )}
      </div>
      <div className="flex shrink-0 items-start gap-2 sm:flex-col sm:items-end">
        {status === 'draft' ? (
          <Button asChild size="sm" variant="accent">
            <Link to={`/listings/${l.id}/edit`}>Lanjutkan</Link>
          </Button>
        ) : (
          <Button asChild size="sm" variant="outline">
            <Link to={`/inbox?listing=${l.id}`}>
              <Inbox /> Inquiry
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
