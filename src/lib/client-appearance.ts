"use client";

import {
  isAppearance,
  type Appearance,
  type AppearanceMode,
  type ResolvedColorScheme,
} from "@/lib/appearance";

const APPEARANCE_EVENT = "vira:appearance-change";
const APPEARANCE_CHANNEL = "vira:appearance-sync:v1";
let transitionTimer: number | null = null;

export function resolveAppearanceMode(
  mode: AppearanceMode,
): ResolvedColorScheme {
  if (mode !== "system") return mode;
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

/** Applies one appearance atomically to the entire document. */
export function applyAppearance(
  appearance: Appearance,
  options: { animate?: boolean } = {},
): ResolvedColorScheme {
  const resolved = resolveAppearanceMode(appearance.mode);
  const root = document.documentElement;

  if (options.animate !== false && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    root.classList.add("theme-changing");
    if (transitionTimer !== null) window.clearTimeout(transitionTimer);
    transitionTimer = window.setTimeout(() => {
      root.classList.remove("theme-changing");
      transitionTimer = null;
    }, 260);
  }

  // Set all attributes synchronously so no component can observe a half-applied
  // palette/mode combination.
  root.dataset.theme = appearance.theme;
  root.dataset.appearanceMode = appearance.mode;
  root.dataset.colorScheme = resolved;
  root.style.colorScheme = resolved;
  return resolved;
}

/**
 * Announces a server-confirmed preference to every mounted picker/provider and
 * every other tab on this origin.
 */
export function publishAppearance(appearance: Appearance): void {
  const root = document.documentElement;
  root.dataset.cookieTheme = appearance.theme;
  root.dataset.cookieMode = appearance.mode;

  window.dispatchEvent(
    new CustomEvent<Appearance>(APPEARANCE_EVENT, { detail: appearance }),
  );

  if ("BroadcastChannel" in window) {
    const channel = new BroadcastChannel(APPEARANCE_CHANNEL);
    channel.postMessage(appearance);
    window.setTimeout(() => channel.close(), 0);
  }
}

export function subscribeAppearance(
  listener: (appearance: Appearance) => void,
): () => void {
  const onLocal = (event: Event) => {
    const detail = (event as CustomEvent<unknown>).detail;
    if (isAppearance(detail)) listener(detail);
  };
  window.addEventListener(APPEARANCE_EVENT, onLocal);

  let channel: BroadcastChannel | null = null;
  if ("BroadcastChannel" in window) {
    channel = new BroadcastChannel(APPEARANCE_CHANNEL);
    channel.addEventListener("message", (event: MessageEvent<unknown>) => {
      if (isAppearance(event.data)) listener(event.data);
    });
  }

  return () => {
    window.removeEventListener(APPEARANCE_EVENT, onLocal);
    channel?.close();
  };
}
