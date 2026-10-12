/** Date-only values are stored as `YYYY-MM-DD` and interpreted in local time. */

export function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function todayKey(): string {
  return toDateKey(new Date());
}

export function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

export function daysFromToday(days: number): string {
  return toDateKey(addDays(new Date(), days));
}

export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y!, (m ?? 1) - 1, d ?? 1);
}

export function isValidDateKey(key: string | undefined): key is string {
  if (!key || !/^\d{4}-\d{2}-\d{2}$/.test(key)) return false;
  return !Number.isNaN(parseDateKey(key).getTime());
}

/** Whole days from today until the given date key (negative when in the past). */
export function daysUntil(key: string): number {
  const ms = parseDateKey(key).getTime() - parseDateKey(todayKey()).getTime();
  return Math.round(ms / 86_400_000);
}
