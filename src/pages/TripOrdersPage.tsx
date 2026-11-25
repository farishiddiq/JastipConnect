import * as React from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Download, FileSpreadsheet, Lock, Plane, Truck } from 'lucide-react';
import { toast } from 'sonner';
import { markDelivered, markShipped } from '@/services/inquiryService';
import type { Inquiry, User } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, Tabs } from '@/components/ui/misc';
import { Avatar, EmptyState, InquiryStatusBadge, ListingStatusBadge, PaymentBadge, RouteDisplay } from '@/components/shared/display';
import { ShareTripButton } from '@/components/listings/ShareTripCard';
import { RequireProvider } from '@/components/layout/Guards';
import { AvailabilityMeter } from '@/components/listings/ListingCard';
import { useDB, useListingView, usePageMeta } from '@/hooks/useStore';
import { inquiryTotals, orderKg, OPEN_ORDER_STATUSES } from '@/lib/availability';
import { formatDateTime, formatKg, formatMoneyGroups, listingTitle } from '@/lib/format';
import type { Currency } from '@/types';

type Filter = 'all' | 'open' | 'unpaid' | 'done';

/** One sheet with every order on a trip. Unlimited rows, exportable to CSV. */
export function TripOrdersPage() {
  usePageMeta('Order sheet');
  return <RequireProvider reason="Masuk sebagai provider untuk melihat order sheet.">{(user) => <Sheet me={user} />}</RequireProvider>;
}

function Sheet({ me }: { me: User }) {
  const { id } = useParams();
  const view = useListingView(id);
  const { inquiries, users } = useDB();
  const [filter, setFilter] = React.useState<Filter>('all');

  if (!view || view.listing.ownerId !== me.id) {
    return (
      <div className="container max-w-lg py-16">
        <EmptyState icon={<Lock />} title="Trip tidak ditemukan" action={<Button asChild><Link to="/my-listings">Trip saya</Link></Button>} />
      </div>
    );
  }
  const l = view.listing;
  const all = inquiries.filter((i) => i.listingId === l.id).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const isUnpaid = (i: Inquiry) => typeof i.amountDue === 'number' && i.payment?.status !== 'paid' && OPEN_ORDER_STATUSES.includes(i.status);
  const rows = all.filter((i) =>
    filter === 'all' ? true : filter === 'open' ? OPEN_ORDER_STATUSES.includes(i.status) : filter === 'unpaid' ? isUnpaid(i) : i.status === 'completed',
  );

  const sumBy = (pred: (i: Inquiry) => boolean) => {
    const t: Partial<Record<Currency, number>> = {};
    for (const i of all.filter(pred)) for (const [c, v] of Object.entries(inquiryTotals(i, l)) as [Currency, number][]) t[c] = (t[c] ?? 0) + v;
    return t;
  };
  const billed = sumBy((i) => typeof i.amountDue === 'number' && !['declined', 'cancelled', 'expired'].includes(i.status));
  const paid = sumBy((i) => i.payment?.status === 'paid');
  const kgLive = all.filter((i) => OPEN_ORDER_STATUSES.includes(i.status) || i.status === 'completed').reduce((s, i) => s + orderKg(i), 0);

  // One tap for the whole trip: at the airport, or once everything is handed out at the destination.
  const toShip = all.filter((i) => i.status === 'handed_over');
  const toDeliver = all.filter((i) => i.status === 'shipped');
  const bulk = (list: Inquiry[], fn: typeof markShipped, done: string) => {
    let n = 0;
    for (const i of list) if (fn(i.id, me.id).ok) n++;
    toast.success(`${n} order ${done}`, { description: 'Semua klien diberi notifikasi.' });
  };

  const exportCsv = () => {
    const head = ['Order', 'Klien', 'Status', 'Kg diminta', 'Kg timbang', 'Barang', 'Tagihan', 'Mata uang', 'Pembayaran', 'Dibuat'];
    const body = all.map((i) => [
      i.id.slice(0, 8),
      users.find((u) => u.id === i.buyerId)?.displayName ?? '',
      i.status,
      i.requestedKg ?? '',
      i.handover?.weightKg ?? '',
      i.itemDescription ?? (i.items ?? []).map((x) => `${l.type === 'shopping' ? l.products.find((p) => p.id === x.productId)?.name : ''} x${x.quantity}`).join('; '),
      i.amountDue ?? '',
      i.amountCurrency ?? '',
      i.payment?.status ?? 'unpaid',
      i.createdAt,
    ]);
    const csv = [head, ...body].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `order-sheet-${l.origin.city}-${l.destination.city}.csv`.toLowerCase().replace(/\s+/g, '-');
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="container py-6 sm:py-10">
      <Link to="/my-listings" className="mb-4 inline-flex h-10 items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-navy">
        <ArrowLeft className="h-4 w-4" /> Trip saya
      </Link>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm text-slate-500">
            <FileSpreadsheet className="h-4 w-4" /> Order sheet <ListingStatusBadge status={view.status} type={l.type} />
          </p>
          <h1 className="mt-1 text-[1.75rem] font-bold leading-tight text-navy sm:text-3xl">{listingTitle(l)}</h1>
          <RouteDisplay listing={l} size="sm" className="mt-1 text-slate-600" />
        </div>
        <div className="flex flex-wrap gap-2">
          <ShareTripButton view={view} />
          <Button variant="outline" onClick={exportCsv} disabled={!all.length}>
            <Download /> Ekspor CSV
          </Button>
        </div>
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-4">
        <Stat label="Total order" value={String(all.length)} />
        <Stat label={l.type === 'weight' ? 'Kg terpakai' : 'Item'} value={l.type === 'weight' ? formatKg(kgLive) : String(all.reduce((s, i) => s + (i.items ?? []).reduce((a, b) => a + b.quantity, 0), 0))} />
        <Stat label="Ditagih" value={formatMoneyGroups(billed)} />
        <Stat label="Sudah lunas" value={formatMoneyGroups(paid)} />
      </div>
      {view.status !== 'draft' && <AvailabilityMeter view={view} className="mb-6 max-w-md" />}

      {(toShip.length > 0 || toDeliver.length > 0) && (
        <div className="mb-6 flex flex-wrap items-center gap-3 rounded-2xl bg-navy p-4 text-white">
          <p className="min-w-0 flex-1 text-sm">
            <span className="font-bold">Sekali tap untuk semua order di trip ini.</span>{' '}
            <span className="text-white/70">Klien langsung menerima notifikasi.</span>
          </p>
          {toShip.length > 0 && (
            <Button variant="accent" onClick={() => bulk(toShip, markShipped, 'ditandai dikirim')}>
              <Plane /> Tandai semua dikirim ({toShip.length})
            </Button>
          )}
          {toDeliver.length > 0 && (
            <Button className="bg-white text-navy hover:bg-slate-100" onClick={() => bulk(toDeliver, markDelivered, 'ditandai sampai')}>
              <Truck /> Tandai semua sampai ({toDeliver.length})
            </Button>
          )}
        </div>
      )}

      <Tabs
        label="Filter order"
        value={filter}
        onChange={setFilter}
        items={[
          { value: 'all', label: 'Semua', count: all.length },
          { value: 'open', label: 'Berjalan', count: all.filter((i) => OPEN_ORDER_STATUSES.includes(i.status)).length },
          { value: 'unpaid', label: 'Belum lunas', count: all.filter(isUnpaid).length },
          { value: 'done', label: 'Selesai', count: all.filter((i) => i.status === 'completed').length },
        ]}
        className="mb-4 sm:max-w-xl"
      />

      {rows.length ? (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-border bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Klien</th>
                <th className="px-4 py-3 font-semibold">Titipan</th>
                <th className="px-4 py-3 font-semibold">{l.type === 'weight' ? 'Kg' : 'Qty'}</th>
                <th className="px-4 py-3 font-semibold">Tagihan</th>
                <th className="px-4 py-3 font-semibold">Pembayaran</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((i) => {
                const buyer = users.find((u) => u.id === i.buyerId);
                return (
                  <tr key={i.id} className="align-top hover:bg-slate-50/60">
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-2 font-semibold text-navy">
                        <Avatar user={buyer} size={28} /> {buyer?.displayName ?? '-'}
                      </span>
                      <span className="mt-0.5 block text-xs text-slate-400">{formatDateTime(i.createdAt)}</span>
                    </td>
                    <td className="max-w-[220px] px-4 py-3 text-slate-600">
                      <span className="line-clamp-2">
                        {i.itemDescription ??
                          (i.items ?? []).map((x) => `${l.type === 'shopping' ? l.products.find((p) => p.id === x.productId)?.name : ''} ×${x.quantity}`).join(', ')}
                      </span>
                    </td>
                    <td className="num px-4 py-3 text-navy">
                      {l.type === 'weight' ? (
                        <>
                          {formatKg(orderKg(i))}
                          {i.handover?.weightKg !== undefined && <span className="block text-[11px] text-slate-400">ditimbang</span>}
                        </>
                      ) : (
                        (i.items ?? []).reduce((s, x) => s + x.quantity, 0)
                      )}
                    </td>
                    <td className="num px-4 py-3 font-semibold text-navy">{formatMoneyGroups(inquiryTotals(i, l))}</td>
                    <td className="px-4 py-3">{typeof i.amountDue === 'number' ? <PaymentBadge status={i.payment?.status ?? 'unpaid'} /> : <span className="text-xs text-slate-400">Belum ditagih</span>}</td>
                    <td className="px-4 py-3">
                      <InquiryStatusBadge status={i.status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link to={`/orders/${i.id}`} className="text-[13px] font-bold text-teal-800 hover:underline">
                        Buka
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      ) : (
        <EmptyState icon={<FileSpreadsheet />} title="Belum ada order" description="Bagikan trip ke grup WhatsApp diaspora supaya request masuk." action={<ShareTripButton view={view} variant="accent" />} />
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-4">
      <p className="text-xs font-semibold text-slate-500">{label}</p>
      <p className="num mt-1 truncate text-xl font-extrabold text-navy">{value}</p>
    </Card>
  );
}
