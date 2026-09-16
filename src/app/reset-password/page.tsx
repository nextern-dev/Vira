import type { Metadata } from "next";
import { ResetPasswordForm } from "@/components/email-flow-forms";
import { Logo } from "@/components/ui";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Create new password" };
export const dynamic = "force-dynamic";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const token = (await searchParams).token;
  const value = (Array.isArray(token) ? token[0] : token) ?? "";
  if (!value.trim()) redirect("/forgot-password");

  return (
    <div className="public-page flex min-h-screen items-center justify-center px-4 py-10">
      <div className="card-raised w-full max-w-[420px] p-8">
        <Logo className="justify-center" />
        <h1 className="mt-4 text-center text-[20px] font-semibold tracking-[-0.03em]">
          Choose a new password
        </h1>
        <p className="mt-1.5 text-center text-[13px] text-[var(--color-muted)]">
          After resetting you will be asked to sign in again on every device.
        </p>
        <div className="mt-6">
          <ResetPasswordForm token={value} />
        </div>
      </div>
    </div>
  );
}
