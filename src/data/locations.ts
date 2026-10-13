import type { Location } from '@/types';

export type Country = { code: string; name: string; cities: string[] };

/** Configurable corridor. Add countries or cities here. */
export const COUNTRIES: Country[] = [
  {
    code: 'SA',
    name: 'Arab Saudi',
    cities: ['Riyadh', 'Jeddah', 'Makkah', 'Madinah', 'Dammam', 'Khobar', 'Taif'],
  },
  {
    code: 'ID',
    name: 'Indonesia',
    cities: ['Jakarta', 'Surabaya', 'Bandung', 'Medan', 'Makassar', 'Yogyakarta', 'Semarang', 'Mataram', 'Banda Aceh'],
  },
  {
    code: 'AU',
    name: 'Australia',
    cities: ['Sydney', 'Melbourne', 'Perth', 'Brisbane', 'Adelaide', 'Canberra'],
  },
];

export function getCountry(code: string): Country | undefined {
  return COUNTRIES.find((c) => c.code === code);
}

export function makeLocation(countryCode: string, city: string): Location {
  const c = getCountry(countryCode);
  return { countryCode, country: c?.name ?? countryCode, city };
}


/** Airport codes for short route labels. Unknown cities fall back to three letters. */
const CITY_CODES: Record<string, string> = {
  Riyadh: 'RUH', Jeddah: 'JED', Makkah: 'MKK', Madinah: 'MED', Dammam: 'DMM', Khobar: 'KHB', Taif: 'TIF',
  Jakarta: 'CGK', Surabaya: 'SUB', Bandung: 'BDO', Medan: 'KNO', Makassar: 'UPG', Yogyakarta: 'YIA',
  Semarang: 'SRG', Mataram: 'LOP', 'Banda Aceh': 'BTJ',
  Sydney: 'SYD', Melbourne: 'MEL', Perth: 'PER', Brisbane: 'BNE', Adelaide: 'ADL', Canberra: 'CBR',
};
export function cityCode(city: string): string {
  return CITY_CODES[city] ?? city.slice(0, 3).toUpperCase();
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
  { from: makeLocation('AU', 'Sydney'), to: makeLocation('ID', 'Jakarta') },
  { from: makeLocation('ID', 'Jakarta'), to: makeLocation('AU', 'Melbourne') },
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

export const HANDOVER_METHODS = [
  'Ketemuan di titik temu (COD lokasi)',
  'Kirim via ekspedisi lokal setelah tiba',
  'Ambil di rumah penyedia (alamat dibagikan setelah deal)',
  'Antar langsung (area tertentu)',
];
