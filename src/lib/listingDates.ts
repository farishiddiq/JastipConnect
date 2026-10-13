import type { Listing } from '@/types';
import { formatDateShort } from './format';

const arrivalOf = (l: Listing) => (l.type === 'shopping' ? l.arrivalDate : undefined);

/** The one date that best describes "when": departure, otherwise arrival. */
export function primaryDate(l: Listing): string | undefined {
  return l.departureDate ?? arrivalOf(l);
}

const cmp = (a?: string, b?: string) => {
  if (a && b) return a.localeCompare(b);
  if (a) return -1;
  if (b) return 1;
  return 0;
};

/**
 * Default ordering. Dated departures come first (earliest first), ties broken by the last drop-off or order date.
 * Listings without a departure date follow, ordered by arrival date. Missing dates always sort last.
 */
export function compareListingDates(a: Listing, b: Listing): number {
  if (a.departureDate && b.departureDate) return cmp(a.departureDate, b.departureDate) || cmp(a.orderDeadline, b.orderDeadline);
  if (a.departureDate) return -1;
  if (b.departureDate) return 1;
  return cmp(arrivalOf(a), arrivalOf(b)) || cmp(a.orderDeadline, b.orderDeadline);
}

export type DateFact = { label: string; value: string };

/** Only dates that exist. Nothing is invented for missing ones. */
export function dateFacts(l: Listing): DateFact[] {
  const out: DateFact[] = [];
  if (l.departureDate) out.push({ label: 'Berangkat', value: formatDateShort(l.departureDate) });
  const arrival = arrivalOf(l);
  if (arrival) out.push({ label: 'Tiba', value: formatDateShort(arrival) });
  if (l.orderDeadline) out.push({ label: l.type === 'weight' ? 'Batas titip' : 'Batas pesan', value: formatDateShort(l.orderDeadline) });
  return out;
}
