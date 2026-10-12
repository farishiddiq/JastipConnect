import { Link } from 'react-router-dom';
import { Bookmark, CalendarDays, Clock, Eye, Package } from 'lucide-react';
import { toast } from 'sonner';
import type { ListingView } from '@/hooks/useStore';
import { useSavedIds } from '@/hooks/useStore';
import { Avatar, ListingCover, ListingStatusBadge, RouteDisplay, TypeBadge } from '@/components/shared/display';
import { useAuth } from '@/components/shared/AccountSwitcher';
import { toggleSaved } from '@/services/userService';
import { formatCountdown, formatDateShort, formatKg, formatMoney } from '@/lib/format';
import { referencePrice } from '@/lib/availability';
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
        ? `${a.productsLeft} produk tersedia · stok ${a.remaining}`
        : 'Semua produk habis';
  return (
    <div className={className}>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="font-semibold text-navy">{label}</span>
        <span className="text-slate-400">{pct}% terisi</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Kapasitas terisi">
        <div
          className={cn('h-full rounded-full transition-all', pct >= 100 ? 'bg-amber-400' : pct >= 70 ? 'bg-teal-400' : 'bg-teal-500')}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function PriceLabel({ view, className }: { view: ListingView; className?: string }) {
  const l = view.listing;
  if (l.type === 'weight') {
    return (
      <p className={cn('text-navy', className)}>
        <span className="text-lg font-extrabold">{formatMoney(l.pricePerKg, l.currency)}</span>
        <span className="text-sm text-slate-500">/kg</span>
      </p>
    );
  }
  const ref = referencePrice(l);
  return (
    <p className={cn('text-navy', className)}>
      <span className="text-sm text-slate-500">mulai </span>
      <span className="text-lg font-extrabold">{formatMoney(ref.amount, ref.currency)}</span>
    </p>
  );
}

export function ListingCard({ view, showViews }: { view: ListingView; showViews?: boolean }) {
  const { listing: l, status, owner } = view;
  const muted = status !== 'open';
  return (
    <article
      className={cn(
        'group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-white shadow-card transition-all hover:-translate-y-0.5 hover:shadow-lift focus-within:ring-2 focus-within:ring-teal-500',
        muted && 'opacity-75 saturate-[0.6] hover:opacity-100 hover:saturate-100',
      )}
    >
      <div className="relative aspect-[16/9] overflow-hidden">
        <ListingCover listing={l} />
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          <TypeBadge type={l.type} className="bg-white/95 shadow-sm" />
        </div>
        <SaveButton listingId={l.id} className="absolute right-3 top-3 z-10" />
        {muted && (
          <div className="absolute bottom-3 left-3">
            <ListingStatusBadge status={status} type={l.type} />
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="space-y-1">
          <RouteDisplay listing={l} size="sm" className="text-slate-500" />
          <h3 className="line-clamp-2 text-[15px] font-bold leading-snug text-navy">
            <Link to={`/listings/${l.id}`} className="after:absolute after:inset-0 focus-visible:outline-none">
              {l.title}
            </Link>
          </h3>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-slate-500">
          <span className="flex items-center gap-1.5">
            <CalendarDays className="h-4 w-4 text-slate-400" aria-hidden />
            Berangkat {formatDateShort(l.departureDate)}
          </span>
          <span className={cn('flex items-center gap-1.5', status === 'open' && 'text-amber-700')}>
            <Clock className="h-4 w-4 opacity-70" aria-hidden />
            {status === 'open' ? `Tutup ${formatCountdown(l.orderDeadline)}` : `Batas ${formatDateShort(l.orderDeadline)}`}
          </span>
          {l.type === 'shopping' && (
            <span className="flex items-center gap-1.5">
              <Package className="h-4 w-4 text-slate-400" aria-hidden />
              {l.products.length} produk
            </span>
          )}
        </div>
        <AvailabilityMeter view={view} />
        <div className="mt-auto flex items-end justify-between gap-2 border-t border-border pt-3">
          <PriceLabel view={view} />
          <div className="flex min-w-0 items-center gap-2 text-[13px] text-slate-500">
            {showViews ? (
              <span className="flex items-center gap-1">
                <Eye className="h-4 w-4" /> {l.viewCount}
              </span>
            ) : (
              <>
                <Avatar user={owner} size={24} />
                <span className="truncate">{owner?.displayName.split(' ')[0] ?? 'Pengguna'}</span>
              </>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

export function ListingGrid({ views, className }: { views: ListingView[]; className?: string }) {
  return (
    <ul className={cn('grid gap-4 sm:grid-cols-2 lg:grid-cols-3', className)}>
      {views.map((v) => (
        <li key={v.listing.id} className="flex">
          <div className="w-full">
            <ListingCard view={v} />
          </div>
        </li>
      ))}
    </ul>
  );
}
