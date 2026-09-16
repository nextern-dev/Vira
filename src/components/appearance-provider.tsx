"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Icon } from "@/components/icons";
import { apiFetch } from "@/lib/client";
import {
  applyAppearance,
  publishAppearance,
  subscribeAppearance,
} from "@/lib/client-appearance";
import type {
  Appearance,
  ResolvedColorScheme,
} from "@/lib/appearance";

export type { Appearance } from "@/lib/appearance";

type AppearanceContextValue = {
  /** Current preview (may be unsaved on the Settings page). */
  appearance: Appearance;
  /** Last value confirmed by the server. */
  savedAppearance: Appearance;
  resolved: ResolvedColorScheme;
  setAppearance: (appearance: Appearance) => void;
  markSaved: (appearance: Appearance) => void;
};

const AppearanceContext = createContext<AppearanceContextValue | null>(null);

export function AppearanceProvider({
  initial,
  children,
}: {
  initial: Appearance;
  children: ReactNode;
}) {
  const [appearance, setAppearanceState] = useState<Appearance>(initial);
  const [savedAppearance, setSavedAppearance] = useState<Appearance>(initial);
  const [resolved, setResolved] = useState<ResolvedColorScheme>(
    initial.mode === "dark" ? "dark" : "light",
  );

  const setAppearance = useCallback((next: Appearance) => {
    setAppearanceState(next);
    setResolved(applyAppearance(next));
  }, []);

  const markSaved = useCallback((next: Appearance) => {
    setAppearanceState(next);
    setSavedAppearance(next);
    setResolved(applyAppearance(next));
    publishAppearance(next);
  }, []);

  // Keep all tabs and all mounted appearance controls on the same confirmed
  // value. Remote changes intentionally replace stale local previews.
  useEffect(
    () =>
      subscribeAppearance((next) => {
        setAppearanceState(next);
        setSavedAppearance(next);
        setResolved(applyAppearance(next));
      }),
    [],
  );

  // Follow OS changes only while System mode is selected.
  useEffect(() => {
    setResolved(applyAppearance(appearance, { animate: false }));
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      if (appearance.mode === "system") {
        setResolved(applyAppearance(appearance));
      }
    };
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [appearance]);

  // RootLayout renders authenticated pages from the database. If another
  // device changed the account theme, this repairs the local presentation
  // cookie so public pages remain consistent after sign-out.
  useEffect(() => {
    const root = document.documentElement;
    if (
      root.dataset.cookieTheme === initial.theme &&
      root.dataset.cookieMode === initial.mode
    ) {
      return;
    }

    void apiFetch<{ appearance: Appearance }>("/api/appearance", {
      method: "PATCH",
      body: JSON.stringify(initial),
    }).then((result) => {
      if (result.ok) publishAppearance(result.data.appearance);
    });
  }, [initial]);

  // A server navigation can deliver a newer database preference without
  // remounting this layout. Treat it as authoritative.
  useEffect(() => {
    setAppearanceState(initial);
    setSavedAppearance(initial);
    setResolved(applyAppearance(initial, { animate: false }));
  }, [initial]);

  const value = useMemo(
    () => ({
      appearance,
      savedAppearance,
      resolved,
      setAppearance,
      markSaved,
    }),
    [appearance, savedAppearance, resolved, setAppearance, markSaved],
  );

  return (
    <AppearanceContext.Provider value={value}>
      {children}
    </AppearanceContext.Provider>
  );
}

export function useAppearance(): AppearanceContextValue {
  const context = useContext(AppearanceContext);
  if (!context) {
    throw new Error("useAppearance must be used inside AppearanceProvider");
  }
  return context;
}

/** Compact mode switch for the app shell. Full controls live in Settings. */
export function QuickModeToggle() {
  const { appearance, resolved, setAppearance, markSaved } = useAppearance();
  const [saving, setSaving] = useState(false);

  async function toggle() {
    if (saving) return;
    const previous = appearance;
    const next: Appearance = {
      ...appearance,
      mode: resolved === "dark" ? "light" : "dark",
    };

    setAppearance(next);
    setSaving(true);
    const result = await apiFetch<{ appearance: Appearance }>(
      "/api/account/appearance",
      {
        method: "PATCH",
        body: JSON.stringify(next),
      },
    );
    setSaving(false);

    if (!result.ok) {
      setAppearance(previous);
      return;
    }
    markSaved(result.data.appearance);
  }

  const willEnable = resolved === "dark" ? "light" : "dark";

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={saving}
      aria-label={`Switch to ${willEnable} mode`}
      title={`Switch to ${willEnable} mode`}
      className="rounded-md border border-[var(--color-sidebar-line)] p-1.5 text-[var(--color-sidebar-muted)] transition-colors hover:bg-[var(--color-sidebar-hover)] hover:text-[var(--color-sidebar-ink)] disabled:opacity-50"
    >
      <Icon
        name={resolved === "dark" ? "sun" : "moon"}
        className="h-4 w-4"
      />
    </button>
  );
}
