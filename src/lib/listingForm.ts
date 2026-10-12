import type { Currency, Listing, ListingType, Product } from '@/types';
import { makeLocation, sameLocation } from '@/data/locations';
import { daysUntil, isValidDateKey, parseDateKey } from './dates';
import { uuid } from './utils';

/** Form state is string-based so inputs stay controlled; converted to a Listing payload on save. */
export type ProductForm = {
  id: string;
  name: string;
  category: string;
  description: string;
  imageUrl: string;
  unitPrice: string;
  currency: Currency;
  quantityAvailable: string;
  variant: string;
};

export type ListingForm = {
  type: ListingType;
  title: string;
  description: string;
  originCountry: string;
  originCity: string;
  destCountry: string;
  destCity: string;
  departureDate: string;
  returnDate: string;
  orderDeadline: string;
  returnLegDropOff: boolean;
  currency: Currency;
  capacityKg: string;
  pricePerKg: string;
  permittedItemsNote: string;
  prohibitedItemsNote: string;
  handoverMethod: string;
  terms: string;
  coverImageUrl: string;
  products: ProductForm[];
  acknowledgedRules: boolean;
};

export type FormErrors = Record<string, string>;

export type ListingPayload =
  | Omit<Extract<Listing, { type: 'weight' }>, ServerFields>
  | Omit<Extract<Listing, { type: 'shopping' }>, ServerFields>;

type ServerFields =
  | 'id'
  | 'ownerId'
  | 'status'
  | 'createdAt'
  | 'updatedAt'
  | 'viewCount'
  | 'publishedAt'
  | 'manuallyClosed'
  | 'closedByAdmin';

export function emptyProduct(currency: Currency): ProductForm {
  return {
    id: uuid(),
    name: '',
    category: '',
    description: '',
    imageUrl: '',
    unitPrice: '',
    currency,
    quantityAvailable: '',
    variant: '',
  };
}

export function emptyForm(type: ListingType): ListingForm {
  return {
    type,
    title: '',
    description: '',
    originCountry: 'SA',
    originCity: '',
    destCountry: 'ID',
    destCity: '',
    departureDate: '',
    returnDate: '',
    orderDeadline: '',
    returnLegDropOff: false,
    currency: 'SAR',
    capacityKg: '',
    pricePerKg: '',
    permittedItemsNote: '',
    prohibitedItemsNote: '',
    handoverMethod: '',
    terms: '',
    coverImageUrl: '',
    products: type === 'shopping' ? [emptyProduct('SAR')] : [],
    acknowledgedRules: false,
  };
}

const numStr = (n: number | undefined) => (n === undefined || Number.isNaN(n) || n === 0 ? '' : String(n));

export function formFromListing(l: Listing): ListingForm {
  const base = emptyForm(l.type);
  return {
    ...base,
    title: l.title,
    description: l.description,
    originCountry: l.origin.countryCode,
    originCity: l.origin.city,
    destCountry: l.destination.countryCode,
    destCity: l.destination.city,
    departureDate: l.departureDate,
    returnDate: l.returnDate ?? '',
    orderDeadline: l.orderDeadline,
    currency: l.currency,
    prohibitedItemsNote: l.prohibitedItemsNote ?? '',
    handoverMethod: l.handoverMethod ?? '',
    terms: l.terms,
    coverImageUrl: l.imageUrls[0] ?? '',
    acknowledgedRules: false, // must re-acknowledge on every publish/save
    ...(l.type === 'weight'
      ? {
          capacityKg: numStr(l.capacityKg),
          pricePerKg: numStr(l.pricePerKg),
          permittedItemsNote: l.permittedItemsNote ?? '',
          returnLegDropOff: !!l.returnLegDropOff,
          products: [],
        }
      : {
          products: l.products.map((p) => ({
            id: p.id,
            name: p.name,
            category: p.category,
            description: p.description ?? '',
            imageUrl: p.imageUrl ?? '',
            unitPrice: numStr(p.unitPrice),
            currency: p.currency,
            quantityAvailable: String(p.quantityAvailable),
            variant: p.variant ?? '',
          })),
        }),
  };
}

const toNum = (s: string) => {
  const n = Number(String(s).replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
};
const opt = (s: string) => (s.trim() ? s.trim() : undefined);

export function suggestTitle(f: ListingForm): string {
  if (!f.originCity || !f.destCity) return '';
  return f.type === 'weight'
    ? `Bagasi ${f.originCity} → ${f.destCity}${f.capacityKg ? `, ${f.capacityKg} kg` : ''}`
    : `Jastip belanja ${f.originCity} → ${f.destCity}`;
}

export function payloadFromForm(f: ListingForm): ListingPayload {
  const common = {
    title: f.title.trim() || suggestTitle(f) || 'Draf tanpa judul',
    description: f.description.trim(),
    origin: makeLocation(f.originCountry, f.originCity.trim()),
    destination: makeLocation(f.destCountry, f.destCity.trim()),
    departureDate: f.departureDate,
    returnDate: opt(f.returnDate),
    orderDeadline: f.orderDeadline,
    currency: f.currency,
    terms: f.terms.trim(),
    prohibitedItemsNote: opt(f.prohibitedItemsNote),
    handoverMethod: opt(f.handoverMethod),
    imageUrls: f.coverImageUrl.trim() ? [f.coverImageUrl.trim()] : [],
    acknowledgedRules: f.acknowledgedRules,
  };
  if (f.type === 'weight') {
    return {
      ...common,
      type: 'weight',
      capacityKg: toNum(f.capacityKg),
      pricePerKg: toNum(f.pricePerKg),
      permittedItemsNote: opt(f.permittedItemsNote),
      returnLegDropOff: f.returnLegDropOff || undefined,
    };
  }
  const products: Product[] = f.products.map((p) => ({
    id: p.id,
    name: p.name.trim(),
    category: p.category || 'Lainnya',
    description: opt(p.description),
    imageUrl: opt(p.imageUrl),
    unitPrice: toNum(p.unitPrice),
    currency: p.currency,
    quantityAvailable: Math.max(0, Math.floor(toNum(p.quantityAvailable))),
    variant: opt(p.variant),
  }));
  return { ...common, type: 'shopping', products };
}

export type ValidationContext = {
  /** Original listing when editing; used to allow unchanged past dates. */
  original?: Listing;
  reservedKg?: number;
  reservedByProduct?: Record<string, number>;
  /** Products referenced by pending/accepted/completed inquiries cannot be removed. */
  lockedProductIds?: string[];
};

const isUrl = (s: string) => /^https?:\/\/\S+$/i.test(s.trim());
const isPositive = (s: string) => s.trim() !== '' && toNum(s) > 0;

export const STEP_FIELDS: Record<ListingType, string[][]> = {
  weight: [
    ['originCountry', 'originCity', 'destCountry', 'destCity', 'route', 'departureDate', 'returnDate', 'orderDeadline'],
    ['capacityKg', 'pricePerKg', 'currency'],
    ['title', 'description', 'handoverMethod', 'terms', 'coverImageUrl', 'permittedItemsNote', 'prohibitedItemsNote'],
    ['acknowledgedRules'],
  ],
  shopping: [
    ['originCountry', 'originCity', 'destCountry', 'destCity', 'route', 'departureDate', 'returnDate', 'orderDeadline', 'currency'],
    ['products'],
    ['title', 'description', 'handoverMethod', 'terms', 'coverImageUrl', 'prohibitedItemsNote'],
    ['acknowledgedRules'],
  ],
};

export function errorsForStep(errors: FormErrors, type: ListingType, step: number): FormErrors {
  const fields = STEP_FIELDS[type][step] ?? [];
  return Object.fromEntries(Object.entries(errors).filter(([k]) => fields.some((f) => k === f || k.startsWith(f + '.'))));
}

export function validateListingForm(f: ListingForm, ctx: ValidationContext = {}): FormErrors {
  const e: FormErrors = {};
  const o = ctx.original;

  if (!f.originCountry) e.originCountry = 'Pilih negara asal.';
  if (!f.originCity.trim()) e.originCity = 'Pilih atau ketik kota asal.';
  if (!f.destCountry) e.destCountry = 'Pilih negara tujuan.';
  if (!f.destCity.trim()) e.destCity = 'Pilih atau ketik kota tujuan.';
  if (
    f.originCity.trim() &&
    f.destCity.trim() &&
    sameLocation(makeLocation(f.originCountry, f.originCity), makeLocation(f.destCountry, f.destCity))
  ) {
    e.route = 'Kota asal dan tujuan tidak boleh sama.';
  }

  const depUnchanged = o && o.departureDate === f.departureDate;
  if (!isValidDateKey(f.departureDate)) e.departureDate = 'Isi tanggal keberangkatan.';
  else if (!depUnchanged && daysUntil(f.departureDate) < 0) e.departureDate = 'Tanggal keberangkatan sudah lewat.';

  if (f.returnDate) {
    if (!isValidDateKey(f.returnDate)) e.returnDate = 'Format tanggal kembali tidak valid.';
    else if (isValidDateKey(f.departureDate) && parseDateKey(f.returnDate) <= parseDateKey(f.departureDate))
      e.returnDate = 'Tanggal kembali harus setelah tanggal berangkat.';
  }

  const deadlineLabel = f.type === 'weight' ? 'Batas terakhir titip' : 'Batas pemesanan';
  const dlUnchanged = o && o.orderDeadline === f.orderDeadline;
  if (!isValidDateKey(f.orderDeadline)) e.orderDeadline = `Isi tanggal ${deadlineLabel.toLowerCase()}.`;
  else if (!dlUnchanged && daysUntil(f.orderDeadline) < 0) e.orderDeadline = `${deadlineLabel} sudah lewat.`;
  else if (isValidDateKey(f.departureDate) && parseDateKey(f.orderDeadline) > parseDateKey(f.departureDate)) {
    if (f.type === 'weight' && f.returnLegDropOff) {
      if (!f.returnDate) e.orderDeadline = 'Untuk titip di perjalanan pulang, isi tanggal kembali terlebih dahulu.';
      else if (isValidDateKey(f.returnDate) && parseDateKey(f.orderDeadline) > parseDateKey(f.returnDate))
        e.orderDeadline = `${deadlineLabel} tidak boleh setelah tanggal kembali.`;
    } else {
      e.orderDeadline = `${deadlineLabel} tidak boleh setelah tanggal keberangkatan.`;
    }
  }

  if (f.type === 'weight') {
    if (!isPositive(f.capacityKg)) e.capacityKg = 'Kapasitas harus lebih dari 0 kg.';
    else if (toNum(f.capacityKg) > 200) e.capacityKg = 'Kapasitas maksimal 200 kg per listing.';
    else if (ctx.reservedKg && toNum(f.capacityKg) < ctx.reservedKg)
      e.capacityKg = `Kapasitas tidak boleh kurang dari ${ctx.reservedKg} kg yang sudah diterima.`;
    if (!isPositive(f.pricePerKg)) e.pricePerKg = 'Biaya per kg harus lebih dari 0.';
  } else {
    if (f.products.length === 0) e.products = 'Tambahkan minimal satu produk.';
    f.products.forEach((p, i) => {
      if (p.name.trim().length < 2) e[`products.${i}.name`] = 'Nama produk wajib diisi.';
      if (!p.category) e[`products.${i}.category`] = 'Pilih kategori.';
      if (!isPositive(p.unitPrice)) e[`products.${i}.unitPrice`] = 'Harga harus lebih dari 0.';
      const q = toNum(p.quantityAvailable);
      if (p.quantityAvailable.trim() === '' || q < 0 || !Number.isInteger(q))
        e[`products.${i}.quantityAvailable`] = 'Isi stok berupa bilangan bulat ≥ 0.';
      else if ((ctx.reservedByProduct?.[p.id] ?? 0) > q)
        e[`products.${i}.quantityAvailable`] = `Minimal ${ctx.reservedByProduct![p.id]} (sudah dipesan & diterima).`;
      if (p.imageUrl.trim() && !isUrl(p.imageUrl)) e[`products.${i}.imageUrl`] = 'URL gambar harus diawali http:// atau https://';
    });
    if (f.products.length > 0 && !f.products.some((p) => toNum(p.quantityAvailable) > 0) && !e.products)
      e.products = 'Minimal satu produk harus memiliki stok.';
    const missing = (ctx.lockedProductIds ?? []).filter((id) => !f.products.some((p) => p.id === id));
    if (missing.length) e.products = 'Produk yang sudah memiliki pesanan aktif tidak dapat dihapus. Ubah stoknya menjadi 0 jika ingin berhenti menjual.';
  }

  if (f.title.trim().length < 8) e.title = 'Judul minimal 8 karakter.';
  else if (f.title.trim().length > 100) e.title = 'Judul maksimal 100 karakter.';
  if (f.description.trim().length < 20) e.description = 'Deskripsi minimal 20 karakter agar calon penitip paham.';
  if (!f.handoverMethod.trim()) e.handoverMethod = 'Pilih cara serah terima.';
  if (f.terms.trim().length < 10) e.terms = 'Tuliskan syarat & ketentuan (minimal 10 karakter).';
  if (f.coverImageUrl.trim() && !isUrl(f.coverImageUrl)) e.coverImageUrl = 'URL gambar harus diawali http:// atau https://';

  if (!f.acknowledgedRules) e.acknowledgedRules = 'Anda wajib menyetujui ketentuan barang terlarang sebelum menerbitkan.';
  return e;
}
