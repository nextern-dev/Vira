"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ErrorBanner, FieldError, Modal } from "@/components/modal";
import { apiFetch, requestId, todayLocalIso } from "@/lib/client";
import { normalizeLatinDigits } from "@/lib/money";
import { DateInput } from "@/components/date-input";
import { Icon } from "@/components/icons";

export type CategoryOption = {
  id: string;
  name: string;
  kind: "income" | "expense";
  color: string;
  icon: string;
  isArchived: boolean;
};

export type EditableTransaction = {
  id: string;
  type: "income" | "expense";
  amountCents: number;
  occurredOn: string;
  note: string | null;
  categoryId: string | null;
};

export function TransactionDialog({
  open,
  onClose,
  categories,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  categories: CategoryOption[];
  initial?: EditableTransaction | null;
}) {
  const router = useRouter();
  const [type, setType] = useState<"income" | "expense">("expense");
  const [amount, setAmount] = useState("");
  const [occurredOn, setOccurredOn] = useState(todayLocalIso());
  const [categoryId, setCategoryId] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const idempotencyKey = useRef(requestId());

  useEffect(() => {
    if (!open) return;
    idempotencyKey.current = requestId();
    setError(null);
    setFields({});
    setSaving(false);
    if (initial) {
      setType(initial.type);
      setAmount((initial.amountCents / 100).toFixed(2));
      setOccurredOn(initial.occurredOn);
      setCategoryId(initial.categoryId ?? "");
      setNote(initial.note ?? "");
    } else {
      setType("expense");
      setAmount("");
      setOccurredOn(todayLocalIso());
      setCategoryId("");
      setNote("");
    }
  }, [open, initial]);

  const options = useMemo(
    () => categories.filter((c) => c.kind === type && (!c.isArchived || c.id === categoryId)),
    [categories, type, categoryId],
  );

  useEffect(() => {
    if (categoryId && !options.some((option) => option.id === categoryId)) {
      setCategoryId("");
    }
  }, [options, categoryId]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setError(null);
    setFields({});

    const payload = {
      type,
      amount,
      occurredOn,
      categoryId: categoryId || null,
      note: note.trim() || null,
      ...(initial ? {} : { clientRequestId: idempotencyKey.current }),
    };

    const result = await apiFetch(
      initial ? `/api/transactions/${initial.id}` : "/api/transactions",
      { method: initial ? "PATCH" : "POST", body: JSON.stringify(payload) },
    );

    if (!result.ok) {
      setError(result.error);
      setFields(result.fields);
      setSaving(false);
      return;
    }

    onClose();
    router.refresh();
  }

  return (
    <Modal
      open={open}
      onClose={() => !saving && onClose()}
      title={initial ? "Edit transaction" : "New transaction"}
      description={
        initial
          ? "Update the details of this entry."
          : "Log money coming in or going out."
      }
    >
      <form onSubmit={submit} className="space-y-4" noValidate>
        <ErrorBanner message={error} />

        <div className="grid grid-cols-2 gap-2 rounded-lg border border-[var(--color-line)] bg-[var(--color-line-soft)] p-1">
          {(["expense", "income"] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setType(value)}
              aria-pressed={type === value}
              className={`flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-[13.5px] font-semibold capitalize transition-all ${
                type === value
                  ? value === "income"
                    ? "bg-[var(--color-surface-raised)] text-[var(--color-income)] shadow-[var(--shadow-xs)]"
                    : "bg-[var(--color-surface-raised)] text-[var(--color-expense)] shadow-[var(--shadow-xs)]"
                  : "text-[var(--color-muted)] hover:text-[var(--color-ink)]"
              }`}
            >
              <Icon
                name={value === "income" ? "arrowUp" : "arrowDown"}
                className="h-3.5 w-3.5"
                strokeWidth={2.2}
              />
              {value}
            </button>
          ))}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="tx-amount">
              Amount
            </label>
            <input
              id="tx-amount"
              inputMode="decimal"
              className="field tnum text-[17px] font-semibold"
              placeholder="0.00"
              value={amount}
              onChange={(event) => setAmount(normalizeLatinDigits(event.target.value))}
              required
            />
            <FieldError message={fields.amount} />
          </div>
          <div>
            <label className="label" htmlFor="tx-date">
              Date
            </label>
            <DateInput
              id="tx-date"
              value={occurredOn}
              onChange={setOccurredOn}
              required
            />
            <FieldError message={fields.occurredOn} />
          </div>
        </div>

        <div>
          <label className="label" htmlFor="tx-category">
            Category
          </label>
          <select
            id="tx-category"
            className="field"
            value={categoryId}
            onChange={(event) => setCategoryId(event.target.value)}
          >
            <option value="">Uncategorised</option>
            {options.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </select>
          <FieldError message={fields.categoryId} />
          {options.length === 0 ? (
            <p className="mt-1.5 text-[12px] text-[var(--color-muted)]">
              No {type} categories yet — you can add them under Categories.
            </p>
          ) : null}
        </div>

        <div>
          <label className="label" htmlFor="tx-note">
            Note <span className="font-normal text-[var(--color-muted)]">(optional)</span>
          </label>
          <input
            id="tx-note"
            className="field"
            placeholder="Coffee with the design team"
            maxLength={280}
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
          <FieldError message={fields.note} />
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            className="btn-ghost"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? "Saving…" : initial ? "Save changes" : "Add transaction"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
