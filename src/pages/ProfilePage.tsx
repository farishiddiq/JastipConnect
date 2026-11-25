import * as React from 'react';
import { Link } from 'react-router-dom';
import { Bookmark, ChevronRight, Database, ExternalLink, LayoutList, LogOut, Mail, MessageCircle, Package, Phone, Receipt, RotateCcw, ShieldCheck, Tag, Users } from 'lucide-react';
import { toast } from 'sonner';
import type { User } from '@/types';
import { Button } from '@/components/ui/button';
import { Field, Input, Select, Textarea } from '@/components/ui/form';
import { Card } from '@/components/ui/misc';
import { Avatar, PageHeader, ProBadge, TrustMeter, VerificationLabel } from '@/components/shared/display';
import { ModeToggle } from '@/components/layout/AppLayout';
import { useAuth } from '@/components/shared/AccountSwitcher';
import { useConfirm } from '@/components/shared/ConfirmProvider';
import { RequireUser } from '@/components/layout/Guards';
import { useDB, useMode, usePageMeta, usePlanState, useTrust } from '@/hooks/useStore';
import { logout, updateProfile, validateProfile } from '@/services/userService';
import { PLANS } from '@/lib/plans';
import { formatDate, formatMoney } from '@/lib/format';
import { store, storageAvailable } from '@/services/store';
import { COUNTRIES } from '@/data/locations';
import { formatDateTime } from '@/lib/format';
import { Badge } from '@/components/ui/misc';

export function ProfilePage() {
  usePageMeta('Profil & Pengaturan');
  return (
    <div className="container max-w-3xl py-6 sm:py-10">
      <RequireUser reason="Masuk untuk mengelola akun.">{(user) => <ProfileContent user={user} />}</RequireUser>
      <DemoSettings />
    </div>
  );
}

function ProfileContent({ user }: { user: User }) {
  const { openSwitcher, requireProvider } = useAuth();
  const mode = useMode();
  const plan = usePlanState(user.id);
  const trust = useTrust(user);
  const [form, setForm] = React.useState({ displayName: user.displayName, city: user.city ?? '', bio: user.bio ?? '', avatarUrl: user.avatarUrl ?? '' });
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  React.useEffect(() => {
    setForm({ displayName: user.displayName, city: user.city ?? '', bio: user.bio ?? '', avatarUrl: user.avatarUrl ?? '' });
    setErrors({});
  }, [user.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const dirty =
    form.displayName !== user.displayName || form.city !== (user.city ?? '') || form.bio !== (user.bio ?? '') || form.avatarUrl !== (user.avatarUrl ?? '');

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validateProfile(form);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    const r = updateProfile(user.id, form);
    r.ok ? toast.success('Profil diperbarui') : toast.error(r.error);
  };

  const cityKnown = COUNTRIES.some((c) => c.cities.includes(form.city));

  return (
    <>
      <PageHeader title="Akun" description="Profil dan pengaturan." />
      <Card className="mb-4 flex flex-wrap items-center gap-4 p-5">
        <Avatar user={{ ...user, avatarUrl: form.avatarUrl || undefined }} size={64} />
        <div className="min-w-0 flex-1">
          <p className="text-lg font-extrabold text-navy">{user.displayName}</p>
          {user.email && (
            <p className="flex items-center gap-1.5 text-[13px] text-slate-500">
              <Mail className="h-3.5 w-3.5" /> {user.email}
            </p>
          )}
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <VerificationLabel user={user} />
            {plan.pro && <ProBadge />}
            {user.role === 'admin' && <span className="text-xs font-semibold text-teal-700">Moderator demo</span>}
          </div>
        </div>
        <ModeToggle />
      </Card>

      {user.phoneVerifiedAt ? (
        <ProviderCard user={user} plan={plan} trust={trust} />
      ) : (
        <Card className="mb-4 flex flex-wrap items-center gap-4 p-5">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-teal-50 text-teal-700">
            <Phone className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-bold text-navy">Mau jadi jastiper?</p>
            <p className="text-sm text-slate-500">Pulang kampung dengan bagasi longgar? Aktifkan mode provider gratis dengan verifikasi WhatsApp.</p>
          </div>
          <Button variant="accent" onClick={() => requireProvider('Aktifkan mode provider.')}>
            Aktifkan mode provider
          </Button>
        </Card>
      )}

      <nav aria-label="Pintasan akun" className="mb-6 grid gap-2 sm:grid-cols-2">
        <Shortcut to="/orders" icon={<Package />} label={mode === 'provider' ? 'Request masuk' : 'Pesanan saya'} />
        {user.phoneVerifiedAt && <Shortcut to="/my-listings" icon={<LayoutList />} label="Trip saya" />}
        <Shortcut to="/inbox" icon={<MessageCircle />} label="Inbox" />
        <Shortcut to="/saved" icon={<Bookmark />} label="Disimpan" />
        <Shortcut to={`/providers/${user.id}`} icon={<ExternalLink />} label="Lihat profil publik" />
        {user.role === 'admin' && <Shortcut to="/admin" icon={<ShieldCheck />} label="Panel Moderasi" />}
      </nav>

      <Card className="p-5 sm:p-6">
        <h2 className="mb-4 text-lg font-bold text-navy">Edit profil publik</h2>
        <form onSubmit={save} noValidate className="space-y-4">
          <Field id="pf-name" label="Nama tampilan" required error={errors.displayName}>
            <Input value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} maxLength={40} />
          </Field>
          <Field id="pf-city" label="Kota saat ini" hint="Hanya kota.">
            <Select value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })}>
              <option value="">Pilih kota</option>
              {!cityKnown && form.city && <option value={form.city}>{form.city}</option>}
              {COUNTRIES.map((c) => (
                <optgroup key={c.code} label={c.name}>
                  {c.cities.map((ct) => (
                    <option key={ct} value={ct}>
                      {ct}
                    </option>
                  ))}
                </optgroup>
              ))}
            </Select>
          </Field>
          <Field id="pf-bio" label="Bio singkat" error={errors.bio} hint={`${form.bio.length}/300`}>
            <Textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} maxLength={300} />
          </Field>
          <Field id="pf-avatar" label="URL foto profil" error={errors.avatarUrl} hint="Opsional.">
            <Input type="url" value={form.avatarUrl} onChange={(e) => setForm({ ...form, avatarUrl: e.target.value })} placeholder="https://…" />
          </Field>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={!dirty}>
              Simpan profil
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                logout();
                toast('Anda sudah keluar.');
              }}
            >
              <LogOut /> Keluar
            </Button>
            <Button variant="ghost" onClick={() => openSwitcher()}>
              <Users /> Akun demo
            </Button>
          </div>
        </form>
      </Card>
    </>
  );
}

function ProviderCard({ user, plan, trust }: { user: User; plan: ReturnType<typeof usePlanState>; trust: ReturnType<typeof useTrust> }) {
  const { purchases, listings } = useDB();
  const mine = purchases.filter((p) => p.userId === user.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return (
    <Card id="paket" className="mb-4 scroll-mt-24 p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-navy">Akun provider</h2>
          <p className="text-sm text-slate-500">
            WhatsApp {user.phone} · provider sejak {formatDate((user.providerSince ?? user.phoneVerifiedAt ?? user.joinedAt).slice(0, 10))}
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link to="/harga">
            <Tag /> Paket
          </Link>
        </Button>
      </div>
      <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl bg-slate-50 p-3">
          <dd className="text-sm font-extrabold text-navy">{plan.pro ? `s/d ${formatDate(plan.pro.slice(0, 10))}` : 'Gratis'}</dd>
          <dt className="text-[11px] text-slate-500">Paket</dt>
        </div>
        <div className="rounded-xl bg-slate-50 p-3">
          <dd className="text-sm font-extrabold text-navy">{plan.credits}</dd>
          <dt className="text-[11px] text-slate-500">Slot listing</dt>
        </div>
        <div className="rounded-xl bg-slate-50 p-3">
          <dd className="text-sm font-extrabold text-navy">{plan.promoted ? `s/d ${formatDate(plan.promoted.slice(0, 10))}` : '-'}</dd>
          <dt className="text-[11px] text-slate-500">Promoted</dt>
        </div>
      </dl>
      {trust && <TrustMeter trust={trust} detailed className="mt-5 rounded-2xl border border-border p-4" />}
      <h3 className="mt-6 flex items-center gap-2 text-sm font-bold text-navy">
        <Receipt className="h-4 w-4" /> Riwayat pembelian
      </h3>
      {mine.length ? (
        <ul className="mt-2 divide-y divide-border text-sm">
          {mine.map((p) => {
            const l = listings.find((x) => x.id === p.listingId);
            const live = !p.expiresAt || new Date(p.expiresAt).getTime() > Date.now();
            return (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                <span className="min-w-0">
                  <span className="font-semibold text-navy">{PLANS[p.kind].name}</span>
                  {l && <span className="text-slate-500"> · {l.origin.city} → {l.destination.city}</span>}
                  <span className="block text-xs text-slate-400">
                    {formatDateTime(p.createdAt)} · {p.method.toUpperCase()}
                    {p.expiresAt && ` · sampai ${formatDate(p.expiresAt.slice(0, 10))}`}
                  </span>
                </span>
                <span className="flex items-center gap-2">
                  <span className="num font-semibold text-navy">{formatMoney(p.amountIdr, 'IDR')}</span>
                  <Badge tone={live ? 'green' : 'muted'}>{p.credits ? `${p.credits} slot` : live ? 'Aktif' : 'Berakhir'}</Badge>
                </span>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-slate-500">Belum ada pembelian. Semua fitur inti gratis.</p>
      )}
      <p className="mt-3 text-[11px] text-slate-400">Pembayaran simulasi, tidak ada tagihan sungguhan.</p>
    </Card>
  );
}

function Shortcut({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      to={to}
      className="flex min-h-[52px] items-center gap-3 rounded-2xl border border-border bg-white px-4 text-sm font-semibold text-navy shadow-card transition-colors hover:border-teal-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 [&>svg:first-child]:h-5 [&>svg:first-child]:w-5 [&>svg:first-child]:text-teal-600"
    >
      {icon}
      <span className="flex-1">{label}</span>
      <ChevronRight className="h-4 w-4 text-slate-400" />
    </Link>
  );
}

function DemoSettings() {
  const confirm = useConfirm();
  const db = useDB();
  const counts = [
    ['Pengguna', db.users.length],
    ['Listing', db.listings.length],
    ['Order', db.inquiries.length],
    ['Pesan', db.messages.length],
    ['Ulasan', db.reviews.length],
    ['Laporan', db.reports.length],
    ['Pembelian', db.purchases.length],
  ] as const;

  const reset = async () => {
    const ok = await confirm({
      title: 'Reset semua data demo?',
      description:
        'Semua data di browser ini diganti data contoh awal. Tidak dapat dibatalkan.',
      confirmLabel: 'Ya, reset data',
      destructive: true,
    });
    if (!ok) return;
    store.resetDemoData();
    toast.success('Data demo dikembalikan ke kondisi awal');
  };

  return (
    <>
    <Card className="mt-6 p-5 sm:p-6">
      <h2 className="flex items-center gap-2 text-lg font-bold text-navy">
        <Database className="h-5 w-5 text-teal-600" /> Data demo
      </h2>
      <p className="mt-1 text-sm text-slate-500">
        Semua data disimpan di <code className="rounded bg-slate-100 px-1 text-[13px]">localStorage</code> browser ini dengan namespace{' '}
        <code className="rounded bg-slate-100 px-1 text-[13px]">jc:v1:*</code>. Tidak ada server, tidak tersinkron ke perangkat lain.
        {!storageAvailable && <b className="text-red-600"> localStorage tidak tersedia, data hanya di memori.</b>}
      </p>
      <dl className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-7">
        {counts.map(([label, n]) => (
          <div key={label} className="rounded-xl bg-slate-50 p-2 text-center">
            <dd className="text-lg font-extrabold text-navy">{n}</dd>
            <dt className="text-[11px] text-slate-500">{label}</dt>
          </div>
        ))}
      </dl>
      {db.settings.seededAt && <p className="mt-3 text-xs text-slate-400">Data contoh dibuat: {formatDateTime(db.settings.seededAt)}</p>}
      <div className="mt-5 rounded-2xl border border-red-200 bg-red-50/60 p-4">
        <p className="font-semibold text-red-800">Reset Data Demo</p>
        <p className="mt-1 text-[13px] text-red-700/90">Kembalikan ke data awal.</p>
        <Button variant="destructive" className="mt-3" onClick={reset}>
          <RotateCcw /> Reset Data Demo
        </Button>
      </div>
    </Card>
    </>
  );
}
