import * as React from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, EyeOff, Flag, Handshake, Inbox, LayoutList, MessageCircle, Receipt, RotateCcw, Ticket, Users, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import type { Report, ReportStatus } from '@/types';
import { Button } from '@/components/ui/button';
import { Badge, Card, Tabs } from '@/components/ui/misc';
import { Avatar, EmptyState, ListingStatusBadge, PageHeader } from '@/components/shared/display';
import { useConfirm } from '@/components/shared/ConfirmProvider';
import { RequireAdmin } from '@/components/layout/Guards';
import { useDB, useListingViews, usePageMeta } from '@/hooks/useStore';
import { setReportStatus } from '@/services/moderationService';
import { adminCloseListing, adminRestoreListing, reviewTicketProof } from '@/services/listingService';
import { markLeadContacted } from '@/services/purchaseService';
import { OPEN_ORDER_STATUSES } from '@/lib/availability';
import { PLANS } from '@/lib/plans';
import { formatDate, formatMoney, formatRelative, listingTitle } from '@/lib/format';
import { Input } from '@/components/ui/form';

export function AdminPage() {
  usePageMeta('Panel Moderasi');
  return <RequireAdmin>{() => <AdminContent />}</RequireAdmin>;
}

type Section = 'reports' | 'tickets' | 'leads' | 'revenue';

function AdminContent() {
  const db = useDB();
  const views = useListingViews();
  const [params, setParams] = useSearchParams();
  const sp = params.get('tab') as Section | null;
  const section: Section = sp && ['reports', 'tickets', 'leads', 'revenue'].includes(sp) ? sp : 'reports';
  const [tab, setTab] = React.useState<ReportStatus>('open');
  const pendingTickets = db.listings.filter((l) => l.ticketProof?.status === 'pending').length;
  const newLeads = db.leads.filter((l) => l.status === 'new').length;
  const reports = db.reports.filter((r) => r.status === tab).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const count = (s: ReportStatus) => db.reports.filter((r) => r.status === s).length;

  const stats = [
    { label: 'Pengguna', value: db.users.length, icon: <Users /> },
    { label: 'Listing buka', value: views.filter((v) => v.status === 'open').length, icon: <LayoutList /> },
    { label: 'Order berjalan', value: db.inquiries.filter((i) => OPEN_ORDER_STATUSES.includes(i.status)).length, icon: <Inbox /> },
    { label: 'Pesan', value: db.messages.length, icon: <MessageCircle /> },
    { label: 'Laporan terbuka', value: count('open'), icon: <Flag />, warn: count('open') > 0 },
  ];

  const statusCounts = ['open', 'full', 'closed', 'expired', 'draft'].map((s) => ({ s, n: views.filter((v) => v.status === s).length }));

  return (
    <div className="container py-6 sm:py-10">
      <PageHeader title="Panel Moderasi" description="Tinjau laporan, verifikasi tiket, dan pantau pendapatan." />
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

      <Tabs
        label="Bagian panel"
        value={section}
        onChange={(v) => setParams({ tab: v }, { replace: true })}
        items={[
          { value: 'reports', label: 'Laporan', count: count('open') },
          { value: 'tickets', label: 'Verifikasi tiket', count: pendingTickets },
          { value: 'leads', label: 'Kerja sama', count: newLeads },
          { value: 'revenue', label: 'Pendapatan' },
        ]}
        className="mt-8 sm:max-w-2xl"
      />
      {section === 'tickets' && <TicketQueue />}
      {section === 'leads' && <LeadList />}
      {section === 'revenue' && <Revenue />}
      {section === 'reports' && (
      <section className="mt-6" aria-labelledby="queue-title">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 id="queue-title" className="text-lg font-bold text-navy">
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
      )}
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
    a.ok ? toast.success('Blokir dicabut.') : toast.error(a.error);
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

function TicketQueue() {
  const { listings, users } = useDB();
  const [notes, setNotes] = React.useState<Record<string, string>>({});
  const queue = listings
    .filter((l) => l.ticketProof)
    .sort((a, b) => Number(b.ticketProof!.status === 'pending') - Number(a.ticketProof!.status === 'pending') || b.ticketProof!.uploadedAt.localeCompare(a.ticketProof!.uploadedAt));
  const act = (id: string, approve: boolean) => {
    const r = reviewTicketProof(id, approve, notes[id]);
    r.ok ? toast.success(approve ? 'Trip diverifikasi' : 'Bukti ditolak') : toast.error(r.error);
  };
  if (!queue.length) return <EmptyState className="mt-6" icon={<Ticket />} title="Belum ada bukti tiket" />;
  return (
    <ul className="mt-6 grid gap-3 md:grid-cols-2">
      {queue.map((l) => {
        const p = l.ticketProof!;
        const owner = users.find((u) => u.id === l.ownerId);
        return (
          <li key={l.id}>
            <Card className="flex h-full flex-col gap-3 p-4">
              <div className="flex items-start gap-3">
                <a href={p.imageUrl} target="_blank" rel="noreferrer" className="shrink-0">
                  <img src={p.imageUrl} alt="Bukti tiket" className="h-24 w-36 rounded-xl bg-slate-100 object-contain ring-1 ring-border" />
                </a>
                <div className="min-w-0 space-y-1 text-sm">
                  <Link to={`/listings/${l.id}`} className="font-bold text-navy hover:text-teal-700">
                    {listingTitle(l)}
                  </Link>
                  <p className="text-slate-600">
                    {l.origin.city} → {l.destination.city}
                    {l.departureDate && ` · ${formatDate(l.departureDate)}`}
                  </p>
                  <p className="text-xs text-slate-500">
                    {owner?.displayName} · diunggah {formatRelative(p.uploadedAt)}
                  </p>
                  <Badge tone={p.status === 'approved' ? 'green' : p.status === 'rejected' ? 'red' : 'amber'}>
                    {p.status === 'approved' ? 'Disetujui' : p.status === 'rejected' ? 'Ditolak' : 'Menunggu'}
                  </Badge>
                </div>
              </div>
              <p className="text-xs text-slate-500">Cocokkan nama, rute, dan tanggal dengan listing. Tolak bila tampak diedit.</p>
              {p.status === 'pending' ? (
                <div className="mt-auto flex flex-wrap gap-2">
                  <Input
                    aria-label="Catatan penolakan"
                    placeholder="Catatan bila ditolak"
                    value={notes[l.id] ?? ''}
                    onChange={(e) => setNotes({ ...notes, [l.id]: e.target.value })}
                    className="h-9 min-w-0 flex-1 text-sm"
                  />
                  <Button size="sm" variant="accent" onClick={() => act(l.id, true)}>
                    <CheckCircle2 /> Setujui
                  </Button>
                  <Button size="sm" variant="destructive-outline" onClick={() => act(l.id, false)}>
                    <XCircle /> Tolak
                  </Button>
                </div>
              ) : (
                p.note && <p className="text-xs text-slate-500">Catatan: {p.note}</p>
              )}
            </Card>
          </li>
        );
      })}
    </ul>
  );
}

function LeadList() {
  const { leads } = useDB();
  if (!leads.length) return <EmptyState className="mt-6" icon={<Handshake />} title="Belum ada pengajuan kerja sama" />;
  return (
    <ul className="mt-6 space-y-3">
      {leads.map((l) => (
        <li key={l.id}>
          <Card className="flex flex-wrap items-start gap-3 p-4">
            <div className="min-w-0 flex-1 text-sm">
              <p className="font-bold text-navy">
                {l.brand} <span className="font-normal text-slate-500">· {l.name}</span>
              </p>
              <p className="text-slate-500">{l.contact}</p>
              <p className="mt-2 rounded-xl bg-slate-50 p-3 text-slate-600">{l.message}</p>
              <p className="mt-1 text-xs text-slate-400">{formatRelative(l.createdAt)}</p>
            </div>
            {l.status === 'new' ? (
              <Button size="sm" variant="outline" onClick={() => markLeadContacted(l.id)}>
                Tandai sudah dihubungi
              </Button>
            ) : (
              <Badge tone="green">Sudah dihubungi</Badge>
            )}
          </Card>
        </li>
      ))}
    </ul>
  );
}

function Revenue() {
  const { purchases, users } = useDB();
  const total = purchases.reduce((s, p) => s + p.amountIdr, 0);
  const byKind = Object.values(PLANS).map((pl) => {
    const list = purchases.filter((p) => p.kind === pl.kind);
    return { name: pl.name, n: list.length, sum: list.reduce((s, p) => s + p.amountIdr, 0) };
  });
  return (
    <section className="mt-6 space-y-4">
      <Card className="p-5">
        <p className="flex items-center gap-2 text-sm font-semibold text-slate-500">
          <Receipt className="h-4 w-4" /> Total pendapatan (simulasi)
        </p>
        <p className="num mt-1 text-3xl font-extrabold text-navy">{formatMoney(total, 'IDR')}</p>
        <p className="text-xs text-slate-400">{purchases.length} transaksi · tidak ada uang sungguhan</p>
      </Card>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {byKind.map((k) => (
          <Card key={k.name} className="p-4">
            <p className="text-xs font-semibold text-slate-500">{k.name}</p>
            <p className="num mt-1 text-lg font-extrabold text-navy">{formatMoney(k.sum, 'IDR')}</p>
            <p className="text-xs text-slate-400">{k.n} pembelian</p>
          </Card>
        ))}
      </div>
      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="border-b border-border bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Provider</th>
              <th className="px-4 py-3">Paket</th>
              <th className="px-4 py-3">Jumlah</th>
              <th className="px-4 py-3">Waktu</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {[...purchases]
              .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
              .map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-2.5 font-semibold text-navy">{users.find((u) => u.id === p.userId)?.displayName ?? '-'}</td>
                  <td className="px-4 py-2.5">{PLANS[p.kind].name}</td>
                  <td className="num px-4 py-2.5">{formatMoney(p.amountIdr, 'IDR')}</td>
                  <td className="px-4 py-2.5 text-slate-500">{formatRelative(p.createdAt)}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </Card>
    </section>
  );
}
