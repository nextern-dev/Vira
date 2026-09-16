import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { categories, transactions } from "@/db/schema";
import { badRequest, json, readJson, withUser } from "@/lib/http";
import { isValidIsoDate } from "@/lib/dates";
import { parseAmountToCents } from "@/lib/money";
import { DEFAULT_CATEGORY_COLOR, DEFAULT_CATEGORY_ICON } from "@/lib/icons";

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
  rows: z.array(importRowSchema).min(1, "At least 1 row is required").max(1000, "Max 1000 rows per batch"),
});

export const POST = withUser(async ({ request, user }) => {
  const body = await readJson(request);
  const parsed = importPayloadSchema.safeParse(body);

  if (!parsed.success) {
    throw badRequest(parsed.error.issues[0]?.message ?? "Invalid import data");
  }

  const { rows } = parsed.data;

  // Load existing user categories
  const userCats = await db
    .select({
      id: categories.id,
      name: categories.name,
      kind: categories.kind,
    })
    .from(categories)
    .where(eq(categories.userId, user.id));

  const catMap = new Map<string, string>();
  for (const c of userCats) {
    catMap.set(`${c.kind}:${c.name.toLowerCase()}`, c.id);
  }

  return await db.transaction(async (tx) => {
    // 1. Identify and create any missing categories
    const neededCats = new Map<string, { name: string; kind: "income" | "expense" }>();
    for (const r of rows) {
      if (r.category && r.category !== "Uncategorised") {
        const key = `${r.type}:${r.category.toLowerCase()}`;
        if (!catMap.has(key) && !neededCats.has(key)) {
          neededCats.set(key, { name: r.category, kind: r.type });
        }
      }
    }

    for (const [key, meta] of neededCats.entries()) {
      try {
        const [created] = await tx
          .insert(categories)
          .values({
            userId: user.id,
            name: meta.name,
            kind: meta.kind,
            color: DEFAULT_CATEGORY_COLOR,
            icon: DEFAULT_CATEGORY_ICON,
          })
          .returning({ id: categories.id });
        catMap.set(key, created.id);
      } catch {
        // In case of parallel race, category exists
      }
    }

    // 2. Insert all transactions
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

    const inserted = await tx
      .insert(transactions)
      .values(toInsert)
      .returning({ id: transactions.id });

    return json({
      ok: true,
      importedCount: inserted.length,
      categoriesCreated: neededCats.size,
    });
  });
});
