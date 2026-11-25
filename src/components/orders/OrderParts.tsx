import * as React from 'react';
import { Link } from 'react-router-dom';
import { Check, CheckCircle2, Clock, CreditCard, PackageCheck, Plane, Receipt, Scale, Star, Truck, Upload, X, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import type { Currency, Inquiry, InquiryStatus, Listing, User } from '@/types';
import { Button } from '@/components/ui/button';
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field, Input, Select, Textarea } from '@/components/ui/form';
import { StarInput, StarRating } from '@/components/shared/display';
import { PhotoInput } from '@/components/shared/PhotoInput';
import { ReportButton } from '@/components/shared/ReportDialog';
import { useConfirm } from '@/components/shared/ConfirmProvider';
import {
  acceptInquiry,
  cancelInquiry,
  confirmReceived,
  declineInquiry,
  markDelivered,
  markPaid,
  markShipped,
  recordHandover,
  uploadPaymentProof,
} from '@/services/inquiryService';
import { createReview } from '@/services/moderationService';
import { useDB } from '@/hooks/useStore';
import { inquiryTotals, isHoldActive, orderKg, remainingKg, remainingQty, round2 } from '@/lib/availability';
import { formatDateTime, formatKg, formatMoney, formatMoneyGroups } from '@/lib/format';
import { cn } from '@/lib/utils';

/* ---------- Timeline ---------- */

const STEPS: { key: InquiryStatus; label: string; icon: React.ElementType }[] = [
  { key: 'pending', label: 'Request', icon: Clock },
  { key: 'accepted', label: 'Diterima', icon: Check },
  { key: 'handed_over', label: 'Serah terima', icon: Scale },
  { key: 'shipped', label: 'Dikirim', icon: Plane },
  { key: 'delivered', label: 'Sampai', icon: Truck },
  { key: 'completed', label: 'Selesai', icon: PackageCheck },
];
const ORDER = STEPS.map((s) => s.key);

export function stageIndex(status: InquiryStatus): number {
  const i = ORDER.indexOf(status);
  return i >= 0 ? i : -1;
}

function stepTime(i: Inquiry, key: InquiryStatus): string | undefined {
  return {
    pending: i.createdAt,
    accepted: i.acceptedAt,
    handed_over: i.handover?.at,
    shipped: i.shippedAt,
    delivered: i.deliveredAt,
    completed: i.completedAt,
  }[key as 'pending'];
}

export function OrderTimeline({ inquiry, compact }: { inquiry: Inquiry; compact?: boolean }) {
  const stopped = stageIndex(inquiry.status) < 0;
  const current = stopped ? (inquiry.acceptedAt ? 1 : 0) : stageIndex(inquiry.status);
  return (
    <ol className={cn('grid grid-cols-6 gap-1', compact && 'gap-0.5')} aria-label="Tahapan order">
      {STEPS.map((s, idx) => {
        const done = idx < current || (idx === current && inquiry.status === 'completed');
        const active = idx === current && !stopped && inquiry.status !== 'completed';
        const at = stepTime(inquiry, s.key);
        return (
          <li key={s.key} className="flex min-w-0 flex-col items-center text-center" aria-current={active ? 'step' : undefined}>
            <span className="relative flex w-full items-center">
              <span className={cn('h-0.5 flex-1', idx === 0 ? 'bg-transparent' : idx <= current && !stopped ? 'bg-teal-500' : 'bg-slate-200')} />
              <span
                className={cn(
                  'flex shrink-0 items-center justify-center rounded-full transition-colors',
                  compact ? 'h-6 w-6 [&_svg]:h-3 [&_svg]:w-3' : 'h-9 w-9 [&_svg]:h-4 [&_svg]:w-4',
                  done ? 'bg-teal-500 text-deep' : active ? 'bg-navy text-white ring-4 ring-teal-100' : 'bg-slate-100 text-slate-400',
                  stopped && idx === current && 'bg-slate-300 text-white ring-0',
                )}
              >
                {done ? <Check /> : <s.icon />}
              </span>
              <span className={cn('h-0.5 flex-1', idx === STEPS.length - 1 ? 'bg-transparent' : idx < current && !stopped ? 'bg-teal-500' : 'bg-slate-200')} />
            </span>
            {!compact && (
              <>
                <span className={cn('mt-1.5 text-[11px] font-semibold leading-tight sm:text-xs', active || done ? 'text-navy' : 'text-slate-400')}>{s.label}</span>
                {at && idx <= current && <span className="hidden text-[10px] text-slate-400 sm:block">{formatDateTime(at)}</span>}
              </>
            )}
          </li>
        );
      })}
    </ol>
  );
}

/** "Hold 18 jam lagi" for pending requests. */
export function HoldCountdown({ inquiry, className }: { inquiry: Inquiry; className?: string }) {
  const [, tick] = React.useReducer((n: number) => n + 1, 0);
  React.useEffect(() => {
    const t = setInterval(tick, 60_000);
    return () => clearInterval(t);
  }, []);
  if (inquiry.status !== 'pending' || !inquiry.holdExpiresAt) return null;
  const ms = new Date(inquiry.holdExpiresAt).getTime() - Date.now();
  if (!isHoldActive(inquiry) || ms <= 0) return <span className={cn('text-xs font-semibold text-slate-500', className)}>Hold habis</span>;
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return (
    <span className={cn('inline-flex items-center gap-1 text-xs font-semibold text-amber-700', className)}>
      <Clock className="h-3.5 w-3.5" /> Hold {h > 0 ? `${h} jam ` : ''}
      {m} mnt lagi
    </span>
  );
}

/* ---------- Summary ---------- */

export function OrderItems({ inquiry, listing }: { inquiry: Inquiry; listing?: Listing }) {
  if (listing?.type === 'weight') {
    return (
      <div className="space-y-1 text-sm text-slate-600">
        <p>
          <span className="font-semibold text-navy">{formatKg(inquiry.requestedKg ?? 0)}</span> diminta
          {inquiry.handover?.weightKg !== undefined && (
            <>
              {' '}· <span className="font-semibold text-navy">{formatKg(inquiry.handover.weightKg)}</span> hasil timbang
            </>
          )}
          {' '}· {formatMoney(listing.pricePerKg, listing.currency)}/kg
        </p>
        {inquiry.declaredItems?.length ? (
          <ul className="divide-y divide-border rounded-xl border border-border bg-white">
            {inquiry.declaredItems.map((x, i) => (
              <li key={i} className="flex items-center justify-between gap-2 px-3 py-2">
                <span className="min-w-0">
                  <span className="block truncate font-medium text-navy">{x.name}</span>
                  <span className="block text-xs text-slate-500">{x.category}</span>
                </span>
                <span className="num shrink-0 font-semibold text-navy">×{x.qty}</span>
              </li>
            ))}
          </ul>
        ) : (
          inquiry.itemDescription && <p>Barang: {inquiry.itemDescription}</p>
        )}
        {(inquiry.declaredValue !== undefined || inquiry.prohibitedAck) && (
          <p className="flex flex-wrap gap-x-3 text-xs text-slate-500">
            {inquiry.declaredValue !== undefined && <span>Perkiraan nilai {formatMoney(inquiry.declaredValue, listing.currency)}</span>}
            {inquiry.prohibitedAck && <span className="font-semibold text-emerald-700">Klien menyatakan bebas barang terlarang</span>}
          </p>
        )}
        {inquiry.note && <p className="text-slate-500">Catatan: {inquiry.note}</p>}
      </div>
    );
  }
  return (
    <div className="text-sm text-slate-600">
      <ul className="space-y-0.5">
        {(inquiry.items ?? []).map((line) => {
          const p = listing?.type === 'shopping' ? listing.products.find((x) => x.id === line.productId) : undefined;
          return (
            <li key={line.productId} className="flex justify-between gap-2">
              <span className="truncate">
                {p?.name ?? 'Produk dihapus'} × {line.quantity}
              </span>
              <span className="num shrink-0">
                {typeof line.unitPriceSnapshot === 'number' ? formatMoney(line.quantity * line.unitPriceSnapshot, p?.currency ?? listing?.currency ?? 'SAR') : 'Tanya harga'}
              </span>
            </li>
          );
        })}
      </ul>
      {inquiry.note && <p className="mt-1 text-slate-500">Catatan: {inquiry.note}</p>}
    </div>
  );
}

/* ---------- Actions ---------- */

type Role = 'buyer' | 'provider';

export function OrderActions({ inquiry, listing, me, other, layout = 'stack' }: { inquiry: Inquiry; listing?: Listing; me: User; other?: User; layout?: 'stack' | 'inline' }) {
  const confirm = useConfirm();
  const role: Role = inquiry.providerId === me.id ? 'provider' : 'buyer';
  const { inquiries, reviews } = useDB();
  const [dialog, setDialog] = React.useState<'handover' | 'proof' | 'review' | 'decline' | null>(null);
  // Two-way ratings: what I gave, and what the other side gave me.
  const mine = role === 'buyer' ? 'to_provider' : 'to_client';
  const myReview = reviews.find((r) => r.inquiryId === inquiry.id && (r.direction ?? 'to_provider') === mine);
  const theirReview = reviews.find((r) => r.inquiryId === inquiry.id && (r.direction ?? 'to_provider') !== mine);
  const canRate = ['delivered', 'completed'].includes(inquiry.status) && !myReview;
  const pay = inquiry.payment?.status ?? 'unpaid';
  const hasBill = typeof inquiry.amountDue === 'number';

  let capacity: { ok: boolean; text: string } | null = null;
  if (listing && inquiry.status === 'pending' && role === 'provider') {
    const others = inquiries.filter((i) => i.id !== inquiry.id);
    if (listing.type === 'weight') {
      const rem = remainingKg(listing, others);
      const ok = (inquiry.requestedKg ?? 0) <= rem;
      capacity = { ok, text: ok ? `Kuota cukup (sisa ${formatKg(rem)}).` : `Sisa kuota hanya ${formatKg(rem)}.` };
    } else {
      const short = (inquiry.items ?? []).filter((line) => {
        const p = listing.products.find((x) => x.id === line.productId);
        return !p || line.quantity > remainingQty(listing.id, p, others);
      });
      capacity = short.length ? { ok: false, text: `Stok tidak cukup untuk ${short.length} produk.` } : { ok: true, text: 'Stok cukup.' };
    }
  }

  const run = (r: { ok: boolean; error?: string }, msg: string) => (r.ok ? toast.success(msg) : toast.error((r as { error: string }).error));

  const onAccept = async () => {
    const what = listing?.type === 'weight' ? formatKg(inquiry.requestedKg ?? 0) : 'Stok produk';
    if (!(await confirm({ title: 'Terima request?', description: `${what} ditahan untuk ${other?.displayName ?? 'klien'} sampai batas drop-off.`, confirmLabel: 'Terima' }))) return;
    run(acceptInquiry(inquiry.id, me.id), 'Request diterima');
  };
  const onCancel = async () => {
    if (!(await confirm({ title: 'Batalkan request?', description: 'Penyedia akan diberi tahu dan kuota dilepas.', confirmLabel: 'Batalkan', destructive: true }))) return;
    run(cancelInquiry(inquiry.id, me.id), 'Request dibatalkan');
  };
  // One tap, no dialog: a provider at the airport marks it and moves on.
  const onShipped = () => {
    const r = markShipped(inquiry.id, me.id);
    if (!r.ok) return toast.error(r.error);
    toast.success('Ditandai dikirim', { description: pay !== 'paid' ? 'Catatan: pembayaran belum ditandai lunas.' : undefined });
  };
  const onDelivered = () => run(markDelivered(inquiry.id, me.id), 'Ditandai sampai');
  const onReceived = async () => {
    if (!(await confirm({ title: 'Titipan sudah diterima?', description: 'Order akan selesai dan Anda bisa memberi rating.', confirmLabel: 'Ya, sudah diterima' }))) return;
    const r = confirmReceived(inquiry.id, me.id);
    if (!r.ok) return toast.error(r.error);
    toast.success('Order selesai');
    setDialog('review');
  };

  const buttons: React.ReactNode[] = [];
  if (role === 'provider') {
    if (inquiry.status === 'pending') {
      buttons.push(
        <Button key="acc" variant="accent" onClick={onAccept} disabled={capacity?.ok === false}>
          <Check /> Terima
        </Button>,
        <Button key="dec" variant="destructive-outline" onClick={() => setDialog('decline')}>
          <X /> Tolak
        </Button>,
      );
    }
    if (inquiry.status === 'accepted')
      buttons.push(
        <Button key="ho" variant="accent" onClick={() => setDialog('handover')}>
          <Scale /> Catat serah terima
        </Button>,
      );
    if (hasBill && pay !== 'paid' && ['handed_over', 'shipped', 'delivered'].includes(inquiry.status))
      buttons.push(
        <Button key="paid" variant={pay === 'proof_uploaded' ? 'accent' : 'outline'} onClick={() => run(markPaid(inquiry.id, me.id), 'Ditandai lunas')}>
          <CreditCard /> Tandai lunas
        </Button>,
      );
    if (inquiry.status === 'handed_over')
      buttons.push(
        <Button key="ship" variant="default" onClick={onShipped}>
          <Plane /> Dikirim
        </Button>,
      );
    if (inquiry.status === 'shipped')
      buttons.push(
        <Button key="del" variant="default" onClick={onDelivered}>
          <Truck /> Sudah sampai
        </Button>,
      );
    if (canRate)
      buttons.push(
        <Button key="rate-c" variant="outline" onClick={() => setDialog('review')}>
          <Star /> Nilai klien
        </Button>,
      );
  } else {
    if (hasBill && pay !== 'paid' && ['handed_over', 'shipped', 'delivered'].includes(inquiry.status))
      buttons.push(
        <Button key="proof" variant={pay === 'unpaid' ? 'accent' : 'outline'} onClick={() => setDialog('proof')}>
          <Upload /> {pay === 'proof_uploaded' ? 'Ganti bukti bayar' : 'Unggah bukti bayar'}
        </Button>,
      );
    if (inquiry.status === 'delivered' || inquiry.status === 'shipped')
      buttons.push(
        <Button key="recv" variant={inquiry.status === 'delivered' ? 'accent' : 'outline'} onClick={onReceived}>
          <PackageCheck /> Sudah diterima
        </Button>,
      );
    if (inquiry.status === 'completed' && canRate)
      buttons.push(
        <Button key="rate" variant="accent" onClick={() => setDialog('review')}>
          <Star /> Beri rating
        </Button>,
      );
    if (inquiry.status === 'pending' || inquiry.status === 'accepted')
      buttons.push(
        <Button key="cancel" variant="ghost" className="text-red-600 hover:bg-red-50" onClick={onCancel}>
          Batalkan
        </Button>,
      );
  }

  return (
    <div className="space-y-3">
      {capacity && (
        <p className={cn('flex items-center gap-1.5 text-xs font-semibold', capacity.ok ? 'text-emerald-700' : 'text-red-600')}>
          {capacity.ok ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />} {capacity.text}
        </p>
      )}
      {buttons.length > 0 && <div className={cn('flex flex-wrap gap-2', layout === 'stack' && '[&>button]:flex-1 sm:[&>button]:flex-none')}>{buttons}</div>}
      {(myReview || theirReview) && (
        <div className="grid gap-2 sm:grid-cols-2">
          {myReview && <RatingChip label={role === 'buyer' ? 'Rating Anda untuk penyedia' : 'Rating Anda untuk klien'} value={myReview.rating} />}
          {theirReview && <RatingChip label={role === 'buyer' ? 'Rating penyedia untuk Anda' : 'Rating klien untuk Anda'} value={theirReview.rating} />}
        </div>
      )}
      {inquiry.status === 'completed' && !theirReview && <p className="text-xs text-slate-500">Menunggu rating dari {role === 'buyer' ? 'penyedia' : 'klien'}.</p>}
      {other && (
        <div className="flex justify-end">
          <ReportButton targetType="user" targetId={other.id} targetLabel={other.displayName} />
        </div>
      )}

      {listing && (
        <HandoverDialog open={dialog === 'handover'} onOpenChange={(o) => setDialog(o ? 'handover' : null)} inquiry={inquiry} listing={listing} actorId={me.id} />
      )}
      <PaymentProofDialog open={dialog === 'proof'} onOpenChange={(o) => setDialog(o ? 'proof' : null)} inquiry={inquiry} actorId={me.id} />
      <ReviewDialog
        open={dialog === 'review'}
        onOpenChange={(o) => setDialog(o ? 'review' : null)}
        inquiry={inquiry}
        actorId={me.id}
        targetName={other?.displayName ?? (role === 'buyer' ? 'penyedia' : 'klien')}
        aboutClient={role === 'provider'}
      />
      <DeclineDialog open={dialog === 'decline'} onOpenChange={(o) => setDialog(o ? 'decline' : null)} inquiry={inquiry} actorId={me.id} />
    </div>
  );
}

/* ---------- Payment card ---------- */

export function PaymentCard({ inquiry, listing, role }: { inquiry: Inquiry; listing?: Listing; role: Role }) {
  const pay = inquiry.payment?.status ?? 'unpaid';
  const totals = inquiryTotals(inquiry, listing);
  const final = typeof inquiry.amountDue === 'number';
  return (
    <div className="rounded-2xl border border-border bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-500">
            <Receipt className="h-4 w-4" /> {final ? 'Jumlah tagihan' : 'Estimasi biaya'}
          </p>
          <p className="num mt-0.5 text-2xl font-extrabold text-navy">{formatMoneyGroups(totals)}</p>
          {!final && <p className="text-xs text-slate-500">Final setelah ditimbang saat serah terima.</p>}
        </div>
        {final && (
          <span
            className={cn(
              'rounded-full px-2.5 py-1 text-xs font-bold',
              pay === 'paid' ? 'bg-emerald-50 text-emerald-700' : pay === 'proof_uploaded' ? 'bg-teal-50 text-teal-800' : 'bg-amber-50 text-amber-800',
            )}
          >
            {pay === 'paid' ? 'Lunas' : pay === 'proof_uploaded' ? 'Bukti diunggah' : 'Belum bayar'}
          </span>
        )}
      </div>
      {inquiry.payment?.proofUrl && (
        <a href={inquiry.payment.proofUrl} target="_blank" rel="noreferrer" className="mt-3 flex items-center gap-3 rounded-xl bg-slate-50 p-2 text-sm hover:bg-slate-100">
          <img src={inquiry.payment.proofUrl} alt="Bukti bayar" className="h-12 w-12 rounded-lg object-cover" />
          <span className="min-w-0">
            <span className="block font-semibold text-navy">Bukti bayar</span>
            <span className="block text-xs text-slate-500">{inquiry.payment.proofAt ? formatDateTime(inquiry.payment.proofAt) : ''}</span>
          </span>
        </a>
      )}
      {inquiry.payment?.paidAt && <p className="mt-2 text-xs text-slate-500">Dikonfirmasi lunas {formatDateTime(inquiry.payment.paidAt)}</p>}
      <p className="mt-3 text-[11px] leading-snug text-slate-400">
        {role === 'buyer'
          ? 'Bayar langsung ke penyedia sesuai kesepakatan, lalu unggah bukti. JastipConnect hanya mencatat, tidak memproses uang.'
          : 'Catatan saja. Tandai lunas setelah uang benar-benar Anda terima.'}
      </p>
    </div>
  );
}

/* ---------- Dialogs ---------- */

function HandoverDialog({ open, onOpenChange, inquiry, listing, actorId }: { open: boolean; onOpenChange: (o: boolean) => void; inquiry: Inquiry; listing: Listing; actorId: string }) {
  const [weight, setWeight] = React.useState('');
  const [photo, setPhoto] = React.useState('');
  const [note, setNote] = React.useState('');
  const [amount, setAmount] = React.useState('');
  const [currency, setCurrency] = React.useState<Currency>(listing.currency);
  const [touchedAmount, setTouchedAmount] = React.useState(false);
  const [error, setError] = React.useState<string>();

  const estimate = React.useCallback(
    (kg: number) => {
      if (listing.type === 'weight') return round2(kg * listing.pricePerKg);
      const t = inquiryTotals({ ...inquiry, amountDue: undefined }, listing);
      return t[listing.currency] ?? Object.values(t)[0] ?? 0;
    },
    [listing, inquiry],
  );

  React.useEffect(() => {
    if (open) {
      const kg = orderKg(inquiry);
      setWeight(listing.type === 'weight' ? String(kg) : '');
      setPhoto('');
      setNote('');
      setCurrency(listing.currency);
      setAmount(String(estimate(kg) || ''));
      setTouchedAmount(false);
      setError(undefined);
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const onWeight = (v: string) => {
    setWeight(v);
    const kg = Number(v.replace(',', '.'));
    if (!touchedAmount && kg > 0 && listing.type === 'weight') setAmount(String(estimate(kg)));
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const r = recordHandover(inquiry.id, actorId, {
      weightKg: weight ? Number(weight.replace(',', '.')) : undefined,
      photoUrl: photo,
      note,
      amountDue: Number(amount.replace(',', '.')),
      currency,
    });
    if (!r.ok) return setError(r.error);
    toast.success('Serah terima dicatat', { description: 'Klien menerima tagihan.' });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={submit} noValidate className="flex min-h-0 flex-1 flex-col">
          <DialogHeader>
            <DialogTitle>Catat serah terima</DialogTitle>
            <DialogDescription>Timbang dan foto barang saat diterima. Catatan ini jadi bukti jika ada sengketa.</DialogDescription>
          </DialogHeader>
          <DialogBody className="space-y-4">
            {listing.type === 'weight' && (
              <Field id="ho-kg" label="Berat hasil timbang (kg)" required hint={`Diminta ${formatKg(inquiry.requestedKg ?? 0)}.`}>
                <Input type="number" inputMode="decimal" min={0.1} step={0.1} value={weight} onChange={(e) => onWeight(e.target.value)} autoFocus />
              </Field>
            )}
            <div>
              <p className="mb-1.5 text-sm font-semibold text-navy">
                Foto barang<span className="text-red-500">*</span>
              </p>
              <PhotoInput value={photo} onChange={setPhoto} label="Foto barang saat serah terima" hint="Foto isi titipan dan timbangan bila bisa." />
            </div>
            <div className="grid grid-cols-[1fr_110px] gap-3">
              <Field id="ho-amount" label="Jumlah tagihan" required hint={listing.type === 'weight' ? 'Otomatis dari berat × tarif. Bisa diubah.' : 'Harga barang + jasa titip.'}>
                <Input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="any"
                  value={amount}
                  onChange={(e) => {
                    setTouchedAmount(true);
                    setAmount(e.target.value);
                  }}
                />
              </Field>
              <Field id="ho-cur" label="Mata uang">
                <Select value={currency} onChange={(e) => setCurrency(e.target.value as Currency)}>
                  <option value="SAR">SAR</option>
                  <option value="AUD">AUD</option>
                  <option value="IDR">IDR</option>
                </Select>
              </Field>
            </div>
            <Field id="ho-note" label="Catatan" hint="Opsional. cth. kondisi segel, lokasi serah terima.">
              <Textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} className="min-h-[64px]" />
            </Field>
            {error && (
              <p role="alert" className="text-[13px] font-medium text-red-600">
                {error}
              </p>
            )}
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Batal
            </Button>
            <Button type="submit" variant="accent">
              Simpan & kirim tagihan
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function PaymentProofDialog({ open, onOpenChange, inquiry, actorId }: { open: boolean; onOpenChange: (o: boolean) => void; inquiry: Inquiry; actorId: string }) {
  const [photo, setPhoto] = React.useState('');
  const [note, setNote] = React.useState('');
  React.useEffect(() => {
    if (open) {
      setPhoto('');
      setNote('');
    }
  }, [open]);
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const r = uploadPaymentProof(inquiry.id, actorId, photo, note);
    if (!r.ok) return toast.error(r.error);
    toast.success('Bukti bayar terkirim');
    onOpenChange(false);
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
          <DialogHeader>
            <DialogTitle>Unggah bukti bayar</DialogTitle>
            <DialogDescription>
              Tagihan {typeof inquiry.amountDue === 'number' && inquiry.amountCurrency ? formatMoney(inquiry.amountDue, inquiry.amountCurrency) : ''}. Sembunyikan nomor rekening penuh sebelum mengunggah.
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="space-y-4">
            <PhotoInput value={photo} onChange={setPhoto} label="Foto bukti transfer" hint="Screenshot transfer atau struk." />
            <Field id="pp-note" label="Catatan" hint="Opsional. cth. transfer via bank apa.">
              <Input value={note} onChange={(e) => setNote(e.target.value)} maxLength={140} />
            </Field>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Batal
            </Button>
            <Button type="submit" variant="accent" disabled={!photo}>
              <Upload /> Kirim bukti
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const DECLINE_REASONS = ['Kuota sudah penuh', 'Barang tidak diizinkan', 'Jadwal tidak cocok', 'Lainnya'];

function DeclineDialog({ open, onOpenChange, inquiry, actorId }: { open: boolean; onOpenChange: (o: boolean) => void; inquiry: Inquiry; actorId: string }) {
  const [reason, setReason] = React.useState(DECLINE_REASONS[0]!);
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const r = declineInquiry(inquiry.id, actorId, reason === 'Lainnya' ? undefined : reason);
    if (!r.ok) return toast.error(r.error);
    toast.success('Request ditolak');
    onOpenChange(false);
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
          <DialogHeader>
            <DialogTitle>Tolak request?</DialogTitle>
            <DialogDescription>Klien diberi tahu dan kuota yang ditahan dilepas.</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <Field id="dec-reason" label="Alasan">
              <Select value={reason} onChange={(e) => setReason(e.target.value)}>
                {DECLINE_REASONS.map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </Select>
            </Field>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Batal
            </Button>
            <Button type="submit" variant="destructive">
              Tolak request
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function RatingChip({ label, value }: { label: string; value: number }) {
  return (
    <p className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 p-3 text-sm font-semibold text-navy">
      <span>{label}</span>
      <span className="flex items-center gap-1.5">
        <StarRating value={value} size={14} /> <span className="num text-slate-500">{value}/5</span>
      </span>
    </p>
  );
}

export function ReviewDialog({
  open,
  onOpenChange,
  inquiry,
  actorId,
  targetName,
  aboutClient,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  inquiry: Inquiry;
  actorId: string;
  targetName: string;
  aboutClient?: boolean;
}) {
  const [rating, setRating] = React.useState(0);
  const [error, setError] = React.useState<string>();
  React.useEffect(() => {
    if (open) {
      setRating(0);
      setError(undefined);
    }
  }, [open]);
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rating) return setError('Pilih 1 sampai 5 bintang.');
    const r = createReview(inquiry.id, actorId, rating);
    if (!r.ok) return toast.error(r.error);
    toast.success('Rating terkirim. Terima kasih.');
    onOpenChange(false);
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={submit} noValidate className="flex min-h-0 flex-1 flex-col">
          <DialogHeader>
            <DialogTitle>Nilai {targetName}</DialogTitle>
            <DialogDescription>
              {aboutClient
                ? 'Apakah klien jujur soal isi titipan, tepat waktu saat serah terima, dan membayar sesuai tagihan? Satu rating per order.'
                : 'Rating membantu diaspora lain memilih jastiper yang amanah. Satu rating per order.'}
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            <StarInput value={rating} onChange={setRating} />
            {error && (
              <p role="alert" className="mt-1 text-[13px] font-medium text-red-600">
                {error}
              </p>
            )}
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Nanti saja
            </Button>
            <Button type="submit" variant="accent">
              Kirim rating
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function OrderLink({ inquiryId, className }: { inquiryId: string; className?: string }) {
  return (
    <Link to={`/orders/${inquiryId}`} className={cn('text-[13px] font-bold text-teal-800 hover:underline', className)}>
      Lacak order →
    </Link>
  );
}
