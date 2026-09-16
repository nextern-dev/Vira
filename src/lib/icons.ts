/**
 * Canonical icon names. Categories store a *name*, never a glyph, so the
 * rendering layer can evolve without a data migration.
 */
export const CATEGORY_ICONS = [
  "tag",
  "cart",
  "home",
  "transit",
  "restaurant",
  "coffee",
  "bolt",
  "health",
  "media",
  "travel",
  "education",
  "gift",
  "apparel",
  "briefcase",
  "receipt",
  "wallet",
  "phone",
  "pet",
  "fitness",
  "tools",
  "fuel",
  "bank",
] as const;

export type CategoryIconName = (typeof CATEGORY_ICONS)[number];

export const DEFAULT_CATEGORY_ICON: CategoryIconName = "tag";

/** Legacy emoji values are mapped forward so old rows keep a sensible icon. */
const LEGACY: Record<string, CategoryIconName> = {
  "🛒": "cart",
  "🏠": "home",
  "🚇": "transit",
  "🍜": "restaurant",
  "☕️": "coffee",
  "☕": "coffee",
  "💡": "bolt",
  "🩺": "health",
  "📺": "media",
  "✈️": "travel",
  "🎓": "education",
  "🎁": "gift",
  "👕": "apparel",
  "💼": "briefcase",
  "🧾": "receipt",
  "💰": "wallet",
  "📱": "phone",
  "🐾": "pet",
  "⚽️": "fitness",
  "🔧": "tools",
  "⛽️": "fuel",
  "🏦": "bank",
};

const VALID = new Set<string>(CATEGORY_ICONS);

/** Always returns a renderable icon name — never throws on unknown input. */
export function normalizeCategoryIcon(value: unknown): CategoryIconName {
  if (typeof value !== "string") return DEFAULT_CATEGORY_ICON;
  const trimmed = value.trim();
  if (VALID.has(trimmed)) return trimmed as CategoryIconName;
  return LEGACY[trimmed] ?? DEFAULT_CATEGORY_ICON;
}

/** Curated, accessible category colours (WCAG-friendly against white). */
export const CATEGORY_COLORS = [
  "#4338ca",
  "#6d28d9",
  "#be185d",
  "#b42318",
  "#c2410c",
  "#a16207",
  "#15803d",
  "#047857",
  "#0e7490",
  "#0369a1",
  "#475467",
  "#7c2d12",
] as const;

export const DEFAULT_CATEGORY_COLOR = CATEGORY_COLORS[0];
