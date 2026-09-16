import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { Logo } from "@/components/ui";
import { Icon, type IconName } from "@/components/icons";
import { PublicAppearanceMenu } from "@/components/public-appearance-menu";
import { readAppearanceCookie } from "@/lib/auth/appearance-cookie";

export const dynamic = "force-dynamic";

const FEATURES: Array<{ title: string; body: string; icon: IconName }> = [
  {
    title: "Every cent, exactly",
    body: "Amounts are stored as whole minor units, so balances never drift from floating-point rounding.",
    icon: "scale",
  },
  {
    title: "Categories that fit you",
    body: "Build your own income and expense categories. Deleting one never deletes the history behind it.",
    icon: "categories",
  },
  {
    title: "Budgets with real progress",
    body: "Monthly or custom-period limits, recomputed from the ledger every time you open the page.",
    icon: "budgets",
  },
  {
    title: "Answers, not spreadsheets",
    body: "Trends, category breakdowns and savings rate — calculated server-side on authoritative data.",
    icon: "analytics",
  },
];

export default async function LandingPage() {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");
  const appearance = await readAppearanceCookie();

  return (
    <div className="min-h-screen bg-[var(--color-surface)]">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-[var(--color-line)] bg-[color-mix(in_srgb,var(--color-surface)_88%,transparent)] backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
          <Logo />
          <nav className="flex items-center gap-1.5">
            <Link href="/login" className="btn-subtle">
              Sign in
            </Link>
            <Link href="/register" className="btn-primary">
              Get started
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6">
        <div className="grid items-center gap-14 py-16 lg:grid-cols-[1.05fr_0.95fr] lg:py-24">
          <div>
            <span className="chip rounded-full">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-income)]" />
              Private by design — your ledger, your account only
            </span>

            <h1 className="mt-5 text-[40px] font-semibold leading-[1.06] tracking-[-0.035em] text-[var(--color-ink)] sm:text-[54px]">
              Know where your
              <br />
              money actually goes.
            </h1>

            <p className="mt-5 max-w-lg text-[16px] leading-relaxed text-[var(--color-ink-soft)]">
              Vira is a focused personal expense tracker. Log income and spending in
              seconds, organise it with your own categories, set budgets that hold you
              accountable, and read analytics built from your real data.
            </p>

            <div className="mt-8 flex flex-wrap gap-2.5">
              <Link href="/register" className="btn-primary px-5 py-2.5">
                Start tracking free
                <Icon name="arrowRight" className="h-4 w-4" strokeWidth={2} />
              </Link>
              <Link href="/login" className="btn-ghost px-5 py-2.5">
                I already have an account
              </Link>
            </div>

            <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2">
              {["No bank connections", "No adverts", "No data sharing"].map((item) => (
                <li
                  key={item}
                  className="flex items-center gap-1.5 text-[13px] text-[var(--color-muted)]"
                >
                  <Icon
                    name="check"
                    className="h-3.5 w-3.5 text-[var(--color-income)]"
                    strokeWidth={2.4}
                  />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Product principles — intentionally contains no sample financial data. */}
          <div className="relative">
            <div className="absolute -inset-4 rounded-2xl bg-[var(--color-brand-soft)]/70 blur-2xl" />
            <div className="card-raised relative overflow-hidden">
              <div className="border-b border-[var(--color-line)] px-6 py-5">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--color-line)] bg-[var(--color-brand-soft)] text-[var(--color-brand)]">
                  <Icon name="shield" className="h-[18px] w-[18px]" />
                </span>
                <h2 className="mt-4 text-[18px] font-semibold">A clean, private start</h2>
                <p className="mt-1.5 text-[13.5px] leading-relaxed text-[var(--color-muted)]">
                  New accounts begin with an empty ledger. Nothing appears until you
                  create it, and everything remains scoped to your account.
                </p>
              </div>

              <div className="divide-y divide-[var(--color-line)]">
                {[
                  {
                    icon: "transactions" as const,
                    title: "Record only what matters",
                    text: "Add income and expenses when you are ready.",
                  },
                  {
                    icon: "categories" as const,
                    title: "Build your own structure",
                    text: "Create categories that match how you manage money.",
                  },
                  {
                    icon: "analytics" as const,
                    title: "See results from real entries",
                    text: "Every summary is calculated from your ledger.",
                  },
                ].map((item) => (
                  <div key={item.title} className="flex gap-3.5 px-6 py-4">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--color-line-soft)] text-[var(--color-ink-soft)]">
                      <Icon name={item.icon} className="h-4 w-4" />
                    </span>
                    <div>
                      <h3 className="text-[13.5px] font-semibold">{item.title}</h3>
                      <p className="mt-0.5 text-[12.5px] text-[var(--color-muted)]">
                        {item.text}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-[var(--color-line)] bg-[var(--color-canvas)]">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <h2 className="text-[24px] font-semibold tracking-[-0.03em]">
            Correctness at every layer
          </h2>
          <p className="mt-1.5 max-w-xl text-[14.5px] text-[var(--color-ink-soft)]">
            Correctness first: exact money maths, strict per-account isolation, and
            analytics that always reflect the database.
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((feature) => (
              <div key={feature.title} className="card p-5">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--color-line)] bg-[var(--color-brand-soft)] text-[var(--color-brand)]">
                  <Icon name={feature.icon} className="h-[18px] w-[18px]" />
                </span>
                <h3 className="mt-3.5 text-[14.5px] font-semibold">{feature.title}</h3>
                <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--color-muted)]">
                  {feature.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-[var(--color-line)]">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <div className="promo-panel overflow-hidden rounded-2xl px-8 py-12 text-center">
            <h2 className="text-[26px] font-semibold tracking-[-0.03em] text-[var(--color-promo-ink)]">
              Start your ledger today
            </h2>
            <p className="mx-auto mt-2 max-w-md text-[14.5px] text-[var(--color-promo-muted)]">
              Create an empty, private ledger in under a minute and shape it around
              the way you manage money.
            </p>
            <Link
              href="/register"
              className="btn mt-6 bg-[#ffffff] px-5 py-2.5 text-[#101828] hover:bg-[#e9eaee]"
            >
              Create your account
              <Icon name="arrowRight" className="h-4 w-4" strokeWidth={2} />
            </Link>
          </div>
        </div>
      </section>

      <PublicAppearanceMenu initial={appearance} floating />

      <footer className="border-t border-[var(--color-line)]">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-6 text-[12.5px] text-[var(--color-muted)]">
          <span>
            © {new Date().getFullYear()} Vira — built by{" "}
            <span className="font-semibold text-[var(--color-ink-soft)]">Nextern</span>.
            Personal finance, kept personal.
          </span>
          <span className="flex items-center gap-1.5">
            <Icon name="lock" className="h-3.5 w-3.5" />
            Your data stays in your account
          </span>
        </div>
      </footer>
    </div>
  );
}
