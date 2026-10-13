import { Link } from 'react-router-dom';
import { Bookmark, Clock, Plane, ShoppingBag } from 'lucide-react';
import { toast } from 'sonner';
import type { ListingView } from '@/hooks/useStore';
import { useSavedIds } from '@/hooks/useStore';
import { ListingCover, ListingStatusBadge, TYPE_LABEL } from '@/components/shared/display';
import { useAuth } from '@/components/shared/AccountSwitcher';
import { toggleSaved } from '@/services/userService';
import { formatDateShort, formatKg, formatMoney, listingTitle } from '@/lib/format';
import { cityCode } from '@/data/locations';
import { dateFacts, primaryDate } from '@/lib/listingDates';
import { referencePrice } from '@/lib/availability';
import { Reveal } from '@/components/shared/Reveal';
import { cn } from '@/lib/utils';

export function SaveButton({ listingId, className, withLabel }: { listingId: string; className?: string; withLabel?: boolean }) {
  const saved = useSavedIds().includes(listingId);
  const { requireUser } = useAuth();
  const onClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const uid = requireUser('Pilih akun demo untuk menyimpan listing.');
    if (!uid) return;
    const res = toggleSaved(uid, listingId);
    if (!res.ok) return toast.error(res.error);
    toast.success(res.data ? 'Disimpan ke daftar Anda' : 'Dihapus dari daftar simpan');
  };
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={saved}
      aria-label={saved ? 'Hapus dari simpanan' : 'Simpan listing'}
      className={cn(
        'flex h-10 items-center justify-center gap-2 rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500',
        withLabel ? 'border border-border bg-white px-4 text-sm font-semibold text-navy hover:bg-slate-50' : 'w-10 bg-white/90 text-navy shadow-sm backdrop-blur hover:bg-white',
        className,
      )}
    >
      <Bookmark className={cn('h-[18px] w-[18px]', saved && 'fill-teal-500 text-teal-500')} />
      {withLabel && (saved ? 'Tersimpan' : 'Simpan')}
    </button>
  );
}

export function AvailabilityMeter({ view, className }: { view: ListingView; className?: string }) {
  const a = view.availability;
  const pct = Math.min(100, Math.round(a.ratio * 100));
  const label =
    a.type === 'weight'
      ? `Sisa ${formatKg(a.remaining)} dari ${formatKg(a.total)}`
      : a.remaining > 0
        ? `${a.productsLeft} produk tersedia`
        : 'Semua produk habis';
  return (
    <div className={className}>
      <p className="num mb-1.5 text-[13px] font-semibold text-navy">{label}</p>
      <div className="h-1 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Kapasitas terisi">
        <div className={cn('h-full rounded-full transition-[width] duration-500 ease-spring', pct >= 100 ? 'bg-amber-400' : 'bg-teal-500')} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function PriceLabel({ view, className }: { view: ListingView; className?: string }) {
  const l = view.listing;
  if (l.type === 'weight') {
    return (
      <p className={cn('text-navy', className)}>
        <span className="num text-lg font-semibold">{formatMoney(l.pricePerKg, l.currency)}</span>
        <span className="text-sm text-slate-500">/kg</span>
      </p>
    );
  }
  const ref = referencePrice(l);
  if (!ref) {
    return (
      <p className={cn('text-navy', className)}>
        <span className="text-sm font-semibold">Tanya harga</span>
      </p>
    );
  }
  return (
    <p className={cn('text-navy', className)}>
      <span className="text-sm text-slate-500">mulai </span>
      <span className="num text-lg font-semibold">{formatMoney(ref.amount, ref.currency)}</span>
    </p>
  );
}

export function ListingCard({ view, showViews, compact }: { view: ListingView; showViews?: boolean; compact?: boolean }) {
  const { listing: l, status } = view;
  const muted = status !== 'open';
  const primary = primaryDate(l);
  const from = cityCode(l.origin.city);
  const to = cityCode(l.destination.city);
  return (
    <article
      className={cn(
        'ticket-wrap group relative h-full transition-transform duration-200 ease-spring hover:-translate-y-0.5 has-[a:active]:scale-[0.985]',
        muted && 'opacity-70 saturate-50 hover:opacity-100 hover:saturate-100',
      )}
    >
      <div className={cn('ticket flex h-full flex-col bg-white', compact ? 'rounded-2xl p-1.5 [--cut:5.875rem] sm:p-2 sm:[--cut:6rem]' : 'rounded-3xl p-3 [--cut:6.75rem]')}>
        <div className={cn('relative overflow-hidden', compact ? 'aspect-[3/2] rounded-xl' : 'aspect-[4/3] rounded-2xl')}>
          <ListingCover listing={l} />
          {primary && (
            <span className={cn('num absolute inline-flex items-center rounded-full bg-white font-medium text-teal-700 shadow-sm', compact ? 'left-2 top-2 gap-1 px-2 py-1 text-xs' : 'left-3 top-3 gap-1.5 px-3 py-1.5 text-[13px]')}>
              <Clock className={compact ? 'h-3 w-3' : 'h-3.5 w-3.5'} aria-hidden />
              {l.departureDate ? '' : 'Tiba '}
              {formatDateShort(primary)}
            </span>
          )}
          <SaveButton listingId={l.id} className={cn('absolute z-10 !bg-white', compact ? 'right-2 top-2 !h-8 !w-8' : 'right-3 top-3 !h-9 !w-9')} />
          <span
            className={cn(
              'absolute inline-flex items-center gap-1 rounded-full bg-white font-semibold text-navy shadow-sm',
              compact ? 'bottom-2 left-2 px-2 py-1 text-[0.6875rem]' : 'bottom-3 left-3 px-3 py-1.5 text-xs',
            )}
          >
            {l.type === 'weight' ? <Plane className="h-3 w-3 text-teal-600" aria-hidden /> : <ShoppingBag className="h-3 w-3 text-teal-600" aria-hidden />}
            {TYPE_LABEL[l.type]}
          </span>
          {muted && (
            <div className={compact ? 'absolute bottom-2 right-2' : 'absolute bottom-3 right-3'}>
              <ListingStatusBadge status={status} type={l.type} />
            </div>
          )}
        </div>
        <div className={cn('flex-1', compact ? 'px-1 pb-3 pt-2.5' : 'px-1 pb-4 pt-3.5')}>
          <h3 className={cn('line-clamp-1 font-semibold text-navy', compact ? 'text-sm' : 'text-base')}>
            <Link to={`/listings/${l.id}`} className="after:absolute after:inset-0 focus-visible:outline-none">
              {listingTitle(l)}
            </Link>
          </h3>
          <p className="mt-0.5 truncate text-xs text-slate-600">
            {dateFacts(l)
              .map((d) => `${d.label} ${d.value}`)
              .join(' · ') || 'Tanggal belum ditentukan'}
            {showViews && ` · ${l.viewCount} dilihat`}
          </p>
        </div>
        <div
          className={cn('ticket-stub mx-2 flex flex-col justify-center gap-1 border-t-2 border-dashed border-slate-300', compact ? 'h-[5.5rem]' : 'h-[6rem]')}
          title={`${l.origin.city} → ${l.destination.city}`}
        >
          <div className="flex items-center gap-2 text-navy" aria-label={`${l.origin.city} ke ${l.destination.city}`}>
            <span className={cn('font-bold tracking-wide', compact ? 'text-lg' : 'text-xl')}>{from}</span>
            <span className="relative flex h-4 flex-1 items-center" aria-hidden>
              <span className="w-full border-t border-dashed border-slate-300" />
              <Plane className="absolute left-1/2 h-4 w-4 -translate-x-1/2 bg-white px-0.5 text-teal-600" />
            </span>
            <span className={cn('font-bold tracking-wide', compact ? 'text-lg' : 'text-xl')}>{to}</span>
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <span className={cn('truncate text-slate-500', compact ? 'text-[11px]' : 'text-xs')}>{l.origin.city} → {l.destination.city}</span>
          </div>
          <PriceLabel view={view} className={cn('!text-teal-700 [&_.num]:font-bold', compact ? 'text-xs [&_.num]:text-sm [&_span]:text-xs' : '[&_.num]:text-base')} />
        </div>
      </div>
    </article>
  );
}

export function ListingGrid({ views, className, compact, mobileLimit }: { views: ListingView[]; className?: string; compact?: boolean; mobileLimit?: number }) {
  return (
    <ul className={cn('grid gap-4 sm:grid-cols-2 lg:grid-cols-3', compact && '!grid-cols-2 !gap-3 md:!grid-cols-4 lg:!grid-cols-5', className)}>
      {views.map((v, i) => (
        <li key={v.listing.id} className={cn('flex', mobileLimit !== undefined && i >= mobileLimit && 'max-sm:hidden')}>
          <Reveal className="w-full" i={i % 5}>
            <ListingCard view={v} compact={compact} />
          </Reveal>
        </li>
      ))}
    </ul>
  );
}
