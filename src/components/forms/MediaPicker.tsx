import * as React from 'react';
import { ImagePlus, Video, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

const MAX_IMAGE_EDGE = 640;
const MAX_VIDEO_BYTES = 900_000;

/** Shrinks a photo to a small JPEG data URL so it fits in browser storage. */
async function compressImage(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.7);
}

const readAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });

function RemoveButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-navy text-white">
      <X className="h-3.5 w-3.5" />
    </button>
  );
}

/** Optional photo or video for a product. Everything stays in this browser (localStorage), so files are kept small. */
export function MediaPicker({
  imageUrl,
  videoUrl,
  onChange,
  label,
}: {
  imageUrl: string;
  videoUrl: string;
  onChange: (patch: { imageUrl?: string; videoUrl?: string }) => void;
  label: string;
}) {
  const [busy, setBusy] = React.useState(false);

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    try {
      if (file.type.startsWith('image/')) {
        onChange({ imageUrl: await compressImage(file) });
      } else if (file.type.startsWith('video/')) {
        if (file.size > MAX_VIDEO_BYTES) {
          toast.error('Video terlalu besar untuk penyimpanan browser (maks. sekitar 0,9 MB). Pilih klip yang lebih pendek.');
        } else {
          onChange({ videoUrl: await readAsDataUrl(file) });
        }
      } else {
        toast.error('Pilih file foto atau video.');
      }
    } catch {
      toast.error('File tidak dapat dibaca.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        {imageUrl && (
          <span className="relative">
            <img src={imageUrl} alt="" className="h-16 w-16 rounded-xl object-cover" />
            <RemoveButton label="Hapus foto" onClick={() => onChange({ imageUrl: '' })} />
          </span>
        )}
        {videoUrl && (
          <span className="relative">
            <video src={videoUrl} muted playsInline className="h-16 w-16 rounded-xl bg-slate-100 object-cover" />
            <RemoveButton label="Hapus video" onClick={() => onChange({ videoUrl: '' })} />
          </span>
        )}
        <Button asChild variant="outline" size="sm" disabled={busy}>
          <label className="cursor-pointer">
            {videoUrl && !imageUrl ? <Video /> : <ImagePlus />}
            {busy ? 'Memproses…' : 'Unggah atau ambil foto/video'}
            <input
              type="file"
              accept="image/*,video/*"
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
      <p className="mt-1.5 text-[13px] text-slate-600">Opsional. Foto dikecilkan otomatis. Video maks. sekitar 0,9 MB karena penyimpanan hanya di browser ini.</p>
    </div>
  );
}
