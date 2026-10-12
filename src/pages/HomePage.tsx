import * as React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeftRight, ArrowRight, Plane, PlusCircle, Search, ShieldCheck, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/shared/display';
import { ListingGrid } from '@/components/listings/ListingCard';
import { useDB, useListingViews, usePageMeta } from '@/hooks/useStore';
import { POPULAR_ROUTES, cityCode } from '@/data/locations';
import { TYPE_IMAGES, cityImage } from '@/data/images';
import { cn } from '@/lib/utils';

type Direction = 'SA-ID' | 'ID-SA' | '';

export function HomePage() {
  usePageMeta(undefined, 'Jastip diaspora dan personal shopper Saudi ↔ Indonesia.');
  const views = useListingViews();
  const open = views.filter((v) => v.status === 'open');
  const soonest = [...open].sort((a, b) => a.listing.departureDate.localeCompare(b.listing.departureDate)).slice(0, 4);
  const newest = [...open]
    .filter((v) => !soonest.includes(v))
    .sort((a, b) => (b.listing.publishedAt ?? '').localeCompare(a.listing.publishedAt ?? ''))
    .slice(0, 8);

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
            title="Jastip Diaspora"
            text="Titip di sisa bagasi traveler. Bayar per kg."
            meta={`${open.filter((v) => v.listing.type === 'weight').length} perjalanan terbuka`}
            />
          <PhotoTile
            to="/explore?type=shopping"
            image={TYPE_IMAGES.shopping}
            icon={<ShoppingBag className="text-amber-600" />}
            title="Jastip Shopping"
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

      {/* How it works: plain steps, no cards */}
      <section className="container pt-12 sm:pt-24" aria-labelledby="how-title">
        <h2 id="how-title" className="text-xl font-semibold text-navy sm:text-3xl">
          Cara kerja
        </h2>
        <ol className="mt-5 grid gap-5 sm:mt-8 sm:grid-cols-3 sm:gap-10">
          {[
            { title: 'Cari', text: 'Filter arah, tanggal, dan harga.' },
            { title: 'Ajukan', text: 'Kuota direservasi saat penyedia menerima.' },
            { title: 'Selesaikan', text: 'Konfirmasi bersama, lalu beri ulasan.' },
          ].map((st, i) => (
            <li key={st.title} className="border-t border-border pt-4">
              <h3 className="text-lg font-semibold text-navy">
                <span className="num mr-2 text-teal-700">{i + 1}</span>
                {st.title}
              </h3>
              <p className="mt-1 text-slate-500">{st.text}</p>
            </li>
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

      {/* Closing CTA over photography */}
      <section className="container pt-14" aria-labelledby="cta-title">
        <div className="relative overflow-hidden rounded-3xl bg-deep">
          <img src={cityImage('Jakarta')} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
          <span className="scrim-l absolute inset-0" aria-hidden />
          <div className="relative max-w-xl px-6 py-12 text-snow sm:px-10 sm:py-16">
            <h2 id="cta-title" className="text-3xl font-semibold leading-tight sm:text-4xl">
              Bagasi masih longgar?
            </h2>
            <p className="mt-3 text-snow/80">Atur kuota, biaya per kg, dan batas titip sendiri.</p>
            <Button asChild variant="accent" size="lg" className="mt-7">
              <Link to="/post">
                <PlusCircle /> Pasang listing
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}

function Hero() {
  const navigate = useNavigate();
  const views = useListingViews();
  const { reviews } = useDB();
  const [q, setQ] = React.useState('');
  const [dir, setDir] = React.useState<Direction>('SA-ID');
  const [type, setType] = React.useState<'' | 'weight' | 'shopping'>('');
  const open = views.filter((v) => v.status === 'open');
  const avgRating = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
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

  return (
    <section className="container pt-4 sm:pt-6">
      <div className="relative overflow-hidden rounded-[2rem] bg-slate-100">
      <div className="relative grid gap-10 px-5 py-8 sm:px-10 sm:py-16 lg:grid-cols-[1.15fr_1fr] lg:items-center lg:px-14 lg:py-20">
        <div>
          <p className="mb-4 inline-flex sm:mb-6 items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600 shadow-card">
            <span className="text-[10px] font-bold text-slate-400">SA</span> Arab Saudi <ArrowLeftRight className="h-3.5 w-3.5" /> Indonesia{' '}
            <span className="text-[10px] font-bold text-slate-400">ID</span>
          </p>
          <h1 className="text-[1.9rem] font-bold leading-[1.08] text-navy sm:text-5xl lg:text-[3.4rem]">
            Titip barang, temukan perjalanan, <span className="text-teal-700">terhubung dengan diaspora.</span>
          </h1>
          <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-slate-500 sm:mt-6 sm:text-lg">
            Cari bagasi kosong traveler atau pesan oleh-oleh dari personal shopper.
          </p>

          <form onSubmit={submit} role="search" className="mt-6 rounded-3xl sm:mt-10 bg-white p-2 text-navy shadow-card sm:p-3">
            <div className="flex gap-1 rounded-xl bg-slate-100 p-1" role="radiogroup" aria-label="Arah perjalanan">
              {(
                [
                  ['SA-ID', 'SA → ID', 'Saudi → Indonesia'],
                  ['ID-SA', 'ID → SA', 'Indonesia → Saudi'],
                  ['', 'Semua', 'Semua arah'],
                ] as const
              ).map(([v, short, label]) => (
                <button
                  key={v}
                  type="button"
                  role="radio"
                  aria-checked={dir === v}
                  onClick={() => setDir(v)}
                  className={cn(
                    'min-h-[40px] flex-1 rounded-lg px-2 text-[13px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 sm:text-sm',
                    dir === v ? 'bg-white text-navy shadow-sm' : 'text-slate-500 hover:text-navy',
                  )}
                >
                  <span className="sm:hidden">{short}</span>
                  <span className="hidden sm:inline">{label}</span>
                </button>
              ))}
            </div>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
              <label htmlFor="hero-q" className="sr-only">
                Kata kunci
              </label>
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" aria-hidden />
                <input
                  id="hero-q"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Kota atau produk, cth. Riyadh, kurma"
                  className="h-12 w-full rounded-xl border border-border bg-white pl-11 pr-3 text-[15px] placeholder:text-slate-500 focus-visible:border-teal-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/30"
                />
              </div>
              <label htmlFor="hero-type" className="sr-only">
                Jenis jastip
              </label>
              <select
                id="hero-type"
                value={type}
                onChange={(e) => setType(e.target.value as typeof type)}
                className="h-12 rounded-xl border border-border bg-white px-3 text-[15px] focus-visible:border-teal-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/30 sm:w-44"
              >
                <option value="">Semua jenis</option>
                <option value="weight">Jastip Diaspora</option>
                <option value="shopping">Jastip Shopping</option>
              </select>
              <Button type="submit" variant="accent" size="lg" className="h-12">
                <Search /> Cari
              </Button>
            </div>
          </form>

          <div className="mt-5 flex flex-wrap items-center gap-2 sm:mt-8">
            <span className="mr-1 text-xs text-slate-500">Populer</span>
            {POPULAR_ROUTES.slice(0, 4).map((r, i) => (
              <Link
                key={`${r.from.city}-${r.to.city}`}
                to={`/explore?oc=${r.from.countryCode}&ocity=${r.from.city}&dc=${r.to.countryCode}&dcity=${r.to.city}`}
                aria-label={`${r.from.city} ke ${r.to.city}`}
                title={`${r.from.city} → ${r.to.city}`}
                className={cn('num flex min-h-[36px] items-center gap-1.5 rounded-full bg-white px-3.5 text-[13px] font-medium text-navy shadow-card transition duration-150 ease-spring hover:shadow-lift active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500', i > 2 && 'max-sm:hidden')}
              >
                {cityCode(r.from.city)} <span className="text-slate-400">→</span> {cityCode(r.to.city)}
              </Link>
            ))}
          </div>
        </div>

        <HeroVisual open={open.length} providers={new Set(views.map((v) => v.listing.ownerId)).size} rating={avgRating} />
      </div>
      </div>
    </section>
  );
}

function HeroVisual({ open, providers, rating }: { open: number; providers: number; rating: number }) {
  return (
    <div className="relative hidden h-[27rem] lg:block" aria-hidden>
      <div className="absolute inset-x-2 top-0 rotate-[-3deg] rounded-3xl bg-white p-5 text-navy shadow-card">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-navy-50 px-2.5 py-1 text-xs font-bold text-navy">
            <Plane className="h-3.5 w-3.5 text-sky-600" /> Jastip Diaspora
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
          <div className="h-2 w-1/4 rounded-full bg-teal-500" />
        </div>
      </div>
      <div className="absolute inset-x-0 top-[14.5rem] grid w-[84%] grid-cols-3 gap-3">
        <HeroStat value={String(open)} label="listing buka" />
        <HeroStat value={String(providers)} label="penyedia" />
        <HeroStat value={rating ? rating.toFixed(1) : '-'} label="rating" />
      </div>
      <div className="absolute right-0 top-[13.5rem] w-64 rotate-[4deg] rounded-3xl bg-white p-4 text-navy shadow-lift">
        <p className="inline-flex items-center gap-1.5 text-xs font-bold text-navy">
          <ShoppingBag className="h-3.5 w-3.5 text-amber-600" /> Jastip Shopping · Jeddah
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
      <img src={image} alt="" loading="lazy" className="h-16 w-16 shrink-0 rounded-xl object-cover sm:h-28 sm:w-28" />
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
