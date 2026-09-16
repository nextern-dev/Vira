import { cookies } from "next/headers";
import {
  DEFAULT_APPEARANCE,
  isAppearanceMode,
  isColorTheme,
  type AppearanceMode,
  type ColorTheme,
} from "@/lib/appearance";

const APPEARANCE_COOKIE = "vira_appearance";
const ONE_YEAR = 365 * 24 * 60 * 60;

export type StoredAppearance = {
  mode: AppearanceMode;
  theme: ColorTheme;
};

function serialize(appearance: StoredAppearance): string {
  return `${appearance.mode}:${appearance.theme}`;
}

function parse(value: string | undefined): StoredAppearance {
  if (!value) return DEFAULT_APPEARANCE;
  const [mode, theme, extra] = value.split(":");
  if (extra || !isAppearanceMode(mode) || !isColorTheme(theme)) {
    return DEFAULT_APPEARANCE;
  }
  return { mode, theme };
}

/** Reads only allow-listed appearance values; malformed cookies are ignored. */
export async function readAppearanceCookie(): Promise<StoredAppearance> {
  const store = await cookies();
  return parse(store.get(APPEARANCE_COOKIE)?.value);
}

export async function setAppearanceCookie(
  appearance: StoredAppearance,
): Promise<void> {
  const store = await cookies();
  const production = process.env.NODE_ENV === "production";
  store.set(APPEARANCE_COOKIE, serialize(appearance), {
    httpOnly: true,
    sameSite: production ? "none" : "lax",
    secure: production,
    path: "/",
    maxAge: ONE_YEAR,
  });
}

export async function clearAppearanceCookie(): Promise<void> {
  const store = await cookies();
  store.delete(APPEARANCE_COOKIE);
}
