import { getVerificationState, sendVerificationEmail } from "@/lib/email";
import { json, conflict, rateLimit, withUser } from "@/lib/http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const POST = withUser(async ({ request, user }) => {
  const state = await getVerificationState(user.id);
  if (state.verified || state.provider === "google") {
    throw conflict("This email is already verified.");
  }

  await rateLimit(`resend-verify:${user.id}`, 3, 10 * 60_000);
  await sendVerificationEmail(user.id, new URL(request.url).origin);

  return json({ ok: true, message: "Verification email sent." });
});
