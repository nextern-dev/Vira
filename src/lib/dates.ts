/**
 * Date helpers. All persisted dates are calendar dates ("YYYY-MM-DD") so the
 * user's ledger never shifts because of a timezone conversion.
 */

export const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function isValidIsoDate(value: string): boolean {
  if (!ISO_DATE.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  if (m < 1 || m > 12 || d < 1 || d > 31) return false;
  const date = new Date(Date.UTC(y, m - 1, d));
  return (
    date.getUTCFullYear() === y &&
    date.getUTCMonth() === m - 1 &&
    date.getUTCDate() === d
  );
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function addDaysIso(iso: string, days: number): string {
  const date = new Date(`${iso}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function addMonthsIso(iso: string, months: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const target = new Date(Date.UTC(y, m - 1 + months, 1));
  const lastDay = new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0),
  ).getUTCDate();
  target.setUTCDate(Math.min(d, lastDay));
  return target.toISOString().slice(0, 10);
}

export function startOfMonthIso(iso: string): string {
  return `${iso.slice(0, 7)}-01`;
}

export function endOfMonthIso(iso: string): string {
  const [y, m] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
}

export function monthKey(iso: string): string {
  return iso.slice(0, 7);
}

export function formatMonthLabel(key: string, short = false): string {
  const [y, m] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-US", {
    month: short ? "short" : "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function formatDateLabel(iso: string): string {
  if (!isValidIsoDate(iso)) return iso;
  return new Date(`${iso}T00:00:00.000Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function daysBetween(fromIso: string, toIso: string): number {
  const a = Date.parse(`${fromIso}T00:00:00.000Z`);
  const b = Date.parse(`${toIso}T00:00:00.000Z`);
  return Math.round((b - a) / 86_400_000);
}

export type DateRange = { from: string; to: string };

export type PresetRange =
  | "this_month"
  | "last_month"
  | "last_30_days"
  | "last_90_days"
  | "this_year"
  | "all_time"
  | "custom";

export const PRESET_LABELS: Record<PresetRange, string> = {
  this_month: "This month",
  last_month: "Last month",
  last_30_days: "Last 30 days",
  last_90_days: "Last 90 days",
  this_year: "This year",
  all_time: "All time",
  custom: "Custom range",
};

export const EARLIEST_DATE = "1970-01-01";

export function resolvePreset(preset: PresetRange, today = todayIso()): DateRange {
  switch (preset) {
    case "last_month": {
      const prev = addMonthsIso(startOfMonthIso(today), -1);
      return { from: startOfMonthIso(prev), to: endOfMonthIso(prev) };
    }
    case "last_30_days":
      return { from: addDaysIso(today, -29), to: today };
    case "last_90_days":
      return { from: addDaysIso(today, -89), to: today };
    case "this_year":
      return { from: `${today.slice(0, 4)}-01-01`, to: `${today.slice(0, 4)}-12-31` };
    case "all_time":
      return { from: EARLIEST_DATE, to: "2999-12-31" };
    case "this_month":
    default:
      return { from: startOfMonthIso(today), to: endOfMonthIso(today) };
  }
}

/** Inclusive list of month keys spanning a range, capped for safety. */
export function monthsInRange(from: string, to: string, cap = 24): string[] {
  const keys: string[] = [];
  let cursor = startOfMonthIso(from);
  const end = startOfMonthIso(to);
  while (cursor <= end && keys.length < cap) {
    keys.push(monthKey(cursor));
    cursor = addMonthsIso(cursor, 1);
  }
  return keys;
}
