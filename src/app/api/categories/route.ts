import { json, readJson, withUser } from "@/lib/http";
import { categoryCreateSchema, parseOrThrow } from "@/lib/validation";
import { createCategory, listCategoriesWithUsage } from "@/server/categories";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = withUser(async ({ user }) => {
  return json({ categories: await listCategoriesWithUsage(user.id) });
});

export const POST = withUser(async ({ request, user }) => {
  const body = await readJson(request);
  const input = parseOrThrow(categoryCreateSchema, body);
  const created = await createCategory(user.id, input);
  return json({ category: created }, 201);
});
