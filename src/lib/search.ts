import type { Currency, ListingType } from '@/types';
import type { ListingView } from '@/hooks/useStore';
import { referencePrice } from './availability';
import { isValidDateKey } from './dates';
import { compareListingDates, primaryDate } from './listingDates';

export type SortKey = 'newest' | 'departure' | 'price_asc' | 'price_desc';

export type ExploreFilters = {
  q: string;
  type: ListingType | '';
  oc: string; // origin country code
  ocity: string;
  dc: string; // destination country code
  dcity: string;
  from: string; // departure from (YYYY-MM-DD)
  to: string; // departure to
  includeClosed: boolean;
  cur: Currency | '';
  pmin: string;
  pmax: string;
  sort: SortKey;
};

export const DEFAULT_FILTERS: ExploreFilters = {
  q: '',
  type: '',
  oc: '',
  ocity: '',
  dc: '',
  dcity: '',
  from: '',
  to: '',
  includeClosed: false,
  cur: '',
  pmin: '',
  pmax: '',
  sort: 'departure',
};

const SORTS: SortKey[] = ['newest', 'departure', 'price_asc', 'price_desc'];

export function parseFilters(p: URLSearchParams): ExploreFilters {
  const type = p.get('type');
  const cur = p.get('cur');
  const sort = p.get('sort') as SortKey | null;
  return {
    q: p.get('q') ?? '',
    type: type === 'weight' || type === 'shopping' ? type : '',
    oc: p.get('oc') ?? '',
    ocity: p.get('ocity') ?? '',
    dc: p.get('dc') ?? '',
    dcity: p.get('dcity') ?? '',
    from: isValidDateKey(p.get('from') ?? '') ? p.get('from')! : '',
    to: isValidDateKey(p.get('to') ?? '') ? p.get('to')! : '',
    includeClosed: p.get('all') === '1',
    cur: cur === 'SAR' || cur === 'IDR' || cur === 'AUD' ? cur : '',
    pmin: p.get('pmin') ?? '',
    pmax: p.get('pmax') ?? '',
    sort: sort && SORTS.includes(sort) ? sort : DEFAULT_FILTERS.sort,
  };
}

export function filtersToParams(f: ExploreFilters): URLSearchParams {
  const p = new URLSearchParams();
  if (f.q.trim()) p.set('q', f.q.trim());
  if (f.type) p.set('type', f.type);
  if (f.oc) p.set('oc', f.oc);
  if (f.ocity) p.set('ocity', f.ocity);
  if (f.dc) p.set('dc', f.dc);
  if (f.dcity) p.set('dcity', f.dcity);
  if (f.from) p.set('from', f.from);
  if (f.to) p.set('to', f.to);
  if (f.includeClosed) p.set('all', '1');
  if (f.cur) {
    p.set('cur', f.cur);
    if (f.pmin) p.set('pmin', f.pmin);
    if (f.pmax) p.set('pmax', f.pmax);
  }
  if (f.sort !== DEFAULT_FILTERS.sort) p.set('sort', f.sort);
  return p;
}

const norm = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '');

function haystack(v: ListingView): string {
  const l = v.listing;
  const parts = [
    l.title,
    l.description,
    l.origin.city,
    l.origin.country,
    l.destination.city,
    l.destination.country,
    v.owner?.displayName ?? '',
    l.type === 'weight' ? 'jastip diaspora bagasi titip kg' : 'jastip shopping belanja produk',
  ];
  if (l.type === 'shopping') l.products.forEach((p) => parts.push(p.name, p.category, p.variant ?? ''));
  return norm(parts.join(' '));
}

export function applyFilters(views: ListingView[], f: ExploreFilters): ListingView[] {
  const tokens = norm(f.q).split(/\s+/).filter(Boolean);
  const pmin = f.pmin ? Number(f.pmin) : null;
  const pmax = f.pmax ? Number(f.pmax) : null;

  const out = views.filter((v) => {
    const l = v.listing;
    if (v.status === 'draft') return false;
    if (!f.includeClosed && v.status !== 'open') return false;
    if (f.type && l.type !== f.type) return false;
    if (f.oc && l.origin.countryCode !== f.oc) return false;
    if (f.ocity && l.origin.city.toLowerCase() !== f.ocity.toLowerCase()) return false;
    if (f.dc && l.destination.countryCode !== f.dc) return false;
    if (f.dcity && l.destination.city.toLowerCase() !== f.dcity.toLowerCase()) return false;
    const when = primaryDate(l);
    if ((f.from || f.to) && !when) return false;
    if (f.from && when! < f.from) return false;
    if (f.to && when! > f.to) return false;
    if (f.cur) {
      const ref = referencePrice(l);
      if (!ref || ref.currency !== f.cur) return false;
      if (pmin !== null && !Number.isNaN(pmin) && ref.amount < pmin) return false;
      if (pmax !== null && !Number.isNaN(pmax) && ref.amount > pmax) return false;
    }
    if (tokens.length) {
      const h = haystack(v);
      if (!tokens.every((t) => h.includes(t))) return false;
    }
    return true;
  });

  const openFirst = (a: ListingView, b: ListingView) => Number(b.status === 'open') - Number(a.status === 'open');
  out.sort((a, b) => {
    const o = openFirst(a, b);
    if (o) return o;
    switch (f.sort) {
      case 'newest':
        return (b.listing.publishedAt ?? b.listing.createdAt).localeCompare(a.listing.publishedAt ?? a.listing.createdAt);
      case 'price_asc':
      case 'price_desc': {
        const pa = referencePrice(a.listing);
        const pb = referencePrice(b.listing);
        if (!pa || !pb) return Number(!pa) - Number(!pb);
        // Prices are only comparable within a currency; group by currency first.
        if (pa.currency !== pb.currency) return pa.currency.localeCompare(pb.currency);
        return f.sort === 'price_asc' ? pa.amount - pb.amount : pb.amount - pa.amount;
      }
      default:
        return compareListingDates(a.listing, b.listing);
    }
  });
  return out;
}

export function countActiveFilters(f: ExploreFilters): number {
  let n = 0;
  if (f.type) n++;
  if (f.oc || f.ocity) n++;
  if (f.dc || f.dcity) n++;
  if (f.from || f.to) n++;
  if (f.includeClosed) n++;
  if (f.cur) n++;
  return n;
}
