import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { revokeOtherSessions } from "@/lib/auth/session";
import { ApiError, clientKey, json, rateLimit, readJson, withUser } from "@/lib/http";
import { parseOrThrow, passwordChangeSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const POST = withUser(async ({ request, user }) => {
  await rateLimit(await clientKey(`pwd:${user.id}`), 6, 10 * 60_000);

  const body = await readJson(request);
  const input = parseOrThrow(passwordChangeSchema, body);

  const rows = await db
    .select({ passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1);

  const current = rows[0];
  if (current?.passwordHash) {
    // Credential accounts must prove possession of the current password.
    if (!(await verifyPassword(input.currentPassword, current.passwordHash))) {
      throw new ApiError(400, "Your current password is incorrect.", "bad_request", {
        currentPassword: "Incorrect password.",
      });
    }
  }

  const passwordHash = await hashPassword(input.newPassword);
  await db
    .update(users)
    .set({ passwordHash, updatedAt: new Date() })
    .where(eq(users.id, user.id));

  // Invalidate every other session after a credential change.
  await revokeOtherSessions(user.id);

  return json({ ok: true });
});
