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
              <li>Aturan maskapai, bea cukai, impor/ekspor, barang terbatas, dan kewajiban deklarasi dapat berlaku.</li>
              <li>Penyedia dan pembeli wajib memeriksa sendiri aturan dan ketentuan hukum yang berlaku.</li>
              <li>Dilarang menitipkan barang berbahaya, ilegal, atau terbatas. Contoh di halaman keamanan hanya panduan, bukan nasihat hukum.</li>
              <li>Demo ini tidak memverifikasi barang, identitas, pembayaran, maupun keamanan pengiriman.</li>
            </ul>
          ) : (
            <p className="text-[13px] leading-relaxed text-amber-900/90">
              Aturan maskapai & bea cukai berlaku. Platform demo tidak memverifikasi barang, identitas, atau pembayaran.
            </p>
          )}
          <Link to="/safety" className="inline-block text-[13px] font-semibold text-amber-800 underline underline-offset-2 hover:text-amber-950">
            Lihat daftar barang terlarang & panduan keamanan
          </Link>
        </div>
      </div>
    </aside>
  );
}
