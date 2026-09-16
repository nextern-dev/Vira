import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { ApiError, clientKey, json, rateLimit, readJson, withPublic } from "@/lib/http";
import { loginSchema, parseOrThrow } from "@/lib/validation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Pre-computed dummy hash so a missing account costs the same as a real one.
let decoyHash: string | null = null;

export const POST = withPublic(async (request) => {
  const ipKey = await clientKey("login");
  await rateLimit(ipKey, 12, 5 * 60_000);

  const body = await readJson(request);
  const input = parseOrThrow(loginSchema, body);
  await rateLimit(`login:acct:${input.email}`, 10, 5 * 60_000);

  const rows = await db
    .select({ id: users.id, passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.email, input.email))
    .limit(1);

  const account = rows[0];
  if (!account || !account.passwordHash) {
    // OAuth-only accounts have no password: keep timing uniform and never
    // reveal which sign-in method an email actually uses.
    decoyHash ??= await hashPassword("vira-timing-equalizer");
    await verifyPassword(input.password, decoyHash);
    throw new ApiError(401, "Email or password is incorrect.", "invalid_credentials");
  }

  const valid = await verifyPassword(input.password, account.passwordHash);
  if (!valid) {
    throw new ApiError(401, "Email or password is incorrect.", "invalid_credentials");
  }

  await createSession(account.id);
  return json({ ok: true, redirect: "/dashboard" });
});
