"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ErrorBanner, FieldError, Modal } from "@/components/modal";
import { CategoryDot, EmptyState } from "@/components/ui";
import { apiFetch } from "@/lib/client";
import { Icon } from "@/components/icons";
import {
  CATEGORY_COLORS,
  CATEGORY_ICONS,
  DEFAULT_CATEGORY_COLOR,
  DEFAULT_CATEGORY_ICON,
  normalizeCategoryIcon,
} from "@/lib/icons";

export type ManagedCategory = {
  id: string;
  name: string;
  kind: "income" | "expense";
  color: string;
  icon: string;
  isArchived: boolean;
  transactionCount: number;
};

const PALETTE = CATEGORY_COLORS;
const ICONS = CATEGORY_ICONS;

export function CategoryManager({ categories }: { categories: ManagedCategory[] }) {
  const router = useRouter();
  const [creating, setCreating] = useState<null | "income" | "expense">(null);
  const [editing, setEditing] = useState<ManagedCategory | null>(null);
  const [deleting, setDeleting] = useState<ManagedCategory | null>(null);

  const groups = useMemo(
    () => ({
      expense: categories.filter((category) => category.kind === "expense"),
      income: categories.filter((category) => category.kind === "income"),
    }),
    [categories],
  );

  return (
    <>
      <div className="grid gap-5 lg:grid-cols-2">
        {(["expense", "income"] as const).map((kind) => (
          <section key={kind} className="card overflow-hidden">
            <div className="flex items-center justify-between border-b border-[var(--color-line)] px-5 py-4">
              <div>
                <h2 className="text-[15.5px] font-semibold capitalize">
                  {kind} categories
                </h2>
                <p className="text-[12.5px] text-[var(--color-muted)]">
                  {groups[kind].length} total
                </p>
              </div>
              <button
                type="button"
                className="btn-ghost btn-sm"
                onClick={() => setCreating(kind)}
              >
                + Add
              </button>
            </div>

            {groups[kind].length === 0 ? (
              <EmptyState
                icon={kind === "expense" ? "cart" : "wallet"}
                title={`No ${kind} categories`}
                description={`Create a ${kind} category to start organising your ${kind === "expense" ? "spending" : "earnings"}.`}
              />
            ) : (
              <ul className="divide-y divide-[var(--color-line)]">
                {groups[kind].map((category) => (
                  <li key={category.id} className="flex items-center gap-3 px-5 py-3">
                    <CategoryDot color={category.color} icon={category.icon} size={34} />
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-2 truncate text-[14px] font-medium">
                        {category.name}
                        {category.isArchived ? (
                          <span className="badge border border-[var(--color-line)] bg-[var(--color-line-soft)] text-[var(--color-muted)]">
                            Archived
                          </span>
                        ) : null}
                      </p>
                      <p className="text-[12px] text-[var(--color-muted)]">
                        {category.transactionCount} transaction
                        {category.transactionCount === 1 ? "" : "s"}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="rounded-lg px-2 py-1 text-[12.5px] font-semibold text-[var(--color-brand)] hover:bg-[var(--color-brand-soft)]"
                      onClick={() => setEditing(category)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="rounded-lg px-2 py-1 text-[12.5px] font-semibold text-[var(--color-expense)] hover:bg-[var(--color-expense-soft)]"
                      onClick={() => setDeleting(category)}
                    >
                      Delete
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>

      <CategoryForm
        open={Boolean(creating) || Boolean(editing)}
        kind={editing?.kind ?? creating ?? "expense"}
        initial={editing}
        onClose={() => {
          setCreating(null);
          setEditing(null);
        }}
        onSaved={() => {
          setCreating(null);
          setEditing(null);
          router.refresh();
        }}
      />

      <DeleteCategoryDialog
        category={deleting}
        siblings={
          deleting
            ? categories.filter(
                (item) => item.kind === deleting.kind && item.id !== deleting.id,
              )
            : []
        }
        onClose={() => setDeleting(null)}
        onDeleted={() => {
          setDeleting(null);
          router.refresh();
        }}
      />
    </>
  );
}

function CategoryForm({
  open,
  kind,
  initial,
  onClose,
  onSaved,
}: {
  open: boolean;
  kind: "income" | "expense";
  initial: ManagedCategory | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState("");
  const [color, setColor] = useState<string>(DEFAULT_CATEGORY_COLOR);
  const [icon, setIcon] = useState<string>(DEFAULT_CATEGORY_ICON);
  const [archived, setArchived] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [hydratedFor, setHydratedFor] = useState<string | null>(null);

  const signature = `${open}:${initial?.id ?? `new-${kind}`}`;
  if (open && hydratedFor !== signature) {
    setHydratedFor(signature);
    setName(initial?.name ?? "");
    setColor(initial?.color ?? DEFAULT_CATEGORY_COLOR);
    setIcon(initial ? normalizeCategoryIcon(initial.icon) : kind === "income" ? "wallet" : "cart");
    setArchived(initial?.isArchived ?? false);
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

    const result = initial
      ? await apiFetch(`/api/categories/${initial.id}`, {
          method: "PATCH",
          body: JSON.stringify({ name, color, icon, isArchived: archived }),
        })
      : await apiFetch("/api/categories", {
          method: "POST",
          body: JSON.stringify({ name, kind, color, icon }),
        });

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
      title={initial ? "Edit category" : `New ${kind} category`}
      description="Give it a clear name, a colour and an icon so it's easy to spot."
      width="max-w-md"
    >
      <form onSubmit={submit} className="space-y-4" noValidate>
        <ErrorBanner message={error} />

        <div>
          <label className="label" htmlFor="cat-name">
            Name
          </label>
          <input
            id="cat-name"
            className="field"
            value={name}
            maxLength={48}
            onChange={(event) => setName(event.target.value)}
            placeholder="Category name"
            required
          />
          <FieldError message={fields.name} />
        </div>

        <div>
          <span className="label">Colour</span>
          <div className="flex flex-wrap gap-2">
            {PALETTE.map((option) => (
              <button
                key={option}
                type="button"
                aria-label={`Colour ${option}`}
                aria-pressed={color === option}
                onClick={() => setColor(option)}
                className={`h-7 w-7 rounded-md transition ${
                  color === option
                    ? "ring-2 ring-[var(--color-ink)] ring-offset-2"
                    : "hover:scale-105"
                }`}
                style={{ background: option }}
              />
            ))}
          </div>
          <FieldError message={fields.color} />
        </div>

        <div>
          <span className="label">Icon</span>
          <div className="flex flex-wrap gap-1.5">
            {ICONS.map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={icon === option}
                aria-label={option}
                title={option}
                onClick={() => setIcon(option)}
                className={`flex h-8 w-8 items-center justify-center rounded-lg border transition ${
                  icon === option
                    ? "border-[var(--color-brand)] bg-[var(--color-brand-soft)] text-[var(--color-brand)]"
                    : "border-[var(--color-line)] text-[var(--color-ink-soft)] hover:bg-[var(--color-line-soft)]"
                }`}
              >
                <Icon name={option} className="h-4 w-4" />
              </button>
            ))}
          </div>
        </div>

        {initial ? (
          <label className="flex items-center gap-2.5 rounded-lg border border-[var(--color-line)] px-3.5 py-3">
            <input
              type="checkbox"
              className="h-4 w-4 accent-[var(--color-brand)]"
              checked={archived}
              onChange={(event) => setArchived(event.target.checked)}
            />
            <span className="text-[13.5px]">
              Archive — hides it from new transactions but keeps history intact.
            </span>
          </label>
        ) : null}

        <div className="flex justify-end gap-2 pt-1">
          <button type="button" className="btn-ghost" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? "Saving…" : initial ? "Save changes" : "Create category"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function DeleteCategoryDialog({
  category,
  siblings,
  onClose,
  onDeleted,
}: {
  category: ManagedCategory | null;
  siblings: ManagedCategory[];
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [reassignTo, setReassignTo] = useState("none");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    if (!category || busy) return;
    setBusy(true);
    setError(null);
    const result = await apiFetch(
      `/api/categories/${category.id}?reassignTo=${encodeURIComponent(reassignTo)}`,
      { method: "DELETE" },
    );
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setReassignTo("none");
    onDeleted();
  }

  return (
    <Modal
      open={Boolean(category)}
      onClose={() => !busy && onClose()}
      title={`Delete "${category?.name ?? ""}"?`}
      description="Your transactions are never deleted with a category."
      width="max-w-md"
    >
      <ErrorBanner message={error} />
      {category && category.transactionCount > 0 ? (
        <div className="space-y-3">
          <p className="text-[13.5px] text-[var(--color-ink-soft)]">
            <span className="font-semibold">{category.transactionCount}</span>{" "}
            transaction{category.transactionCount === 1 ? " uses" : "s use"} this
            category. Choose what happens to {category.transactionCount === 1 ? "it" : "them"}.
          </p>
          <div>
            <label className="label" htmlFor="reassign">
              Move transactions to
            </label>
            <select
              id="reassign"
              className="field"
              value={reassignTo}
              onChange={(event) => setReassignTo(event.target.value)}
            >
              <option value="none">Leave them uncategorised</option>
              {siblings.map((sibling) => (
                <option key={sibling.id} value={sibling.id}>
                  {sibling.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      ) : (
        <p className="text-[13.5px] text-[var(--color-ink-soft)]">
          This category has no transactions, so it can be removed safely.
        </p>
      )}

      <div className="mt-5 flex justify-end gap-2">
        <button type="button" className="btn-ghost" onClick={onClose} disabled={busy}>
          Cancel
        </button>
        <button type="button" className="btn-danger" onClick={confirm} disabled={busy}>
          {busy ? "Deleting…" : "Delete category"}
        </button>
      </div>
    </Modal>
  );
}
