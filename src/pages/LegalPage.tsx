import * as React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { usePageMeta } from '@/hooks/useStore';
import { cn } from '@/lib/utils';

const UPDATED = '25 November 2026';

type Section = { id: string; title: string; body: React.ReactNode };

function LegalLayout({ title, intro, sections }: { title: string; intro: React.ReactNode; sections: Section[] }) {
  const { hash } = useLocation();
  React.useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView({ block: 'start' });
  }, [hash]);
  return (
    <div className="container py-8 sm:py-12">
      <div className="grid gap-10 lg:grid-cols-[240px_1fr]">
        <nav aria-label="Daftar isi" className="hidden lg:block">
          <ol className="sticky top-24 space-y-1 text-sm">
            {sections.map((s, i) => (
              <li key={s.id}>
                <a href={`#${s.id}`} className={cn('block rounded-lg px-3 py-1.5 text-slate-500 hover:bg-slate-100 hover:text-navy', hash === `#${s.id}` && 'bg-slate-100 font-semibold text-navy')}>
                  {i + 1}. {s.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>
        <article className="min-w-0 max-w-3xl">
          <h1 className="text-[2rem] font-bold leading-tight text-navy sm:text-4xl">{title}</h1>
          <p className="mt-2 text-sm text-slate-500">Terakhir diperbarui {UPDATED}</p>
          <div className="mt-5 flex gap-3 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900 ring-1 ring-amber-200">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
            <p>
              <b>Draf, perlu ditinjau pengacara</b> sebelum JastipConnect dipakai dengan transaksi sungguhan. Dokumen ini bukan nasihat hukum.
            </p>
          </div>
          <div className="mt-6 text-[15px] leading-relaxed text-slate-700">{intro}</div>
          <div className="mt-8 space-y-10">
            {sections.map((s, i) => (
              <section key={s.id} id={s.id} className="scroll-mt-24">
                <h2 className="text-xl font-bold text-navy">
                  {i + 1}. {s.title}
                </h2>
                <div className="legal mt-3 space-y-3 text-[15px] leading-relaxed text-slate-700 [&_li]:ml-5 [&_li]:list-disc [&_li]:pl-1 [&_ul]:space-y-1.5">{s.body}</div>
              </section>
            ))}
          </div>
        </article>
      </div>
    </div>
  );
}

export function TermsPage() {
  usePageMeta('Syarat & Ketentuan');
  return (
    <LegalLayout
      title="Syarat & Ketentuan"
      intro={
        <p>
          Syarat & Ketentuan ini ("Ketentuan") mengatur penggunaan JastipConnect ("kami", "Platform"). Dengan membuat akun, mengajukan request, atau memasang trip, Anda ("Pengguna") menyatakan telah membaca, memahami, dan menyetujui Ketentuan ini serta{' '}
          <Link to="/privasi" className="font-semibold text-teal-700 underline">
            Kebijakan Privasi
          </Link>
          . Jika tidak setuju, jangan gunakan Platform.
        </p>
      }
      sections={[
        {
          id: 'peran',
          title: 'Peran JastipConnect sebagai marketplace',
          body: (
            <>
              <p>JastipConnect adalah marketplace yang mempertemukan Klien (penitip) dengan Provider (jastiper atau traveler yang menawarkan bagasi atau jasa belanja). Kami bukan pihak dalam perjanjian titip antara Klien dan Provider.</p>
              <ul>
                <li>Kami tidak membawa, menyimpan, membeli, memeriksa fisik, atau mengirim barang apa pun.</li>
                <li>Kami tidak memproses, menahan, atau menjamin pembayaran antara Klien dan Provider. Fitur pembayaran hanya mencatat informasi yang diisi Pengguna.</li>
                <li>Kami tidak menjamin keaslian, kualitas, legalitas, atau keselamatan barang, maupun kejujuran, kemampuan, atau ketersediaan Pengguna lain.</li>
                <li>Badge verifikasi dan skor kepercayaan adalah sinyal bantu, bukan jaminan.</li>
              </ul>
            </>
          ),
        },
        {
          id: 'akun',
          title: 'Akun dan kelayakan',
          body: (
            <ul>
              <li>Anda wajib berusia minimal 18 tahun dan cakap hukum.</li>
              <li>Satu orang hanya boleh punya satu akun. Akun berisi mode Klien dan mode Provider, tidak boleh dipindahtangankan atau dijual.</li>
              <li>Data yang Anda isi harus benar dan terbaru. Akses ke email Anda adalah tanggung jawab Anda karena login memakai link masuk ke email.</li>
              <li>Kami boleh menolak pendaftaran, meminta verifikasi tambahan, atau menangguhkan akun yang mencurigakan.</li>
            </ul>
          ),
        },
        {
          id: 'provider',
          title: 'Kewajiban Provider',
          body: (
            <>
              <p>Sebelum memasang trip, Provider wajib memverifikasi nomor WhatsApp dan menyetujui ketentuan ini. Provider wajib:</p>
              <ul>
                <li>Memasang hanya trip yang benar-benar akan dilakukan, dengan rute, tanggal, kuota kg, dan tarif yang jujur.</li>
                <li>Mengunggah bukti tiket yang asli bila meminta badge "Trip terverifikasi". Bukti palsu atau hasil edit menyebabkan penangguhan permanen.</li>
                <li>Memeriksa isi setiap titipan secara langsung sebelum menerima, menolak barang terlarang atau mencurigakan, dan tidak membawa paket tertutup yang isinya tidak diketahui.</li>
                <li>Mencatat serah terima (berat dan foto) dengan benar, dan menagih sesuai tarif yang diiklankan.</li>
                <li>Memberi tahu Klien secepatnya bila trip batal, tertunda, atau kuota berubah, dan mengembalikan pembayaran untuk layanan yang tidak dijalankan.</li>
                <li>Mematuhi aturan maskapai, kepabeanan, karantina, dan hukum di negara asal, transit, dan tujuan. Provider bertanggung jawab atas barang yang ia bawa.</li>
                <li>Tidak meminta Klien bertransaksi di luar jalur yang disepakati untuk menghindari pencatatan order.</li>
              </ul>
            </>
          ),
        },
        {
          id: 'klien',
          title: 'Kewajiban Klien',
          body: (
            <ul>
              <li>Menjelaskan isi titipan dengan jujur dan lengkap, termasuk nilai dan jumlahnya.</li>
              <li>Menyerahkan barang dalam kondisi bisa diperiksa, sebelum batas drop-off.</li>
              <li>Membayar sesuai tagihan yang disepakati dan mengunggah bukti bayar yang asli.</li>
              <li>Menanggung bea masuk, pajak, dan biaya lain yang timbul atas barang titipan, kecuali disepakati lain.</li>
              <li>Mengonfirmasi penerimaan dengan jujur. Memberi rating palsu atau sebagai tekanan dilarang.</li>
            </ul>
          ),
        },
        {
          id: 'terlarang',
          title: 'Barang terlarang',
          body: (
            <>
              <p>Dilarang menitipkan atau membawa melalui Platform, antara lain:</p>
              <ul>
                <li>Narkotika, psikotropika, obat keras tanpa resep, dan prekursornya.</li>
                <li>Senjata, amunisi, bahan peledak, bahan mudah terbakar, gas bertekanan, dan baterai lithium lepas yang melanggar aturan maskapai.</li>
                <li>Uang tunai titipan, logam mulia, perhiasan bernilai tinggi, dan dokumen berharga milik orang lain.</li>
                <li>Barang palsu, hasil curian, atau yang melanggar hak kekayaan intelektual.</li>
                <li>Satwa, tumbuhan, daging segar, dan produk yang dibatasi karantina.</li>
                <li>Barang dalam jumlah atau nilai yang melebihi batas barang bawaan pribadi penumpang menurut ketentuan kepabeanan, atau yang ditujukan untuk dijual tanpa izin.</li>
                <li>Barang lain yang dilarang hukum di negara asal, transit, atau tujuan.</li>
              </ul>
              <p>Daftar ini tidak lengkap. Provider berhak menolak barang apa pun. Pelanggaran dapat dilaporkan ke otoritas berwenang.</p>
            </>
          ),
        },
        {
          id: 'order',
          title: 'Request, hold kuota, dan order',
          body: (
            <ul>
              <li>Request yang menunggu menahan kuota selama 24 jam. Bila Provider tidak merespons, hold kedaluwarsa dan kuota dilepas otomatis.</li>
              <li>Request yang diterima menahan kuota sampai batas drop-off. Bila barang tidak diserahkan sebelum batas itu, hold kedaluwarsa.</li>
              <li>Klien boleh membatalkan sebelum serah terima. Setelah serah terima, pembatalan mengikuti kesepakatan Klien dan Provider.</li>
              <li>Berat dan tagihan final adalah yang dicatat saat serah terima. Klien yang tidak setuju wajib menyampaikannya sebelum membayar.</li>
            </ul>
          ),
        },
        {
          id: 'pembayaran',
          title: 'Pembayaran antar Pengguna',
          body: (
            <ul>
              <li>Pembayaran untuk jasa titip dilakukan langsung antara Klien dan Provider. Platform hanya mencatat status (belum bayar, bukti diunggah, lunas).</li>
              <li>Jangan pernah mengirim kode OTP, PIN, kata sandi, atau data kartu lengkap kepada siapa pun, termasuk yang mengaku dari JastipConnect.</li>
              <li>Kami tidak bertanggung jawab atas kerugian karena transfer ke pihak yang salah atau penipuan antar Pengguna, namun akan membantu menindaklanjuti laporan.</li>
            </ul>
          ),
        },
        {
          id: 'berbayar',
          title: 'Layanan berbayar',
          body: (
            <>
              <p>Fitur inti gratis. Provider dapat membeli layanan tambahan:</p>
              <ul>
                <li>Featured trip (boost) Rp25.000 per listing, aktif 7 hari.</li>
                <li>Slot listing non-frequent flyer Rp50.000 per listing, atau blok 5 listing Rp200.000. Slot tidak kedaluwarsa sampai dipakai.</li>
                <li>Jastiper Pro Rp99.000 per bulan: trip aktif tanpa batas.</li>
                <li>Promoted jastiper Rp150.000 per bulan: tampil di section Jastiper Pilihan.</li>
                <li>Brand partnership: harga dan isi dinegosiasikan dalam perjanjian terpisah.</li>
              </ul>
              <p>Pembelian tidak dapat dikembalikan kecuali layanan gagal diberikan karena kesalahan kami. Layanan berbayar tidak membebaskan Provider dari Ketentuan ini, dan akun yang ditangguhkan karena pelanggaran tidak berhak atas pengembalian dana. Penempatan berbayar ditandai sebagai "Unggulan" atau "Pilihan".</p>
            </>
          ),
        },
        {
          id: 'verifikasi',
          title: 'Verifikasi dan anti-penipuan',
          body: (
            <ul>
              <li>Kami memakai verifikasi nomor WhatsApp, verifikasi tiket per trip, skor kepercayaan, dan laporan Pengguna untuk menyaring penipu.</li>
              <li>Kami boleh meminta dokumen tambahan, menyembunyikan listing, membatalkan badge, atau menangguhkan akun selama pemeriksaan.</li>
              <li>Tanda bahaya yang wajib dilaporkan: diminta bayar penuh sebelum request diterima, diminta pindah ke rekening atas nama berbeda, tiket yang tampak diedit, atau tekanan untuk segera transfer.</li>
            </ul>
          ),
        },
        {
          id: 'pelanggaran',
          title: 'Pelaporan, penangguhan, dan penghentian',
          body: (
            <ul>
              <li>Pengguna dapat melaporkan listing atau Pengguna lain. Laporan palsu yang disengaja juga merupakan pelanggaran.</li>
              <li>Kami boleh memberi peringatan, menutup listing, menghapus rating yang dimanipulasi, menangguhkan, atau menghapus akun tanpa pemberitahuan lebih dulu bila ada indikasi penipuan, barang terlarang, atau pelanggaran berat.</li>
              <li>Kami bekerja sama dengan penegak hukum sesuai hukum yang berlaku.</li>
            </ul>
          ),
        },
        {
          id: 'sengketa',
          title: 'Sengketa antar Pengguna',
          body: (
            <ul>
              <li>Selesaikan sengketa lebih dulu secara langsung, memakai catatan serah terima, foto, bukti bayar, dan chat di Platform sebagai bukti.</li>
              <li>Kami dapat membantu memediasi dan memberi akses ke catatan order kepada kedua pihak, tetapi keputusan kami bukan putusan yang mengikat secara hukum.</li>
            </ul>
          ),
        },
        {
          id: 'tanggung-jawab',
          title: 'Batasan tanggung jawab',
          body: (
            <p>
              Sejauh diizinkan hukum, Platform disediakan "sebagaimana adanya". Kami tidak bertanggung jawab atas kehilangan, kerusakan, penyitaan, keterlambatan, atau denda terkait barang titipan, maupun kerugian tidak langsung. Total tanggung jawab kami terhadap Anda dibatasi pada jumlah biaya layanan berbayar yang Anda bayarkan kepada kami dalam 3 bulan terakhir.
            </p>
          ),
        },
        {
          id: 'umum',
          title: 'Ketentuan umum',
          body: (
            <ul>
              <li>Ketentuan ini tunduk pada hukum Republik Indonesia. Sengketa dengan kami diselesaikan secara musyawarah lebih dulu, lalu melalui pengadilan negeri yang berwenang.</li>
              <li>Kami dapat mengubah Ketentuan ini. Perubahan penting diberitahukan lewat Platform atau email minimal 7 hari sebelum berlaku.</li>
              <li>Bila satu ketentuan tidak berlaku, ketentuan lain tetap berlaku.</li>
              <li>Hubungi kami lewat menu Laporkan atau email resmi yang akan dicantumkan saat peluncuran.</li>
            </ul>
          ),
        },
      ]}
    />
  );
}

export function PrivacyPage() {
  usePageMeta('Kebijakan Privasi');
  return (
    <LegalLayout
      title="Kebijakan Privasi"
      intro={<p>Kebijakan ini menjelaskan data pribadi apa yang dikumpulkan JastipConnect, untuk apa, dan hak Anda. Kami mengacu pada Undang-Undang Pelindungan Data Pribadi (UU No. 27 Tahun 2022).</p>}
      sections={[
        {
          id: 'data',
          title: 'Data yang kami kumpulkan',
          body: (
            <ul>
              <li>Akun: email, nama tampilan, kota, foto profil (opsional).</li>
              <li>Provider: nomor WhatsApp (terverifikasi), bukti tiket per trip.</li>
              <li>Transaksi: request, catatan serah terima (berat, foto barang), status dan bukti pembayaran, rating, laporan, dan isi chat.</li>
              <li>Teknis: perangkat, log akses, dan cookie yang diperlukan untuk login dan keamanan.</li>
            </ul>
          ),
        },
        {
          id: 'tujuan',
          title: 'Tujuan penggunaan',
          body: (
            <ul>
              <li>Menjalankan layanan: login, mempertemukan Klien dan Provider, mencatat order.</li>
              <li>Keamanan dan anti-penipuan: verifikasi, skor kepercayaan, moderasi laporan.</li>
              <li>Memproses layanan berbayar dan kewajiban hukum, termasuk perpajakan.</li>
              <li>Mengirim notifikasi order. Pesan promosi hanya dengan persetujuan Anda.</li>
            </ul>
          ),
        },
        {
          id: 'berbagi',
          title: 'Siapa yang bisa melihat data Anda',
          body: (
            <ul>
              <li>Publik: nama tampilan, kota, foto profil, listing, rating, dan badge verifikasi. Nomor WhatsApp dan email tidak ditampilkan publik.</li>
              <li>Lawan transaksi: detail order, catatan serah terima, bukti bayar, dan chat terkait order tersebut.</li>
              <li>Moderator: bukti tiket, laporan, dan data yang diperlukan untuk pemeriksaan.</li>
              <li>Penyedia layanan kami (hosting, email, pembayaran) dengan perjanjian kerahasiaan, serta otoritas berwenang bila diwajibkan hukum.</li>
            </ul>
          ),
        },
        {
          id: 'simpan',
          title: 'Penyimpanan dan keamanan',
          body: (
            <ul>
              <li>Data disimpan selama akun aktif dan sampai 5 tahun setelah order terakhir untuk keperluan sengketa dan hukum, lalu dihapus atau dianonimkan.</li>
              <li>Bukti tiket dihapus 90 hari setelah tanggal keberangkatan.</li>
              <li>Mode demo saat ini menyimpan semua data hanya di browser Anda (localStorage), tidak dikirim ke server.</li>
            </ul>
          ),
        },
        {
          id: 'hak',
          title: 'Hak Anda',
          body: (
            <ul>
              <li>Mengakses, memperbaiki, dan meminta salinan data Anda.</li>
              <li>Menarik persetujuan dan meminta penghapusan akun, kecuali data yang wajib kami simpan menurut hukum.</li>
              <li>Mengajukan keberatan atas pemrosesan tertentu dan mengadu ke otoritas pelindungan data.</li>
            </ul>
          ),
        },
        {
          id: 'kontak',
          title: 'Kontak',
          body: <p>Untuk pertanyaan privasi, gunakan menu Profil atau email resmi yang akan dicantumkan saat peluncuran. Kami menanggapi dalam 3x24 jam kerja.</p>,
        },
      ]}
    />
  );
}
