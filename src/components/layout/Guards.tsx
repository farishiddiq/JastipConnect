import * as React from 'react';
import { Link } from 'react-router-dom';
import { Lock, LogIn, Phone, ShieldOff, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/shared/display';
import { useAuth } from '@/components/shared/AccountSwitcher';
import { useCurrentUser, useMode } from '@/hooks/useStore';
import { setMode } from '@/services/userService';
import type { User } from '@/types';

/** Application-level gate for member routes (demo only, not a security boundary). */
export function RequireUser({ children, reason }: { children: (user: User) => React.ReactNode; reason: string }) {
  const user = useCurrentUser();
  const { openAuth, openSwitcher } = useAuth();
  if (!user) {
    return (
      <div className="container max-w-lg py-12">
        <EmptyState
          icon={<Lock />}
          title="Masuk dulu"
          description={reason}
          action={
            <>
              <Button variant="accent" onClick={() => openAuth(reason)}>
                <LogIn /> Masuk dengan email
              </Button>
              <Button variant="outline" onClick={() => openSwitcher(reason)}>
                <Users /> Akun demo
              </Button>
            </>
          }
        />
      </div>
    );
  }
  return <>{children(user)}</>;
}

/** Provider-only routes: signed in, WhatsApp verified, and in provider mode. */
export function RequireProvider({ children, reason }: { children: (user: User) => React.ReactNode; reason: string }) {
  const user = useCurrentUser();
  const mode = useMode();
  const { requireProvider } = useAuth();
  return (
    <RequireUser reason={reason}>
      {(u) => {
        if (!u.phoneVerifiedAt) {
          return (
            <div className="container max-w-lg py-12">
              <EmptyState
                icon={<Phone />}
                title="Aktifkan mode provider"
                description="Verifikasi nomor WhatsApp dan setujui ketentuan provider sebelum posting trip. Gratis."
                action={
                  <Button variant="accent" onClick={() => requireProvider(reason)}>
                    <Phone /> Verifikasi WhatsApp
                  </Button>
                }
              />
            </div>
          );
        }
        if (mode !== 'provider') {
          return (
            <div className="container max-w-lg py-12">
              <EmptyState
                icon={<Users />}
                title="Anda sedang di mode klien"
                description="Pindah ke mode provider untuk mengelola trip dan request."
                action={
                  <Button variant="accent" onClick={() => setMode('provider')}>
                    Pindah ke mode provider
                  </Button>
                }
              />
            </div>
          );
        }
        return <>{children(user ?? u)}</>;
      }}
    </RequireUser>
  );
}

export function RequireAdmin({ children }: { children: (user: User) => React.ReactNode }) {
  const user = useCurrentUser();
  const { openSwitcher } = useAuth();
  if (!user || user.role !== 'admin') {
    return (
      <div className="container max-w-lg py-12">
        <EmptyState
          icon={<ShieldOff />}
          title="Khusus moderator"
          description="Hanya untuk Admin Demo."
          action={
            <>
              <Button onClick={() => openSwitcher('Pilih “Admin Demo” untuk membuka panel moderasi.')}>
                <Users /> Ganti ke Admin Demo
              </Button>
              <Button asChild variant="outline">
                <Link to="/">Beranda</Link>
              </Button>
            </>
          }
        />
      </div>
    );
  }
  return <>{children(user)}</>;
}
