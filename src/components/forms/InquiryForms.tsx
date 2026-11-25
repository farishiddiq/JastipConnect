import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PRODUCT_CATEGORIES } from '@/data/locations';
import { toast } from 'sonner';
import type { Currency, ShoppingListing, WeightListing } from '@/types';
import { Button } from '@/components/ui/button';
import { Checkbox, Field, Input, Select, Textarea } from '@/components/ui/form';
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ProductThumb } from '@/components/shared/display';
import { useAuth } from '@/components/shared/AccountSwitcher';
import { PENDING_HOLD_HOURS } from '@/lib/availability';
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
  /** Null for guests: they fill the form first and sign up on submit. */
  buyerId: string | null;
}) {
  const navigate = useNavigate();
  const { requireUser } = useAuth();
  const [kg, setKg] = React.useState('');
  const [rows, setRows] = React.useState<Row[]>([newRow()]);
  const [value, setValue] = React.useState('');
  const [ack, setAck] = React.useState(false);
  const [note, setNote] = React.useState('');
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setKg('');
      setRows([newRow()]);
      setValue('');
      setAck(false);
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
    const filled = rows.filter((r) => r.name.trim());
    if (!filled.length) errs.items = 'Tambahkan minimal satu barang.';
    else if (filled.some((r) => r.name.trim().length < 2 || !(Number(r.qty) >= 1))) errs.items = 'Setiap barang perlu nama dan jumlah minimal 1.';
    const valueNum = value.trim() ? Number(value.replace(',', '.')) : undefined;
    if (valueNum !== undefined && !(valueNum >= 0)) errs.value = 'Isi angka yang valid.';
    if (!ack) errs.ack = 'Wajib dicentang sebelum mengirim.';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    const send = (uid: string) => {
      setSubmitting(true);
      const res = createWeightInquiry(uid, listing.id, {
        requestedKg: kgNum,
        items: filled.map((r) => ({ name: r.name, category: r.category, qty: Math.floor(Number(r.qty)) })),
        declaredValue: valueNum,
        prohibitedAck: ack,
        note,
      });
      setSubmitting(false);
      if (!res.ok) return toast.error(res.error);
      toast.success('Request terkirim', { description: `Kuota ditahan ${PENDING_HOLD_HOURS} jam sambil menunggu penyedia.` });
      onOpenChange(false);
      navigate(`/orders/${res.data.inquiry.id}`);
    };
    if (buyerId) return send(buyerId);
    // Guests: keep the form, sign up with a magic link, then send the same request.
    onOpenChange(false);
    requireUser('Satu langkah lagi: masuk dengan email untuk mengirim request Anda.', send);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={submit} noValidate className="flex min-h-0 flex-1 flex-col">
          <DialogHeader>
            <DialogTitle>Request titipan</DialogTitle>
            <DialogDescription>
              Ajukan titipan untuk {listing.origin.city} → {listing.destination.city}. Sisa kuota {formatKg(remaining)}.
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="space-y-4">
            <Field id="inq-kg" label="Perkiraan berat (kg)" required error={errors.kg} hint={`Biaya ${formatMoney(listing.pricePerKg, listing.currency)}/kg`}>
              <Input type="number" inputMode="decimal" min={0.1} step={0.1} max={remaining} value={kg} onChange={(e) => setKg(e.target.value)} placeholder="cth. 3" autoFocus />
            </Field>
            <fieldset>
              <legend className="mb-1.5 text-sm font-semibold text-navy">
                Daftar barang<span className="ml-0.5 text-red-500">*</span>
              </legend>
              <ul className="space-y-2">
                {rows.map((r, idx) => (
                  <li key={r.key} className="grid grid-cols-[1fr_72px_36px] gap-2 rounded-xl bg-slate-50 p-2 sm:grid-cols-[1fr_150px_72px_36px]">
                    <Input
                      aria-label={`Nama barang ${idx + 1}`}
                      id={idx === 0 ? 'inq-item-0' : undefined}
                      value={r.name}
                      onChange={(e) => setRows(rows.map((x) => (x.key === r.key ? { ...x, name: e.target.value } : x)))}
                      placeholder={idx === 0 ? 'cth. Kurma Ajwa 1 kg' : 'Nama barang'}
                      maxLength={60}
                      className="h-10 bg-white"
                    />
                    <Select
                      aria-label={`Jenis barang ${idx + 1}`}
                      value={r.category}
                      onChange={(e) => setRows(rows.map((x) => (x.key === r.key ? { ...x, category: e.target.value } : x)))}
                      className="col-span-3 row-start-2 h-10 bg-white sm:col-span-1 sm:row-start-auto"
                    >
                      {PRODUCT_CATEGORIES.map((c) => (
                        <option key={c}>{c}</option>
                      ))}
                    </Select>
                    <Input
                      aria-label={`Jumlah barang ${idx + 1}`}
                      type="number"
                      inputMode="numeric"
                      min={1}
                      value={r.qty}
                      onChange={(e) => setRows(rows.map((x) => (x.key === r.key ? { ...x, qty: e.target.value } : x)))}
                      className="h-10 bg-white text-center"
                    />
                    <button
                      type="button"
                      onClick={() => setRows(rows.length > 1 ? rows.filter((x) => x.key !== r.key) : [newRow()])}
                      aria-label={`Hapus barang ${idx + 1}`}
                      className="flex h-10 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-white hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
              {rows.length < 8 && (
                <Button size="sm" variant="ghost" className="mt-1" onClick={() => setRows([...rows, newRow()])}>
                  <Plus /> Tambah barang
                </Button>
              )}
              {errors.items && (
                <p role="alert" className="mt-1 text-[13px] font-medium text-red-600">
                  {errors.items}
                </p>
              )}
            </fieldset>
            <Field id="inq-value" label={`Perkiraan nilai barang (${listing.currency})`} error={errors.value} hint="Opsional. Membantu penyedia menilai risiko dan bea cukai.">
              <Input type="number" inputMode="decimal" min={0} value={value} onChange={(e) => setValue(e.target.value)} placeholder="cth. 200" />
            </Field>
            <Field id="inq-note" label="Catatan untuk penyedia" hint="Opsional. Tanpa data pribadi.">
              <Textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} className="min-h-[72px]" />
            </Field>
            <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 text-sm">
              <span className="text-slate-500">Estimasi biaya jastip</span>
              <span className="font-extrabold text-navy">{estimate ? formatMoney(estimate, listing.currency) : '-'}</span>
            </div>
            <div>
              <Checkbox
                checked={ack}
                onChange={(e) => setAck(e.target.checked)}
                label={
                  <>
                    Titipan saya tidak berisi{' '}
                    <Link to="/safety" target="_blank" className="font-semibold text-teal-700 underline">
                      barang terlarang
                    </Link>
                    , dan isinya boleh diperiksa penyedia saat serah terima.
                  </>
                }
              />
              {errors.ack && (
                <p role="alert" className="mt-1 pl-8 text-[13px] font-medium text-red-600">
                  {errors.ack}
                </p>
              )}
            </div>
            <p className="text-xs text-slate-500">
              Kuota langsung ditahan {PENDING_HOLD_HOURS} jam. Berat final ditimbang saat serah terima. Bayar langsung ke penyedia setelah tagihan keluar.
              {!buyerId && ' Anda diminta masuk dengan email saat mengirim.'}
            </p>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Batal
            </Button>
            <Button type="submit" variant="accent" disabled={submitting}>
              {buyerId ? 'Kirim request' : 'Lanjut kirim request'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

type Row = { key: number; name: string; category: string; qty: string };
let rowKey = 0;
const newRow = (): Row => ({ key: ++rowKey, name: '', category: 'Makanan & Camilan', qty: '1' });

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
  buyerId: string | null;
}) {
  const navigate = useNavigate();
  const { requireUser } = useAuth();
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
    const send = (uid: string) => {
      const res = createShoppingInquiry(uid, listing.id, { items, note });
      if (!res.ok) return toast.error(res.error);
      toast.success('Pre-order terkirim', { description: `Stok ditahan ${PENDING_HOLD_HOURS} jam sambil menunggu penyedia.` });
      onSelectionChange({});
      onOpenChange(false);
      navigate(`/orders/${res.data.inquiry.id}`);
    };
    if (buyerId) return send(buyerId);
    onOpenChange(false);
    requireUser('Satu langkah lagi: masuk dengan email untuk mengirim pesanan Anda.', send);
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
              {buyerId ? 'Kirim pesanan' : 'Lanjut kirim pesanan'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
