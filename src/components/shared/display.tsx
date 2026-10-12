import * as React from 'react';
import { ArrowRight, BadgeCheck, CircleDashed, Plane, ShoppingBag, Star } from 'lucide-react';
import type { InquiryStatus, Listing, ListingStatus, ListingType, User } from '@/types';
import { cn, initials, pickBySeed } from '@/lib/utils';
import { categoryImage, coverImageFor } from '@/data/images';
import { Badge, type BadgeTone } from '@/components/ui/misc';

const AVATAR_COLORS = [
  'bg-teal-100 text-teal-800',
  'bg-amber-100 text-amber-800',
  'bg-sky-100 text-sky-800',
  'bg-navy-100 text-navy-600',
  'bg-emerald-100 text-emerald-800',
];

export function Avatar({ user, size = 40, className }: { user?: Pick<User, 'id' | 'displayName' | 'avatarUrl'> | null; size?: number; className?: string }) {
  const [broken, setBroken] = React.useState(false);
  const name = user?.displayName ?? '?';
  const style = { width: size, height: size, fontSize: Math.max(11, size * 0.38) };
  if (user?.avatarUrl && !broken) {
    return (
      <img
        src={user.avatarUrl}
        alt=""
        style={style}
        onError={() => setBroken(true)}
        className={cn('shrink-0 rounded-[32%] object-cover ring-2 ring-white', className)}
      />
    );
  }
  return (
    <span
      aria-hidden
      style={style}
      className={cn(
        'inline-flex shrink-0 select-none items-center justify-center rounded-[32%] font-bold tracking-tight ring-2 ring-white',
        pickBySeed(user?.id ?? name, AVATAR_COLORS),
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}

export const LISTING_STATUS_META: Record<ListingStatus, { label: string; tone: BadgeTone }> = {
  open: { label: 'Buka', tone: 'green' },
  full: { label: 'Penuh', tone: 'amber' },
  closed: { label: 'Ditutup', tone: 'muted' },
  expired: { label: 'Lewat batas', tone: 'muted' },
  draft: { label: 'Draf', tone: 'blue' },
};

export function ListingStatusBadge({ status, type }: { status: ListingStatus; type?: ListingType }) {
  const meta = LISTING_STATUS_META[status];
  const label = status === 'full' && type === 'shopping' ? 'Sold Out' : meta.label;
  return (
    <Badge tone={meta.tone}>
      {status === 'open' && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />}
      {label}
    </Badge>
  );
}

export const INQUIRY_STATUS_META: Record<InquiryStatus, { label: string; tone: BadgeTone }> = {
  pending: { label: 'Menunggu', tone: 'amber' },
  accepted: { label: 'Diterima', tone: 'teal' },
  declined: { label: 'Ditolak', tone: 'red' },
  cancelled: { label: 'Dibatalkan', tone: 'muted' },
  completed: { label: 'Selesai', tone: 'green' },
};

export function InquiryStatusBadge({ status }: { status: InquiryStatus }) {
  const meta = INQUIRY_STATUS_META[status];
  return <Badge tone={meta.tone}>{meta.label}</Badge>;
}

export const TYPE_LABEL: Record<ListingType, string> = {
  weight: 'Jastip Diaspora',
  shopping: 'Jastip Shopping',
};

export function TypeBadge({ type, className }: { type: ListingType; className?: string }) {
  return (
    <Badge tone={type === 'weight' ? 'navy' : 'teal'} className={className}>
      {type === 'weight' ? <Plane /> : <ShoppingBag />}
      {TYPE_LABEL[type]}
    </Badge>
  );
}

export function RouteDisplay({
  listing,
  size = 'md',
  className,
}: {
  listing: Pick<Listing, 'origin' | 'destination'>;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const { origin, destination } = listing;
  const text = size === 'lg' ? 'text-xl sm:text-2xl' : size === 'md' ? 'text-[15px]' : 'text-sm';
  return (
    <div
      className={cn('flex min-w-0 items-center gap-2 font-bold text-navy', text, className)}
      aria-label={`Rute dari ${origin.city || 'kota belum diisi'}, ${origin.country} ke ${destination.city || 'kota belum diisi'}, ${destination.country}`}
    >
      <span className="flex min-w-0 items-center gap-1.5">
        <span className="truncate">{origin.city || '-'}</span>
      </span>
      <ArrowRight className={cn('shrink-0 text-teal-500', size === 'lg' ? 'h-6 w-6' : 'h-4 w-4')} aria-hidden />
      <span className="flex min-w-0 items-center gap-1.5">
        <span className="truncate">{destination.city || '-'}</span>
      </span>
    </div>
  );
}

export function StarRating({ value, size = 16, className }: { value: number; size?: number; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-0.5', className)} aria-label={`Rating ${value.toFixed(1)} dari 5`} role="img">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          style={{ width: size, height: size }}
          className={i <= Math.round(value) ? 'fill-amber-400 text-amber-400' : 'fill-slate-200 text-slate-200'}
          aria-hidden
        />
      ))}
    </span>
  );
}

export function StarInput({ value, onChange, id }: { value: number; onChange: (v: number) => void; id?: string }) {
  return (
    <div role="radiogroup" aria-label="Pilih rating" id={id} className="flex gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          role="radio"
          aria-checked={value === i}
          aria-label={`${i} bintang`}
          onClick={() => onChange(i)}
          className="flex h-11 w-11 items-center justify-center rounded-xl transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
        >
          <Star className={cn('h-8 w-8', i <= value ? 'fill-amber-400 text-amber-400' : 'fill-slate-100 text-slate-300')} />
        </button>
      ))}
    </div>
  );
}

export function VerificationLabel({ user }: { user?: User }) {
  if (!user) return null;
  return user.demoVerified ? (
    <Badge tone="blue" title="Label demo: tidak ada pemeriksaan identitas sungguhan.">
      <BadgeCheck /> Verifikasi demo
    </Badge>
  ) : (
    <Badge tone="muted" title="Identitas pengguna ini belum diverifikasi.">
      <CircleDashed /> Belum diverifikasi
    </Badge>
  );
}

/** Listing cover: real photo by city/category, with a designed gradient fallback if it fails to load. */
export function ListingCover({ listing, className, compact }: { listing: Listing; className?: string; compact?: boolean }) {
  const src = coverImageFor(listing);
  const [broken, setBroken] = React.useState(false);
  React.useEffect(() => setBroken(false), [src]);
  if (!broken) {
    return (
      <img
        src={src}
        alt=""
        loading="lazy"
        decoding="async"
        onError={() => setBroken(true)}
        className={cn('h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]', className)}
      />
    );
  }
  return (
    <div aria-hidden className={cn('relative flex h-full w-full bg-gradient-to-br from-navy-600 to-teal-700 text-snow', className)}>
      <div className={cn('flex w-full flex-col justify-between', compact ? 'p-3' : 'p-4')}>
        {listing.type === 'weight' ? <Plane className="h-5 w-5 opacity-80" /> : <ShoppingBag className="h-5 w-5 opacity-80" />}
        <span className={cn('font-bold leading-tight', compact ? 'text-sm' : 'text-lg')}>
          {listing.origin.city || '-'} → {listing.destination.city || '-'}
        </span>
      </div>
    </div>
  );
}

export function ProductThumb({ imageUrl, category, className }: { imageUrl?: string; category: string; className?: string }) {
  const candidates = [imageUrl, categoryImage(category)].filter(Boolean) as string[];
  const [index, setIndex] = React.useState(0);
  const src = candidates[index];
  if (src) {
    return <img src={src} alt="" loading="lazy" decoding="async" onError={() => setIndex((i) => i + 1)} className={cn('object-cover', className)} />;
  }
  return (
    <div aria-hidden className={cn('flex items-center justify-center bg-teal-50 text-teal-600', className)}>
      <ShoppingBag className="h-1/3 w-1/3" />
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon: React.ReactNode;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col items-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center', className)}>
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-50 text-teal-600 [&_svg]:h-7 [&_svg]:w-7">{icon}</div>
      <h3 className="text-base font-bold text-navy">{title}</h3>
      {description && <p className="mt-1.5 max-w-sm text-sm text-slate-500">{description}</p>}
      {action && <div className="mt-5 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  );
}

export function PageHeader({ title, description, actions, className }: { title: string; description?: React.ReactNode; actions?: React.ReactNode; className?: string }) {
  return (
    <div className={cn('mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between', className)}>
      <div className="min-w-0">
        <h1 className="text-[1.75rem] font-bold leading-[1.1] text-navy sm:text-4xl">{title}</h1>
        {description && <p className="mt-1 text-sm text-slate-500 sm:text-[15px]">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function ComingSoonBadge({ className }: { className?: string }) {
  return (
    <Badge tone="amber" className={className}>
      Segera Hadir
    </Badge>
  );
}
