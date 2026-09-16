import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/email-flow-forms";

export const metadata: Metadata = { title: "Reset your password" };

export default function ForgotPasswordPage() {
  return (
    <>
      <h1 className="text-[26px] font-semibold tracking-[-0.03em]">Reset your password</h1>
      <p className="mb-7 mt-1.5 text-[14px] text-[var(--color-muted)]">
        Enter the email tied to your account and we will send a secure reset link.
      </p>
      <ForgotPasswordForm />
    </>
  );
}
