import { json, pathId, readJson, withUser } from "@/lib/http";
import { budgetUpdateSchema, parseOrThrow } from "@/lib/validation";
import { deleteBudget, updateBudget } from "@/server/budgets";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const PATCH = withUser(async ({ request, user, params }) => {
  const id = await pathId(params);
  const body = await readJson(request);
  const input = parseOrThrow(budgetUpdateSchema, body);
  await updateBudget(user.id, id, input);
  return json({ ok: true });
});

export const DELETE = withUser(async ({ user, params }) => {
  const id = await pathId(params);
  await deleteBudget(user.id, id);
  return json({ ok: true });
});
