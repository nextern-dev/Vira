import { json, readJson, withUser } from "@/lib/http";
import { budgetCreateSchema, parseOrThrow } from "@/lib/validation";
import { createBudget, listBudgets } from "@/server/budgets";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = withUser(async ({ user }) => {
  return json({ budgets: await listBudgets(user.id) });
});

export const POST = withUser(async ({ request, user }) => {
  const body = await readJson(request);
  const input = parseOrThrow(budgetCreateSchema, body);
  const id = await createBudget(user.id, input);
  return json({ ok: true, id }, 201);
});
