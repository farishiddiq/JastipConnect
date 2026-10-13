import * as React from 'react';
import { Link } from 'react-router-dom';
import { Check, CheckCircle2, ChevronDown, CircleDot, Star, X, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import type { Inquiry, Listing, Review, User } from '@/types';
import { Button } from '@/components/ui/button';
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { InquiryStatusBadge, StarInput, StarRating } from '@/components/shared/display';
import { useConfirm } from '@/components/shared/ConfirmProvider';
import { acceptInquiry, cancelInquiry, confirmCompletion, declineInquiry } from '@/services/inquiryService';
import { createReview } from '@/services/moderationService';
import { useDB } from '@/hooks/useStore';
import { inquiryTotals, remainingKg, remainingQty } from '@/lib/availability';
import { formatKg, formatMoney, formatMoneyGroups } from '@/lib/format';
import { cn } from '@/lib/utils';

export function InquiryPanel({ inquiry, listing, me, other }: { inquiry: Inquiry; listing?: Listing; me: User; other?: User }) {
  const confirm = useConfirm();
  const { inquiries, reviews } = useDB();
  const [expanded, setExpanded] = React.useState(true);
  const [reviewOpen, setReviewOpen] = React.useState(false);
  const isProvider = inquiry.providerId === me.id;
  const isBuyer = inquiry.buyerId === me.id;
  const review = reviews.find((r) => r.inquiryId === inquiry.id);
  const totals = inquiryTotals(inquiry, listing);

  // Live availability check so the provider sees whether accepting is possible.
  let capacityNote: { ok: boolean; text: string } | null = null;
  if (listing && inquiry.status === 'pending') {
    if (listing.type === 'weight') {
      const rem = remainingKg(listing, inquiries);
      const ok = (inquiry.requestedKg ?? 0) <= rem;
      capacityNote = { ok, text: ok ? `Sisa kuota ${formatKg(rem)} , cukup.` : `Sisa kuota hanya ${formatKg(rem)}. Tidak cukup untuk menerima.` };
    } else {
      const short = (inquiry.items ?? []).filter((line) => {
        const p = listing.products.find((x) => x.id === line.productId);
        return !p || line.quantity > remainingQty(listing.id, p, inquiries);
      });
      capacityNote = short.length
        ? { ok: false, text: `Stok tidak cukup untuk ${short.length} produk.` }
        : { ok: true, text: 'Stok cukup untuk semua produk.' };
    }
  }

  const run = (fn: () => { ok: boolean; error?: string }, success: string) => {
    const r = fn() as { ok: true } | { ok: false; error: string };
    r.ok ? toast.success(success) : toast.error(r.error);
  };

  const onAccept = async () => {
    const what = listing?.type === 'weight' ? formatKg(inquiry.requestedKg ?? 0) : 'stok produk';
    if (!(await confirm({ title: 'Terima inquiry?', description: `${what} akan direservasi untuk ${other?.displayName ?? 'pembeli'}.`, confirmLabel: 'Terima' }))) return;
    run(() => acceptInquiry(inquiry.id, me.id), 'Inquiry diterima & kuota direservasi');
  };
  const onDecline = async () => {
    if (!(await confirm({ title: 'Tolak inquiry?', description: 'Pembeli akan diberi tahu.', confirmLabel: 'Tolak', destructive: true }))) return;
    run(() => declineInquiry(inquiry.id, me.id), 'Inquiry ditolak');
  };
  const onCancel = async () => {
    const extra = inquiry.status === 'accepted' ? ' Kuota/stok yang sudah direservasi akan dilepas.' : '';
    if (!(await confirm({ title: 'Batalkan inquiry?', description: `Penyedia akan diberi tahu.${extra}`, confirmLabel: 'Batalkan inquiry', destructive: true }))) return;
    run(() => cancelInquiry(inquiry.id, me.id), 'Inquiry dibatalkan');
  };
  const onComplete = async () => {
    if (
      !(await confirm({
        title: 'Konfirmasi transaksi selesai?',
        description: 'Konfirmasi jika barang sudah diserahkan. Selesai setelah kedua pihak konfirmasi.',
        confirmLabel: 'Ya, sudah selesai',
      }))
    )
      return;
    run(() => confirmCompletion(inquiry.id, me.id), 'Konfirmasi tercatat');
  };

  const myConfirmed = isBuyer ? inquiry.buyerConfirmedComplete : inquiry.providerConfirmedComplete;
  const otherConfirmed = isBuyer ? inquiry.providerConfirmedComplete : inquiry.buyerConfirmedComplete;

  return (
    <section className="border-b border-border bg-slate-50/80" aria-label="Detail inquiry">
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        aria-expanded={expanded}
        className="flex w-full items-center gap-2 px-4 py-2.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal-500"
      >
        <InquiryStatusBadge status={inquiry.status} inquiry={inquiry} />
        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-navy">
          {listing?.type === 'weight' ? `Titip ${formatKg(inquiry.requestedKg ?? 0)}` : `${(inquiry.items ?? []).reduce((s, l) => s + l.quantity, 0)} item`}
          <span className="font-normal text-slate-500"> · {formatMoneyGroups(totals)}</span>
        </span>
        <span className="hidden text-xs text-slate-400 sm:inline">{isProvider ? 'Anda penyedia' : 'Anda pembeli'}</span>
        <ChevronDown className={cn('h-4 w-4 text-slate-400 transition-transform', expanded && 'rotate-180')} />
      </button>

      {expanded && (
        <div className="space-y-3 px-4 pb-4">
          <div className="rounded-xl bg-white p-3 text-sm ring-1 ring-border">
            {listing ? (
              <Link to={`/listings/${listing.id}`} className="font-semibold text-teal-700 hover:underline">
                {listing.title}
              </Link>
            ) : (
              <span className="text-slate-500">Listing sudah dihapus</span>
            )}
            {listing?.type === 'weight' ? (
              <p className="mt-1 text-slate-600">
                {formatKg(inquiry.requestedKg ?? 0)} × {formatMoney(listing.pricePerKg, listing.currency)}/kg
                {inquiry.itemDescription && <span className="block text-slate-500">Barang: {inquiry.itemDescription}</span>}
              </p>
            ) : (
              <ul className="mt-1 space-y-0.5 text-slate-600">
                {(inquiry.items ?? []).map((line) => {
                  const p = listing?.products.find((x) => x.id === line.productId);
                  return (
                    <li key={line.productId} className="flex justify-between gap-2">
                      <span className="truncate">
                        {p?.name ?? 'Produk dihapus'} × {line.quantity}
                      </span>
                      <span className="shrink-0">
                        {typeof line.unitPriceSnapshot === 'number'
                          ? formatMoney(line.quantity * line.unitPriceSnapshot, p?.currency ?? listing?.currency ?? 'SAR')
                          : 'Tanya harga'}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
            {inquiry.note && <p className="mt-1 text-slate-500">Catatan: {inquiry.note}</p>}
          </div>

          {isProvider && capacityNote && (
            <p className={cn('flex items-center gap-1.5 text-xs font-semibold', capacityNote.ok ? 'text-emerald-700' : 'text-red-600')}>
              {capacityNote.ok ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
              {capacityNote.text}
            </p>
          )}

          {inquiry.status === 'accepted' && (
            <div className="flex flex-wrap gap-3 text-xs">
              <ConfirmChip done={!!inquiry.buyerConfirmedComplete} label="Pembeli konfirmasi" />
              <ConfirmChip done={!!inquiry.providerConfirmedComplete} label="Penyedia konfirmasi" />
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {isProvider && inquiry.status === 'pending' && (
              <>
                <Button size="sm" variant="accent" onClick={onAccept} disabled={capacityNote?.ok === false}>
                  <Check /> Terima
                </Button>
                <Button size="sm" variant="destructive-outline" onClick={onDecline}>
                  <X /> Tolak
                </Button>
              </>
            )}
            {inquiry.status === 'accepted' && !myConfirmed && (
              <Button size="sm" variant="default" onClick={onComplete}>
                <CheckCircle2 /> {otherConfirmed ? 'Konfirmasi selesai' : 'Tandai selesai'}
              </Button>
            )}
            {inquiry.status === 'accepted' && myConfirmed && !otherConfirmed && (
              <p className="text-xs text-slate-500">Menunggu konfirmasi {isBuyer ? 'penyedia' : 'pembeli'}.</p>
            )}
            {isBuyer && (inquiry.status === 'pending' || inquiry.status === 'accepted') && (
              <Button size="sm" variant="ghost" className="text-red-600 hover:bg-red-50" onClick={onCancel}>
                Batalkan inquiry
              </Button>
            )}
            {isBuyer && inquiry.status === 'completed' && !review && (
              <Button size="sm" variant="accent" onClick={() => setReviewOpen(true)}>
                <Star /> Beri ulasan
              </Button>
            )}
          </div>

          {review && <ReviewSnippet review={review} mine={isBuyer} />}
          {inquiry.status === 'completed' && isProvider && !review && <p className="text-xs text-slate-500">Menunggu ulasan dari pembeli.</p>}
        </div>
      )}

      <ReviewDialog open={reviewOpen} onOpenChange={setReviewOpen} inquiry={inquiry} buyerId={me.id} providerName={other?.displayName ?? 'penyedia'} />
    </section>
  );
}

function ConfirmChip({ done, label }: { done: boolean; label: string }) {
  return (
    <span className={cn('flex items-center gap-1 font-semibold', done ? 'text-emerald-700' : 'text-slate-400')}>
      {done ? <CheckCircle2 className="h-4 w-4" /> : <CircleDot className="h-4 w-4" />}
      {label}
    </span>
  );
}

function ReviewSnippet({ review, mine }: { review: Review; mine: boolean }) {
  return (
    <div className="rounded-xl bg-slate-100 p-3 text-sm">
      <p className="flex items-center gap-2 font-semibold text-navy">
        {mine ? 'Penilaian Anda' : 'Penilaian pembeli'} <StarRating value={review.rating} size={14} />
        <span className="num text-slate-600">{review.rating}/5</span>
      </p>
    </div>
  );
}

function ReviewDialog({
  open,
  onOpenChange,
  inquiry,
  buyerId,
  providerName,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  inquiry: Inquiry;
  buyerId: string;
  providerName: string;
}) {
  const [rating, setRating] = React.useState(0);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  React.useEffect(() => {
    if (open) {
      setRating(0);
      setErrors({});
    }
  }, [open]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!rating) errs.rating = 'Pilih 1 sampai 5 bintang.';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    const r = createReview(inquiry.id, buyerId, rating);
    if (!r.ok) return toast.error(r.error);
    toast.success('Penilaian terkirim. Terima kasih.');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={submit} noValidate className="flex min-h-0 flex-1 flex-col">
          <DialogHeader>
            <DialogTitle>Nilai {providerName}</DialogTitle>
            <DialogDescription>Pilih tingkat kepuasan Anda. Satu penilaian per transaksi.</DialogDescription>
          </DialogHeader>
          <DialogBody className="space-y-4">
            <div>
              <p className="mb-1.5 text-sm font-semibold text-navy">
                Rating<span className="text-red-500">*</span>
              </p>
              <StarInput value={rating} onChange={setRating} />
              {errors.rating && (
                <p role="alert" className="mt-1 text-[13px] font-medium text-red-600">
                  {errors.rating}
                </p>
              )}
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Nanti saja
            </Button>
            <Button type="submit" variant="accent">
              Kirim penilaian
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
