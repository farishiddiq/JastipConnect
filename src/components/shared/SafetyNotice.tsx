import { Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';

export function SafetyNotice({ variant = 'full', className }: { variant?: 'full' | 'compact'; className?: string }) {
  return (
    <aside
      className={cn('rounded-2xl border border-amber-200 bg-amber-50/70 p-4 text-sm text-amber-900', className)}
      aria-label="Catatan keamanan dan kepatuhan"
    >
      <div className="flex gap-3">
        <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" aria-hidden />
        <div className="space-y-1.5">
          <p className="font-bold">Cek aturan sebelum titip</p>
          {variant === 'full' ? (
            <ul className="list-disc space-y-1 pl-4 text-[13px] leading-relaxed text-amber-900/90">
              <li>Aturan maskapai, bea cukai, dan deklarasi berlaku. Periksa sendiri.</li>
              <li>Dilarang menitipkan barang berbahaya, ilegal, atau terbatas.</li>
              <li>Demo tidak memverifikasi barang, identitas, atau pembayaran.</li>
            </ul>
          ) : (
            <p className="text-[13px] leading-relaxed text-amber-900/90">
              Aturan maskapai & bea cukai berlaku. Demo tidak memverifikasi apa pun.
            </p>
          )}
          <Link to="/safety" className="inline-block text-[13px] font-semibold text-amber-800 underline underline-offset-2 hover:text-amber-950">
            Daftar barang terlarang
          </Link>
        </div>
      </div>
    </aside>
  );
}
