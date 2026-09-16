/**
 * Money utilities.
 *
 * Every monetary value in Vira is an integer number of minor units (cents).
 * Parsing happens on strings so we never round-trip through a float.
 */

export const MAX_AMOUNT_CENTS = 1_000_000_000_00; // 1 billion units
const AMOUNT_PATTERN = /^-?\d{1,15}(?:[.,]\d{0,2})?$/;

const DIGIT_MAP: Record<string, string> = Object.fromEntries([
  // Arabic-Indic (U+0660..0669): ٠١٢٣٤٥٦٧٨٩
  ...Array.from({ length: 10 }, (_, i) => [String.fromCharCode(0x0660 + i), String(i)]),
  // Extended Arabic-Indic / Persian (U+06F0..06F9): ۰۱۲۳۴۵۶۷۸۹
  ...Array.from({ length: 10 }, (_, i) => [String.fromCharCode(0x06f0 + i), String(i)]),
  // Fullwidth Latin (U+FF10..FF19): ０１２...９
  ...Array.from({ length: 10 }, (_, i) => [String.fromCharCode(0xff10 + i), String(i)]),
  // Devanagari
  ...Array.from({ length: 10 }, (_, i) => [String.fromCharCode(0x0966 + i), String(i)]),
]);

/** Convert non-Latin numeral systems to ASCII digits so parseMoney accepts them. */
export function normalizeLatinDigits(input: string): string {
  let out = "";
  for (const ch of input) {
    out += DIGIT_MAP[ch] ?? ch;
  }
  return out;
}

/**
 * Parse a user supplied amount ("12", "12.4", "1,05", "۱۲٫۵۰") into positive
 * cents. Returns null when the value is not a well formed, in-range amount.
 */
export function parseAmountToCents(input: unknown): number | null {
  if (typeof input === "number") {
    if (!Number.isFinite(input)) return null;
    input = input.toFixed(2);
  }
  if (typeof input !== "string") return null;

  const raw = normalizeLatinDigits(input)
    .trim()
    .replace(/[\s_٬]/g, "")
    .replace(/٫/g, "."); // Arabic decimal separator U+066B
  if (raw.length === 0) return null;
  if (!AMOUNT_PATTERN.test(raw)) return null;
  if (raw.startsWith("-")) return null;

  const [whole, fraction = ""] = raw.replace(",", ".").split(".");
  const paddedFraction = (fraction + "00").slice(0, 2);
  const cents = Number(whole) * 100 + Number(paddedFraction);

  if (!Number.isSafeInteger(cents)) return null;
  if (cents <= 0) return null;
  if (cents > MAX_AMOUNT_CENTS) return null;

  return cents;
}

export function centsToDecimalString(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(Math.trunc(cents));
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, "0")}`;
}

const formatterCache = new Map<string, Intl.NumberFormat>();

function getFormatter(currency: string, compact: boolean): Intl.NumberFormat {
  const key = `${currency}:${compact}`;
  const cached = formatterCache.get(key);
  if (cached) return cached;

  let formatter: Intl.NumberFormat;
  try {
    formatter = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      notation: compact ? "compact" : "standard",
      maximumFractionDigits: compact ? 1 : 2,
      minimumFractionDigits: compact ? 0 : 2,
    });
  } catch {
    formatter = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      notation: compact ? "compact" : "standard",
      maximumFractionDigits: compact ? 1 : 2,
      minimumFractionDigits: compact ? 0 : 2,
    });
  }
  formatterCache.set(key, formatter);
  return formatter;
}

export function formatMoney(
  cents: number,
  currency = "USD",
  options: { compact?: boolean; signed?: boolean } = {},
): string {
  const value = (Number.isFinite(cents) ? cents : 0) / 100;
  const text = getFormatter(currency, options.compact ?? false).format(
    Math.abs(value),
  );
  if (options.signed && value !== 0) return `${value > 0 ? "+" : "−"}${text}`;
  return value < 0 ? `−${text}` : text;
}

export const SUPPORTED_CURRENCIES = [
  "USD",
  "EUR",
  "GBP",
  "CAD",
  "AUD",
  "INR",
  "JPY",
  "SGD",
  "CHF",
  "SEK",
  "NGN",
  "BRL",
  "ZAR",
  "MXN",
] as const;

export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];
