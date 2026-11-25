import * as React from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { ArrowRight, BadgeCheck, CreditCard, PackageCheck, Plane, PlusCircle, Scale, Search, ShieldCheck, ShoppingBag, Star, Ticket, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, EmptyState, ProBadge, StarRating } from '@/components/shared/display';
import { ListingGrid } from '@/components/listings/ListingCard';
import { TripDemo } from '@/components/landing/TripDemo';
import { useCurrentUser, useDB, useListingViews, useMode, usePageMeta } from '@/hooks/useStore';
import { InquiryStatusBadge } from '@/components/shared/display';
import { inquiryTotals, OPEN_ORDER_STATUSES } from '@/lib/availability';
import { formatKg, formatMoneyGroups } from '@/lib/format';
import { isPro, isPromoted } from '@/lib/plans';
import { computeTrust } from '@/lib/trust';
import { POPULAR_ROUTES, cityCode } from '@/data/locations';
import { TYPE_IMAGES } from '@/data/images';
import { Reveal } from '@/components/shared/Reveal';
import { compareListingDates } from '@/lib/listingDates';
import { cn } from '@/lib/utils';

type Direction = 'SA-ID' | 'ID-SA' | 'AU-ID' | 'ID-AU' | '';

const HOW_STEPS = [
  { icon: Search, title: 'Cari trip', text: 'Pilih rute pulang atau balik ke perantauan.' },
  { icon: PackageCheck, title: 'Request', text: 'Isi berat dan barang. Kuota langsung ditahan 24 jam.' },
  { icon: Scale, title: 'Serah terima', text: 'Barang ditimbang dan difoto. Tagihan keluar otomatis.' },
  { icon: CreditCard, title: 'Bayar & lacak', text: 'Unggah bukti bayar, pantau sampai dikirim.' },
  { icon: Star, title: 'Terima & nilai', text: 'Konfirmasi diterima, lalu beri rating.' },
];

export function HomePage() {
  usePageMeta(undefined, 'Marketplace jastip bagasi untuk diaspora Indonesia di Saudi dan Australia. Titip oleh-oleh lewat bagasi traveler terverifikasi.');
  const views = useListingViews();
  const user = useCurrentUser();
  const mode = useMode();
  const open = views.filter((v) => v.status === 'open');
  const soonest = [...open].sort((a, b) => compareListingDates(a.listing, b.listing)).slice(0, 5);
  const newest = [...open]
    .filter((v) => !soonest.includes(v))
    .sort((a, b) => (b.listing.publishedAt ?? '').localeCompare(a.listing.publishedAt ?? ''))
    .slice(0, 5);

  // Providers land on their own workspace; the marketplace landing is for clients.
  if (user && mode === 'provider') return <Navigate to="/dashboard" replace />;

  return (
    <>
      {user && <ActiveOrders userId={user.id} name={user.displayName.split(' ')[0] ?? ''} />}
      <Hero />

      {/* Bagasi is the primary use; Barang is secondary */}
      <section className="container pt-10 sm:pt-16" aria-labelledby="cat-title">
        <h2 id="cat-title" className="text-xl font-semibold text-navy sm:text-3xl">
          Mau titip apa?
        </h2>
        <div className="mt-4 grid gap-3 sm:mt-5 sm:grid-cols-[1.5fr_1fr]">
          <PhotoTile
            to="/explore?type=weight"
            image={TYPE_IMAGES.weight}
            icon={<Plane className="text-sky-600" />}
            title="Jastip Bagasi"
            text="Titip oleh-oleh dan kebutuhan lewat sisa bagasi sesama diaspora. Bayar per kg, ditimbang saat serah terima."
            meta={`${open.filter((v) => v.listing.type === 'weight').length} trip terbuka`}
            primary
          />
          <PhotoTile
            to="/explore?type=shopping"
            image={TYPE_IMAGES.shopping}
            icon={<ShoppingBag className="text-amber-600" />}
            title="Jastip Barang"
            text="Pre-order produk lewat personal shopper."
            meta={`${open.filter((v) => v.listing.type === 'shopping').length} pre-order terbuka`}
          />
        </div>
      </section>

      <section className="container pt-8 sm:pt-12" aria-labelledby="soon-title">
        <div className="rounded-[2rem] bg-slate-100 p-4 sm:p-7">
        <SectionHeader id="soon-title" title="Segera berangkat" to="/explore?type=weight&sort=departure" />
        {soonest.length ? (
          <ListingGrid views={soonest} compact />
        ) : (
          <EmptyState icon={<Plane className="text-sky-600" />} title="Belum ada trip terbuka" description="Jadilah yang pertama memasang trip." action={<Button asChild><Link to="/post">Pasang trip</Link></Button>} />
        )}
      </div>
      </section>

      <FeaturedProviders />

      {newest.length > 0 && (
        <section className="container pt-4 sm:pt-6" aria-labelledby="new-title">
        <div className="rounded-[2rem] bg-slate-100 p-4 sm:p-7">
          <SectionHeader id="new-title" title="Baru dipasang" to="/explore?sort=newest" />
          <ListingGrid views={newest} compact mobileLimit={4} />
        </div>
      </section>
      )}

      {/* How it works */}
      <section className="container pt-12 sm:pt-20" aria-labelledby="how-title">
        <h2 id="how-title" className="text-xl font-semibold text-navy sm:text-3xl">
          Cara kerja
        </h2>
        <p className="mt-1 text-sm text-slate-500 sm:text-[15px]">Klien gratis. Daftar cukup dengan email saat request pertama.</p>
        <ol className="mt-5 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
          {HOW_STEPS.map((st, i) => (
            <Reveal as="li" i={i} key={st.title} className="rounded-3xl bg-white p-4 shadow-card sm:p-5">
              <span className="flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
                  <st.icon className="h-[18px] w-[18px]" aria-hidden />
                </span>
                <span className="num text-xs font-bold text-slate-400">0{i + 1}</span>
              </span>
              <h3 className="mt-3 text-base font-semibold text-navy">{st.title}</h3>
              <p className="mt-0.5 text-sm leading-snug text-slate-600">{st.text}</p>
            </Reveal>
          ))}
        </ol>
      </section>

      {/* Trust: slim strip, not another card */}
      <section className="container pt-14" aria-label="Keamanan">
        <div className="grid gap-4 border-y border-border py-6 sm:grid-cols-3">
          <TrustPoint icon={<BadgeCheck />} title="WhatsApp terverifikasi" text="Setiap provider verifikasi nomor sebelum posting." />
          <TrustPoint icon={<Ticket />} title="Tiket dicek moderator" text="Badge Trip terverifikasi untuk tiket yang sudah diperiksa." />
          <TrustPoint icon={<ShieldCheck />} title="Skor kepercayaan" text="Dari rating, order selesai, dan laporan. Laporkan yang mencurigakan." />
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Cek aturan maskapai dan bea cukai.{' '}
          <Link to="/safety" className="font-semibold text-teal-700 hover:underline">
            Panduan keamanan
          </Link>{' '}
          ·{' '}
          <Link to="/syarat" className="font-semibold text-teal-700 hover:underline">
            Syarat & Ketentuan
          </Link>
        </p>
      </section>

      {/* Closing CTA */}
      <section className="container pt-14" aria-labelledby="cta-title">
        <div className="grid gap-6 rounded-3xl bg-navy px-6 py-10 text-white sm:px-10 sm:py-14 lg:grid-cols-[1.4fr_1fr] lg:items-center">
          <div>
            <h2 id="cta-title" className="text-3xl font-semibold leading-tight sm:text-4xl">
              Pulang kampung dengan bagasi longgar?
            </h2>
            <p className="mt-3 max-w-xl text-white/75">
              Pasang trip gratis, bagikan ke grup WhatsApp diaspora, terima order tanpa batas. 1 trip aktif gratis, upgrade hanya kalau sering terbang.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 lg:justify-end">
            <Button asChild variant="accent" size="lg">
              <Link to="/post">
                <PlusCircle /> Pasang trip gratis
              </Link>
            </Button>
            <Button asChild size="lg" className="bg-white/10 text-white hover:bg-white/20">
              <Link to="/harga">Lihat paket</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}

function Hero() {
  const views = useListingViews();
  const { reviews } = useDB();
  const open = views.filter((v) => v.status === 'open');
  const avgRating = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;

  return (
    <section className="container pt-4 sm:pt-6">
      <div className="relative overflow-hidden rounded-[2rem] bg-slate-100">
      <div className="relative grid grid-cols-1 gap-6 px-5 pb-0 pt-8 sm:px-10 sm:pt-16 lg:grid-cols-[1.1fr_1fr] lg:items-end lg:gap-10 lg:px-14 lg:pt-20">
        <div className="min-w-0 lg:pb-16">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600 shadow-card sm:mb-6">
            <span className="text-[10px] font-bold text-slate-400">SA · AU</span> Diaspora <ArrowRight className="h-3.5 w-3.5" /> Indonesia{' '}
            <span className="text-[10px] font-bold text-slate-400">ID</span>
          </p>
          <h1 className="text-[2.4rem] font-bold leading-[1.06] text-navy sm:text-5xl lg:text-[3.4rem]">
            Bawa{' '}
            <Chip i={0} rot={-3} className="bg-teal-200 text-navy">
              rumah
            </Chip>{' '}
            lebih dekat, lewat{' '}
            <span className="whitespace-nowrap">
              <Chip i={1} rot={2} className="bg-navy text-white">
                bagasi
              </Chip>
            </span>{' '}
            sesama{' '}
            <span className="whitespace-nowrap">
              <span className="chip-pop inline-block rounded-2xl bg-teal-500 p-[2.5px] align-baseline" style={{ ['--i' as string]: 2, ['--r' as string]: '-1.5deg' }}>
                <span className="block rounded-[0.85rem] bg-white px-2.5 pb-0.5">diaspora</span>
              </span>
              .
            </span>
          </h1>
          <p className="mt-4 max-w-xl text-[17px] leading-relaxed text-slate-600 sm:mt-6 sm:text-lg">
            Marketplace jastip bagasi untuk diaspora Indonesia di Saudi dan Australia. Titip sambal, kurma, atau oleh-oleh lewat sisa bagasi traveler yang terverifikasi.
          </p>

          <HeroSearch />

          <div className="mt-6 flex items-center gap-2 sm:mt-8">
            <span className="shrink-0 text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-slate-500">Populer</span>
            <div className="no-scrollbar -mr-5 flex min-w-0 items-center gap-1.5 overflow-x-auto py-1 pr-5 sm:mr-0 sm:flex-wrap sm:pr-0">
              {POPULAR_ROUTES.slice(0, 4).map((r) => (
                <Link
                  key={`${r.from.city}-${r.to.city}`}
                  to={`/explore?oc=${r.from.countryCode}&ocity=${r.from.city}&dc=${r.to.countryCode}&dcity=${r.to.city}`}
                  aria-label={`${r.from.city} ke ${r.to.city}`}
                  title={`${r.from.city} → ${r.to.city}`}
                  className="num flex h-8 shrink-0 items-center gap-1 rounded-full bg-white px-3 text-[0.75rem] font-semibold text-navy shadow-card transition duration-150 ease-spring hover:shadow-lift active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
                >
                  {cityCode(r.from.city)}
                  <span className="text-[0.625rem] font-normal text-slate-400">→</span>
                  {cityCode(r.to.city)}
                </Link>
              ))}
            </div>
          </div>
          <div className="mt-6 grid max-w-md grid-cols-3 gap-2.5">
            <HeroStat value={String(open.filter((v) => v.listing.type === 'weight').length)} label="trip bagasi buka" />
            <HeroStat value={String(new Set(views.map((v) => v.listing.ownerId)).size)} label="jastiper" />
            <HeroStat value={avgRating ? avgRating.toFixed(1) : '-'} label="rating rata-rata" />
          </div>
        </div>

        <TripDemo className="mx-auto w-full min-w-0 max-w-[460px] lg:mr-0" />
      </div>
      </div>
    </section>
  );
}

const SUGGESTIONS = ['Riyadh', 'Sydney', 'Jeddah', 'Kurma', 'Sambal', 'Bagasi 20 kg'];

const DIRECTIONS: [Direction, string][] = [
  ['SA-ID', 'Saudi → Indonesia'],
  ['ID-SA', 'Indonesia → Saudi'],
  ['AU-ID', 'Australia → Indonesia'],
  ['ID-AU', 'Indonesia → Australia'],
  ['', 'Semua arah'],
];
const TYPES: ['' | 'weight' | 'shopping', string, string][] = [
  ['weight', 'Jastip Bagasi', 'Titip di sisa bagasi traveler, bayar per kg'],
  ['shopping', 'Jastip Barang', 'Pre-order produk lewat personal shopper'],
  ['', 'Semua jenis', 'Bagasi dan barang'],
];

/** Small "Mulai cari" button that unfolds into a three-step picker: keyword, direction, type. */
function HeroSearch() {
  const navigate = useNavigate();
  const [open, setOpen] = React.useState(false);
  const [step, setStep] = React.useState(0);
  const [q, setQ] = React.useState('');
  const [dir, setDir] = React.useState<Direction>('SA-ID');
  const inputRef = React.useRef<HTMLInputElement>(null);

  const panelRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => {
      panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      if (step === 0) inputRef.current?.focus({ preventScroll: true });
    }, 300);
    return () => clearTimeout(t);
  }, [open, step]);

  const go = (type: '' | 'weight' | 'shopping') => {
    const p = new URLSearchParams();
    if (q.trim()) p.set('q', q.trim());
    if (dir) {
      const [o, d] = dir.split('-');
      p.set('oc', o!);
      p.set('dc', d!);
    }
    if (type) p.set('type', type);
    navigate(`/explore?${p.toString()}`);
  };
  const pick = (x: string) => {
    setQ(x);
    setStep(1);
    setOpen(true);
  };
  const close = () => {
    setOpen(false);
    setStep(0);
  };
  const titles = ['Mau cari apa?', 'Arah perjalanan', 'Jenis jastip'];
  const option = 'flex w-full items-center justify-between rounded-2xl bg-slate-100 px-4 py-3.5 text-left text-[15px] font-semibold text-navy transition duration-150 ease-spring hover:bg-slate-200 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500';

  return (
    <div className="mt-8 sm:mt-10">
      <div
        className={cn(
          'grid transition-[grid-template-rows,opacity] duration-500 ease-spring',
          open ? 'grid-rows-[0fr] opacity-0' : 'grid-rows-[1fr] opacity-100',
        )}
        aria-hidden={open}
      >
        <div className="pointer-events-none -m-10 overflow-hidden p-10">
          <button
            type="button"
            tabIndex={open ? -1 : 0}
            onClick={() => setOpen(true)}
            className={cn('group relative flex h-16 items-center gap-4 rounded-full bg-teal-500 py-1.5 pl-1.5 pr-8 text-xl font-semibold text-navy-900 shadow-lift hover:bg-teal-400 transition duration-200 ease-spring hover:scale-[1.02] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2', !open && 'pointer-events-auto')}
          >
            <span aria-hidden className="cta-ring pointer-events-none absolute inset-0 rounded-full bg-teal-500" />
            <span className="relative flex h-12 w-12 items-center justify-center rounded-full bg-navy text-white transition-transform duration-300 ease-spring group-hover:rotate-12">
              <Search className="h-6 w-6" aria-hidden />
            </span>
            <span className="relative">Mulai cari</span>
          </button>
        </div>
      </div>

      <div
        className={cn(
          'grid transition-[grid-template-rows,opacity] duration-500 ease-spring',
          open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
        )}
      >
        <div className="pointer-events-none -m-10 overflow-hidden p-10">
          <div
            ref={panelRef}
            role="dialog"
            aria-label="Cari listing"
            hidden={!open}
            className={cn(
              'pointer-events-auto origin-top-left rounded-3xl bg-white p-4 text-navy shadow-lift transition duration-500 ease-spring sm:max-w-md sm:p-5',
              open ? 'scale-100' : 'scale-90',
            )}
          >
            <div className="flex items-center gap-2">
              {step > 0 && (
                <button type="button" onClick={() => setStep(step - 1)} aria-label="Kembali" className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-navy active:scale-95">
                  <ArrowRight className="h-4 w-4 rotate-180" />
                </button>
              )}
              <p className="flex-1 text-lg font-bold">{titles[step]}</p>
              <span className="num text-sm text-slate-500">{step + 1}/3</span>
              <button type="button" onClick={close} aria-label="Tutup" className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-navy active:scale-95">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-2 flex gap-1" aria-hidden>
              {[0, 1, 2].map((i) => (
                <span key={i} className={cn('h-1 flex-1 rounded-full transition-colors duration-300', i <= step ? 'bg-teal-500' : 'bg-slate-200')} />
              ))}
            </div>

            <div className="mt-4 overflow-hidden">
              <div className="flex items-start transition-transform duration-500 ease-spring" style={{ transform: `translateX(-${step * 100}%)` }}>
                <form
                  className={cn('w-full shrink-0 overflow-hidden p-1 transition-[max-height] duration-500 ease-spring', step === 0 ? 'max-h-96' : 'max-h-0', 'space-y-3')}
                  aria-hidden={step !== 0}
                  onSubmit={(e) => {
                    e.preventDefault();
                    setStep(1);
                  }}
                >
                  <label htmlFor="hero-q" className="sr-only">
                    Kata kunci
                  </label>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" aria-hidden />
                    <input
                      ref={inputRef}
                      id="hero-q"
                      tabIndex={step === 0 ? 0 : -1}
                      value={q}
                      onChange={(e) => setQ(e.target.value)}
                      placeholder="Kota atau produk"
                      className="h-14 w-full rounded-2xl bg-slate-100 pl-12 pr-4 text-base placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
                    />
                  </div>
                  <p className="px-1 pt-1 text-[13px] text-slate-500">Bisa kota, produk, atau bagasi. Contoh:</p>
                  <div className="flex flex-wrap gap-2">
                    {SUGGESTIONS.map((x) => (
                      <button
                        key={x}
                        type="button"
                        tabIndex={step === 0 ? 0 : -1}
                        onClick={() => pick(x)}
                        className="rounded-full bg-slate-100 px-3 py-1.5 text-sm font-medium text-navy transition duration-150 ease-spring hover:bg-slate-200 active:scale-95"
                      >
                        {x}
                      </button>
                    ))}
                  </div>
                  <button type="submit" tabIndex={step === 0 ? 0 : -1} className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-deep text-[15px] font-semibold text-snow active:scale-[0.98]">
                    {q.trim() ? 'Lanjut' : 'Lewati'} <ArrowRight className="h-4 w-4" />
                  </button>
                </form>

                <div className={cn('w-full shrink-0 overflow-hidden p-1 transition-[max-height] duration-500 ease-spring', step === 1 ? 'max-h-96' : 'max-h-0', 'space-y-2')} role="radiogroup" aria-label="Arah perjalanan" aria-hidden={step !== 1}>
                  {DIRECTIONS.map(([v, label]) => (
                    <button
                      key={v || 'all'}
                      type="button"
                      role="radio"
                      aria-checked={dir === v}
                      tabIndex={step === 1 ? 0 : -1}
                      onClick={() => {
                        setDir(v);
                        setStep(2);
                      }}
                      className={cn(option, dir === v && 'ring-2 ring-inset ring-teal-500')}
                    >
                      {label}
                      <ArrowRight className="h-4 w-4 text-slate-400" />
                    </button>
                  ))}
                </div>

                <div className={cn('w-full shrink-0 overflow-hidden p-1 transition-[max-height] duration-500 ease-spring', step === 2 ? 'max-h-96' : 'max-h-0', 'space-y-2')} aria-hidden={step !== 2}>
                  {TYPES.map(([v, label, hint]) => (
                    <button key={v || 'all'} type="button" tabIndex={step === 2 ? 0 : -1} onClick={() => go(v)} className={option}>
                      <span>
                        {label}
                        <span className="block text-[13px] font-normal text-slate-500">{hint}</span>
                      </span>
                      <Search className="h-4 w-4 text-teal-700" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Chip({ i, rot, className, children }: { i: number; rot: number; className?: string; children: React.ReactNode }) {
  return (
    <span
      className={cn('chip-pop inline-block rounded-2xl px-2.5 pb-0.5 shadow-card', className)}
      style={{ ['--i' as string]: i, ['--r' as string]: `${rot}deg` }}
    >
      {children}
    </span>
  );
}

function HeroStat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-2xl bg-white p-3 shadow-card">
      <p className="num text-2xl font-bold text-navy">{value}</p>
      <p className="text-xs text-slate-500">{label}</p>
    </div>
  );
}

function SectionHeader({ id, title, to }: { id: string; title: string; to: string }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4 sm:mb-5">
      <div>
        <h2 id={id} className="text-xl font-semibold text-navy sm:text-3xl">
          {title}
        </h2>
      </div>
      <Link to={to} className="flex shrink-0 items-center gap-1 rounded-lg text-sm font-semibold text-teal-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500">
        Lihat semua <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}

function PhotoTile({
  to,
  image,
  icon,
  title,
  text,
  meta,
  primary,
}: {
  to: string;
  image: string;
  icon: React.ReactNode;
  title: string;
  text: string;
  meta: string;
  primary?: boolean;
}) {
  return (
    <Link
      to={to}
      className="group flex items-center gap-4 rounded-3xl bg-white p-2 shadow-card transition duration-200 ease-spring hover:shadow-lift active:scale-[0.985] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
    >
      <img src={image} alt="" loading="lazy" className="h-14 w-14 shrink-0 rounded-xl object-cover sm:h-28 sm:w-28" />
      <span className="min-w-0 flex-1 py-1 pr-2">
        <span className="flex items-center gap-2 text-base font-semibold text-navy sm:text-lg">
          <span className="[&_svg]:h-5 [&_svg]:w-5">{icon}</span>
          {title}
          {primary && <span className="rounded-full bg-teal-50 px-2 py-0.5 text-[11px] font-bold text-teal-800">Utama</span>}
        </span>
        <span className="mt-0.5 hidden text-sm text-slate-500 sm:block">{text}</span>
        <span className="num mt-1 inline-flex items-center gap-1.5 text-sm font-semibold text-teal-700 sm:mt-2">
          {meta} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </span>
      </span>
    </Link>
  );
}

function TrustPoint({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="flex gap-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700 [&_svg]:h-[18px] [&_svg]:w-[18px]" aria-hidden>
        {icon}
      </span>
      <p className="text-sm leading-snug text-slate-600">
        <span className="block font-bold text-navy">{title}</span>
        {text}
      </p>
    </div>
  );
}

/** Promoted jastiper (paid placement, labelled as such). */
function FeaturedProviders() {
  const db = useDB();
  const views = useListingViews();
  const list = React.useMemo(() => {
    const now = Date.now();
    return db.users
      .filter((u) => isPromoted(db.purchases, u.id, now))
      .map((u) => {
        const mine = db.reviews.filter((r) => r.providerId === u.id && (r.direction ?? 'to_provider') === 'to_provider');
        return {
          user: u,
          pro: isPro(db.purchases, u.id, now),
          trust: computeTrust(u, db, now),
          rating: mine.length ? mine.reduce((a, r) => a + r.rating, 0) / mine.length : 0,
          count: mine.length,
          open: views.filter((v) => v.listing.ownerId === u.id && v.status === 'open').length,
        };
      })
      .slice(0, 4);
  }, [db, views]);
  if (!list.length) return null;
  return (
    <section className="container pt-4 sm:pt-6" aria-labelledby="picks-title">
      <div className="rounded-[2rem] bg-slate-100 p-4 sm:p-7">
        <div className="mb-4 flex items-end justify-between gap-4 sm:mb-5">
          <div>
            <h2 id="picks-title" className="text-xl font-semibold text-navy sm:text-3xl">
              Jastiper Pilihan
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">Penempatan berbayar (Promoted jastiper).</p>
          </div>
          <Link to="/harga" className="shrink-0 text-sm font-semibold text-teal-700 hover:underline">
            Tampil di sini
          </Link>
        </div>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {list.map((p, i) => (
            <Reveal as="li" i={i} key={p.user.id}>
              <Link
                to={`/providers/${p.user.id}`}
                className="flex h-full flex-col gap-3 rounded-3xl bg-white p-4 shadow-card transition duration-200 ease-spring hover:shadow-lift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
              >
                <span className="flex items-center gap-3">
                  <Avatar user={p.user} size={48} />
                  <span className="min-w-0">
                    <span className="flex items-center gap-1.5 truncate font-bold text-navy">
                      {p.user.displayName} {p.pro && <ProBadge className="scale-90" />}
                    </span>
                    <span className="block text-[13px] text-slate-500">{p.user.city ?? '-'}</span>
                  </span>
                </span>
                <span className="flex items-center gap-1.5 text-sm">
                  {p.count ? (
                    <>
                      <StarRating value={p.rating} size={13} /> <span className="num font-semibold text-navy">{p.rating.toFixed(1)}</span>
                      <span className="text-slate-500">({p.count})</span>
                    </>
                  ) : (
                    <span className="text-slate-500">Belum ada rating</span>
                  )}
                </span>
                <span className="mt-auto flex items-center justify-between text-[13px]">
                  <span className="font-semibold text-teal-700">{p.open} trip buka</span>
                  <span className="num text-slate-500">Skor {p.trust.score}</span>
                </span>
              </Link>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}

const CLIENT_NEXT: Record<string, string> = {
  pending: 'Menunggu penyedia',
  accepted: 'Serahkan barang',
  handed_over: 'Bayar tagihan',
  shipped: 'Dalam perjalanan',
  delivered: 'Konfirmasi diterima',
};

/** Logged-in clients see their orders in progress first. */
function ActiveOrders({ userId, name }: { userId: string; name: string }) {
  const { inquiries, listings } = useDB();
  const active = inquiries
    .filter((i) => i.buyerId === userId && OPEN_ORDER_STATUSES.includes(i.status))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return (
    <section className="container pt-4 sm:pt-6" aria-labelledby="mine-title">
      <div className="rounded-[2rem] bg-teal-50 p-4 ring-1 ring-teal-100 sm:p-6">
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-teal-800">Halo, {name}</p>
            <h2 id="mine-title" className="text-lg font-bold text-navy sm:text-xl">
              {active.length ? `Pesanan aktif (${active.length})` : 'Belum ada pesanan aktif'}
            </h2>
          </div>
          <Link to="/orders" className="shrink-0 text-sm font-semibold text-teal-800 hover:underline">
            Semua pesanan
          </Link>
        </div>
        {active.length ? (
          <ul className="no-scrollbar -mx-1 flex gap-3 overflow-x-auto px-1 pb-1">
            {active.slice(0, 6).map((i) => {
              const l = listings.find((x) => x.id === i.listingId);
              const actionable = ['handed_over', 'delivered'].includes(i.status) && i.payment?.status !== 'paid' ? true : i.status === 'delivered';
              return (
                <li key={i.id} className="w-[260px] shrink-0">
                  <Link to={`/orders/${i.id}`} className="flex h-full flex-col gap-2 rounded-2xl bg-white p-4 shadow-card transition hover:shadow-lift">
                    <span className="flex items-center justify-between gap-2">
                      <InquiryStatusBadge status={i.status} />
                      <span className="num text-xs text-slate-500">{formatMoneyGroups(inquiryTotals(i, l))}</span>
                    </span>
                    <span className="truncate font-bold text-navy">
                      {l ? `${l.origin.city} → ${l.destination.city}` : 'Listing dihapus'}
                    </span>
                    <span className="text-[13px] text-slate-500">
                      {l?.type === 'weight' ? formatKg(i.handover?.weightKg ?? i.requestedKg ?? 0) : `${(i.items ?? []).reduce((a, x) => a + x.quantity, 0)} item`}
                    </span>
                    <span className={cn('mt-auto text-[13px] font-semibold', actionable ? 'text-amber-700' : 'text-teal-800')}>{CLIENT_NEXT[i.status]} →</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-slate-600">
            Cari trip bagasi ke kota Anda, lalu request titipan.{' '}
            <Link to="/explore?type=weight" className="font-semibold text-teal-800 underline">
              Cari trip
            </Link>
          </p>
        )}
      </div>
    </section>
  );
}
