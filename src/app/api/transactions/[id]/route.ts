import { json, pathId, readJson, withUser } from "@/lib/http";
import { parseOrThrow, transactionUpdateSchema } from "@/lib/validation";
import {
  deleteTransaction,
  getTransaction,
  updateTransaction,
} from "@/server/transactions";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = withUser(async ({ user, params }) => {
  const id = await pathId(params);
  return json({ transaction: await getTransaction(user.id, id) });
});

export const PATCH = withUser(async ({ request, user, params }) => {
  const id = await pathId(params);
  const body = await readJson(request);
  const input = parseOrThrow(transactionUpdateSchema, body);
  const updated = await updateTransaction(user.id, id, input);
  return json({ transaction: updated });
});

export const DELETE = withUser(async ({ user, params }) => {
  const id = await pathId(params);
  await deleteTransaction(user.id, id);
  return json({ ok: true });
});
