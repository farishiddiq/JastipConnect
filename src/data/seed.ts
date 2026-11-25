import type {
  AppNotification,
  Conversation,
  Currency,
  Inquiry,
  InquiryLine,
  InquiryStatus,
  Listing,
  Message,
  PartnerLead,
  Product,
  Purchase,
  Report,
  Review,
  Session,
  Settings,
  ShoppingListing,
  User,
  WeightListing,
} from '@/types';
import { addDays, daysFromToday } from '@/lib/dates';
import { formatKg, formatMoney } from '@/lib/format';
import { makeLocation } from './locations';

/*
 * Demo dataset: one month of marketplace activity (the last 30 days plus trips
 * departing in the next 6 weeks). Roles never overlap: 5 providers only post,
 * 10 clients only order, 1 moderator. Every order's dates agree with its trip
 * (handover before drop-off, shipped after departure) and no trip is overbooked.
 */

/** Seed ids are stable strings so references stay consistent across resets. */
export const DEMO_USER_IDS = {
  aisyah: 'u-aisyah',
  ahmad: 'u-ahmad',
  nadia: 'u-nadia',
  admin: 'u-admin',
} as const;

export const PROVIDER_IDS = ['u-ahmad', 'u-nadia', 'u-siti', 'u-dewi', 'u-andi'] as const;
export const CLIENT_IDS = ['u-aisyah', 'u-budi', 'u-rizky', 'u-fatimah', 'u-hendra', 'u-maya', 'u-yusuf', 'u-lestari', 'u-rahmat', 'u-nurul'] as const;

/** ISO time `days` from today at the given local hour. */
const T = (days: number, hour = 10, minute = 0) => {
  const d = addDays(new Date(), days);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
};
/** ISO time `h` hours ago. */
const H = (h: number) => new Date(Date.now() - h * 3_600_000).toISOString();
const plusHours = (iso: string, h: number) => new Date(new Date(iso).getTime() + h * 3_600_000).toISOString();
const round2 = (n: number) => Math.round(n * 100) / 100;

/* ------------------------------------------------------------------ users */

type Person = { id: string; name: string; city: string; joined: number; bio: string; tagline: string; phone?: string };

const PROVIDERS: Person[] = [
  { id: 'u-ahmad', name: 'Ahmad Fauzi', city: 'Riyadh', joined: -410, phone: '+966 55 120 4471', tagline: 'Jastip Bagasi · Riyadh · Pro', bio: 'Bekerja di Riyadh sejak 2019, pulang ke Jakarta tiap 2-3 bulan. Bagasi longgar saya bagi untuk titipan teman-teman diaspora.' },
  { id: 'u-nadia', name: 'Nadia Rahma', city: 'Jeddah', joined: -300, phone: '+966 54 880 1290', tagline: 'Jastip Barang · Jeddah · Pro + Promoted', bio: 'Personal shopper di Jeddah. Spesialis kurma, cokelat, dan fashion muslim. Belanja langsung di toko resmi dan pasar Balad.' },
  { id: 'u-siti', name: 'Siti Maryam', city: 'Madinah', joined: -520, phone: '+966 56 301 7712', tagline: 'Jastip Bagasi · Madinah · Blok 5 slot', bio: 'Mukimin di Madinah, sering pulang ke Jakarta dan Makassar. Amanah dan tepat waktu insyaAllah.' },
  { id: 'u-dewi', name: 'Dewi Lestari', city: 'Sydney', joined: -180, phone: '+61 412 550 893', tagline: 'Jastip Bagasi · Sydney · Promoted', bio: 'Tinggal di Sydney, pulang ke Jakarta beberapa kali setahun. Bawa titipan dua arah.' },
  { id: 'u-andi', name: 'Andi Wijaya', city: 'Melbourne', joined: -45, phone: '+61 433 019 274', tagline: 'Jastip Barang · Melbourne · Gratis', bio: 'Personal shopper baru di Melbourne. Titip produk Australia untuk keluarga di Indonesia.' },
];

const CLIENTS: Person[] = [
  { id: 'u-aisyah', name: 'Aisyah Putri', city: 'Jakarta', joined: -240, tagline: 'Jakarta · paling aktif', bio: 'Ibu dua anak di Jakarta Selatan. Sering titip oleh-oleh dari Saudi dan Australia untuk keluarga.' },
  { id: 'u-budi', name: 'Budi Santoso', city: 'Bandung', joined: -150, tagline: 'Bandung', bio: 'Engineer, keluarga di Bandung. Titip perlengkapan ibadah untuk orang tua.' },
  { id: 'u-rizky', name: 'Rizky Pratama', city: 'Surabaya', joined: -200, tagline: 'Surabaya', bio: 'Pedagang oleh-oleh kecil di Surabaya.' },
  { id: 'u-fatimah', name: 'Fatimah Zahra', city: 'Riyadh', joined: -90, tagline: 'Diaspora · Riyadh', bio: 'Perawat di Riyadh. Kangen sambal dan bumbu rumah.' },
  { id: 'u-hendra', name: 'Hendra Gunawan', city: 'Sydney', joined: -120, tagline: 'Diaspora · Sydney', bio: 'Mahasiswa S2 di Sydney, kirim oleh-oleh untuk orang tua di Jakarta.' },
  { id: 'u-maya', name: 'Maya Sari', city: 'Makassar', joined: -75, tagline: 'Makassar', bio: 'Guru di Makassar. Titip kurma dan sajadah untuk pengajian.' },
  { id: 'u-yusuf', name: 'Yusuf Hakim', city: 'Medan', joined: -60, tagline: 'Medan', bio: 'Titip barang untuk keluarga di Medan.' },
  { id: 'u-lestari', name: 'Lestari Wulandari', city: 'Yogyakarta', joined: -110, tagline: 'Yogyakarta', bio: 'Pemilik butik muslim kecil di Yogyakarta.' },
  { id: 'u-rahmat', name: 'Rahmat Hidayat', city: 'Semarang', joined: -40, tagline: 'Semarang · akun baru', bio: 'Baru pertama kali pakai jastip.' },
  { id: 'u-nurul', name: 'Nurul Huda', city: 'Perth', joined: -130, tagline: 'Diaspora · Perth', bio: 'Tinggal di Perth, sering titip lewat jastiper Sydney.' },
];

function buildUsers(): User[] {
  const toUser = (p: Person, provider: boolean): User => ({
    id: p.id,
    displayName: p.name,
    city: p.city,
    bio: p.bio,
    role: 'member',
    joinedAt: T(p.joined),
    demoTagline: p.tagline,
    email: `${p.id.slice(2)}@demo.jastip.id`,
    termsAcceptedAt: T(p.joined),
    ...(provider ? { phone: p.phone, phoneVerifiedAt: T(p.joined + 1), providerSince: T(p.joined + 1) } : {}),
  });
  return [
    ...PROVIDERS.map((p) => toUser(p, true)),
    ...CLIENTS.map((p) => toUser(p, false)),
    {
      id: DEMO_USER_IDS.admin,
      displayName: 'Admin Demo',
      city: 'Jakarta',
      bio: 'Akun moderasi demo.',
      role: 'admin',
      joinedAt: T(-500),
      demoTagline: 'Moderator',
      email: 'admin@demo.jastip.id',
      termsAcceptedAt: T(-500),
    },
  ];
}

/* --------------------------------------------------------------- listings */

const PROHIBITED =
  'Tidak menerima: cairan > 100 ml di kabin, baterai lithium lepas, obat keras tanpa resep, rokok/vape dalam jumlah besar, daging segar, barang mudah terbakar, uang tunai titipan, dan barang ilegal apa pun.';

const proof = (uploaded: number, status: 'approved' | 'pending' | 'rejected', note?: string) => ({
  imageUrl: '/images/ticket-demo.svg',
  uploadedAt: T(uploaded),
  status,
  ...(status !== 'pending' ? { reviewedAt: T(uploaded + 1) } : {}),
  ...(note ? { note } : {}),
});

type TripInput = {
  id: string;
  owner: string;
  from: [string, string];
  to: [string, string];
  title: string;
  description: string;
  depart: number;
  dropOff: number;
  capacityKg: number;
  pricePerKg: number;
  currency: Currency;
  created: number;
  views: number;
  permitted: string;
  handover: string;
  terms: string;
  extra?: Partial<WeightListing>;
};

const trip = (t: TripInput): WeightListing => ({
  id: t.id,
  ownerId: t.owner,
  type: 'weight',
  status: 'open',
  title: t.title,
  description: t.description,
  origin: makeLocation(...t.from),
  destination: makeLocation(...t.to),
  departureDate: daysFromToday(t.depart),
  orderDeadline: daysFromToday(t.dropOff),
  currency: t.currency,
  capacityKg: t.capacityKg,
  pricePerKg: t.pricePerKg,
  permittedItemsNote: t.permitted,
  prohibitedItemsNote: PROHIBITED,
  handoverMethod: t.handover,
  terms: t.terms,
  imageUrls: [],
  acknowledgedRules: true,
  viewCount: t.views,
  createdAt: T(t.created),
  updatedAt: T(t.created),
  publishedAt: T(t.created),
  ...t.extra,
});

const product = (id: string, p: Omit<Product, 'id'>): Product => ({ id, ...p });

type PoInput = Omit<TripInput, 'capacityKg' | 'pricePerKg' | 'permitted' | 'depart' | 'dropOff'> & {
  depart?: number;
  arrival: number;
  orderBy: number;
  products: Product[];
};

const preorder = (p: PoInput): ShoppingListing => ({
  id: p.id,
  ownerId: p.owner,
  type: 'shopping',
  status: 'open',
  title: p.title,
  description: p.description,
  origin: makeLocation(...p.from),
  destination: makeLocation(...p.to),
  departureDate: p.depart !== undefined ? daysFromToday(p.depart) : undefined,
  arrivalDate: daysFromToday(p.arrival),
  orderDeadline: daysFromToday(p.orderBy),
  currency: p.currency,
  products: p.products,
  prohibitedItemsNote: PROHIBITED,
  handoverMethod: p.handover,
  terms: p.terms,
  imageUrls: [],
  acknowledgedRules: true,
  viewCount: p.views,
  createdAt: T(p.created),
  updatedAt: T(p.created),
  publishedAt: T(p.created),
  ...(p.extra as Partial<ShoppingListing>),
});

function buildListings(): Listing[] {
  return [
    /* Ahmad Fauzi: Riyadh, Bagasi, Pro (3 trips) */
    trip({
      id: 'l-a1', owner: 'u-ahmad', from: ['SA', 'Riyadh'], to: ['ID', 'Jakarta'],
      title: 'Bagasi 20 kg pulang cuti', description: 'Pulang cuti naik Saudia direct. Sudah selesai, terima kasih untuk semua penitip.',
      depart: -18, dropOff: -21, capacityKg: 20, pricePerKg: 25, currency: 'SAR', created: -30, views: 212,
      permitted: 'Kurma, cokelat, pakaian, mainan anak, buku.', handover: 'Ketemuan di titik temu (COD lokasi)',
      terms: 'Barang diserahkan terbuka untuk dicek, lalu saya packing ulang. Di Jakarta dikirim via ekspedisi, ongkir ditanggung penitip.',
      extra: { ticketProof: proof(-29, 'approved') },
    }),
    trip({
      id: 'l-a2', owner: 'u-ahmad', from: ['SA', 'Riyadh'], to: ['ID', 'Jakarta'],
      title: 'Bagasi kosong 20 kg', description: 'Pulang ke Jakarta naik Saudia direct. Cocok untuk kurma, cokelat, pakaian, atau oleh-oleh keluarga.',
      depart: 12, dropOff: 9, capacityKg: 20, pricePerKg: 25, currency: 'SAR', created: -7, views: 168,
      permitted: 'Kurma, cokelat, pakaian, parfum non-alkohol tersegel, mainan anak, buku.', handover: 'Ketemuan di titik temu (COD lokasi)',
      terms: 'Titik serah di Riyadh: Olaya / Batha. Di Jakarta dikirim via ekspedisi lokal, ongkir ditanggung penitip.',
      extra: { ticketProof: proof(-7, 'approved') },
    }),
    trip({
      id: 'l-a3', owner: 'u-ahmad', from: ['ID', 'Jakarta'], to: ['SA', 'Riyadh'],
      title: 'Balik ke Riyadh, bisa bawa 15 kg', description: 'Setelah cuti saya kembali ke Riyadh. Bisa bawakan bumbu kemasan, camilan, buku, pakaian.',
      depart: 40, dropOff: 37, capacityKg: 15, pricePerKg: 150000, currency: 'IDR', created: -4, views: 74,
      permitted: 'Bumbu instan kemasan pabrik, camilan kering, pakaian, buku.', handover: 'Kirim via ekspedisi lokal setelah tiba',
      terms: 'Kirim titipan ke alamat saya di Jakarta Timur (dibagikan setelah request diterima). Di Riyadh diambil di Olaya.',
      extra: { ticketProof: proof(-3, 'rejected', 'Tanggal di tiket tidak sama dengan tanggal keberangkatan listing.') },
    }),

    /* Nadia Rahma: Jeddah, Jastip Barang, Pro + Promoted (3 pre-orders) */
    preorder({
      id: 'l-n1', owner: 'u-nadia', from: ['SA', 'Jeddah'], to: ['ID', 'Surabaya'],
      title: 'Kurma & Cokelat, PO pulang', description: 'PO kurma dan cokelat dari Jeddah, saya bawa pulang ke Surabaya. Dikirim ke seluruh Indonesia via ekspedisi.',
      arrival: 14, orderBy: 10, depart: 13, currency: 'SAR', created: -8, views: 191,
      handover: 'Kirim via ekspedisi lokal setelah tiba',
      terms: 'Harga sudah termasuk jasa titip, belum termasuk ongkir lokal. Bayar setelah barang dibelikan dan difoto.',
      products: [
        product('p-n1-1', { name: 'Kurma Ajwa Madinah 1 kg', category: 'Kurma', description: 'Grade premium, kemasan vakum.', unitPrice: 85, currency: 'SAR', quantityAvailable: 10 }),
        product('p-n1-2', { name: 'Cokelat Patchi box 250 g', category: 'Cokelat', description: 'Assorted, box hadiah.', unitPrice: 120, currency: 'SAR', quantityAvailable: 6 }),
        product('p-n1-3', { name: 'Cokelat Galaxy multipack', category: 'Cokelat', unitPrice: 25, currency: 'SAR', quantityAvailable: 20 }),
        product('p-n1-4', { name: 'Kurma Sukari 1 kg', category: 'Kurma', description: 'Manis legit, kemasan kotak.', unitPrice: 40, currency: 'SAR', quantityAvailable: 12 }),
      ],
    }),
    preorder({
      id: 'l-n2', owner: 'u-nadia', from: ['SA', 'Jeddah'], to: ['ID', 'Jakarta'],
      title: 'Abaya, Pashmina & Attar (PO selesai)', description: 'PO fashion muslim dan wewangian non-alkohol bulan lalu. Semua pesanan sudah sampai.',
      arrival: -10, orderBy: -14, depart: -11, currency: 'SAR', created: -29, views: 240,
      handover: 'Kirim via ekspedisi lokal setelah tiba',
      terms: 'Sebutkan warna/ukuran di catatan. Tidak bisa retur karena dibeli sesuai pesanan.',
      products: [
        product('p-n2-1', { name: 'Pashmina silk', category: 'Fashion Muslim', unitPrice: 45, currency: 'SAR', quantityAvailable: 15, variant: 'Hitam / Navy / Mocca' }),
        product('p-n2-2', { name: 'Abaya hitam bordir', category: 'Fashion Muslim', unitPrice: 180, currency: 'SAR', quantityAvailable: 5, variant: 'M / L / XL' }),
        product('p-n2-3', { name: 'Minyak attar non-alkohol 12 ml', category: 'Wewangian non-alkohol', unitPrice: 55, currency: 'SAR', quantityAvailable: 8 }),
        product('p-n2-4', { name: 'Bakhoor kayu gaharu 50 g', category: 'Wewangian non-alkohol', unitPrice: 35, currency: 'SAR', quantityAvailable: 10 }),
      ],
    }),
    preorder({
      id: 'l-n3', owner: 'u-nadia', from: ['SA', 'Jeddah'], to: ['ID', 'Bandung'],
      title: 'Oleh-oleh umrah: tasbih, sajadah, kurma', description: 'PO perlengkapan ibadah untuk pengajian dan keluarga. Tiba di Bandung akhir Desember.',
      arrival: 28, orderBy: 21, currency: 'SAR', created: -5, views: 63,
      handover: 'Ambil di rumah penyedia (alamat dibagikan setelah deal)',
      terms: 'Pembayaran setelah barang dibelikan. Ambil di Bandung atau kirim via ekspedisi.',
      products: [
        product('p-n3-1', { name: 'Tasbih kayu kokka', category: 'Perlengkapan Ibadah', unitPrice: 15, currency: 'SAR', quantityAvailable: 20 }),
        product('p-n3-2', { name: 'Sajadah tebal Turki', category: 'Perlengkapan Ibadah', unitPrice: 70, currency: 'SAR', quantityAvailable: 6 }),
        product('p-n3-3', { name: 'Kurma Safawi 500 g', category: 'Kurma', unitPrice: 30, currency: 'SAR', quantityAvailable: 15 }),
      ],
    }),

    /* Siti Maryam: Madinah, Bagasi, block of 5 slots (2 trips) */
    trip({
      id: 'l-s1', owner: 'u-siti', from: ['SA', 'Madinah'], to: ['ID', 'Jakarta'],
      title: 'Bagasi 18 kg setelah musim ziarah', description: 'Pulang ke Jakarta setelah musim ziarah. Sudah berangkat, titipan sedang dikirim ke penitip.',
      depart: -8, dropOff: -10, capacityKg: 18, pricePerKg: 20, currency: 'SAR', created: -26, views: 187,
      permitted: 'Kurma, sajadah, tasbih, pakaian, air zamzam kemasan resmi.', handover: 'Ketemuan di titik temu (COD lokasi)',
      terms: 'Serah terima di sekitar Masjid Nabawi. Di Jakarta diambil di Cempaka Putih atau dikirim ekspedisi.',
      extra: { ticketProof: proof(-25, 'approved') },
    }),
    trip({
      id: 'l-s2', owner: 'u-siti', from: ['SA', 'Madinah'], to: ['ID', 'Makassar'],
      title: 'Bagasi 12 kg ke Makassar', description: 'Pulang kampung ke Makassar minggu depan. Kuota terbatas.',
      depart: 6, dropOff: 4, capacityKg: 12, pricePerKg: 22, currency: 'SAR', created: -5, views: 96,
      permitted: 'Kurma, perlengkapan ibadah, pakaian, camilan kering.', handover: 'Ketemuan di titik temu (COD lokasi)',
      terms: 'Barang dicek bersama saat serah terima. Di Makassar diambil di rumah keluarga saya.',
      extra: { ticketProof: proof(-1, 'pending'), paidSlot: true },
    }),

    /* Dewi Lestari: Sydney, Bagasi, Promoted + one paid slot (3 trips) */
    trip({
      id: 'l-d1', owner: 'u-dewi', from: ['AU', 'Sydney'], to: ['ID', 'Jakarta'],
      title: 'Bagasi Sydney 23 kg', description: 'Pulang ke Jakarta naik Garuda. Sudah tiba, titipan sedang diantar.',
      depart: -12, dropOff: -15, capacityKg: 23, pricePerKg: 25, currency: 'AUD', created: -30, views: 158,
      permitted: 'Madu Manuka, vitamin tersegel, cokelat, pakaian, skincare tersegel.', handover: 'Kirim via ekspedisi lokal setelah tiba',
      terms: 'Barang dikirim ke alamat saya di Sydney (Parramatta). Di Jakarta dikirim via ekspedisi.',
      extra: { ticketProof: proof(-29, 'approved') },
    }),
    trip({
      id: 'l-d2', owner: 'u-dewi', from: ['AU', 'Sydney'], to: ['ID', 'Jakarta'],
      title: 'Bagasi Sydney 23 kg, Desember', description: 'Pulang liburan akhir tahun. Bisa bawa titipan untuk keluarga di Jakarta dan sekitarnya.',
      depart: 20, dropOff: 16, capacityKg: 23, pricePerKg: 25, currency: 'AUD', created: -6, views: 121,
      permitted: 'Madu Manuka, vitamin tersegel, cokelat, pakaian, skincare tersegel.', handover: 'Kirim via ekspedisi lokal setelah tiba',
      terms: 'Barang dikirim ke alamat saya di Sydney (Parramatta) sebelum batas drop-off.',
      extra: { ticketProof: proof(-5, 'approved') },
    }),
    trip({
      id: 'l-d3', owner: 'u-dewi', from: ['ID', 'Jakarta'], to: ['AU', 'Sydney'],
      title: 'Balik ke Sydney, 15 kg', description: 'Setelah liburan saya kembali ke Sydney. Bisa bawakan bumbu dan camilan untuk diaspora di Australia.',
      depart: 45, dropOff: 40, capacityKg: 15, pricePerKg: 180000, currency: 'IDR', created: -2, views: 39,
      permitted: 'Bumbu kemasan pabrik, camilan kering, kopi bubuk tersegel, batik.', handover: 'Kirim via ekspedisi lokal setelah tiba',
      terms: 'Patuhi aturan karantina Australia: tanpa daging, telur, susu segar, biji-bijian mentah.',
      extra: { paidSlot: true },
    }),

    /* Andi Wijaya: Melbourne, Jastip Barang, free plan at its limit */
    preorder({
      id: 'l-w1', owner: 'u-andi', from: ['AU', 'Melbourne'], to: ['ID', 'Jakarta'],
      title: 'Produk Australia, PO Melbourne', description: 'PO produk Australia, dibawa pulang ke Jakarta pertengahan Desember.',
      arrival: 18, orderBy: 12, depart: 17, currency: 'AUD', created: -10, views: 88,
      handover: 'Kirim via ekspedisi lokal setelah tiba',
      terms: 'Produk tanpa harga ditanyakan dulu di chat. Bayar setelah barang dibelikan.',
      products: [
        product('p-w1-1', { name: 'Tim Tam original', category: 'Makanan & Camilan', description: 'Biskuit cokelat khas Australia.', unitPrice: 4, currency: 'AUD', quantityAvailable: 30 }),
        product('p-w1-2', { name: 'Vitamin Blackmores (tanya varian)', category: 'Lainnya', quantityAvailable: 10 }),
        product('p-w1-3', { name: 'Madu Manuka UMF 10+ 250 g', category: 'Makanan & Camilan', quantityAvailable: 6 }),
        product('p-w1-4', { name: 'Vegemite 220 g', category: 'Makanan & Camilan', unitPrice: 6, currency: 'AUD', quantityAvailable: 12 }),
      ],
    }),
    {
      ...trip({
        id: 'l-w2', owner: 'u-andi', from: ['AU', 'Melbourne'], to: ['ID', 'Surabaya'],
        title: 'Bagasi 10 kg ke Surabaya (draf)', description: 'Draf trip kedua. Akun gratis hanya 1 trip aktif, jadi belum bisa diterbitkan tanpa slot.',
        depart: 30, dropOff: 26, capacityKg: 10, pricePerKg: 22, currency: 'AUD', created: -1, views: 0,
        permitted: 'Cokelat, vitamin tersegel, pakaian.', handover: 'Kirim via ekspedisi lokal setelah tiba', terms: 'Masih draf.',
      }),
      status: 'draft',
      publishedAt: undefined,
    },
  ];
}

/* ----------------------------------------------------------------- orders */

type OrderSpec = {
  id: string;
  l: string;
  b: string;
  /** Bagasi: estimated kg and items. */
  kg?: number;
  desc?: string;
  /** Barang: [productId, qty]. */
  items?: [string, number][];
  note?: string;
  c: string;
  reply?: [string, string];
  a?: string;
  h?: { at: string; w?: number; photo: string; note?: string; amount?: number };
  proof?: string;
  paid?: string;
  s?: string;
  d?: string;
  f?: string;
  end?: { st: 'declined' | 'cancelled' | 'expired'; at: string; reason?: string };
  rating?: number;
  /** Provider's rating of the client (two-way ratings). */
  pRating?: number;
  value?: number;
};

const P_KURMA = '/images/kurma.webp';
const P_BAG = '/images/luggage.webp';
const P_SNACK = '/images/camilan.webp';
const P_FASHION = '/images/fashion.webp';
const P_IBADAH = '/images/ibadah.webp';
const P_COKLAT = '/images/cokelat.webp';
const PROOF = '/images/proof-demo.svg';

const ORDERS: OrderSpec[] = [
  /* l-a1 Riyadh → Jakarta, departed 18 days ago: finished trip */
  { id: 'o-a1-1', l: 'l-a1', b: 'u-aisyah', kg: 6, desc: 'Kurma Ajwa 2 kg, cokelat 2 kg, mainan anak 2 kg', c: T(-29, 9), reply: ['Siap Bu, insyaAllah. Antar ke Olaya H-3 ya.', T(-29, 13)], a: T(-28), h: { at: T(-22, 19), w: 6, photo: P_KURMA }, proof: T(-22, 21), paid: T(-21, 8), s: T(-18, 6), d: T(-16, 15), f: T(-15, 9), rating: 5, pRating: 5, value: 450 },
  { id: 'o-a1-2', l: 'l-a1', b: 'u-budi', kg: 4, desc: 'Sajadah 2, tasbih, peci untuk bapak', c: T(-27, 20), a: T(-27, 22), h: { at: T(-21, 18), w: 4.3, photo: P_IBADAH }, paid: T(-21, 20), s: T(-18, 6), d: T(-15, 11), f: T(-14, 10), rating: 4, pRating: 5 },
  { id: 'o-a1-3', l: 'l-a1', b: 'u-rizky', kg: 5, desc: 'Kurma Sukari 5 kg untuk dijual lagi', c: T(-26, 8), a: T(-26, 12), h: { at: T(-21, 20), w: 4.8, photo: P_KURMA }, proof: T(-21, 22), paid: T(-20, 9), s: T(-18, 6), d: T(-14, 13), f: T(-13, 8), rating: 5, pRating: 4 },
  { id: 'o-a1-4', l: 'l-a1', b: 'u-yusuf', kg: 3, desc: 'Parfum 3 botol', c: T(-25, 15), end: { st: 'declined', at: T(-25, 18), reason: 'Barang tidak diizinkan' } },

  /* l-a2 Riyadh → Jakarta, departs in 12 days */
  { id: 'o-a2-1', l: 'l-a2', b: 'u-aisyah', kg: 5, desc: 'Kurma Ajwa 2 kg, cokelat 1 kg, pakaian anak 2 kg', note: 'Untuk ibu saya di Bekasi.', c: T(-6, 9), reply: ['Bisa Bu. Adik Ibu bisa antar ke Olaya.', T(-6, 11)], a: T(-5, 14), h: { at: T(-1, 17), w: 5.2, photo: P_KURMA, note: 'Diterima di Olaya, segel utuh.' }, proof: H(3) },
  { id: 'o-a2-2', l: 'l-a2', b: 'u-yusuf', kg: 4, desc: 'Jaket musim dingin dan sepatu', c: T(-5, 19), a: T(-4, 9), h: { at: T(-2, 18), w: 3.9, photo: P_BAG }, proof: T(-2, 20), paid: T(-1, 8) },
  { id: 'o-a2-3', l: 'l-a2', b: 'u-lestari', kg: 3, desc: 'Kain abaya 3 potong untuk butik', c: T(-3, 10), a: T(-2, 13) },
  { id: 'o-a2-4', l: 'l-a2', b: 'u-budi', kg: 3, desc: 'Sepatu dan jaket', c: H(5) },
  { id: 'o-a2-5', l: 'l-a2', b: 'u-rahmat', kg: 2, desc: 'Cokelat 2 kg', c: T(-4, 16), end: { st: 'cancelled', at: T(-3, 9) } },

  /* l-a3 Jakarta → Riyadh, departs in 40 days */
  { id: 'o-a3-1', l: 'l-a3', b: 'u-fatimah', kg: 6, desc: 'Sambal botol, bumbu rendang instan, kerupuk', note: 'Dikirim adik saya dari Depok.', c: T(-2, 20), reply: ['Siap Kak, alamat saya kirim di chat ya.', T(-1, 8)], a: T(-1, 9) },
  { id: 'o-a3-2', l: 'l-a3', b: 'u-maya', kg: 4, desc: 'Batik dan buku untuk saudara di Riyadh', c: H(10) },

  /* l-n1 Jeddah → Surabaya pre-order, order by day 10 */
  { id: 'o-n1-1', l: 'l-n1', b: 'u-rizky', items: [['p-n1-1', 2], ['p-n1-4', 3]], c: H(8) },
  { id: 'o-n1-2', l: 'l-n1', b: 'u-aisyah', items: [['p-n1-2', 1], ['p-n1-1', 2]], note: 'Kalau ada, Patchi varian dark.', c: T(-3, 8), a: T(-2, 10) },
  { id: 'o-n1-3', l: 'l-n1', b: 'u-lestari', items: [['p-n1-3', 4]], c: T(-6, 14), a: T(-5, 9), h: { at: T(-1, 15), photo: P_COKLAT, note: 'Sudah dibelikan, disimpan rapi.' }, proof: T(-1, 18), paid: H(2) },

  /* l-n2 Jeddah → Jakarta pre-order, arrived 10 days ago */
  { id: 'o-n2-1', l: 'l-n2', b: 'u-lestari', items: [['p-n2-1', 4]], note: 'Warna navy dan mocca.', c: T(-27, 10), a: T(-26, 9), h: { at: T(-16, 17), photo: P_FASHION }, paid: T(-16, 19), s: T(-11, 7), d: T(-9, 14), f: T(-9, 18), rating: 5, pRating: 5 },
  { id: 'o-n2-2', l: 'l-n2', b: 'u-aisyah', items: [['p-n2-3', 1], ['p-n2-4', 2]], c: T(-25, 11), a: T(-25, 15), h: { at: T(-16, 18), photo: P_FASHION }, proof: T(-16, 20), paid: T(-15, 8), s: T(-11, 7), d: T(-9, 16), f: T(-8, 9), rating: 4 },
  { id: 'o-n2-3', l: 'l-n2', b: 'u-rahmat', items: [['p-n2-2', 1]], note: 'Ukuran L.', c: T(-20, 21), a: T(-19, 10), h: { at: T(-15, 16), photo: P_FASHION }, paid: T(-14, 9), s: T(-11, 7), d: T(-8, 12), f: T(-7, 10), rating: 3, pRating: 3 },
  { id: 'o-n2-4', l: 'l-n2', b: 'u-yusuf', items: [['p-n2-2', 2]], c: T(-22, 9), end: { st: 'cancelled', at: T(-21, 9) } },

  /* l-n3 Jeddah → Bandung pre-order */
  { id: 'o-n3-1', l: 'l-n3', b: 'u-budi', items: [['p-n3-2', 2], ['p-n3-1', 5]], note: 'Sajadah warna hijau kalau ada.', c: T(-2, 19), a: T(-1, 10) },

  /* l-s1 Madinah → Jakarta, departed 8 days ago */
  { id: 'o-s1-1', l: 'l-s1', b: 'u-budi', kg: 5, desc: 'Air zamzam kemasan 5 liter', c: T(-24, 10), a: T(-23, 9), h: { at: T(-12, 16), w: 5, photo: P_BAG }, paid: T(-12, 18), s: T(-8, 5), d: T(-6, 13), f: T(-5, 9), rating: 5, pRating: 5 },
  { id: 'o-s1-2', l: 'l-s1', b: 'u-maya', kg: 4, desc: 'Kurma Ajwa dan sajadah untuk pengajian', c: T(-22, 15), a: T(-21, 9), h: { at: T(-11, 17), w: 4.2, photo: P_KURMA }, proof: T(-11, 20), paid: T(-10, 9), s: T(-8, 5), d: T(-5, 14), f: T(-4, 11), rating: 4, pRating: 5 },
  { id: 'o-s1-3', l: 'l-s1', b: 'u-rahmat', kg: 3, desc: 'Gamis anak dan tasbih', c: T(-20, 19), a: T(-19, 8), h: { at: T(-11, 18), w: 3.1, photo: P_IBADAH }, paid: T(-10, 10), s: T(-8, 5), d: T(-1, 16) },
  { id: 'o-s1-4', l: 'l-s1', b: 'u-lestari', kg: 3, desc: 'Kain dan aksesori butik', c: T(-15, 13), a: T(-14, 9), h: { at: T(-10, 17), w: 2.9, photo: P_FASHION }, paid: T(-10, 19), s: T(-8, 5) },
  { id: 'o-s1-5', l: 'l-s1', b: 'u-rizky', kg: 5, desc: 'Kurma curah', c: T(-16, 10), a: T(-15, 12), end: { st: 'expired', at: T(-9, 0, 5), reason: 'Barang tidak diserahkan sebelum batas drop-off.' } },

  /* l-s2 Madinah → Makassar, departs in 6 days */
  { id: 'o-s2-1', l: 'l-s2', b: 'u-maya', kg: 5, desc: 'Kurma, sajadah, dan mukena untuk keluarga', c: T(-4, 11), a: T(-3, 9), h: { at: H(4), w: 4.6, photo: P_IBADAH } },
  { id: 'o-s2-2', l: 'l-s2', b: 'u-rahmat', kg: 3, desc: 'Tasbih dan peci untuk oleh-oleh', c: T(-2, 15), a: T(-1, 9) },
  { id: 'o-s2-3', l: 'l-s2', b: 'u-aisyah', kg: 2, desc: 'Kurma Ajwa 2 kg untuk mertua di Makassar', c: H(2) },
  { id: 'o-s2-4', l: 'l-s2', b: 'u-rizky', kg: 4, desc: 'Kurma curah', c: T(-3, 8), end: { st: 'expired', at: T(-2, 8, 5), reason: 'Penyedia tidak merespons dalam 24 jam.' } },

  /* l-d1 Sydney → Jakarta, departed 12 days ago */
  { id: 'o-d1-1', l: 'l-d1', b: 'u-hendra', kg: 6, desc: 'Madu Manuka, vitamin, dan cokelat untuk orang tua', c: T(-28, 18), a: T(-27, 9), h: { at: T(-16, 17), w: 6.2, photo: P_SNACK }, paid: T(-16, 19), s: T(-12, 7), d: T(-10, 15), f: T(-9, 8), rating: 5, pRating: 5, value: 380 },
  { id: 'o-d1-2', l: 'l-d1', b: 'u-nurul', kg: 4, desc: 'Skincare tersegel dan cokelat', c: T(-26, 20), a: T(-25, 9), h: { at: T(-15, 16), w: 3.8, photo: P_COKLAT }, proof: T(-15, 19), paid: T(-15, 21), s: T(-12, 7), d: T(-10, 16), f: T(-8, 10), rating: 5 },
  { id: 'o-d1-3', l: 'l-d1', b: 'u-aisyah', kg: 3, desc: 'Madu Manuka dan vitamin', c: T(-25, 10), reply: ['Siap kak, kirim ke Parramatta ya.', T(-25, 14)], a: T(-24, 9), h: { at: T(-15, 18), w: 2.8, photo: P_SNACK }, paid: T(-15, 20), s: T(-12, 7), d: H(6) },

  /* l-d2 Sydney → Jakarta, departs in 20 days */
  { id: 'o-d2-1', l: 'l-d2', b: 'u-hendra', kg: 5, desc: 'Sepatu lari dan jaket untuk adik', c: T(-3, 19), a: T(-2, 9) },
  { id: 'o-d2-2', l: 'l-d2', b: 'u-nurul', kg: 3, desc: 'Cokelat dan vitamin', c: H(15) },
  { id: 'o-d2-3', l: 'l-d2', b: 'u-lestari', kg: 4, desc: 'Kain wol', c: T(-5, 12), end: { st: 'declined', at: T(-5, 18), reason: 'Jadwal tidak cocok' } },

  /* l-d3 Jakarta → Sydney, departs in 45 days */
  { id: 'o-d3-1', l: 'l-d3', b: 'u-hendra', kg: 4, desc: 'Sambal, rendang kaleng bersertifikat, kopi bubuk', c: H(1) },

  /* l-w1 Melbourne → Jakarta pre-order */
  { id: 'o-w1-1', l: 'l-w1', b: 'u-yusuf', items: [['p-w1-1', 6]], c: H(20) },
  { id: 'o-w1-2', l: 'l-w1', b: 'u-rahmat', items: [['p-w1-3', 1]], note: 'Berapa harga Manuka-nya?', c: T(-3, 9), reply: ['Sekitar 32 AUD, saya konfirmasi saat beli ya.', T(-3, 13)], a: T(-2, 9) },
];

/** Turns the short item text into the structured rows the request form produces. */
const CATEGORY_HINTS: [RegExp, string][] = [
  [/kurma/i, 'Kurma'],
  [/cokelat/i, 'Cokelat'],
  [/sajadah|tasbih|peci|mukena|zamzam/i, 'Perlengkapan Ibadah'],
  [/sambal|bumbu|rendang/i, 'Bumbu & Bahan Masak'],
  [/madu|vitamin|kerupuk|kopi|camilan/i, 'Makanan & Camilan'],
  [/skincare/i, 'Kosmetik & Perawatan'],
  [/parfum/i, 'Wewangian non-alkohol'],
  [/abaya|gamis|kain/i, 'Fashion Muslim'],
  [/mainan|buku|batik/i, 'Suvenir'],
];
function declare(desc: string) {
  return desc.split(/,| dan /).map((part) => {
    const name = part.trim().replace(/^./, (c) => c.toUpperCase());
    const n = name.match(/(\d+)\s*(botol|pcs|potong)?$/);
    const qty = n && n[2] ? Number(n[1]) : 1;
    return { name, category: CATEGORY_HINTS.find(([re]) => re.test(name))?.[1] ?? 'Lainnya', qty };
  });
}

function statusOf(o: OrderSpec): InquiryStatus {
  return o.end?.st ?? (o.f ? 'completed' : o.d ? 'delivered' : o.s ? 'shipped' : o.h ? 'handed_over' : o.a ? 'accepted' : 'pending');
}

function buildActivity(users: User[], listings: Listing[]) {
  const nameOf = (id: string) => users.find((u) => u.id === id)?.displayName ?? 'Pengguna';
  const first = (id: string) => nameOf(id).split(' ')[0];
  const inquiries: Inquiry[] = [];
  const conversations: Conversation[] = [];
  const messages: Message[] = [];
  const notifications: AppNotification[] = [];
  const reviews: Review[] = [];
  let mc = 0;
  let nc = 0;
  const now = Date.now();
  const fresh = (at: string) => now - new Date(at).getTime() < 36 * 3_600_000;

  for (const o of ORDERS) {
    const listing = listings.find((l) => l.id === o.l)!;
    const provider = listing.ownerId;
    const status = statusOf(o);
    const link = `/orders/${o.id}`;
    const convId = `c-${o.id.slice(2)}`;
    const parts: [string, string] = [o.b, provider];

    const lines: InquiryLine[] | undefined =
      listing.type === 'shopping' && o.items
        ? o.items.map(([productId, quantity]) => ({ productId, quantity, unitPriceSnapshot: listing.products.find((p) => p.id === productId)?.unitPrice }))
        : undefined;

    let amountDue: number | undefined;
    if (o.h) {
      if (o.h.amount !== undefined) amountDue = o.h.amount;
      else if (listing.type === 'weight') amountDue = round2((o.h.w ?? o.kg ?? 0) * listing.pricePerKg);
      else amountDue = round2((lines ?? []).reduce((s, x) => s + x.quantity * (x.unitPriceSnapshot ?? 0), 0));
    }
    const cur = listing.currency;
    const what = listing.type === 'weight' ? formatKg(o.kg ?? 0) : `${lines?.length ?? 0} produk`;

    const last = o.end?.at ?? o.f ?? o.d ?? o.s ?? o.paid ?? o.proof ?? o.h?.at ?? o.a ?? o.c;
    inquiries.push({
      id: o.id,
      listingId: o.l,
      buyerId: o.b,
      providerId: provider,
      status,
      requestedKg: listing.type === 'weight' ? o.kg : undefined,
      itemDescription: listing.type === 'weight' ? o.desc : undefined,
      declaredItems: listing.type === 'weight' && o.desc ? declare(o.desc) : undefined,
      declaredValue: o.value,
      prohibitedAck: listing.type === 'weight' ? true : undefined,
      items: lines,
      note: o.note,
      holdExpiresAt: status === 'pending' ? plusHours(o.c, 24) : undefined,
      acceptedAt: o.a,
      handover: o.h ? { weightKg: o.h.w, photoUrl: o.h.photo, note: o.h.note, at: o.h.at } : undefined,
      amountDue,
      amountCurrency: amountDue !== undefined ? cur : undefined,
      payment: o.h ? { status: o.paid ? 'paid' : o.proof ? 'proof_uploaded' : 'unpaid', proofUrl: o.proof ? PROOF : undefined, proofAt: o.proof, paidAt: o.paid } : { status: 'unpaid' },
      shippedAt: o.s,
      deliveredAt: o.d,
      completedAt: o.f,
      closedReason: o.end?.reason,
      createdAt: o.c,
      updatedAt: last,
    });
    conversations.push({ id: convId, inquiryId: o.id, participantIds: parts, createdAt: o.c });

    const say = (sender: string, body: string, at: string) =>
      messages.push({
        id: `m-${++mc}`,
        conversationId: convId,
        senderId: sender,
        body,
        createdAt: at,
        // Anything from the last day and a half is still unread by the recipient.
        readByIds: fresh(at) ? (sender === 'system' ? [] : [sender]) : [...parts],
      });
    const notify = (to: string, title: string, body: string, at: string) =>
      notifications.push({ id: `n-${++nc}`, userId: to, title, body, link, read: !fresh(at), createdAt: at });

    const opening =
      listing.type === 'weight'
        ? [`Halo, saya ingin titip ${formatKg(o.kg ?? 0)}.`, `Barang: ${o.desc}`, o.note ? `Catatan: ${o.note}` : ''].filter(Boolean).join('\n')
        : ['Halo, saya ingin memesan:', ...(lines ?? []).map((x) => `• ${listing.products.find((p) => p.id === x.productId)?.name} × ${x.quantity}`), o.note ? `Catatan: ${o.note}` : '']
            .filter(Boolean)
            .join('\n');
    say(o.b, opening, o.c);
    say('system', 'Request masuk. Kuota ditahan 24 jam sambil menunggu jawaban penyedia.', o.c);
    notify(provider, listing.type === 'weight' ? 'Request baru' : 'Pre-order baru', `${nameOf(o.b)} ${listing.type === 'weight' ? `ingin titip ${what}` : `memesan ${what}`} di "${listing.title}".`, o.c);
    if (o.reply) say(provider, o.reply[0], o.reply[1]);

    if (o.a) {
      say('system', `Request diterima penyedia. ${listing.type === 'weight' ? `${formatKg(o.kg ?? 0)} ditahan sampai batas drop-off.` : 'Stok produk sudah direservasi.'}`, o.a);
      notify(o.b, 'Request diterima', `${nameOf(provider)} menerima request Anda untuk "${listing.title}".`, o.a);
    }
    if (o.h && amountDue !== undefined) {
      const w = o.h.w;
      say('system', `Serah terima dicatat${w ? `: ${formatKg(w)}` : ''}. Tagihan ${formatMoney(amountDue, cur)}.`, o.h.at);
      notify(o.b, 'Tagihan siap', `Serah terima${w ? ` ${formatKg(w)}` : ''} dicatat. Tagihan ${formatMoney(amountDue, cur)}, unggah bukti bayar.`, o.h.at);
    }
    if (o.proof) {
      say('system', 'Klien mengunggah bukti bayar. Menunggu dicek penyedia.', o.proof);
      notify(provider, 'Bukti bayar masuk', `${nameOf(o.b)} mengunggah bukti bayar. Cek lalu tandai lunas.`, o.proof);
    }
    if (o.paid) {
      say('system', 'Pembayaran ditandai lunas oleh penyedia.', o.paid);
      notify(o.b, 'Pembayaran dikonfirmasi', `${nameOf(provider)} mengonfirmasi pembayaran Anda.`, o.paid);
    }
    if (o.s) {
      say('system', 'Titipan sudah dikirim / dalam perjalanan.', o.s);
      notify(o.b, 'Titipan dikirim', `${nameOf(provider)} sudah berangkat membawa titipan Anda.`, o.s);
    }
    if (o.d) {
      say('system', 'Titipan sudah sampai tujuan. Mohon konfirmasi penerimaan.', o.d);
      notify(o.b, 'Titipan sampai', `${nameOf(provider)} menandai titipan Anda sudah sampai. Konfirmasi dan beri rating.`, o.d);
    }
    if (o.f) {
      say(o.b, `Sudah diterima, terima kasih Kak ${first(provider)}.`, plusHours(o.f, -0.2));
      say('system', 'Klien mengonfirmasi titipan diterima. Order selesai.', o.f);
      notify(provider, 'Order selesai', `${nameOf(o.b)} sudah menerima titipan.`, o.f);
    }
    if (o.end) {
      const e = o.end;
      if (e.st === 'declined') {
        say('system', `Request ditolak penyedia.${e.reason ? ` Alasan: ${e.reason}` : ''} Kuota dilepas.`, e.at);
        notify(o.b, 'Request ditolak', `${nameOf(provider)} menolak request Anda.${e.reason ? ` Alasan: ${e.reason}` : ''}`, e.at);
      } else if (e.st === 'cancelled') {
        say('system', 'Request dibatalkan klien. Kuota yang ditahan sudah dilepas.', e.at);
        notify(provider, 'Request dibatalkan', `${nameOf(o.b)} membatalkan request.`, e.at);
      } else {
        say('system', `Hold kedaluwarsa. ${e.reason} Kuota dilepas.`, e.at);
        notify(o.b, 'Hold kedaluwarsa', e.reason ?? '', e.at);
        notify(provider, 'Hold kedaluwarsa', e.reason ?? '', e.at);
      }
    }
    if (o.rating && o.f) {
      const at = plusHours(o.f, 2);
      reviews.push({ id: `r-${o.id.slice(2)}`, inquiryId: o.id, providerId: provider, buyerId: o.b, rating: o.rating, direction: 'to_provider', createdAt: at });
      notify(provider, 'Rating baru', `${nameOf(o.b)} memberi Anda rating ${o.rating} bintang.`, at);
    }
    if (o.pRating && o.f) {
      const at = plusHours(o.f, 5);
      reviews.push({ id: `rc-${o.id.slice(2)}`, inquiryId: o.id, providerId: provider, buyerId: o.b, rating: o.pRating, direction: 'to_client', createdAt: at });
      notify(o.b, 'Rating baru', `${nameOf(provider)} memberi Anda rating ${o.pRating} bintang.`, at);
    }
  }
  return { inquiries, conversations, messages, notifications, reviews };
}

/* ------------------------------------------------------------------ build */

export function buildSeed(): {
  users: User[];
  session: Session;
  listings: Listing[];
  inquiries: Inquiry[];
  conversations: Conversation[];
  messages: Message[];
  reviews: Review[];
  reports: Report[];
  notifications: AppNotification[];
  purchases: Purchase[];
  leads: PartnerLead[];
  settings: Settings;
} {
  const users = buildUsers();
  const listings = buildListings();
  const activity = buildActivity(users, listings);

  const days = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString();
  // One month of simulated plan revenue: Rp922.000 across 10 purchases.
  const purchases: Purchase[] = [
    { id: 'pur-1', userId: 'u-ahmad', kind: 'pro', amountIdr: 99_000, method: 'qris', createdAt: T(-28, 21), expiresAt: days(2) },
    { id: 'pur-2', userId: 'u-nadia', kind: 'pro', amountIdr: 99_000, method: 'va', createdAt: T(-20, 9), expiresAt: days(10) },
    { id: 'pur-3', userId: 'u-nadia', kind: 'promoted', amountIdr: 150_000, method: 'va', createdAt: T(-20, 9, 5), expiresAt: days(10) },
    { id: 'pur-4', userId: 'u-nadia', kind: 'boost', listingId: 'l-n2', amountIdr: 25_000, method: 'card', createdAt: T(-24, 10), expiresAt: days(-17) },
    { id: 'pur-5', userId: 'u-siti', kind: 'nff_block', amountIdr: 200_000, method: 'va', createdAt: T(-25, 14), credits: 5 },
    { id: 'pur-6', userId: 'u-dewi', kind: 'nff_single', amountIdr: 50_000, method: 'qris', createdAt: T(-2, 20), credits: 1 },
    { id: 'pur-7', userId: 'u-dewi', kind: 'promoted', amountIdr: 150_000, method: 'qris', createdAt: T(-6, 19), expiresAt: days(24) },
    { id: 'pur-8', userId: 'u-ahmad', kind: 'boost', listingId: 'l-a2', amountIdr: 25_000, method: 'qris', createdAt: T(-3, 20), expiresAt: days(4) },
    { id: 'pur-9', userId: 'u-nadia', kind: 'boost', listingId: 'l-n1', amountIdr: 25_000, method: 'card', createdAt: T(-2, 8), expiresAt: days(5) },
    { id: 'pur-10', userId: 'u-ahmad', kind: 'pro', amountIdr: 99_000, method: 'qris', createdAt: T(-1, 7), expiresAt: days(32) },
  ];

  const reports: Report[] = [
    { id: 'rep-1', reporterId: 'u-rizky', targetType: 'listing', targetId: 'l-n3', reason: 'Informasi menyesatkan', description: 'Tanggal tiba di deskripsi beda dengan di listing.', status: 'open', createdAt: T(-1, 16) },
    { id: 'rep-2', reporterId: 'u-ahmad', targetType: 'user', targetId: 'u-rahmat', reason: 'Perilaku tidak sopan', description: 'Membatalkan mendadak lalu mengirim pesan kasar.', status: 'open', createdAt: T(-3, 12) },
    { id: 'rep-3', reporterId: 'u-lestari', targetType: 'user', targetId: 'u-andi', reason: 'Spam', description: 'Menawarkan produk di luar pre-order lewat chat.', status: 'dismissed', createdAt: T(-12, 10) },
  ];

  const leads: PartnerLead[] = [
    { id: 'lead-1', name: 'Rina', brand: 'Kurma Al-Madinah', contact: 'rina@contoh.id', message: 'Ingin kerja sama paket kurma untuk jastiper Saudi.', status: 'new', createdAt: T(-2, 11) },
    { id: 'lead-2', name: 'Bayu', brand: 'Kirim Cepat Ekspedisi', contact: '+62 811 0000 1234', message: 'Diskon ongkir lanjutan dari bandara ke seluruh Indonesia untuk order JastipConnect.', status: 'contacted', createdAt: T(-14, 15) },
  ];

  return {
    users,
    session: { currentUserId: null },
    listings,
    ...activity,
    reports,
    purchases,
    leads,
    settings: {
      seededAt: null,
      demoBannerDismissed: false,
      saved: { 'u-aisyah': ['l-d2', 'l-n3'], 'u-hendra': ['l-d3'], 'u-fatimah': ['l-a3'] },
    },
  };
}
