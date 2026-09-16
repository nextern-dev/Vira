import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AddTransactionButton } from "@/components/add-transaction-button";
import { CsvTools } from "@/components/csv-tools";
import { TransactionFilters, type FilterState } from "@/components/transaction-filters";
import { TransactionTable } from "@/components/transaction-table";
import { PageHeader } from "@/components/ui";
import { Icon } from "@/components/icons";
import { getCurrentUser } from "@/lib/auth/session";
import { isValidIsoDate, resolvePreset, type PresetRange } from "@/lib/dates";
import { ApiError } from "@/lib/http";
import { formatMoney } from "@/lib/money";
import { listCategories } from "@/server/categories";
import {
  listTransactions,
  type TransactionFilters as Filters,
  type TransactionListResult,
} from "@/server/transactions";

export const metadata: Metadata = { title: "Transactions" };
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
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export default async function TransactionsPage({
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
  const customFrom = first(params.from);
  const customTo = first(params.to);
  const from =
    preset === "custom" && isValidIsoDate(customFrom) ? customFrom : fallback.from;
  const to = preset === "custom" && isValidIsoDate(customTo) ? customTo : fallback.to;

  const typeRaw = first(params.type);
  const type: Filters["type"] =
    typeRaw === "income" || typeRaw === "expense" ? typeRaw : "all";

  const categoryId = first(params.categoryId) || "all";
  const sortRaw = first(params.sort);
  const sort: Filters["sort"] =
    sortRaw === "date_asc" || sortRaw === "amount_asc" || sortRaw === "amount_desc"
      ? sortRaw
      : "date_desc";

  const pageRaw = Number.parseInt(first(params.page) || "1", 10);
  const page = Number.isFinite(pageRaw) ? Math.min(Math.max(pageRaw, 1), 10_000) : 1;

  const filters: Filters = {
    from: preset === "all_time" ? undefined : from,
    to: preset === "all_time" ? undefined : to,
    type,
    categoryId: /^[0-9a-fA-F-]{36}$/.test(categoryId) || categoryId === "uncategorized"
      ? categoryId
      : "all",
    minAmount: first(params.minAmount) || undefined,
    maxAmount: first(params.maxAmount) || undefined,
    q: first(params.q).slice(0, 120) || undefined,
    sort,
    page,
    pageSize: 25,
  };

  const categories = await listCategories(user.id);

  let result: TransactionListResult | null = null;
  let error: string | null = null;
  try {
    result = await listTransactions(user.id, filters);
  } catch (caught) {
    error =
      caught instanceof ApiError
        ? caught.message
        : "We could not load your transactions. Please try again.";
  }

  const filterState: FilterState = {
    preset,
    from,
    to,
    type,
    categoryId: filters.categoryId,
    minAmount: first(params.minAmount),
    maxAmount: first(params.maxAmount),
    q: first(params.q),
    sort,
  };

  const queryFor = (nextPage: number) => {
    const next = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      const flat = first(value);
      if (flat && key !== "page") next.set(key, flat);
    }
    if (nextPage > 1) next.set("page", String(nextPage));
    return `/transactions${next.size ? `?${next.toString()}` : ""}`;
  };

  return (
    <>
      <PageHeader
        title="Transactions"
        subtitle="Every entry in your ledger, filtered exactly how you need it."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <CsvTools />
            <AddTransactionButton categories={categories} />
          </div>
        }
      />

      <TransactionFilters
        initial={filterState}
        categories={categories}
        resultCount={result?.total ?? 0}
      />

      {error ? (
        <div
          role="alert"
          className="card mb-5 border-[var(--color-line)] bg-[var(--color-expense-soft)] p-4 text-[13px] text-[var(--color-expense)]"
        >
          {error}
        </div>
      ) : null}

      {result ? (
        <>
          <div className="mb-4 grid gap-3 sm:grid-cols-3">
            <SummaryTile
              label="Income in view"
              value={formatMoney(result.totals.incomeCents, user.currency)}
              tone="income"
            />
            <SummaryTile
              label="Expenses in view"
              value={formatMoney(result.totals.expenseCents, user.currency)}
              tone="expense"
            />
            <SummaryTile
              label="Net in view"
              value={formatMoney(
                result.totals.incomeCents - result.totals.expenseCents,
                user.currency,
              )}
              tone="neutral"
            />
          </div>

          <TransactionTable
            items={result.items}
            categories={categories}
            currency={user.currency}
          />

          {result.pageCount > 1 ? (
            <nav
              className="mt-5 flex items-center justify-between gap-3"
              aria-label="Pagination"
            >
              <p className="text-[13px] text-[var(--color-muted)]">
                Page <span className="tnum font-semibold">{result.page}</span> of{" "}
                <span className="tnum font-semibold">{result.pageCount}</span> ·{" "}
                <span className="tnum">{result.total}</span> results
              </p>
              <div className="flex gap-2">
                {result.page > 1 ? (
                  <Link className="btn-ghost btn-sm" href={queryFor(result.page - 1)}>
                    <Icon name="chevronLeft" className="h-3.5 w-3.5" strokeWidth={2} />
                    Previous
                  </Link>
                ) : (
                  <span className="btn-ghost btn-sm opacity-45">
                    <Icon name="chevronLeft" className="h-3.5 w-3.5" strokeWidth={2} />
                    Previous
                  </span>
                )}
                {result.page < result.pageCount ? (
                  <Link className="btn-ghost btn-sm" href={queryFor(result.page + 1)}>
                    Next
                    <Icon name="chevronRight" className="h-3.5 w-3.5" strokeWidth={2} />
                  </Link>
                ) : (
                  <span className="btn-ghost btn-sm opacity-45">
                    Next
                    <Icon name="chevronRight" className="h-3.5 w-3.5" strokeWidth={2} />
                  </span>
                )}
              </div>
            </nav>
          ) : null}
        </>
      ) : null}
    </>
  );
}

function SummaryTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "income" | "expense" | "neutral";
}) {
  const toneClass =
    tone === "income"
      ? "text-[var(--color-income)]"
      : tone === "expense"
        ? "text-[var(--color-expense)]"
        : "text-[var(--color-ink)]";
  return (
    <div className="card px-4 py-3">
      <p className="kicker">{label}</p>
      <p className={`tnum mt-1.5 text-[18px] font-semibold ${toneClass}`}>{value}</p>
    </div>
  );
}
