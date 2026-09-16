import { and, asc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { budgets, categories } from "@/db/schema";
import { conflict, notFound } from "@/lib/http";
import { endOfMonthIso, startOfMonthIso, todayIso } from "@/lib/dates";
import { assertCategoryOwned } from "@/server/categories";

export type BudgetWithProgress = {
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

export type BudgetInput = {
  name: string;
  categoryId: string | null;
  limit: number;
  period: "monthly" | "custom";
  startsOn?: string;
  endsOn?: string;
  isActive: boolean;
};

function windowFor(
  budget: { period: "monthly" | "custom"; startsOn: string | null; endsOn: string | null },
  today: string,
): { from: string; to: string } {
  if (budget.period === "monthly") {
    return { from: startOfMonthIso(today), to: endOfMonthIso(today) };
  }
  return { from: budget.startsOn ?? today, to: budget.endsOn ?? today };
}

/**
 * Budget spend is computed directly from the user's ledger. Client supplied
 * totals are never trusted.
 */
export async function listBudgets(userId: string): Promise<BudgetWithProgress[]> {
  const today = todayIso();

  const rows = await db
    .select({
      id: budgets.id,
      name: budgets.name,
      limitCents: budgets.limitCents,
      period: budgets.period,
      startsOn: budgets.startsOn,
      endsOn: budgets.endsOn,
      isActive: budgets.isActive,
      categoryId: budgets.categoryId,
      categoryName: categories.name,
      categoryColor: categories.color,
      categoryIcon: categories.icon,
    })
    .from(budgets)
    .leftJoin(categories, eq(categories.id, budgets.categoryId))
    .where(eq(budgets.userId, userId))
    .orderBy(asc(budgets.createdAt));

  if (rows.length === 0) return [];

  const raw = (await db.execute(sql`
    select
      b.id::text as id,
      coalesce(sum(t.amount_cents), 0)::text as spent_cents,
      count(t.id)::text as tx_count
    from budgets b
    left join transactions t
      on t.user_id = b.user_id
     and t.type = 'expense'
     and (b.category_id is null or t.category_id = b.category_id)
     and t.occurred_on >= case
           when b.period = 'monthly' then date_trunc('month', ${today}::date)::date
           else coalesce(b.starts_on, '-infinity'::date) end
     and t.occurred_on <= case
           when b.period = 'monthly' then (date_trunc('month', ${today}::date) + interval '1 month' - interval '1 day')::date
           else coalesce(b.ends_on, 'infinity'::date) end
    where b.user_id = ${userId}
    group by b.id
  `)) as unknown as
    | { rows: Array<{ id: string; spent_cents: string; tx_count: string }> }
    | Array<{ id: string; spent_cents: string; tx_count: string }>;

  const spendRows = Array.isArray(raw) ? raw : raw.rows;
  const spendById = new Map(
    spendRows.map((row) => [
      row.id,
      { spent: Number(row.spent_cents), count: Number(row.tx_count) },
    ]),
  );

  return rows.map((row) => {
    const { from, to } = windowFor(row, today);
    const spend = spendById.get(row.id) ?? { spent: 0, count: 0 };
    const spentCents = spend.spent;
    const percentUsed = row.limitCents > 0 ? (spentCents / row.limitCents) * 100 : 0;
    return {
      ...row,
      windowFrom: from,
      windowTo: to,
      spentCents,
      transactionCount: spend.count,
      remainingCents: row.limitCents - spentCents,
      percentUsed,
      status:
        percentUsed >= 100 ? "over" : percentUsed >= 80 ? "warning" : "on_track",
    };
  });
}

/**
 * The duplicate check is protected by a PostgreSQL transaction-scoped
 * advisory lock keyed by user id. A plain SELECT followed by INSERT is not
 * sufficient because two concurrent requests can both observe no duplicate.
 */
async function assertNoDuplicate(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  userId: string,
  input: BudgetInput,
  excludeId?: string,
): Promise<void> {
  const clauses = [
    eq(budgets.userId, userId),
    eq(budgets.period, input.period),
    input.categoryId
      ? eq(budgets.categoryId, input.categoryId)
      : sql`${budgets.categoryId} is null`,
  ];
  if (excludeId) clauses.push(sql`${budgets.id} <> ${excludeId}`);
  if (input.period === "custom") {
    clauses.push(sql`${budgets.startsOn} = ${input.startsOn ?? null}`);
    clauses.push(sql`${budgets.endsOn} = ${input.endsOn ?? null}`);
  }

  const existing = await tx
    .select({ id: budgets.id })
    .from(budgets)
    .where(and(...clauses))
    .limit(1);

  if (existing[0]) {
    throw conflict(
      input.categoryId
        ? "A budget already covers that category for this period."
        : "An overall budget already exists for this period.",
    );
  }
}

async function lockBudgetKey(tx: Parameters<Parameters<typeof db.transaction>[0]>[0], userId: string) {
  // pg_advisory_xact_lock is held until the surrounding transaction commits.
  // hashtextextended gives a deterministic 64-bit lock key from the user id.
  await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${userId}, 918273645))`);
}

export async function createBudget(userId: string, input: BudgetInput): Promise<string> {
  if (input.categoryId) {
    await assertCategoryOwned(userId, input.categoryId, "expense");
  }

  return db.transaction(async (tx) => {
    await lockBudgetKey(tx, userId);
    await assertNoDuplicate(tx, userId, input);

    const [row] = await tx
      .insert(budgets)
      .values({
        userId,
        name: input.name,
        categoryId: input.categoryId,
        limitCents: input.limit,
        period: input.period,
        startsOn: input.period === "custom" ? (input.startsOn ?? null) : null,
        endsOn: input.period === "custom" ? (input.endsOn ?? null) : null,
        isActive: input.isActive,
      })
      .returning({ id: budgets.id });

    return row.id;
  });
}

export async function updateBudget(userId: string, id: string, input: BudgetInput): Promise<void> {
  if (input.categoryId) {
    await assertCategoryOwned(userId, input.categoryId, "expense");
  }

  await db.transaction(async (tx) => {
    await lockBudgetKey(tx, userId);

    const existing = await tx
      .select({ id: budgets.id })
      .from(budgets)
      .where(and(eq(budgets.id, id), eq(budgets.userId, userId)))
      .limit(1);
    if (!existing[0]) throw notFound("Budget");

    await assertNoDuplicate(tx, userId, input, id);

    await tx
      .update(budgets)
      .set({
        name: input.name,
        categoryId: input.categoryId,
        limitCents: input.limit,
        period: input.period,
        startsOn: input.period === "custom" ? (input.startsOn ?? null) : null,
        endsOn: input.period === "custom" ? (input.endsOn ?? null) : null,
        isActive: input.isActive,
        updatedAt: new Date(),
      })
      .where(and(eq(budgets.id, id), eq(budgets.userId, userId)));
  });
}

export async function deleteBudget(userId: string, id: string): Promise<void> {
  const deleted = await db
    .delete(budgets)
    .where(and(eq(budgets.id, id), eq(budgets.userId, userId)))
    .returning({ id: budgets.id });
  if (!deleted[0]) throw notFound("Budget");
}
