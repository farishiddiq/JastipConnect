import * as React from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  CalendarClock,
  CalendarDays,
  CalendarRange,
  CheckCircle2,
  Eye,
  Info,
  Inbox,
  Lock,
  MapPin,
  MessageCircle,
  Package,
  Pencil,
  Repeat,
  ShoppingBag,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import type { ShoppingListing, WeightListing } from '@/types';
import { Button } from '@/components/ui/button';
import { Badge, Card, Separator } from '@/components/ui/misc';
import {
  Avatar,
  EmptyState,
  InquiryStatusBadge,
  ListingCover,
  ListingStatusBadge,
  ProductThumb,
  RouteDisplay,
  StarRating,
  TypeBadge,
  VerificationLabel,
} from '@/components/shared/display';
import { SafetyNotice } from '@/components/shared/SafetyNotice';
import { ShareButton } from '@/components/shared/ShareButton';
import { ReportButton } from '@/components/shared/ReportDialog';
import { useAuth } from '@/components/shared/AccountSwitcher';
import { useConfirm } from '@/components/shared/ConfirmProvider';
import { AvailabilityMeter, PriceLabel, SaveButton } from '@/components/listings/ListingCard';
import { QuantityStepper, selectionTotals, ShoppingOrderDialog, WeightInquiryDialog } from '@/components/forms/InquiryForms';
import { PromotePanel } from '@/components/listings/PromotePanel';
import { useCompletedCount, useCurrentUser, useDB, useListingView, usePageMeta, useProviderRating, type ListingView } from '@/hooks/useStore';
import { closeListing, recordView, reopenListing } from '@/services/listingService';
import { productAvailability } from '@/lib/availability';
import { formatCountdown, formatDate, formatKg, formatMoney, formatMoneyGroups, formatMonthYear } from '@/lib/format';
import { cn } from '@/lib/utils';

const BLOCK_REASON: Record<string, string> = {
  closed: 'Listing ini sudah ditutup oleh penyedia, jadi tidak menerima inquiry baru.',
  full: 'Kuota/stok sudah habis. Simpan listing ini atau cari listing lain dengan rute serupa.',
  expired: 'Batas waktu titip/pesan sudah lewat.',
  draft: 'Listing ini masih draf dan belum diterbitkan.',
};

export function ListingDetailPage() {
  const { id } = useParams();
  const view = useListingView(id);
  const user = useCurrentUser();

  usePageMeta(
    view ? view.listing.title : 'Listing tidak ditemukan',
    view ? `${view.listing.origin.city} → ${view.listing.destination.city}, berangkat ${formatDate(view.listing.departureDate)}. ${view.listing.description.slice(0, 120)}` : undefined,
  );

  React.useEffect(() => {
    if (id && view && view.status !== 'draft') recordView(id, user?.id ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, !!view]);

  if (!view || (view.status === 'draft' && view.listing.ownerId !== user?.id)) {
    return (
      <div className="container max-w-lg py-16">
        <EmptyState
          icon={<Package />}
          title="Listing tidak ditemukan"
          description="Listing ini mungkin sudah dihapus atau tautannya salah."
          action={
            <Button asChild>
              <Link to="/explore">Jelajahi listing lain</Link>
            </Button>
          }
        />
      </div>
    );
  }
  return <ListingDetail view={view} />;
}

function ListingDetail({ view }: { view: ListingView }) {
  const { listing: l, status, owner } = view;
  const user = useCurrentUser();
  const isOwner = user?.id === l.ownerId;
  const navigate = useNavigate();
  const { inquiries } = useDB();
  const [selection, setSelection] = React.useState<Record<string, number>>({});
  const [dialog, setDialog] = React.useState<'weight' | 'shop' | null>(null);
  const { requireUser } = useAuth();

  const myInquiries = React.useMemo(
    () => (user ? inquiries.filter((i) => i.listingId === l.id && i.buyerId === user.id) : []),
    [inquiries, user, l.id],
  );
  const { conversations } = useDB();
  const convFor = (inqId: string) => conversations.find((c) => c.inquiryId === inqId)?.id;

  const remainingById = React.useMemo(
    () => (l.type === 'shopping' ? Object.fromEntries(productAvailability(l, inquiries).map((a) => [a.product.id, a.remaining])) : {}),
    [l, inquiries],
  );

  const startInquiry = () => {
    const uid = requireUser(l.type === 'weight' ? 'Pilih akun demo untuk bertanya ke penyedia.' : 'Pilih akun demo untuk mengajukan pesanan.');
    if (!uid) return;
    if (uid === l.ownerId) return toast.info('Ini listing Anda sendiri.');
    setDialog(l.type === 'weight' ? 'weight' : 'shop');
  };

  const canInquire = status === 'open' && !isOwner;

  return (
    <div className="container py-4 sm:py-6">
      <button
        type="button"
        onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/explore'))}
        className="mb-4 flex h-10 items-center gap-1.5 rounded-lg pr-2 text-sm font-semibold text-slate-500 hover:text-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
      >
        <ArrowLeft className="h-4 w-4" /> Kembali
      </button>

      {status === 'draft' && (
        <div className="mb-4 flex items-start gap-3 rounded-2xl bg-sky-50 p-4 text-sm text-sky-900 ring-1 ring-sky-200">
          <Info className="mt-0.5 h-5 w-5 shrink-0" />
          <p>Ini pratinjau draf. Hanya Anda yang dapat melihatnya. Lengkapi dan terbitkan lewat tombol Edit.</p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_380px] lg:gap-8">
        <div className="min-w-0 space-y-6">
          <div className={cn('relative aspect-[16/9] overflow-hidden rounded-3xl sm:aspect-[21/9]', status !== 'open' && status !== 'draft' && 'saturate-[0.5]')}>
            <ListingCover listing={l} />
            <SaveButton listingId={l.id} className="absolute right-4 top-4" />
          </div>

          <header className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <TypeBadge type={l.type} />
              <ListingStatusBadge status={status} type={l.type} />
              {l.closedByAdmin && <Badge tone="red">Ditutup moderator</Badge>}
            </div>
            <h1 className="text-2xl font-extrabold leading-tight tracking-tight text-navy sm:text-3xl">{l.title}</h1>
            <RouteDisplay listing={l} size="lg" />
            <p className="text-sm text-slate-500">
              {l.origin.country} → {l.destination.country}
            </p>
          </header>

          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Fact icon={<CalendarDays />} label="Berangkat" value={formatDate(l.departureDate)} sub={formatCountdown(l.departureDate)} />
            <Fact icon={<CalendarRange />} label="Kembali" value={l.returnDate ? formatDate(l.returnDate) : '—'} />
            <Fact
              icon={<CalendarClock />}
              label={l.type === 'weight' ? 'Batas titip' : 'Batas pesan'}
              value={formatDate(l.orderDeadline)}
              sub={formatCountdown(l.orderDeadline)}
              highlight={status === 'open'}
            />
            <Fact icon={<MapPin />} label="Serah terima" value={l.handoverMethod?.split('(')[0]?.trim() || '—'} />
          </dl>

          {l.type === 'weight' ? (
            <WeightCapacity view={view} />
          ) : (
            <section aria-labelledby="catalog-title">
              <div className="mb-3 flex items-end justify-between">
                <h2 id="catalog-title" className="text-lg font-extrabold text-navy">
                  Katalog produk
                </h2>
                <span className="text-sm text-slate-500">{l.products.length} produk</span>
              </div>
              <ul className="grid gap-3 sm:grid-cols-2">
                {l.products.map((p) => {
                  const rem = remainingById[p.id] ?? 0;
                  const sold = rem <= 0;
                  return (
                    <li key={p.id} className={cn('flex gap-3 rounded-2xl border border-border bg-white p-3 shadow-card', sold && 'opacity-60')}>
                      <ProductThumb imageUrl={p.imageUrl} category={p.category} className="h-20 w-20 shrink-0 rounded-xl text-4xl" />
                      <div className="flex min-w-0 flex-1 flex-col">
                        <p className="font-semibold leading-snug text-navy">{p.name}</p>
                        <p className="text-xs text-slate-500">
                          {p.category}
                          {p.variant && ` · ${p.variant}`}
                        </p>
                        {p.description && <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{p.description}</p>}
                        <div className="mt-auto flex flex-wrap items-end justify-between gap-2 pt-2">
                          <div>
                            <p className="font-extrabold text-navy">{formatMoney(p.unitPrice, p.currency)}</p>
                            <p className={cn('text-xs font-semibold', sold ? 'text-red-600' : rem <= 3 ? 'text-amber-600' : 'text-slate-500')}>
                              {sold ? 'Sold Out' : `Sisa ${rem}`}
                            </p>
                          </div>
                          {canInquire && !sold && (
                            <QuantityStepper
                              label={p.name}
                              value={selection[p.id] ?? 0}
                              max={rem}
                              onChange={(v) => setSelection((s) => ({ ...s, [p.id]: v }))}
                            />
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          <section className="space-y-4" aria-labelledby="desc-title">
            <h2 id="desc-title" className="text-lg font-extrabold text-navy">
              Detail
            </h2>
            <p className="whitespace-pre-line leading-relaxed text-slate-700">{l.description || '—'}</p>
            {l.type === 'weight' && l.permittedItemsNote && (
              <InfoBlock icon={<CheckCircle2 className="text-emerald-600" />} title="Barang yang diterima">
                {l.permittedItemsNote}
              </InfoBlock>
            )}
            {l.prohibitedItemsNote && (
              <InfoBlock icon={<XCircle className="text-red-500" />} title="Barang yang tidak diterima">
                {l.prohibitedItemsNote}
              </InfoBlock>
            )}
            {l.handoverMethod && (
              <InfoBlock icon={<Repeat className="text-teal-600" />} title="Cara serah terima">
                {l.handoverMethod}
              </InfoBlock>
            )}
            <InfoBlock icon={<Info className="text-navy-400" />} title="Syarat & ketentuan">
              {l.terms || '—'}
            </InfoBlock>
          </section>

          <SafetyNotice />

          <div className="flex flex-wrap items-center gap-2">
            <ShareButton path={`/listings/${l.id}`} title={l.title} text={`${l.title} — ${l.origin.city} → ${l.destination.city}`} />
            {!isOwner && <ReportButton targetType="listing" targetId={l.id} targetLabel={l.title} />}
            <span className="ml-auto flex items-center gap-1 text-xs text-slate-400">
              <Eye className="h-4 w-4" /> {l.viewCount} kali dilihat (penghitung lokal)
            </span>
          </div>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <Card className="p-5">
            <PriceLabel view={view} className="[&>span:nth-child(2)]:text-2xl" />
            {l.type === 'shopping' && <p className="mt-0.5 text-xs text-slate-500">Harga per produk sudah termasuk jasa titip</p>}
            <AvailabilityMeter view={view} className="mt-4" />
            <Separator className="my-4" />
            {isOwner ? (
              <OwnerActions view={view} />
            ) : (
              <BuyerCta
                view={view}
                selection={selection}
                canInquire={canInquire}
                onStart={startInquiry}
                myInquiries={myInquiries.map((i) => ({ id: i.id, status: i.status, conv: convFor(i.id) }))}
              />
            )}
          </Card>
          <ProviderCard ownerId={l.ownerId} owner={owner} />
          {isOwner && <PromotePanel compact />}
        </aside>
      </div>

      {/* Mobile sticky CTA */}
      {!isOwner && (
        <>
          <div className="h-20 lg:hidden" aria-hidden />
          <div className="fixed inset-x-0 bottom-[calc(64px+env(safe-area-inset-bottom))] z-30 border-t border-border bg-white/95 px-4 py-3 backdrop-blur md:bottom-0 lg:hidden">
            <MobileCta view={view} selection={selection} canInquire={canInquire} onStart={startInquiry} />
          </div>
        </>
      )}

      {user && l.type === 'weight' && view.availability.type === 'weight' && (
        <WeightInquiryDialog
          open={dialog === 'weight'}
          onOpenChange={(o) => setDialog(o ? 'weight' : null)}
          listing={l as WeightListing}
          remaining={view.availability.remaining}
          buyerId={user.id}
        />
      )}
      {user && l.type === 'shopping' && (
        <ShoppingOrderDialog
          open={dialog === 'shop'}
          onOpenChange={(o) => setDialog(o ? 'shop' : null)}
          listing={l as ShoppingListing}
          selection={selection}
          onSelectionChange={setSelection}
          remainingById={remainingById}
          buyerId={user.id}
        />
      )}
    </div>
  );
}

function Fact({ icon, label, value, sub, highlight }: { icon: React.ReactNode; label: string; value: string; sub?: string; highlight?: boolean }) {
  return (
    <div className={cn('rounded-2xl border p-3', highlight ? 'border-amber-200 bg-amber-50/60' : 'border-border bg-white')}>
      <dt className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 [&_svg]:h-4 [&_svg]:w-4">
        {icon}
        {label}
      </dt>
      <dd className="mt-1 text-sm font-bold leading-snug text-navy">{value}</dd>
      {sub && <dd className={cn('text-xs', highlight ? 'font-semibold text-amber-700' : 'text-slate-400')}>{sub}</dd>}
    </div>
  );
}

function InfoBlock({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 rounded-2xl bg-white p-4 ring-1 ring-border">
      <span className="mt-0.5 shrink-0 [&_svg]:h-5 [&_svg]:w-5">{icon}</span>
      <div className="min-w-0">
        <h3 className="text-sm font-bold text-navy">{title}</h3>
        <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-slate-600">{children}</p>
      </div>
    </div>
  );
}

function WeightCapacity({ view }: { view: ListingView }) {
  const l = view.listing as WeightListing;
  const a = view.availability;
  return (
    <section aria-labelledby="cap-title" className="rounded-3xl bg-navy p-5 text-white sm:p-6">
      <h2 id="cap-title" className="text-sm font-semibold text-white/70">
        Kuota bagasi
      </h2>
      <div className="mt-3 grid grid-cols-3 gap-3 text-center">
        <div>
          <p className="text-2xl font-extrabold sm:text-3xl">{formatKg(l.capacityKg)}</p>
          <p className="text-xs text-white/60">Total</p>
        </div>
        <div>
          <p className="text-2xl font-extrabold text-teal-300 sm:text-3xl">{formatKg(a.reserved)}</p>
          <p className="text-xs text-white/60">Diterima</p>
        </div>
        <div>
          <p className="text-2xl font-extrabold text-amber-300 sm:text-3xl">{formatKg(a.remaining)}</p>
          <p className="text-xs text-white/60">Sisa</p>
        </div>
      </div>
      <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-white/15">
        <div className="h-full rounded-full bg-teal-400" style={{ width: `${Math.min(100, a.ratio * 100)}%` }} />
      </div>
      <p className="mt-3 text-xs text-white/60">
        Biaya {formatMoney(l.pricePerKg, l.currency)}/kg. Kuota hanya berkurang ketika penyedia menerima inquiry.
        {l.returnLegDropOff && ' Titipan dapat diserahkan untuk perjalanan pulang.'}
      </p>
    </section>
  );
}

function BuyerCta({
  view,
  selection,
  canInquire,
  onStart,
  myInquiries,
}: {
  view: ListingView;
  selection: Record<string, number>;
  canInquire: boolean;
  onStart: () => void;
  myInquiries: { id: string; status: import('@/types').InquiryStatus; conv?: string }[];
}) {
  const l = view.listing;
  const { totals, count } = l.type === 'shopping' ? selectionTotals(l, selection) : { totals: {}, count: 0 };
  return (
    <div className="space-y-3">
      {myInquiries.length > 0 && (
        <div className="rounded-xl bg-teal-50 p-3 text-sm ring-1 ring-teal-200">
          <p className="font-semibold text-teal-900">Inquiry Anda di listing ini</p>
          <ul className="mt-2 space-y-1.5">
            {myInquiries.map((i) => (
              <li key={i.id} className="flex items-center justify-between gap-2">
                <InquiryStatusBadge status={i.status} />
                {i.conv && (
                  <Link to={`/inbox/${i.conv}`} className="text-[13px] font-semibold text-teal-700 hover:underline">
                    Buka percakapan →
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
      {canInquire ? (
        l.type === 'weight' ? (
          <Button variant="accent" size="lg" className="w-full" onClick={onStart}>
            <MessageCircle /> Tanya Provider
          </Button>
        ) : (
          <>
            {count > 0 ? (
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">{count} item dipilih</span>
                <span className="font-extrabold text-navy">{formatMoneyGroups(totals)}</span>
              </div>
            ) : (
              <p className="text-[13px] text-slate-500">Pilih jumlah produk di katalog, lalu ajukan pesanan.</p>
            )}
            <Button variant="accent" size="lg" className="w-full" onClick={onStart} disabled={count === 0}>
              <ShoppingBag /> Ajukan Pesanan
            </Button>
          </>
        )
      ) : (
        <>
          <Button size="lg" className="w-full" disabled>
            <Lock /> {l.type === 'weight' ? 'Tanya Provider' : 'Ajukan Pesanan'}
          </Button>
          <p className="text-[13px] text-slate-500">{BLOCK_REASON[view.status]}</p>
        </>
      )}
      <p className="text-center text-[11px] text-slate-400">Tanpa pembayaran di platform · koordinasi via inbox</p>
    </div>
  );
}

function MobileCta({ view, selection, canInquire, onStart }: { view: ListingView; selection: Record<string, number>; canInquire: boolean; onStart: () => void }) {
  const l = view.listing;
  const { totals, count } = l.type === 'shopping' ? selectionTotals(l, selection) : { totals: {}, count: 0 };
  return (
    <div className="flex items-center gap-3">
      <div className="min-w-0 flex-1">
        {l.type === 'shopping' && count > 0 ? (
          <>
            <p className="text-xs text-slate-500">{count} item</p>
            <p className="truncate font-extrabold text-navy">{formatMoneyGroups(totals)}</p>
          </>
        ) : (
          <PriceLabel view={view} />
        )}
      </div>
      {canInquire ? (
        <Button variant="accent" onClick={onStart} disabled={l.type === 'shopping' && count === 0}>
          {l.type === 'weight' ? (
            <>
              <MessageCircle /> Tanya Provider
            </>
          ) : count === 0 ? (
            'Pilih produk'
          ) : (
            <>
              <ShoppingBag /> Ajukan Pesanan
            </>
          )}
        </Button>
      ) : (
        <Button disabled>
          <Lock /> Tidak tersedia
        </Button>
      )}
    </div>
  );
}

function OwnerActions({ view }: { view: ListingView }) {
  const l = view.listing;
  const user = useCurrentUser()!;
  const confirm = useConfirm();
  const { inquiries } = useDB();
  const mine = inquiries.filter((i) => i.listingId === l.id);
  const pending = mine.filter((i) => i.status === 'pending').length;

  const onClose = async () => {
    const okay = await confirm({
      title: 'Tutup listing ini?',
      description: 'Listing tidak akan menerima inquiry baru. Inquiry yang sudah ada tetap bisa diproses. Anda dapat membukanya kembali selama batas waktu belum lewat.',
      confirmLabel: 'Tutup listing',
      destructive: true,
    });
    if (!okay) return;
    const res = closeListing(l.id, user.id);
    res.ok ? toast.success('Listing ditutup') : toast.error(res.error);
  };
  const onReopen = () => {
    const res = reopenListing(l.id, user.id);
    res.ok ? toast.success('Listing dibuka kembali') : toast.error(res.error);
  };

  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold text-navy">Listing milik Anda</p>
      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        <div className="rounded-xl bg-slate-50 p-2">
          <p className="text-lg font-extrabold text-navy">{l.viewCount}</p>
          <p className="text-slate-500">dilihat</p>
        </div>
        <div className="rounded-xl bg-slate-50 p-2">
          <p className="text-lg font-extrabold text-navy">{mine.length}</p>
          <p className="text-slate-500">inquiry</p>
        </div>
        <div className="rounded-xl bg-amber-50 p-2">
          <p className="text-lg font-extrabold text-amber-700">{pending}</p>
          <p className="text-amber-700/80">menunggu</p>
        </div>
      </div>
      <Button asChild variant="accent" className="w-full">
        <Link to={`/inbox?listing=${l.id}`}>
          <Inbox /> Lihat Inquiry
        </Link>
      </Button>
      <div className="grid grid-cols-2 gap-2">
        <Button asChild variant="outline">
          <Link to={`/listings/${l.id}/edit`}>
            <Pencil /> Edit
          </Link>
        </Button>
        {view.status === 'closed' ? (
          <Button variant="outline" onClick={onReopen} disabled={!!l.closedByAdmin}>
            <Repeat /> Buka lagi
          </Button>
        ) : view.status === 'draft' ? (
          <Button asChild variant="default">
            <Link to={`/listings/${l.id}/edit`}>Terbitkan</Link>
          </Button>
        ) : (
          <Button variant="destructive-outline" onClick={onClose}>
            <XCircle /> Tutup
          </Button>
        )}
      </div>
      {l.closedByAdmin && <p className="text-xs text-red-600">Ditutup oleh moderator demo. Hubungi admin untuk peninjauan ulang.</p>}
      {view.status === 'expired' && <p className="text-xs text-slate-500">Batas waktu lewat. Edit tanggal untuk menerima inquiry lagi.</p>}
    </div>
  );
}

function ProviderCard({ ownerId, owner }: { ownerId: string; owner?: import('@/types').User }) {
  const rating = useProviderRating(ownerId);
  const completed = useCompletedCount(ownerId);
  if (!owner) return null;
  return (
    <Card className="p-5">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Penyedia</p>
      <Link to={`/providers/${owner.id}`} className="group flex items-center gap-3 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500">
        <Avatar user={owner} size={52} />
        <div className="min-w-0">
          <p className="truncate font-bold text-navy group-hover:text-teal-700">{owner.displayName}</p>
          <p className="flex items-center gap-1 text-[13px] text-slate-500">
            <MapPin className="h-3.5 w-3.5" /> {owner.city ?? '—'} · sejak {formatMonthYear(owner.joinedAt)}
          </p>
        </div>
      </Link>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <VerificationLabel user={owner} />
        {rating.count > 0 ? (
          <span className="flex items-center gap-1.5 text-sm">
            <StarRating value={rating.average} size={14} />
            <span className="font-semibold text-navy">{rating.average.toFixed(1)}</span>
            <span className="text-slate-400">({rating.count})</span>
          </span>
        ) : (
          <span className="text-xs text-slate-400">Belum ada ulasan</span>
        )}
      </div>
      <p className="mt-2 text-[13px] text-slate-500">{completed} transaksi demo selesai</p>
      <Button asChild variant="outline" size="sm" className="mt-4 w-full">
        <Link to={`/providers/${owner.id}`}>Lihat profil & ulasan</Link>
      </Button>
      <p className="mt-3 text-[11px] leading-snug text-slate-400">Nomor telepon & alamat tidak ditampilkan. Detail serah terima dibahas di inbox setelah deal.</p>
    </Card>
  );
}

