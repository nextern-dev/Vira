import { eq } from "drizzle-orm";
import { db } from "@/db";
import { categories, transactions } from "@/db/schema";
import { withUser } from "@/lib/http";
import { parseOrThrow, searchParamsToObject, transactionFilterSchema } from "@/lib/validation";
import { listTransactions } from "@/server/transactions";
import { centsToDecimalString } from "@/lib/money";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function escapeCsv(field: string | null | undefined): string {
  if (field === null || field === undefined) return "";
  const str = String(field);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export const GET = withUser(async ({ request, user }) => {
  const params = searchParamsToObject(request.url);
  // Uncap page size to export up to 10,000 transactions
  const filters = parseOrThrow(transactionFilterSchema, {
    ...params,
    page: 1,
    pageSize: 10_000,
  });

  const result = await listTransactions(user.id, filters);

  const header = "Date,Type,Amount,Category,Note\n";
  const rows = result.items.map((item) => {
    const date = item.occurredOn;
    const type = item.type;
    const amount = centsToDecimalString(item.amountCents);
    const category = escapeCsv(item.categoryName ?? "Uncategorised");
    const note = escapeCsv(item.note ?? "");
    return `${date},${type},${amount},${category},${note}`;
  });

  const csv = header + rows.join("\n");
  const filename = `vira-transactions-${new Date().toISOString().slice(0, 10)}.csv`;

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
});
