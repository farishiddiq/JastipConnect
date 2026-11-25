import * as React from 'react';
import { RouterProvider } from 'react-router-dom';
import { Toaster, toast } from 'sonner';
import { router } from './router';
import { migratedDemo, store, storageAvailable } from '@/services/store';
import { useDB } from '@/hooks/useStore';
import { sweepExpiredHolds } from '@/services/inquiryService';

export function App() {
  const theme = useDB().settings.theme ?? 'system';
  React.useEffect(() => {
    const root = document.documentElement;
    if (theme === 'system') delete root.dataset.theme;
    else root.dataset.theme = theme;
  }, [theme]);

  React.useEffect(() => {
    if (!storageAvailable) {
      toast.warning('localStorage tidak tersedia', {
        description: 'Demo berjalan di memori saja; perubahan hilang saat halaman dimuat ulang.',
        duration: 8000,
      });
    }
    if (migratedDemo) toast.info('Data demo diperbarui', { description: '5 provider, 10 klien, dan aktivitas 1 bulan. Masuk lewat Akun demo di footer.' });
    return store.onError((msg) => toast.error(msg));
  }, []);

  // Release expired quota holds on load and every minute while the app is open.
  React.useEffect(() => {
    sweepExpiredHolds();
    const t = window.setInterval(() => sweepExpiredHolds(), 60_000);
    return () => window.clearInterval(t);
  }, []);

  return (
    <>
      <RouterProvider router={router} />
      <Toaster position="top-center" richColors closeButton theme={theme} toastOptions={{ className: 'font-sans' }} offset={72} />
    </>
  );
}
