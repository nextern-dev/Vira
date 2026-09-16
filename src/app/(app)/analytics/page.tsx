import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { DonutChart, GroupedBars, Sparkline } from "@/components/charts";
import { PeriodPicker } from "@/components/period-picker";
import { EmptyState, PageHeader, StatCard } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth/session";
import {
  daysBetween,
  formatDateLabel,
  isValidIsoDate,
  resolvePreset,
  todayIso,
  type PresetRange,
} from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import {
  getCategoryBreakdown,
  getDailySeries,
  getMonthlySeries,
  getPeriodTotals,
} from "@/server/analytics";

export const metadata: Metadata = { title: "Analytics" };
export const dynamic = "force-dynamic";

const PRESETS: PresetRange[] = [
  "this_month",
  "last_month",
  "last_30_days",
  "last_90_days",
  "this_year",
  "all_time",
  "custom",
];

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const params = await searchParams;
  const presetRaw = first(params.preset) as PresetRange;
  const preset: PresetRange = PRESETS.includes(presetRaw) ? presetRaw : "this_month";

  const fallback = resolvePreset(preset === "custom" ? "this_month" : preset);
  const rawFrom = first(params.from);
  const rawTo = first(params.to);
  let from = preset === "custom" && isValidIsoDate(rawFrom) ? rawFrom : fallback.from;
  let to = preset === "custom" && isValidIsoDate(rawTo) ? rawTo : fallback.to;
  const rangeInvalid = from > to;
  if (rangeInvalid) {
    const safe = resolvePreset("this_month");
    from = safe.from;
    to = safe.to;
  }

  const [totals, expenseSlices, incomeSlices, series, daily] = await Promise.all([
    getPeriodTotals(user.id, from, to),
    getCategoryBreakdown(user.id, from, to, "expense", 12),
    getCategoryBreakdown(user.id, from, to, "income", 8),
    getMonthlySeries(user.id, from, to),
    getDailySeries(user.id, from, to),
  ]);

  const currency = user.currency;
  const spanDays = Math.max(1, daysBetween(from, to) + 1);
  const hasData = totals.transactionCount > 0;

  return (
    <>
      <PageHeader
        title="Analytics"
        subtitle={`${formatDateLabel(from)} → ${formatDateLabel(to)} · ${spanDays} day${spanDays === 1 ? "" : "s"}`}
      />

      <div className="card mb-4 p-3.5">
        <PeriodPicker basePath="/analytics" preset={preset} from={from} to={to} />
        {rangeInvalid ? (
          <p className="mt-2 text-[12.5px] font-medium text-[var(--color-expense)]">
            That date range was invalid, so we fell back to this month.
          </p>
        ) : null}
      </div>

      {!hasData ? (
        <div className="card">
          <EmptyState
            icon="chartBar"
            title="Nothing recorded in this period"
            description="Choose a wider period, or add transactions and your analytics will fill in immediately."
          />
        </div>
      ) : (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Total income"
              value={formatMoney(totals.incomeCents, currency)}
              tone="income"
              icon="arrowUp"
            />
            <StatCard
              label="Total expenses"
              value={formatMoney(totals.expenseCents, currency)}
              tone="expense"
              icon="arrowDown"
            />
            <StatCard
              label="Net"
              value={formatMoney(totals.balanceCents, currency)}
              tone={totals.balanceCents >= 0 ? "brand" : "expense"}
              icon="scale"
              hint={`${totals.transactionCount} transactions`}
            />
            <StatCard
              label="Savings rate"
              value={`${totals.savingsRate.toFixed(0)}%`}
              icon="trendUp"
              hint={`Largest expense ${formatMoney(totals.largestExpenseCents, currency)}`}
            />
          </section>

          <section className="mt-5 grid gap-5 lg:grid-cols-[1.3fr_1fr]">
            <div className="card p-5">
              <h2 className="text-[15.5px] font-semibold">Monthly comparison</h2>
              <p className="mb-4 text-[12.5px] text-[var(--color-muted)]">
                Income versus expenses across the selected period
              </p>
              <GroupedBars points={series} currency={currency} />
            </div>

            <div className="card p-5">
              <h2 className="text-[15.5px] font-semibold">Daily spending rhythm</h2>
              <p className="mb-3 text-[12.5px] text-[var(--color-muted)]">
                {daily.length > 1
                  ? `Average ${formatMoney(totals.avgDailySpendCents, currency)} per day`
                  : "Needs a few days of data"}
              </p>
              {daily.length > 1 ? (
                <>
                  <Sparkline values={daily.map((point) => point.expenseCents)} color="var(--color-expense)" />
                  <div className="mt-2 flex justify-between text-[11.5px] text-[var(--color-muted)]">
                    <span>{formatDateLabel(daily[0].day)}</span>
                    <span>{formatDateLabel(daily[daily.length - 1].day)}</span>
                  </div>
                  <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-[var(--color-line)] pt-4">
                    <div>
                      <dt className="kicker">
                        Busiest day
                      </dt>
                      <dd className="tnum mt-0.5 text-[14px] font-semibold">
                        {formatMoney(
                          Math.max(...daily.map((point) => point.expenseCents)),
                          currency,
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt className="kicker">
                        Days with spend
                      </dt>
                      <dd className="tnum mt-0.5 text-[14px] font-semibold">
                        {daily.filter((point) => point.expenseCents > 0).length} / {spanDays}
                      </dd>
                    </div>
                  </dl>
                </>
              ) : (
                <EmptyState
                  icon="calendar"
                  title="Not enough days"
                  description="Pick a range covering at least two days with activity (up to six months) to see the daily rhythm."
                />
              )}
            </div>
          </section>

          <section className="mt-5 grid gap-5 lg:grid-cols-[1fr_1fr]">
            <div className="card p-5">
              <h2 className="text-[15.5px] font-semibold">Expenses by category</h2>
              <p className="mb-4 text-[12.5px] text-[var(--color-muted)]">
                Where your money went this period
              </p>
              {expenseSlices.length > 0 ? (
                <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
                  <DonutChart
                    slices={expenseSlices}
                    centerLabel="Spent"
                    centerValue={formatMoney(totals.expenseCents, currency, {
                      compact: totals.expenseCents >= 1_000_00,
                    })}
                    size={178}
                  />
                  <ul className="w-full flex-1 divide-y divide-[var(--color-line)]">
                    {expenseSlices.map((slice) => (
                      <li
                        key={slice.categoryId ?? "none"}
                        className="flex items-center gap-2.5 py-2"
                      >
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ background: slice.color }}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13.5px] font-medium">{slice.name}</p>
                          <p className="text-[11.5px] text-[var(--color-muted)]">
                            {slice.transactionCount} transaction
                            {slice.transactionCount === 1 ? "" : "s"}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="tnum text-[13.5px] font-semibold">
                            {formatMoney(slice.totalCents, currency)}
                          </p>
                          <p className="tnum text-[11.5px] text-[var(--color-muted)]">
                            {slice.share.toFixed(1)}%
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <EmptyState
                  icon="receipt"
                  title="No expenses in this period"
                  description="Nothing was spent in the selected range."
                />
              )}
            </div>

            <div className="card p-5">
              <h2 className="text-[15.5px] font-semibold">Income sources</h2>
              <p className="mb-4 text-[12.5px] text-[var(--color-muted)]">
                Which categories brought money in
              </p>
              {incomeSlices.length > 0 ? (
                <ul className="space-y-3">
                  {incomeSlices.map((slice) => (
                    <li key={slice.categoryId ?? "none"}>
                      <div className="mb-1.5 flex items-baseline justify-between gap-3">
                        <span className="truncate text-[13.5px] font-medium">
                          {slice.name}
                        </span>
                        <span className="tnum text-[13px] font-semibold text-[var(--color-income)]">
                          {formatMoney(slice.totalCents, currency)}
                        </span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-line)]">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${Math.max(slice.share, 1)}%`,
                            background: slice.color,
                          }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState
                  icon="wallet"
                  title="No income in this period"
                  description="Log income transactions to see how your earnings break down."
                />
              )}
            </div>
          </section>
        </>
      )}
    </>
  );
}
