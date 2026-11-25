import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, CalendarDays, Lock, MessageCircle, Package, Scale } from 'lucide-react';
import type { User } from '@/types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/misc';
import { Avatar, EmptyState, InquiryStatusBadge, ListingCover, RouteDisplay, TripVerifiedBadge, TrustMeter, VerificationLabel } from '@/components/shared/display';
import { HoldCountdown, OrderActions, OrderItems, OrderTimeline, PaymentCard } from '@/components/orders/OrderParts';
import { RequireUser } from '@/components/layout/Guards';
import { useClientRating, useDB, usePageMeta, useTrust } from '@/hooks/useStore';
import { StarRating } from '@/components/shared/display';
import { formatDate, formatDateTime, formatKg, listingTitle } from '@/lib/format';

const NEXT_STEP: Record<string, { buyer: string; provider: string }> = {
  pending: { buyer: 'Menunggu penyedia menerima request. Kuota Anda ditahan 24 jam.', provider: 'Terima atau tolak sebelum hold 24 jam habis.' },
  accepted: { buyer: 'Serahkan barang ke penyedia sebelum batas drop-off.', provider: 'Saat barang diterima, timbang, foto, lalu catat serah terima.' },
  handed_over: { buyer: 'Bayar sesuai tagihan lalu unggah bukti bayar.', provider: 'Cek bukti bayar, tandai lunas, lalu tandai dikirim saat berangkat.' },
  shipped: { buyer: 'Titipan dalam perjalanan.', provider: 'Tandai sampai setelah titipan diserahkan di tujuan.' },
  delivered: { buyer: 'Konfirmasi titipan sudah diterima, lalu beri rating.', provider: 'Menunggu klien mengonfirmasi penerimaan.' },
  completed: { buyer: 'Order selesai. Terima kasih.', provider: 'Order selesai.' },
  declined: { buyer: 'Request ditolak. Coba trip lain dengan rute yang sama.', provider: 'Request ditolak.' },
  cancelled: { buyer: 'Request dibatalkan.', provider: 'Request dibatalkan klien.' },
  expired: { buyer: 'Hold kedaluwarsa dan kuota dilepas.', provider: 'Hold kedaluwarsa dan kuota dilepas.' },
};

export function OrderDetailPage() {
  usePageMeta('Lacak order');
  return <RequireUser reason="Masuk untuk melihat order ini.">{(user) => <OrderDetail me={user} />}</RequireUser>;
}

function OrderDetail({ me }: { me: User }) {
  const { id } = useParams();
  const { inquiries, listings, users, conversations } = useDB();
  const inquiry = inquiries.find((i) => i.id === id);
  const role = inquiry?.providerId === me.id ? 'provider' : 'buyer';
  const otherId = role === 'provider' ? inquiry?.buyerId : inquiry?.providerId;
  const other = users.find((u) => u.id === otherId);
  const trust = useTrust(role === 'buyer' ? other : undefined);
  const clientRating = useClientRating(role === 'provider' ? other?.id : undefined);

  if (!inquiry || (inquiry.buyerId !== me.id && inquiry.providerId !== me.id && me.role !== 'admin')) {
    return (
      <div className="container max-w-lg py-16">
        <EmptyState
          icon={inquiry ? <Lock /> : <Package />}
          title={inquiry ? 'Order bukan milik Anda' : 'Order tidak ditemukan'}
          action={
            <Button asChild>
              <Link to="/orders">Ke daftar order</Link>
            </Button>
          }
        />
      </div>
    );
  }
  const listing = listings.find((l) => l.id === inquiry.listingId);
  const conv = conversations.find((c) => c.inquiryId === inquiry.id);
  const next = NEXT_STEP[inquiry.status]?.[role];

  return (
    <div className="container max-w-5xl py-6 sm:py-10">
      <Link to="/orders" className="mb-4 inline-flex h-10 items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-navy">
        <ArrowLeft className="h-4 w-4" /> Semua order
      </Link>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <h1 className="text-[1.75rem] font-bold leading-tight text-navy sm:text-3xl">Order #{inquiry.id.slice(0, 6).toUpperCase()}</h1>
        <InquiryStatusBadge status={inquiry.status} />
        <HoldCountdown inquiry={inquiry} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="min-w-0 space-y-5">
          <Card className="p-4 sm:p-6">
            <OrderTimeline inquiry={inquiry} />
            {next && <p className="mt-5 rounded-xl bg-teal-50 px-4 py-3 text-sm font-medium text-teal-900">{next}</p>}
            {inquiry.closedReason && <p className="mt-3 text-sm text-slate-500">Catatan: {inquiry.closedReason}</p>}
            <div className="mt-5">
              <OrderActions inquiry={inquiry} listing={listing} me={me} other={other} />
            </div>
          </Card>

          <Card className="p-4 sm:p-6">
            <h2 className="mb-3 text-lg font-bold text-navy">Detail titipan</h2>
            <OrderItems inquiry={inquiry} listing={listing} />
            {inquiry.handover && (
              <div className="mt-5 rounded-2xl border border-border p-4">
                <p className="flex items-center gap-2 text-sm font-bold text-navy">
                  <Scale className="h-4 w-4 text-teal-600" /> Catatan serah terima
                </p>
                <div className="mt-3 flex gap-4">
                  {inquiry.handover.photoUrl && (
                    <a href={inquiry.handover.photoUrl} target="_blank" rel="noreferrer" className="shrink-0">
                      <img src={inquiry.handover.photoUrl} alt="Foto barang saat serah terima" className="h-24 w-24 rounded-xl object-cover ring-1 ring-border" />
                    </a>
                  )}
                  <dl className="space-y-1 text-sm">
                    {inquiry.handover.weightKg !== undefined && (
                      <div>
                        <dt className="inline text-slate-500">Berat: </dt>
                        <dd className="num inline font-semibold text-navy">{formatKg(inquiry.handover.weightKg)}</dd>
                      </div>
                    )}
                    <div>
                      <dt className="inline text-slate-500">Waktu: </dt>
                      <dd className="inline text-navy">{formatDateTime(inquiry.handover.at)}</dd>
                    </div>
                    {inquiry.handover.note && <dd className="text-slate-600">{inquiry.handover.note}</dd>}
                  </dl>
                </div>
              </div>
            )}
          </Card>
        </div>

        <aside className="space-y-4">
          <PaymentCard inquiry={inquiry} listing={listing} role={role} />

          {listing && (
            <Card className="overflow-hidden">
              <Link to={`/listings/${listing.id}`} className="block aspect-[16/7] overflow-hidden" tabIndex={-1} aria-hidden>
                <ListingCover listing={listing} compact />
              </Link>
              <div className="space-y-2 p-4">
                <Link to={`/listings/${listing.id}`} className="font-bold text-navy hover:text-teal-700">
                  {listingTitle(listing)}
                </Link>
                <RouteDisplay listing={listing} size="sm" className="text-slate-600" />
                {listing.departureDate && (
                  <p className="flex items-center gap-1.5 text-[13px] text-slate-500">
                    <CalendarDays className="h-4 w-4" /> Berangkat {formatDate(listing.departureDate)}
                    {listing.orderDeadline && ` · drop-off ${formatDate(listing.orderDeadline)}`}
                  </p>
                )}
                {listing.type === 'weight' && <TripVerifiedBadge verified={listing.ticketProof?.status === 'approved'} pending={listing.ticketProof?.status === 'pending'} />}
              </div>
            </Card>
          )}

          <Card className="space-y-3 p-4">
            <p className="text-sm font-bold text-navy">{role === 'buyer' ? 'Penyedia' : 'Klien'}</p>
            <Link to={`/providers/${other?.id}`} className="flex items-center gap-3">
              <Avatar user={other} size={44} />
              <div className="min-w-0">
                <p className="truncate font-bold text-navy">{other?.displayName ?? 'Pengguna'}</p>
                <p className="text-[13px] text-slate-500">{other?.city ?? '-'}</p>
              </div>
            </Link>
            <VerificationLabel user={other} />
            {trust && <TrustMeter trust={trust} />}
            {role === 'provider' && (
              <p className="flex items-center gap-2 text-sm">
                {clientRating.count ? (
                  <>
                    <StarRating value={clientRating.average} size={14} />
                    <span className="num font-semibold text-navy">{clientRating.average.toFixed(1)}</span>
                    <span className="text-slate-500">dari {clientRating.count} penyedia</span>
                  </>
                ) : (
                  <span className="text-slate-500">Klien baru, belum ada rating dari penyedia.</span>
                )}
              </p>
            )}
            {conv && (
              <Button asChild variant="outline" className="w-full">
                <Link to={`/inbox/${conv.id}`}>
                  <MessageCircle /> Buka chat
                </Link>
              </Button>
            )}
          </Card>
        </aside>
      </div>
    </div>
  );
}
