import * as React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CalendarDays, CheckCircle2, CreditCard, FileSpreadsheet, Inbox, Package, Plane, PlusCircle, Scale, Truck } from 'lucide-react';
import type { Inquiry, Listing, User } from '@/types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/misc';
import { Avatar, EmptyState, ListingStatusBadge, ProBadge, RouteDisplay, StarRating, TrustMeter, VerificationLabel } from '@/components/shared/display';
import { HoldCountdown } from '@/components/orders/OrderParts';
import { AvailabilityMeter } from '@/components/listings/ListingCard';
import { PromotePanel } from '@/components/listings/PromotePanel';
import { ShareTripButton } from '@/components/listings/ShareTripCard';
import { RequireProvider } from '@/components/layout/Guards';
import { useDB, useListingViews, usePageMeta, usePlanState, useProviderRating, useTrust, type ListingView } from '@/hooks/useStore';
import { inquiryTotals, OPEN_ORDER_STATUSES, orderKg } from '@/lib/availability';
import { formatCountdown, formatDate, formatKg, formatMoneyGroups, listingTitle } from '@/lib/format';
import { cn } from '@/lib/utils';

export function ProviderDashboardPage() {
  usePageMeta('Dashboard provider');
  return <RequireProvider reason="Masuk sebagai provider untuk membuka dashboard.">{(user) => <Dashboard me={user} />}</RequireProvider>;
}

type Task = { inquiry: Inquiry; listing?: Listing; buyer?: User; icon: React.ElementType; title: string; hint: string; tone: 'amber' | 'teal' | 'navy'; rank: number };

function useTasks(me: User): Task[] {
  const { inquiries, listings, users } = useDB();
  return React.useMemo(() => {
    const out: Task[] = [];
    for (const i of inquiries) {
      if (i.providerId !== me.id || !OPEN_ORDER_STATUSES.includes(i.status)) continue;
      const listing = listings.find((l) => l.id === i.listingId);
      const buyer = users.find((u) => u.id === i.buyerId);
      const what = listing?.type === 'weight' ? formatKg(orderKg(i)) : `${(i.items ?? []).reduce((s, x) => s + x.quantity, 0)} item`;
      const name = buyer?.displayName.split(' ')[0] ?? 'Klien';
      const base = { inquiry: i, listing, buyer };
      if (i.status === 'pending') out.push({ ...base, icon: Inbox, title: `Jawab request ${name} · ${what}`, hint: 'Kuota ditahan sampai hold habis', tone: 'amber', rank: 0 });
      else if (i.status === 'accepted')
        out.push({ ...base, icon: Scale, title: `Catat serah terima ${name} · ${what}`, hint: listing?.orderDeadline ? `Drop-off ${formatCountdown(listing.orderDeadline)}` : 'Timbang dan foto barang', tone: 'teal', rank: 2 });
      else if (i.payment?.status === 'proof_uploaded') out.push({ ...base, icon: CreditCard, title: `Cek bukti bayar ${name}`, hint: `Tagihan ${formatMoneyGroups(inquiryTotals(i, listing))}`, tone: 'amber', rank: 1 });
      else if (i.status === 'handed_over') out.push({ ...base, icon: Plane, title: `Tandai dikirim · ${name}`, hint: i.payment?.status === 'paid' ? 'Sudah lunas' : 'Belum lunas', tone: 'navy', rank: 3 });
      else if (i.status === 'shipped') out.push({ ...base, icon: Truck, title: `Tandai sampai · ${name}`, hint: 'Setelah titipan diserahkan di tujuan', tone: 'navy', rank: 4 });
      else if (i.status === 'delivered') out.push({ ...base, icon: CheckCircle2, title: `Menunggu ${name} konfirmasi terima`, hint: 'Tidak perlu tindakan', tone: 'navy', rank: 5 });
    }
    return out.sort((a, b) => a.rank - b.rank || a.inquiry.createdAt.localeCompare(b.inquiry.createdAt));
  }, [inquiries, listings, users, me.id]);
}

function Dashboard({ me }: { me: User }) {
  const { inquiries } = useDB();
  const views = useListingViews();
  const plan = usePlanState(me.id);
  const trust = useTrust(me);
  const rating = useProviderRating(me.id);
  const tasks = useTasks(me);

  const trips = views.filter((v) => v.listing.ownerId === me.id && (v.status === 'open' || v.status === 'full'));
  const mine = inquiries.filter((i) => i.providerId === me.id);
  const pending = mine.filter((i) => i.status === 'pending').length;
  const running = mine.filter((i) => OPEN_ORDER_STATUSES.includes(i.status) && i.status !== 'pending').length;
  const unpaid = mine.filter((i) => typeof i.amountDue === 'number' && i.payment?.status !== 'paid' && OPEN_ORDER_STATUSES.includes(i.status)).length;
  const kg = trips.reduce((s, v) => (v.availability.type === 'weight' ? { used: s.used + v.availability.reserved, total: s.total + v.availability.total } : s), { used: 0, total: 0 });

  return (
    <div className="container py-6 sm:py-10">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-center gap-4">
          <Avatar user={me} size={56} />
          <div>
            <p className="text-sm font-semibold text-teal-700">Dashboard provider</p>
            <h1 className="text-[1.75rem] font-bold leading-tight text-navy sm:text-3xl">Halo, {me.displayName.split(' ')[0]}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              <VerificationLabel user={me} />
              {plan.pro && <ProBadge />}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link to="/my-listings">Trip saya</Link>
          </Button>
          <Button asChild variant="accent">
            <Link to="/post">
              <PlusCircle /> Pasang trip
            </Link>
          </Button>
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi to="/orders?tab=new" label="Request baru" value={String(pending)} warn={pending > 0} />
        <Kpi to="/orders?tab=active" label="Order berjalan" value={String(running)} />
        <Kpi to="/orders?tab=active" label="Belum lunas" value={String(unpaid)} warn={unpaid > 0} />
        <Kpi to="/my-listings" label="Bagasi terisi" value={kg.total ? `${formatKg(kg.used).replace(' kg', '')}/${formatKg(kg.total)}` : '-'} />
      </dl>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="min-w-0 space-y-8">
          <section aria-labelledby="todo-title">
            <div className="mb-3 flex items-end justify-between">
              <h2 id="todo-title" className="text-lg font-bold text-navy">
                Perlu tindakan <span className="num text-slate-400">({tasks.filter((t) => t.rank < 5).length})</span>
              </h2>
              <Link to="/orders" className="text-sm font-semibold text-teal-700 hover:underline">
                Semua request
              </Link>
            </div>
            {tasks.length ? (
              <ul className="divide-y divide-border overflow-hidden rounded-3xl bg-white shadow-card">
                {tasks.map((t) => (
                  <li key={t.inquiry.id}>
                    <Link to={`/orders/${t.inquiry.id}`} className="group flex items-center gap-3 p-4 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal-500">
                      <span
                        className={cn(
                          'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl [&_svg]:h-5 [&_svg]:w-5',
                          t.tone === 'amber' ? 'bg-amber-50 text-amber-700' : t.tone === 'teal' ? 'bg-teal-50 text-teal-700' : 'bg-slate-100 text-navy',
                        )}
                      >
                        <t.icon />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-navy">{t.title}</span>
                        <span className="flex flex-wrap items-center gap-x-2 text-[13px] text-slate-500">
                          {t.listing && (
                            <span className="truncate">
                              {t.listing.origin.city} → {t.listing.destination.city}
                            </span>
                          )}
                          {t.inquiry.status === 'pending' ? <HoldCountdown inquiry={t.inquiry} /> : <span>· {t.hint}</span>}
                        </span>
                      </span>
                      <ArrowRight className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5" />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState icon={<CheckCircle2 />} title="Semua beres" description="Belum ada request atau order yang menunggu Anda. Bagikan trip ke grup WhatsApp diaspora." className="py-8" />
            )}
          </section>

          <section aria-labelledby="trips-title">
            <div className="mb-3 flex items-end justify-between">
              <h2 id="trips-title" className="text-lg font-bold text-navy">
                Trip aktif <span className="num text-slate-400">({trips.length})</span>
              </h2>
              <Link to="/my-listings" className="text-sm font-semibold text-teal-700 hover:underline">
                Kelola
              </Link>
            </div>
            {trips.length ? (
              <ul className="grid gap-3 md:grid-cols-2">
                {trips.map((v) => (
                  <li key={v.listing.id}>
                    <TripTile view={v} orders={mine.filter((i) => i.listingId === v.listing.id)} />
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                icon={<Plane />}
                title="Belum ada trip aktif"
                description="Pulang kampung atau balik ke perantauan? Pasang trip gratis."
                action={
                  <Button asChild variant="accent">
                    <Link to="/post">
                      <PlusCircle /> Pasang trip
                    </Link>
                  </Button>
                }
                className="py-8"
              />
            )}
          </section>
        </div>

        <aside className="space-y-4">
          <Card className="space-y-4 p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-navy">Reputasi</p>
              <Link to={`/providers/${me.id}`} className="text-[13px] font-semibold text-teal-700 hover:underline">
                Profil publik
              </Link>
            </div>
            <p className="flex items-center gap-2 text-sm">
              <StarRating value={rating.average} size={15} />
              <span className="num font-bold text-navy">{rating.count ? rating.average.toFixed(1) : '-'}</span>
              <span className="text-slate-500">({rating.count} rating)</span>
            </p>
            {trust && <TrustMeter trust={trust} detailed />}
          </Card>
          <PromotePanel activeFree={trips.filter((v) => !v.listing.paidSlot).length} />
        </aside>
      </div>
    </div>
  );
}

function Kpi({ to, label, value, warn }: { to: string; label: string; value: string; warn?: boolean }) {
  return (
    <Link to={to} className={cn('rounded-3xl p-4 shadow-card transition hover:shadow-lift sm:p-5', warn ? 'bg-amber-50 ring-1 ring-amber-200' : 'bg-white')}>
      <dt className="text-xs font-semibold text-slate-500 sm:text-sm">{label}</dt>
      <dd className="num mt-1 truncate text-2xl font-extrabold text-navy sm:text-3xl">{value}</dd>
    </Link>
  );
}

function TripTile({ view, orders }: { view: ListingView; orders: Inquiry[] }) {
  const l = view.listing;
  const pending = orders.filter((i) => i.status === 'pending').length;
  return (
    <Card className="flex h-full flex-col gap-3 p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <Link to={`/listings/${l.id}`} className="line-clamp-1 font-bold text-navy hover:text-teal-700">
            {listingTitle(l)}
          </Link>
          <RouteDisplay listing={l} size="sm" className="text-slate-600" />
        </div>
        <ListingStatusBadge status={view.status} type={l.type} />
      </div>
      {l.departureDate && (
        <p className="flex items-center gap-1.5 text-[13px] text-slate-500">
          <CalendarDays className="h-4 w-4" /> {formatDate(l.departureDate)} · {formatCountdown(l.departureDate)}
        </p>
      )}
      <AvailabilityMeter view={view} />
      <p className="flex items-center gap-3 text-[13px] text-slate-500">
        <span className="flex items-center gap-1">
          <Package className="h-4 w-4" /> {orders.length} order
        </span>
        {pending > 0 && <span className="font-semibold text-amber-700">{pending} request baru</span>}
      </p>
      <div className="mt-auto flex flex-wrap gap-2">
        <Button asChild size="sm" variant="accent">
          <Link to={`/my-listings/${l.id}/orders`}>
            <FileSpreadsheet /> Order sheet
          </Link>
        </Button>
        <ShareTripButton view={view} size="sm" label="Bagikan" />
      </div>
    </Card>
  );
}
