import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { consumeEmailVerification } from "@/lib/email";
import { getCurrentUser } from "@/lib/auth/session";
import { Logo } from "@/components/ui";
import { Icon } from "@/components/icons";

export const metadata: Metadata = { title: "Verify email" };
export const dynamic = "force-dynamic";

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const token = first((await searchParams).token).trim();
  const user = await getCurrentUser();

  if (!token) {
    redirect("/login");
  }

  const success = await consumeEmailVerification(token);
  const title = success ? "Email verified" : "Verification link invalid";
  const body = success
    ? "Your email is confirmed. You can now use sign-in links without further checks."
    : "This link is expired, already used, or invalid. Request a fresh verification email and try again.";

  return (
    <div className="public-page flex min-h-screen items-center justify-center px-4">
      <div className="card-raised w-full max-w-[420px] p-8 text-center">
        <div className="flex justify-center">
          <span
            className={`flex h-11 w-11 items-center justify-center rounded-xl border ${
              success
                ? "border-emerald-200 bg-[var(--color-income-soft)] text-[var(--color-income)]"
                : "border-red-200 bg-[var(--color-expense-soft)] text-[var(--color-expense)]"
            }`}
          >
            <Icon name={success ? "check" : "alert"} className="h-5 w-5" />
          </span>
        </div>
        <h1 className="mt-4 text-[20px] font-semibold tracking-[-0.03em]">{title}</h1>
        <p className="mt-2 text-[13.5px] leading-relaxed text-[var(--color-muted)]">{body}</p>
        <div className="mt-6 flex justify-center gap-2">
          {user ? (
            <Link href="/dashboard" className="btn-primary">Continue to dashboard</Link>
          ) : (
            <Link href="/login" className="btn-primary">Sign in</Link>
          )}
          {!success ? <Link href="/" className="btn-ghost">Back home</Link> : null}
        </div>
      </div>
    </div>
  );
}
