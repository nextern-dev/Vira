import { json, pathId, readJson, withUser } from "@/lib/http";
import { categoryUpdateSchema, parseOrThrow } from "@/lib/validation";
import { deleteCategory, updateCategory } from "@/server/categories";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const PATCH = withUser(async ({ request, user, params }) => {
  const id = await pathId(params);
  const body = await readJson(request);
  const input = parseOrThrow(categoryUpdateSchema, body);
  return json({ category: await updateCategory(user.id, id, input) });
});

export const DELETE = withUser(async ({ request, user, params }) => {
  const id = await pathId(params);
  const raw = new URL(request.url).searchParams.get("reassignTo");
  const reassignTo = raw && raw !== "none" && UUID_RE.test(raw) ? raw : null;
  const result = await deleteCategory(user.id, id, reassignTo);
  return json({ ok: true, ...result });
});
