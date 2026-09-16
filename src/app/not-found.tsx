import Link from "next/link";
import { Logo } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center">
      <Logo />
      <div>
        <p className="text-[13px] font-semibold uppercase tracking-[0.12em] text-[var(--color-brand)]">
          Error 404
        </p>
        <h1 className="mt-2.5 text-[24px] font-semibold tracking-[-0.03em]">
          We couldn&apos;t find that page
        </h1>
        <p className="mx-auto mt-1.5 max-w-sm text-[13.5px] leading-relaxed text-[var(--color-muted)]">
          The link may be out of date, or the record it pointed at no longer exists.
        </p>
      </div>
      <div className="flex gap-2">
        <Link href="/dashboard" className="btn-primary">
          Go to dashboard
        </Link>
        <Link href="/" className="btn-ghost">
          Back home
        </Link>
      </div>
    </div>
  );
}
