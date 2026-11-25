import * as React from 'react';
import { Ticket } from 'lucide-react';
import { toast } from 'sonner';
import type { Listing } from '@/types';
import { Button, type ButtonProps } from '@/components/ui/button';
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PhotoInput } from '@/components/shared/PhotoInput';
import { TripVerifiedBadge } from '@/components/shared/display';
import { submitTicketProof } from '@/services/listingService';

/** Owner-side entry point for the "Trip terverifikasi" badge. */
export function TicketProofButton({ listing, actorId, ...props }: ButtonProps & { listing: Listing; actorId: string }) {
  const [open, setOpen] = React.useState(false);
  const [photo, setPhoto] = React.useState('');
  const status = listing.ticketProof?.status;
  if (status === 'approved') return <TripVerifiedBadge verified />;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const r = submitTicketProof(listing.id, actorId, photo);
    if (!r.ok) return toast.error(r.error);
    toast.success('Bukti tiket terkirim', { description: 'Moderator meninjau dalam 1x24 jam.' });
    setOpen(false);
  };

  return (
    <>
      {status === 'pending' ? (
        <TripVerifiedBadge verified={false} pending />
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setPhoto('');
            setOpen(true);
          }}
          {...props}
        >
          <Ticket /> {status === 'rejected' ? 'Unggah ulang tiket' : 'Verifikasi trip'}
        </Button>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
            <DialogHeader>
              <DialogTitle>Verifikasi trip</DialogTitle>
              <DialogDescription>
                Unggah e-tiket atau boarding pass. Setelah dicek moderator, trip Anda mendapat badge "Trip terverifikasi" sehingga klien lebih percaya.
              </DialogDescription>
            </DialogHeader>
            <DialogBody className="space-y-3">
              {status === 'rejected' && listing.ticketProof?.note && (
                <p className="rounded-xl bg-red-50 p-3 text-[13px] text-red-700">Ditolak sebelumnya: {listing.ticketProof.note}</p>
              )}
              <PhotoInput value={photo} onChange={setPhoto} label="Foto tiket atau boarding pass" />
              <ul className="list-disc space-y-1 pl-5 text-[13px] text-slate-600">
                <li>Nama, rute, dan tanggal harus terbaca.</li>
                <li>Tutup nomor paspor dan kode booking. Kami tidak membutuhkannya.</li>
                <li>Bukti hanya dilihat moderator, tidak ditampilkan publik.</li>
              </ul>
            </DialogBody>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Batal
              </Button>
              <Button type="submit" variant="accent" disabled={!photo}>
                Kirim untuk ditinjau
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
