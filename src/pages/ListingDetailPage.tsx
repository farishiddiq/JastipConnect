import * as React from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
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
  TYPE_LABEL,
  VerificationLabel,
} from '@/components/shared/display';
import { SafetyNotice } from '@/components/shared/SafetyNotice';
import { ShareButton } from '@/components/shared/ShareButton';
import { ReportButton } from '@/components/shared/ReportDialog';
import { useAuth } from '@/components/shared/AccountSwitcher';
import { useConfirm } from '@/components/shared/ConfirmProvider';
import { AvailabilityMeter, PriceLabel, SaveButton } from '@/components/listings/ListingCard';
import { LuggageMeter } from '@/components/listings/LuggageMeter';
import { QuantityStepper, selectionTotals, ShoppingOrderDialog, WeightInquiryDialog } from '@/components/forms/InquiryForms';
import { PromotePanel } from '@/components/listings/PromotePanel';
import { useCompletedCount, useCurrentUser, useDB, useListingView, usePageMeta, useProviderRating, type ListingView } from '@/hooks/useStore';
import { closeListing, recordView, reopenListing } from '@/services/listingService';
import { productAvailability } from '@/lib/availability';
import { formatCountdown, formatDate, formatMoney, formatMoneyGroups, formatMonthYear, formatProductPrice, listingTitle } from '@/lib/format';
import { cn } from '@/lib/utils';

const BLOCK_REASON: Record<string, string> = {
  closed: 'Listing ditutup penyedia.',
  full: 'Kuota habis. Simpan atau cari rute serupa.',
  expired: 'Batas waktu titip/pesan sudah lewat.',
  draft: 'Listing ini masih draf dan belum diterbitkan.',
};

export function ListingDetailPage() {
  const { id } = useParams();
  const view = useListingView(id);
  const user = useCurrentUser();

  usePageMeta(
    view ? view.listing.title : 'Listing tidak ditemukan',
    view ? `${view.listing.origin.city} → ${view.listing.destination.city}${view.listing.departureDate ? `, berangkat ${formatDate(view.listing.departureDate)}` : ''}. ${view.listing.description.slice(0, 120)}` : undefined,
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
          description="Tautan salah atau listing dihapus."
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
          <p>Draf, hanya Anda yang melihat. Terbitkan lewat Edit.</p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_380px] lg:gap-8">
        <div className="min-w-0 space-y-6">
          <div className={cn('relative aspect-[2/1] overflow-hidden rounded-2xl sm:aspect-[21/9] sm:rounded-3xl', status !== 'open' && status !== 'draft' && 'saturate-[0.5]')}>
            <ListingCover listing={l} />
            <SaveButton listingId={l.id} className="absolute right-4 top-4" />
          </div>

          <header className="space-y-3">
            <p className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
              {TYPE_LABEL[l.type]}
              <ListingStatusBadge status={status} type={l.type} />
              {l.closedByAdmin && <Badge tone="red">Ditutup moderator</Badge>}
            </p>
            <h1 className="text-2xl font-bold leading-[1.15] text-navy sm:text-4xl">{listingTitle(l)}</h1>
            <RouteDisplay listing={l} size="md" className="text-slate-600" />
          </header>

          <dl className="grid grid-cols-2 gap-x-6 gap-y-4 border-y border-border py-4 sm:grid-cols-3 sm:py-5">
            {l.departureDate && <Fact label="Berangkat" value={formatDate(l.departureDate)} sub={formatCountdown(l.departureDate)} />}
            {l.type === 'shopping' && l.arrivalDate && <Fact label="Tiba" value={formatDate(l.arrivalDate)} sub={formatCountdown(l.arrivalDate)} />}
            {l.orderDeadline && (
              <Fact
                label={l.type === 'weight' ? 'Batas titip' : 'Batas pesan'}
                value={formatDate(l.orderDeadline)}
                sub={formatCountdown(l.orderDeadline)}
                highlight={status === 'open'}
              />
            )}
          </dl>

          {l.type === 'weight' ? (
            <WeightCapacity view={view} />
          ) : (
            <section aria-labelledby="catalog-title">
              <div className="mb-3 flex items-end justify-between">
                <h2 id="catalog-title" className="text-xl font-semibold text-navy">
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
                        {p.videoUrl && <video src={p.videoUrl} controls playsInline preload="metadata" className="mt-2 max-h-40 w-full rounded-xl bg-slate-100" />}
                        {p.lastOrderDate && <p className="mt-1 text-xs text-slate-600">Batas pesan {formatDate(p.lastOrderDate)}</p>}
                        {p.terms && (
                          <details className="mt-1 text-xs text-slate-600">
                            <summary className="cursor-pointer font-semibold text-navy">S&K produk</summary>
                            <p className="mt-1 whitespace-pre-line">{p.terms}</p>
                          </details>
                        )}
                        <div className="mt-auto flex flex-wrap items-end justify-between gap-2 pt-2">
                          <div>
                            <p className="font-extrabold text-navy">{formatProductPrice(p, l.currency)}</p>
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

          <section aria-labelledby="desc-title">
            <h2 id="desc-title" className="text-xl font-semibold text-navy">
              Detail
            </h2>
            <p className="mt-3 max-w-[65ch] whitespace-pre-line leading-relaxed text-slate-700">{l.description || '-'}</p>
            <div className="mt-6 divide-y divide-border border-t border-border">
              {l.type === 'weight' && l.permittedItemsNote && <InfoBlock title="Diterima">{l.permittedItemsNote}</InfoBlock>}
              {l.prohibitedItemsNote && <InfoBlock title="Tidak diterima">{l.prohibitedItemsNote}</InfoBlock>}
              {l.handoverMethod && <InfoBlock title="Serah terima">{l.handoverMethod}</InfoBlock>}
              {(l.type === 'weight' || l.terms) && <InfoBlock title={l.type === 'weight' ? 'Syarat' : 'Syarat dan ketentuan'}>{l.terms || '-'}</InfoBlock>}
            </div>
          </section>

          <SafetyNotice variant="compact" />

          <div className="flex flex-wrap items-center gap-2">
            <ShareButton path={`/listings/${l.id}`} title={l.title} text={`${l.title}: ${l.origin.city} → ${l.destination.city}`} />
            {!isOwner && <ReportButton targetType="listing" targetId={l.id} targetLabel={l.title} />}
            <span className="ml-auto hidden items-center gap-1 text-xs text-slate-400 sm:flex">
              <Eye className="h-4 w-4" /> {l.viewCount} dilihat
            </span>
          </div>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <Card className="p-4 sm:p-5">
            <PriceLabel view={view} className="max-lg:hidden [&_.num]:text-3xl" />
            {l.type === 'shopping' && <p className="mt-0.5 text-[13px] text-slate-600">Sudah termasuk jasa titip</p>}
            <AvailabilityMeter view={view} className="mt-4 max-lg:hidden" />
            <Separator className="my-4 max-lg:hidden" />
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
          <div className="fixed inset-x-0 bottom-[calc(68px+env(safe-area-inset-bottom))] glass z-30 border-t border-border/70 px-4 py-3 md:bottom-0 lg:hidden">
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

function Fact({ label, value, sub, highlight }: { label: string; value: string; sub?: string; highlight?: boolean }) {
  return (
    <div>
      <dt className="text-[13px] text-slate-500">{label}</dt>
      <dd className="mt-0.5 text-base font-semibold text-navy">{value}</dd>
      {sub && <dd className={cn('text-[13px]', highlight ? 'font-medium text-amber-700' : 'text-slate-500')}>{sub}</dd>}
    </div>
  );
}

function InfoBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1 py-4 sm:grid-cols-[9rem_1fr] sm:gap-6">
      <h3 className="text-sm font-semibold text-navy">{title}</h3>
      <p className="whitespace-pre-line text-sm leading-relaxed text-slate-600">{children}</p>
    </div>
  );
}

function WeightCapacity({ view }: { view: ListingView }) {
  const l = view.listing as WeightListing;
  const a = view.availability;
  return (
    <section aria-labelledby="cap-title">
      <h2 id="cap-title" className="text-xl font-semibold text-navy">
        Kuota bagasi
      </h2>
      <LuggageMeter className="mt-4 rounded-3xl bg-white p-4 shadow-card sm:p-5" total={l.capacityKg} reserved={a.reserved} />
      <p className="num mt-3 text-sm text-slate-600">{formatMoney(l.pricePerKg, l.currency)}/kg</p>
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
        <div className="rounded-2xl bg-slate-100 p-3.5 text-sm">
          <p className="font-bold text-navy">Inquiry Anda di listing ini</p>
          <ul className="mt-2 space-y-1.5">
            {myInquiries.map((i) => (
              <li key={i.id} className="flex items-center justify-between gap-2">
                <InquiryStatusBadge status={i.status} />
                {i.conv && (
                  <Link to={`/inbox/${i.conv}`} className="text-[13px] font-bold text-teal-800 hover:underline">
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
            <MessageCircle /> Ajukan Titipan
          </Button>
        ) : (
          <>
            {count > 0 ? (
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">{count} item dipilih</span>
                <span className="font-extrabold text-navy">{formatMoneyGroups(totals)}</span>
              </div>
            ) : (
              <p className="text-[13px] font-medium text-slate-700">Pilih produk di katalog.</p>
            )}
            <Button variant="accent" size="lg" className="w-full" onClick={onStart} disabled={count === 0}>
              <ShoppingBag /> Tanya / Pesan
            </Button>
          </>
        )
      ) : (
        <>
          <Button size="lg" className="w-full" disabled>
            <Lock /> {l.type === 'weight' ? 'Ajukan Titipan' : 'Tanya / Pesan'}
          </Button>
          <p className="text-[13px] text-slate-500">{BLOCK_REASON[view.status]}</p>
        </>
      )}
      <p className="text-center text-xs text-slate-600">Pembayaran di luar platform</p>
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
              <MessageCircle /> Ajukan Titipan
            </>
          ) : count === 0 ? (
            'Pilih produk'
          ) : (
            <>
              <ShoppingBag /> Tanya / Pesan
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
      description: 'Tidak menerima inquiry baru. Bisa dibuka lagi selama batas waktu belum lewat.',
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
          <p className="text-xl font-semibold text-navy">{l.viewCount}</p>
          <p className="text-slate-500">dilihat</p>
        </div>
        <div className="rounded-xl bg-slate-50 p-2">
          <p className="text-xl font-semibold text-navy">{mine.length}</p>
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
      {l.closedByAdmin && <p className="text-xs text-red-600">Ditutup moderator.</p>}
      {view.status === 'expired' && <p className="text-xs text-slate-500">Batas lewat. Edit tanggal untuk membuka lagi.</p>}
    </div>
  );
}

function ProviderCard({ ownerId, owner }: { ownerId: string; owner?: import('@/types').User }) {
  const rating = useProviderRating(ownerId);
  const completed = useCompletedCount(ownerId);
  if (!owner) return null;
  return (
    <Card className="p-5">
      <p className="mb-3 text-sm font-bold text-navy">Penyedia</p>
      <Link to={`/providers/${owner.id}`} className="group flex items-center gap-3 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500">
        <Avatar user={owner} size={52} />
        <div className="min-w-0">
          <p className="truncate font-bold text-navy group-hover:text-teal-700">{owner.displayName}</p>
          <p className="flex items-center gap-1 text-[13px] text-slate-600">
            <MapPin className="h-3.5 w-3.5" /> {owner.city ?? '-'} · sejak {formatMonthYear(owner.joinedAt)}
          </p>
        </div>
      </Link>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <VerificationLabel user={owner} />
        {rating.count > 0 ? (
          <span className="flex items-center gap-1.5 text-sm">
            <StarRating value={rating.average} size={14} />
            <span className="font-semibold text-navy">{rating.average.toFixed(1)}</span>
            <span className="text-slate-600">({rating.count})</span>
          </span>
        ) : (
          <span className="text-xs text-slate-600">Belum ada ulasan</span>
        )}
      </div>
      <p className="mt-2 text-[13px] text-slate-600">{completed} transaksi demo selesai</p>
      <Button asChild variant="outline" size="sm" className="mt-4 w-full">
        <Link to={`/providers/${owner.id}`}>Lihat profil & ulasan</Link>
      </Button>
      <p className="mt-3 text-xs leading-snug text-slate-600">Kontak & alamat dibahas di inbox setelah deal.</p>
    </Card>
  );
}

