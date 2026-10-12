import type { Listing } from '@/types';

/** Self-hosted Unsplash photography (see public/images/CREDITS.md). */
const img = (name: string) => `/images/${name}.webp`;

export const HERO_IMAGE = img('hero');

const CITY_IMAGES: Record<string, string> = {
  riyadh: img('riyadh'),
  jeddah: img('jeddah'),
  madinah: img('madinah'),
  makkah: img('makkah'),
  jakarta: img('jakarta'),
  surabaya: img('surabaya'),
  bandung: img('bandung'),
  makassar: img('makassar'),
};

const CATEGORY_IMAGES: Record<string, string> = {
  Kurma: img('kurma'),
  Cokelat: img('cokelat'),
  'Fashion Muslim': img('fashion'),
  'Kosmetik & Perawatan': img('kosmetik'),
  'Wewangian non-alkohol': img('wewangian'),
  'Perlengkapan Ibadah': img('ibadah'),
  'Bumbu & Bahan Masak': img('bumbu'),
  'Makanan & Camilan': img('camilan'),
  Suvenir: img('suvenir'),
  Lainnya: img('lainnya'),
};

export const TYPE_IMAGES = { weight: img('luggage'), shopping: img('shopping') };

export function cityImage(city: string): string | undefined {
  return CITY_IMAGES[city.trim().toLowerCase()];
}

export function categoryImage(category: string): string | undefined {
  return CATEGORY_IMAGES[category];
}

/**
 * Cover priority: owner-supplied photo, then the city where the trip starts
 * (weight) or the lead product's category (shopping), then a type photo.
 */
export function coverImageFor(listing: Listing): string {
  if (listing.imageUrls[0]) return listing.imageUrls[0];
  if (listing.type === 'shopping') {
    const fromProduct = listing.products.map((p) => categoryImage(p.category)).find(Boolean);
    if (fromProduct) return fromProduct;
  }
  return cityImage(listing.origin.city) ?? cityImage(listing.destination.city) ?? TYPE_IMAGES[listing.type];
}
