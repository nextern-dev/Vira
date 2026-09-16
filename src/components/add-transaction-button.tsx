"use client";

import { useState } from "react";
import { TransactionDialog, type CategoryOption } from "@/components/transaction-dialog";

export function AddTransactionButton({
  categories,
  label = "New transaction",
  variant = "primary",
}: {
  categories: CategoryOption[];
  label?: string;
  variant?: "primary" | "ghost";
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        className={variant === "primary" ? "btn-primary" : "btn-ghost"}
        onClick={() => setOpen(true)}
      >
        {label}
      </button>
      <TransactionDialog
        open={open}
        onClose={() => setOpen(false)}
        categories={categories}
      />
    </>
  );
}
