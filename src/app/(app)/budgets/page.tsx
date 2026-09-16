import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { BudgetManager } from "@/components/budget-manager";
import { PageHeader } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth/session";
import { formatMonthLabel, todayIso } from "@/lib/dates";
import { listBudgets } from "@/server/budgets";
import { listCategories } from "@/server/categories";

export const metadata: Metadata = { title: "Budgets" };
export const dynamic = "force-dynamic";

export default async function BudgetsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [budgets, categories] = await Promise.all([
    listBudgets(user.id),
    listCategories(user.id),
  ]);

  const expenseCategories = categories
    .filter((category) => category.kind === "expense")
    .map(({ id, name, icon, color, isArchived }) => ({
      id,
      name,
      icon,
      color,
      isArchived,
    }));

  return (
    <>
      <PageHeader
        title="Budgets"
        subtitle={`Spending limits recalculated from your ledger · ${formatMonthLabel(todayIso())}`}
      />
      <BudgetManager
        budgets={budgets}
        categories={expenseCategories}
        currency={user.currency}
      />
    </>
  );
}
