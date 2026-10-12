import { Link, useRouteError } from 'react-router-dom';
import { AlertTriangle, Compass, MapPinOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/shared/display';
import { usePageMeta } from '@/hooks/useStore';

export function NotFoundPage() {
  usePageMeta('Halaman tidak ditemukan');
  return (
    <div className="container max-w-lg py-16">
      <EmptyState
        icon={<MapPinOff />}
        title="Halaman tidak ditemukan"
        description="Tautan mungkin salah atau listing sudah dihapus. Coba jelajahi listing lain."
        action={
          <>
            <Button asChild>
              <Link to="/explore">
                <Compass /> Jelajahi listing
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/">Ke beranda</Link>
            </Button>
          </>
        }
      />
    </div>
  );
}

/** Router-level error boundary; keeps the app usable if a page crashes. */
export function RouteError() {
  const error = useRouteError() as Error | undefined;
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background p-4">
      <div className="max-w-md">
        <EmptyState
          icon={<AlertTriangle />}
          title="Terjadi kesalahan"
          description={
            <>
              Maaf, halaman ini gagal dimuat. Jika data demo rusak, buka Profil → Reset Data Demo.
              {error?.message && <span className="mt-2 block font-mono text-xs text-slate-400">{error.message}</span>}
            </>
          }
          action={
            <Button onClick={() => (window.location.href = '/')}>Muat ulang ke beranda</Button>
          }
        />
      </div>
    </div>
  );
}
