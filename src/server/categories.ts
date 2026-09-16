import { and, asc, eq, sql } from "drizzle-orm";
import { cache } from "react";
import { db } from "@/db";
import { categories, transactions } from "@/db/schema";
import { conflict, notFound } from "@/lib/http";
import { isUniqueViolation } from "@/lib/db-errors";

export type Category = {
  id: string;
  name: string;
  kind: "income" | "expense";
  color: string;
  icon: string;
  isArchived: boolean;
};

export type CategoryWithUsage = Category & { transactionCount: number };

/**
 * Request-local memoization avoids duplicate category queries when the app
 * layout and a page both need the same user's categories during one render.
 */
export const listCategories = cache(async function listCategories(userId: string): Promise<Category[]> {
  return db
    .select({
      id: categories.id,
      name: categories.name,
      kind: categories.kind,
      color: categories.color,
      icon: categories.icon,
      isArchived: categories.isArchived,
    })
    .from(categories)
    .where(eq(categories.userId, userId))
    .orderBy(asc(categories.kind), asc(sql`lower(${categories.name})`));
});

export async function listCategoriesWithUsage(userId: string): Promise<CategoryWithUsage[]> {
  const rows = await db
    .select({
      id: categories.id,
      name: categories.name,
      kind: categories.kind,
      color: categories.color,
      icon: categories.icon,
      isArchived: categories.isArchived,
      transactionCount: sql<string>`count(${transactions.id})`,
    })
    .from(categories)
    .leftJoin(transactions, and(eq(transactions.categoryId, categories.id), eq(transactions.userId, userId)))
    .where(eq(categories.userId, userId))
    .groupBy(categories.id)
    .orderBy(asc(categories.kind), asc(sql`lower(${categories.name})`));

  return rows.map((row) => ({ ...row, transactionCount: Number(row.transactionCount) }));
}

export async function assertCategoryOwned(userId: string, categoryId: string, expectedKind?: "income" | "expense", options?: { allowArchived?: boolean }): Promise<Category> {
  const rows = await db
    .select({ id: categories.id, name: categories.name, kind: categories.kind, color: categories.color, icon: categories.icon, isArchived: categories.isArchived })
    .from(categories)
    .where(and(eq(categories.id, categoryId), eq(categories.userId, userId)))
    .limit(1);

  const category = rows[0];
  if (!category) throw notFound("Category");
  if (expectedKind && category.kind !== expectedKind) throw conflict(`"${category.name}" is a ${category.kind} category and cannot be used for a ${expectedKind}.`);
  if (category.isArchived && !options?.allowArchived) throw conflict(`"${category.name}" is archived and cannot be used for new records.`);
  return category;
}

export async function createCategory(userId: string, input: { name: string; kind: "income" | "expense"; color: string; icon: string }): Promise<Category> {
  try {
    const [row] = await db.insert(categories).values({ ...input, userId }).returning({ id: categories.id, name: categories.name, kind: categories.kind, color: categories.color, icon: categories.icon, isArchived: categories.isArchived });
    return row;
  } catch (error) {
    if (isUniqueViolation(error)) throw conflict(`You already have a ${input.kind} category called "${input.name}".`);
    throw error;
  }
}

export async function updateCategory(userId: string, categoryId: string, patch: { name?: string; color?: string; icon?: string; isArchived?: boolean }): Promise<Category> {
  await assertCategoryOwned(userId, categoryId, undefined, { allowArchived: true });
  if (Object.keys(patch).length === 0) return assertCategoryOwned(userId, categoryId, undefined, { allowArchived: true });
  try {
    const [row] = await db.update(categories).set({ ...patch, updatedAt: new Date() }).where(and(eq(categories.id, categoryId), eq(categories.userId, userId))).returning({ id: categories.id, name: categories.name, kind: categories.kind, color: categories.color, icon: categories.icon, isArchived: categories.isArchived });
    if (!row) throw notFound("Category");
    return row;
  } catch (error) {
    if (isUniqueViolation(error)) throw conflict("Another category already uses that name.");
    throw error;
  }
}

export async function deleteCategory(userId: string, categoryId: string, reassignToId: string | null): Promise<{ movedTransactions: number }> {
  const category = await assertCategoryOwned(userId, categoryId, undefined, { allowArchived: true });
  if (reassignToId) {
    if (reassignToId === categoryId) throw conflict("Pick a different category to move transactions into.");
    await assertCategoryOwned(userId, reassignToId, category.kind);
  }

  return db.transaction(async (tx) => {
    let moved = 0;
    if (reassignToId) {
      const updated = await tx.update(transactions).set({ categoryId: reassignToId, updatedAt: new Date() }).where(and(eq(transactions.userId, userId), eq(transactions.categoryId, categoryId))).returning({ id: transactions.id });
      moved = updated.length;
    }
    await tx.delete(categories).where(and(eq(categories.id, categoryId), eq(categories.userId, userId)));
    return { movedTransactions: moved };
  });
}

export { isUniqueViolation } from "@/lib/db-errors";
