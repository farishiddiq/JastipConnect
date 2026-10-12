import { Link } from 'react-router-dom';
import { AlertOctagon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/shared/display';
import { usePageMeta } from '@/hooks/useStore';

const PROHIBITED = [
  { title: 'Berbahaya', items: ['Korek gas, petasan, aerosol tertentu', 'Baterai lithium lepas atau power bank di bagasi tercatat', 'Bahan kimia, racun, zat korosif'] },
  { title: 'Ilegal', items: ['Narkotika dan psikotropika', 'Senjata, amunisi, replika senjata', 'Barang palsu atau bajakan', 'Satwa dilindungi dan turunannya'] },
  { title: 'Terbatas atau perlu izin', items: ['Obat keras tanpa resep dan dokumen', 'Makanan segar, daging, tumbuhan, benih', 'Alkohol dan produk beralkohol', 'Uang tunai dalam jumlah besar, logam mulia', 'Elektronik dalam jumlah dagang'] },
];

const RULES = [
  { title: 'Penyedia', items: ['Periksa isi titipan sebelum dikemas.', 'Tolak barang mencurigakan.', 'Deklarasikan barang sesuai aturan.'] },
  { title: 'Penitip', items: ['Jelaskan barang dengan jujur.', 'Kemas rapi dan beri label nama.', 'Cek ulasan penyedia.'] },
  { title: 'Melapor', items: ['Gunakan tombol Laporkan di listing atau profil.', 'Laporan masuk ke antrean moderasi demo.'] },
];

const DEMO_LIMITS = [
  'Tanpa login sungguhan dan kata sandi.',
  'Data hanya di browser ini.',
  'Chat antar akun hanya simulasi.',
  'Tanpa pembayaran atau escrow.',
  'Tanpa verifikasi identitas (KYC).',
  'Tanpa konversi kurs.',
  'Pratinjau tautan WhatsApp tidak dijamin.',
];

export function SafetyPage() {
  usePageMeta('Keamanan & barang terlarang', 'Panduan keamanan JastipConnect: barang terlarang, aturan maskapai dan bea cukai, serta batasan platform demo.');
  return (
    <div className="container max-w-3xl py-8 sm:py-12">
      <PageHeader title="Keamanan" description="Panduan umum, bukan nasihat hukum." />

      <div className="flex gap-3 border-l-2 border-amber-500 py-1 pl-4 text-[15px] leading-relaxed text-slate-700">
        <AlertOctagon className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" aria-hidden />
        <p>Aturan maskapai, bea cukai Indonesia dan Arab Saudi, serta kewajiban deklarasi berlaku untuk setiap titipan. Cek sumber resmi. Ragu? Jangan bawa.</p>
      </div>

      <section className="mt-12" aria-labelledby="prohibited-title">
        <h2 id="prohibited-title" className="text-2xl font-semibold text-navy">
          Tidak boleh dititipkan
        </h2>
        <div className="mt-6 grid gap-8 sm:grid-cols-3">
          {PROHIBITED.map((g) => (
            <div key={g.title}>
              <h3 className="font-semibold text-navy">{g.title}</h3>
              <ul className="mt-2 space-y-1.5 text-sm leading-relaxed text-slate-600">
                {g.items.map((i) => (
                  <li key={i}>{i}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p className="mt-6 text-sm text-slate-500">Daftar ini hanya contoh dan tidak lengkap.</p>
      </section>

      <section className="mt-12 border-t border-border pt-10" aria-label="Aturan dasar">
        <div className="grid gap-8 sm:grid-cols-3">
          {RULES.map((g) => (
            <div key={g.title}>
              <h2 className="text-lg font-semibold text-navy">{g.title}</h2>
              <ul className="mt-2 space-y-1.5 text-sm leading-relaxed text-slate-600">
                {g.items.map((i) => (
                  <li key={i}>{i}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section id="demo" className="mt-12 scroll-mt-24 border-t border-border pt-10" aria-labelledby="demo-title">
        <h2 id="demo-title" className="text-2xl font-semibold text-navy">
          Batasan versi demo
        </h2>
        <ul className="mt-4 divide-y divide-border text-[15px] text-slate-700">
          {DEMO_LIMITS.map((t) => (
            <li key={t} className="py-3">
              {t}
            </li>
          ))}
        </ul>
        <p className="mt-4 text-sm text-slate-500">Jangan isi kata sandi, nomor identitas, atau data pembayaran.</p>
        <Button asChild variant="outline" className="mt-5">
          <Link to="/profile">Pengaturan dan reset data</Link>
        </Button>
      </section>
    </div>
  );
}
