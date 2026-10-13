import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { Minus, Plus } from 'lucide-react';
import { toast } from 'sonner';
import type { Currency, ShoppingListing, WeightListing } from '@/types';
import { Button } from '@/components/ui/button';
import { Field, Input, Textarea } from '@/components/ui/form';
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ProductThumb } from '@/components/shared/display';
import { createShoppingInquiry, createWeightInquiry } from '@/services/inquiryService';
import { formatKg, formatMoney, formatMoneyGroups, formatProductPrice } from '@/lib/format';
import { round2 } from '@/lib/availability';
import { cn } from '@/lib/utils';

export function WeightInquiryDialog({
  open,
  onOpenChange,
  listing,
  remaining,
  buyerId,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  listing: WeightListing;
  remaining: number;
  buyerId: string;
}) {
  const navigate = useNavigate();
  const [kg, setKg] = React.useState('');
  const [items, setItems] = React.useState('');
  const [note, setNote] = React.useState('');
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setKg('');
      setItems('');
      setNote('');
      setErrors({});
    }
  }, [open]);

  const kgNum = Number(kg.replace(',', '.'));
  const estimate = kgNum > 0 ? round2(kgNum * listing.pricePerKg) : 0;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!kg.trim() || !(kgNum > 0)) errs.kg = 'Isi perkiraan berat lebih dari 0 kg.';
    else if (kgNum > remaining) errs.kg = `Maksimal ${formatKg(remaining)} (sisa kuota).`;
    if (items.trim().length < 3) errs.items = 'Jelaskan barang yang ingin dititipkan.';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setSubmitting(true);
    const res = createWeightInquiry(buyerId, listing.id, { requestedKg: kgNum, itemDescription: items, note });
    setSubmitting(false);
    if (!res.ok) return toast.error(res.error);
    toast.success('Inquiry terkirim', { description: 'Penyedia akan meninjau. Lanjutkan obrolan di inbox.' });
    onOpenChange(false);
    navigate(`/inbox/${res.data.conversationId}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={submit} noValidate className="flex min-h-0 flex-1 flex-col">
          <DialogHeader>
            <DialogTitle>Ajukan Titipan</DialogTitle>
            <DialogDescription>
              Ajukan titipan untuk {listing.origin.city} → {listing.destination.city}. Sisa kuota {formatKg(remaining)}.
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="space-y-4">
            <Field id="inq-kg" label="Perkiraan berat (kg)" required error={errors.kg} hint={`Biaya ${formatMoney(listing.pricePerKg, listing.currency)}/kg`}>
              <Input type="number" inputMode="decimal" min={0.1} step={0.1} max={remaining} value={kg} onChange={(e) => setKg(e.target.value)} placeholder="cth. 3" autoFocus />
            </Field>
            <Field id="inq-items" label="Barang yang dititipkan" required error={errors.items} hint="Sebutkan jenis dan jumlah.">
              <Textarea value={items} onChange={(e) => setItems(e.target.value)} maxLength={500} placeholder="cth. Kurma 2 kg, cokelat 1 kg" />
            </Field>
            <Field id="inq-note" label="Catatan untuk penyedia" hint="Opsional. Tanpa data pribadi.">
              <Textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} className="min-h-[72px]" />
            </Field>
            <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 text-sm">
              <span className="text-slate-500">Estimasi biaya jastip</span>
              <span className="font-extrabold text-navy">{estimate ? formatMoney(estimate, listing.currency) : '-'}</span>
            </div>
            <p className="text-xs text-slate-400">Kuota direservasi setelah penyedia menerima. Pembayaran di luar platform.</p>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Batal
            </Button>
            <Button type="submit" variant="accent" disabled={submitting}>
              Kirim inquiry
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function QuantityStepper({
  value,
  max,
  onChange,
  label,
}: {
  value: number;
  max: number;
  onChange: (v: number) => void;
  label: string;
}) {
  return (
    <div className="flex items-center rounded-xl border border-border bg-white" role="group" aria-label={`Jumlah ${label}`}>
      <button
        type="button"
        onClick={() => onChange(Math.max(0, value - 1))}
        disabled={value <= 0}
        className="flex h-10 w-10 items-center justify-center rounded-l-xl text-navy hover:bg-slate-50 disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal-500"
        aria-label={`Kurangi ${label}`}
      >
        <Minus className="h-4 w-4" />
      </button>
      <input
        type="number"
        inputMode="numeric"
        min={0}
        max={max}
        value={value}
        onChange={(e) => {
          const n = Math.floor(Number(e.target.value));
          onChange(Number.isFinite(n) ? Math.min(max, Math.max(0, n)) : 0);
        }}
        className="h-10 w-10 border-x border-border bg-transparent text-center text-sm font-bold [appearance:textfield] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal-500 [&::-webkit-inner-spin-button]:appearance-none"
        aria-label={`Jumlah ${label}`}
      />
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        className="flex h-10 w-10 items-center justify-center rounded-r-xl text-navy hover:bg-slate-50 disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal-500"
        aria-label={`Tambah ${label}`}
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}

export function selectionTotals(listing: ShoppingListing, selection: Record<string, number>) {
  const totals: Partial<Record<Currency, number>> = {};
  let count = 0;
  let unpriced = 0;
  for (const p of listing.products) {
    const q = selection[p.id] ?? 0;
    if (q <= 0) continue;
    count += q;
    if (typeof p.unitPrice === 'number' && p.unitPrice > 0) {
      const cur = p.currency ?? listing.currency;
      totals[cur] = round2((totals[cur] ?? 0) + q * p.unitPrice);
    } else {
      unpriced += 1;
    }
  }
  return { totals, count, unpriced };
}

export function ShoppingOrderDialog({
  open,
  onOpenChange,
  listing,
  selection,
  onSelectionChange,
  remainingById,
  buyerId,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  listing: ShoppingListing;
  selection: Record<string, number>;
  onSelectionChange: (s: Record<string, number>) => void;
  remainingById: Record<string, number>;
  buyerId: string;
}) {
  const navigate = useNavigate();
  const [note, setNote] = React.useState('');
  const [error, setError] = React.useState<string>();
  React.useEffect(() => {
    if (open) {
      setNote('');
      setError(undefined);
    }
  }, [open]);

  const { totals, count, unpriced } = selectionTotals(listing, selection);
  const available = listing.products.filter((p) => (remainingById[p.id] ?? 0) > 0 || (selection[p.id] ?? 0) > 0);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (count === 0) return setError('Pilih minimal satu produk.');
    const items = Object.entries(selection).map(([productId, quantity]) => ({ productId, quantity }));
    const res = createShoppingInquiry(buyerId, listing.id, { items, note });
    if (!res.ok) return setError(res.error);
    toast.success('Pesanan diajukan', { description: 'Stok baru direservasi setelah penyedia menerima.' });
    onSelectionChange({});
    onOpenChange(false);
    navigate(`/inbox/${res.data.conversationId}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <form onSubmit={submit} noValidate className="flex min-h-0 flex-1 flex-col">
          <DialogHeader>
            <DialogTitle>Tanya / Pesan</DialogTitle>
            <DialogDescription>Periksa pesanan Anda.</DialogDescription>
          </DialogHeader>
          <DialogBody className="space-y-4">
            <ul className="divide-y divide-border rounded-2xl border border-border">
              {available.map((p) => {
                const q = selection[p.id] ?? 0;
                return (
                  <li key={p.id} className={cn('flex items-center gap-3 p-3', q === 0 && 'opacity-70')}>
                    <ProductThumb imageUrl={p.imageUrl} category={p.category} className="h-12 w-12 shrink-0 rounded-xl text-2xl" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-navy">{p.name}</p>
                      <p className="text-xs text-slate-500">
                        {formatProductPrice(p, listing.currency)} · sisa {remainingById[p.id] ?? 0}
                      </p>
                    </div>
                    <QuantityStepper
                      label={p.name}
                      value={q}
                      max={remainingById[p.id] ?? 0}
                      onChange={(v) => onSelectionChange({ ...selection, [p.id]: v })}
                    />
                  </li>
                );
              })}
            </ul>
            <Field id="order-note" label="Catatan (warna, ukuran, varian)" hint="Opsional." error={error}>
              <Textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} className="min-h-[72px]" />
            </Field>
            <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 text-sm">
              <span className="text-slate-500">Estimasi total ({count} item)</span>
              <span className="text-right font-extrabold text-navy">{formatMoneyGroups(totals)}</span>
            </div>
            {unpriced > 0 && (
              <p className="text-[13px] font-medium text-slate-700">Harga {unpriced} produk dikonfirmasi provider lewat chat. Itu bukan bukti pembayaran.</p>
            )}
            <p className="text-xs text-slate-400">
              Belum termasuk ongkir. Pembayaran diatur langsung dengan penyedia.
            </p>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Kembali
            </Button>
            <Button type="submit" variant="accent" disabled={count === 0}>
              Kirim pesanan
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
