import type { Currency } from '@/types';
import { parseDateKey, daysUntil } from './dates';

const LOCALE = 'id-ID';

export function formatMoney(amount: number, currency: Currency): string {
  const fmt = new Intl.NumberFormat(LOCALE, {
    minimumFractionDigits: 0,
    maximumFractionDigits: currency === 'IDR' ? 0 : 2,
  });
  return currency === 'IDR' ? `Rp${fmt.format(amount)}` : `${fmt.format(amount)} SAR`;
}

/** Formats amounts grouped by currency, e.g. "120 SAR + Rp50.000". Never converts. */
export function formatMoneyGroups(groups: Partial<Record<Currency, number>>): string {
  const parts = (Object.entries(groups) as [Currency, number][])
    .filter(([, v]) => v > 0)
    .map(([c, v]) => formatMoney(v, c));
  return parts.length ? parts.join(' + ') : '-';
}

export function formatDate(key: string, opts?: Intl.DateTimeFormatOptions): string {
  return parseDateKey(key).toLocaleDateString(LOCALE, opts ?? { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatDateShort(key: string): string {
  return parseDateKey(key).toLocaleDateString(LOCALE, { day: 'numeric', month: 'short' });
}

export function formatDateLong(key: string): string {
  return parseDateKey(key).toLocaleDateString(LOCALE, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

export function formatMonthYear(iso: string): string {
  return new Date(iso).toLocaleDateString(LOCALE, { month: 'long', year: 'numeric' });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(LOCALE, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(LOCALE, { hour: '2-digit', minute: '2-digit' });
}

export function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.round(diff / 60000);
  if (min < 1) return 'baru saja';
  if (min < 60) return `${min} mnt lalu`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h} jam lalu`;
  const d = Math.round(h / 24);
  if (d < 7) return `${d} hari lalu`;
  return new Date(iso).toLocaleDateString(LOCALE, { day: 'numeric', month: 'short' });
}

export function formatCountdown(key: string): string {
  const d = daysUntil(key);
  if (d < 0) return `${Math.abs(d)} hari lalu`;
  if (d === 0) return 'hari ini';
  if (d === 1) return 'besok';
  return `${d} hari lagi`;
}

export function formatKg(kg: number): string {
  return `${new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 1 }).format(kg)} kg`;
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat(LOCALE).format(n);
}

/** Title without the route or dashes: origin and destination are already shown right below the title. */
export function listingTitle(l: { title: string; origin: { city: string }; destination: { city: string } }): string {
  const o = l.origin.city;
  const d = l.destination.city;
  let t = l.title;
  for (const ch of [String.fromCharCode(8212), String.fromCharCode(8211)]) t = t.split(ch).join(' ');
  const cut = (needle: string) => {
    const i = t.toLowerCase().indexOf(needle.toLowerCase());
    if (i < 0) return;
    let rest = t.slice(i + needle.length).trimStart();
    if (rest.startsWith(',')) rest = rest.slice(1);
    t = `${t.slice(0, i).trimEnd()} ${rest.trimStart()}`;
  };
  [`balik ke ${d} dari ${o}`, `${o} → ${d}`, `ke ${d} dari ${o}`, `dari ${o} ke ${d}`, `${o} ke ${d}`].forEach(cut);
  while (t.includes('  ')) t = t.split('  ').join(' ');
  t = t.trim();
  if (!t) return l.title;
  return t.charAt(0).toUpperCase() + t.slice(1);
}
