import { and, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { categories, transactions } from "@/db/schema";
import { badRequest, json, readJson, withUser } from "@/lib/http";
import { isValidIsoDate } from "@/lib/dates";
import { parseAmountToCents } from "@/lib/money";
import { DEFAULT_CATEGORY_COLOR, DEFAULT_CATEGORY_ICON } from "@/lib/icons";
import { assertReasonableDate } from "@/server/transactions";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const importRowSchema = z.object({
  occurredOn: z.string().trim().refine(isValidIsoDate, "Invalid date format (YYYY-MM-DD)"),
  type: z.enum(["income", "expense"]),
  amount: z.union([z.string(), z.number()]).transform((val, ctx) => {
    const cents = parseAmountToCents(val);
    if (cents === null) {
      ctx.addIssue({ code: "custom", message: "Invalid amount" });
      return z.NEVER;
    }
    return cents;
  }),
  category: z.string().trim().max(48).optional().nullable(),
  note: z.string().trim().max(280).optional().nullable(),
});

const importPayloadSchema = z.object({
  rows: z
    .array(importRowSchema)
    .min(1, "At least 1 row is required")
    .max(1000, "Max 1000 rows per batch"),
});

export const POST = withUser(async ({ request, user }) => {
  const body = await readJson(request, 512_000);
  const parsed = importPayloadSchema.safeParse(body);

  if (!parsed.success) {
    throw badRequest(parsed.error.issues[0]?.message ?? "Invalid import data");
  }

  const { rows } = parsed.data;

  // Keep imported transactions subject to the same temporal rules as manually
  // created transactions. Validate the entire batch before writing anything.
  for (const row of rows) assertReasonableDate(row.occurredOn);

  const userCats = await db
    .select({ id: categories.id, name: categories.name, kind: categories.kind })
    .from(categories)
    .where(eq(categories.userId, user.id));

  const catMap = new Map<string, string>();
  for (const c of userCats) {
    catMap.set(`${c.kind}:${c.name.toLowerCase()}`, c.id);
  }

  return await db.transaction(async (tx) => {
    const neededCats = new Map<string, { name: string; kind: "income" | "expense" }>();
    for (const r of rows) {
      if (r.category && r.category !== "Uncategorised") {
        const key = `${r.type}:${r.category.toLowerCase()}`;
        if (!catMap.has(key) && !neededCats.has(key)) {
          neededCats.set(key, { name: r.category, kind: r.type });
        }
      }
    }

    let categoriesCreated = 0;
    for (const [key, meta] of neededCats.entries()) {
      const [created] = await tx
        .insert(categories)
        .values({
          userId: user.id,
          name: meta.name,
          kind: meta.kind,
          color: DEFAULT_CATEGORY_COLOR,
          icon: DEFAULT_CATEGORY_ICON,
        })
        .onConflictDoNothing()
        .returning({ id: categories.id });

      if (created) categoriesCreated += 1;

      const [resolved] = await tx
        .select({ id: categories.id, isArchived: categories.isArchived })
        .from(categories)
        .where(
          and(
            eq(categories.userId, user.id),
            eq(categories.kind, meta.kind),
            sql`lower(${categories.name}) = lower(${meta.name})`,
          ),
        )
        .limit(1);

      if (!resolved) throw new Error("Category could not be resolved after import upsert.");
      if (resolved.isArchived) {
        throw badRequest(`The category "${meta.name}" is archived and cannot be used for new records.`);
      }
      catMap.set(key, resolved.id);
    }

    const toInsert = rows.map((r) => {
      let categoryId: string | null = null;
      if (r.category && r.category !== "Uncategorised") {
        const key = `${r.type}:${r.category.toLowerCase()}`;
        categoryId = catMap.get(key) ?? null;
      }
      return {
        userId: user.id,
        type: r.type,
        amountCents: r.amount,
        occurredOn: r.occurredOn,
        categoryId,
        note: r.note?.trim() || null,
      };
    });

    // Existing archived categories must not be reused for newly imported rows.
    const referencedIds = [...new Set(toInsert.flatMap((row) => (row.categoryId ? [row.categoryId] : [])))];
    if (referencedIds.length) {
      const referencedRows = await tx
        .select({ id: categories.id, isArchived: categories.isArchived })
        .from(categories)
        .where(and(eq(categories.userId, user.id), inArray(categories.id, referencedIds)));
      const archivedById = new Map(referencedRows.map((row) => [row.id, row.isArchived]));
      for (const id of referencedIds) {
        if (!archivedById.has(id)) throw badRequest("One or more imported categories are invalid.");
        if (archivedById.get(id)) {
          throw badRequest("Archived categories cannot be assigned to imported transactions.");
        }
      }
    }

    const inserted = await tx
      .insert(transactions)
      .values(toInsert)
      .returning({ id: transactions.id });

    return json({
      ok: true,
      importedCount: inserted.length,
      categoriesCreated,
    });
  });
});
