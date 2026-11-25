import * as React from 'react';
import { Link } from 'react-router-dom';
import { Check, Crown, Handshake, Layers, Megaphone, Plane, Rocket, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import type { PlanKind } from '@/types';
import { Button } from '@/components/ui/button';
import { Field, Input, Textarea } from '@/components/ui/form';
import { Badge, Card } from '@/components/ui/misc';
import { useCheckout } from '@/components/plans/Checkout';
import { useCurrentUser, usePageMeta, usePlanState } from '@/hooks/useStore';
import { PLANS } from '@/lib/plans';
import { submitPartnerLead } from '@/services/purchaseService';
import { formatDate, formatMoney } from '@/lib/format';
import { cn } from '@/lib/utils';

const ICON: Record<PlanKind, React.ElementType> = { boost: Sparkles, nff_single: Plane, nff_block: Layers, pro: Crown, promoted: Megaphone };

export function PricingPage() {
  usePageMeta('Harga', 'Gratis untuk mulai. Boost trip, slot listing, Jastiper Pro, dan Promoted jastiper untuk yang ingin lebih banyak order.');
  const user = useCurrentUser();
  const plan = usePlanState(user?.id);
  const { startCheckout } = useCheckout();

  return (
    <div className="container py-8 sm:py-14">
      <header className="mx-auto max-w-2xl text-center">
        <Badge tone="teal" className="mx-auto">
          Day 0: semua fitur inti gratis
        </Badge>
        <h1 className="mt-4 text-[2rem] font-bold leading-[1.1] text-navy sm:text-5xl">Gratis untuk mulai. Bayar kalau mau lebih laku.</h1>
        <p className="mt-3 text-[15px] text-slate-600 sm:text-lg">
          Klien selalu gratis. Provider gratis dengan 1 trip aktif dan order tanpa batas. Upgrade hanya kalau Anda sering terbang atau ingin tampil di depan.
        </p>
      </header>

      {user?.phoneVerifiedAt && (plan.pro || plan.promoted || plan.credits > 0) && (
        <Card className="mx-auto mt-8 flex max-w-3xl flex-wrap items-center gap-x-6 gap-y-2 p-4 text-sm">
          <span className="font-bold text-navy">Paket Anda:</span>
          {plan.pro && <span>Pro sampai {formatDate(plan.pro.slice(0, 10))}</span>}
          {plan.promoted && <span>Promoted sampai {formatDate(plan.promoted.slice(0, 10))}</span>}
          {plan.credits > 0 && <span>{plan.credits} slot listing tersisa</span>}
          <Link to="/profile#paket" className="ml-auto font-semibold text-teal-700 hover:underline">
            Riwayat
          </Link>
        </Card>
      )}

      <section className="mx-auto mt-10 grid max-w-6xl gap-4 lg:grid-cols-3" aria-label="Paket utama">
        <Card className="flex flex-col p-6">
          <p className="text-sm font-bold uppercase tracking-wide text-slate-500">Gratis</p>
          <p className="num mt-2 text-4xl font-extrabold text-navy">Rp0</p>
          <p className="mt-1 text-sm text-slate-500">Untuk klien dan provider baru</p>
          <ul className="mt-5 flex-1 space-y-2 text-sm text-slate-700">
            {['1 trip aktif sekaligus', 'Order tanpa batas per trip', 'Link WhatsApp + kartu trip', 'Order sheet, serah terima, payment tracker', 'Rating dan laporan'].map((p) => (
              <Perk key={p}>{p}</Perk>
            ))}
          </ul>
          <Button asChild variant="outline" className="mt-6">
            <Link to="/post">Pasang trip gratis</Link>
          </Button>
        </Card>
        <PlanCard kind="pro" highlight onBuy={() => startCheckout('pro')} active={!!plan.pro} />
        <PlanCard kind="promoted" onBuy={() => startCheckout('promoted')} active={!!plan.promoted} />
      </section>

      <section className="mx-auto mt-10 max-w-6xl" aria-labelledby="per-listing">
        <h2 id="per-listing" className="text-xl font-bold text-navy">
          Bayar per listing
        </h2>
        <p className="mt-1 text-sm text-slate-500">Untuk yang jarang terbang (non-frequent flyer), tanpa langganan.</p>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <PlanCard kind="boost" compact onBuy={() => startCheckout('boost')} />
          <PlanCard kind="nff_single" compact onBuy={() => startCheckout('nff_single')} />
          <PlanCard kind="nff_block" compact onBuy={() => startCheckout('nff_block')} badge="Hemat Rp50.000" />
        </div>
      </section>

      <PartnerSection />

      <p className="mx-auto mt-10 max-w-2xl text-center text-xs text-slate-400">
        Mode demo: checkout disimulasikan dan tidak ada uang yang ditagih. Harga dalam Rupiah, sudah termasuk pajak bila berlaku. Lihat{' '}
        <Link to="/syarat#berbayar" className="underline">
          ketentuan layanan berbayar
        </Link>
        .
      </p>
    </div>
  );
}

function Perk({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <Check className="mt-0.5 h-4 w-4 shrink-0 text-teal-600" /> {children}
    </li>
  );
}

function PlanCard({ kind, onBuy, highlight, compact, active, badge }: { kind: PlanKind; onBuy: () => void; highlight?: boolean; compact?: boolean; active?: boolean; badge?: string }) {
  const p = PLANS[kind];
  const Icon = ICON[kind];
  return (
    <Card className={cn('relative flex flex-col p-6', highlight && 'bg-navy text-white ring-2 ring-teal-400')}>
      {(badge || highlight) && (
        <span className={cn('absolute right-5 top-5 rounded-full px-2.5 py-0.5 text-xs font-bold', highlight ? 'bg-teal-400 text-deep' : 'bg-amber-100 text-amber-800')}>
          {badge ?? 'Paling populer'}
        </span>
      )}
      <span className={cn('flex h-10 w-10 items-center justify-center rounded-xl', highlight ? 'bg-white/10 text-teal-300' : 'bg-teal-50 text-teal-700')}>
        <Icon className="h-5 w-5" />
      </span>
      <p className={cn('mt-4 font-bold', highlight ? 'text-white' : 'text-navy')}>{p.name}</p>
      <p className={cn('num mt-1 font-extrabold', compact ? 'text-2xl' : 'text-4xl', highlight ? 'text-white' : 'text-navy')}>
        {formatMoney(p.priceIdr, 'IDR')}
        <span className={cn('ml-1 text-sm font-medium', highlight ? 'text-white/70' : 'text-slate-500')}>{p.unit}</span>
      </p>
      <p className={cn('mt-1 text-sm', highlight ? 'text-white/80' : 'text-slate-500')}>{p.summary}</p>
      <ul className={cn('mt-5 flex-1 space-y-2 text-sm', highlight ? 'text-white/90 [&_svg]:text-teal-300' : 'text-slate-700')}>
        {p.perks.map((x) => (
          <Perk key={x}>{x}</Perk>
        ))}
      </ul>
      <Button variant={highlight ? 'accent' : 'default'} className="mt-6" onClick={onBuy}>
        <Rocket /> {active ? 'Perpanjang' : `Pilih ${p.name}`}
      </Button>
    </Card>
  );
}

function PartnerSection() {
  const user = useCurrentUser();
  const [form, setForm] = React.useState({ name: user?.displayName ?? '', brand: '', contact: user?.email ?? '', message: '' });
  const [sent, setSent] = React.useState(false);
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const r = submitPartnerLead({ ...form, userId: user?.id });
    if (!r.ok) return toast.error(r.error);
    setSent(true);
    toast.success('Terima kasih. Tim kami akan menghubungi Anda.');
  };
  return (
    <section id="partner" className="mx-auto mt-14 grid max-w-6xl gap-8 rounded-3xl bg-slate-100 p-6 sm:p-10 lg:grid-cols-2" aria-labelledby="partner-title">
      <div>
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-teal-700">
          <Handshake className="h-5 w-5" />
        </span>
        <h2 id="partner-title" className="mt-4 text-2xl font-bold text-navy sm:text-3xl">
          Brand partnership
        </h2>
        <p className="mt-2 text-[15px] text-slate-600">
          Punya produk yang dicari diaspora, toko oleh-oleh, maskapai, atau layanan pengiriman? Kami bantu menjangkau jastiper dan klien di koridor Saudi dan Australia ke Indonesia.
        </p>
        <p className="mt-4 text-sm font-bold text-navy">Harga: negosiasi</p>
      </div>
      {sent ? (
        <Card className="flex flex-col items-center justify-center p-8 text-center">
          <Check className="h-10 w-10 text-teal-600" />
          <p className="mt-2 font-bold text-navy">Pengajuan terkirim</p>
          <p className="text-sm text-slate-500">Kami balas dalam 2 hari kerja.</p>
        </Card>
      ) : (
        <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2" noValidate>
          <Field id="pl-name" label="Nama" required>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field id="pl-brand" label="Brand / perusahaan" required>
            <Input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} />
          </Field>
          <Field id="pl-contact" label="Email atau WhatsApp" required className="sm:col-span-2">
            <Input value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} />
          </Field>
          <Field id="pl-msg" label="Rencana kerja sama" required className="sm:col-span-2">
            <Textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} maxLength={800} />
          </Field>
          <Button type="submit" variant="default" className="sm:col-span-2 sm:w-fit">
            Ajukan kerja sama
          </Button>
        </form>
      )}
    </section>
  );
}
