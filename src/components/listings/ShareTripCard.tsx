import * as React from 'react';
import { Copy, Download, Image as ImageIcon, MessageCircle, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button, type ButtonProps } from '@/components/ui/button';
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { ListingView } from '@/hooks/useStore';
import { cityCode } from '@/data/locations';
import { referencePrice } from '@/lib/availability';
import { formatDate, formatKg, formatMoney, listingTitle } from '@/lib/format';

const SIZE = 1080;

/** Text that works in WhatsApp groups: short, scannable, with the link last so it previews. */
export function shareText(view: ListingView, url: string): string {
  const l = view.listing;
  const a = view.availability;
  const lines = [
    l.type === 'weight' ? `*Jastip Bagasi ${l.origin.city} → ${l.destination.city}*` : `*Jastip Barang dari ${l.origin.city}*`,
    l.departureDate ? `Berangkat ${formatDate(l.departureDate)}` : l.type === 'shopping' && l.arrivalDate ? `Tiba ${formatDate(l.arrivalDate)}` : '',
    l.orderDeadline ? `${l.type === 'weight' ? 'Drop-off' : 'Order'} paling lambat ${formatDate(l.orderDeadline)}` : '',
    a.type === 'weight' ? `Sisa ${formatKg(a.remaining)} dari ${formatKg(a.total)}` : `${a.productsLeft} produk tersedia`,
    l.type === 'weight' ? `Tarif ${formatMoney(l.pricePerKg, l.currency)}/kg` : '',
    view.tripVerified ? 'Tiket sudah diverifikasi moderator' : '',
    '',
    `Request lewat JastipConnect: ${url}`,
  ];
  return lines.filter((x, i) => x || i === lines.length - 2).join('\n');
}

async function drawCard(view: ListingView): Promise<HTMLCanvasElement> {
  await document.fonts?.ready;
  const l = view.listing;
  const a = view.availability;
  const c = document.createElement('canvas');
  c.width = SIZE;
  c.height = SIZE;
  const g = c.getContext('2d')!;
  const font = (w: number, px: number) => `${w} ${px}px "Manrope Variable", Manrope, system-ui, sans-serif`;

  // Ground
  const bg = g.createLinearGradient(0, 0, SIZE, SIZE);
  bg.addColorStop(0, '#0f2742');
  bg.addColorStop(1, '#0b5d57');
  g.fillStyle = bg;
  g.fillRect(0, 0, SIZE, SIZE);

  // Ticket
  const x = 72;
  const y = 200;
  const w = SIZE - 144;
  const h = 700;
  g.fillStyle = '#ffffff';
  g.beginPath();
  g.roundRect(x, y, w, h, 48);
  g.fill();
  // Notches on the stub line
  const stubY = y + 470;
  g.fillStyle = '#0d3f4f';
  for (const nx of [x, x + w]) {
    g.beginPath();
    g.arc(nx, stubY, 28, 0, Math.PI * 2);
    g.fill();
  }
  g.strokeStyle = '#cbd5e1';
  g.setLineDash([14, 12]);
  g.lineWidth = 4;
  g.beginPath();
  g.moveTo(x + 48, stubY);
  g.lineTo(x + w - 48, stubY);
  g.stroke();
  g.setLineDash([]);

  // Header
  g.fillStyle = '#ffffff';
  g.font = font(800, 44);
  g.fillText('JastipConnect', 72, 120);
  g.font = font(600, 28);
  g.fillStyle = '#7ee8dc';
  g.fillText(l.type === 'weight' ? 'JASTIP BAGASI' : 'JASTIP BARANG', 72, 160);

  // Route
  g.fillStyle = '#0f2742';
  g.font = font(800, 150);
  g.fillText(cityCode(l.origin.city), x + 56, y + 190);
  const toCode = cityCode(l.destination.city);
  const tw = g.measureText(toCode).width;
  g.fillText(toCode, x + w - 56 - tw, y + 190);
  g.strokeStyle = '#16b8a6';
  g.lineWidth = 6;
  g.setLineDash([18, 14]);
  g.beginPath();
  g.moveTo(x + 330, y + 140);
  g.lineTo(x + w - 330, y + 140);
  g.stroke();
  g.setLineDash([]);
  g.fillStyle = '#16b8a6';
  g.beginPath();
  g.moveTo(x + w - 330, y + 140);
  g.lineTo(x + w - 356, y + 124);
  g.lineTo(x + w - 356, y + 156);
  g.closePath();
  g.fill();

  g.font = font(600, 32);
  g.fillStyle = '#64748b';
  g.fillText(l.origin.city, x + 60, y + 245);
  const dw = g.measureText(l.destination.city).width;
  g.fillText(l.destination.city, x + w - 60 - dw, y + 245);

  // Facts
  const facts: [string, string][] = [];
  if (l.departureDate) facts.push(['Berangkat', formatDate(l.departureDate)]);
  else if (l.type === 'shopping' && l.arrivalDate) facts.push(['Tiba', formatDate(l.arrivalDate)]);
  if (l.orderDeadline) facts.push([l.type === 'weight' ? 'Drop-off s/d' : 'Order s/d', formatDate(l.orderDeadline)]);
  facts.forEach(([k, v], i) => {
    const fx = x + 60 + i * ((w - 120) / 2);
    g.font = font(600, 26);
    g.fillStyle = '#94a3b8';
    g.fillText(k.toUpperCase(), fx, y + 330);
    g.font = font(700, 38);
    g.fillStyle = '#0f2742';
    g.fillText(v, fx, y + 380);
  });

  // Stub: capacity + price
  const ref = referencePrice(l);
  const price = l.type === 'weight' ? `${formatMoney(l.pricePerKg, l.currency)}/kg` : ref ? `mulai ${formatMoney(ref.amount, ref.currency)}` : 'Tanya harga';
  g.font = font(600, 26);
  g.fillStyle = '#94a3b8';
  g.fillText(a.type === 'weight' ? 'SISA BAGASI' : 'TERSEDIA', x + 60, stubY + 70);
  g.font = font(800, 64);
  g.fillStyle = '#0f2742';
  g.fillText(a.type === 'weight' ? formatKg(a.remaining) : `${a.productsLeft} produk`, x + 60, stubY + 140);
  if (a.type === 'weight') {
    g.fillStyle = '#e2e8f0';
    g.beginPath();
    g.roundRect(x + 60, stubY + 168, 380, 14, 7);
    g.fill();
    g.fillStyle = '#16b8a6';
    g.beginPath();
    g.roundRect(x + 60, stubY + 168, Math.max(14, 380 * (a.remaining / (a.total || 1))), 14, 7);
    g.fill();
  }
  g.font = font(600, 26);
  g.fillStyle = '#94a3b8';
  const pl = 'TARIF';
  g.fillText(pl, x + w - 60 - g.measureText(pl).width, stubY + 70);
  g.font = font(800, 52);
  g.fillStyle = '#0b5d57';
  g.fillText(price, x + w - 60 - g.measureText(price).width, stubY + 136);

  // Footer
  g.font = font(700, 30);
  g.fillStyle = '#ffffff';
  const title = listingTitle(l);
  g.fillText(title.length > 48 ? `${title.slice(0, 46)}…` : title, 72, y + h + 80);
  g.font = font(600, 26);
  g.fillStyle = '#7ee8dc';
  g.fillText(view.tripVerified ? 'Tiket diverifikasi moderator · Request lewat JastipConnect' : 'Request lewat JastipConnect', 72, y + h + 124);
  return c;
}

const toBlob = (c: HTMLCanvasElement) => new Promise<Blob | null>((r) => c.toBlob(r, 'image/png'));

export function ShareTripButton({ view, label = 'Bagikan ke WhatsApp', ...props }: ButtonProps & { view: ListingView; label?: string }) {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)} {...props}>
        <MessageCircle /> {label}
      </Button>
      <ShareTripDialog open={open} onOpenChange={setOpen} view={view} />
    </>
  );
}

export function ShareTripDialog({ open, onOpenChange, view }: { open: boolean; onOpenChange: (o: boolean) => void; view: ListingView }) {
  const [preview, setPreview] = React.useState<string>();
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const url = `${window.location.origin}/listings/${view.listing.id}`;
  const text = shareText(view, url);
  const fileName = `jastip-${view.listing.origin.city}-${view.listing.destination.city}.png`.toLowerCase().replace(/\s+/g, '-');

  React.useEffect(() => {
    if (!open) return;
    let alive = true;
    void drawCard(view).then((c) => {
      if (!alive) return;
      canvasRef.current = c;
      setPreview(c.toDataURL('image/png'));
    });
    return () => {
      alive = false;
    };
    // Redraw when the live quota changes while the dialog is open.
  }, [open, view.availability.remaining, view.listing.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const download = () => {
    if (!preview) return;
    const a = document.createElement('a');
    a.href = preview;
    a.download = fileName;
    a.click();
  };

  const shareImage = async () => {
    const c = canvasRef.current;
    const blob = c ? await toBlob(c) : null;
    if (!blob) return;
    const file = new File([blob], fileName, { type: 'image/png' });
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], text });
        return;
      } catch (err) {
        if ((err as DOMException)?.name === 'AbortError') return;
      }
    }
    download();
    toast.info('Kartu diunduh', { description: 'Lampirkan gambar ini di WhatsApp.' });
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Teks disalin');
    } catch {
      toast.error('Tidak bisa menyalin. Salin manual dari kotak teks.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Bagikan trip</DialogTitle>
          <DialogDescription>Kirim ke grup WhatsApp diaspora. Pembeli yang klik link langsung bisa request tanpa daftar dulu.</DialogDescription>
        </DialogHeader>
        <DialogBody className="grid gap-5 pb-6 sm:grid-cols-[260px_1fr]">
          <div className="aspect-square overflow-hidden rounded-2xl bg-slate-100 ring-1 ring-border">
            {preview ? <img src={preview} alt="Pratinjau kartu trip" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-slate-400"><ImageIcon /></div>}
          </div>
          <div className="flex min-w-0 flex-col gap-3">
            <textarea readOnly value={text} rows={8} aria-label="Teks untuk WhatsApp" className="w-full resize-none rounded-xl border border-border bg-slate-50 p-3 text-[13px] leading-relaxed text-navy" onFocus={(e) => e.currentTarget.select()} />
            <Button asChild variant="accent">
              <a href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noreferrer">
                <MessageCircle /> Kirim teks ke WhatsApp
              </a>
            </Button>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={shareImage} disabled={!preview}>
                <Share2 /> Bagikan kartu
              </Button>
              <Button variant="outline" onClick={download} disabled={!preview}>
                <Download /> Unduh PNG
              </Button>
            </div>
            <Button variant="ghost" onClick={copy}>
              <Copy /> Salin teks
            </Button>
          </div>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
