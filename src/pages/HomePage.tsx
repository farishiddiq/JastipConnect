import * as React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeftRight,
  ArrowRight,
  Boxes,
  MessageCircle,
  Plane,
  PlusCircle,
  Search,
  ShieldCheck,
  ShoppingBag,
  Sofa,
  Star,
  Truck,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/misc';
import { ComingSoonBadge, EmptyState } from '@/components/shared/display';
import { ListingGrid } from '@/components/listings/ListingCard';
import { useDB, useListingViews, usePageMeta } from '@/hooks/useStore';
import { POPULAR_ROUTES, flagFor } from '@/data/locations';
import { cn } from '@/lib/utils';

type Direction = 'SA-ID' | 'ID-SA' | '';

export function HomePage() {
  usePageMeta(undefined, 'Temukan jastip diaspora & personal shopper Saudi ↔ Indonesia. Titip barang di bagasi traveler atau pesan produk dari luar negeri.');
  const navigate = useNavigate();
  const views = useListingViews();
  const { reviews, users } = useDB();
  const [q, setQ] = React.useState('');
  const [dir, setDir] = React.useState<Direction>('SA-ID');
  const [type, setType] = React.useState<'' | 'weight' | 'shopping'>('');

  const open = views.filter((v) => v.status === 'open');
  const soonest = [...open].sort((a, b) => a.listing.departureDate.localeCompare(b.listing.departureDate)).slice(0, 3);
  const newest = [...open]
    .filter((v) => !soonest.includes(v))
    .sort((a, b) => (b.listing.publishedAt ?? '').localeCompare(a.listing.publishedAt ?? ''))
    .slice(0, 6);

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
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-navy text-white">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-teal-500/25 blur-3xl" />
          <div className="absolute -bottom-32 -left-16 h-80 w-80 rounded-full bg-amber-400/10 blur-3xl" />
          <svg className="absolute inset-0 h-full w-full opacity-[0.08]" preserveAspectRatio="none" viewBox="0 0 800 400">
            <path d="M0 320 Q 200 120 420 220 T 800 90" stroke="white" strokeWidth="2" strokeDasharray="8 10" fill="none" />
          </svg>
        </div>
        <div className="container relative grid gap-10 py-10 sm:py-14 lg:grid-cols-[1.15fr_1fr] lg:items-center lg:py-20">
          <div>
            <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-teal-200 ring-1 ring-white/15">
              <span aria-hidden>🇸🇦</span> Arab Saudi <ArrowLeftRight className="h-3.5 w-3.5" /> Indonesia <span aria-hidden>🇮🇩</span>
            </p>
            <h1 className="text-[2rem] font-extrabold leading-[1.1] tracking-tight sm:text-5xl lg:text-[3.4rem]">
              Titip barang, temukan perjalanan, <span className="text-teal-300">terhubung dengan diaspora.</span>
            </h1>
            <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-white/75 sm:text-lg">
              Listing jastip yang rapi dan mudah dicari — bukan lagi tenggelam di grup WhatsApp. Cari bagasi kosong traveler atau pesan oleh-oleh
              langsung dari personal shopper.
            </p>

            <form onSubmit={submit} role="search" className="mt-7 rounded-2xl bg-white p-2 text-navy shadow-lift sm:p-3">
              <div className="flex gap-1 rounded-xl bg-slate-100 p-1" role="radiogroup" aria-label="Arah perjalanan">
                {(
                  [
                    ['SA-ID', 'Saudi → Indonesia'],
                    ['ID-SA', 'Indonesia → Saudi'],
                    ['', 'Semua arah'],
                  ] as const
                ).map(([v, label]) => (
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
                    {label}
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
                    className="h-12 w-full rounded-xl border border-border pl-11 pr-3 text-[15px] placeholder:text-slate-400 focus-visible:border-teal-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/30"
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

            <div className="mt-5 flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-white/60">Rute populer:</span>
              {POPULAR_ROUTES.map((r) => (
                <Link
                  key={`${r.from.city}-${r.to.city}`}
                  to={`/explore?oc=${r.from.countryCode}&ocity=${r.from.city}&dc=${r.to.countryCode}&dcity=${r.to.city}`}
                  className="flex min-h-[36px] items-center gap-1 rounded-full bg-white/10 px-3 text-xs font-semibold text-white ring-1 ring-white/15 transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-300"
                >
                  {r.from.city} → {r.to.city}
                </Link>
              ))}
            </div>
          </div>

          <HeroVisual stats={{ open: open.length, providers: new Set(views.map((v) => v.listing.ownerId)).size, rating: avgRating, users: users.length }} />
        </div>
      </section>

      {/* Categories */}
      <section className="container py-10 sm:py-14" aria-labelledby="cat-title">
        <h2 id="cat-title" className="text-xl font-extrabold text-navy sm:text-2xl">
          Mau titip apa hari ini?
        </h2>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <CategoryCard
            to="/explore?type=weight"
            icon={<Plane />}
            title="Jastip Diaspora"
            description="Titip barang di bagasi traveler, bayar per kg."
            tone="navy"
            count={open.filter((v) => v.listing.type === 'weight').length}
          />
          <CategoryCard
            to="/explore?type=shopping"
            icon={<ShoppingBag />}
            title="Jastip Shopping"
            description="Pesan produk dari luar negeri lewat personal shopper."
            tone="teal"
            count={open.filter((v) => v.listing.type === 'shopping').length}
          />
          <CategoryCard icon={<Sofa />} title="Preloved / Moving Sale" description="Barang bekas diaspora yang pindah negara." soon />
          <CategoryCard icon={<Truck />} title="Ekspedisi & Kargo" description="Bandingkan jasa kirim Saudi ↔ Indonesia." soon />
          <CategoryCard icon={<Users />} title="Komunitas Diaspora" description="Info dan kegiatan diaspora di kotamu." soon />
        </div>
      </section>

      {/* Soonest */}
      <section className="container" aria-labelledby="soon-title">
        <SectionHeader id="soon-title" title="Segera berangkat" subtitle="Batas titip sebentar lagi — jangan sampai ketinggalan." to="/explore?sort=departure" />
        {soonest.length ? (
          <ListingGrid views={soonest} />
        ) : (
          <EmptyState icon={<Plane />} title="Belum ada listing terbuka" description="Jadilah yang pertama memasang perjalanan." action={<Button asChild><Link to="/post">Pasang listing</Link></Button>} />
        )}
      </section>

      {newest.length > 0 && (
        <section className="container mt-12" aria-labelledby="new-title">
          <SectionHeader id="new-title" title="Listing terbaru" subtitle="Baru dipasang oleh traveler dan personal shopper." to="/explore?sort=newest" />
          <ListingGrid views={newest} />
        </section>
      )}

      {/* How it works */}
      <section className="container mt-16" aria-labelledby="how-title">
        <div className="rounded-3xl bg-white p-6 shadow-card ring-1 ring-border sm:p-10">
          <h2 id="how-title" className="text-xl font-extrabold text-navy sm:text-2xl">
            Cara kerja JastipConnect
          </h2>
          <ol className="mt-6 grid gap-6 md:grid-cols-3">
            {[
              { icon: <Search />, title: 'Temukan', text: 'Cari rute, tanggal, atau produk. Filter berdasarkan arah Saudi → Indonesia atau sebaliknya.' },
              { icon: <MessageCircle />, title: 'Ajukan & ngobrol', text: 'Kirim inquiry berisi berat atau produk. Diskusikan detail di inbox yang terhubung ke inquiry.' },
              { icon: <Star />, title: 'Selesai & ulas', text: 'Penyedia menerima, kuota direservasi. Setelah kedua pihak konfirmasi selesai, beri ulasan.' },
            ].map((s, i) => (
              <li key={s.title} className="flex gap-4">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-teal-50 text-teal-600 [&_svg]:h-6 [&_svg]:w-6">{s.icon}</span>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-teal-600">Langkah {i + 1}</p>
                  <h3 className="mt-0.5 font-bold text-navy">{s.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-slate-500">{s.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Trust + CTA */}
      <section className="container mt-6 grid gap-4 lg:grid-cols-2">
        <Card className="flex flex-col gap-4 border-amber-200 bg-amber-50/60 p-6 sm:p-8">
          <ShieldCheck className="h-8 w-8 text-amber-600" aria-hidden />
          <div>
            <h2 className="text-lg font-extrabold text-navy">Aman itu tanggung jawab bersama</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              Aturan maskapai, bea cukai, dan barang terlarang berlaku untuk setiap titipan. Demo ini tidak memverifikasi identitas, barang, maupun
              pembayaran — selalu cek sendiri dan laporkan listing yang mencurigakan.
            </p>
          </div>
          <Button asChild variant="outline" className="self-start">
            <Link to="/safety">Baca panduan keamanan</Link>
          </Button>
        </Card>
        <Card className="relative flex flex-col gap-4 overflow-hidden border-0 bg-gradient-to-br from-teal-500 to-teal-700 p-6 text-white sm:p-8">
          <Boxes className="h-8 w-8 text-teal-100" aria-hidden />
          <div>
            <h2 className="text-lg font-extrabold">Bagasi masih longgar? Jadikan berkah.</h2>
            <p className="mt-2 text-sm leading-relaxed text-teal-50">
              Pasang perjalananmu dalam 2 menit. Atur kuota kg, biaya, dan batas titip — atau buka PO produk dari kotamu.
            </p>
          </div>
          <Button asChild className="self-start bg-white text-teal-700 hover:bg-teal-50">
            <Link to="/post">
              <PlusCircle /> Pasang listing gratis
            </Link>
          </Button>
        </Card>
      </section>
    </>
  );
}

function SectionHeader({ id, title, subtitle, to }: { id: string; title: string; subtitle: string; to: string }) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4">
      <div>
        <h2 id={id} className="text-xl font-extrabold text-navy sm:text-2xl">
          {title}
        </h2>
        <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
      </div>
      <Link to={to} className="flex shrink-0 items-center gap-1 rounded-lg text-sm font-semibold text-teal-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500">
        Lihat semua <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}

function CategoryCard({
  to,
  icon,
  title,
  description,
  tone,
  count,
  soon,
}: {
  to?: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  tone?: 'navy' | 'teal';
  count?: number;
  soon?: boolean;
}) {
  const body = (
    <>
      <span
        className={cn(
          'flex h-11 w-11 items-center justify-center rounded-xl [&_svg]:h-5 [&_svg]:w-5',
          soon ? 'bg-slate-100 text-slate-400' : tone === 'navy' ? 'bg-navy text-white' : 'bg-teal-500 text-white',
        )}
      >
        {icon}
      </span>
      <span className="mt-3 flex items-center gap-2 font-bold text-navy">
        {title}
        {soon && <ComingSoonBadge />}
      </span>
      <span className="mt-1 text-[13px] leading-snug text-slate-500">{description}</span>
      {count !== undefined && <span className="mt-3 text-xs font-semibold text-teal-700">{count} listing terbuka →</span>}
    </>
  );
  if (soon || !to) {
    return (
      <div className="flex flex-col rounded-2xl border border-dashed border-slate-300 bg-white/60 p-4" aria-disabled="true">
        {body}
      </div>
    );
  }
  return (
    <Link
      to={to}
      className="flex flex-col rounded-2xl border border-border bg-white p-4 shadow-card transition-all hover:-translate-y-0.5 hover:border-teal-300 hover:shadow-lift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
    >
      {body}
    </Link>
  );
}

function HeroVisual({ stats }: { stats: { open: number; providers: number; rating: number; users: number } }) {
  return (
    <div className="relative hidden lg:block" aria-hidden>
      <div className="relative mx-auto max-w-md">
        <div className="rotate-[-3deg] rounded-3xl bg-white p-5 text-navy shadow-lift">
          <div className="flex items-center justify-between">
            <span className="rounded-full bg-navy-50 px-2.5 py-1 text-xs font-bold text-navy">✈️ Jastip Diaspora</span>
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">● Buka</span>
          </div>
          <p className="mt-4 text-2xl font-extrabold">
            {flagFor('SA')} Riyadh <span className="text-teal-500">→</span> {flagFor('ID')} Jakarta
          </p>
          <p className="mt-1 text-sm text-slate-500">Sisa 15 kg dari 20 kg · 25 SAR/kg</p>
          <div className="mt-3 h-2 rounded-full bg-slate-100">
            <div className="h-2 w-1/4 rounded-full bg-teal-500" />
          </div>
        </div>
        <div className="absolute -bottom-16 right-0 w-64 rotate-[4deg] rounded-3xl bg-white p-4 text-navy shadow-lift">
          <p className="text-xs font-bold text-teal-700">🛍️ Jastip Shopping · Jeddah</p>
          <div className="mt-3 grid grid-cols-3 gap-2 text-3xl">
            <span className="flex aspect-square items-center justify-center rounded-xl bg-amber-50">🌴</span>
            <span className="flex aspect-square items-center justify-center rounded-xl bg-teal-50">🍫</span>
            <span className="flex aspect-square items-center justify-center rounded-xl bg-rose-50">🧕</span>
          </div>
        </div>
        <div className="mt-28 grid grid-cols-3 gap-3 pr-20">
          <Stat value={String(stats.open)} label="listing buka" />
          <Stat value={String(stats.providers)} label="penyedia" />
          <Stat value={stats.rating ? stats.rating.toFixed(1) : '—'} label="rating rata²" />
        </div>
      </div>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-2xl bg-white/10 p-3 ring-1 ring-white/15">
      <p className="text-2xl font-extrabold">{value}</p>
      <p className="text-xs text-white/70">{label}</p>
    </div>
  );
}
