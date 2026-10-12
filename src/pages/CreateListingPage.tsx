import * as React from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowRight, Check, Plane, ShoppingBag } from 'lucide-react';
import type { ListingType } from '@/types';
import { RequireUser } from '@/components/layout/Guards';
import { ListingWizard } from '@/components/forms/ListingWizard';
import { ComingSoonBadge, PageHeader } from '@/components/shared/display';
import { usePageMeta } from '@/hooks/useStore';
import { emptyForm } from '@/lib/listingForm';
import { cn } from '@/lib/utils';

export function CreateListingPage() {
  usePageMeta('Pasang listing', 'Pasang perjalanan jastip bagasi atau buka PO belanja dari luar negeri.');
  const [params, setParams] = useSearchParams();
  const t = params.get('type');
  const type: ListingType | null = t === 'weight' || t === 'shopping' ? t : null;

  return (
    <RequireUser reason="Pilih akun demo untuk memasang listing.">
      {(user) => (
        <div className="container py-6 sm:py-10">
          {!type ? (
            <TypeChooser onPick={(tp) => setParams({ type: tp })} />
          ) : (
            <>
              <PageHeader title={type === 'weight' ? 'Pasang Jastip Bagasi' : 'Pasang Jastip Belanja'} description="Simpan draf kapan saja." className="mx-auto max-w-3xl" />
              <ListingWizard key={type} mode="create" initial={emptyForm(type)} userId={user.id} onBackToType={() => setParams({})} />
            </>
          )}
        </div>
      )}
    </RequireUser>
  );
}

function TypeChooser({ onPick }: { onPick: (t: ListingType) => void }) {
  const options: { type: ListingType; icon: React.ReactNode; title: string; text: string; points: string[]; tone: string }[] = [
    {
      type: 'weight',
      icon: <Plane />,
      title: 'Jastip Bagasi',
      text: 'Tawarkan sisa bagasi. Bayar per kg.',
      points: ['Atur total kg & biaya/kg', 'Cocok untuk traveler'],
      tone: 'bg-navy text-white',
    },
    {
      type: 'shopping',
      icon: <ShoppingBag />,
      title: 'Jastip Belanja',
      text: 'Buka PO produk dari kotamu.',
      points: ['Katalog banyak produk dengan stok', 'Stok direservasi saat pesanan diterima'],
      tone: 'bg-teal-500 text-deep',
    },
  ];
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Pasang listing" description="Pilih jenis listing." />
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
