import { json, readJson, badRequest, clientKey, rateLimit, withPublic } from "@/lib/http";
import { log } from "@/lib/log";
import { sendPasswordResetEmail } from "@/lib/email";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const POST = withPublic(async (request) => {
  // Deliberately uniform response: never reveal whether the account exists.
  await rateLimit(await clientKey("forgot"), 5, 10 * 60_000);

  const body = await readJson(request);
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!EMAIL_RE.test(email) || email.length > 254) {
    throw badRequest("Enter a valid email address.", { email: "Not a valid email." });
  }

  await rateLimit(`forgot:${email}`, 3, 10 * 60_000);

  try {
    await sendPasswordResetEmail(email, new URL(request.url).origin);
  } catch (error) {
    // Email delivery must not leak or block the response — log and continue.
    log.warn("password_reset_delivery_failed", { reason: error instanceof Error ? error.message : String(error) });
  }

  return json({ ok: true, message: "If an account exists for that email, a reset link is on its way." });
});
