import * as React from 'react';
import { Link, useParams } from 'react-router-dom';
import { CalendarDays, CheckCircle2, MapPin, Pencil, Star, UserX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, Tabs } from '@/components/ui/misc';
import { Avatar, EmptyState, StarRating, VerificationLabel } from '@/components/shared/display';
import { ReportButton } from '@/components/shared/ReportDialog';
import { ListingGrid } from '@/components/listings/ListingCard';
import { useCompletedCount, useCurrentUser, useDB, useListingViews, usePageMeta, useProviderRating, useUser } from '@/hooks/useStore';
import { formatDate, formatMonthYear } from '@/lib/format';

export function ProviderProfilePage() {
  const { id } = useParams();
  const user = useUser(id);
  const me = useCurrentUser();
  const views = useListingViews();
  const rating = useProviderRating(id);
  const completed = useCompletedCount(id);
  const { users } = useDB();
  const [tab, setTab] = React.useState<'active' | 'history'>('active');

  usePageMeta(user ? `${user.displayName}, penyedia jastip` : 'Profil tidak ditemukan', user?.bio);

  if (!user) {
    return (
      <div className="container max-w-lg py-16">
        <EmptyState icon={<UserX />} title="Profil tidak ditemukan" action={<Button asChild><Link to="/explore">Jelajahi listing</Link></Button>} />
      </div>
    );
  }

  const theirs = views.filter((v) => v.listing.ownerId === user.id && v.status !== 'draft');
  const active = theirs.filter((v) => v.status === 'open');
  const history = theirs.filter((v) => v.status !== 'open');
  const distribution = [5, 4, 3, 2, 1].map((s) => ({ s, n: rating.reviews.filter((r) => r.rating === s).length }));
  const isMe = me?.id === user.id;

  return (
    <div className="container py-6 sm:py-10">
      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <aside className="space-y-4">
          <Card className="p-6 text-center">
            <Avatar user={user} size={96} className="mx-auto" />
            <h1 className="mt-4 text-xl font-bold text-navy">{user.displayName}</h1>
            <div className="mt-2 flex justify-center">
              <VerificationLabel user={user} />
            </div>
            <div className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1 text-sm text-slate-500">
              <span className="flex items-center gap-1">
                <MapPin className="h-4 w-4" /> {user.city ?? '-'}
              </span>
              <span className="flex items-center gap-1">
                <CalendarDays className="h-4 w-4" /> Sejak {formatMonthYear(user.joinedAt)}
              </span>
            </div>
            {user.bio && <p className="mt-4 text-sm leading-relaxed text-slate-600">{user.bio}</p>}
            <div className="mt-5 grid grid-cols-3 gap-2 text-center">
              <Stat value={rating.count ? rating.average.toFixed(1) : '-'} label="rating" />
              <Stat value={String(completed)} label="selesai" />
              <Stat value={String(active.length)} label="aktif" />
            </div>
            <div className="mt-5 flex justify-center gap-2">
              {isMe ? (
                <Button asChild variant="outline" size="sm">
                  <Link to="/profile">
                    <Pencil /> Edit profil
                  </Link>
                </Button>
              ) : (
                <ReportButton targetType="user" targetId={user.id} targetLabel={user.displayName} />
              )}
            </div>
          </Card>
          <p className="px-2 text-xs leading-relaxed text-slate-400">
            Kontak dan alamat tidak ditampilkan. {user.demoVerified ? '“Verifikasi demo” hanya label contoh.' : ''}
          </p>
        </aside>

        <div className="min-w-0 space-y-8">
          <section aria-labelledby="listings-title">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 id="listings-title" className="text-lg font-bold text-navy">
                Listing
              </h2>
              <Tabs
                label="Listing penyedia"
                value={tab}
                onChange={setTab}
                items={[
                  { value: 'active', label: 'Aktif', count: active.length },
                  { value: 'history', label: 'Riwayat', count: history.length },
                ]}
                className="w-full sm:w-auto"
              />
            </div>
            {(tab === 'active' ? active : history).length ? (
              <ListingGrid views={tab === 'active' ? active : history} />
            ) : (
              <EmptyState icon={<CheckCircle2 />} title={tab === 'active' ? 'Tidak ada listing aktif' : 'Belum ada riwayat'} className="py-8" />
            )}
          </section>

          <section aria-labelledby="reviews-title">
            <h2 id="reviews-title" className="mb-4 text-lg font-bold text-navy">
              Ulasan ({rating.count})
            </h2>
            {rating.count ? (
              <div className="grid gap-4 md:grid-cols-[220px_1fr]">
                <Card className="p-5 text-center md:self-start">
                  <p className="text-4xl font-extrabold text-navy">{rating.average.toFixed(1)}</p>
                  <StarRating value={rating.average} className="mt-1" />
                  <p className="mt-1 text-xs text-slate-500">{rating.count} ulasan</p>
                  <ul className="mt-4 space-y-1">
                    {distribution.map(({ s, n }) => (
                      <li key={s} className="flex items-center gap-2 text-xs text-slate-500">
                        <span className="w-3">{s}</span>
                        <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                        <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                          <span className="block h-full rounded-full bg-amber-400" style={{ width: `${(n / rating.count) * 100}%` }} />
                        </span>
                        <span className="w-4 text-right">{n}</span>
                      </li>
                    ))}
                  </ul>
                </Card>
                <ul className="space-y-3">
                  {rating.reviews.map((r) => {
                    const buyer = users.find((u) => u.id === r.buyerId);
                    return (
                      <li key={r.id}>
                        <Card className="p-4">
                          <div className="flex items-center gap-3">
                            <Avatar user={buyer} size={36} />
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-bold text-navy">{buyer?.displayName ?? 'Pengguna'}</p>
                              <p className="text-xs text-slate-400">{formatDate(r.createdAt.slice(0, 10))}</p>
                            </div>
                            <StarRating value={r.rating} size={14} />
                          </div>
                          <p className="mt-3 text-sm leading-relaxed text-slate-600">{r.comment}</p>
                        </Card>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : (
              <EmptyState icon={<Star />} title="Belum ada ulasan" description="Ulasan muncul setelah transaksi selesai." className="py-8" />
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-2">
      <p className="text-lg font-extrabold text-navy">{value}</p>
      <p className="text-xs text-slate-500">{label}</p>
    </div>
  );
}
