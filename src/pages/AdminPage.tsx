import * as React from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, EyeOff, Flag, Inbox, LayoutList, MessageCircle, RotateCcw, Users, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import type { Report, ReportStatus } from '@/types';
import { Button } from '@/components/ui/button';
import { Badge, Card, Tabs } from '@/components/ui/misc';
import { Avatar, EmptyState, ListingStatusBadge, PageHeader } from '@/components/shared/display';
import { useConfirm } from '@/components/shared/ConfirmProvider';
import { RequireAdmin } from '@/components/layout/Guards';
import { useDB, useListingViews, usePageMeta } from '@/hooks/useStore';
import { setReportStatus } from '@/services/moderationService';
import { adminCloseListing, adminRestoreListing } from '@/services/listingService';
import { formatRelative } from '@/lib/format';

export function AdminPage() {
  usePageMeta('Panel Moderasi');
  return <RequireAdmin>{() => <AdminContent />}</RequireAdmin>;
}

function AdminContent() {
  const db = useDB();
  const views = useListingViews();
  const [tab, setTab] = React.useState<ReportStatus>('open');
  const reports = db.reports.filter((r) => r.status === tab).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const count = (s: ReportStatus) => db.reports.filter((r) => r.status === s).length;

  const stats = [
    { label: 'Pengguna', value: db.users.length, icon: <Users /> },
    { label: 'Listing buka', value: views.filter((v) => v.status === 'open').length, icon: <LayoutList /> },
    { label: 'Inquiry aktif', value: db.inquiries.filter((i) => i.status === 'pending' || i.status === 'accepted').length, icon: <Inbox /> },
    { label: 'Pesan', value: db.messages.length, icon: <MessageCircle /> },
    { label: 'Laporan terbuka', value: count('open'), icon: <Flag />, warn: count('open') > 0 },
  ];

  const statusCounts = ['open', 'full', 'closed', 'expired', 'draft'].map((s) => ({ s, n: views.filter((v) => v.status === s).length }));

  return (
    <div className="container py-6 sm:py-10">
      <PageHeader title="Panel Moderasi" description="Demo: tinjau laporan dan tutup listing yang melanggar. Tidak ada tindakan hukum atau verifikasi nyata." />
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {stats.map((s) => (
          <Card key={s.label} className={s.warn ? 'border-amber-300 bg-amber-50/60 p-4' : 'p-4'}>
            <dt className="flex items-center gap-2 text-xs font-semibold text-slate-500 [&_svg]:h-4 [&_svg]:w-4">
              {s.icon}
              {s.label}
            </dt>
            <dd className="mt-1 text-2xl font-extrabold text-navy">{s.value}</dd>
          </Card>
        ))}
      </dl>
      <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
        Status listing:
        {statusCounts.map(({ s, n }) => (
          <span key={s} className="flex items-center gap-1">
            <ListingStatusBadge status={s as never} /> {n}
          </span>
        ))}
      </div>

      <section className="mt-8" aria-labelledby="queue-title">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 id="queue-title" className="text-lg font-extrabold text-navy">
            Antrean laporan
          </h2>
          <Tabs
            label="Status laporan"
            value={tab}
            onChange={setTab}
            items={[
              { value: 'open', label: 'Terbuka', count: count('open') },
              { value: 'resolved', label: 'Diselesaikan', count: count('resolved') },
              { value: 'dismissed', label: 'Diabaikan', count: count('dismissed') },
            ]}
            className="w-full sm:w-auto"
          />
        </div>
        {reports.length ? (
          <ul className="space-y-3">
            {reports.map((r) => (
              <li key={r.id}>
                <ReportRow report={r} />
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState icon={<CheckCircle2 />} title="Tidak ada laporan" description="Antrean bersih untuk status ini." />
        )}
      </section>
    </div>
  );
}

function ReportRow({ report: r }: { report: Report }) {
  const { users } = useDB();
  const views = useListingViews();
  const confirm = useConfirm();
  const reporter = users.find((u) => u.id === r.reporterId);
  const listingView = r.targetType === 'listing' ? views.find((v) => v.listing.id === r.targetId) : undefined;
  const targetUser = r.targetType === 'user' ? users.find((u) => u.id === r.targetId) : undefined;

  const closeTarget = async () => {
    if (!listingView) return;
    if (
      !(await confirm({
        title: 'Tutup listing ini?',
        description: `“${listingView.listing.title}” akan ditutup dan pemilik diberi tahu. Pemilik tidak dapat membukanya kembali.`,
        confirmLabel: 'Tutup & selesaikan',
        destructive: true,
      }))
    )
      return;
    const a = adminCloseListing(listingView.listing.id, r.reason);
    if (!a.ok) return toast.error(a.error);
    setReportStatus(r.id, 'resolved');
    toast.success('Listing ditutup dan laporan diselesaikan');
  };

  const restore = () => {
    if (!listingView) return;
    const a = adminRestoreListing(listingView.listing.id);
    a.ok ? toast.success('Blokir moderator dicabut. Pemilik dapat membuka kembali listing.') : toast.error(a.error);
  };

  const mark = (s: ReportStatus, msg: string) => {
    const res = setReportStatus(r.id, s);
    res.ok ? toast.success(msg) : toast.error(res.error);
  };

  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="red">
              <Flag /> {r.reason}
            </Badge>
            <Badge tone="neutral">{r.targetType === 'listing' ? 'Listing' : 'Pengguna'}</Badge>
            <span className="text-xs text-slate-400">{formatRelative(r.createdAt)}</span>
          </div>
          {listingView && (
            <p className="text-sm">
              <Link to={`/listings/${listingView.listing.id}`} className="font-bold text-navy hover:text-teal-700">
                {listingView.listing.title}
              </Link>{' '}
              <ListingStatusBadge status={listingView.status} type={listingView.listing.type} />
              {listingView.listing.closedByAdmin && <Badge tone="red" className="ml-1">Ditutup moderator</Badge>}
            </p>
          )}
          {targetUser && (
            <Link to={`/providers/${targetUser.id}`} className="flex items-center gap-2 text-sm font-bold text-navy hover:text-teal-700">
              <Avatar user={targetUser} size={28} /> {targetUser.displayName}
            </Link>
          )}
          {!listingView && !targetUser && <p className="text-sm text-slate-500">Target sudah tidak ada.</p>}
          {r.description && <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">“{r.description}”</p>}
          <p className="text-xs text-slate-500">Dilaporkan oleh {reporter?.displayName ?? 'pengguna'}</p>
        </div>
        <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:flex-col sm:items-stretch">
          {r.status === 'open' ? (
            <>
              {listingView && listingView.status !== 'closed' && (
                <Button size="sm" variant="destructive" onClick={closeTarget}>
                  <EyeOff /> Tutup listing
                </Button>
              )}
              <Button size="sm" variant="outline" onClick={() => mark('resolved', 'Laporan diselesaikan')}>
                <CheckCircle2 /> Selesaikan
              </Button>
              <Button size="sm" variant="ghost" onClick={() => mark('dismissed', 'Laporan diabaikan')}>
                <XCircle /> Abaikan
              </Button>
            </>
          ) : (
            <>
              <Button size="sm" variant="outline" onClick={() => mark('open', 'Laporan dibuka kembali')}>
                <RotateCcw /> Buka lagi
              </Button>
              {listingView?.listing.closedByAdmin && (
                <Button size="sm" variant="ghost" onClick={restore}>
                  Cabut blokir
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    </Card>
  );
}
