"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/client";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    const result = await apiFetch<{ message: string }>("/api/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <div className="space-y-4 rounded-xl border border-emerald-200 bg-[var(--color-income-soft)] px-4 py-5 text-center">
        <p className="text-[15px] font-semibold text-[var(--color-income)]">Check your inbox</p>
        <p className="text-[13px] text-[var(--color-ink-soft)]">
          If an account exists for that email, a reset link has been sent. The link
          expires in 60 minutes.
        </p>
        <Link href="/login" className="btn-ghost btn-sm mt-1 inline-flex">
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      {error ? (
        <div className="rounded-lg border border-red-200 bg-[var(--color-expense-soft)] px-3.5 py-3 text-[13px] text-[var(--color-expense)]">
          {error}
        </div>
      ) : null}
      <div>
        <label className="label" htmlFor="fp-email">
          Email
        </label>
        <input
          id="fp-email"
          type="email"
          autoComplete="email"
          className="field"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          required
        />
      </div>
      <button type="submit" className="btn-primary w-full" disabled={busy}>
        {busy ? "Sending…" : "Send reset link"}
      </button>
      <p className="text-center text-[13.5px] text-[var(--color-muted)]">
        Remembered your password?{" "}
        <Link className="font-semibold text-[var(--color-brand)]" href="/login">
          Sign in
        </Link>
      </p>
    </form>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    const result = await apiFetch<{ redirect: string }>("/api/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ token, newPassword: password }),
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.replace(result.data.redirect ?? "/login");
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      {error ? (
        <div className="rounded-lg border border-red-200 bg-[var(--color-expense-soft)] px-3.5 py-3 text-[13px] text-[var(--color-expense)]">
          {error}
        </div>
      ) : null}
      <div>
        <label className="label" htmlFor="np-password">
          New password
        </label>
        <input
          id="np-password"
          type="password"
          autoComplete="new-password"
          className="field"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="At least 10 characters, with a letter and a number"
          required
        />
      </div>
      <button type="submit" className="btn-primary w-full" disabled={busy}>
        {busy ? "Updating…" : "Set new password"}
      </button>
    </form>
  );
}

export function ResendVerificationButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function resend() {
    if (busy) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    const result = await apiFetch<{ message: string }>("/api/auth/resend-verification", {
      method: "POST",
      body: "{}",
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setMessage(result.data.message);
    router.refresh();
  }

  return (
    <div className="mt-2 space-y-1.5">
      <button type="button" className="btn-ghost btn-sm" onClick={resend} disabled={busy}>
        {busy ? "Sending…" : "Resend verification email"}
      </button>
      {message ? (
        <p className="text-[12px] text-[var(--color-income)]">{message}</p>
      ) : null}
      {error ? (
        <p className="text-[12px] text-[var(--color-expense)]">{error}</p>
      ) : null}
    </div>
  );
}
