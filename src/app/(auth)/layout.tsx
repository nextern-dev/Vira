import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { Logo } from "@/components/ui";
import { Icon, type IconName } from "@/components/icons";
import { PublicAppearanceMenu } from "@/components/public-appearance-menu";
import { readAppearanceCookie } from "@/lib/auth/appearance-cookie";

export const dynamic = "force-dynamic";

const POINTS: Array<{ title: string; body: string; icon: IconName }> = [
  {
    title: "Exact by construction",
    body: "Money is stored in whole minor units — no rounding drift, ever.",
    icon: "scale",
  },
  {
    title: "Isolated per account",
    body: "Every query is scoped server-side to the signed-in user.",
    icon: "shield",
  },
  {
    title: "Live analytics",
    body: "Summaries and budgets are recomputed from the database on each load.",
    icon: "analytics",
  },
];

export default async function AuthLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");
  const appearance = await readAppearanceCookie();

  return (
    <div className="grid min-h-screen lg:grid-cols-[1fr_minmax(420px,44%)]">
      <div className="flex flex-col px-6 py-8 sm:px-10">
        <Link href="/" className="inline-flex w-fit">
          <Logo />
        </Link>
        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-[380px]">{children}</div>
        </div>
        <p className="text-center text-[12px] text-[var(--color-muted)]">
          © {new Date().getFullYear()} Vira · built by Nextern
        </p>
      </div>

      <PublicAppearanceMenu initial={appearance} floating />

      <aside className="promo-panel relative hidden overflow-hidden lg:block">
        <div className="relative flex h-full flex-col justify-center px-12">
          <p className="text-[11.5px] font-semibold uppercase tracking-[0.14em] text-[var(--color-brand)]">
            Vira
          </p>
          <p className="mt-4 max-w-sm text-[27px] font-semibold leading-[1.22] tracking-[-0.03em] text-[var(--color-promo-ink)]">
            The ledger that tells you the truth about your month.
          </p>

          <ul className="mt-10 space-y-5">
            {POINTS.map((point) => (
              <li key={point.title} className="flex gap-3.5">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[color-mix(in_srgb,var(--color-promo-ink)_12%,transparent)] bg-[var(--color-promo-surface)] text-[var(--color-promo-ink)]">
                  <Icon name={point.icon} className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-[14px] font-semibold text-[var(--color-promo-ink)]">{point.title}</p>
                  <p className="mt-0.5 max-w-xs text-[13px] leading-relaxed text-[var(--color-promo-muted)]">
                    {point.body}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </div>
  );
}
