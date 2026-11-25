import * as React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Check, FlaskConical, Mail, MailOpen, MessageCircle, Phone, ShieldCheck, UserPlus, Users } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox, Field, Input, Select } from '@/components/ui/form';
import { Badge } from '@/components/ui/misc';
import { Avatar } from './display';
import { useCurrentUser, useDB } from '@/hooks/useStore';
import { store } from '@/services/store';
import {
  activateProvider,
  createLocalProfile,
  openMagicLink,
  requestOtp,
  sendMagicLink,
  setMode,
  signUpWithMagicLink,
  switchAccount,
} from '@/services/userService';
import { CLIENT_IDS, PROVIDER_IDS } from '@/data/seed';
import { COUNTRIES } from '@/data/locations';
import { cn } from '@/lib/utils';

type Done = (userId: string) => void;

type AuthContextValue = {
  /** Opens the demo account switcher (kept for demos and testing). */
  openSwitcher: (reason?: string) => void;
  /** Opens the magic-link sign-in. `onDone` runs once the person is signed in. */
  openAuth: (reason?: string, onDone?: Done) => void;
  /** Returns the current user id, or opens sign-in and returns null for guests. */
  requireUser: (reason?: string, onDone?: Done) => string | null;
  /** Makes sure the person is a signed-in provider in provider mode, then runs `onReady`. */
  requireProvider: (reason?: string, onReady?: Done) => string | null;
};

const AuthContext = React.createContext<AuthContextValue>({
  openSwitcher: () => {},
  openAuth: () => {},
  requireUser: () => null,
  requireProvider: () => null,
});
export const useAuth = () => React.useContext(AuthContext);


export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [dialog, setDialog] = React.useState<'auth' | 'switcher' | 'provider' | null>(null);
  const [reason, setReason] = React.useState<string | undefined>();
  const after = React.useRef<Done | undefined>();
  const wantsProvider = React.useRef(false);
  const user = useCurrentUser();

  const finish = React.useCallback((uid: string) => {
    if (wantsProvider.current) {
      const u = store.getState().users.find((x) => x.id === uid);
      if (!u?.phoneVerifiedAt) {
        setDialog('provider');
        return;
      }
      setMode('provider');
    }
    setDialog(null);
    const fn = after.current;
    after.current = undefined;
    wantsProvider.current = false;
    // Let the dialog close before the next step opens its own UI.
    if (fn) setTimeout(() => fn(uid), 0);
  }, []);

  const value = React.useMemo<AuthContextValue>(() => {
    const openAuth = (r?: string, onDone?: Done) => {
      setReason(r);
      after.current = onDone;
      setDialog('auth');
    };
    return {
      openSwitcher: (r) => {
        setReason(r);
        setDialog('switcher');
      },
      openAuth,
      requireUser: (r, onDone) => {
        if (user) return user.id;
        wantsProvider.current = false;
        openAuth(r ?? 'Masuk untuk melanjutkan.', onDone);
        return null;
      },
      requireProvider: (r, onReady) => {
        wantsProvider.current = true;
        after.current = onReady;
        setReason(r);
        if (!user) {
          setDialog('auth');
          return null;
        }
        if (!user.phoneVerifiedAt) {
          setDialog('provider');
          return null;
        }
        wantsProvider.current = false;
        after.current = undefined;
        if (store.getState().session.mode !== 'provider') setMode('provider');
        return user.id;
      },
    };
  }, [user]);

  const close = (o: boolean) => {
    if (o) return;
    setDialog(null);
    after.current = undefined;
    wantsProvider.current = false;
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
      <MagicLinkDialog
        open={dialog === 'auth'}
        onOpenChange={close}
        reason={reason}
        onDone={finish}
        onUseDemo={() => setDialog('switcher')}
      />
      <AccountSwitcherDialog open={dialog === 'switcher'} onOpenChange={close} reason={reason} onDone={finish} />
      <ProviderActivationDialog open={dialog === 'provider'} onOpenChange={close} reason={reason} onDone={finish} />
    </AuthContext.Provider>
  );
}

/* ---------- Magic link sign-in / sign-up ---------- */

function MagicLinkDialog({
  open,
  onOpenChange,
  reason,
  onDone,
  onUseDemo,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  reason?: string;
  onDone: Done;
  onUseDemo: () => void;
}) {
  const [step, setStep] = React.useState<'email' | 'sent' | 'profile'>('email');
  const [email, setEmail] = React.useState('');
  const [token, setToken] = React.useState('');
  const [existing, setExisting] = React.useState(false);
  const [name, setName] = React.useState('');
  const [city, setCity] = React.useState('');
  const [terms, setTerms] = React.useState(false);
  const [error, setError] = React.useState<string>();

  React.useEffect(() => {
    if (open) {
      setStep('email');
      setEmail('');
      setName('');
      setCity('');
      setTerms(false);
      setError(undefined);
    }
  }, [open]);

  const send = (e: React.FormEvent) => {
    e.preventDefault();
    const r = sendMagicLink(email);
    if (!r.ok) return setError(r.error);
    setError(undefined);
    setToken(r.data.token);
    setExisting(r.data.existing);
    setStep('sent');
  };

  const openLink = () => {
    const r = openMagicLink(token);
    if (!r.ok) return toast.error(r.error);
    if (r.data.user) {
      toast.success(`Selamat datang kembali, ${r.data.user.displayName.split(' ')[0]}`);
      onDone(r.data.user.id);
    } else {
      setStep('profile');
    }
  };

  const signUp = (e: React.FormEvent) => {
    e.preventDefault();
    const r = signUpWithMagicLink(token, { displayName: name, city, acceptTerms: terms });
    if (!r.ok) return setError(r.error);
    toast.success('Akun dibuat. Anda sudah masuk.');
    onDone(r.data.id);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{step === 'profile' ? 'Lengkapi akun' : step === 'sent' ? 'Cek email Anda' : 'Masuk atau daftar'}</DialogTitle>
          <DialogDescription>
            {step === 'email' && (reason ? <span className="font-medium text-navy">{reason} </span> : null)}
            {step === 'email' && 'Tanpa kata sandi. Kami kirim link masuk ke email Anda.'}
            {step === 'sent' && <>Link masuk dikirim ke <b className="text-navy">{email.trim().toLowerCase()}</b>.</>}
            {step === 'profile' && 'Satu langkah lagi. Request Anda tidak hilang.'}
          </DialogDescription>
        </DialogHeader>

        {step === 'email' && (
          <form id="ml-email" onSubmit={send} className="contents" noValidate>
            <DialogBody className="space-y-4">
              <Field id="ml-email-input" label="Email" required error={error}>
                <Input type="email" inputMode="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nama@email.com" autoFocus />
              </Field>
              <button type="button" onClick={onUseDemo} className="flex items-center gap-1.5 text-[13px] font-semibold text-slate-500 hover:text-navy">
                <FlaskConical className="h-4 w-4" /> Coba pakai akun demo
              </button>
            </DialogBody>
          </form>
        )}

        {step === 'sent' && (
          <DialogBody className="space-y-4">
            <div className="rounded-2xl border border-border bg-slate-50 p-4" aria-label="Kotak masuk simulasi">
              <p className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                <FlaskConical className="h-3.5 w-3.5" /> Email simulasi
              </p>
              <div className="rounded-xl bg-white p-4 shadow-card">
                <p className="flex items-center gap-2 text-sm font-bold text-navy">
                  <Mail className="h-4 w-4 text-teal-600" /> Link masuk JastipConnect
                </p>
                <p className="mt-1 text-[13px] text-slate-600">
                  {existing ? 'Klik untuk masuk ke akun Anda.' : 'Klik untuk membuat akun baru.'} Link berlaku 15 menit.
                </p>
                <Button variant="accent" className="mt-3 w-full" onClick={openLink}>
                  <MailOpen /> Buka link masuk
                </Button>
              </div>
            </div>
            <button type="button" onClick={() => setStep('email')} className="flex items-center gap-1 text-[13px] font-semibold text-slate-500 hover:text-navy">
              <ArrowLeft className="h-4 w-4" /> Ganti email
            </button>
          </DialogBody>
        )}

        {step === 'profile' && (
          <form id="ml-profile" onSubmit={signUp} className="contents" noValidate>
            <DialogBody className="space-y-4">
              <Field id="ml-name" label="Nama tampilan" required>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="cth. Fatimah" maxLength={40} autoFocus />
              </Field>
              <Field id="ml-city" label="Kota saat ini" hint="Hanya kota, tanpa alamat.">
                <CitySelect value={city} onChange={setCity} />
              </Field>
              <Checkbox
                checked={terms}
                onChange={(e) => setTerms(e.target.checked)}
                label={
                  <>
                    Saya setuju dengan{' '}
                    <Link to="/syarat" target="_blank" className="font-semibold text-teal-700 underline">
                      Syarat & Ketentuan
                    </Link>{' '}
                    dan{' '}
                    <Link to="/privasi" target="_blank" className="font-semibold text-teal-700 underline">
                      Kebijakan Privasi
                    </Link>
                    .
                  </>
                }
                description="Termasuk larangan barang terlarang dan aturan pelaporan penipuan."
              />
              {error && (
                <p role="alert" className="text-[13px] font-medium text-red-600">
                  {error}
                </p>
              )}
            </DialogBody>
          </form>
        )}

        <DialogFooter>
          {step === 'email' && (
            <Button type="submit" form="ml-email" variant="accent" className="w-full sm:w-auto">
              <Mail /> Kirim link masuk
            </Button>
          )}
          {step === 'profile' && (
            <Button type="submit" form="ml-profile" variant="accent" disabled={!terms} className="w-full sm:w-auto">
              <Check /> Buat akun & lanjutkan
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CitySelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <Select value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">Pilih kota</option>
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
  );
}

/* ---------- Provider activation: WhatsApp OTP + provider terms ---------- */

function ProviderActivationDialog({ open, onOpenChange, reason, onDone }: { open: boolean; onOpenChange: (o: boolean) => void; reason?: string; onDone: Done }) {
  const user = useCurrentUser();
  const [step, setStep] = React.useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = React.useState('');
  const [code, setCode] = React.useState('');
  const [demoCode, setDemoCode] = React.useState('');
  const [terms, setTerms] = React.useState(false);
  const [error, setError] = React.useState<string>();

  React.useEffect(() => {
    if (open) {
      setStep('phone');
      setPhone(user?.phone ?? '');
      setCode('');
      setTerms(false);
      setError(undefined);
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!user) return null;

  const sendCode = (e: React.FormEvent) => {
    e.preventDefault();
    const r = requestOtp(user.id, phone);
    if (!r.ok) return setError(r.error);
    setError(undefined);
    setDemoCode(r.data.code);
    setPhone(r.data.phone);
    setStep('otp');
  };

  const verify = (e: React.FormEvent) => {
    e.preventDefault();
    const r = activateProvider(user.id, { code, acceptProviderTerms: terms });
    if (!r.ok) return setError(r.error);
    toast.success('Mode provider aktif', { description: 'WhatsApp terverifikasi. Anda bisa posting trip sekarang.' });
    onDone(user.id);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <Badge tone="teal" className="mb-2 w-fit">
            <ShieldCheck /> Aktivasi provider
          </Badge>
          <DialogTitle>{step === 'phone' ? 'Verifikasi WhatsApp' : 'Masukkan kode OTP'}</DialogTitle>
          <DialogDescription>
            {reason ? <span className="font-medium text-navy">{reason} </span> : null}
            Provider wajib verifikasi nomor WhatsApp sebelum posting. Ini membantu klien menyaring penipu.
          </DialogDescription>
        </DialogHeader>

        {step === 'phone' ? (
          <form id="pa-phone" onSubmit={sendCode} className="contents" noValidate>
            <DialogBody className="space-y-4">
              <Field id="pa-phone-input" label="Nomor WhatsApp" required error={error} hint="Pakai kode negara, cth. +966 untuk Saudi, +61 untuk Australia.">
                <Input type="tel" inputMode="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+62 812 3456 7890" autoFocus />
              </Field>
              <p className="rounded-xl bg-slate-50 p-3 text-[13px] text-slate-600">Nomor tidak ditampilkan publik. Klien hanya melihat badge "WhatsApp terverifikasi".</p>
            </DialogBody>
          </form>
        ) : (
          <form id="pa-otp" onSubmit={verify} className="contents" noValidate>
            <DialogBody className="space-y-4">
              <div className="rounded-2xl bg-[#e7fbe9] p-3 text-sm text-[#0b3d1a] ring-1 ring-[#bfe8c6]" aria-label="Pesan WhatsApp simulasi">
                <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide">
                  <MessageCircle className="h-3.5 w-3.5" /> WhatsApp simulasi ke {phone}
                </p>
                <p className="mt-1">
                  Kode JastipConnect Anda: <b className="num text-base tracking-widest">{demoCode}</b>. Jangan bagikan kode ini.
                </p>
              </div>
              <Field id="pa-code" label="Kode 6 digit" required error={error}>
                <Input inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} className="num text-center text-lg tracking-[0.4em]" autoFocus />
              </Field>
              <Checkbox
                checked={terms}
                onChange={(e) => setTerms(e.target.checked)}
                label={
                  <>
                    Saya setuju dengan{' '}
                    <Link to="/syarat#provider" target="_blank" className="font-semibold text-teal-700 underline">
                      ketentuan provider
                    </Link>
                    : memeriksa isi titipan, menolak barang terlarang, dan jujur soal tanggal serta kuota.
                  </>
                }
              />
              <button type="button" onClick={() => setStep('phone')} className="flex items-center gap-1 text-[13px] font-semibold text-slate-500 hover:text-navy">
                <ArrowLeft className="h-4 w-4" /> Ganti nomor
              </button>
            </DialogBody>
          </form>
        )}

        <DialogFooter>
          {step === 'phone' ? (
            <Button type="submit" form="pa-phone" variant="accent">
              <Phone /> Kirim kode OTP
            </Button>
          ) : (
            <Button type="submit" form="pa-otp" variant="accent" disabled={code.length !== 6 || !terms}>
              <Check /> Verifikasi & aktifkan
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------- Demo account switcher ---------- */

function AccountSwitcherDialog({ open, onOpenChange, reason, onDone }: { open: boolean; onOpenChange: (o: boolean) => void; reason?: string; onDone: Done }) {
  const { users } = useDB();
  const current = useCurrentUser();
  const [mode, setModeState] = React.useState<'pick' | 'create'>('pick');
  const [name, setName] = React.useState('');
  const [city, setCity] = React.useState('');
  const [error, setError] = React.useState<string>();

  React.useEffect(() => {
    if (open) {
      setModeState('pick');
      setName('');
      setCity('');
      setError(undefined);
    }
  }, [open]);

  const pick_ = (ids: readonly string[]) => ids.map((id) => users.find((u) => u.id === id)).filter(Boolean) as typeof users;
  const seeded = new Set<string>([...PROVIDER_IDS, ...CLIENT_IDS]);
  const groups = [
    { title: `Provider (${PROVIDER_IDS.length})`, hint: 'Masuk di mode Provider', list: pick_(PROVIDER_IDS) },
    { title: `Klien (${CLIENT_IDS.length})`, hint: 'Masuk di mode Klien', list: pick_(CLIENT_IDS) },
    { title: 'Moderator', hint: 'Panel /admin', list: users.filter((u) => u.role === 'admin') },
    { title: 'Akun yang Anda buat', hint: '', list: users.filter((u) => !seeded.has(u.id) && u.role !== 'admin') },
  ].filter((g) => g.list.length);

  const pick = (id: string) => {
    const res = switchAccount(id);
    if (!res.ok) return toast.error(res.error);
    const u = users.find((x) => x.id === id);
    toast.success(`Masuk sebagai ${u?.displayName} (demo)`);
    onDone(id);
  };

  const create = (e: React.FormEvent) => {
    e.preventDefault();
    const res = createLocalProfile({ displayName: name, city });
    if (!res.ok) return setError(res.error);
    toast.success(`Profil demo "${res.data.displayName}" dibuat`);
    onDone(res.data.id);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <div className="mb-2 flex items-center gap-2">
            <Badge tone="amber">
              <FlaskConical /> Mode demo
            </Badge>
          </div>
          <DialogTitle>{mode === 'pick' ? 'Pilih akun demo' : 'Buat profil demo lokal'}</DialogTitle>
          <DialogDescription>
            {reason ? <span className="font-medium text-navy">{reason} </span> : null}
            Peran tidak tumpang tindih: provider hanya memasang trip, klien hanya memesan. Data hanya di browser ini.
          </DialogDescription>
        </DialogHeader>

        {mode === 'pick' ? (
          <DialogBody className="space-y-4">
            {groups.map((g) => (
              <div key={g.title}>
                <p className="mb-2 flex items-baseline justify-between text-xs font-semibold uppercase tracking-wide text-slate-400">
                  {g.title} <span className="normal-case tracking-normal">{g.hint}</span>
                </p>
                <ul className="grid gap-2 sm:grid-cols-2">
                  {g.list.map((u) => (
                    <li key={u.id}>
                      <AccountRow user={u} active={current?.id === u.id} onPick={() => pick(u.id)} compact />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </DialogBody>
        ) : (
          <form id="create-profile" onSubmit={create} className="contents">
            <DialogBody className="space-y-4">
              <Field id="cp-name" label="Nama tampilan" required error={error}>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="cth. Fatimah" maxLength={40} autoFocus />
              </Field>
              <Field id="cp-city" label="Kota saat ini" hint="Opsional. Jangan isi alamat lengkap.">
                <CitySelect value={city} onChange={setCity} />
              </Field>
            </DialogBody>
          </form>
        )}

        <DialogFooter>
          {mode === 'pick' ? (
            <Button variant="outline" onClick={() => setModeState('create')}>
              <UserPlus /> Buat profil demo baru
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => setModeState('pick')}>
                Kembali
              </Button>
              <Button type="submit" form="create-profile">
                Buat & masuk
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AccountRow({ user, active, onPick, compact }: { user: ReturnType<typeof useDB>['users'][number]; active: boolean; onPick: () => void; compact?: boolean }) {
  return (
    <button
      type="button"
      onClick={onPick}
      aria-pressed={active}
      className={cn(
        'flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-all hover:border-teal-300 hover:bg-teal-50/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500',
        active ? 'border-teal-400 bg-teal-50/60' : 'border-border bg-white',
        compact && 'py-2',
      )}
    >
      <Avatar user={user} size={compact ? 36 : 44} />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5 font-bold text-navy">
          {user.displayName}
          {user.role === 'admin' && <ShieldCheck className="h-4 w-4 text-teal-600" aria-label="Admin" />}
        </span>
        <span className="block truncate text-[13px] text-slate-500">{user.demoTagline ?? user.city}</span>
      </span>
      {active && (
        <span className="flex items-center gap-1 text-xs font-semibold text-teal-700">
          <Check className="h-4 w-4" /> Aktif
        </span>
      )}
    </button>
  );
}

export { Users };
