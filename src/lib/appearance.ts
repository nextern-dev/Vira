export const APPEARANCE_MODES = ["light", "dark", "system"] as const;
export const COLOR_THEMES = [
  "indigo",
  "ocean",
  "forest",
  "graphite",
  "berry",
] as const;

export type AppearanceMode = (typeof APPEARANCE_MODES)[number];
export type ColorTheme = (typeof COLOR_THEMES)[number];
export type ResolvedColorScheme = "light" | "dark";

export type Appearance = {
  mode: AppearanceMode;
  theme: ColorTheme;
};

export const DEFAULT_APPEARANCE: Appearance = {
  mode: "system",
  theme: "indigo",
};

export const APPEARANCE_MODE_META: Record<
  AppearanceMode,
  { label: string; description: string }
> = {
  light: { label: "Light", description: "Bright and precise" },
  dark: { label: "Dark", description: "Rich and immersive" },
  system: { label: "System", description: "Follow this device" },
};

export const COLOR_THEME_META: Record<
  ColorTheme,
  {
    label: string;
    description: string;
    swatches: readonly [string, string, string];
  }
> = {
  indigo: {
    label: "Iris",
    description: "Violet & indigo",
    swatches: ["#4f46e5", "#7c3aed", "#a5b4fc"],
  },
  ocean: {
    label: "Tide",
    description: "Cyan & teal",
    swatches: ["#0369a1", "#0f766e", "#38bdf8"],
  },
  forest: {
    label: "Evergreen",
    description: "Emerald & lime",
    swatches: ["#047857", "#4d7c0f", "#4ade80"],
  },
  graphite: {
    label: "Slate",
    description: "Blue-grey & silver",
    swatches: ["#475569", "#64748b", "#cbd5e1"],
  },
  berry: {
    label: "Mulberry",
    description: "Rose & violet",
    swatches: ["#db2777", "#7c3aed", "#f472b6"],
  },
};

export function isAppearanceMode(value: unknown): value is AppearanceMode {
  return (
    typeof value === "string" &&
    (APPEARANCE_MODES as readonly string[]).includes(value)
  );
}

export function isColorTheme(value: unknown): value is ColorTheme {
  return typeof value === "string" && (COLOR_THEMES as readonly string[]).includes(value);
}

export function isAppearance(value: unknown): value is Appearance {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<Appearance>;
  return isAppearanceMode(candidate.mode) && isColorTheme(candidate.theme);
}
