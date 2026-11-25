import * as React from 'react';
import { Camera, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { compressImage } from '@/components/forms/MediaPicker';
import { cn } from '@/lib/utils';

/** One photo, compressed to a small JPEG data URL so it fits in browser storage. */
export function PhotoInput({
  value,
  onChange,
  label,
  hint,
  className,
}: {
  value: string;
  onChange: (url: string) => void;
  label: string;
  hint?: string;
  className?: string;
}) {
  const [busy, setBusy] = React.useState(false);
  const onFile = async (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) return toast.error('Pilih file foto.');
    setBusy(true);
    try {
      onChange(await compressImage(file));
    } catch {
      toast.error('Foto tidak dapat dibaca.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className={className}>
      <div className="flex flex-wrap items-center gap-3">
        {value ? (
          <span className="relative">
            <img src={value} alt="" className="h-20 w-20 rounded-xl object-cover ring-1 ring-border" />
            <button
              type="button"
              onClick={() => onChange('')}
              aria-label="Hapus foto"
              className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-navy text-white"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </span>
        ) : null}
        <Button asChild variant="outline" size="sm" disabled={busy}>
          <label className={cn('cursor-pointer', busy && 'opacity-60')}>
            <Camera />
            {busy ? 'Memproses…' : value ? 'Ganti foto' : 'Ambil / unggah foto'}
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="sr-only"
              aria-label={label}
              onChange={(e) => {
                void onFile(e.target.files?.[0]);
                e.target.value = '';
              }}
            />
          </label>
        </Button>
      </div>
      {hint && <p className="mt-1.5 text-[13px] text-slate-500">{hint}</p>}
    </div>
  );
}
