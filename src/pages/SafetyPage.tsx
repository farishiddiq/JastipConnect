import { Link } from 'react-router-dom';
import { AlertOctagon, Ban, FlaskConical, Flag, Plane, Scale, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/misc';
import { PageHeader } from '@/components/shared/display';
import { usePageMeta } from '@/hooks/useStore';

const PROHIBITED = [
  { title: 'Barang berbahaya', items: ['Bahan mudah terbakar & meledak (korek gas, petasan, aerosol tertentu)', 'Baterai lithium lepas / power bank di bagasi tercatat', 'Bahan kimia, racun, zat korosif'] },
  { title: 'Barang ilegal', items: ['Narkotika & psikotropika', 'Senjata, amunisi, replika senjata', 'Barang palsu / bajakan', 'Satwa dilindungi & produk turunannya'] },
  { title: 'Barang terbatas / perlu izin', items: ['Obat-obatan (terutama obat keras) tanpa resep & dokumen', 'Makanan segar, daging, tumbuhan & benih', 'Alkohol & produk beralkohol (dilarang di Arab Saudi)', 'Uang tunai dalam jumlah besar, logam mulia', 'Barang elektronik dalam jumlah dagang (dapat dikenai bea)'] },
  { title: 'Lainnya', items: ['Dokumen pribadi milik orang lain', 'Barang yang isinya tidak boleh diperiksa penyedia', 'Barang yang dilarang oleh maskapai terkait'] },
];

export function SafetyPage() {
  usePageMeta('Keamanan & barang terlarang', 'Panduan keamanan JastipConnect: barang terlarang, aturan maskapai & bea cukai, serta batasan platform demo.');
  return (
    <div className="container max-w-4xl py-6 sm:py-10">
      <PageHeader title="Keamanan & barang terlarang" description="Panduan umum untuk penyedia dan penitip. Bukan nasihat hukum." />

      <Card className="mb-6 border-amber-200 bg-amber-50/70 p-5 sm:p-6">
        <div className="flex gap-3">
          <AlertOctagon className="mt-0.5 h-6 w-6 shrink-0 text-amber-600" />
          <div className="space-y-2 text-sm leading-relaxed text-amber-950">
            <p className="font-bold">Penting dibaca</p>
            <p>
              Aturan maskapai, bea cukai Indonesia & Arab Saudi, ketentuan impor/ekspor, barang terbatas, dan kewajiban deklarasi dapat berlaku untuk setiap
              titipan. Penyedia dan penitip wajib memeriksa sendiri aturan terbaru dari sumber resmi (maskapai, Direktorat Jenderal Bea dan Cukai, ZATCA, dan
              otoritas terkait).
            </p>
            <p>Daftar di bawah hanyalah contoh dan tidak lengkap. Ketika ragu, jangan bawa.</p>
          </div>
        </div>
      </Card>

      <section aria-labelledby="prohibited-title">
        <h2 id="prohibited-title" className="mb-4 flex items-center gap-2 text-lg font-extrabold text-navy">
          <Ban className="h-5 w-5 text-red-500" /> Contoh barang yang tidak boleh dititipkan
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {PROHIBITED.map((g) => (
            <Card key={g.title} className="p-5">
              <h3 className="font-bold text-navy">{g.title}</h3>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">
                {g.items.map((i) => (
                  <li key={i}>{i}</li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      </section>

      <section className="mt-10 grid gap-4 md:grid-cols-3" aria-label="Aturan dasar">
        <Card className="p-5">
          <Plane className="h-6 w-6 text-teal-600" />
          <h3 className="mt-3 font-bold text-navy">Untuk penyedia</h3>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">
            <li>Selalu periksa isi titipan sebelum dikemas.</li>
            <li>Tolak barang yang mencurigakan atau tidak bisa diperiksa.</li>
            <li>Deklarasikan barang sesuai ketentuan.</li>
            <li>Jangan bagikan nomor/alamat sebelum deal.</li>
          </ul>
        </Card>
        <Card className="p-5">
          <ShieldCheck className="h-6 w-6 text-teal-600" />
          <h3 className="mt-3 font-bold text-navy">Untuk penitip</h3>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">
            <li>Jelaskan barang dengan jujur dan lengkap.</li>
            <li>Kemas rapi, beri label nama.</li>
            <li>Cek ulasan & riwayat penyedia.</li>
            <li>Sepakati pembayaran & serah terima dengan jelas.</li>
          </ul>
        </Card>
        <Card className="p-5">
          <Flag className="h-6 w-6 text-teal-600" />
          <h3 className="mt-3 font-bold text-navy">Laporkan</h3>
          <p className="mt-2 text-sm text-slate-600">
            Temukan listing atau pengguna mencurigakan? Gunakan tombol <b>Laporkan</b> di halaman listing atau profil. Laporan masuk ke antrean moderasi demo.
          </p>
        </Card>
      </section>

      <section id="demo" className="mt-10 scroll-mt-24" aria-labelledby="demo-title">
        <Card className="border-navy-100 p-5 sm:p-6">
          <h2 id="demo-title" className="flex items-center gap-2 text-lg font-extrabold text-navy">
            <FlaskConical className="h-5 w-5 text-teal-600" /> Batasan versi demo
          </h2>
          <ul className="mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
            {[
              'Tidak ada login sungguhan — akun dipilih lewat pengalih akun demo, tanpa kata sandi.',
              'Semua data disimpan di localStorage browser ini; tidak tersinkron ke perangkat/pengguna lain.',
              'Pesan bukan chat real-time; “percakapan” antar akun hanya disimulasikan di browser yang sama.',
              'Tidak ada pembayaran, escrow, atau pemrosesan transaksi.',
              'Tidak ada verifikasi identitas (KYC). Label “Verifikasi demo” hanya contoh tampilan.',
              'Tidak ada notifikasi push, email, SMS, atau WhatsApp.',
              'Tidak ada konversi kurs otomatis — harga ditampilkan dalam SAR atau IDR sesuai listing.',
              'Pratinjau tautan WhatsApp/sosial tidak dijamin karena aplikasi berjalan sepenuhnya di sisi klien.',
            ].map((t) => (
              <li key={t} className="flex gap-2 rounded-xl bg-slate-50 p-3">
                <Scale className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                {t}
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm text-slate-500">Jangan memasukkan kata sandi, nomor identitas, dokumen sensitif, atau data pembayaran sungguhan ke demo ini.</p>
          <Button asChild variant="outline" className="mt-4">
            <Link to="/profile">Pengaturan & reset data demo</Link>
          </Button>
        </Card>
      </section>
    </div>
  );
}
