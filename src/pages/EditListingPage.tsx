import * as React from 'react';
import { Link, useParams } from 'react-router-dom';
import { Lock, PackageX } from 'lucide-react';
import { RequireUser } from '@/components/layout/Guards';
import { ListingWizard } from '@/components/forms/ListingWizard';
import { EmptyState, PageHeader } from '@/components/shared/display';
import { Button } from '@/components/ui/button';
import { useDB, usePageMeta } from '@/hooks/useStore';
import { formFromListing, type ValidationContext } from '@/lib/listingForm';
import { ACTIVE_STATUSES, reservedKg, reservedQty } from '@/lib/availability';

export function EditListingPage() {
  const { id } = useParams();
  const { listings, inquiries } = useDB();
  const listing = listings.find((l) => l.id === id);
  usePageMeta(listing ? `Edit: ${listing.title}` : 'Edit listing');

  // Snapshot initial form once per listing so live store updates don't reset the user's edits.
  const initial = React.useMemo(() => (listing ? formFromListing(listing) : null), [listing?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const ctx = React.useMemo<ValidationContext | undefined>(() => {
    if (!listing) return undefined;
    if (listing.type === 'weight') return { original: listing, reservedKg: reservedKg(listing, inquiries) };
    const active = inquiries.filter((i) => i.listingId === listing.id && ACTIVE_STATUSES.includes(i.status));
    return {
      original: listing,
      reservedByProduct: Object.fromEntries(listing.products.map((p) => [p.id, reservedQty(listing.id, p.id, inquiries)])),
      lockedProductIds: Array.from(new Set(active.flatMap((i) => (i.items ?? []).map((l) => l.productId)))),
    };
  }, [listing, inquiries]);

  return (
    <RequireUser reason="Pilih akun demo pemilik listing untuk mengedit.">
      {(user) => {
        if (!listing || !initial) {
          return (
            <div className="container max-w-lg py-16">
              <EmptyState icon={<PackageX />} title="Listing tidak ditemukan" action={<Button asChild><Link to="/my-listings">Ke Listing Saya</Link></Button>} />
            </div>
          );
        }
        if (listing.ownerId !== user.id) {
          return (
            <div className="container max-w-lg py-16">
              <EmptyState
                icon={<Lock />}
                title="Bukan listing Anda"
                description="Hanya pemilik yang dapat mengedit listing ini. Ganti ke akun demo pemilik untuk melanjutkan."
                action={<Button asChild variant="outline"><Link to={`/listings/${listing.id}`}>Lihat listing</Link></Button>}
              />
            </div>
          );
        }
        return (
          <div className="container py-6 sm:py-10">
            <PageHeader
              title={listing.status === 'draft' ? 'Lanjutkan draf' : 'Edit listing'}
              description={listing.status === 'draft' ? 'Lengkapi lalu terbitkan.' : 'Perubahan langsung tampil di pencarian & halaman detail.'}
              className="mx-auto max-w-3xl"
            />
            <ListingWizard mode="edit" initial={initial} userId={user.id} listing={listing} ctx={ctx} />
          </div>
        );
      }}
    </RequireUser>
  );
}
