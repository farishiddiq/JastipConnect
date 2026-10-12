import type { Location } from '@/types';

export type Country = { code: string; name: string; flag: string; cities: string[] };

/** Configurable corridor. Add countries or cities here. */
export const COUNTRIES: Country[] = [
  {
    code: 'SA',
    name: 'Arab Saudi',
    flag: '🇸🇦',
    cities: ['Riyadh', 'Jeddah', 'Makkah', 'Madinah', 'Dammam', 'Khobar', 'Taif'],
  },
  {
    code: 'ID',
    name: 'Indonesia',
    flag: '🇮🇩',
    cities: ['Jakarta', 'Surabaya', 'Bandung', 'Medan', 'Makassar', 'Yogyakarta', 'Semarang', 'Mataram', 'Banda Aceh'],
  },
];

export function getCountry(code: string): Country | undefined {
  return COUNTRIES.find((c) => c.code === code);
}

export function makeLocation(countryCode: string, city: string): Location {
  const c = getCountry(countryCode);
  return { countryCode, country: c?.name ?? countryCode, city };
}

export function flagFor(code: string): string {
  return getCountry(code)?.flag ?? '🌍';
}

export function sameLocation(a: Location, b: Location): boolean {
  return a.countryCode === b.countryCode && a.city.trim().toLowerCase() === b.city.trim().toLowerCase();
}

export const POPULAR_ROUTES: { from: Location; to: Location }[] = [
  { from: makeLocation('SA', 'Riyadh'), to: makeLocation('ID', 'Jakarta') },
  { from: makeLocation('SA', 'Jeddah'), to: makeLocation('ID', 'Surabaya') },
  { from: makeLocation('ID', 'Jakarta'), to: makeLocation('SA', 'Riyadh') },
  { from: makeLocation('ID', 'Bandung'), to: makeLocation('SA', 'Jeddah') },
  { from: makeLocation('SA', 'Madinah'), to: makeLocation('ID', 'Jakarta') },
];

export const PRODUCT_CATEGORIES = [
  'Makanan & Camilan',
  'Kurma',
  'Cokelat',
  'Fashion Muslim',
  'Kosmetik & Perawatan',
  'Wewangian non-alkohol',
  'Suvenir',
  'Perlengkapan Ibadah',
  'Bumbu & Bahan Masak',
  'Lainnya',
] as const;

const CATEGORY_EMOJI: Record<string, string> = {
  'Makanan & Camilan': '🍪',
  Kurma: '🌴',
  Cokelat: '🍫',
  'Fashion Muslim': '🧕',
  'Kosmetik & Perawatan': '💄',
  'Wewangian non-alkohol': '🪔',
  Suvenir: '🎁',
  'Perlengkapan Ibadah': '📿',
  'Bumbu & Bahan Masak': '🌶️',
  Lainnya: '🛍️',
};

export function emojiForCategory(category: string): string {
  return CATEGORY_EMOJI[category] ?? '🛍️';
}

export const HANDOVER_METHODS = [
  'Ketemuan di titik temu (COD lokasi)',
  'Kirim via ekspedisi lokal setelah tiba',
  'Ambil di rumah penyedia (alamat dibagikan setelah deal)',
  'Antar langsung (area tertentu)',
];
