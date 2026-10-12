import * as React from 'react';
import { Link } from 'react-router-dom';
import { Bookmark, ChevronRight, Database, ExternalLink, LayoutList, LogOut, MessageCircle, RotateCcw, ShieldCheck, Users } from 'lucide-react';
import { toast } from 'sonner';
import type { User } from '@/types';
import { Button } from '@/components/ui/button';
import { Field, Input, Select, Textarea } from '@/components/ui/form';
import { Card } from '@/components/ui/misc';
import { Avatar, PageHeader, VerificationLabel } from '@/components/shared/display';
import { useAuth } from '@/components/shared/AccountSwitcher';
import { useConfirm } from '@/components/shared/ConfirmProvider';
import { RequireUser } from '@/components/layout/Guards';
import { useDB, usePageMeta } from '@/hooks/useStore';
import { switchAccount, updateProfile, validateProfile } from '@/services/userService';
import { store, storageAvailable } from '@/services/store';
import { COUNTRIES } from '@/data/locations';
import { formatDateTime } from '@/lib/format';

export function ProfilePage() {
  usePageMeta('Profil & Pengaturan');
  return (
    <div className="container max-w-3xl py-6 sm:py-10">
      <RequireUser reason="Pilih akun demo untuk mengelola profil. Anda tetap bisa mereset data demo di bawah.">{(user) => <ProfileContent user={user} />}</RequireUser>
      <DemoSettings />
    </div>
  );
}

function ProfileContent({ user }: { user: User }) {
  const { openSwitcher } = useAuth();
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
      <PageHeader title="Akun" description="Profil demo Anda dan pengaturan aplikasi." />
      <Card className="mb-4 flex flex-wrap items-center gap-4 p-5">
        <Avatar user={{ ...user, avatarUrl: form.avatarUrl || undefined }} size={64} />
        <div className="min-w-0 flex-1">
          <p className="text-lg font-extrabold text-navy">{user.displayName}</p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <VerificationLabel user={user} />
            {user.role === 'admin' && <span className="text-xs font-semibold text-teal-700">Moderator demo</span>}
          </div>
        </div>
        <Button variant="outline" onClick={() => openSwitcher()}>
          <Users /> Ganti akun
        </Button>
      </Card>

      <nav aria-label="Pintasan akun" className="mb-6 grid gap-2 sm:grid-cols-2">
        <Shortcut to="/my-listings" icon={<LayoutList />} label="Listing Saya" />
        <Shortcut to="/inbox" icon={<MessageCircle />} label="Inbox" />
        <Shortcut to="/saved" icon={<Bookmark />} label="Disimpan" />
        <Shortcut to={`/providers/${user.id}`} icon={<ExternalLink />} label="Lihat profil publik" />
        {user.role === 'admin' && <Shortcut to="/admin" icon={<ShieldCheck />} label="Panel Moderasi" />}
      </nav>

      <Card className="p-5 sm:p-6">
        <h2 className="mb-4 text-lg font-extrabold text-navy">Edit profil publik</h2>
        <form onSubmit={save} noValidate className="space-y-4">
          <Field id="pf-name" label="Nama tampilan" required error={errors.displayName}>
            <Input value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} maxLength={40} />
          </Field>
          <Field id="pf-city" label="Kota saat ini" hint="Hanya kota — jangan cantumkan alamat lengkap.">
            <Select value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })}>
              <option value="">—</option>
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
          <Field id="pf-avatar" label="URL foto profil" error={errors.avatarUrl} hint="Opsional. Tanpa foto, kami tampilkan inisial.">
            <Input type="url" value={form.avatarUrl} onChange={(e) => setForm({ ...form, avatarUrl: e.target.value })} placeholder="https://…" />
          </Field>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={!dirty}>
              Simpan profil
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                switchAccount(null);
                toast('Anda keluar dari akun demo.');
              }}
            >
              <LogOut /> Keluar
            </Button>
          </div>
        </form>
      </Card>
    </>
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
    ['Inquiry', db.inquiries.length],
    ['Pesan', db.messages.length],
    ['Ulasan', db.reviews.length],
    ['Laporan', db.reports.length],
  ] as const;

  const reset = async () => {
    const ok = await confirm({
      title: 'Reset semua data demo?',
      description:
        'Semua listing, inquiry, pesan, ulasan, laporan, dan profil yang Anda buat di browser ini akan dihapus dan diganti dengan data contoh awal. Tindakan ini tidak dapat dibatalkan.',
      confirmLabel: 'Ya, reset data',
      destructive: true,
    });
    if (!ok) return;
    store.resetDemoData();
    toast.success('Data demo dikembalikan ke kondisi awal');
  };

  return (
    <Card className="mt-6 p-5 sm:p-6">
      <h2 className="flex items-center gap-2 text-lg font-extrabold text-navy">
        <Database className="h-5 w-5 text-teal-600" /> Data demo
      </h2>
      <p className="mt-1 text-sm text-slate-500">
        Semua data disimpan di <code className="rounded bg-slate-100 px-1 text-[13px]">localStorage</code> browser ini dengan namespace{' '}
        <code className="rounded bg-slate-100 px-1 text-[13px]">jc:v1:*</code>. Tidak ada server, tidak tersinkron ke perangkat lain.
        {!storageAvailable && <b className="text-red-600"> localStorage tidak tersedia — data hanya di memori.</b>}
      </p>
      <dl className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-6">
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
        <p className="mt-1 text-[13px] text-red-700/90">Mengembalikan semua data ke kondisi awal (seed). Berguna sebelum presentasi.</p>
        <Button variant="destructive" className="mt-3" onClick={reset}>
          <RotateCcw /> Reset Data Demo
        </Button>
      </div>
    </Card>
  );
}
