"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { apiFetch } from "@/lib/client";
import { SUPPORTED_CURRENCIES } from "@/lib/money";

type Mode = "login" | "register";

function GoogleIcon() {
  return (
    <span className="flex h-4 w-4 items-center justify-center" aria-hidden="true">
      <svg viewBox="0 0 24 24" className="h-4 w-4">
        <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"/>
        <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"/>
        <path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"/>
        <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75z"/>
      </svg>
    </span>
  );
}

export function AuthForm({
  mode,
  googleEnabled,
}: {
  mode: Mode;
  googleEnabled: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});

  const busy = submitting || pending;

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;

    setSubmitting(true);
    setError(null);
    setFields({});

    const form = new FormData(event.currentTarget);
    const payload =
      mode === "register"
        ? {
            name: String(form.get("name") ?? ""),
            email: String(form.get("email") ?? ""),
            password: String(form.get("password") ?? ""),
            currency: String(form.get("currency") ?? "USD"),
          }
        : {
            email: String(form.get("email") ?? ""),
            password: String(form.get("password") ?? ""),
          };

    const result = await apiFetch<{ redirect: string }>(`/api/auth/${mode}`, {
      method: "POST",
      body: JSON.stringify(payload),
    });

    if (!result.ok) {
      setError(result.error);
      setFields(result.fields);
      setSubmitting(false);
      return;
    }

    startTransition(() => {
      router.replace(result.data.redirect ?? "/dashboard");
      router.refresh();
    });
  }

  async function handleGoogleSignIn() {
    if (busy || !googleEnabled) return;
    setError(null);
    setSubmitting(true);

    try {
      await signIn("google", { callbackUrl: "/dashboard" });
    } catch {
      setSubmitting(false);
      setError("Unable to start Google sign-in. Please try again.");
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <div>
        {googleEnabled ? (
          <button
            type="button"
            onClick={handleGoogleSignIn}
            className="btn-ghost w-full"
            disabled={busy}
          >
            <GoogleIcon />
            Continue with Google
          </button>
        ) : (
          <span
            className="btn-ghost w-full cursor-not-allowed opacity-55"
            aria-disabled="true"
            title="Google sign-in is not configured on this deployment"
          >
            <GoogleIcon />
            Continue with Google
          </span>
        )}
      </div>

      <div className="relative text-center">
        <span className="absolute inset-0 mt-2.5 border-t border-[var(--color-line)]" aria-hidden="true" />
        <span className="relative bg-[var(--color-surface)] px-2 text-[11.5px] font-semibold uppercase tracking-[0.08em] text-[var(--color-muted)]">
          or with email
        </span>
      </div>

      {error ? (
        <div
          role="alert"
          className="rounded-lg border border-[var(--color-line)] bg-[var(--color-expense-soft)] px-3.5 py-3 text-[13px] text-[var(--color-expense)]"
        >
          {error}
        </div>
      ) : null}

      {mode === "register" ? (
        <div>
          <label className="label" htmlFor="name">
            Full name
          </label>
          <input
            id="name"
            name="name"
            autoComplete="name"
            className="field"
            placeholder="Ada Lovelace"
            maxLength={80}
            required
          />
          <FieldError message={fields.name} />
        </div>
      ) : null}

      <div>
        <label className="label" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          className="field"
          placeholder="you@example.com"
          maxLength={254}
          required
        />
        <FieldError message={fields.email} />
      </div>

      <div>
        <div className="flex items-center justify-between">
          <label className="label mb-0" htmlFor="password">
            Password
          </label>
          {mode === "login" ? (
            <Link
              className="text-[12.5px] font-semibold text-[var(--color-brand)] hover:underline"
              href="/forgot-password"
            >
              Forgot password?
            </Link>
          ) : null}
        </div>
        <div className="mt-1.5">
          <input
            id="password"
            name="password"
            type="password"
            autoComplete={mode === "register" ? "new-password" : "current-password"}
            className="field"
            placeholder={mode === "register" ? "At least 10 characters" : "••••••••••"}
            required
          />
        </div>
        <FieldError message={fields.password} />
      </div>

      {mode === "register" ? (
        <div>
          <label className="label" htmlFor="currency">
            Currency
          </label>
          <select id="currency" name="currency" className="field" defaultValue="USD">
            {SUPPORTED_CURRENCIES.map((code) => (
              <option key={code} value={code}>
                {code}
              </option>
            ))}
          </select>
          <p className="mt-1.5 text-[12px] text-[var(--color-muted)]">
            You can change this later in settings.
          </p>
        </div>
      ) : null}

      <button type="submit" className="btn-primary w-full" disabled={busy}>
        {busy
          ? "Just a moment…"
          : mode === "register"
            ? "Create account"
            : "Sign in"}
      </button>

      <p className="pt-1 text-center text-[13.5px] text-[var(--color-muted)]">
        {mode === "register" ? (
          <>
            Already have an account?{" "}
            <Link className="font-semibold text-[var(--color-brand)]" href="/login">
              Sign in
            </Link>
          </>
        ) : (
          <>
            New to Vira?{" "}
            <Link className="font-semibold text-[var(--color-brand)]" href="/register">
              Create an account
            </Link>
          </>
        )}
      </p>
    </form>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="mt-1.5 text-[12.5px] font-medium text-[var(--color-expense)]">{message}</p>
  );
}
