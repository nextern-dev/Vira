import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { sessions, users } from "@/db/schema";
import { consumePasswordReset } from "@/lib/email";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { json, readJson, badRequest, clientKey, rateLimit, withPublic } from "@/lib/http";
import { log } from "@/lib/log";
import { parseOrThrow, passwordChangeSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const POST = withPublic(async (request) => {
  await rateLimit(await clientKey("reset"), 10, 10 * 60_000);

  const body = await readJson(request);
  const token = typeof body.token === "string" ? body.token.trim() : "";
  const { newPassword } = parseOrThrow(
    passwordChangeSchema.pick({ newPassword: true }),
    { newPassword: body.newPassword },
  );
  if (!token) throw badRequest("Invalid or expired reset link.", { token: "Invalid link." });

  const consumed = await consumePasswordReset(token);
  if (!consumed) {
    // Uniform failure path — never let the endpoint confirm token existence.
    await verifyPassword("decoy", createHash("sha256").update("decoy").digest("hex"));
    throw badRequest("Invalid or expired reset link.", { token: "Invalid link." });
  }

  const passwordHash = await hashPassword(newPassword);
  await db
    .update(users)
    .set({ passwordHash, updatedAt: new Date() })
    .where(eq(users.id, consumed.userId));

  // Invalidate every session: the old cookie could be attacker-held.
  await db.delete(sessions).where(eq(sessions.userId, consumed.userId));
  log.info("password_reset_completed", { userId: consumed.userId });

  return json({ ok: true, redirect: "/login?reset=1" });
});
