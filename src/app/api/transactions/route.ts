import { json, readJson, withUser } from "@/lib/http";
import {
  parseOrThrow,
  searchParamsToObject,
  transactionCreateSchema,
  transactionFilterSchema,
} from "@/lib/validation";
import { createTransaction, listTransactions } from "@/server/transactions";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = withUser(async ({ request, user }) => {
  const filters = parseOrThrow(
    transactionFilterSchema,
    searchParamsToObject(request.url),
  );
  const result = await listTransactions(user.id, filters);
  return json(result);
});

export const POST = withUser(async ({ request, user }) => {
  const body = await readJson(request);
  const input = parseOrThrow(transactionCreateSchema, body);
  const created = await createTransaction(user.id, input);
  return json({ transaction: created }, 201);
});
