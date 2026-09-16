"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ErrorBanner, FieldError } from "@/components/modal";
import { apiFetch } from "@/lib/client";
import { SUPPORTED_CURRENCIES } from "@/lib/money";
import { Icon, type IconName } from "@/components/icons";
import { useAppearance } from "@/components/appearance-provider";
import {
  APPEARANCE_MODE_META,
  APPEARANCE_MODES,
  COLOR_THEME_META,
  COLOR_THEMES,
  type AppearanceMode,
} from "@/lib/appearance";

function Success({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="mb-4 rounded-lg border border-[var(--color-line)] bg-[var(--color-income-soft)] px-3.5 py-2.5 text-[13px] text-[var(--color-income)]">
      {message}
    </div>
  );
}

const MODE_ICONS: Record<AppearanceMode, IconName> = {
  light: "sun",
  dark: "moon",
  system: "monitor",
};

export function AppearanceForm() {
  const {
    appearance,
    savedAppearance,
    resolved,
    setAppearance,
    markSaved,
  } = useAppearance();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const dirty =
    appearance.mode !== savedAppearance.mode ||
    appearance.theme !== savedAppearance.theme;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (saving || !dirty) return;
    setSaving(true);
    setError(null);
    setOk(null);

    const result = await apiFetch<{ appearance: typeof appearance }>(
      "/api/account/appearance",
      {
        method: "PATCH",
        body: JSON.stringify(appearance),
      },
    );
    setSaving(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    markSaved(result.data.appearance);
    setOk("Appearance saved to your account.");
  }

  return (
    <form onSubmit={submit} className="card overflow-hidden" noValidate>
      <div className="flex items-start gap-3 border-b border-[var(--color-line)] px-5 py-4">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--color-line)] bg-[var(--color-line-soft)] text-[var(--color-ink-soft)]">
          <Icon name="palette" className="h-[18px] w-[18px]" />
        </span>
        <div>
          <h2 className="text-[15.5px] font-semibold">Appearance</h2>
          <p className="mt-0.5 text-[12.5px] text-[var(--color-muted)]">
            Choose a display mode and a professional colour palette.
          </p>
        </div>
        <span className="chip ml-auto hidden sm:inline-flex">
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              resolved === "dark" ? "bg-[var(--color-brand)]" : "bg-[var(--color-warning)]"
            }`}
          />
          {resolved === "dark" ? "Dark active" : "Light active"}
        </span>
      </div>

      <div className="space-y-6 p-5">
        <ErrorBanner message={error} />
        <Success message={ok} />

        <fieldset>
          <legend className="label">Display mode</legend>
          <div className="grid gap-2 sm:grid-cols-3">
            {APPEARANCE_MODES.map((mode) => {
              const selected = appearance.mode === mode;
              const meta = APPEARANCE_MODE_META[mode];
              return (
                <button
                  key={mode}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => {
                    setOk(null);
                    setAppearance({ ...appearance, mode });
                  }}
                  className={`flex items-center gap-3 rounded-lg border p-3 text-left transition-all ${
                    selected
                      ? "border-[var(--color-brand)] bg-[var(--color-brand-soft)] shadow-[0_0_0_1px_var(--color-brand)]"
                      : "border-[var(--color-line)] bg-[var(--color-surface)] hover:border-[var(--color-muted)]"
                  }`}
                >
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md border ${
                      selected
                        ? "border-transparent bg-[var(--color-brand)] text-[var(--color-on-brand)]"
                        : "border-[var(--color-line)] bg-[var(--color-line-soft)] text-[var(--color-ink-soft)]"
                    }`}
                  >
                    <Icon name={MODE_ICONS[mode]} className="h-4 w-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[13.5px] font-semibold">{meta.label}</span>
                    <span className="block truncate text-[11.5px] text-[var(--color-muted)]">
                      {meta.description}
                    </span>
                  </span>
                  {selected ? (
                    <Icon
                      name="check"
                      className="ml-auto h-4 w-4 shrink-0 text-[var(--color-brand)]"
                      strokeWidth={2.2}
                    />
                  ) : null}
                </button>
              );
            })}
          </div>
        </fieldset>

        <fieldset>
          <legend className="label">Colour palette</legend>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
            {COLOR_THEMES.map((theme) => {
              const selected = appearance.theme === theme;
              const meta = COLOR_THEME_META[theme];
              return (
                <button
                  key={theme}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => {
                    setOk(null);
                    setAppearance({ ...appearance, theme });
                  }}
                  className={`relative rounded-lg border p-3 text-left transition-all ${
                    selected
                      ? "border-[var(--color-brand)] bg-[var(--color-brand-soft)] shadow-[0_0_0_1px_var(--color-brand)]"
                      : "border-[var(--color-line)] bg-[var(--color-surface)] hover:border-[var(--color-muted)]"
                  }`}
                >
                  <span className="mb-3 flex -space-x-1">
                    {meta.swatches.map((colour, index) => (
                      <span
                        key={colour}
                        className="h-6 w-6 rounded-full border-2 border-[var(--color-surface)]"
                        style={{ backgroundColor: colour, zIndex: 3 - index }}
                      />
                    ))}
                  </span>
                  <span className="block text-[13.5px] font-semibold">{meta.label}</span>
                  <span className="mt-0.5 block text-[11.5px] text-[var(--color-muted)]">
                    {meta.description}
                  </span>
                  {selected ? (
                    <span className="absolute right-2.5 top-2.5 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--color-brand)] text-[var(--color-on-brand)]">
                      <Icon name="check" className="h-2.5 w-2.5" strokeWidth={2.8} />
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </fieldset>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-line)] bg-[var(--color-line-soft)]/50 px-5 py-3.5">
        <p className="text-[12px] text-[var(--color-muted)]">
          Changes preview instantly. Save to use them on every device.
        </p>
        <div className="flex gap-2">
          {dirty ? (
            <button
              type="button"
              className="btn-subtle btn-sm"
              onClick={() => {
                setAppearance(savedAppearance);
                setError(null);
                setOk(null);
              }}
              disabled={saving}
            >
              Reset
            </button>
          ) : null}
          <button type="submit" className="btn-primary btn-sm" disabled={saving || !dirty}>
            {saving ? "Saving…" : dirty ? "Save appearance" : "Saved"}
          </button>
        </div>
      </div>
    </form>
  );
}

export function ProfileForm({
  name: initialName,
  currency: initialCurrency,
}: {
  name: string;
  currency: string;
}) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [currency, setCurrency] = useState(initialCurrency);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setError(null);
    setOk(null);
    setFields({});

    const result = await apiFetch("/api/account", {
      method: "PATCH",
      body: JSON.stringify({ name, currency }),
    });
    setSaving(false);

    if (!result.ok) {
      setError(result.error);
      setFields(result.fields);
      return;
    }
    setOk("Profile updated.");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="card p-5" noValidate>
      <h2 className="text-[15.5px] font-semibold">Profile</h2>
      <p className="mb-4 text-[12.5px] text-[var(--color-muted)]">
        How your name and amounts are displayed across Vira.
      </p>
      <ErrorBanner message={error} />
      <Success message={ok} />

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="profile-name">
            Display name
          </label>
          <input
            id="profile-name"
            className="field"
            value={name}
            maxLength={80}
            onChange={(event) => setName(event.target.value)}
            required
          />
          <FieldError message={fields.name} />
        </div>
        <div>
          <label className="label" htmlFor="profile-currency">
            Currency
          </label>
          <select
            id="profile-currency"
            className="field"
            value={currency}
            onChange={(event) => setCurrency(event.target.value)}
          >
            {SUPPORTED_CURRENCIES.map((code) => (
              <option key={code} value={code}>
                {code}
              </option>
            ))}
          </select>
          <FieldError message={fields.currency} />
          <p className="mt-1.5 text-[12px] text-[var(--color-muted)]">
            Display only — existing amounts are not converted.
          </p>
        </div>
      </div>

      <div className="mt-4 flex justify-end">
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? "Saving…" : "Save profile"}
        </button>
      </div>
    </form>
  );
}

export function PasswordForm() {
  const [currentPassword, setCurrent] = useState("");
  const [newPassword, setNext] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setError(null);
    setOk(null);
    setFields({});

    const result = await apiFetch("/api/account/password", {
      method: "POST",
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    setSaving(false);

    if (!result.ok) {
      setError(result.error);
      setFields(result.fields);
      return;
    }
    setCurrent("");
    setNext("");
    setOk("Password changed. Other devices have been signed out.");
  }

  return (
    <form onSubmit={submit} className="card p-5" noValidate>
      <h2 className="text-[15.5px] font-semibold">Password</h2>
      <p className="mb-4 text-[12.5px] text-[var(--color-muted)]">
        Changing your password signs out every other session.
      </p>
      <ErrorBanner message={error} />
      <Success message={ok} />

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="pwd-current">
            Current password
          </label>
          <input
            id="pwd-current"
            type="password"
            autoComplete="current-password"
            className="field"
            value={currentPassword}
            onChange={(event) => setCurrent(event.target.value)}
            required
          />
          <FieldError message={fields.currentPassword} />
        </div>
        <div>
          <label className="label" htmlFor="pwd-new">
            New password
          </label>
          <input
            id="pwd-new"
            type="password"
            autoComplete="new-password"
            className="field"
            value={newPassword}
            onChange={(event) => setNext(event.target.value)}
            placeholder="At least 10 characters"
            required
          />
          <FieldError message={fields.newPassword} />
        </div>
      </div>

      <div className="mt-4 flex justify-end">
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? "Updating…" : "Change password"}
        </button>
      </div>
    </form>
  );
}
