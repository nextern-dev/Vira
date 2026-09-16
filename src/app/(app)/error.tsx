"use client";

import { useEffect } from "react";
import { Icon } from "@/components/icons";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[vira] render error", error.digest ?? error.message);
  }, [error]);

  return (
    <div className="card mx-auto mt-10 max-w-md p-8 text-center">
      <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-lg border border-[var(--color-line)] bg-[var(--color-expense-soft)] text-[var(--color-expense)]">
        <Icon name="alert" className="h-5 w-5" />
      </span>
      <h1 className="mt-4 text-[17px] font-semibold">
        Something went wrong loading this view
      </h1>
      <p className="mx-auto mt-1.5 max-w-xs text-[13px] leading-relaxed text-[var(--color-muted)]">
        Your data is safe. This is usually a temporary problem reaching the database —
        try again in a moment.
      </p>
      <button type="button" onClick={reset} className="btn-primary mt-5">
        Try again
      </button>
    </div>
  );
}
