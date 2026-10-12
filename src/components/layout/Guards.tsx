import * as React from 'react';
import { Link } from 'react-router-dom';
import { Lock, ShieldOff, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/shared/display';
import { useAuth } from '@/components/shared/AccountSwitcher';
import { useCurrentUser } from '@/hooks/useStore';
import type { User } from '@/types';

/** Application-level gate for member routes (demo only — not a security boundary). */
export function RequireUser({ children, reason }: { children: (user: User) => React.ReactNode; reason: string }) {
  const user = useCurrentUser();
  const { openSwitcher } = useAuth();
  if (!user) {
    return (
      <div className="container max-w-lg py-12">
        <EmptyState
          icon={<Lock />}
          title="Pilih akun demo dulu"
          description={reason}
          action={
            <>
              <Button onClick={() => openSwitcher(reason)}>
                <Users /> Pilih akun demo
              </Button>
              <Button asChild variant="outline">
                <Link to="/explore">Jelajahi listing</Link>
              </Button>
            </>
          }
        />
      </div>
    );
  }
  return <>{children(user)}</>;
}

export function RequireAdmin({ children }: { children: (user: User) => React.ReactNode }) {
  const user = useCurrentUser();
  const { openSwitcher } = useAuth();
  if (!user || user.role !== 'admin') {
    return (
      <div className="container max-w-lg py-12">
        <EmptyState
          icon={<ShieldOff />}
          title="Khusus moderator demo"
          description="Halaman ini hanya untuk akun Admin Demo. Ganti akun melalui pengalih akun demo."
          action={
            <Button onClick={() => openSwitcher('Pilih “Admin Demo” untuk membuka panel moderasi.')}>
              <Users /> Ganti ke Admin Demo
            </Button>
          }
        />
      </div>
    );
  }
  return <>{children(user)}</>;
}
