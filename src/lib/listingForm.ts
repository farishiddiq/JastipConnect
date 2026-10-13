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
  /** Photo as a link or a small data URL. Optional. */
  imageUrl: string;
  videoUrl: string;
  /** Optional. Empty means buyers are asked to enquire. */
  unitPrice: string;
  currency: Currency | '';
  lastOrderDate: string;
  terms: string;
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
  /** Belanja only, required. */
  arrivalDate: string;
  orderDeadline: string;
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

export function emptyProduct(): ProductForm {
  return {
    id: uuid(),
    name: '',
    category: '',
    description: '',
    imageUrl: '',
    videoUrl: '',
    unitPrice: '',
    currency: '',
    lastOrderDate: '',
    terms: '',
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
    arrivalDate: '',
    orderDeadline: '',
    currency: 'SAR',
    capacityKg: '',
    pricePerKg: '',
    permittedItemsNote: '',
    prohibitedItemsNote: '',
    handoverMethod: '',
    terms: '',
    coverImageUrl: '',
    products: type === 'shopping' ? [emptyProduct()] : [],
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
    departureDate: l.departureDate ?? '',
    arrivalDate: l.type === 'shopping' ? (l.arrivalDate ?? '') : '',
    orderDeadline: l.orderDeadline ?? '',
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
          products: [],
        }
      : {
          products: l.products.map((p) => ({
            id: p.id,
            name: p.name,
            category: p.category,
            description: p.description ?? '',
            imageUrl: p.imageUrl ?? '',
            videoUrl: p.videoUrl ?? '',
            unitPrice: numStr(p.unitPrice),
            currency: p.currency ?? '',
            lastOrderDate: p.lastOrderDate ?? '',
            terms: p.terms ?? '',
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
    departureDate: opt(f.departureDate),
    orderDeadline: opt(f.orderDeadline),
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
    };
  }
  const products: Product[] = f.products.map((p) => ({
    id: p.id,
    name: p.name.trim(),
    category: p.category || 'Lainnya',
    description: opt(p.description),
    imageUrl: opt(p.imageUrl),
    unitPrice: p.unitPrice.trim() ? toNum(p.unitPrice) : undefined,
    // A price always carries a currency; fall back to the listing currency rather than inventing one.
    currency: p.unitPrice.trim() ? p.currency || f.currency : p.currency || undefined,
    lastOrderDate: opt(p.lastOrderDate),
    terms: opt(p.terms),
    videoUrl: opt(p.videoUrl),
    quantityAvailable: Math.max(0, Math.floor(toNum(p.quantityAvailable))),
    variant: opt(p.variant),
  }));
  return { ...common, type: 'shopping', arrivalDate: f.arrivalDate, products };
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
const isMedia = (s: string) => isUrl(s) || /^data:(image|video)\//i.test(s.trim());
const isPositive = (s: string) => s.trim() !== '' && toNum(s) > 0;

export const STEP_FIELDS: Record<ListingType, string[][]> = {
  weight: [
    ['originCountry', 'originCity', 'destCountry', 'destCity', 'route', 'departureDate', 'orderDeadline'],
    ['capacityKg', 'pricePerKg', 'currency'],
    ['title', 'description', 'handoverMethod', 'terms', 'coverImageUrl', 'permittedItemsNote', 'prohibitedItemsNote'],
    ['acknowledgedRules'],
  ],
  shopping: [
    ['originCountry', 'originCity', 'destCountry', 'destCity', 'route', 'departureDate', 'arrivalDate', 'orderDeadline', 'currency'],
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

  const isWeight = f.type === 'weight';
  const pastOk = (value: string | undefined, current: string) => !!o && (value ?? '') === current;

  // Departure: required for bagasi, optional for belanja.
  if (f.departureDate) {
    if (!isValidDateKey(f.departureDate)) e.departureDate = 'Format tanggal keberangkatan tidak valid.';
    else if (!pastOk(o?.departureDate, f.departureDate) && daysUntil(f.departureDate) < 0) e.departureDate = 'Tanggal keberangkatan sudah lewat.';
  } else if (isWeight) {
    e.departureDate = 'Isi tanggal keberangkatan.';
  }

  // Arrival: required for belanja.
  if (!isWeight) {
    const oldArrival = o?.type === 'shopping' ? o.arrivalDate : undefined;
    if (!f.arrivalDate) e.arrivalDate = 'Isi tanggal tiba.';
    else if (!isValidDateKey(f.arrivalDate)) e.arrivalDate = 'Format tanggal tiba tidak valid.';
    else if (!pastOk(oldArrival, f.arrivalDate) && daysUntil(f.arrivalDate) < 0) e.arrivalDate = 'Tanggal tiba sudah lewat.';
    else if (isValidDateKey(f.departureDate) && parseDateKey(f.arrivalDate) < parseDateKey(f.departureDate))
      e.arrivalDate = 'Tanggal tiba tidak boleh sebelum tanggal berangkat.';
  }

  // Last drop-off (bagasi, required) or order date (belanja, optional).
  const deadlineLabel = isWeight ? 'Batas terakhir titip' : 'Batas pemesanan';
  if (f.orderDeadline) {
    if (!isValidDateKey(f.orderDeadline)) e.orderDeadline = 'Format tanggal tidak valid.';
    else if (!pastOk(o?.orderDeadline, f.orderDeadline) && daysUntil(f.orderDeadline) < 0) e.orderDeadline = `${deadlineLabel} sudah lewat.`;
    else {
      const limit = isValidDateKey(f.departureDate) ? f.departureDate : !isWeight && isValidDateKey(f.arrivalDate) ? f.arrivalDate : '';
      if (limit && parseDateKey(f.orderDeadline) > parseDateKey(limit))
        e.orderDeadline = `${deadlineLabel} tidak boleh setelah ${limit === f.departureDate ? 'tanggal keberangkatan' : 'tanggal tiba'}.`;
    }
  } else if (isWeight) {
    e.orderDeadline = `Isi tanggal ${deadlineLabel.toLowerCase()}.`;
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
      if (p.unitPrice.trim() && !isPositive(p.unitPrice)) e[`products.${i}.unitPrice`] = 'Harga harus lebih dari 0, atau kosongkan.';
      if (p.lastOrderDate && !isValidDateKey(p.lastOrderDate)) e[`products.${i}.lastOrderDate`] = 'Format tanggal tidak valid.';
      const q = toNum(p.quantityAvailable);
      if (p.quantityAvailable.trim() === '' || q < 0 || !Number.isInteger(q))
        e[`products.${i}.quantityAvailable`] = 'Isi stok berupa bilangan bulat ≥ 0.';
      else if ((ctx.reservedByProduct?.[p.id] ?? 0) > q)
        e[`products.${i}.quantityAvailable`] = `Minimal ${ctx.reservedByProduct![p.id]} (sudah dipesan & diterima).`;
      if (p.imageUrl.trim() && !isMedia(p.imageUrl)) e[`products.${i}.imageUrl`] = 'Foto harus berupa tautan http(s) atau file yang diunggah.';
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
  if (f.coverImageUrl.trim() && !isUrl(f.coverImageUrl)) e.coverImageUrl = 'URL gambar harus diawali http:// atau https://';

  if (!f.acknowledgedRules) e.acknowledgedRules = 'Anda wajib menyetujui ketentuan barang terlarang sebelum menerbitkan.';
  return e;
}
