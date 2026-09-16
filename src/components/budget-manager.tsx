"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ErrorBanner, FieldError, Modal } from "@/components/modal";
import { CategoryDot, EmptyState, Progress } from "@/components/ui";
import { apiFetch, todayLocalIso } from "@/lib/client";
import { DateInput } from "@/components/date-input";
import { normalizeLatinDigits } from "@/lib/money";
import { formatDateLabel } from "@/lib/dates";
import { formatMoney } from "@/lib/money";

export type BudgetView = {
  id: string;
  name: string;
  limitCents: number;
  period: "monthly" | "custom";
  startsOn: string | null;
  endsOn: string | null;
  isActive: boolean;
  categoryId: string | null;
  categoryName: string | null;
  categoryColor: string | null;
  categoryIcon: string | null;
  windowFrom: string;
  windowTo: string;
  spentCents: number;
  transactionCount: number;
  remainingCents: number;
  percentUsed: number;
  status: "on_track" | "warning" | "over";
};

export type ExpenseCategoryOption = {
  id: string;
  name: string;
  icon: string;
  color: string;
  isArchived: boolean;
};

export function BudgetManager({
  budgets,
  categories,
  currency,
}: {
  budgets: BudgetView[];
  categories: ExpenseCategoryOption[];
  currency: string;
}) {
  const router = useRouter();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<BudgetView | null>(null);
  const [deleting, setDeleting] = useState<BudgetView | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    if (!deleting || busy) return;
    setBusy(true);
    setError(null);
    const result = await apiFetch(`/api/budgets/${deleting.id}`, { method: "DELETE" });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setDeleting(null);
    router.refresh();
  }

  return (
    <>
      <div className="mb-5 flex justify-end">
        <button
          type="button"
          className="btn-primary"
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          New budget
        </button>
      </div>

      {budgets.length === 0 ? (
        <div className="card">
          <EmptyState
            icon="budgets"
            title="No budgets yet"
            description="Set a monthly or custom-period spending limit — overall or per category — and Vira tracks it against your real expenses."
            action={
              <button
                type="button"
                className="btn-primary mt-1"
                onClick={() => {
                  setEditing(null);
                  setFormOpen(true);
                }}
              >
                Create your first budget
              </button>
            }
          />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {budgets.map((budget) => (
            <article
              key={budget.id}
              className={`card p-5 ${budget.isActive ? "" : "opacity-70"}`}
            >
              <div className="flex items-start gap-3">
                <CategoryDot
                  color={budget.categoryColor ?? "var(--color-brand)"}
                  icon={budget.categoryIcon ?? "budgets"}
                  size={36}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate text-[15px] font-semibold">{budget.name}</h3>
                    {!budget.isActive ? (
                      <span className="badge border border-[var(--color-line)] bg-[var(--color-line-soft)] text-[var(--color-muted)]">
                        Paused
                      </span>
                    ) : null}
                  </div>
                  <p className="text-[12.5px] text-[var(--color-muted)]">
                    {budget.categoryName ?? "All expenses"} ·{" "}
                    {budget.period === "monthly" ? "Monthly" : "Custom period"}
                  </p>
                </div>
                <StatusBadge status={budget.status} />
              </div>

              <div className="mt-4">
                <div className="mb-1.5 flex items-baseline justify-between">
                  <span className="tnum text-[19px] font-semibold">
                    {formatMoney(budget.spentCents, currency)}
                  </span>
                  <span className="tnum text-[13px] text-[var(--color-muted)]">
                    of {formatMoney(budget.limitCents, currency)}
                  </span>
                </div>
                <Progress
                  percent={budget.percentUsed}
                  tone={
                    budget.status === "over"
                      ? "over"
                      : budget.status === "warning"
                        ? "warning"
                        : "brand"
                  }
                />
                <div className="mt-2 flex items-center justify-between text-[12.5px]">
                  <span
                    className={
                      budget.remainingCents >= 0
                        ? "text-[var(--color-muted)]"
                        : "font-semibold text-[var(--color-expense)]"
                    }
                  >
                    {budget.remainingCents >= 0
                      ? `${formatMoney(budget.remainingCents, currency)} left`
                      : `${formatMoney(Math.abs(budget.remainingCents), currency)} over budget`}
                  </span>
                  <span className="tnum text-[var(--color-muted)]">
                    {budget.percentUsed.toFixed(0)}% used
                  </span>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-[var(--color-line)] pt-3 text-[12px] text-[var(--color-muted)]">
                <span className="tnum">
                  {formatDateLabel(budget.windowFrom)} → {formatDateLabel(budget.windowTo)}
                </span>
                <div className="flex gap-1">
                  <button
                    type="button"
                    className="rounded-lg px-2 py-1 text-[12.5px] font-semibold text-[var(--color-brand)] hover:bg-[var(--color-brand-soft)]"
                    onClick={() => {
                      setEditing(budget);
                      setFormOpen(true);
                    }}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="rounded-lg px-2 py-1 text-[12.5px] font-semibold text-[var(--color-expense)] hover:bg-[var(--color-expense-soft)]"
                    onClick={() => setDeleting(budget)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <BudgetForm
        open={formOpen}
        initial={editing}
        categories={categories}
        onClose={() => setFormOpen(false)}
        onSaved={() => {
          setFormOpen(false);
          router.refresh();
        }}
      />

      <Modal
        open={Boolean(deleting)}
        onClose={() => !busy && setDeleting(null)}
        title={`Delete "${deleting?.name ?? ""}"?`}
        description="Removing a budget does not touch any transactions."
        width="max-w-md"
      >
        <ErrorBanner message={error} />
        <div className="flex justify-end gap-2">
          <button
            type="button"
            className="btn-ghost"
            onClick={() => setDeleting(null)}
            disabled={busy}
          >
            Cancel
          </button>
          <button type="button" className="btn-danger" onClick={remove} disabled={busy}>
            {busy ? "Deleting…" : "Delete budget"}
          </button>
        </div>
      </Modal>
    </>
  );
}

function StatusBadge({ status }: { status: BudgetView["status"] }) {
  const map = {
    on_track: { label: "On track", className: "bg-[var(--color-income-soft)] text-[var(--color-income)]" },
    warning: { label: "Close", className: "bg-[var(--color-warning-soft)] text-[var(--color-warning)]" },
    over: { label: "Over", className: "bg-[var(--color-expense-soft)] text-[var(--color-expense)]" },
  } as const;
  const item = map[status];
  return (
    <span
      className={`shrink-0 rounded-full px-2.5 py-1 text-[11.5px] font-semibold ${item.className}`}
    >
      {item.label}
    </span>
  );
}

function BudgetForm({
  open,
  initial,
  categories,
  onClose,
  onSaved,
}: {
  open: boolean;
  initial: BudgetView | null;
  categories: ExpenseCategoryOption[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [limit, setLimit] = useState("");
  const [period, setPeriod] = useState<"monthly" | "custom">("monthly");
  const [startsOn, setStartsOn] = useState(todayLocalIso());
  const [endsOn, setEndsOn] = useState(todayLocalIso());
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [hydratedFor, setHydratedFor] = useState<string | null>(null);

  const signature = `${open}:${initial?.id ?? "new"}`;
  if (open && hydratedFor !== signature) {
    setHydratedFor(signature);
    setName(initial?.name ?? "");
    setCategoryId(initial?.categoryId ?? "");
    setLimit(initial ? (initial.limitCents / 100).toFixed(2) : "");
    setPeriod(initial?.period ?? "monthly");
    setStartsOn(initial?.startsOn ?? todayLocalIso());
    setEndsOn(initial?.endsOn ?? todayLocalIso());
    setIsActive(initial?.isActive ?? true);
    setError(null);
    setFields({});
    setSaving(false);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setError(null);
    setFields({});

    const payload = {
      name,
      categoryId: categoryId || null,
      limit,
      period,
      isActive,
      ...(period === "custom" ? { startsOn, endsOn } : {}),
    };

    const result = await apiFetch(
      initial ? `/api/budgets/${initial.id}` : "/api/budgets",
      { method: initial ? "PATCH" : "POST", body: JSON.stringify(payload) },
    );

    if (!result.ok) {
      setError(result.error);
      setFields(result.fields);
      setSaving(false);
      return;
    }
    setHydratedFor(null);
    onSaved();
  }

  return (
    <Modal
      open={open}
      onClose={() => {
        if (saving) return;
        setHydratedFor(null);
        onClose();
      }}
      title={initial ? "Edit budget" : "New budget"}
      description="Only expenses inside the window and matching the scope count towards it."
    >
      <form onSubmit={submit} className="space-y-4" noValidate>
        <ErrorBanner message={error} />

        <div>
          <label className="label" htmlFor="budget-name">
            Budget name
          </label>
          <input
            id="budget-name"
            className="field"
            value={name}
            maxLength={60}
            onChange={(event) => setName(event.target.value)}
            placeholder="Everyday spending"
            required
          />
          <FieldError message={fields.name} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="budget-scope">
              Scope
            </label>
            <select
              id="budget-scope"
              className="field"
              value={categoryId}
              onChange={(event) => setCategoryId(event.target.value)}
            >
              <option value="">All expenses</option>
              {categories
                .filter((category) => !category.isArchived || category.id === categoryId)
                .map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
            </select>
            <FieldError message={fields.categoryId} />
          </div>

          <div>
            <label className="label" htmlFor="budget-limit">
              Limit
            </label>
            <input
              id="budget-limit"
              inputMode="decimal"
              className="field tnum font-semibold"
              placeholder="0.00"
              value={limit}
              onChange={(event) => setLimit(normalizeLatinDigits(event.target.value))}
              required
            />
            <FieldError message={fields.limit} />
          </div>
        </div>

        <div>
          <span className="label">Period</span>
          <div className="grid grid-cols-2 gap-2 rounded-lg border border-[var(--color-line)] bg-[var(--color-line-soft)] p-1">
            {(["monthly", "custom"] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setPeriod(value)}
                aria-pressed={period === value}
                className={`rounded-md px-3 py-1.5 text-[13.5px] font-semibold transition-all ${
                  period === value
                    ? "bg-[var(--color-surface-raised)] text-[var(--color-ink)] shadow-[var(--shadow-xs)]"
                    : "text-[var(--color-muted)] hover:text-[var(--color-ink)]"
                }`}
              >
                {value === "monthly" ? "Every month" : "Custom dates"}
              </button>
            ))}
          </div>
        </div>

        {period === "custom" ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="budget-start">
                Starts on
              </label>
                            <DateInput
              id="budget-start"
              value={startsOn}
              onChange={setStartsOn}
              required
              />
              <FieldError message={fields.startsOn} />
            </div>
            <div>
              <label className="label" htmlFor="budget-end">
                Ends on
              </label>
                            <DateInput
              id="budget-end"
              value={endsOn}
              onChange={setEndsOn}
              required
              />
              <FieldError message={fields.endsOn} />
            </div>
          </div>
        ) : null}

        <label className="flex items-center gap-2.5 rounded-lg border border-[var(--color-line)] px-3.5 py-3">
          <input
            type="checkbox"
            className="h-4 w-4 accent-[var(--color-brand)]"
            checked={isActive}
            onChange={(event) => setIsActive(event.target.checked)}
          />
          <span className="text-[13.5px]">
            Active — show this budget on the dashboard.
          </span>
        </label>

        <div className="flex justify-end gap-2 pt-1">
          <button type="button" className="btn-ghost" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? "Saving…" : initial ? "Save changes" : "Create budget"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
