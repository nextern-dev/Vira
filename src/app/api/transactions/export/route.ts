import { withUser } from "@/lib/http";
import { parseOrThrow, searchParamsToObject, transactionFilterSchema } from "@/lib/validation";
import { listTransactions } from "@/server/transactions";
import { centsToDecimalString } from "@/lib/money";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** RFC 4180 quoting plus spreadsheet-formula neutralisation. */
function escapeCsv(field: string | null | undefined): string {
  if (field === null || field === undefined) return "";
  let str = String(field);
  // Values beginning with these characters can be interpreted as formulas by
  // Excel/Sheets when a CSV is opened. Prefixing a single quote keeps the
  // exported value visibly intact while preventing formula execution.
  if (/^[=+\-@]/.test(str)) str = `'${str}`;
  if (/[",\r\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

export const GET = withUser(async ({ request, user }) => {
  const params = searchParamsToObject(request.url);
  const filters = parseOrThrow(transactionFilterSchema, { ...params, page: 1, pageSize: 10_000 });
  const result = await listTransactions(user.id, filters);

  const header = "Date,Type,Amount,Category,Note\r\n";
  const rows = result.items.map((item) => {
    const date = escapeCsv(item.occurredOn);
    const type = escapeCsv(item.type);
    const amount = escapeCsv(centsToDecimalString(item.amountCents));
    const category = escapeCsv(item.categoryName ?? "Uncategorised");
    const note = escapeCsv(item.note ?? "");
    return `${date},${type},${amount},${category},${note}`;
  });

  const csv = "\uFEFF" + header + rows.join("\r\n");
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
