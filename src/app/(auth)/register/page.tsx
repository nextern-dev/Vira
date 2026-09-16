import type { Metadata } from "next";
import { AuthForm } from "@/components/auth-form";
import { googleConfigured } from "@/auth";

export const metadata: Metadata = { title: "Create your account" };

export default function RegisterPage() {
  return (
    <>
      <h1 className="text-[26px] font-semibold tracking-[-0.03em]">
        Create your account
      </h1>
      <p className="mb-7 mt-1.5 text-[14px] text-[var(--color-muted)]">
        Start with a private, empty ledger that only you can access.
      </p>
      <AuthForm mode="register" googleEnabled={googleConfigured()} />
    </>
  );
}
