"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PRESET_LABELS, resolvePreset, type PresetRange } from "@/lib/dates";
import type { CategoryOption } from "@/components/transaction-dialog";
import { DateInput } from "@/components/date-input";
import { Icon } from "@/components/icons";

export type FilterState = {
  preset: PresetRange;
  from: string;
  to: string;
  type: "all" | "income" | "expense";
  categoryId: string;
  minAmount: string;
  maxAmount: string;
  q: string;
  sort: "date_desc" | "date_asc" | "amount_desc" | "amount_asc";
};

const SORTS: Array<{ value: FilterState["sort"]; label: string }> = [
  { value: "date_desc", label: "Newest first" },
  { value: "date_asc", label: "Oldest first" },
  { value: "amount_desc", label: "Largest amount" },
  { value: "amount_asc", label: "Smallest amount" },
];

export function TransactionFilters({
  initial,
  categories,
  resultCount,
}: {
  initial: FilterState;
  categories: CategoryOption[];
  resultCount: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [state, setState] = useState<FilterState>(initial);
  const [advanced, setAdvanced] = useState(
    Boolean(initial.minAmount || initial.maxAmount || initial.categoryId !== "all"),
  );

  useEffect(() => setState(initial), [initial]);

  const dateError = useMemo(
    () => (state.from && state.to && state.from > state.to ? "Start date is after the end date." : null),
    [state.from, state.to],
  );

  function push(next: FilterState) {
    if (next.from && next.to && next.from > next.to) return;
    const params = new URLSearchParams();
    if (next.preset !== "this_month") params.set("preset", next.preset);
    if (next.preset === "custom") {
      if (next.from) params.set("from", next.from);
      if (next.to) params.set("to", next.to);
    }
    if (next.type !== "all") params.set("type", next.type);
    if (next.categoryId !== "all") params.set("categoryId", next.categoryId);
    if (next.minAmount.trim()) params.set("minAmount", next.minAmount.trim());
    if (next.maxAmount.trim()) params.set("maxAmount", next.maxAmount.trim());
    if (next.q.trim()) params.set("q", next.q.trim());
    if (next.sort !== "date_desc") params.set("sort", next.sort);

    startTransition(() => {
      router.push(`/transactions${params.size ? `?${params.toString()}` : ""}`);
    });
  }

  function update(patch: Partial<FilterState>, immediate = true) {
    const next = { ...state, ...patch };
    if (patch.preset && patch.preset !== "custom") {
      const range = resolvePreset(patch.preset);
      next.from = range.from;
      next.to = range.to;
    }
    setState(next);
    if (immediate) push(next);
  }

  const reset: FilterState = {
    preset: "this_month",
    ...resolvePreset("this_month"),
    type: "all",
    categoryId: "all",
    minAmount: "",
    maxAmount: "",
    q: "",
    sort: "date_desc",
  };

  const dirty =
    state.preset !== "this_month" ||
    state.type !== "all" ||
    state.categoryId !== "all" ||
    Boolean(state.minAmount || state.maxAmount || state.q) ||
    state.sort !== "date_desc";

  return (
    <form
      className="card mb-4 p-3.5"
      onSubmit={(event) => {
        event.preventDefault();
        push(state);
      }}
    >
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="relative min-w-[210px] flex-1">
          <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-muted)]">
            <Icon name="search" className="h-4 w-4" />
          </span>
          <input
            className="field pl-8.5"
            placeholder="Search notes and categories…"
            aria-label="Search transactions"
            value={state.q}
            maxLength={120}
            onChange={(event) => update({ q: event.target.value }, false)}
          />
        </div>

        <select
          className="field w-auto min-w-[150px]"
          aria-label="Date range"
          value={state.preset}
          onChange={(event) => update({ preset: event.target.value as PresetRange })}
        >
          {(Object.keys(PRESET_LABELS) as PresetRange[]).map((preset) => (
            <option key={preset} value={preset}>
              {PRESET_LABELS[preset]}
            </option>
          ))}
        </select>

        <select
          className="field w-auto min-w-[120px]"
          aria-label="Transaction type"
          value={state.type}
          onChange={(event) =>
            update({ type: event.target.value as FilterState["type"] })
          }
        >
          <option value="all">All types</option>
          <option value="expense">Expenses</option>
          <option value="income">Income</option>
        </select>

        <select
          className="field w-auto min-w-[150px]"
          aria-label="Sort order"
          value={state.sort}
          onChange={(event) =>
            update({ sort: event.target.value as FilterState["sort"] })
          }
        >
          {SORTS.map((sort) => (
            <option key={sort.value} value={sort.value}>
              {sort.label}
            </option>
          ))}
        </select>

        <button
          type="button"
          className="btn-ghost btn-sm"
          onClick={() => setAdvanced((value) => !value)}
          aria-expanded={advanced}
        >
          {advanced ? "Fewer filters" : "More filters"}
        </button>
        <button type="submit" className="btn-primary btn-sm" disabled={pending}>
          {pending ? "Filtering…" : "Apply"}
        </button>
      </div>

      {advanced || state.preset === "custom" ? (
        <div className="mt-3 grid gap-3 border-t border-[var(--color-line)] pt-3 sm:grid-cols-2 lg:grid-cols-4">
          {state.preset === "custom" ? (
            <>
              <div>
                <label className="label" htmlFor="filter-from">
                  From
                </label>
                                <DateInput
                id="filter-from"
                value={state.from}
                onChange={(v) => update({ from: v }, false)}
                />
              </div>
              <div>
                <label className="label" htmlFor="filter-to">
                  To
                </label>
                                <DateInput
                id="filter-to"
                value={state.to}
                onChange={(v) => update({ to: v }, false)}
                />
              </div>
            </>
          ) : null}

          <div>
            <label className="label" htmlFor="filter-category">
              Category
            </label>
            <select
              id="filter-category"
              className="field"
              value={state.categoryId}
              onChange={(event) => update({ categoryId: event.target.value })}
            >
              <option value="all">All categories</option>
              <option value="uncategorized">Uncategorised</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name} · {category.kind}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="label" htmlFor="filter-min">
                Min amount
              </label>
              <input
                id="filter-min"
                inputMode="decimal"
                className="field tnum"
                placeholder="0.00"
                value={state.minAmount}
                onChange={(event) => update({ minAmount: event.target.value }, false)}
              />
            </div>
            <div>
              <label className="label" htmlFor="filter-max">
                Max amount
              </label>
              <input
                id="filter-max"
                inputMode="decimal"
                className="field tnum"
                placeholder="0.00"
                value={state.maxAmount}
                onChange={(event) => update({ maxAmount: event.target.value }, false)}
              />
            </div>
          </div>
        </div>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[12.5px] text-[var(--color-muted)]">
        <span>
          {dateError ? (
            <span className="font-medium text-[var(--color-expense)]">{dateError}</span>
          ) : (
            <>
              {resultCount} matching transaction{resultCount === 1 ? "" : "s"}
              {state.preset !== "all_time" && state.from && state.to ? (
                <span className="tnum"> · {state.from} → {state.to}</span>
              ) : null}
            </>
          )}
        </span>
        {dirty ? (
          <button
            type="button"
            className="font-semibold text-[var(--color-brand)] hover:underline"
            onClick={() => {
              setState(reset);
              push(reset);
            }}
          >
            Clear filters
          </button>
        ) : null}
      </div>
    </form>
  );
}
