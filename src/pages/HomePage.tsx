import * as React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeftRight, ArrowRight, MapPin, MessageCircle, Package, Plane, PlusCircle, Search, ShieldCheck, ShoppingBag, Star, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/shared/display';
import { ListingGrid } from '@/components/listings/ListingCard';
import { useDB, useListingViews, usePageMeta } from '@/hooks/useStore';
import { POPULAR_ROUTES, cityCode } from '@/data/locations';
import { TYPE_IMAGES } from '@/data/images';
import { Reveal } from '@/components/shared/Reveal';
import { compareListingDates } from '@/lib/listingDates';
import { cn } from '@/lib/utils';

type Direction = 'SA-ID' | 'ID-SA' | 'AU-ID' | 'ID-AU' | '';

const HOW_STEPS = [
  { emoji: '🔍', title: 'Cari', text: 'Pilih rute atau produk.' },
  { emoji: '📩', title: 'Ajukan', text: 'Kirim permintaan ke penyedia.' },
  { emoji: '🤝', title: 'Sepakati', text: 'Atur serah terima lewat chat.' },
  { emoji: '⭐', title: 'Selesai', text: 'Konfirmasi, lalu beri ulasan.' },
];

export function HomePage() {
  usePageMeta(undefined, 'Jastip diaspora dan personal shopper Saudi ↔ Indonesia.');
  const views = useListingViews();
  const open = views.filter((v) => v.status === 'open');
  const soonest = [...open].sort((a, b) => compareListingDates(a.listing, b.listing)).slice(0, 5);
  const newest = [...open]
    .filter((v) => !soonest.includes(v))
    .sort((a, b) => (b.listing.publishedAt ?? '').localeCompare(a.listing.publishedAt ?? ''))
    .slice(0, 5);

  return (
    <>
      <Hero />

      {/* Two ways to use the app */}
      <section className="container pt-10 sm:pt-16" aria-labelledby="cat-title">
        <h2 id="cat-title" className="text-xl font-semibold text-navy sm:text-3xl">
          Mau titip apa?
        </h2>
        <div className="mt-4 grid gap-3 sm:mt-5 sm:grid-cols-2">
          <PhotoTile
            to="/explore?type=weight"
            image={TYPE_IMAGES.weight}
            icon={<Plane className="text-sky-600" />}
            title="Jastip Bagasi"
            text="Titip di sisa bagasi traveler. Bayar per kg."
            meta={`${open.filter((v) => v.listing.type === 'weight').length} perjalanan terbuka`}
            />
          <PhotoTile
            to="/explore?type=shopping"
            image={TYPE_IMAGES.shopping}
            icon={<ShoppingBag className="text-amber-600" />}
            title="Jastip Belanja"
            text="Pesan produk lewat personal shopper."
            meta={`${open.filter((v) => v.listing.type === 'shopping').length} PO terbuka`}
          />
        </div>
        <p className="mt-4 hidden text-sm text-slate-500 sm:block">
          Segera hadir: <span className="text-navy">Preloved</span>, <span className="text-navy">Ekspedisi</span>, <span className="text-navy">Komunitas</span>
        </p>
      </section>

      <section className="container pt-8 sm:pt-12" aria-labelledby="soon-title">
        <div className="rounded-[2rem] bg-slate-100 p-4 sm:p-7">
        <SectionHeader id="soon-title" title="Segera berangkat" to="/explore?sort=departure" />
        {soonest.length ? (
          <ListingGrid views={soonest} compact />
        ) : (
          <EmptyState icon={<Plane className="text-sky-600" />} title="Belum ada listing terbuka" description="Jadilah yang pertama memasang perjalanan." action={<Button asChild><Link to="/post">Pasang listing</Link></Button>} />
        )}
      </div>
      </section>

      {newest.length > 0 && (
        <section className="container pt-4 sm:pt-6" aria-labelledby="new-title">
        <div className="rounded-[2rem] bg-slate-100 p-4 sm:p-7">
          <SectionHeader id="new-title" title="Listing terbaru" to="/explore?sort=newest" />
          <ListingGrid views={newest} compact mobileLimit={4} />
        </div>
      </section>
      )}

      {/* How it works */}
      <section className="container pt-12 sm:pt-20" aria-labelledby="how-title">
        <h2 id="how-title" className="text-xl font-semibold text-navy sm:text-3xl">
          Cara kerja
        </h2>
        <ol className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          {HOW_STEPS.map((st, i) => (
            <Reveal as="li" i={i} key={st.title} className="rounded-3xl bg-white p-4 shadow-card sm:p-5">
              <span className="text-2xl" aria-hidden>
                {st.emoji}
              </span>
              <h3 className="mt-2 text-base font-semibold text-navy">{st.title}</h3>
              <p className="mt-0.5 text-sm leading-snug text-slate-600">{st.text}</p>
            </Reveal>
          ))}
        </ol>
      </section>

      {/* Safety: slim strip, not another card */}
      <section className="container pt-14" aria-label="Keamanan">
        <div className="flex flex-col gap-4 border-y border-border py-6 sm:flex-row sm:items-center">
          <ShieldCheck className="h-7 w-7 shrink-0 text-amber-600" aria-hidden />
          <p className="flex-1 text-sm leading-relaxed text-slate-600">
            <span className="font-bold text-navy">Cek aturan maskapai dan bea cukai.</span> Demo ini tidak memverifikasi identitas, barang, atau pembayaran.
          </p>
          <Link to="/safety" className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-teal-700 hover:underline">
            Panduan <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="container pt-14" aria-labelledby="cta-title">
        <div className="rounded-3xl bg-white px-6 py-10 shadow-card sm:px-10 sm:py-14">
          <h2 id="cta-title" className="text-3xl font-semibold leading-tight text-navy sm:text-4xl">
            Bagasi masih longgar?
          </h2>
          <p className="mt-3 max-w-xl text-slate-600">Atur kuota, biaya per kg, dan batas titip sendiri.</p>
          <Button asChild variant="accent" size="lg" className="mt-7">
            <Link to="/post">
              <PlusCircle /> Pasang listing
            </Link>
          </Button>
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
      <div className="relative grid gap-10 px-5 pb-32 pt-8 sm:pb-16 sm:pt-16 sm:px-10 lg:grid-cols-[1.15fr_1fr] lg:items-center lg:px-14 lg:py-20">
        <div className="min-w-0">
          <p className="mb-4 inline-flex sm:mb-6 items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600 shadow-card">
            <span className="text-[10px] font-bold text-slate-400">SA</span> Arab Saudi <ArrowLeftRight className="h-3.5 w-3.5" /> Indonesia{' '}
            <span className="text-[10px] font-bold text-slate-400">ID</span>
          </p>
          <h1 className="text-[2.4rem] font-bold leading-[1.06] text-navy sm:text-5xl lg:text-[3.4rem]">
            Titip{' '}
            <span className="whitespace-nowrap">
              <Chip i={0} rot={-3} className="bg-teal-200 text-navy">barang</Chip>,
            </span>{' '}
            temukan{' '}
            <span className="whitespace-nowrap">
              <Chip i={1} rot={2} className="bg-navy text-white">perjalanan</Chip>,
            </span>{' '}
            terhubung dengan{' '}
            <span className="whitespace-nowrap">
              <span className="chip-pop inline-block rounded-2xl bg-teal-500 p-[2.5px] align-baseline" style={{ ['--i' as string]: 2, ['--r' as string]: '-1.5deg' }}>
                <span className="block rounded-[0.85rem] bg-white px-2.5 pb-0.5">diaspora</span>
              </span>
              .
            </span>
          </h1>
          <p className="mt-4 max-w-xl text-[17px] leading-relaxed text-slate-600 sm:mt-6 sm:text-lg">
            Cari bagasi kosong traveler atau pesan oleh-oleh dari personal shopper.
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
        </div>

        <HeroVisualMobile open={open.length} providers={new Set(views.map((v) => v.listing.ownerId)).size} rating={avgRating} />
        <HeroBubbles />
        <HeroVisual open={open.length} providers={new Set(views.map((v) => v.listing.ownerId)).size} rating={avgRating} />
      </div>
      </div>
    </section>
  );
}

const SUGGESTIONS = ['Kurma', 'Cokelat', 'Batik', 'Abaya', 'Riyadh', 'Bagasi 20 kg'];

const DIRECTIONS: [Direction, string][] = [
  ['SA-ID', 'Saudi → Indonesia'],
  ['ID-SA', 'Indonesia → Saudi'],
  ['AU-ID', 'Australia → Indonesia'],
  ['ID-AU', 'Indonesia → Australia'],
  ['', 'Semua arah'],
];
const TYPES: ['' | 'weight' | 'shopping', string, string][] = [
  ['', 'Semua jenis', 'Bagasi dan belanja'],
  ['weight', 'Jastip Bagasi', 'Titip di bagasi traveler'],
  ['shopping', 'Jastip Belanja', 'Pesan lewat personal shopper'],
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
            className={cn('pointer-events-auto group relative flex h-16 items-center gap-4 rounded-full bg-teal-500 py-1.5 pl-1.5 pr-8 text-xl font-semibold text-navy-900 shadow-lift hover:bg-teal-400 transition duration-200 ease-spring hover:scale-[1.02] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2', open && 'pointer-events-none')}
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

const BUBBLES = [
  { icon: Plane, tone: 'from-navy-400 to-navy-700', left: '4%', size: 52, delay: 0 },
  { icon: ShoppingBag, tone: 'from-teal-300 to-teal-500', left: '22%', size: 44, delay: 0.8 },
  { icon: Package, tone: 'from-navy-300 to-navy-600', left: '40%', size: 56, delay: 0.3 },
  { icon: MapPin, tone: 'from-navy-400 to-navy-700', left: '58%', size: 46, delay: 1.1 },
  { icon: Star, tone: 'from-teal-300 to-teal-500', left: '74%', size: 50, delay: 0.5 },
  { icon: MessageCircle, tone: 'from-navy-300 to-navy-600', left: '88%', size: 44, delay: 1.4 },
];

/** Floating icon bubbles along the bottom edge of the hero (phones only). */
function HeroBubbles() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-28 overflow-hidden sm:hidden">
      {BUBBLES.map((b, i) => (
        <span
          key={i}
          className={cn('bubble-float absolute flex items-center justify-center rounded-full bg-gradient-to-br text-white shadow-lift', b.tone)}
          style={{ left: b.left, bottom: i % 2 ? -14 : 6, width: b.size, height: b.size, animationDelay: `${b.delay}s` }}
        >
          <span className="absolute left-[18%] top-[14%] h-[26%] w-[34%] rounded-full bg-white/50 blur-[1px]" />
          <b.icon className="relative h-5 w-5" strokeWidth={2.2} />
        </span>
      ))}
    </div>
  );
}

/** Stats and the shopping card, side by side, for phones. */
function HeroVisualMobile({ open, providers, rating }: { open: number; providers: number; rating: number }) {
  return (
    <div className="relative -mt-2 h-48 lg:hidden" aria-hidden>
      <div className="absolute left-0 top-12 grid w-[74%] grid-cols-3 gap-2.5">
        <HeroStat value={String(open)} label="listing buka" />
        <HeroStat value={String(providers)} label="penyedia" />
        <HeroStat value={rating ? rating.toFixed(1) : '-'} label="rating" />
      </div>
      <div className="absolute right-0 top-0 w-[62%] rotate-[4deg] rounded-3xl bg-white p-3.5 text-navy shadow-lift">
        <p className="inline-flex items-center gap-1.5 text-xs font-bold text-navy">
          <ShoppingBag className="h-3.5 w-3.5 text-amber-600" /> Jastip Belanja · Jeddah
        </p>
        <div className="mt-2.5 grid grid-cols-3 gap-1.5">
          {['kurma', 'cokelat', 'fashion'].map((n) => (
            <img key={n} src={`/images/${n}.webp`} alt="" className="aspect-square rounded-xl object-cover" />
          ))}
        </div>
      </div>
    </div>
  );
}

function HeroVisual({ open, providers, rating }: { open: number; providers: number; rating: number }) {
  return (
    <div className="relative hidden h-[27rem] lg:block" aria-hidden>
      <div className="float-a absolute inset-x-2 top-0 rotate-[-3deg] rounded-3xl bg-white p-5 text-navy shadow-card">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-navy-50 px-2.5 py-1 text-xs font-bold text-navy">
            <Plane className="h-3.5 w-3.5 text-sky-600" /> Jastip Bagasi
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Buka
          </span>
        </div>
        <p className="mt-4 flex items-center gap-2 text-2xl font-bold">
          RUH <span className="text-teal-500">→</span> CGK
        </p>
        <p className="num mt-1 text-sm text-slate-500">Riyadh → Jakarta · Sisa 15 kg · 25 SAR/kg</p>
        <div className="mt-3 h-2 rounded-full bg-slate-100">
          <div className="bar-grow h-2 w-1/4 rounded-full bg-teal-500" />
        </div>
      </div>
      <div className="absolute inset-x-0 top-[14.5rem] grid w-[84%] grid-cols-3 gap-3">
        <HeroStat value={String(open)} label="listing buka" />
        <HeroStat value={String(providers)} label="penyedia" />
        <HeroStat value={rating ? rating.toFixed(1) : '-'} label="rating" />
      </div>
      <div className="float-b absolute right-0 top-[13.5rem] w-64 rotate-[4deg] rounded-3xl bg-white p-4 text-navy shadow-lift">
        <p className="inline-flex items-center gap-1.5 text-xs font-bold text-navy">
          <ShoppingBag className="h-3.5 w-3.5 text-amber-600" /> Jastip Belanja · Jeddah
        </p>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {['kurma', 'cokelat', 'fashion'].map((n) => (
            <img key={n} src={`/images/${n}.webp`} alt="" className="aspect-square rounded-xl object-cover" />
          ))}
        </div>
      </div>
    </div>
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
}: {
  to: string;
  image: string;
  icon: React.ReactNode;
  title: string;
  text: string;
  meta: string;
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
        </span>
        <span className="mt-0.5 hidden text-sm text-slate-500 sm:block">{text}</span>
        <span className="num mt-1 inline-flex items-center gap-1.5 text-sm font-semibold text-teal-700 sm:mt-2">
          {meta} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </span>
      </span>
    </Link>
  );
}
