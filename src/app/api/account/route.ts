import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { json, readJson, withUser } from "@/lib/http";
import { parseOrThrow, profileSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const PATCH = withUser(async ({ request, user }) => {
  const body = await readJson(request);
  const input = parseOrThrow(profileSchema, body);

  await db
    .update(users)
    .set({ name: input.name, currency: input.currency, updatedAt: new Date() })
    .where(eq(users.id, user.id));

  return json({ ok: true });
});
