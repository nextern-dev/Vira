import { db } from "@/db";
import { users } from "@/db/schema";
import { hashPassword } from "@/lib/auth/password";
import { createSession, getCurrentUser } from "@/lib/auth/session";
import { clientKey, conflict, json, rateLimit, readJson, withPublic } from "@/lib/http";
import { parseOrThrow, registerSchema } from "@/lib/validation";
import { isUniqueViolation } from "@/lib/db-errors";
import { readAppearanceCookie } from "@/lib/auth/appearance-cookie";
import { sendVerificationEmail } from "@/lib/email";
import { log } from "@/lib/log";

export const dynamic = "force-dynamic";

export const POST = withPublic(async (request) => {
  await rateLimit(await clientKey("register"), 15, 10 * 60_000);

  const body = await readJson(request);
  const input = parseOrThrow(registerSchema, body);
  const appearance = await readAppearanceCookie();

  if (await getCurrentUser()) {
    throw conflict("You are already signed in. Sign out to create another account.");
  }

  const passwordHash = await hashPassword(input.password);

  let userId: string;
  try {
    const [user] = await db
      .insert(users)
      .values({
        email: input.email,
        name: input.name,
        currency: input.currency,
        passwordHash,
        appearanceMode: appearance.mode,
        colorTheme: appearance.theme,
      })
      .returning({ id: users.id });
    userId = user.id;
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw conflict("An account with that email already exists.");
    }
    throw error;
  }

  await createSession(userId);

  // Verification email is best-effort: registration must never be blocked by
  // delivery. Without a Resend key, deliver() writes a structured dev outbox.
  try {
    await sendVerificationEmail(userId, new URL(request.url).origin);
  } catch (error) {
    log.warn("verification_delivery_failed", {
      userId,
      reason: error instanceof Error ? error.message : String(error),
    });
  }

  return json({ ok: true, redirect: "/dashboard" }, 201);
});

export const runtime = "nodejs";
