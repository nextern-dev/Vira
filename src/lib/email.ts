import { randomBytes, createHash } from "node:crypto";
import { and, desc, eq, gt, isNull } from "drizzle-orm";
import { Resend } from "resend";
import { db } from "@/db";
import { users, verificationTokens } from "@/db/schema";
import { log } from "@/lib/log";

/* ------------------------------------------------------------------ */
/* Resend client (lazy — email is optional in development)             */
/* ------------------------------------------------------------------ */

const globalForResend = globalThis as typeof globalThis & {
  __viraResend?: Resend | null;
};

function resend(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null;
  return (globalForResend.__viraResend ??= new Resend(process.env.RESEND_API_KEY));
}

function appUrl(origin?: string): string {
  return (
    process.env.APP_URL?.replace(/\/$/, "") ??
    origin?.replace(/\/$/, "") ??
    "http://localhost:3000"
  );
}

function mailLayout(title: string, body: string, ctaText: string, ctaUrl: string): string {
  return `<!doctype html><html><body style="margin:0;background:#0b0f17;padding:32px 16px;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
  <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;background:#111827;border:1px solid #25314a;border-radius:16px;overflow:hidden">
    <tr><td style="padding:24px 28px;border-bottom:1px solid #25314a">
      <span style="display:inline-block;background:#4f46e5;color:#fff;font-weight:700;border-radius:8px;padding:6px 12px;font-size:13px">Vira</span>
    </td></tr>
    <tr><td style="padding:28px 28px 8px;color:#f4f5f7;font-size:20px;font-weight:600;line-height:1.3">${title}</td></tr>
    <tr><td style="padding:0 28px;color:#a7b0c2;font-size:14px;line-height:1.65">${body}</td></tr>
    <tr><td style="padding:24px 28px 28px">
      <a href="${ctaUrl}" style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;font-weight:600;font-size:14px;border-radius:10px;padding:11px 18px">${ctaText}</a>
      <p style="color:#6b7494;font-size:12px;margin:18px 0 0">If the button does not work, copy this link:<br/><span style="color:#8ea2ff;word-break:break-all">${ctaUrl}</span></p>
    </td></tr>
  </table>
  <p style="color:#5b6480;font-size:11px;text-align:center;margin-top:18px">Vira — personal expense tracker. You received this because the action was requested on your account.</p>
  </td></tr></table></body></html>`;
}

/** Development keeps a structured outbox instead of actually sending. */
async function deliver(to: string, subject: string, html: string): Promise<void> {
  const client = resend();
  const from = process.env.EMAIL_FROM ?? "Vira <onboarding@vira.dev>";
  if (!client) {
    log.info("email_dev_outbox", { to: maskEmail(to), subject });
    return;
  }
  await client.emails.send({ to, subject, html, from });
}

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  return `${local.slice(0, 2)}***@${domain ?? "***"}`;
}

/* ------------------------------------------------------------------ */
/* Single-use token helpers                                            */
/* ------------------------------------------------------------------ */

const TOKEN_TTL: Record<"verify_email" | "reset_password", number> = {
  verify_email: 24 * 60 * 60_000,
  reset_password: 60 * 60_000,
};

function token(): { raw: string; hash: string } {
  const raw = randomBytes(32).toString("base64url");
  return { raw, hash: createHash("sha256").update(raw).digest("hex") };
}

async function issueToken(
  userId: string,
  email: string,
  kind: "verify_email" | "reset_password",
): Promise<string> {
  await db
    .update(verificationTokens)
    .set({ consumedAt: new Date() })
    .where(
      and(
        eq(verificationTokens.userId, userId),
        eq(verificationTokens.kind, kind),
        isNull(verificationTokens.consumedAt),
      ),
    );

  const { raw, hash } = token();
  await db.insert(verificationTokens).values({
    userId,
    email,
    kind,
    tokenHash: hash,
    expiresAt: new Date(Date.now() + TOKEN_TTL[kind]),
  });
  return raw;
}

/**
 * Atomically consumes a single-use token. The UPDATE is the concurrency
 * boundary: only one concurrent request can transition consumed_at from NULL
 * to a timestamp and receive the token payload through RETURNING.
 */
async function consumeToken(
  rawToken: string,
  kind: "verify_email" | "reset_password",
): Promise<{ id: string; userId: string; email: string } | null> {
  if (!/^[A-Za-z0-9_-]{20,200}$/.test(rawToken)) return null;
  const hash = createHash("sha256").update(rawToken).digest("hex");

  const [row] = await db
    .update(verificationTokens)
    .set({ consumedAt: new Date() })
    .where(
      and(
        eq(verificationTokens.tokenHash, hash),
        eq(verificationTokens.kind, kind),
        isNull(verificationTokens.consumedAt),
        gt(verificationTokens.expiresAt, new Date()),
      ),
    )
    .returning({
      id: verificationTokens.id,
      userId: verificationTokens.userId,
      email: verificationTokens.email,
    });

  return row ?? null;
}

/* ------------------------------------------------------------------ */
/* Public flows                                                        */
/* ------------------------------------------------------------------ */

export async function sendVerificationEmail(
  userId: string,
  origin?: string,
): Promise<void> {
  const [user] = await db
    .select({ email: users.email, name: users.name, verified: users.emailVerifiedAt })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!user || user.verified) return;

  const raw = await issueToken(userId, user.email, "verify_email");
  const url = `${appUrl(origin)}/verify-email?token=${raw}`;
  await deliver(
    user.email,
    "Verify your Vira email",
    mailLayout(
      "Confirm your email address",
      `Hi ${escapeHtml(user.name.split(" ")[0] ?? "there")}, confirm this email address to finish securing your Vira account. The link stays valid for 24 hours.`,
      "Verify email",
      url,
    ),
  );
  log.info("verification_email_queued", { userId });
}

export async function consumeEmailVerification(rawToken: string): Promise<boolean> {
  const token = await consumeToken(rawToken, "verify_email");
  if (!token) return false;
  await db
    .update(users)
    .set({ emailVerifiedAt: new Date(), updatedAt: new Date() })
    .where(eq(users.id, token.userId));
  log.info("email_verified", { userId: token.userId });
  return true;
}

export async function sendPasswordResetEmail(
  email: string,
  origin?: string,
): Promise<void> {
  const [user] = await db
    .select({ id: users.id, email: users.email, name: users.name })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  if (!user) return;

  const raw = await issueToken(user.id, user.email, "reset_password");
  const url = `${appUrl(origin)}/reset-password?token=${raw}`;
  await deliver(
    user.email,
    "Reset your Vira password",
    mailLayout(
      "Reset your password",
      `Hi ${escapeHtml(user.name.split(" ")[0] ?? "there")}, we received a request to reset the password for your Vira account. The link expires in 60 minutes. If you did not request this, you can ignore this email — your password stays unchanged.`,
      "Choose a new password",
      url,
    ),
  );
  log.info("password_reset_queued", { userId: user.id });
}

export async function consumePasswordReset(rawToken: string) {
  return consumeToken(rawToken, "reset_password");
}

/** Latest (unconsumed) verification state for the settings page. */
export async function getVerificationState(userId: string) {
  const [row] = await db
    .select({
      verified: users.emailVerifiedAt,
      provider: users.provider,
      hasPassword: users.passwordHash,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  const [latest] = await db
    .select({ createdAt: verificationTokens.createdAt })
    .from(verificationTokens)
    .where(
      and(
        eq(verificationTokens.userId, userId),
        eq(verificationTokens.kind, "verify_email"),
        isNull(verificationTokens.consumedAt),
        gt(verificationTokens.expiresAt, new Date()),
      ),
    )
    .orderBy(desc(verificationTokens.createdAt))
    .limit(1);
  return {
    verified: Boolean(row?.verified),
    provider: row?.provider ?? "credentials",
    passwordSet: Boolean(row?.hasPassword),
    pending: Boolean(latest),
  };
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}
