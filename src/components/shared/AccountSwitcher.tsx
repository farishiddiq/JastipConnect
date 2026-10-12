import * as React from 'react';
import { Check, FlaskConical, ShieldCheck, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Field, Input, Select } from '@/components/ui/form';
import { Badge } from '@/components/ui/misc';
import { Avatar } from './display';
import { useCurrentUser, useDB } from '@/hooks/useStore';
import { createLocalProfile, switchAccount } from '@/services/userService';
import { DEMO_USER_IDS } from '@/data/seed';
import { COUNTRIES } from '@/data/locations';
import { cn } from '@/lib/utils';

type AuthContextValue = {
  /** Opens the demo account switcher, optionally explaining why login is needed. */
  openSwitcher: (reason?: string) => void;
  /** Returns the current user id, or opens the switcher and returns null for guests. */
  requireUser: (reason?: string) => string | null;
};

const AuthContext = React.createContext<AuthContextValue>({ openSwitcher: () => {}, requireUser: () => null });
export const useAuth = () => React.useContext(AuthContext);

const PRIMARY = Object.values(DEMO_USER_IDS) as string[];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const [reason, setReason] = React.useState<string | undefined>();
  const user = useCurrentUser();

  const value = React.useMemo<AuthContextValue>(
    () => ({
      openSwitcher: (r) => {
        setReason(r);
        setOpen(true);
      },
      requireUser: (r) => {
        if (user) return user.id;
        setReason(r ?? 'Pilih akun demo untuk melanjutkan.');
        setOpen(true);
        return null;
      },
    }),
    [user],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
      <AccountSwitcherDialog open={open} onOpenChange={setOpen} reason={reason} />
    </AuthContext.Provider>
  );
}

function AccountSwitcherDialog({ open, onOpenChange, reason }: { open: boolean; onOpenChange: (o: boolean) => void; reason?: string }) {
  const { users } = useDB();
  const current = useCurrentUser();
  const [mode, setMode] = React.useState<'pick' | 'create'>('pick');
  const [name, setName] = React.useState('');
  const [city, setCity] = React.useState('');
  const [error, setError] = React.useState<string>();

  React.useEffect(() => {
    if (open) {
      setMode('pick');
      setName('');
      setCity('');
      setError(undefined);
    }
  }, [open]);

  const primary = PRIMARY.map((id) => users.find((u) => u.id === id)).filter(Boolean) as typeof users;
  const others = users.filter((u) => !PRIMARY.includes(u.id));

  const pick = (id: string) => {
    const res = switchAccount(id);
    if (!res.ok) return toast.error(res.error);
    const u = users.find((x) => x.id === id);
    toast.success(`Masuk sebagai ${u?.displayName} (demo)`);
    onOpenChange(false);
  };

  const create = (e: React.FormEvent) => {
    e.preventDefault();
    const res = createLocalProfile({ displayName: name, city });
    if (!res.ok) return setError(res.error);
    toast.success(`Profil demo "${res.data.displayName}" dibuat`);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="mb-2 flex items-center gap-2">
            <Badge tone="amber">
              <FlaskConical /> Mode demo
            </Badge>
          </div>
          <DialogTitle>{mode === 'pick' ? 'Pilih akun demo' : 'Buat profil demo lokal'}</DialogTitle>
          <DialogDescription>
            {reason ? <span className="font-medium text-navy">{reason} </span> : null}
            Ini bukan login sungguhan — tanpa kata sandi. Semua data hanya tersimpan di browser ini.
          </DialogDescription>
        </DialogHeader>

        {mode === 'pick' ? (
          <DialogBody className="space-y-4">
            <ul className="space-y-2" aria-label="Akun demo utama">
              {primary.map((u) => (
                <li key={u.id}>
                  <AccountRow user={u} active={current?.id === u.id} onPick={() => pick(u.id)} />
                </li>
              ))}
            </ul>
            {others.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Pengguna lain di data demo</p>
                <ul className="space-y-2">
                  {others.map((u) => (
                    <li key={u.id}>
                      <AccountRow user={u} active={current?.id === u.id} onPick={() => pick(u.id)} compact />
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </DialogBody>
        ) : (
          <form id="create-profile" onSubmit={create} className="contents">
            <DialogBody className="space-y-4">
              <Field id="cp-name" label="Nama tampilan" required error={error}>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="cth. Fatimah" maxLength={40} autoFocus />
              </Field>
              <Field id="cp-city" label="Kota saat ini" hint="Opsional. Jangan isi alamat lengkap.">
                <Select value={city} onChange={(e) => setCity(e.target.value)}>
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
              </Field>
              <p className="rounded-xl bg-slate-50 p-3 text-[13px] text-slate-500">
                Kami tidak meminta kata sandi, nomor telepon, KTP/paspor, atau data pembayaran.
              </p>
            </DialogBody>
          </form>
        )}

        <DialogFooter>
          {mode === 'pick' ? (
            <Button variant="outline" onClick={() => setMode('create')}>
              <UserPlus /> Buat profil demo baru
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => setMode('pick')}>
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

function AccountRow({
  user,
  active,
  onPick,
  compact,
}: {
  user: ReturnType<typeof useDB>['users'][number];
  active: boolean;
  onPick: () => void;
  compact?: boolean;
}) {
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
