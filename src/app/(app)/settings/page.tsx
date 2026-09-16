import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import {
  AppearanceForm,
  PasswordForm,
  ProfileForm,
} from "@/components/settings-forms";
import { ResendVerificationButton } from "@/components/email-flow-forms";
import { getVerificationState } from "@/lib/email";
import { PageHeader } from "@/components/ui";
import { Icon } from "@/components/icons";
import { getCurrentUser } from "@/lib/auth/session";
import { formatDateLabel } from "@/lib/dates";
import { getPeriodTotals } from "@/server/analytics";
import { listCategories } from "@/server/categories";

export const metadata: Metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const verification = await getVerificationState(user.id);
  const [rows, categories, lifetime] = await Promise.all([
    db
      .select({ createdAt: users.createdAt })
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1),
    listCategories(user.id),
    getPeriodTotals(user.id, "1970-01-01", "2999-12-31"),
  ]);

  const memberSince = rows[0]?.createdAt
    ? formatDateLabel(rows[0].createdAt.toISOString().slice(0, 10))
    : "—";

  return (
    <>
      <PageHeader
        title="Settings"
        subtitle="Your account, your preferences — nothing shared with anyone."
      />

      <div className="grid gap-5">
        <section className="card p-5">
          <div className="flex items-start justify-between gap-4">
            <h2 className="text-[15.5px] font-semibold">Account</h2>
            <div className="flex flex-wrap gap-1.5">
              <span className="badge border border-[var(--color-line)] bg-[var(--color-line-soft)] text-[var(--color-ink-soft)]">
                {verification.provider === "google" ? "Google" : "Email + password"}
              </span>
              <span
                className={`badge border ${
                  verification.verified
                    ? "border-emerald-200 bg-[var(--color-income-soft)] text-[var(--color-income)]"
                    : "border-amber-200 bg-[var(--color-warning-soft)] text-[var(--color-warning)]"
                }`}
              >
                {verification.verified ? "Email verified" : "Email unverified"}
              </span>
            </div>
          </div>
          {!verification.verified && verification.provider !== "google" ? (
            <div className="mt-4 rounded-lg border border-amber-200 bg-[var(--color-warning-soft)] px-4 py-3">
              <p className="text-[13px] font-medium text-[var(--color-warning)]">
                Verify your email to secure password recovery and important notices.
              </p>
              <ResendVerificationButton />
            </div>
          ) : null}

          <dl className="mt-4 grid gap-4 sm:grid-cols-4">
            <div>
              <dt className="kicker">
                Email
              </dt>
              <dd className="mt-1 truncate text-[14px] font-medium">{user.email}</dd>
            </div>
            <div>
              <dt className="kicker">
                Member since
              </dt>
              <dd className="mt-1 text-[14px] font-medium">{memberSince}</dd>
            </div>
            <div>
              <dt className="kicker">
                Transactions
              </dt>
              <dd className="tnum mt-1 text-[14px] font-medium">
                {lifetime.transactionCount}
              </dd>
            </div>
            <div>
              <dt className="kicker">
                Categories
              </dt>
              <dd className="tnum mt-1 text-[14px] font-medium">{categories.length}</dd>
            </div>
          </dl>
        </section>

        <AppearanceForm />
        <ProfileForm name={user.name} currency={user.currency} />
        {verification.provider === "google" && !verification.passwordSet ? (
          <div className="card border-amber-200/60 bg-[var(--color-warning-soft)] px-5 py-3.5">
            <p className="text-[13px] text-[var(--color-warning)]">
              This account was created with Google and has no password yet. Set one below to enable both sign-in methods; Google link stays as-is until you explicitly change it.
            </p>
          </div>
        ) : null}
        <PasswordForm />

        <section className="card border-dashed p-5">
          <h2 className="text-[15.5px] font-semibold">How your data is handled</h2>
          <ul className="mt-4 space-y-2.5">
            {[
              "Every query is scoped to your account on the server — IDs in a URL can never reach another user's data.",
              "Amounts are stored as whole minor units, so totals stay exact.",
              "Dashboards and budgets are recomputed from the database on each request.",
              "Sessions are opaque, httpOnly cookies; changing your password revokes every other device.",
            ].map((item) => (
              <li key={item} className="flex gap-2.5">
                <Icon
                  name="check"
                  className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-income)]"
                  strokeWidth={2.2}
                />
                <span className="text-[13px] leading-relaxed text-[var(--color-ink-soft)]">
                  {item}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}
