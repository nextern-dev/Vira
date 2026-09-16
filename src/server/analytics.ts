import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import { categories, transactions } from "@/db/schema";
import { daysBetween, monthsInRange } from "@/lib/dates";

export type PeriodTotals = {
  incomeCents: number;
  expenseCents: number;
  balanceCents: number;
  transactionCount: number;
  savingsRate: number;
  avgDailySpendCents: number;
  largestExpenseCents: number;
};

const scope = (userId: string, from: string, to: string) =>
  and(
    eq(transactions.userId, userId),
    gte(transactions.occurredOn, from),
    lte(transactions.occurredOn, to),
  );

export async function getPeriodTotals(
  userId: string,
  from: string,
  to: string,
): Promise<PeriodTotals> {
  const rows = await db
    .select({
      income: sql<string>`coalesce(sum(case when ${transactions.type} = 'income' then ${transactions.amountCents} else 0 end), 0)`,
      expense: sql<string>`coalesce(sum(case when ${transactions.type} = 'expense' then ${transactions.amountCents} else 0 end), 0)`,
      count: sql<string>`count(*)`,
      largestExpense: sql<string>`coalesce(max(case when ${transactions.type} = 'expense' then ${transactions.amountCents} else 0 end), 0)`,
      firstDay: sql<string | null>`min(${transactions.occurredOn})::text`,
      lastDay: sql<string | null>`max(${transactions.occurredOn})::text`,
    })
    .from(transactions)
    .where(scope(userId, from, to));

  const incomeCents = Number(rows[0]?.income ?? 0);
  const expenseCents = Number(rows[0]?.expense ?? 0);

  // Averages use the covered window, not an arbitrarily wide requested range.
  const firstDay = rows[0]?.firstDay ?? from;
  const lastDay = rows[0]?.lastDay ?? to;
  const effectiveFrom = firstDay > from ? firstDay : from;
  const effectiveTo = lastDay < to ? lastDay : to;
  const days = Math.max(1, Math.min(daysBetween(effectiveFrom, effectiveTo) + 1, 3650));

  return {
    incomeCents,
    expenseCents,
    balanceCents: incomeCents - expenseCents,
    transactionCount: Number(rows[0]?.count ?? 0),
    savingsRate:
      incomeCents > 0 ? ((incomeCents - expenseCents) / incomeCents) * 100 : 0,
    avgDailySpendCents: Math.round(expenseCents / days),
    largestExpenseCents: Number(rows[0]?.largestExpense ?? 0),
  };
}

export type CategorySlice = {
  categoryId: string | null;
  name: string;
  color: string;
  icon: string;
  totalCents: number;
  transactionCount: number;
  share: number;
};

export async function getCategoryBreakdown(
  userId: string,
  from: string,
  to: string,
  type: "income" | "expense",
  limit = 12,
): Promise<CategorySlice[]> {
  const rows = await db
    .select({
      categoryId: transactions.categoryId,
      name: categories.name,
      color: categories.color,
      icon: categories.icon,
      totalCents: sql<string>`sum(${transactions.amountCents})`,
      transactionCount: sql<string>`count(*)`,
    })
    .from(transactions)
    .leftJoin(categories, eq(categories.id, transactions.categoryId))
    .where(and(scope(userId, from, to), eq(transactions.type, type)))
    .groupBy(transactions.categoryId, categories.name, categories.color, categories.icon)
    .orderBy(desc(sql`sum(${transactions.amountCents})`))
    .limit(limit);

  const total = rows.reduce((sum, row) => sum + Number(row.totalCents), 0);

  return rows.map((row) => ({
    categoryId: row.categoryId,
    name: row.name ?? "Uncategorised",
    color: row.color ?? "var(--color-muted)",
    icon: row.icon ?? "•",
    totalCents: Number(row.totalCents),
    transactionCount: Number(row.transactionCount),
    share: total > 0 ? (Number(row.totalCents) / total) * 100 : 0,
  }));
}

export type MonthPoint = {
  month: string;
  label: string;
  incomeCents: number;
  expenseCents: number;
  netCents: number;
};

export async function getMonthlySeries(
  userId: string,
  from: string,
  to: string,
): Promise<MonthPoint[]> {
  const rows = await db
    .select({
      month: sql<string>`to_char(${transactions.occurredOn}, 'YYYY-MM')`,
      income: sql<string>`coalesce(sum(case when ${transactions.type} = 'income' then ${transactions.amountCents} else 0 end), 0)`,
      expense: sql<string>`coalesce(sum(case when ${transactions.type} = 'expense' then ${transactions.amountCents} else 0 end), 0)`,
    })
    .from(transactions)
    .where(scope(userId, from, to))
    .groupBy(sql`to_char(${transactions.occurredOn}, 'YYYY-MM')`)
    .orderBy(sql`to_char(${transactions.occurredOn}, 'YYYY-MM')`);

  const byMonth = new Map(
    rows.map((row) => [
      row.month,
      { income: Number(row.income), expense: Number(row.expense) },
    ]),
  );

  // A very wide window (e.g. "all time") must not emit empty months back to
  // 1970 — fall back to the most recent months that actually hold data.
  const CAP = 24;
  const spanned = monthsInRange(from, to, CAP + 1);
  const effective =
    spanned.length > CAP || spanned.length === 0
      ? [...byMonth.keys()].sort().slice(-CAP)
      : spanned;

  return effective.map((month) => {
    const entry = byMonth.get(month) ?? { income: 0, expense: 0 };
    const [y, m] = month.split("-").map(Number);
    return {
      month,
      label: new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-US", {
        month: "short",
        timeZone: "UTC",
      }),
      incomeCents: entry.income,
      expenseCents: entry.expense,
      netCents: entry.income - entry.expense,
    };
  });
}

export type DayPoint = { day: string; expenseCents: number; incomeCents: number };

export async function getDailySeries(
  userId: string,
  from: string,
  to: string,
): Promise<DayPoint[]> {
  const span = daysBetween(from, to);
  if (span < 0 || span > 186) return [];

  const rows = await db
    .select({
      day: transactions.occurredOn,
      income: sql<string>`coalesce(sum(case when ${transactions.type} = 'income' then ${transactions.amountCents} else 0 end), 0)`,
      expense: sql<string>`coalesce(sum(case when ${transactions.type} = 'expense' then ${transactions.amountCents} else 0 end), 0)`,
    })
    .from(transactions)
    .where(scope(userId, from, to))
    .groupBy(transactions.occurredOn)
    .orderBy(transactions.occurredOn);

  return rows.map((row) => ({
    day: row.day,
    incomeCents: Number(row.income),
    expenseCents: Number(row.expense),
  }));
}

export type RecentTransaction = {
  id: string;
  type: "income" | "expense";
  amountCents: number;
  occurredOn: string;
  note: string | null;
  categoryName: string | null;
  categoryColor: string | null;
  categoryIcon: string | null;
};

export async function getRecentTransactions(
  userId: string,
  limit = 8,
): Promise<RecentTransaction[]> {
  return db
    .select({
      id: transactions.id,
      type: transactions.type,
      amountCents: transactions.amountCents,
      occurredOn: transactions.occurredOn,
      note: transactions.note,
      categoryName: categories.name,
      categoryColor: categories.color,
      categoryIcon: categories.icon,
    })
    .from(transactions)
    .leftJoin(categories, eq(categories.id, transactions.categoryId))
    .where(eq(transactions.userId, userId))
    .orderBy(desc(transactions.occurredOn), desc(transactions.createdAt))
    .limit(limit);
}

export async function hasAnyTransactions(userId: string): Promise<boolean> {
  const rows = await db
    .select({ id: transactions.id })
    .from(transactions)
    .where(eq(transactions.userId, userId))
    .limit(1);
  return rows.length > 0;
}
