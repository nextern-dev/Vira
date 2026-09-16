"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CategoryDot, EmptyState, TypePill } from "@/components/ui";
import { Icon, type IconName } from "@/components/icons";
import { ErrorBanner, Modal } from "@/components/modal";
import {
  TransactionDialog,
  type CategoryOption,
  type EditableTransaction,
} from "@/components/transaction-dialog";
import { apiFetch } from "@/lib/client";
import { formatDateLabel } from "@/lib/dates";
import { formatMoney } from "@/lib/money";

export type TransactionRowData = EditableTransaction & {
  categoryName: string | null;
  categoryColor: string | null;
  categoryIcon: string | null;
};

export function TransactionTable({
  items,
  categories,
  currency,
}: {
  items: TransactionRowData[];
  categories: CategoryOption[];
  currency: string;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<TransactionRowData | null>(null);
  const [deleting, setDeleting] = useState<TransactionRowData | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirmDelete() {
    if (!deleting || busy) return;
    setBusy(true);
    setError(null);
    const result = await apiFetch(`/api/transactions/${deleting.id}`, {
      method: "DELETE",
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setDeleting(null);
    router.refresh();
  }

  if (items.length === 0) {
    return (
      <div className="card">
        <EmptyState
          icon="search"
          title="No transactions match these filters"
          description="Try widening the date range, clearing the search text, or removing the amount limits."
        />
      </div>
    );
  }

  return (
    <>
      <div className="card overflow-hidden">
        {/* Desktop */}
        <table className="hidden w-full border-collapse text-left sm:table">
          <thead>
            <tr className="border-b border-[var(--color-line)] bg-[var(--color-line-soft)]/70 text-[11.5px] font-semibold uppercase tracking-[0.07em] text-[var(--color-muted)]">
              <th className="px-5 py-3 font-semibold">Description</th>
              <th className="px-3 py-3 font-semibold">Category</th>
              <th className="px-3 py-3 font-semibold">Date</th>
              <th className="px-3 py-3 text-right font-semibold">Amount</th>
              <th className="px-5 py-3 text-right font-semibold">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-line)]">
            {items.map((item) => (
              <tr key={item.id} className="group transition-colors hover:bg-[var(--color-line-soft)]/60">
                <td className="px-5 py-3">
                  <div className="flex items-center gap-3">
                    <CategoryDot color={item.categoryColor} icon={item.categoryIcon} />
                    <div className="min-w-0">
                      <p className="truncate text-[14px] font-medium">
                        {item.note?.trim() || item.categoryName || "Uncategorised"}
                      </p>
                      <div className="mt-0.5">
                        <TypePill type={item.type} />
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-3 text-[13.5px] text-[var(--color-ink-soft)]">
                  {item.categoryName ?? (
                    <span className="text-[var(--color-muted)]">Uncategorised</span>
                  )}
                </td>
                <td className="tnum px-3 py-3 text-[13.5px] text-[var(--color-ink-soft)]">
                  {formatDateLabel(item.occurredOn)}
                </td>
                <td
                  className={`tnum px-3 py-3 text-right text-[14.5px] font-semibold ${
                    item.type === "income"
                      ? "text-[var(--color-income)]"
                      : "text-[var(--color-ink)]"
                  }`}
                >
                  {item.type === "income" ? "+" : "−"}
                  {formatMoney(item.amountCents, currency)}
                </td>
                <td className="px-5 py-3 text-right">
                  <div className="inline-flex gap-1 opacity-60 transition group-hover:opacity-100">
                    <IconButton icon="edit" label="Edit" onClick={() => setEditing(item)} />
                    <IconButton
                      icon="trash"
                      label="Delete"
                      danger
                      onClick={() => setDeleting(item)}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Mobile */}
        <ul className="divide-y divide-[var(--color-line)] sm:hidden">
          {items.map((item) => (
            <li key={item.id} className="flex items-center gap-3 px-4 py-3">
              <CategoryDot color={item.categoryColor} icon={item.categoryIcon} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-medium">
                  {item.note?.trim() || item.categoryName || "Uncategorised"}
                </p>
                <p className="text-[12px] text-[var(--color-muted)]">
                  {item.categoryName ?? "Uncategorised"} · {formatDateLabel(item.occurredOn)}
                </p>
              </div>
              <div className="text-right">
                <p
                  className={`tnum text-[14px] font-semibold ${
                    item.type === "income"
                      ? "text-[var(--color-income)]"
                      : "text-[var(--color-ink)]"
                  }`}
                >
                  {item.type === "income" ? "+" : "−"}
                  {formatMoney(item.amountCents, currency)}
                </p>
                <div className="mt-1 flex justify-end gap-1">
                  <button
                    type="button"
                    className="text-[12px] font-semibold text-[var(--color-brand)]"
                    onClick={() => setEditing(item)}
                  >
                    Edit
                  </button>
                  <span className="text-[12px] text-[var(--color-muted)]">·</span>
                  <button
                    type="button"
                    className="text-[12px] font-semibold text-[var(--color-expense)]"
                    onClick={() => setDeleting(item)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <TransactionDialog
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        categories={categories}
        initial={editing}
      />

      <Modal
        open={Boolean(deleting)}
        onClose={() => !busy && setDeleting(null)}
        title="Delete this transaction?"
        description="This permanently removes the entry from your ledger and every summary it feeds."
        width="max-w-md"
      >
        <ErrorBanner message={error} />
        {deleting ? (
          <div className="rounded-lg border border-[var(--color-line)] bg-[var(--color-line-soft)] p-3.5">
            <p className="text-[14px] font-medium">
              {deleting.note?.trim() || deleting.categoryName || "Uncategorised"}
            </p>
            <p className="tnum mt-0.5 text-[13px] text-[var(--color-muted)]">
              {formatMoney(deleting.amountCents, currency)} ·{" "}
              {formatDateLabel(deleting.occurredOn)}
            </p>
          </div>
        ) : null}
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            className="btn-ghost"
            onClick={() => setDeleting(null)}
            disabled={busy}
          >
            Keep it
          </button>
          <button
            type="button"
            className="btn-danger"
            onClick={confirmDelete}
            disabled={busy}
          >
            {busy ? "Deleting…" : "Delete"}
          </button>
        </div>
      </Modal>
    </>
  );
}

function IconButton({
  label,
  onClick,
  danger,
  icon,
}: {
  label: string;
  onClick: () => void;
  danger?: boolean;
  icon: IconName;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`rounded-md p-1.5 transition-colors ${
        danger
          ? "text-[var(--color-muted)] hover:bg-[var(--color-expense-soft)] hover:text-[var(--color-expense)]"
          : "text-[var(--color-muted)] hover:bg-[var(--color-line-soft)] hover:text-[var(--color-ink)]"
      }`}
    >
      <Icon name={icon} className="h-4 w-4" />
    </button>
  );
}
