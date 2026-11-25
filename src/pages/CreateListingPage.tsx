import * as React from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, Check, Info, Plane, ShoppingBag } from 'lucide-react';
import type { ListingType } from '@/types';
import { RequireProvider } from '@/components/layout/Guards';
import { Button } from '@/components/ui/button';
import { useCheckout } from '@/components/plans/Checkout';
import { useDB } from '@/hooks/useStore';
import { publishAllowance } from '@/services/listingService';
import { ListingWizard } from '@/components/forms/ListingWizard';
import { ComingSoonBadge, PageHeader } from '@/components/shared/display';
import { usePageMeta } from '@/hooks/useStore';
import { emptyForm } from '@/lib/listingForm';
import { cn } from '@/lib/utils';

export function CreateListingPage() {
  usePageMeta('Pasang trip', 'Pasang trip jastip bagasi atau buka pre-order Jastip Barang dari luar negeri.');
  const [params, setParams] = useSearchParams();
  const t = params.get('type');
  const type: ListingType | null = t === 'weight' || t === 'shopping' ? t : null;

  return (
    <RequireProvider reason="Provider wajib masuk dan verifikasi WhatsApp sebelum posting.">
      {(user) => (
        <div className="container py-6 sm:py-10">
          <AllowanceBanner userId={user.id} />
          {!type ? (
            <TypeChooser onPick={(tp) => setParams({ type: tp })} />
          ) : (
            <>
              <PageHeader title={type === 'weight' ? 'Pasang Jastip Bagasi' : 'Pasang Jastip Barang'} description="Simpan draf kapan saja." className="mx-auto max-w-3xl" />
              <ListingWizard key={type} mode="create" initial={emptyForm(type)} userId={user.id} onBackToType={() => setParams({})} />
            </>
          )}
        </div>
      )}
    </RequireProvider>
  );
}

function AllowanceBanner({ userId }: { userId: string }) {
  useDB(); // re-render when listings or purchases change
  const { startCheckout } = useCheckout();
  const a = publishAllowance(userId);
  if (a.ok && a.pro) return null;
  if (a.ok && !a.usesCredit)
    return (
      <p className="mx-auto mb-6 flex max-w-3xl items-start gap-2 rounded-2xl bg-teal-50 p-4 text-sm text-teal-900">
        <Info className="mt-0.5 h-4 w-4 shrink-0" /> Akun gratis: 1 trip aktif sekaligus, order tanpa batas. Trip ini memakai slot gratis Anda.
      </p>
    );
  if (a.ok)
    return (
      <p className="mx-auto mb-6 flex max-w-3xl items-start gap-2 rounded-2xl bg-teal-50 p-4 text-sm text-teal-900">
        <Info className="mt-0.5 h-4 w-4 shrink-0" /> Slot gratis sudah terpakai. Trip ini akan memakai 1 dari {a.credits} slot listing berbayar Anda.
      </p>
    );
  return (
    <div className="mx-auto mb-6 max-w-3xl rounded-2xl bg-amber-50 p-4 text-sm text-amber-900 ring-1 ring-amber-200">
      <p className="flex items-start gap-2 font-semibold">
        <Info className="mt-0.5 h-4 w-4 shrink-0" /> Anda sudah punya 1 trip aktif (batas akun gratis).
      </p>
      <p className="mt-1 pl-6">Anda tetap bisa menyusun draf. Untuk menerbitkan, tutup trip lain atau pilih salah satu:</p>
      <div className="mt-3 flex flex-wrap gap-2 pl-6">
        <Button size="sm" variant="accent" onClick={() => startCheckout('nff_single')}>
          Slot listing Rp50.000
        </Button>
        <Button size="sm" variant="outline" onClick={() => startCheckout('pro')}>
          Jastiper Pro Rp99.000/bulan
        </Button>
        <Button asChild size="sm" variant="ghost">
          <Link to="/my-listings">Kelola trip</Link>
        </Button>
      </div>
    </div>
  );
}

function TypeChooser({ onPick }: { onPick: (t: ListingType) => void }) {
  const options: { type: ListingType; icon: React.ReactNode; title: string; text: string; points: string[]; tone: string }[] = [
    {
      type: 'weight',
      icon: <Plane />,
      title: 'Jastip Bagasi',
      text: 'Pulang kampung atau balik ke perantauan? Tawarkan sisa bagasi Anda, dibayar per kg.',
      points: ['Kuota kg live dengan hold otomatis', 'Link WhatsApp + kartu trip siap share', 'Paling dicari diaspora'],
      tone: 'bg-navy text-white',
    },
    {
      type: 'shopping',
      icon: <ShoppingBag />,
      title: 'Jastip Barang',
      text: 'Buka pre-order produk dari kota Anda.',
      points: ['Katalog banyak produk dengan stok', 'Stok ditahan saat pesanan masuk'],
      tone: 'bg-teal-500 text-deep',
    },
  ];
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Pasang trip" description="Pilih jenis listing. Jastip Bagasi paling cocok untuk diaspora yang sering pulang." />
      <div className="grid gap-4 sm:grid-cols-2">
        {options.map((o) => (
          <button
            key={o.type}
            type="button"
            onClick={() => onPick(o.type)}
            className="group flex flex-col rounded-3xl border border-border bg-white p-6 text-left shadow-card transition-all hover:-translate-y-0.5 hover:border-teal-300 hover:shadow-lift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
          >
            <span className={cn('flex h-12 w-12 items-center justify-center rounded-2xl [&_svg]:h-6 [&_svg]:w-6', o.tone)}>{o.icon}</span>
            <span className="mt-4 text-lg font-extrabold text-navy">{o.title}</span>
            <span className="mt-1 text-sm text-slate-500">{o.text}</span>
            <ul className="mt-4 space-y-1.5">
              {o.points.map((p) => (
                <li key={p} className="flex items-start gap-2 text-[13px] text-slate-600">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-teal-500" /> {p}
                </li>
              ))}
            </ul>
            <span className="mt-5 flex items-center gap-1 text-sm font-bold text-teal-700">
              Mulai <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </span>
          </button>
        ))}
      </div>
      <div className="mt-6 rounded-2xl border border-dashed border-slate-300 p-4">
        <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-500">
          Preloved / Moving Sale · Ekspedisi · Komunitas <ComingSoonBadge />
        </p>
        <p className="mt-1 text-xs text-slate-400">Belum tersedia.</p>
      </div>
    </div>
  );
}
