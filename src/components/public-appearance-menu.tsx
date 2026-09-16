"use client";

import { useEffect, useRef, useState } from "react";
import { Icon, type IconName } from "@/components/icons";
import { apiFetch } from "@/lib/client";
import {
  applyAppearance,
  publishAppearance,
  subscribeAppearance,
} from "@/lib/client-appearance";
import {
  APPEARANCE_MODE_META,
  APPEARANCE_MODES,
  COLOR_THEME_META,
  COLOR_THEMES,
  type Appearance,
  type AppearanceMode,
} from "@/lib/appearance";

export type PublicAppearance = Appearance;

const MODE_ICONS: Record<AppearanceMode, IconName> = {
  light: "sun",
  dark: "moon",
  system: "monitor",
};

export function PublicAppearanceMenu({
  initial,
  floating = false,
}: {
  initial: PublicAppearance;
  /** Renders as a fixed corner launcher with an upward-opening popover. */
  floating?: boolean;
}) {
  const [appearance, setAppearance] = useState(initial);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function close(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function key(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", key);
    };
  }, [open]);

  useEffect(
    () =>
      subscribeAppearance((next) => {
        setAppearance(next);
        applyAppearance(next);
      }),
    [],
  );

  useEffect(() => {
    setAppearance(initial);
    applyAppearance(initial, { animate: false });
  }, [initial]);

  useEffect(() => {
    if (appearance.mode !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyAppearance(appearance);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [appearance]);

  async function choose(next: PublicAppearance) {
    if (saving || (next.mode === appearance.mode && next.theme === appearance.theme)) {
      return;
    }
    const previous = appearance;
    setAppearance(next);
    applyAppearance(next);
    setSaving(true);
    setError(false);

    const result = await apiFetch<{ appearance: PublicAppearance }>(
      "/api/appearance",
      { method: "PATCH", body: JSON.stringify(next) },
    );
    setSaving(false);

    if (!result.ok) {
      setAppearance(previous);
      applyAppearance(previous);
      setError(true);
      return;
    }
    setAppearance(result.data.appearance);
    publishAppearance(result.data.appearance);
  }

  return (
    <div
      ref={containerRef}
      className={floating ? "fixed bottom-5 right-5 z-[70] sm:bottom-6 sm:right-6" : "relative"}
    >
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label="Appearance settings"
        title="Appearance"
        className={
          floating
            ? "theme-popover flex h-11 w-11 items-center justify-center rounded-full border border-[var(--color-line)] text-[var(--color-ink-soft)] transition-all hover:-translate-y-0.5 hover:text-[var(--color-brand)] active:translate-y-0"
            : "flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] text-[var(--color-ink-soft)] transition-colors hover:bg-[var(--color-line-soft)] hover:text-[var(--color-ink)]"
        }
      >
        <Icon name="palette" className="h-[18px] w-[18px]" />
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label="Appearance"
          className={`theme-popover rise absolute right-0 z-50 w-[294px] rounded-xl border border-[var(--color-line)] p-3.5 text-[var(--color-ink)] ${
            floating ? "bottom-14" : "top-11"
          }`}
        >
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <p className="text-[13.5px] font-semibold">Appearance</p>
              <p className="mt-0.5 text-[11.5px] text-[var(--color-muted)]">
                Saved automatically on this browser
              </p>
            </div>
            {saving ? (
              <span className="text-[11.5px] text-[var(--color-muted)]">Saving…</span>
            ) : null}
          </div>

          <div className="grid grid-cols-3 gap-1 rounded-lg border border-[var(--color-line)] bg-[var(--color-line-soft)] p-1">
            {APPEARANCE_MODES.map((mode) => {
              const active = appearance.mode === mode;
              return (
                <button
                  key={mode}
                  type="button"
                  disabled={saving}
                  onClick={() => choose({ ...appearance, mode })}
                  title={APPEARANCE_MODE_META[mode].description}
                  className={`flex items-center justify-center gap-1 rounded-md px-2 py-1.5 text-[11.5px] font-semibold transition-colors ${
                    active
                      ? "bg-[var(--color-surface-raised)] text-[var(--color-brand)] shadow-[var(--shadow-xs)]"
                      : "text-[var(--color-muted)] hover:text-[var(--color-ink)]"
                  }`}
                >
                  <Icon name={MODE_ICONS[mode]} className="h-3.5 w-3.5" />
                  {APPEARANCE_MODE_META[mode].label}
                </button>
              );
            })}
          </div>

          <p className="mb-2 mt-4 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[var(--color-muted)]">
            Palette
          </p>
          <div className="grid grid-cols-5 gap-1.5">
            {COLOR_THEMES.map((theme) => {
              const meta = COLOR_THEME_META[theme];
              const active = appearance.theme === theme;
              return (
                <button
                  key={theme}
                  type="button"
                  disabled={saving}
                  onClick={() => choose({ ...appearance, theme })}
                  aria-label={meta.label}
                  aria-pressed={active}
                  title={`${meta.label} — ${meta.description}`}
                  className={`relative flex h-10 items-center justify-center rounded-lg border transition-all ${
                    active
                      ? "border-[var(--color-brand)] bg-[var(--color-brand-soft)] shadow-[0_0_0_1px_var(--color-brand)]"
                      : "border-[var(--color-line)] hover:border-[var(--color-line-strong)]"
                  }`}
                >
                  <span
                    className="h-5 w-7 rounded-md border-2 border-[var(--color-surface-raised)] shadow-[var(--shadow-xs)]"
                    style={{
                      backgroundImage: `linear-gradient(135deg, ${meta.swatches[0]}, ${meta.swatches[1]})`,
                    }}
                  />
                  {active ? (
                    <span className="absolute -right-0.5 -top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[var(--color-brand)] text-[var(--color-on-brand)]">
                      <Icon name="check" className="h-2 w-2" strokeWidth={3} />
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>

          {error ? (
            <p role="alert" className="mt-3 text-[11.5px] text-[var(--color-expense)]">
              Could not save the theme. Please try again.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
