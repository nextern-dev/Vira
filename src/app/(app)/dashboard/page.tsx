import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AddTransactionButton } from "@/components/add-transaction-button";
import { DonutChart, GroupedBars } from "@/components/charts";
import { Icon } from "@/components/icons";
import {
  CategoryDot,
  EmptyState,
  PageHeader,
  Progress,
  SectionHeading,
  StatCard,
} from "@/components/ui";
import { getCurrentUser } from "@/lib/auth/session";
import {
  addMonthsIso,
  endOfMonthIso,
  formatDateLabel,
  formatMonthLabel,
  startOfMonthIso,
  todayIso,
} from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import {
  getCategoryBreakdown,
  getMonthlySeries,
  getPeriodTotals,
  getRecentTransactions,
} from "@/server/analytics";
import { listBudgets } from "@/server/budgets";
import { listCategories } from "@/server/categories";

export const metadata: Metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const today = todayIso();
  const monthFrom = startOfMonthIso(today);
  const monthTo = endOfMonthIso(today);
  const prevMonthStart = addMonthsIso(monthFrom, -1);
  const trendFrom = addMonthsIso(monthFrom, -5);

  const [totals, previous, breakdown, series, recent, budgets, categories] =
    await Promise.all([
      getPeriodTotals(user.id, monthFrom, monthTo),
      getPeriodTotals(user.id, prevMonthStart, endOfMonthIso(prevMonthStart)),
      getCategoryBreakdown(user.id, monthFrom, monthTo, "expense", 6),
      getMonthlySeries(user.id, trendFrom, monthTo),
      getRecentTransactions(user.id, 7),
      listBudgets(user.id),
      listCategories(user.id),
    ]);

  const currency = user.currency;
  const spendDelta =
    previous.expenseCents > 0
      ? ((totals.expenseCents - previous.expenseCents) / previous.expenseCents) * 100
      : null;

  const activeBudgets = budgets.filter((budget) => budget.isActive).slice(0, 4);
  const isEmpty = totals.transactionCount === 0 && recent.length === 0;

  if (isEmpty) {
    return (
      <>
        <PageHeader
          title={`Welcome, ${user.name.split(" ")[0]}`}
          subtitle="Let's get your ledger started."
        />
        <div className="card">
          <EmptyState
            icon="sparkle"
            title="Your ledger is empty"
            description="Add your first income or expense and Vira will start building summaries, category breakdowns and budget progress from it."
            action={
              <AddTransactionButton
                categories={categories}
                label="Log your first transaction"
              />
            }
          />
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={`Welcome, ${user.name.split(" ")[0]}`}
        subtitle={`${formatMonthLabel(monthFrom)} · your money at a glance`}
        action={<AddTransactionButton categories={categories} />}
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Income"
          value={formatMoney(totals.incomeCents, currency)}
          tone="income"
          icon="arrowUp"
          hint="Received this month"
        />
        <StatCard
          label="Expenses"
          value={formatMoney(totals.expenseCents, currency)}
          tone="expense"
          icon="arrowDown"
          delta={
            spendDelta === null
              ? null
              : {
                  direction: spendDelta >= 0 ? "up" : "down",
                  text: `${Math.abs(spendDelta).toFixed(0)}%`,
                  good: spendDelta < 0,
                }
          }
          hint="vs last month"
        />
        <StatCard
          label="Balance"
          value={formatMoney(totals.balanceCents, currency)}
          tone={totals.balanceCents >= 0 ? "brand" : "expense"}
          icon="scale"
          hint={`${totals.transactionCount} transaction${totals.transactionCount === 1 ? "" : "s"}`}
        />
        <StatCard
          label="Savings rate"
          value={`${totals.savingsRate > 0 ? totals.savingsRate.toFixed(0) : "0"}%`}
          icon="trendUp"
          hint={`${formatMoney(totals.avgDailySpendCents, currency)}/day avg`}
        />
      </section>

      <section className="mt-4 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="card p-5">
          <SectionHeading
            title="Six-month trend"
            description="Income against expenses, month by month"
            action={
              <Link
                href="/analytics"
                className="inline-flex items-center gap-1 text-[13px] font-semibold text-[var(--color-brand)] hover:underline"
              >
                Analytics
                <Icon name="arrowRight" className="h-3.5 w-3.5" strokeWidth={2} />
              </Link>
            }
          />
          <div className="mt-5">
            {series.some((point) => point.incomeCents || point.expenseCents) ? (
              <GroupedBars points={series} currency={currency} />
            ) : (
              <EmptyState
                compact
                icon="chartBar"
                title="Nothing to chart yet"
                description="Log transactions across a couple of months and your trend appears here."
              />
            )}
          </div>
        </div>

        <div className="card p-5">
          <SectionHeading
            title="Where it went"
            description="Expenses by category this month"
          />
          <div className="mt-5">
            {breakdown.length > 0 ? (
              <div className="flex flex-col items-center gap-5">
                <DonutChart
                  slices={breakdown}
                  centerLabel="Spent"
                  centerValue={formatMoney(totals.expenseCents, currency, {
                    compact: totals.expenseCents >= 1_000_00,
                  })}
                  size={168}
                />
                <ul className="w-full space-y-2">
                  {breakdown.map((slice) => (
                    <li key={slice.categoryId ?? "none"} className="flex items-center gap-2.5">
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ background: slice.color }}
                      />
                      <span className="min-w-0 flex-1 truncate text-[13px] text-[var(--color-ink-soft)]">
                        {slice.name}
                      </span>
                      <span className="tnum text-[13px] font-semibold">
                        {formatMoney(slice.totalCents, currency)}
                      </span>
                      <span className="tnum w-9 text-right text-[11.5px] text-[var(--color-muted)]">
                        {slice.share.toFixed(0)}%
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <EmptyState
                compact
                icon="chartPie"
                title="No expenses this month"
                description="Your category breakdown appears as soon as you record spending."
              />
            )}
          </div>
        </div>
      </section>

      <section className="mt-4 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="card overflow-hidden">
          <div className="border-b border-[var(--color-line)] px-5 py-4">
            <SectionHeading
              title="Recent activity"
              action={
                <Link
                  href="/transactions"
                  className="inline-flex items-center gap-1 text-[13px] font-semibold text-[var(--color-brand)] hover:underline"
                >
                  View all
                  <Icon name="arrowRight" className="h-3.5 w-3.5" strokeWidth={2} />
                </Link>
              }
            />
          </div>
          {recent.length > 0 ? (
            <ul className="divide-y divide-[var(--color-line)]">
              {recent.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-[var(--color-line-soft)]/60"
                >
                  <CategoryDot color={item.categoryColor} icon={item.categoryIcon} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13.5px] font-medium">
                      {item.note?.trim() || item.categoryName || "Uncategorised"}
                    </p>
                    <p className="mt-0.5 text-[11.5px] text-[var(--color-muted)]">
                      {item.categoryName ?? "Uncategorised"} ·{" "}
                      {formatDateLabel(item.occurredOn)}
                    </p>
                  </div>
                  <span
                    className={`tnum shrink-0 text-[13.5px] font-semibold ${
                      item.type === "income"
                        ? "text-[var(--color-income)]"
                        : "text-[var(--color-ink)]"
                    }`}
                  >
                    {item.type === "income" ? "+" : "−"}
                    {formatMoney(item.amountCents, currency)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              compact
              icon="receipt"
              title="No transactions yet"
              description="Everything you log shows up here, newest first."
            />
          )}
        </div>

        <div className="card p-5">
          <SectionHeading
            title="Budget progress"
            action={
              <Link
                href="/budgets"
                className="inline-flex items-center gap-1 text-[13px] font-semibold text-[var(--color-brand)] hover:underline"
              >
                Manage
                <Icon name="arrowRight" className="h-3.5 w-3.5" strokeWidth={2} />
              </Link>
            }
          />
          <div className="mt-5">
            {activeBudgets.length > 0 ? (
              <ul className="space-y-4">
                {activeBudgets.map((budget) => (
                  <li key={budget.id}>
                    <div className="mb-1.5 flex items-baseline justify-between gap-3">
                      <span className="truncate text-[13px] font-medium">
                        {budget.name}
                      </span>
                      <span className="tnum shrink-0 text-[12px] text-[var(--color-muted)]">
                        {formatMoney(budget.spentCents, currency)} /{" "}
                        {formatMoney(budget.limitCents, currency)}
                      </span>
                    </div>
                    <Progress
                      percent={budget.percentUsed}
                      size="sm"
                      tone={
                        budget.status === "over"
                          ? "over"
                          : budget.status === "warning"
                            ? "warning"
                            : "brand"
                      }
                    />
                    <p
                      className={`mt-1 text-[11.5px] ${
                        budget.remainingCents >= 0
                          ? "text-[var(--color-muted)]"
                          : "font-medium text-[var(--color-expense)]"
                      }`}
                    >
                      {budget.remainingCents >= 0
                        ? `${formatMoney(budget.remainingCents, currency)} left`
                        : `${formatMoney(Math.abs(budget.remainingCents), currency)} over`}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                compact
                icon="budgets"
                title="No budgets set"
                description="Create a limit and Vira tracks it against your real spending."
                action={
                  <Link href="/budgets" className="btn-ghost btn-sm">
                    Create a budget
                  </Link>
                }
              />
            )}
          </div>
        </div>
      </section>
    </>
  );
}
