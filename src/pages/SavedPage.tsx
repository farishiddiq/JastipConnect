import { Link } from 'react-router-dom';
import { Bookmark } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState, PageHeader } from '@/components/shared/display';
import { RequireUser } from '@/components/layout/Guards';
import { ListingGrid } from '@/components/listings/ListingCard';
import { useListingViews, usePageMeta, useSavedIds } from '@/hooks/useStore';

export function SavedPage() {
  usePageMeta('Disimpan');
  const ids = useSavedIds();
  const views = useListingViews();
  const saved = ids.map((id) => views.find((v) => v.listing.id === id)).filter((v): v is NonNullable<typeof v> => !!v && v.status !== 'draft');

  return (
    <RequireUser reason="Pilih akun demo untuk melihat simpanan.">
      {() => (
        <div className="container py-6 sm:py-10">
          <PageHeader title="Disimpan" description="Listing yang Anda simpan." />
          {saved.length ? (
            <ListingGrid views={saved} className="xl:grid-cols-4" />
          ) : (
            <EmptyState
              icon={<Bookmark />}
              title="Belum ada listing tersimpan"
              description="Ketuk ikon simpan di kartu listing."
              action={
                <Button asChild>
                  <Link to="/explore">Jelajahi listing</Link>
                </Button>
              }
            />
          )}
        </div>
      )}
    </RequireUser>
  );
}
