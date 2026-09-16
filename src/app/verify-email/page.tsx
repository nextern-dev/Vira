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
  const params = await searchParams;
  const token = first(params.token).trim();
  const status = first(params.status).trim();
  const user = await getCurrentUser();

  if (!token && status !== "success" && status !== "invalid") {
    redirect("/login");
  }

  const verified = status === "success";
  const invalid = status === "invalid";

  return (
    <div className="public-page flex min-h-screen items-center justify-center px-4">
      <div className="card-raised w-full max-w-[420px] p-8 text-center">
        <div className="flex justify-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--color-line)] bg-[var(--color-surface-soft)] text-[var(--color-ink)]">
            <Logo />
          </span>
        </div>

        {verified ? (
          <>
            <h1 className="mt-4 text-[20px] font-semibold tracking-[-0.03em]">Email verified</h1>
            <p className="mt-2 text-[13.5px] leading-relaxed text-[var(--color-muted)]">
              Your email is confirmed. Your Vira account is ready to use.
            </p>
            <div className="mt-6 flex justify-center">
              {user ? (
                <Link href="/dashboard" className="btn-primary">Continue to dashboard</Link>
              ) : (
                <Link href="/login" className="btn-primary">Sign in</Link>
              )}
            </div>
          </>
        ) : invalid ? (
          <>
            <h1 className="mt-4 text-[20px] font-semibold tracking-[-0.03em]">Verification link invalid</h1>
            <p className="mt-2 text-[13.5px] leading-relaxed text-[var(--color-muted)]">
              This link is expired, already used, or invalid. Request a fresh verification email and try again.
            </p>
            <div className="mt-6 flex justify-center gap-2">
              <Link href="/login" className="btn-primary">Sign in</Link>
              <Link href="/" className="btn-ghost">Back home</Link>
            </div>
          </>
        ) : (
          <>
            <h1 className="mt-4 text-[20px] font-semibold tracking-[-0.03em]">Confirm your email</h1>
            <p className="mt-2 text-[13.5px] leading-relaxed text-[var(--color-muted)]">
              Confirm this request to verify the email address associated with your Vira account.
            </p>
            <form
              action={async (formData) => {
                "use server";
                const submittedToken = String(formData.get("token") ?? "").trim();
                const success = submittedToken ? await consumeEmailVerification(submittedToken) : false;
                redirect(`/verify-email?status=${success ? "success" : "invalid"}`);
              }}
              className="mt-6"
            >
              <input type="hidden" name="token" value={token} />
              <button type="submit" className="btn-primary w-full">Verify email</button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
