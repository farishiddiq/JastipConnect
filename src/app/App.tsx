import * as React from 'react';
import { RouterProvider } from 'react-router-dom';
import { Toaster, toast } from 'sonner';
import { router } from './router';
import { store, storageAvailable } from '@/services/store';

export function App() {
  React.useEffect(() => {
    if (!storageAvailable) {
      toast.warning('localStorage tidak tersedia', {
        description: 'Demo berjalan di memori saja; perubahan hilang saat halaman dimuat ulang.',
        duration: 8000,
      });
    }
    return store.onError((msg) => toast.error(msg));
  }, []);

  return (
    <>
      <RouterProvider router={router} />
      <Toaster position="top-center" richColors closeButton toastOptions={{ className: 'font-sans' }} offset={72} />
    </>
  );
}
