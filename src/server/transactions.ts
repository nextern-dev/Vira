import { and, asc, desc, eq, gte, isNull, lte, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { categories, transactions } from "@/db/schema";
import { badRequest, conflict, notFound } from "@/lib/http";
import { isUniqueViolation } from "@/lib/db-errors";
import { parseAmountToCents } from "@/lib/money";
import { assertCategoryOwned } from "@/server/categories";

export type TransactionFilters = {
  from?: string;
  to?: string;
  type: "income" | "expense" | "all";
  categoryId: string;
  minAmount?: string;
  maxAmount?: string;
  q?: string;
  sort: "date_desc" | "date_asc" | "amount_desc" | "amount_asc";
  page: number;
  pageSize: number;
};

export type TransactionListItem = {
  id: string;
  type: "income" | "expense";
  amountCents: number;
  occurredOn: string;
  note: string | null;
  categoryId: string | null;
  categoryName: string | null;
  categoryColor: string | null;
  categoryIcon: string | null;
};

export type TransactionListResult = {
  items: TransactionListItem[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
  totals: { incomeCents: number; expenseCents: number };
};

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (match) => `\\${match}`);
}

function buildWhere(userId: string, filters: TransactionFilters): SQL {
  const clauses: SQL[] = [eq(transactions.userId, userId)];

  if (filters.from && filters.to && filters.from > filters.to) {
    throw badRequest("The start date must be before the end date.", {
      from: "Start date is after the end date.",
    });
  }
  if (filters.from) clauses.push(gte(transactions.occurredOn, filters.from));
  if (filters.to) clauses.push(lte(transactions.occurredOn, filters.to));
  if (filters.type !== "all") clauses.push(eq(transactions.type, filters.type));

  if (filters.categoryId === "uncategorized") {
    clauses.push(isNull(transactions.categoryId));
  } else if (filters.categoryId !== "all") {
    clauses.push(eq(transactions.categoryId, filters.categoryId));
  }

  const min = filters.minAmount ? parseAmountToCents(filters.minAmount) : null;
  const max = filters.maxAmount ? parseAmountToCents(filters.maxAmount) : null;
  if (filters.minAmount && min === null) {
    throw badRequest("Minimum amount is not a valid number.", {
      minAmount: "Not a valid amount.",
    });
  }
  if (filters.maxAmount && max === null) {
    throw badRequest("Maximum amount is not a valid number.", {
      maxAmount: "Not a valid amount.",
    });
  }
  if (min !== null && max !== null && min > max) {
    throw badRequest("Minimum amount is greater than the maximum.", {
      minAmount: "Minimum is above the maximum.",
    });
  }
  if (min !== null) clauses.push(gte(transactions.amountCents, min));
  if (max !== null) clauses.push(lte(transactions.amountCents, max));

  if (filters.q) {
    const pattern = `%${escapeLike(filters.q)}%`;
    const search = or(
      sql`${transactions.note} ilike ${pattern}`,
      sql`${categories.name} ilike ${pattern}`,
    );
    if (search) clauses.push(search);
  }

  return and(...clauses) as SQL;
}

function orderFor(sort: TransactionFilters["sort"]): SQL[] {
  switch (sort) {
    case "date_asc":
      return [asc(transactions.occurredOn), asc(transactions.createdAt)];
    case "amount_desc":
      return [desc(transactions.amountCents), desc(transactions.occurredOn)];
    case "amount_asc":
      return [asc(transactions.amountCents), desc(transactions.occurredOn)];
    case "date_desc":
    default:
      return [desc(transactions.occurredOn), desc(transactions.createdAt)];
  }
}

export async function listTransactions(
  userId: string,
  filters: TransactionFilters,
): Promise<TransactionListResult> {
  const where = buildWhere(userId, filters);
  const offset = (filters.page - 1) * filters.pageSize;

  const [rows, aggregate] = await Promise.all([
    db
      .select({
        id: transactions.id,
        type: transactions.type,
        amountCents: transactions.amountCents,
        occurredOn: transactions.occurredOn,
        note: transactions.note,
        categoryId: transactions.categoryId,
        categoryName: categories.name,
        categoryColor: categories.color,
        categoryIcon: categories.icon,
      })
      .from(transactions)
      .leftJoin(categories, eq(categories.id, transactions.categoryId))
      .where(where)
      .orderBy(...orderFor(filters.sort))
      .limit(filters.pageSize)
      .offset(offset),
    db
      .select({
        total: sql<string>`count(*)`,
        incomeCents: sql<string>`coalesce(sum(case when ${transactions.type} = 'income' then ${transactions.amountCents} else 0 end), 0)`,
        expenseCents: sql<string>`coalesce(sum(case when ${transactions.type} = 'expense' then ${transactions.amountCents} else 0 end), 0)`,
      })
      .from(transactions)
      .leftJoin(categories, eq(categories.id, transactions.categoryId))
      .where(where),
  ]);

  const total = Number(aggregate[0]?.total ?? 0);
  return {
    items: rows,
    total,
    page: filters.page,
    pageSize: filters.pageSize,
    pageCount: Math.max(1, Math.ceil(total / filters.pageSize)),
    totals: {
      incomeCents: Number(aggregate[0]?.incomeCents ?? 0),
      expenseCents: Number(aggregate[0]?.expenseCents ?? 0),
    },
  };
}

/** Fetch all matching transactions for exports without a UI pagination cap. */
export async function listTransactionsForExport(
  userId: string,
  filters: Omit<TransactionFilters, "page" | "pageSize">,
): Promise<TransactionListItem[]> {
  const where = buildWhere(userId, { ...filters, page: 1, pageSize: 1 });
  return db
    .select({
      id: transactions.id,
      type: transactions.type,
      amountCents: transactions.amountCents,
      occurredOn: transactions.occurredOn,
      note: transactions.note,
      categoryId: transactions.categoryId,
      categoryName: categories.name,
      categoryColor: categories.color,
      categoryIcon: categories.icon,
    })
    .from(transactions)
    .leftJoin(categories, eq(categories.id, transactions.categoryId))
    .where(where)
    .orderBy(...orderFor(filters.sort));
}

export async function getTransaction(
  userId: string,
  id: string,
): Promise<TransactionListItem> {
  const rows = await db
    .select({
      id: transactions.id,
      type: transactions.type,
      amountCents: transactions.amountCents,
      occurredOn: transactions.occurredOn,
      note: transactions.note,
      categoryId: transactions.categoryId,
      categoryName: categories.name,
      categoryColor: categories.color,
      categoryIcon: categories.icon,
    })
    .from(transactions)
    .leftJoin(categories, eq(categories.id, transactions.categoryId))
    .where(and(eq(transactions.id, id), eq(transactions.userId, userId)))
    .limit(1);

  const row = rows[0];
  if (!row) throw notFound("Transaction");
  return row;
}

export type TransactionInput = {
  type: "income" | "expense";
  amount: number;
  occurredOn: string;
  categoryId: string | null;
  note: string | null;
  clientRequestId?: string;
};

const MAX_FUTURE_DAYS = 366;

export function assertReasonableDate(occurredOn: string): void {
  const limit = new Date(Date.now() + MAX_FUTURE_DAYS * 86_400_000)
    .toISOString()
    .slice(0, 10);
  if (occurredOn > limit) {
    throw badRequest("That date is too far in the future.", {
      occurredOn: "Dates can be at most a year ahead.",
    });
  }
  if (occurredOn < "1970-01-01") {
    throw badRequest("That date is too far in the past.", {
      occurredOn: "Use a date after 1970.",
    });
  }
}

export async function createTransaction(
  userId: string,
  input: TransactionInput,
): Promise<TransactionListItem> {
  assertReasonableDate(input.occurredOn);
  if (input.categoryId) {
    await assertCategoryOwned(userId, input.categoryId, input.type);
  }

  try {
    const [row] = await db
      .insert(transactions)
      .values({
        userId,
        type: input.type,
        amountCents: input.amount,
        occurredOn: input.occurredOn,
        categoryId: input.categoryId,
        note: input.note,
        clientRequestId: input.clientRequestId ?? null,
      })
      .returning({ id: transactions.id });
    return getTransaction(userId, row.id);
  } catch (error) {
    if (isUniqueViolation(error)) {
      if (input.clientRequestId) {
        const existing = await db
          .select({ id: transactions.id })
          .from(transactions)
          .where(
            and(
              eq(transactions.userId, userId),
              eq(transactions.clientRequestId, input.clientRequestId),
            ),
          )
          .limit(1);
        if (existing[0]) return getTransaction(userId, existing[0].id);
      }
      throw conflict("That transaction was already submitted.");
    }
    throw error;
  }
}

export async function updateTransaction(
  userId: string,
  id: string,
  input: Omit<TransactionInput, "clientRequestId">,
): Promise<TransactionListItem> {
  assertReasonableDate(input.occurredOn);
  await getTransaction(userId, id);
  if (input.categoryId) {
    // Archived categories remain valid for editing existing historical records,
    // but cannot be newly assigned to records.
    await assertCategoryOwned(userId, input.categoryId, input.type, {
      allowArchived: true,
    });
  }

  const updated = await db
    .update(transactions)
    .set({
      type: input.type,
      amountCents: input.amount,
      occurredOn: input.occurredOn,
      categoryId: input.categoryId,
      note: input.note,
      updatedAt: new Date(),
    })
    .where(and(eq(transactions.id, id), eq(transactions.userId, userId)))
    .returning({ id: transactions.id });

  if (!updated[0]) throw notFound("Transaction");
  return getTransaction(userId, id);
}

export async function deleteTransaction(userId: string, id: string): Promise<void> {
  const deleted = await db
    .delete(transactions)
    .where(and(eq(transactions.id, id), eq(transactions.userId, userId)))
    .returning({ id: transactions.id });
  if (!deleted[0]) throw notFound("Transaction");
}
