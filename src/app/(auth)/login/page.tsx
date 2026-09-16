import type { Metadata } from "next";
import { AuthForm } from "@/components/auth-form";
import { googleConfigured } from "@/auth";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <>
      <h1 className="text-[26px] font-semibold tracking-[-0.03em]">Welcome back</h1>
      <p className="mb-7 mt-1.5 text-[14px] text-[var(--color-muted)]">
        Sign in to pick up where your ledger left off.
      </p>
      <AuthForm mode="login" googleEnabled={googleConfigured()} />
    </>
  );
}
